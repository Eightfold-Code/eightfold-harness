# Treasury: capability distribution for Eightfold Harness

Treasury is the Eightfold distribution layer. Users discover capabilities and install them on demand. A capability ships as an *adaptation*: a plugin source archive plus a manifest that declares identity, permissions, and compatibility.

Treasury may also publish named *bundles*. A bundle is only a registry-level list of adaptation ids; it does not introduce another plugin format. The Harness expands the bundle and installs each referenced adaptation through the same validated installer path.

## CLI

Inspect the public registry:

```bash
dsh eightfold treasury list
dsh eightfold treasury search <query>
```

Install and manage individual adaptations:

```bash
dsh eightfold add <name>
dsh eightfold remove <name>
dsh eightfold update [name]
```

Inspect and install named bundles:

```bash
dsh eightfold bundle list
dsh eightfold bundle add <name>
```

For example, if Treasury publishes a `developer` bundle containing `hello-eightfold` and `session-search`, `dsh eightfold bundle add developer` installs each missing adaptation and leaves adaptations that are already present untouched.

## Install flow

`dsh eightfold add <name>` runs the following pipeline:

```text
User
  -> dsh eightfold add <name>
  -> Eightfold CLI
  -> Treasury Registry          (name -> adaptation descriptor)
  -> resolve adaptation
  -> pinned commit
  -> download archive           (GitHub tarball/zip at that commit)
  -> validate manifest
  -> install dependencies
  -> register plugin            (profile package.json and bundles list)
  -> update local profile
```

`dsh eightfold bundle add <name>` first resolves the named bundle to adaptation ids, then runs the same installation pipeline for each adaptation. Bundle membership is validated when the registry is parsed: unknown and duplicate adaptation ids are rejected.

Each arrow is a distinct step with its own failure and log point.

## Transport

Treasury downloads a GitHub archive (tarball or zip) for a specific branch or commit. Normal users never trigger a full clone. Pinning a commit keeps the installed artifact reproducible; the download URL names the commit explicitly.

## Security requirements

Treasury treats a downloaded adaptation as untrusted. It enforces the following requirements:

- Validate the manifest before writing any file.
- Validate requested permissions against the manifest.
- Validate compatibility with the running Eightfold version.
- Pin a commit; reject unpinned sources.
- Reject malformed archive paths.
- Prevent path traversal outside the extraction directory.
- No arbitrary pre-install shell scripts without explicit approval.
- No execution of downloaded code during download.
- Installation and activation are separate operations.

## Local storage (provisional)

The tentative layout under `~/.eightfold`:

```text
~/.eightfold/
  config.json        Treasury configuration
  adaptations/       downloaded, validated capability sources
  cache/             archives and resolved descriptors
  profiles/          local profile state
```

The layout is provisional and may change as the installer evolves.

## Adapting DeepSeek Harness plugin resolution

DeepSeek Harness loads out-of-tree plugins through the profile mechanism described in [architecture.md](../architecture.md). A profile directory under the Harness home holds a `package.json` (out-of-tree plugin dependencies plus the `dsh.profile` manifest's ordered `bundles` list) and a `cordis.patch.yml` user patch layer. The `dsh plugin --profile <name> add <package>` command forwards to pnpm in the profile directory ([plugin.ts](../../apps/cli/src/plugin.ts)). Bundle names resolve two-anchored — the dsh installation first, then the profile directory — and bare plugin names resolve through the profile directory's Node parent-walk to the maintained flat fallback `$DSH_HOME/profiles/node_modules` ([profile.ts](../../packages/boot/app-boot/src/profile.ts)).

The Eightfold installer must adapt this mechanism rather than invent a conflicting one. It downloads and validates a capability archive, installs the resulting plugin into the profile's `package.json` and `node_modules`, and updates `dsh.profile.bundles`, so resolution continues through the existing loader.
