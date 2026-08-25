# Eightfold Harness

**A modular agent runtime built to adapt.**

Eightfold Harness is a fork of [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) that keeps its plugin-first architecture and adds a lightweight distribution layer for discovering and installing capabilities on demand.

At the core of the project is a simple idea: **everything is a module**. Runtime behavior, tools, interfaces, and higher-level capabilities are composed through the existing [Cordis](https://github.com/cordiverse/cordis) plugin system rather than being permanently baked into one monolithic agent.

Eightfold adds **Treasury** on top of that model: a registry of installable adaptations that can be fetched independently, pinned to exact commits, validated, and managed locally.

> Eightfold is currently a developer preview. APIs, commands, manifests, and repository structure may change while the distribution model is being stabilized.

## The model

```text
┌──────────────────────┐
│  Eightfold Treasury  │
│  registry + bundles  │
└──────────┬───────────┘
           │ discover / install
           ▼
┌──────────────────────┐
│  Eightfold Harness   │
│  runtime + profiles  │
└──────────┬───────────┘
           │ compose
           ▼
┌──────────────────────┐
│ Cordis plugin graph  │
│ tools · UI · agents  │
└──────────────────────┘
```

### Harness

The runtime. Harness boots named profiles built from ordered plugin-bundle layers and user overrides.

### Treasury

The distribution layer. [Eightfold Treasury](https://github.com/Eightfold-Code/eightfold-treasury) publishes a machine-readable registry of adaptations and named bundles. Harness can discover, download, validate, update, and remove those adaptations without cloning the entire Treasury repository.

### Adaptations

Small, independently distributed capability packages. Each published adaptation has its own source snapshot, manifest, compatibility metadata, and recorded permissions.

Treasury installation and Harness profile activation are intentionally separate in the current preview. Installing an adaptation does not silently rewrite an existing profile.

## Quick start

### Requirements

- Node.js `^22.19.0` or `>=24.0.0`
- pnpm 11 (the repository pins its package-manager version)

### Run from source

```bash
git clone https://github.com/Eightfold-Code/eightfold-harness.git
cd eightfold-harness
corepack enable
pnpm install
pnpm run build
pnpm dsh web
```

The Web UI starts at `http://127.0.0.1:3080` by default.

To launch another profile:

```bash
pnpm dsh --profile tui
pnpm dsh --profile headless "inspect this repository"
```

## Treasury commands

List the adaptations currently published by Treasury:

```bash
pnpm dsh eightfold treasury list
```

Search the registry:

```bash
pnpm dsh eightfold treasury search session
```

Install an adaptation:

```bash
pnpm dsh eightfold add session-search
```

Inspect or install a named bundle:

```bash
pnpm dsh eightfold bundle list
pnpm dsh eightfold bundle add developer
```

Update one adaptation, or every installed adaptation:

```bash
pnpm dsh eightfold update session-search
pnpm dsh eightfold update
```

Remove an adaptation:

```bash
pnpm dsh eightfold remove session-search
```

By default, Eightfold stores Treasury-managed state in `.eightfold/` under the current working directory. Set `EIGHTFOLD_HOME` to use a different location. A custom registry endpoint can be supplied through `EIGHTFOLD_TREASURY_URL`.

## Profiles and plugins

Harness profiles are composable configuration stacks. Existing profile plugins continue to be managed through the native plugin command:

```bash
pnpm dsh plugin --profile tui add <package>
pnpm dsh plugin --profile tui remove <package>
```

This keeps Eightfold compatible with the underlying Harness/Cordis lifecycle rather than introducing a second runtime or package system.

## Why Eightfold?

- **Composable by default** — capabilities are modules rather than permanent runtime features.
- **Install only what you need** — Treasury adaptations are fetched independently.
- **Reproducible sources** — published adaptations can be pinned to exact Git commits.
- **Small distribution surface** — installing one adaptation does not require cloning an entire plugin repository.
- **Native Harness lifecycle** — Eightfold extends the existing profile and Cordis architecture instead of replacing it.

## Development

The project still inherits much of DeepSeek Harness's package structure and `@deepseek-ai/*` internal package naming while the Eightfold-specific layer is being developed.

Useful references:

- [Development guide](docs/development.md)
- [Architecture documentation](docs/architecture.md)
- [Contributing](CONTRIBUTING.md)
- [Agent instructions](AGENTS.md)
- [Eightfold Treasury](https://github.com/Eightfold-Code/eightfold-treasury)

## Upstream

Eightfold Harness is based on [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). We preserve upstream attribution and intend to keep the relationship explicit as Eightfold evolves its own distribution and adaptation layer.

## License

[MIT](LICENSE)

Third-party dependencies and their licenses are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
