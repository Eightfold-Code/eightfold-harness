# Treasury: capability distribution for Eightfold Harness

Treasury is the Eightfold distribution layer. Users discover capabilities and
install them on demand. A capability ships as an *adaptation*: a pinned source
archive plus an `eightfold.json` manifest. Activatable adaptations additionally
use the native DeepSeek Harness `dsh.bundle` package format.

Treasury owns discovery, distribution, pinning, and pre-activation validation.
Harness/Cordis continues to own runtime plugin composition.

## User flow

Inspect Treasury:

```sh
dsh eightfold treasury list
dsh eightfold treasury search browser
```

Install without activating:

```sh
dsh eightfold add browser
```

Install and activate in an existing or newly initialized Harness profile:

```sh
dsh eightfold add browser --profile tui
```

A Treasury bundle is installed through the same command:

```sh
dsh eightfold add developer --profile tui
```

## Install flow

```text
User
  -> dsh eightfold add <adaptation-or-bundle> [--profile <name>]
  -> Eightfold CLI
  -> Treasury registry
  -> expand bundle when needed
  -> reject incompatible Harness versions
  -> resolve each adaptation descriptor
  -> exact commit
  -> download GitHub commit archive
  -> validate archive paths + eightfold.json
  -> atomically extract under Eightfold home
  -> record installed commit + permissions
  -> optional: dsh plugin --profile <name> add <local-package-path>
  -> native profile pnpm dependency + dsh.profile.bundles reconciliation
```

The Treasury installer itself never executes downloaded adaptation code. Profile
activation is a separate step delegated to the existing Harness plugin manager.

## Registry and pinning

A stable registry entry should contain a full 40-character `source.commit`.
That commit is the published release: the adaptation branch may move afterward
without changing what users install.

Branch-only descriptors remain accepted for development registries. In that
case the installer resolves the branch head with `git ls-remote` and records the
resulting commit before download.

The public Eightfold Treasury should prefer commit-pinned entries.

## Transport

Treasury downloads a GitHub codeload archive for the resolved commit. Normal
users do not clone the full Treasury repository or its other adaptation
branches.

Before any archive entry is written, the installer validates its path and plans
the extraction. The validated tree is written to a temporary destination and
renamed into place only after extraction succeeds.

## Native Harness activation

DeepSeek Harness already has an out-of-tree bundle/profile mechanism. Eightfold
reuses it rather than creating a second plugin loader.

An activatable Treasury package declares a native bundle in `package.json`:

```json
{
  "name": "eightfold-browser",
  "type": "module",
  "main": "index.js",
  "dsh": {
    "bundle": {
      "patch": "./cordis.patch.yml"
    }
  }
}
```

Its patch inserts the ordinary Cordis plugin rows:

```yaml
- insert:
    - id: eightfold-browser
      name: eightfold-browser
```

After Treasury has downloaded the package, `--profile` hands its absolute local
path to the existing `dsh plugin` implementation. That implementation owns
profile initialization, pnpm installation/linking, package resolution, and the
`dsh.profile.bundles` list.

## Local storage

The current prototype defaults to `.eightfold/` under the invoking directory.
`EIGHTFOLD_HOME` overrides it.

```text
.eightfold/
├── installed.json
└── adaptations/
    ├── browser/
    └── ...
```

Harness profiles remain under the ordinary Harness home (`$DSH_HOME/profiles`)
and are not duplicated under the Eightfold home.

## Current security properties

Implemented today:

- registry and manifest structural validation;
- commit pin support, with branch resolution recorded to a commit when needed;
- Harness version compatibility gating before install and update;
- archive path validation before writes;
- path-traversal containment checks;
- atomic replacement of an installed adaptation directory;
- manifest id must match the requested adaptation id;
- requested permissions are recorded in installed state;
- no adaptation code is executed during Treasury download/extraction;
- activation reuses the existing Harness profile/plugin mechanism.

Still to harden:

- enforce registry descriptor ↔ downloaded manifest agreement for version,
  entry, and compatibility;
- define user approval UX for requested permissions before activation;
- track profile activations so remove/update can safely reconcile every profile;
- transactional rollback when only part of a multi-adaptation bundle succeeds.

See [registry-integrity.md](registry-integrity.md), [lifecycle.md](lifecycle.md),
and [roadmap.md](roadmap.md) for those follow-ups.
