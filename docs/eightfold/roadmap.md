# Eightfold bootstrap roadmap

## v0.1 — Distribution loop

- [x] Base Eightfold Harness on DeepSeek Harness.
- [x] Preserve upstream MIT attribution and upstream tracking.
- [x] Add Treasury registry client and manifest validation.
- [x] Download adaptations by pinned commit archive.
- [x] Validate archive paths before extraction.
- [x] Record installed adaptation state and permissions.
- [x] Add `treasury list`, `treasury search`, `add`, `remove`, and `update` CLI flows.
- [x] Publish a real `hello-eightfold` adaptation.
- [x] Add named Treasury bundle parsing and installation.
- [x] Reuse native `dsh.bundle` / profile activation via `--profile`.
- [ ] Track profile activations for safe remove/update lifecycle.
- [ ] Enforce registry descriptor ↔ downloaded manifest version/entry/compatibility agreement.
- [ ] Add a second non-demo adaptation to prove the format with a useful capability.

## v0.2 — Treasury UX

- [ ] Add installed/adaptation status output.
- [ ] Add explicit bundle inspection and shared-member handling.
- [ ] Define dependency resolution between Treasury adaptations.
- [ ] Define permission review/approval UX before activation.
- [ ] Add transactional bundle installation/rollback.
- [ ] Add cached registry/archive handling without weakening commit pinning.

## v0.3 — Ecosystem

- [ ] Stable public adaptation authoring contract.
- [ ] Automated release/publish checks for adaptation branches.
- [ ] Signed or attestable Treasury release metadata.
- [ ] Multiple configurable Treasury registries.
- [ ] Search metadata/categories without turning Treasury into a heavyweight service.

The governing rule is to extend DeepSeek Harness's native plugin architecture
rather than duplicating it. Treasury owns discovery, distribution, pinning, and
policy; Harness/Cordis owns runtime plugin activation.
