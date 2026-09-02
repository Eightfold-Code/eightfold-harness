/**
 * The marketplace Host service: one Remote namespace (`marketplace`) that
 * lists the Armoury and Treasury catalogues, installs their entries under the
 * Eightfold home, and resolves an installed skin into client theme
 * vocabulary. The service reuses the distribution libraries unchanged; it owns
 * the failure classification and the installed/update projection.
 *
 * @module @deepseek-ai/dsh-marketplace
 */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import {
  DEFAULT_SKIN_MANIFEST,
  fetchArmouryRegistry,
  installSkin,
  parseArmouryRegistry,
  parseSkinManifest,
  readInstalledSkins,
  resolveSkinTheme,
  skinsDirectory,
  type ResolvedSkin,
  type SkinManifest,
} from '@deepseek-ai/dsh-armoury'
import {
  defaultInstallerIo,
  fetchRegistry,
  installAdaptation,
  parseRegistry,
  readInstalledState,
  resolveEightfoldHome,
  type AdaptationSource,
  type TreasuryRegistry,
} from '@deepseek-ai/dsh-treasury'
import { Remote, RemoteError, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import type {
  MarketplaceCatalogItem,
  MarketplaceCatalogRequest,
  MarketplaceCatalogValue,
  MarketplaceInstallRequest,
  MarketplaceKind,
  MarketplaceSkinRequest,
  MarketplaceSkinValue,
} from './types.ts'

export type * from './types.ts'

declare module '@deepseek-ai/dsh-typert-protocol' {
  interface RemoteErrorDetailsMap {
    /** The registry endpoint could not be reached or the branch head failed to resolve. */
    'marketplace/registry-unavailable': { readonly kind: MarketplaceKind }
    /** The registry document is structurally invalid or uses an unsupported schema version. */
    'marketplace/invalid-registry': { readonly kind: MarketplaceKind }
    /** No catalogue entry carries that id. */
    'marketplace/unknown-item': { readonly kind: MarketplaceKind; readonly id: string }
    /** The install pipeline refused or failed to complete the request. */
    'marketplace/install-failed': { readonly kind: MarketplaceKind; readonly id: string }
    /** No installed skin carries that id. */
    'marketplace/skin-not-installed': { readonly id: string }
    /** The installed skin's manifest or theme documents are unusable. */
    'marketplace/skin-invalid': { readonly id: string }
  }
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    marketplace: MarketplaceService
  }
}

/** Human text for one caught cause, keeping the original as `cause`. */
function messageOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause)
}

/** Whether a registry entry is installed with a recorded commit behind the current source head. */
type InstalledEntry = { readonly source: { readonly commit: string } }

/**
 * The marketplace Remote service. Requires no other service: the distribution
 * libraries own their own transport, process, and file access.
 */
export class MarketplaceService extends TypertRemoteService {
  static inject: string[] = []

  constructor(ctx: Context) {
    super(ctx, 'marketplace')
  }

  /**
   * List one full catalogue: every registry entry with its installed and
   * update state. Update checks resolve the current source head for each
   * installed entry, so a listing performs one `git ls-remote` per installed
   * entry.
   * @param request - the catalogue kind to list.
   * @returns the frozen catalogue listing.
   */
  @Remote('catalog')
  async catalog(request: MarketplaceCatalogRequest): Promise<MarketplaceCatalogValue> {
    const home = resolveEightfoldHome()
    return request.kind === 'treasury'
      ? await this.treasuryCatalog(home)
      : await this.armouryCatalog(home)
  }

  /**
   * Install one catalogue entry under the Eightfold home. An existing
   * installation of the same id is replaced.
   * @param request - the catalogue kind and entry id.
   */
  @Remote('install')
  async install(request: MarketplaceInstallRequest): Promise<void> {
    const home = resolveEightfoldHome()
    if (request.kind === 'treasury') {
      const registry = await this.loadTreasuryRegistry(request.kind)
      const descriptor = registry.adaptations[request.id]
      if (descriptor === undefined) throw this.unknownItem(request.kind, request.id)
      try {
        await installAdaptation(home, request.id, descriptor, defaultInstallerIo)
      } catch (cause) {
        throw new RemoteError('marketplace/install-failed', messageOf(cause), { kind: request.kind, id: request.id }, { cause })
      }
      return
    }
    const registry = await this.loadArmouryRegistry(request.kind)
    const descriptor = registry.skins[request.id]
    if (descriptor === undefined) throw this.unknownItem(request.kind, request.id)
    try {
      await installSkin(home, request.id, descriptor, defaultInstallerIo)
    } catch (cause) {
      throw new RemoteError('marketplace/install-failed', messageOf(cause), { kind: request.kind, id: request.id }, { cause })
    }
  }

  /**
   * Resolve one installed skin into client theme vocabulary for
   * registration in the Client theme registry.
   * @param request - the skin id.
   * @returns the resolved skin.
   */
  @Remote('skin')
  async skin(request: MarketplaceSkinRequest): Promise<MarketplaceSkinValue> {
    const home = resolveEightfoldHome()
    const state = await readInstalledSkins(home)
    if (state.skins[request.id] === undefined) {
      throw new RemoteError('marketplace/skin-not-installed', `armoury: skin ${JSON.stringify(request.id)} is not installed`, { id: request.id })
    }
    const directory = join(skinsDirectory(home), request.id)
    const manifest = await this.readSkinManifest(directory, request.id)
    const resolved = await this.resolveSkin(directory, manifest, request.id)
    return {
      id: resolved.id,
      name: resolved.name,
      colorScheme: resolved.colorScheme,
      tokens: resolved.tokens,
    }
  }

  /** Fetch, classify, and parse the Treasury registry document. */
  private async loadTreasuryRegistry(kind: MarketplaceKind): Promise<TreasuryRegistry> {
    let raw: unknown
    try {
      raw = await fetchRegistry()
    } catch (cause) {
      throw new RemoteError('marketplace/registry-unavailable', messageOf(cause), { kind }, { cause })
    }
    try {
      return parseRegistry(raw)
    } catch (cause) {
      throw new RemoteError('marketplace/invalid-registry', messageOf(cause), { kind }, { cause })
    }
  }

  /** Fetch, classify, and parse the Armoury registry document. */
  private async loadArmouryRegistry(kind: MarketplaceKind) {
    let raw: unknown
    try {
      raw = await fetchArmouryRegistry()
    } catch (cause) {
      throw new RemoteError('marketplace/registry-unavailable', messageOf(cause), { kind }, { cause })
    }
    try {
      return parseArmouryRegistry(raw)
    } catch (cause) {
      throw new RemoteError('marketplace/invalid-registry', messageOf(cause), { kind }, { cause })
    }
  }

  /** List the Treasury catalogue with installed and update state. */
  private async treasuryCatalog(home: string): Promise<MarketplaceCatalogValue> {
    const registry = await this.loadTreasuryRegistry('treasury')
    const state = await readInstalledState(home)
    return await this.projectCatalog('treasury', registry.adaptations, state.adaptations)
  }

  /** List the Armoury catalogue with installed and update state. */
  private async armouryCatalog(home: string): Promise<MarketplaceCatalogValue> {
    const registry = await this.loadArmouryRegistry('armoury')
    const state = await readInstalledSkins(home)
    return await this.projectCatalog('armoury', registry.skins, state.skins)
  }

  /**
   * Project one catalogue table: every registry entry with its installed and
   * update state. Update checks resolve the current source head for each
   * installed entry.
   */
  private async projectCatalog(
    kind: MarketplaceKind,
    entries: Readonly<Record<string, {
      readonly name: string
      readonly description: string
      readonly version: string
      readonly source: AdaptationSource
    }>>,
    installed: Readonly<Record<string, InstalledEntry>>,
  ): Promise<MarketplaceCatalogValue> {
    const items: MarketplaceCatalogItem[] = []
    for (const [id, descriptor] of Object.entries(entries)) {
      const record = installed[id]
      items.push(Object.freeze({
        id,
        name: descriptor.name,
        description: descriptor.description,
        version: descriptor.version,
        sourceRepository: descriptor.source.repository,
        sourceBranch: descriptor.source.branch,
        commit: record !== undefined ? record.source.commit : descriptor.source.commit ?? '',
        installed: record !== undefined,
        updateAvailable: record === undefined
          ? false
          : record.source.commit !== await this.currentCommit(descriptor.source, kind),
      }))
    }
    return Object.freeze({ items: Object.freeze(items) })
  }

  /**
   * Resolve the commit a source installs today: the explicit pin when
   * present, otherwise the current branch head. Failures are classified as
   * registry unavailability.
   */
  private async currentCommit(source: AdaptationSource, kind: MarketplaceKind): Promise<string> {
    if (source.commit !== undefined) return source.commit
    try {
      return await defaultInstallerIo.gitLsRemote(`https://github.com/${source.repository}`, `refs/heads/${source.branch}`)
    } catch (cause) {
      throw new RemoteError('marketplace/registry-unavailable', messageOf(cause), { kind }, { cause })
    }
  }

  /** Build the unknown-item failure for one catalogue request. */
  private unknownItem(kind: MarketplaceKind, id: string): RemoteError {
    return new RemoteError('marketplace/unknown-item', `no ${kind} entry ${JSON.stringify(id)}`, { kind, id })
  }

  /** Read and validate the installed skin manifest, classified as skin-invalid. */
  private async readSkinManifest(directory: string, id: string) {
    let manifest
    try {
      manifest = parseSkinManifest(JSON.parse(await readFile(join(directory, DEFAULT_SKIN_MANIFEST), 'utf8')) as unknown)
    } catch (cause) {
      throw new RemoteError('marketplace/skin-invalid', messageOf(cause), { id }, { cause })
    }
    return manifest
  }

  /** Resolve the installed skin's theme payload, classified as skin-invalid. */
  private async resolveSkin(directory: string, manifest: SkinManifest, id: string): Promise<ResolvedSkin> {
    try {
      return await resolveSkinTheme(directory, manifest)
    } catch (cause) {
      throw new RemoteError('marketplace/skin-invalid', messageOf(cause), { id }, { cause })
    }
  }
}

export default MarketplaceService
