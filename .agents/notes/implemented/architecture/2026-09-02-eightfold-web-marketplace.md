# Agent Note: Eightfold web marketplace over the distribution libraries

Status: implemented

English | [中文](2026-09-02-eightfold-web-marketplace.zh.md)

## Problem

The Eightfold web client had no path to the distribution layer: Treasury adaptations and Armoury skins were installable only through the `dsh eightfold` CLI, and the Armoury side had no harness implementation at all — the root README documented `dsh eightfold armoury` commands that no package implemented, and the only Armoury evidence was a sample installed skin under `.eightfold/`. A sketched client component (`EightfoldMarketplace`) assumed a `connection.api.host` surface that never existed: `ConnectionHandle` carries no `api` member, and no Remote namespace served the catalogs.

## Decision

The marketplace is one Host Remote namespace, `marketplace` (`packages/treasury/marketplace`), over the two distribution libraries, and the client registers into the sidebar's existing footer-action slot rather than inventing a new shell seam.

- **Armoury became a library, `@deepseek-ai/dsh-armoury`.** It mirrors the Treasury package module-for-module (registry client, registry/manifest/theme parsers, installer) against the live `eightfold-armoury` registry format: a `"1.0"` schema version string, descriptor `id` matching the registry key, and token documents referenced by path rather than inlined. Shared machinery (tar reading, path validation, atomic extraction, source/compatibility/installed-record parsing) is exported from `@deepseek-ai/dsh-treasury` and reused, not duplicated.
- **Skin application resolves host-side.** Armoury ships primitive palette values, not client variables; `resolveSkinTheme` maps the `colors` group onto `--dsw-alias-*` overrides through a fixed table (`SKIN_COLOR_ALIASES`) and `marketplace/skin` returns the resolved payload. The client inject face wraps it into the existing theme registry: register, then select. Nothing new is persisted; skins are session-scoped themes.
- **One component, two registrations.** `EightfoldMarketplace` receives `kind` and plain catalog/install callbacks through its inject face — the component never sees `ctx.remote` — and `ui-settings-general` registers it twice into `sidebar.footer.action` (`eightfold-armoury`, `eightfold-treasury`), following the `ui-cordis` cross-package precedent. Components get callbacks, never the connection or the remote service.
- **Failures are one layer.** The service classifies library failures into six `marketplace/*` codes and the client treats any non-ok branch as display copy; no business result unions ride the wire.

## Consequences

Update detection stays commit-based and client-triggered: one `git ls-remote` per installed entry per listing, so no push or background feed. Install is not session-authorized beyond the existing `/api` trust fence; a policy seam is deferred until a deployment needs it. Typography and preset token groups resolve to nothing yet; the alias table covers the color palette only, and a skin applied through `marketplace/skin` is a session-scoped theme preference, not a persisted one.

## Alternatives considered

- **Extend `dsh-treasury` with the service** — rejected: the package is a plain distribution library with its own published surface; a Typert service needs zod, generated `./typert`/`./remote` artifacts, and a composition row, which would change the library's role and payload for one consumer.
- **Serve raw skin documents and map client-side** — rejected: the alias mapping is a single authority over wire traffic and client code, and the wire would carry documents the client must re-validate.
- **A new shell slot for the marketplace** — rejected: `sidebar.footer.action` already exists with the `wide` owner param and a cross-package registrant precedent (`ui-cordis`); a new slot would duplicate that composition for no new consumer.

## Verification

- `pnpm run build:lib` regenerates the marketplace's `./typert` and `./remote` artifacts; `pnpm run typecheck` covers both faces.
- The composition row is exercised by `pnpm run verify-cordis-config`; the client roster by `pnpm run verify-client-packages`; copy ownership by `pnpm run verify-client-ui-i18n`.
