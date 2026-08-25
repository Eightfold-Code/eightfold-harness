/**
 * `dsh eightfold <command>` — Eightfold Treasury management. The local
 * Treasury home defaults to `.eightfold/` under the invoking directory
 * (`$EIGHTFOLD_HOME` overrides it); adaptations install there and are
 * recorded in `installed.json`. The registry is fetched live from the public
 * Treasury or `$EIGHTFOLD_TREASURY_URL`.
 * @module @deepseek-ai/dsh/eightfold
 */

import { resolve } from 'node:path'
import {
  ADAPTATION_COMPATIBILITY_KEY,
  fetchRegistry,
  installAdaptation,
  isCompatible,
  parseRegistry,
  readInstalledState,
  removeAdaptation,
  resolveCommit,
  resolveEightfoldHome,
  resolveRegistryUrl,
  type AdaptationDescriptor,
  type TreasuryRegistry,
} from '@deepseek-ai/dsh-treasury'
import type { EightfoldCommand } from './args.ts'
import { runPlugin } from './plugin.ts'

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

/** Print one bundle row. */
function printBundle(id: string, members: readonly string[]): void {
  process.stdout.write(`${id}  bundle  ${members.length} adaptation(s)\n`)
  process.stdout.write(`  ${members.join(', ')}\n`)
}

/** Reject an adaptation that excludes the running Harness version. */
function assertCompatible(name: string, descriptor: AdaptationDescriptor, harnessVersion: string): void {
  if (isCompatible(descriptor, harnessVersion)) return
  const requirement = descriptor.compatibility[ADAPTATION_COMPATIBILITY_KEY] ?? 'an unknown version'
  throw new Error(`${name} requires Eightfold Harness ${requirement}; current version is ${harnessVersion}`)
}

/** Fetch and validate the live Treasury registry. */
async function fetchLiveRegistry(): Promise<TreasuryRegistry> {
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
  const bundleIds = Object.keys(registry.bundles).sort()
  if (bundleIds.length > 0) process.stdout.write('Bundles\n')
  for (const id of bundleIds) {
    const members = registry.bundles[id]
    if (members === undefined) continue
    printBundle(id, members)
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
  const bundleMatches = Object.entries(registry.bundles)
    .filter(([id, members]) =>
      id.toLowerCase().includes(needle)
      || members.some(member => member.toLowerCase().includes(needle)))
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  if (matches.length === 0 && bundleMatches.length === 0) {
    process.stdout.write(`no adaptations or bundles match ${JSON.stringify(query)}\n`)
    return 0
  }
  if (matches.length > 0) {
    process.stdout.write(`${matches.length} adaptation(s) match ${JSON.stringify(query)}\n`)
    for (const [id, descriptor] of matches) {
      printAdaptation(id, descriptor.version, descriptor.name, descriptor.description)
    }
  }
  if (bundleMatches.length > 0) {
    process.stdout.write(`${bundleMatches.length} bundle(s) match ${JSON.stringify(query)}\n`)
    for (const [id, members] of bundleMatches) printBundle(id, members)
  }
  return 0
}

async function installOne(
  registry: TreasuryRegistry,
  name: string,
  home: string,
  harnessVersion: string,
): Promise<'installed' | 'present'> {
  const descriptor = registry.adaptations[name]
  if (descriptor === undefined) {
    throw new Error(`unknown adaptation ${JSON.stringify(name)} in the Treasury registry`)
  }
  assertCompatible(name, descriptor, harnessVersion)
  const state = await readInstalledState(home)
  const existing = state.adaptations[name]
  if (existing !== undefined) {
    process.stdout.write(`${name}: already installed at ${shortCommit(existing.source.commit)}\n`)
    return 'present'
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
  return 'installed'
}

/** Link an installed Treasury adaptation into a native Harness profile. */
function activateInProfile(home: string, name: string, profile: string): void {
  const packagePath = resolve(home, 'adaptations', name)
  const status = runPlugin(profile, ['add', packagePath])
  if (status !== 0) {
    throw new Error(`failed to activate ${name} in profile ${profile} (dsh plugin exited ${status})`)
  }
  process.stdout.write(`Activated ${name} in profile ${profile}\n`)
}

async function runAdd(
  name: string,
  home: string,
  harnessVersion: string,
  profile?: string,
): Promise<number> {
  const registry = await fetchLiveRegistry()
  if (registry.adaptations[name] !== undefined) {
    await installOne(registry, name, home, harnessVersion)
    if (profile !== undefined) activateInProfile(home, name, profile)
    return 0
  }

  const members = registry.bundles[name]
  if (members === undefined) {
    process.stderr.write(`${NAME}: unknown adaptation or bundle ${JSON.stringify(name)} in the Treasury registry\n`)
    return 1
  }
  process.stdout.write(`Installing bundle ${name} (${members.length} adaptation(s))\n`)
  let installed = 0
  let present = 0
  for (const member of members) {
    const outcome = await installOne(registry, member, home, harnessVersion)
    if (outcome === 'installed') installed += 1
    else present += 1
    if (profile !== undefined) activateInProfile(home, member, profile)
  }
  process.stdout.write(`Bundle ${name} ready: ${installed} installed, ${present} already present\n`)
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

async function runUpdate(name: string | undefined, home: string, harnessVersion: string): Promise<number> {
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
      assertCompatible(id, descriptor, harnessVersion)
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
 * @param harnessVersion - version of the running Eightfold Harness CLI.
 * @returns the process exit code.
 */
export async function runEightfold(command: EightfoldCommand, harnessVersion: string): Promise<number> {
  const home = resolveEightfoldHome()
  try {
    switch (command.command) {
      case 'treasury-list':
        return await runTreasuryList()
      case 'treasury-search':
        return await runTreasurySearch(command.query)
      case 'add':
        return await runAdd(command.name, home, harnessVersion, command.profile)
      case 'remove':
        return await runRemove(command.name, home)
      case 'update':
        return await runUpdate(command.name, home, harnessVersion)
      /* v8 ignore next -- the union is closed; a new member updates the switch */
      default:
        return assertNever(command)
    }
  } catch (error) {
    process.stderr.write(`${NAME}: ${messageOf(error)}\n`)
    return 1
  }
}
