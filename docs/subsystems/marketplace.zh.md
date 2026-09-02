# 市场

[English](marketplace.md) | 中文

[`@deepseek-ai/dsh-marketplace`](../../packages/treasury/marketplace) 是网页客户端视角下的 Eightfold 分发层：一个 `marketplace` Remote 命名空间，列出 Armoury 与 Treasury 目录、在 Eightfold home 下安装条目，并把已安装皮肤解析为客户端主题词汇。该服务只负责失败归类；`@deepseek-ai/dsh-treasury` 与 `@deepseek-ai/dsh-armoury` 拥有传输、校验与安装契约。

Source: [`packages/treasury/marketplace/src/types.ts`](../../packages/treasury/marketplace/src/types.ts)

## Remote 方法

- `marketplace/catalog({ kind })` 为每个 registry 条目返回一个条目及其安装与更新状态。更新检测基于 commit：对每个已安装条目，服务解析当前源分支头并与记录的 commit 比较，因此一次列表会对每个已安装条目执行一次 `git ls-remote`。
- `marketplace/install({ kind, id })` 安装一个条目并替换既有安装。它在安装管线提交后返回；激活由消费者负责。
- `marketplace/skin({ id })` 把一个已安装皮肤解析为客户端主题词汇，可直接注册进客户端主题 registry。

失败以 `RemoteError` 表达：`marketplace/registry-unavailable`、`marketplace/invalid-registry`、`marketplace/unknown-item`、`marketplace/install-failed`、`marketplace/skin-not-installed` 与 `marketplace/skin-invalid`。

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

## 客户端接线

`ui-settings-general` 在 inject 列表中声明 `remote.marketplace`，向 `sidebar.footer.action` 注册两次市场组件（一次 Armoury、一次 Treasury），并把 `marketplace/skin` 接入主题 registry：先注册解析后的 token，再选中主题。组件通过 inject face 接收纯目录/安装回调；它们永远接触不到 `ctx.remote`。

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.zh.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

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