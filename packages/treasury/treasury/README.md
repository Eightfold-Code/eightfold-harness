# @deepseek-ai/dsh-treasury

The Eightfold Treasury distribution layer. This package fetches the public Treasury registry, structurally validates the registry and `eightfold.json` manifests, and installs adaptations: it pins a source branch to a commit, downloads the codeload tarball for that commit, validates the manifest and every archive path before writing, extracts safely under `$EIGHTFOLD_HOME`, and records the manifest and requested permissions. See [docs/eightfold/treasury.md](../../../docs/eightfold/treasury.md) for the distribution design.

## Modules

- `client.ts` — transport for the registry JSON, with a timeout and positioned errors. `$EIGHTFOLD_TREASURY_URL` overrides the default `https://raw.githubusercontent.com/Eightfold-Code/eightfold-treasury/main/registry.json`.
- `registry.ts` — `parseRegistry` structurally validates the registry document (`schemaVersion` plus an `adaptations` map of id to descriptor). `isCompatible` applies the descriptor's `eightfoldHarness` floor to a harness version.
- `manifest.ts` — `parseManifest` structurally validates an adaptation's `eightfold.json` (`schemaVersion`, `id`, `name`, `version`, `description`, `entry`, `compatibility`, `permissions`, `dependencies`).
- `installer.ts` — `installAdaptation` resolves the pinned commit (`git ls-remote` on the branch head, or an explicit source `commit`), downloads `https://codeload.github.com/<repo>/tar.gz/<commit>`, validates the manifest and every archive path before writing, extracts atomically to `$EIGHTFOLD_HOME/adaptations/<id>`, and records the result in `$EIGHTFOLD_HOME/installed.json`. `removeAdaptation` deletes an installation. `resolveEightfoldHome` resolves `$EIGHTFOLD_HOME`, defaulting to `.eightfold/` under the invoking directory.

## Local storage

`$EIGHTFOLD_HOME` defaults to `.eightfold/` under the invoking directory so a prototype never touches the operating-system home. The layout is provisional ([docs/eightfold/treasury.md](../../../docs/eightfold/treasury.md)).

## Security posture

An adaptation is untrusted. The installer validates the manifest before writing any file, rejects every malformed archive path (traversal, absolute, backslash, drive-colon, symlink/hard-link entries) before writing, extracts to a sibling temp directory and renames it into place, and never executes downloaded code. Installation and activation are separate: activation is out of scope for this package.

## Known Limitations and Deferred Work

- **Branch resolution needs `git`** — `installAdaptation` shells out to `git ls-remote`; the GitHub API fallback is deferred.
- **Naive compatibility floor** — `isCompatible` compares only `>=x.y.z` floors by numeric prefix; other range forms (`~`, `^`, `=`) are treated as compatible.
- **Reinstall replaces the installed copy** — `installAdaptation` overwrites an existing installation; dependency install and profile activation are deferred.
