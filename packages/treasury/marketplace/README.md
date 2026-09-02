# @deepseek-ai/dsh-marketplace

English | [中文](README.zh.md)

The Eightfold marketplace Host service. It exposes one Remote namespace, `marketplace`, that the web client uses to browse and install the Armoury and Treasury catalogs: `catalog` lists every registry entry with its installed and update state, `install` installs one entry under the Eightfold home, and `skin` resolves one installed skin into client theme vocabulary. The service is a thin Remote seam over `@deepseek-ai/dsh-treasury` and `@deepseek-ai/dsh-armoury`; those packages own the transport, validation, and installation contracts.

## Remote API

- `marketplace/catalog({ kind })` — one frozen item per registry entry: identity, source, pinned or recorded commit, `installed`, and `updateAvailable`. Update detection is commit-based: for each installed entry the service resolves the current source head (`git ls-remote` for unpinned sources) and compares it with the recorded commit.
- `marketplace/install({ kind, id })` — installs the entry and replaces any existing installation; activation stays with the consumer.
- `marketplace/skin({ id })` — returns the installed skin's id, name, color scheme, and resolved `--dsw-alias-*` token overrides, ready for the Client theme registry.

Failures are `RemoteError`s with codes `marketplace/registry-unavailable`, `marketplace/invalid-registry`, `marketplace/unknown-item`, `marketplace/install-failed`, `marketplace/skin-not-installed`, and `marketplace/skin-invalid`.

## Configuration

None. Registry endpoints and the Eightfold home come from the environment through the distribution libraries (`$EIGHTFOLD_TREASURY_URL`, `$EIGHTFOLD_ARMOURY_URL`, `$EIGHTFOLD_HOME`).

## Known Limitations and Deferred Work

- **One `git ls-remote` per installed entry per listing** — a catalogue call resolves every installed entry's source head; registry-level update feeds are deferred.
- **Install is not authorized** — any web client session that can reach the `/api` route can install into the host's Eightfold home; scope-restricted install policies are deferred.
- **Skin activation is runtime-only** — a skin applied through `marketplace/skin` is registered in the Client theme registry for the session; persisting a skin preference across reloads is deferred.
