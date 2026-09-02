# @deepseek-ai/dsh-armoury

English | [中文](README.zh.md)

The Eightfold Armoury distribution layer. This package fetches the public Armoury skin registry, structurally validates the registry, `eightfold.skin.json` manifests, and `theme.json` entry documents, and installs skins: it pins a source branch to a commit, downloads the codeload tarball for that commit, validates every archive path before writing, extracts safely under the Eightfold home, and records the installation. It also resolves an installed skin's token documents into the client alias-variable overrides a theme registry consumes. See [docs/eightfold/treasury.md](../../../docs/eightfold/treasury.md) for the shared distribution design.

## Modules

- `client.ts` — transport for the skin registry JSON, with a timeout and positioned errors. `$EIGHTFOLD_ARMOURY_URL` overrides the default `https://raw.githubusercontent.com/Eightfold-Code/eightfold-armoury/main/registry.json`.
- `registry.ts` — `parseArmouryRegistry` structurally validates the registry document (a `"1.0"` schema version string plus a `skins` map of id to descriptor and optional `collections`). A descriptor's `id` must match its registry key; `manifest` names the archive-root skin manifest and defaults to `eightfold.skin.json`.
- `skin.ts` — `parseSkinManifest` and `parseSkinTheme` structurally validate the installed `eightfold.skin.json` and the `theme.json` it points at; the theme's `mode` selects the base palette (`light` or `dark`) and its `tokens` map names referenced token documents.
- `theme.ts` — `resolveSkinTheme` reads the referenced token documents and maps the `colors` group's primitives onto client `--dsw-alias-*` variables through `SKIN_COLOR_ALIASES`.
- `installer.ts` — `installSkin` resolves the pinned commit, downloads the codeload tarball, validates the skin manifest and every archive path before writing, extracts atomically to `<home>/skins/<id>`, and records the result in `<home>/armoury.json`. `removeSkin` deletes an installation. The Eightfold home is shared with `@deepseek-ai/dsh-treasury` (`resolveEightfoldHome`).

## Security posture

A skin is untrusted. The installer validates the skin manifest before writing any file, rejects every malformed archive path before writing, extracts to a sibling temp directory and renames it into place, and never executes downloaded code. Skin documents are presentation-only by contract; token-file paths are contained within the skin directory.

## Known Limitations and Deferred Work

- **Only the color group resolves** — `resolveSkinTheme` maps the `colors` token group; typography and preset documents are deferred vocabulary and currently ignored.
- **Partial alias coverage** — `SKIN_COLOR_ALIASES` maps the core palette primitives; unknown primitives and the `focus` primitive resolve to no client variable.
- **Branch resolution needs `git`** — unpinned sources shell out to `git ls-remote`; the GitHub API fallback is deferred.
