# Eightfold Harness

Eightfold Harness is an adaptive, modular agent runtime built on the plugin
architecture of [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).
It keeps the underlying Cordis model — **everything is a plugin** — and adds an
Eightfold distribution layer called **Treasury** for discovering, pinning,
downloading, and activating capabilities on demand.

```text
Eightfold
├── eightfold-harness   runtime, profiles, CLI, plugin host
└── eightfold-treasury  registry, adaptations, named bundles
```

Eightfold is currently a developer project and tracks a rapidly evolving
upstream. Compatibility can change while the distribution and lifecycle
contracts are being stabilized.

## Bootstrap from source

Clone Eightfold Harness and install the workspace:

```sh
git clone https://github.com/Eightfold-Code/eightfold-harness.git
cd eightfold-harness
pnpm install
pnpm run build
```

Run the existing Harness surfaces as usual:

```sh
pnpm dsh web
pnpm dsh --profile tui
```

The internal package names are still largely `@deepseek-ai/*` because Eightfold
is intentionally staying close to upstream during the bootstrap phase. Renaming
package namespaces is not required for Treasury and would create unnecessary
divergence today.

## Treasury

Treasury is the distribution source for Eightfold adaptations:

```text
https://github.com/Eightfold-Code/eightfold-treasury
```

Inspect the live registry:

```sh
pnpm dsh eightfold treasury list
pnpm dsh eightfold treasury search session
```

Install a pinned adaptation under the Eightfold home:

```sh
pnpm dsh eightfold add session-search
```

Install and activate it in a normal Harness profile:

```sh
pnpm dsh eightfold add session-search --profile tui
```

Named Treasury bundles work through the same path:

```sh
pnpm dsh eightfold add developer --profile tui
```

The `developer` bundle currently demonstrates multi-adaptation resolution with:

- `hello-eightfold` — a minimal native Harness/Cordis plugin package;
- `session-search` — a useful configuration adaptation that enables persistent
  full-text session search using Harness's existing SQLite query plugin.

Treasury downloads exact commit archives rather than cloning all adaptation
branches. Stable public registry entries are commit-pinned for reproducibility.
When `--profile` is supplied, Eightfold delegates activation to the existing
`dsh plugin` profile manager rather than maintaining a second plugin runtime.

See:

- [Treasury architecture](docs/eightfold/treasury.md)
- [Activation lifecycle](docs/eightfold/lifecycle.md)
- [Registry integrity](docs/eightfold/registry-integrity.md)
- [Eightfold roadmap](docs/eightfold/roadmap.md)

## Upstream relationship

Eightfold Harness is derived from DeepSeek Harness and preserves its MIT license
and attribution. The upstream repository is the source of the core Harness and
Cordis architecture; Eightfold-specific work should remain a compatible
extension wherever practical.

When syncing upstream changes, keep the Eightfold distribution layer isolated
and review conflicts rather than mechanically replacing Eightfold-specific
files.

## Development

Run the normal repository checks before merging changes:

```sh
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
```

The Eightfold live distribution proof is available as:

```sh
bash scripts/eightfold-e2e.sh
```

It exercises the public Treasury, pinned adaptation downloads, named bundle
expansion, native profile activation, and execution of an installed adaptation.

Start with the upstream-derived [development guide](docs/development.md) and
[architecture documentation](docs/architecture.md). For agents, follow
[AGENTS.md](AGENTS.md).

## License

[MIT](LICENSE)

Upstream attribution is documented in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
