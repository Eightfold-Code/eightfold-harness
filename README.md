# Eightfold Harness

**The runtime for composable, adaptable AI systems.**

Eightfold Harness is a plugin-first agent runtime based on [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) and [Cordis](https://github.com/cordiverse/cordis). It keeps the native Harness lifecycle and adds the Eightfold model for discovering, installing, and composing replaceable capabilities.

> Eightfold is in developer preview. APIs, commands, manifests, and repository structure may change.

## The Eightfold model

| Project | Role | Owns |
| --- | --- | --- |
| [Harness](https://github.com/Eightfold-Code/eightfold-harness) | Runtime | Sessions, profiles, lifecycle, and plugin composition |
| [Treasury](https://github.com/Eightfold-Code/eightfold-treasury) | Capability catalog | Installable adaptations and named bundles |
| [Armoury](https://github.com/Eightfold-Code/eightfold-armoury) | Visual catalog | Presentation-only skins and themes |

Harness is the engine. Treasury supplies capabilities. Armoury supplies visual presentation.

## What Harness provides

- A plugin graph built on the Cordis lifecycle.
- Composable profiles for web, terminal, headless, and other surfaces.
- Runtime services for sessions, tools, models, filesystems, shells, subagents, and workflows.
- A native installation path for adaptations published by Treasury.
- Independent skin selection through Armoury.

Eightfold extends the existing Harness architecture instead of creating a parallel plugin runtime.

## Quick start

### Requirements

- Node.js `^22.19.0` or `>=24.0.0`
- pnpm 11

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

Run another profile with:

```bash
pnpm dsh --profile tui
pnpm dsh --profile headless "inspect this repository"
```

## Install capabilities

Discover and install adaptations through Treasury:

```bash
pnpm dsh eightfold treasury list
pnpm dsh eightfold treasury search session
pnpm dsh eightfold add session-search
```

Install a named bundle:

```bash
pnpm dsh eightfold bundle list
pnpm dsh eightfold bundle add developer
```

Update or remove an installed adaptation:

```bash
pnpm dsh eightfold update session-search
pnpm dsh eightfold remove session-search
```

Installing an adaptation does not silently rewrite an existing profile. Profile activation remains explicit.

## Select a skin

Choose a presentation layer independently from capabilities:

```bash
pnpm dsh eightfold armoury list
pnpm dsh eightfold armoury search dark
pnpm dsh eightfold skin add obsidian
pnpm dsh eightfold skin use obsidian
```

A profile can combine both selections:

```json
{
  "adaptations": ["session-search", "developer-tools"],
  "skin": "obsidian"
}
```

## Reproducible installs

Treasury and Armoury registry entries resolve published packages to exact Git commits. Harness validates the manifest, compatibility metadata, archive paths, and declared permissions before it records an installation.

By default, Eightfold stores managed state in `.eightfold/` in the current working directory. Set `EIGHTFOLD_HOME` to use another location. Set `EIGHTFOLD_TREASURY_URL` to use a different registry endpoint.

## Development

The repository retains the upstream package structure and `@deepseek-ai/*` package naming while the Eightfold layer evolves.

Useful references:

- [Architecture](docs/architecture.md)
- [Development guide](docs/development.md)
- [Contributing](CONTRIBUTING.md)
- [Agent instructions](AGENTS.md)
- [Eightfold Treasury](https://github.com/Eightfold-Code/eightfold-treasury)
- [Eightfold Armoury](https://github.com/Eightfold-Code/eightfold-armoury)

## Design principles

- **Modular by default** — runtime behavior is composed from replaceable modules.
- **Native over parallel** — use the existing Harness and Cordis lifecycle.
- **Reproducible** — published sources resolve to exact commits.
- **Inspectable** — manifests and permissions describe what gets installed.
- **Composable** — profiles combine capabilities and presentation independently.

## Upstream

Eightfold Harness is based on [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). Upstream attribution remains explicit as Eightfold develops its own distribution model.

## License

[MIT](LICENSE)

Third-party dependencies and their licenses are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
