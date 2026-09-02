/**
 * Skin installer: resolve a registry descriptor to a pinned commit, download
 * the codeload tarball for that commit, validate the skin manifest and every
 * archive path before writing, extract safely under the Eightfold home, and
 * record the installation. Installation and activation stay separate: this
 * module never applies a skin to a running client.
 *
 * @module @deepseek-ai/dsh-armoury/installer
 */

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  asNumber,
  asRecord,
  asString,
  decompressTarGz,
  downloadBytes,
  extractAtomically,
  parseInstalledSource,
  parseTarArchive,
  planExtraction,
  type InstallerIo,
} from '@deepseek-ai/dsh-treasury'
import { DEFAULT_SKIN_MANIFEST, type SkinDescriptor, type SkinSource } from './registry.ts'
import { parseSkinManifest, type SkinManifest } from './skin.ts'

/** The single supported local installed-skins schema version. */
export const INSTALLED_SKINS_SCHEMA_VERSION = 1

/** The record the installer keeps for one installed skin. */
export interface InstalledSkin {
  readonly version: string
  readonly source: {
    readonly repository: string
    readonly branch: string
    readonly commit: string
  }
  readonly installedAt: string
}

/** The locally recorded set of installed skins. */
export interface InstalledSkinsState {
  readonly schemaVersion: number
  readonly skins: Readonly<Record<string, InstalledSkin>>
}

/**
 * The directory under the Eightfold home that holds extracted skins.
 * @param home - the Eightfold home directory.
 * @returns the skins directory path.
 */
export function skinsDirectory(home: string): string {
  return join(home, 'skins')
}

/**
 * The file under the Eightfold home that records installed skins.
 * @param home - the Eightfold home directory.
 * @returns the installed-skins file path.
 */
export function installedSkinsPath(home: string): string {
  return join(home, 'armoury.json')
}

function parseInstalledSkin(id: string, value: unknown): InstalledSkin {
  const path = `skins.${id}`
  const record = asRecord(value, path)
  return {
    version: asString(record.version, `${path}.version`),
    source: parseInstalledSource(record.source, `${path}.source`),
    installedAt: asString(record.installedAt, `${path}.installedAt`),
  }
}

/**
 * Read the locally recorded installed skins. A missing state file is an empty
 * state, not an error.
 * @param home - the Eightfold home directory.
 * @returns the recorded state.
 * @throws when the state file exists but is structurally invalid.
 */
export async function readInstalledSkins(home: string): Promise<InstalledSkinsState> {
  let text: string
  try {
    text = await readFile(installedSkinsPath(home), 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { schemaVersion: INSTALLED_SKINS_SCHEMA_VERSION, skins: {} }
    }
    throw error
  }
  const value = JSON.parse(text) as unknown
  const record = asRecord(value, 'armoury')
  const schemaVersion = asNumber(record.schemaVersion, 'armoury.schemaVersion')
  if (schemaVersion !== INSTALLED_SKINS_SCHEMA_VERSION) {
    throw new Error(`armoury: unsupported installed-skins schemaVersion ${String(schemaVersion)}`)
  }
  const skinsRaw = asRecord(record.skins, 'armoury.skins')
  const skins: Record<string, InstalledSkin> = {}
  for (const [id, raw] of Object.entries(skinsRaw)) {
    skins[id] = parseInstalledSkin(id, raw)
  }
  return { schemaVersion, skins }
}

/**
 * Persist the installed-skins state.
 * @param home - the Eightfold home directory.
 * @param state - the state to write.
 */
export async function writeInstalledSkins(home: string, state: InstalledSkinsState): Promise<void> {
  await mkdir(home, { recursive: true })
  await writeFile(installedSkinsPath(home), `${JSON.stringify(state, null, 2)}\n`, 'utf8')
}

/**
 * Resolve a skin's pinned commit. An explicit source commit wins; otherwise
 * the branch head is resolved through `git ls-remote`.
 * @param source - the skin source location.
 * @param io - injectable external I/O.
 * @returns the 40-character pinned commit sha.
 */
export async function resolveSkinCommit(source: SkinSource, io: InstallerIo): Promise<string> {
  if (source.commit !== undefined) return source.commit
  return io.gitLsRemote(`https://github.com/${source.repository}`, `refs/heads/${source.branch}`)
}

/**
 * Install one skin: pin the commit, download the tarball, validate the skin
 * manifest and every archive path before writing, extract atomically, and
 * record the result. An existing installation is replaced.
 * @param home - the Eightfold home directory.
 * @param id - the skin id (registry key).
 * @param descriptor - the registry descriptor.
 * @param io - injectable external I/O.
 * @returns the recorded installed skin.
 * @throws when resolution, download, validation, or extraction fails.
 */
export async function installSkin(
  home: string,
  id: string,
  descriptor: SkinDescriptor,
  io: InstallerIo,
): Promise<InstalledSkin> {
  const commit = await resolveSkinCommit(descriptor.source, io)
  const archive = await downloadBytes(
    io.fetch,
    `https://codeload.github.com/${descriptor.source.repository}/tar.gz/${commit}`,
  )
  const entries = parseTarArchive(decompressTarGz(archive))
  const planned = planExtraction(entries)

  const manifestName = descriptor.manifest ?? DEFAULT_SKIN_MANIFEST
  const manifestData = planned.find(entry => entry.type === 'file'
    && entry.segments.length === 1 && entry.segments[0] === manifestName)?.data
  if (manifestData === undefined) {
    throw new Error(`armoury: archive for ${id} contains no root ${manifestName} manifest`)
  }
  let manifest: SkinManifest
  try {
    manifest = parseSkinManifest(JSON.parse(new TextDecoder().decode(manifestData)) as unknown)
  } catch (cause) {
    throw new Error(`armoury: archive for ${id} carries an invalid skin manifest: ${cause instanceof Error ? cause.message : String(cause)}`, { cause })
  }
  if (manifest.id !== id) {
    throw new Error(`armoury: manifest id ${JSON.stringify(manifest.id)} does not match requested skin ${JSON.stringify(id)}`)
  }

  const dest = join(skinsDirectory(home), id)
  await extractAtomically(planned, dest)

  const record: InstalledSkin = {
    version: manifest.version,
    source: { repository: descriptor.source.repository, branch: descriptor.source.branch, commit },
    installedAt: new Date().toISOString(),
  }
  const state = await readInstalledSkins(home)
  await writeInstalledSkins(home, {
    ...state,
    skins: { ...state.skins, [id]: record },
  })
  return record
}

/**
 * Remove an installed skin and its extracted directory.
 * @param home - the Eightfold home directory.
 * @param id - the skin id.
 * @returns true when the skin was installed and removed.
 */
export async function removeSkin(home: string, id: string): Promise<boolean> {
  const state = await readInstalledSkins(home)
  if (state.skins[id] === undefined) return false
  const skins: Record<string, InstalledSkin> = {}
  for (const [key, record] of Object.entries(state.skins)) {
    if (key !== id) skins[key] = record
  }
  await writeInstalledSkins(home, { ...state, skins })
  await rm(join(skinsDirectory(home), id), { recursive: true, force: true })
  return true
}
