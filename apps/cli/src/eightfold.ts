/**
 * `dsh eightfold <command>` — Eightfold Treasury management. The local
 * Treasury home defaults to `.eightfold/` under the invoking directory
 * (`$EIGHTFOLD_HOME` overrides it); adaptations install there and are
 * recorded in `installed.json`. The registry is fetched live from the public
 * Treasury or `$EIGHTFOLD_TREASURY_URL`.
 * @module @deepseek-ai/dsh/eightfold
 */

import {
  fetchRegistry,
  installAdaptation,
  parseRegistry,
  readInstalledState,
  removeAdaptation,
  resolveCommit,
  resolveEightfoldHome,
  resolveRegistryUrl,
} from '@deepseek-ai/dsh-treasury'
import type { EightfoldCommand } from './args.ts'

const NAME = 'eightfold'

/** Error message for an unexpected failure, without a swallowed cause. */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** Terminate a closed union that has drifted from its switch. */
function assertNever(value: never): never {
  throw new Error(`eightfold: unhandled command ${JSON.stringify(value)}`)
}

/** Short commit form for user-facing output. */
function shortCommit(commit: string): string {
  return commit.slice(0, 7)
}

/** Print one adaptation row. */
function printAdaptation(id: string, version: string, name: string, description: string): void {
  process.stdout.write(`${id}  ${version}  ${name}\n`)
  process.stdout.write(`  ${description}\n`)
}

/** Fetch and validate the live Treasury registry. */
async function fetchLiveRegistry() {
  return parseRegistry(await fetchRegistry())
}

async function runTreasuryList(): Promise<number> {
  const url = resolveRegistryUrl()
  const registry = await fetchLiveRegistry()
  process.stdout.write(`Treasury registry ${url}\n`)
  for (const id of Object.keys(registry.adaptations).sort()) {
    const descriptor = registry.adaptations[id]
    if (descriptor === undefined) continue
    printAdaptation(id, descriptor.version, descriptor.name, descriptor.description)
  }
  return 0
}

async function runTreasurySearch(query: string): Promise<number> {
  const needle = query.toLowerCase()
  const registry = await fetchLiveRegistry()
  const matches = Object.entries(registry.adaptations)
    .filter(([id, descriptor]) =>
      id.toLowerCase().includes(needle)
      || descriptor.name.toLowerCase().includes(needle)
      || descriptor.description.toLowerCase().includes(needle))
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  if (matches.length === 0) {
    process.stdout.write(`no adaptations match ${JSON.stringify(query)}\n`)
    return 0
  }
  process.stdout.write(`${matches.length} adaptation(s) match ${JSON.stringify(query)}\n`)
  for (const [id, descriptor] of matches) {
    printAdaptation(id, descriptor.version, descriptor.name, descriptor.description)
  }
  return 0
}

async function runAdd(name: string, home: string): Promise<number> {
  const registry = await fetchLiveRegistry()
  const descriptor = registry.adaptations[name]
  if (descriptor === undefined) {
    process.stderr.write(`${NAME}: unknown adaptation ${JSON.stringify(name)} in the Treasury registry\n`)
    return 1
  }
  const state = await readInstalledState(home)
  const existing = state.adaptations[name]
  if (existing !== undefined) {
    process.stdout.write(
      `${NAME}: ${name} is already installed at ${shortCommit(existing.source.commit)}; run `
      + `dsh eightfold update ${name} to refresh it\n`,
    )
    return 0
  }
  const record = await installAdaptation(home, name, descriptor)
  process.stdout.write(
    `Resolved ${name} -> ${descriptor.source.repository}@${shortCommit(record.source.commit)} (branch ${descriptor.source.branch})\n`,
  )
  process.stdout.write(`Validated manifest (${record.manifest.name} ${record.manifest.version})\n`)
  process.stdout.write(`Installed ${name} to ${home}/adaptations/${name}\n`)
  process.stdout.write(
    `Registered permissions: ${record.permissions.length === 0 ? 'none' : record.permissions.join(', ')}\n`,
  )
  return 0
}

async function runRemove(name: string, home: string): Promise<number> {
  const removed = await removeAdaptation(home, name)
  if (!removed) {
    process.stderr.write(`${NAME}: ${name} is not installed\n`)
    return 1
  }
  process.stdout.write(`Removed ${name} from ${home}\n`)
  return 0
}

async function runUpdate(name: string | undefined, home: string): Promise<number> {
  const state = await readInstalledState(home)
  const ids = name === undefined
    ? Object.keys(state.adaptations).sort()
    : [name]
  if (ids.length === 0) {
    process.stdout.write('no adaptations installed\n')
    return 0
  }
  const registry = await fetchLiveRegistry()
  let failed = false
  for (const id of ids) {
    try {
      const installed = state.adaptations[id]
      if (installed === undefined) {
        throw new Error(`${id} is not installed`)
      }
      const descriptor = registry.adaptations[id]
      if (descriptor === undefined) {
        throw new Error(`${id} is no longer in the Treasury registry`)
      }
      const latest = await resolveCommit(descriptor)
      if (latest === installed.source.commit) {
        process.stdout.write(`${id}: up to date at ${shortCommit(latest)}\n`)
      } else {
        await installAdaptation(home, id, descriptor)
        process.stdout.write(
          `${id}: updated to ${shortCommit(latest)} (was ${shortCommit(installed.source.commit)})\n`,
        )
      }
    } catch (error) {
      failed = true
      process.stderr.write(`${NAME}: ${messageOf(error)}\n`)
    }
  }
  return failed ? 1 : 0
}

/**
 * Run one Eightfold command to completion, printing to stdout/stderr.
 * @param command - the resolved command.
 * @returns the process exit code.
 */
export async function runEightfold(command: EightfoldCommand): Promise<number> {
  const home = resolveEightfoldHome()
  try {
    switch (command.command) {
      case 'treasury-list':
        return await runTreasuryList()
      case 'treasury-search':
        return await runTreasurySearch(command.query)
      case 'add':
        return await runAdd(command.name, home)
      case 'remove':
        return await runRemove(command.name, home)
      case 'update':
        return await runUpdate(command.name, home)
      /* v8 ignore next -- the union is closed; a new member updates the switch */
      default:
        return assertNever(command)
    }
  } catch (error) {
    process.stderr.write(`${NAME}: ${messageOf(error)}\n`)
    return 1
  }
}
