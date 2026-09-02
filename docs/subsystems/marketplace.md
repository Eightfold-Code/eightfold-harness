# Marketplace

English | [中文](marketplace.zh.md)

[`@deepseek-ai/dsh-marketplace`](../../packages/treasury/marketplace) is the web client's view of the Eightfold distribution layer: one `marketplace` Remote namespace that lists the Armoury and Treasury catalogs, installs their entries under the Eightfold home, and resolves an installed skin into client theme vocabulary. The service owns failure classification only; `@deepseek-ai/dsh-treasury` and `@deepseek-ai/dsh-armoury` own the transport, validation, and installation contracts.

Source: [`packages/treasury/marketplace/src/types.ts`](../../packages/treasury/marketplace/src/types.ts)

## Remote methods

- `marketplace/catalog({ kind })` returns one item per registry entry with its installed and update state. Update detection is commit-based: for each installed entry the service resolves the current source head and compares it with the recorded commit, so a listing performs one `git ls-remote` per installed entry.
- `marketplace/install({ kind, id })` installs one entry and replaces any existing installation. It returns when the install pipeline commits; activation stays with the consumer.
- `marketplace/skin({ id })` resolves one installed skin into client theme vocabulary, ready for registration in the Client theme registry.

Failures are `RemoteError`s: `marketplace/registry-unavailable`, `marketplace/invalid-registry`, `marketplace/unknown-item`, `marketplace/install-failed`, `marketplace/skin-not-installed`, and `marketplace/skin-invalid`.

## Public types

```ts type-equiv
/** The distribution catalogues the marketplace serves. */
type MarketplaceKind = 'armoury' | 'treasury'
```

```ts type-equiv
/** Request one full catalogue listing. */
interface MarketplaceCatalogRequest {
  readonly kind: MarketplaceKind
}
```

```ts type-equiv
/** One catalogue entry as the Client renders it. */
interface MarketplaceCatalogItem {
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
```

```ts type-equiv
/** The full catalogue listing for one kind. */
interface MarketplaceCatalogValue {
  readonly items: readonly MarketplaceCatalogItem[]
}
```

```ts type-equiv
/** Install one catalogue entry by id. */
interface MarketplaceInstallRequest {
  readonly kind: MarketplaceKind
  readonly id: string
}
```

```ts type-equiv
/** Request the resolved theme payload of one installed skin. */
interface MarketplaceSkinRequest {
  readonly id: string
}
```

```ts type-equiv
/** One installed skin resolved into client theme vocabulary. */
interface MarketplaceSkinValue {
  readonly id: string
  readonly name: string
  readonly colorScheme: 'light' | 'dark'
  /** Client alias-variable overrides keyed by variable name. */
  readonly tokens: Readonly<Record<string, string>>
}
```

## Client wiring

`ui-settings-general` declares `remote.marketplace` in its inject list, registers the marketplace component twice into `sidebar.footer.action` (one Armoury, one Treasury), and wraps `marketplace/skin` into the theme registry: register the resolved tokens, then select the theme. Components receive plain catalog/install callbacks through the inject face; they never see `ctx.remote`.

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxmarketplace--marketplaceservice"></a>

### `ctx.marketplace` — `MarketplaceService`

The marketplace Remote service. Requires no other service: the distribution libraries own their own transport, process, and file access.

```ts cordis-catalog
/**
 * List one full catalogue: every registry entry with its installed and
 * update state. Update checks resolve the current source head for each
 * installed entry, so a listing performs one `git ls-remote` per installed
 * entry.
 * @param request - the catalogue kind to list.
 * @returns the frozen catalogue listing.
 */
@Remote('catalog') async catalog(request: MarketplaceCatalogRequest): Promise<MarketplaceCatalogValue>

/**
 * Install one catalogue entry under the Eightfold home. An existing
 * installation of the same id is replaced.
 * @param request - the catalogue kind and entry id.
 */
@Remote('install') async install(request: MarketplaceInstallRequest): Promise<void>

/**
 * Resolve one installed skin into client theme vocabulary for
 * registration in the Client theme registry.
 * @param request - the skin id.
 * @returns the resolved skin.
 */
@Remote('skin') async skin(request: MarketplaceSkinRequest): Promise<MarketplaceSkinValue>
```

Source: [`packages/treasury/marketplace/src/index.ts`](../../packages/treasury/marketplace/src/index.ts)
<!-- END GENERATED cordis-surface -->