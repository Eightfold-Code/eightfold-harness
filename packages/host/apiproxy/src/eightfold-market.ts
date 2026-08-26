/**
 * Eightfold Armoury/Treasury marketplace bridge.
 *
 * Discovery remains registry-controlled and reproducible: main registries
 * decide which packages exist and which commit installs. Presentation metadata
 * is read separately from `eightfold.market.json` on each package branch so a
 * branch owns the card shown by Harness without gaining any install authority.
 */

import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { z } from 'zod'
import {
  downloadBytes,
  extractPlanned,
  fetchRegistry,
  installAdaptation,
  parseRegistry,
  planExtraction,
  readInstalledState,
  resolveCommit,
  resolveEightfoldHome,
  type AdaptationDescriptor,
} from '@deepseek-ai/dsh-treasury'
import { decompressTarGz, parseTarArchive } from '@deepseek-ai/dsh-treasury/src/tar.ts'
import type { EightfoldCatalogItem, EightfoldCatalogKind } from './api/host.ts'

const MARKET_MANIFEST = 'eightfold.market.json'
const ARMOURY_REGISTRY_URL =
  'https://raw.githubusercontent.com/Eightfold-Code/eightfold-armoury/main/registry.json'
const MARKET_FETCH_TIMEOUT_MS = 15_000
const ARMOURY_STATE_SCHEMA_VERSION = 1

const sourceSchema = z.object({
  repository: z.string().min(1),
  branch: z.string().min(1),
  commit: z.string().regex(/^[0-9a-f]{40}$/).optional(),
})

const marketManifestSchema = z.object({
  schemaVersion: z.literal(1),
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(280),
  cover: z.string().min(1).optional(),
  tags: z.array(z.string().min(1).max(32)).max(12).optional(),
})

type MarketManifest = z.infer<typeof marketManifestSchema>

const armourySkinDescriptorSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  description: z.string().min(1),
  version: z.string().min(1),
  source: sourceSchema,
  manifest: z.string().min(1).optional(),
  compatibility: z.record(z.string(), z.string()).optional(),
})

const armouryRegistrySchema = z.object({
  skins: z.record(z.string(), armourySkinDescriptorSchema),
})

type ArmourySkinDescriptor = z.infer<typeof armourySkinDescriptorSchema>

const armouryInstalledSchema = z.object({
  version: z.string().min(1),
  source: z.object({
    repository: z.string().min(1),
    branch: z.string().min(1),
    commit: z.string().regex(/^[0-9a-f]{40}$/),
  }),
  installedAt: z.string().min(1),
})

const armouryStateSchema = z.object({
  schemaVersion: z.literal(ARMOURY_STATE_SCHEMA_VERSION),
  skins: z.record(z.string(), armouryInstalledSchema),
})

type ArmouryState = z.infer<typeof armouryStateSchema>

const skinManifestSchema = z.object({
  schemaVersion: z.union([z.literal('1.0'), z.literal(1)]),
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string().min(1),
  entry: z.string().min(1),
  presentationOnly: z.literal(true),
})

function rawUrl(repository: string, ref: string, path: string): string {
  const normalized = path.replace(/^\.\//, '').replace(/^\/+/, '')
  return `https://raw.githubusercontent.com/${repository}/${ref}/${normalized}`
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { signal: AbortSignal.timeout(MARKET_FETCH_TIMEOUT_MS) })
  if (!response.ok) {
    throw new Error(`eightfold marketplace: ${url} returned HTTP ${String(response.status)}`)
  }
  return response.json() as Promise<unknown>
}

async function fetchOptionalJson(url: string): Promise<unknown | undefined> {
  const response = await fetch(url, { signal: AbortSignal.timeout(MARKET_FETCH_TIMEOUT_MS) })
  if (response.status === 404) return undefined
  if (!response.ok) {
    throw new Error(`eightfold marketplace: ${url} returned HTTP ${String(response.status)}`)
  }
  return response.json() as Promise<unknown>
}

async function readMarketManifest(repository: string, branch: string): Promise<MarketManifest | undefined> {
  const raw = await fetchOptionalJson(rawUrl(repository, branch, MARKET_MANIFEST))
  if (raw === undefined) return undefined
  return marketManifestSchema.parse(raw)
}

function coverUrl(repository: string, branch: string, cover: string | undefined): string | undefined {
  if (cover === undefined) return undefined
  if (/^https:\/\//i.test(cover)) return cover
  if (/^[a-z][a-z0-9+.-]*:/i.test(cover)) return undefined
  return rawUrl(repository, branch, cover)
}

function descriptorForSource(descriptor: ArmourySkinDescriptor): AdaptationDescriptor {
  return {
    name: descriptor.name,
    description: descriptor.description,
    version: descriptor.version,
    source: descriptor.source,
    entry: descriptor.manifest ?? 'eightfold.skin.json',
    compatibility: descriptor.compatibility ?? {},
  }
}

async function resolveSourceCommit(descriptor: ArmourySkinDescriptor): Promise<string> {
  if (descriptor.source.commit !== undefined) return descriptor.source.commit
  return resolveCommit(descriptorForSource(descriptor))
}

function armouryStatePath(home: string): string {
  return join(home, 'armoury.json')
}

function skinsDirectory(home: string): string {
  return join(home, 'skins')
}

async function readArmouryState(home: string): Promise<ArmouryState> {
  try {
    return armouryStateSchema.parse(JSON.parse(await readFile(armouryStatePath(home), 'utf8')) as unknown)
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { schemaVersion: ARMOURY_STATE_SCHEMA_VERSION, skins: {} }
    }
    throw error
  }
}

async function writeArmouryState(home: string, state: ArmouryState): Promise<void> {
  await mkdir(home, { recursive: true })
  await writeFile(armouryStatePath(home), `${JSON.stringify(state, null, 2)}\n`, 'utf8')
}

async function treasuryCatalog(home: string): Promise<EightfoldCatalogItem[]> {
  const registry = parseRegistry(await fetchRegistry())
  const installed = await readInstalledState(home)
  const rows = await Promise.all(Object.entries(registry.adaptations).map(async ([id, descriptor]) => {
    let market: MarketManifest | undefined
    try {
      market = await readMarketManifest(descriptor.source.repository, descriptor.source.branch)
    } catch (error: unknown) {
      console.warn(`[eightfold marketplace] ignoring invalid metadata for Treasury ${id}:`, error)
      return undefined
    }
    // No card manifest means the branch has not opted into the Harness catalog.
    if (market === undefined) return undefined
    const commit = await resolveCommit(descriptor)
    const current = installed.adaptations[id]
    return {
      id,
      kind: 'treasury' as const,
      name: market.name,
      description: market.description,
      version: descriptor.version,
      repository: descriptor.source.repository,
      branch: descriptor.source.branch,
      commit,
      tags: market.tags ?? [],
      ...coverUrl(descriptor.source.repository, descriptor.source.branch, market.cover) === undefined
        ? {}
        : { coverUrl: coverUrl(descriptor.source.repository, descriptor.source.branch, market.cover) },
      installed: current !== undefined,
      updateAvailable: current !== undefined && current.source.commit !== commit,
      ...current === undefined ? {} : { installedVersion: current.manifest.version },
    } satisfies EightfoldCatalogItem
  }))
  return rows.filter((row): row is EightfoldCatalogItem => row !== undefined)
    .sort((a, b) => a.name.localeCompare(b.name))
}

async function armouryCatalog(home: string): Promise<EightfoldCatalogItem[]> {
  const registry = armouryRegistrySchema.parse(await fetchJson(ARMOURY_REGISTRY_URL))
  const installed = await readArmouryState(home)
  const rows = await Promise.all(Object.entries(registry.skins).map(async ([id, descriptor]) => {
    let market: MarketManifest | undefined
    try {
      market = await readMarketManifest(descriptor.source.repository, descriptor.source.branch)
    } catch (error: unknown) {
      console.warn(`[eightfold marketplace] ignoring invalid metadata for Armoury ${id}:`, error)
      return undefined
    }
    if (market === undefined) return undefined
    const commit = await resolveSourceCommit(descriptor)
    const current = installed.skins[id]
    const resolvedCover = coverUrl(descriptor.source.repository, descriptor.source.branch, market.cover)
    return {
      id,
      kind: 'armoury' as const,
      name: market.name,
      description: market.description,
      version: descriptor.version,
      repository: descriptor.source.repository,
      branch: descriptor.source.branch,
      commit,
      tags: market.tags ?? [],
      ...(resolvedCover === undefined ? {} : { coverUrl: resolvedCover }),
      installed: current !== undefined,
      updateAvailable: current !== undefined && current.source.commit !== commit,
      ...(current === undefined ? {} : { installedVersion: current.version }),
    } satisfies EightfoldCatalogItem
  }))
  return rows.filter((row): row is EightfoldCatalogItem => row !== undefined)
    .sort((a, b) => a.name.localeCompare(b.name))
}

function safeRootPath(path: string): string {
  const normalized = path.replace(/^\.\//, '')
  if (normalized.length === 0 || normalized.startsWith('/') || normalized.includes('\\')) {
    throw new Error(`armoury: unsafe skin entry path ${JSON.stringify(path)}`)
  }
  const segments = normalized.split('/')
  if (segments.some(segment => segment === '..' || segment === '')) {
    throw new Error(`armoury: unsafe skin entry path ${JSON.stringify(path)}`)
  }
  return normalized
}

async function installSkin(home: string, id: string, descriptor: ArmourySkinDescriptor): Promise<{
  id: string
  version: string
  commit: string
}> {
  const commit = await resolveSourceCommit(descriptor)
  const archive = await downloadBytes(
    fetch,
    `https://codeload.github.com/${descriptor.source.repository}/tar.gz/${commit}`,
  )
  const planned = planExtraction(parseTarArchive(decompressTarGz(archive)))
  const manifestName = descriptor.manifest ?? 'eightfold.skin.json'
  const manifestData = planned.find(entry => entry.type === 'file'
    && entry.segments.length === 1 && entry.segments[0] === manifestName)?.data
  if (manifestData === undefined) {
    throw new Error(`armoury: archive for ${id} contains no root ${manifestName}`)
  }
  const manifest = skinManifestSchema.parse(
    JSON.parse(new TextDecoder().decode(manifestData)) as unknown,
  )
  if (manifest.id !== id) {
    throw new Error(`armoury: manifest id ${JSON.stringify(manifest.id)} does not match ${JSON.stringify(id)}`)
  }
  const entry = safeRootPath(manifest.entry)
  if (!planned.some(candidate => candidate.type === 'file' && candidate.segments.join('/') === entry)) {
    throw new Error(`armoury: skin ${id} entry ${JSON.stringify(manifest.entry)} is missing from the archive`)
  }

  const dest = join(skinsDirectory(home), id)
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

  const state = await readArmouryState(home)
  await writeArmouryState(home, {
    schemaVersion: ARMOURY_STATE_SCHEMA_VERSION,
    skins: {
      ...state.skins,
      [id]: {
        version: manifest.version,
        source: {
          repository: descriptor.source.repository,
          branch: descriptor.source.branch,
          commit,
        },
        installedAt: new Date().toISOString(),
      },
    },
  })
  return { id, version: manifest.version, commit }
}

/** Read the opt-in catalog for one Eightfold marketplace. */
export async function readEightfoldCatalog(kind: EightfoldCatalogKind): Promise<EightfoldCatalogItem[]> {
  const home = resolveEightfoldHome()
  return kind === 'treasury' ? treasuryCatalog(home) : armouryCatalog(home)
}

/** Install or update one registry-owned item into the local Eightfold home. */
export async function installEightfoldItem(kind: EightfoldCatalogKind, id: string): Promise<{
  id: string
  version: string
  commit: string
}> {
  const home = resolveEightfoldHome()
  if (kind === 'treasury') {
    const registry = parseRegistry(await fetchRegistry())
    const descriptor = registry.adaptations[id]
    if (descriptor === undefined) throw new Error(`treasury: unknown adaptation ${JSON.stringify(id)}`)
    const installed = await installAdaptation(home, id, descriptor)
    return { id, version: installed.manifest.version, commit: installed.source.commit }
  }

  const registry = armouryRegistrySchema.parse(await fetchJson(ARMOURY_REGISTRY_URL))
  const descriptor = registry.skins[id]
  if (descriptor === undefined) throw new Error(`armoury: unknown skin ${JSON.stringify(id)}`)
  return installSkin(home, id, descriptor)
}
