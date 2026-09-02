/**
 * Wire vocabulary of the marketplace Remote: one catalogue per distribution
 * kind, install requests, and the resolved-theme payload for one installed
 * skin. Types only.
 *
 * @module @deepseek-ai/dsh-marketplace/types
 */

/** The distribution catalogues the marketplace serves. */
export type MarketplaceKind = 'armoury' | 'treasury'

/** Request one full catalogue listing. */
export interface MarketplaceCatalogRequest {
  readonly kind: MarketplaceKind
}

/** One catalogue entry as the Client renders it. */
export interface MarketplaceCatalogItem {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly version: string
  readonly sourceRepository: string
  readonly sourceBranch: string
  /** The pinned commit when known; empty when the entry is unpinned and not installed. */
  readonly commit: string
  readonly installed: boolean
  readonly updateAvailable: boolean
}

/** The full catalogue listing for one kind. */
export interface MarketplaceCatalogValue {
  readonly items: readonly MarketplaceCatalogItem[]
}

/** Install one catalogue entry by id. */
export interface MarketplaceInstallRequest {
  readonly kind: MarketplaceKind
  readonly id: string
}

/** Request the resolved theme payload of one installed skin. */
export interface MarketplaceSkinRequest {
  readonly id: string
}

/** One installed skin resolved into client theme vocabulary. */
export interface MarketplaceSkinValue {
  readonly id: string
  readonly name: string
  readonly colorScheme: 'light' | 'dark'
  /** Client alias-variable overrides keyed by variable name. */
  readonly tokens: Readonly<Record<string, string>>
}
