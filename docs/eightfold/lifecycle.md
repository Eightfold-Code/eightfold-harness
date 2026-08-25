# Treasury activation lifecycle

Treasury installation and Harness profile activation are deliberately separate
layers:

1. Treasury resolves a registry entry to a pinned commit.
2. The adaptation is downloaded and validated under the Eightfold home.
3. When `--profile <name>` is supplied, the downloaded package is handed to the
   existing `dsh plugin` profile manager.
4. The profile manager owns pnpm dependency state and `dsh.profile.bundles`.

This keeps Eightfold compatible with the native DeepSeek Harness/Cordis plugin
model rather than introducing a second runtime loader.

## Current v0.1 boundary

Activation is supported on install:

```sh
dsh eightfold add browser --profile tui
dsh eightfold add developer --profile tui
```

Treasury removal currently removes the local Treasury installation only. A
future lifecycle change must record or discover profile activations so removal
can safely unlink an adaptation from every profile that references it before
its local source is deleted.

Likewise, an update should refresh profile package state when the profile uses
a copied package representation rather than a live link.

Until activation ownership is recorded, do not add hidden profile scanning or
implicit destructive cleanup. Profile lifecycle needs one explicit source of
truth.

## Required follow-up

The activation-state milestone should define:

- how an installed adaptation records the profiles that activated it;
- how `remove` unlinks those profiles before deleting the Treasury copy;
- how `update` refreshes activated profiles;
- how manually removed profile dependencies reconcile with Treasury state;
- how bundle-level removal behaves when members are shared by other bundles;
- rollback behavior when activation succeeds for only part of a bundle.
