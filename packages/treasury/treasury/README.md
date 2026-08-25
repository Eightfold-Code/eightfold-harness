# @deepseek-ai/dsh-treasury

The Eightfold Treasury distribution layer. This package fetches the public Treasury registry and structurally validates the registry and adaptation manifest documents. See [docs/eightfold/treasury.md](../../../docs/eightfold/treasury.md) for the distribution design.

## Modules

- `client.ts` — transport for the registry JSON, with a timeout and positioned errors. `$EIGHTFOLD_TREASURY_URL` overrides the default `https://raw.githubusercontent.com/Eightfold-Code/eightfold-treasury/main/registry.json`.
- `registry.ts` — `parseRegistry` structurally validates the registry document (`schemaVersion` plus an `adaptations` map of id to descriptor). `isCompatible` applies the descriptor's `eightfoldHarness` floor to a harness version.
- `manifest.ts` — `parseManifest` structurally validates an adaptation's `eightfold.json` (`schemaVersion`, `id`, `name`, `version`, `description`, `entry`, `compatibility`, `permissions`, `dependencies`).

## Known Limitations and Deferred Work

- **No installer yet** — download, extraction, and local recording of adaptations are deferred to the installer prototype.
- **Naive compatibility floor** — `isCompatible` compares only `>=x.y.z` floors by numeric prefix; other range forms (`~`, `^`, `=`) are treated as compatible.
