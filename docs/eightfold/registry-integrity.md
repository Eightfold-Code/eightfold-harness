# Treasury registry integrity

The Treasury registry is the release index; an adaptation branch is only the
source material. A published registry entry should therefore describe the
exact artifact that the installer receives.

## Invariants

For a pinned adaptation, the installer should eventually enforce that the
root `eightfold.json` agrees with the registry descriptor on at least:

- adaptation id;
- version;
- entry point;
- Harness compatibility declaration.

The current installer already rejects a manifest whose id differs from the
requested adaptation. Version, entry, and compatibility synchronization remain
a follow-up hardening step.

The registry should always prefer a full 40-character commit pin. Branch-only
entries remain useful for development registries, but stable Treasury releases
should be reproducible without resolving a moving branch head.
