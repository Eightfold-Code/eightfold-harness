/**
 * Adaptation installer: resolve a registry descriptor to a pinned commit,
 * download the codeload tarball for that commit, validate the manifest and
 * every archive path before writing, extract safely under `$EIGHTFOLD_HOME`,
 * and record the manifest and requested permissions. Installation and
 * activation stay separate: this module never executes downloaded code and
 * never touches the running profile.
 *
 * @module @deepseek-ai/dsh-treasury/installer
 */

import { execFile } from 'node:child_process'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'
import { promisify } from 'node:util'
import type { HttpFetch } from './client.ts'
import { TREASURY_FETCH_TIMEOUT_MS } from './client.ts'
import { parseManifest, type EightfoldManifest } from './manifest.ts'
import type { AdaptationDescriptor } from './registry.ts'
import { decompressTarGz, parseTarArchive, type TarEntry } from './tar.ts'
import { asNumber, asRecord, asString } from './validate.ts'

/** Environment variable that overrides the local Treasury home. */
export const EIGHTFOLD_HOME_ENV = 'EIGHTFOLD_HOME'

/** Default Treasury home directory name under the invoking directory. */
export const EIGHTFOLD_HOME_DIR_NAME = '.eightfold'

/** Timeout for `git ls-remote`, in milliseconds. */
export const GIT_LS_REMOTE_TIMEOUT_MS = 30_000

/** The single supported local installed-state schema version. */
export const INSTALLED_STATE_SCHEMA_VERSION = 1

/** A pinned source location after branch resolution. */
export interface InstalledSource {
  readonly repository: string
  readonly branch: string
  readonly commit: string
}

/** The record the installer keeps for one installed adaptation. */
export interface InstalledAdaptation {
  readonly manifest: EightfoldManifest
  readonly permissions: readonly string[]
  readonly source: InstalledSource
  readonly installedAt: string
}

/** The locally recorded set of installed adaptations. */
export interface InstalledState {
  readonly schemaVersion: number
  readonly adaptations: Readonly<Record<string, InstalledAdaptation>>
}

/** External I/O the installer depends on, injectable for tests. */
export interface InstallerIo {
  readonly fetch: HttpFetch
  /** Resolve a ref to a full commit sha. */
  readonly gitLsRemote: (url: string, ref: string) => Promise<string>
}

const execFileAsync = promisify(execFile)

/** Resolve `refs/heads/<branch>` for a repository through `git ls-remote`. */
async function gitLsRemote(url: string, ref: string): Promise<string> {
  let stdout: string
  try {
    const result = await execFileAsync('git', ['ls-remote', url, ref], { timeout: GIT_LS_REMOTE_TIMEOUT_MS })
    stdout = result.stdout
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause)
    throw new Error(`treasury: failed to resolve ${url} refs/heads/${ref} with git ls-remote: ${reason}`, { cause })
  }
  const line = stdout.split(/\r?\n/, 1)[0] ?? ''
  const sha = line.split(/\s+/, 1)[0] ?? ''
  if (!/^[0-9a-f]{40}$/.test(sha)) {
    throw new Error(`treasury: git ls-remote returned no commit for ${url} refs/heads/${ref}`)
  }
  return sha
}

/** The default I/O bundle: global fetch and the `git` CLI. */
export const defaultInstallerIo: InstallerIo = {
  fetch,
  gitLsRemote,
}

/**
 * Resolve the local Treasury home: `$EIGHTFOLD_HOME` when set and non-blank,
 * otherwise `.eightfold/` under the invoking directory. The default is
 * repo-local so a prototype never touches the operating-system home; the
 * eventual `~/.eightfold` default is documented but not used at runtime.
 * @param env - environment mapping used to read the override.
 * @returns the normalized absolute Treasury home path.
 */
export function resolveEightfoldHome(env: Record<string, string | undefined> = process.env): string {
  const fromEnv = env[EIGHTFOLD_HOME_ENV]
  const selected = fromEnv !== undefined && fromEnv.trim().length > 0
    ? fromEnv
    : join(process.cwd(), EIGHTFOLD_HOME_DIR_NAME)
  if (selected === '~') return homedir()
  if (selected.startsWith('~/') || selected.startsWith('~\\')) return resolve(homedir(), selected.slice(2))
  return resolve(selected)
}

/** The directory under the Treasury home that holds extracted adaptations. */
export function adaptationsDirectory(home: string): string {
  return join(home, 'adaptations')
}

/** The file under the Treasury home that records installed adaptations. */
export function installedStatePath(home: string): string {
  return join(home, 'installed.json')
}

function parseInstalledAdaptation(id: string, value: unknown): InstalledAdaptation {
  const path = `installed.adaptations.${id}`
  const record = asRecord(value, path)
  const source = asRecord(record.source, `${path}.source`)
  const manifest = parseManifest(record.manifest)
  const permissions = record.permissions
  if (!Array.isArray(permissions) || permissions.some(item => typeof item !== 'string')) {
    throw new Error(`treasury: ${path}.permissions must be an array of strings`)
  }
  return {
    manifest,
    permissions,
    source: {
      repository: asString(source.repository, `${path}.source.repository`),
      branch: asString(source.branch, `${path}.source.branch`),
      commit: asString(source.commit, `${path}.source.commit`),
    },
    installedAt: asString(record.installedAt, `${path}.installedAt`),
  }
}

/**
 * Read the locally recorded installed state. A missing state file is an empty
 * state, not an error.
 * @param home - the Treasury home directory.
 * @returns the recorded state.
 * @throws when the state file exists but is structurally invalid.
 */
export async function readInstalledState(home: string): Promise<InstalledState> {
  let text: string
  try {
    text = await readFile(installedStatePath(home), 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { schemaVersion: INSTALLED_STATE_SCHEMA_VERSION, adaptations: {} }
    }
    throw error
  }
  const value = JSON.parse(text) as unknown
  const record = asRecord(value, 'installed')
  const schemaVersion = asNumber(record.schemaVersion, 'installed.schemaVersion')
  if (schemaVersion !== INSTALLED_STATE_SCHEMA_VERSION) {
    throw new Error(`treasury: unsupported installed-state schemaVersion ${String(schemaVersion)}`)
  }
  const adaptationsRaw = asRecord(record.adaptations, 'installed.adaptations')
  const adaptations: Record<string, InstalledAdaptation> = {}
  for (const [id, raw] of Object.entries(adaptationsRaw)) {
    adaptations[id] = parseInstalledAdaptation(id, raw)
  }
  return { schemaVersion, adaptations }
}

/**
 * Persist the installed state.
 * @param home - the Treasury home directory.
 * @param state - the state to write.
 */
export async function writeInstalledState(home: string, state: InstalledState): Promise<void> {
  await mkdir(home, { recursive: true })
  await writeFile(installedStatePath(home), `${JSON.stringify(state, null, 2)}\n`, 'utf8')
}

/**
 * Resolve an adaptation's pinned commit. An explicit source commit wins;
 * otherwise the branch head is resolved through `git ls-remote`.
 * @param descriptor - the registry descriptor.
 * @param io - injectable external I/O.
 * @returns the 40-character pinned commit sha.
 */
export async function resolveCommit(
  descriptor: AdaptationDescriptor,
  io: InstallerIo = defaultInstallerIo,
): Promise<string> {
  const source = descriptor.source
  if (source.commit !== undefined) return source.commit
  return io.gitLsRemote(`https://github.com/${source.repository}`, `refs/heads/${source.branch}`)
}

/**
 * Download an archive URL as bytes with a timeout.
 * @param fetcher - fetch implementation.
 * @param url - the archive URL.
 * @returns the response bytes.
 * @throws when the request fails, times out, or returns a non-2xx status.
 */
export async function downloadBytes(fetcher: HttpFetch, url: string): Promise<Uint8Array> {
  let response: Response
  try {
    response = await fetcher(url, { signal: AbortSignal.timeout(TREASURY_FETCH_TIMEOUT_MS) })
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause)
    throw new Error(`treasury: failed to download ${url}: ${reason}`, { cause })
  }
  if (!response.ok) {
    throw new Error(`treasury: download of ${url} failed with HTTP ${response.status} ${response.statusText}`)
  }
  return new Uint8Array(await response.arrayBuffer())
}

/** One planned extraction operation, fully validated before any write. */
interface PlannedEntry {
  readonly segments: string[]
  readonly type: 'file' | 'directory'
  readonly data: Uint8Array
}

/**
 * Validate every archive path and plan the extraction. The first path segment
 * is the codeload repository-root directory and is stripped; the remainder
 * must be a relative POSIX path with no traversal, drive, or backslash forms.
 * @param entries - parsed archive entries.
 * @returns the validated plan keyed to the extraction root.
 * @throws when any path is malformed or escapes the extraction directory.
 */
export function planExtraction(entries: readonly TarEntry[]): PlannedEntry[] {
  return entries.map((entry) => {
    const segments = strippedSegments(entry.path)
    return { segments, type: entry.type, data: entry.data }
  })
}

/** Split and validate one archive path into its post-top-directory segments. */
function strippedSegments(path: string): string[] {
  if (path.includes('\\')) {
    throw new Error(`treasury: archive path contains a backslash: ${JSON.stringify(path)}`)
  }
  if (path.includes(':')) {
    throw new Error(`treasury: archive path contains a drive-colon: ${JSON.stringify(path)}`)
  }
  if (path.length === 0) {
    throw new Error('treasury: archive contains an empty path')
  }
  if (path.startsWith('/')) {
    throw new Error(`treasury: archive path must be relative: ${JSON.stringify(path)}`)
  }
  const segments = path.split('/').slice(1).filter(segment => segment !== '.' && segment !== '')
  for (const segment of segments) {
    if (segment === '..') {
      throw new Error(`treasury: archive path escapes the extraction directory: ${JSON.stringify(path)}`)
    }
  }
  return segments
}

/**
 * Write a validated extraction plan under `dest`. Paths were already checked,
 * so no entry can leave the destination; the containment check is retained as
 * the final authority.
 * @param planned - the validated plan from {@link planExtraction}.
 * @param dest - the absolute extraction root.
 */
export async function extractPlanned(planned: readonly PlannedEntry[], dest: string): Promise<void> {
  const root = resolve(dest)
  await mkdir(root, { recursive: true })
  for (const entry of planned) {
    if (entry.segments.length === 0) continue
    const target = resolve(join(root, ...entry.segments))
    if (target !== root && !target.startsWith(`${root}${sep}`)) {
      throw new Error(`treasury: archive path escapes the extraction directory: ${JSON.stringify(entry.segments.join('/'))}`)
    }
    if (entry.type === 'directory') {
      await mkdir(target, { recursive: true })
    } else {
      await mkdir(dirname(target), { recursive: true })
      await writeFile(target, entry.data)
    }
  }
}

/**
 * Install one adaptation: pin the commit, download the tarball, validate the
 * manifest and every archive path before writing, extract atomically, and
 * record the result. An existing installation is replaced.
 * @param home - the Treasury home directory.
 * @param id - the adaptation id (registry key).
 * @param descriptor - the registry descriptor.
 * @param io - injectable external I/O.
 * @returns the recorded installed adaptation.
 * @throws when resolution, download, validation, or extraction fails.
 */
export async function installAdaptation(
  home: string,
  id: string,
  descriptor: AdaptationDescriptor,
  io: InstallerIo = defaultInstallerIo,
): Promise<InstalledAdaptation> {
  const commit = await resolveCommit(descriptor, io)
  const archive = await downloadBytes(
    io.fetch,
    `https://codeload.github.com/${descriptor.source.repository}/tar.gz/${commit}`,
  )
  const entries = parseTarArchive(decompressTarGz(archive))
  const planned = planExtraction(entries)

  const manifestData = planned.find(entry => entry.type === 'file'
    && entry.segments.length === 1 && entry.segments[0] === 'eightfold.json')?.data
  if (manifestData === undefined) {
    throw new Error(`treasury: archive for ${id} contains no root eightfold.json manifest`)
  }
  let manifest: EightfoldManifest
  try {
    manifest = parseManifest(JSON.parse(new TextDecoder().decode(manifestData)) as unknown)
  } catch (cause) {
    throw new Error(`treasury: archive for ${id} carries an invalid manifest: ${cause instanceof Error ? cause.message : String(cause)}`, { cause })
  }
  if (manifest.id !== id) {
    throw new Error(`treasury: manifest id ${JSON.stringify(manifest.id)} does not match requested adaptation ${JSON.stringify(id)}`)
  }

  const dest = join(adaptationsDirectory(home), id)
  const temp = `${dest}.tmp-${process.pid}-${Math.random().toString(16).slice(2)}`
  try {
    await extractPlanned(planned, temp)
    await rm(dest, { recursive: true, force: true })
    await mkdir(dirname(dest), { recursive: true })
    await rename(temp, dest)
  } catch (cause) {
    await rm(temp, { recursive: true, force: true })
    throw cause
  }

  const record: InstalledAdaptation = {
    manifest,
    permissions: manifest.permissions,
    source: { repository: descriptor.source.repository, branch: descriptor.source.branch, commit },
    installedAt: new Date().toISOString(),
  }
  const state = await readInstalledState(home)
  await writeInstalledState(home, {
    ...state,
    adaptations: { ...state.adaptations, [id]: record },
  })
  return record
}

/**
 * Remove an installed adaptation and its extracted directory.
 * @param home - the Treasury home directory.
 * @param id - the adaptation id.
 * @returns true when the adaptation was installed and removed.
 */
export async function removeAdaptation(home: string, id: string): Promise<boolean> {
  const state = await readInstalledState(home)
  if (state.adaptations[id] === undefined) return false
  const adaptations: Record<string, InstalledAdaptation> = {}
  for (const [key, record] of Object.entries(state.adaptations)) {
    if (key !== id) adaptations[key] = record
  }
  await writeInstalledState(home, { ...state, adaptations })
  await rm(join(adaptationsDirectory(home), id), { recursive: true, force: true })
  return true
}
