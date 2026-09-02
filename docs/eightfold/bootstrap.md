# Eightfold Harness bootstrap record

English | [中文](bootstrap.zh.md)

This record captures the first complete boot of the Eightfold Harness fork on this machine: the upstream base, the environment, each bootstrap gate with its real outcome, and the live Treasury end-to-end proof. It is evidence, not a tutorial; reproduce the loop with [scripts/eightfold-e2e.sh](../../scripts/eightfold-e2e.sh).

## Upstream base

The fork sits on upstream commit `b150a551b8` (Merge pull request #2908 from `deepseek-harness/release/dsh-0.1.1-rc.2`). Version `0.1.1-rc.2` is committed in this tree on top of that merge.

## Environment

- OS: Linux 6.8.0-137-generic x86_64
- Node: v26.7.0
- pnpm: 11.7.0
- Repository: `/home/hermes/projects/eightfold-harness`, branch `main`

The engine range is `^22.19.0 || >=24.0.0`, so Node 26 is within the supported set. The Eightfold CI workflow pins Node 22 with pnpm 11.7.0; this local boot ran under Node 26.

## Package manager

pnpm (workspace root `pnpm@11.7.0`). The frozen-lockfile install was attempted and succeeded: the lockfile already matched `node_modules`, so no store changes were needed.

```text
$ pnpm install --frozen-lockfile
native/landlock-run/packages/linux-arm64 | [WARN] Unsupported platform: wanted: {"cpu":["arm64"],"os":["linux"],"libc":["any"]} (current: {"os":"linux","cpu":"x64","libc":"glibc"})
Scope: all 247 workspace projects
Already up to date
Done in 870ms using pnpm v11.7.0
```

## Bootstrap gates

Each gate got one bounded attempt and passed. Tails are verbatim.

| Gate | Command | Result |
|---|---|---|
| Install | `pnpm install --frozen-lockfile` | PASS |
| Boot check | `node --import tsx/esm apps/cli/src/bin.ts --version` | PASS |
| Web boot | `node --import tsx/esm apps/cli/src/bin.ts web --no-open` | PASS |
| Lint | `pnpm run lint` | PASS |
| Typecheck | `pnpm run typecheck` | PASS |
| Test | `pnpm run test` | PASS |
| Build | `pnpm run build` | PASS |

### Boot check

```text
$ node --import tsx/esm apps/cli/src/bin.ts --version
0.1.1-rc.2
```

### Web boot

The web profile bound `http://127.0.0.1:3080`, served HTTP 200, and returned the web app HTML. It was started with `--no-open` and shut down after the probe.

```text
$ node --import tsx/esm apps/cli/src/bin.ts web --no-open
dsh web: http://127.0.0.1:3080

$ curl -sS -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:3080
HTTP 200
```

### Lint

```text
$ pnpm run lint
> @deepseek-ai/dsh-root@0.1.1-rc.2 lint:contracts-ready
> tsx scripts/run-oxlint.ts .
exit: 0
```

### Typecheck

```text
$ pnpm run typecheck
> @deepseek-ai/dsh-root@0.1.1-rc.2 typecheck:contracts-ready
> tsc -b tsconfig.client.json
exit: 0
```

### Test

```text
$ pnpm run test
 Test Files  868 passed | 9 skipped (877)
      Tests  14632 passed | 114 skipped (14746)
   Duration  379.68s (transform 86.07s, setup 47.23s, import 202.86s, tests 626.96s, environment 107.01s)
exit: 0
```

### Build

```text
$ pnpm run build
✓ built in 3.69s
build: recorded 200 client artifact(s) with 1 public value(s)
exit: 0
```

## End-to-end Treasury proof

The live public registry was reachable, so no local fixture was needed. The full loop ran against the real registry and codeload archive, pinned commit `6972d70`, validated the manifest, installed into the repo-local `.eightfold/` home, and executed the installed adaptation with the exact expected output.

```text
$ node --import tsx/esm apps/cli/src/bin.ts eightfold treasury list
Treasury registry https://raw.githubusercontent.com/Eightfold-Code/eightfold-treasury/main/registry.json
hello-eightfold  0.1.0  Hello Eightfold
  Minimal example Eightfold adaptation.

$ node --import tsx/esm apps/cli/src/bin.ts eightfold add hello-eightfold
Resolved hello-eightfold -> Eightfold-Code/eightfold-treasury@6972d70 (branch adaptation/hello-eightfold)
Validated manifest (Hello Eightfold 0.1.0)
Installed hello-eightfold to /home/hermes/projects/eightfold-harness/.eightfold/adaptations/hello-eightfold
Registered permissions: none

$ node --import tsx/esm --input-type=module -e "const m = await import('file:///home/hermes/projects/eightfold-harness/.eightfold/adaptations/hello-eightfold/src/index.ts'); console.log(m.eightfoldHello(JSON.parse('{\"name\":\"Dino\"}')))"
Hello Dino from Eightfold.
```

The pinned commit matches the live `adaptation/hello-eightfold` branch head, and the installed `src/index.ts` implements `eightfoldHello`, the adaptation's `eightfold.json` entry. See [treasury.md](treasury.md) for the distribution design.

## Known failures and temporary compatibility notes

- No bootstrap gate failed; the record contains no failures.
- `pnpm run verify-md-wrap` is red on the root `AGENTS.md` House Writing Standards section, which hard-wraps numbered rule prose. The failure predates this record (introduced by the `docs: add house writing standards overlay` commit) and is unrelated to the bootstrap gates.
- `pnpm install --frozen-lockfile` warns that `native/landlock-run/packages/linux-arm64` targets `arm64` while this host is `x64`. The store skips the platform-specific native package; the warning is expected and non-fatal.
- `pnpm run build` prints Vite chunk-size warnings for client chunks over 500 kB. They are advisory and non-fatal.
- The local boot ran under Node 26, while the Eightfold CI pins Node 22. Both are within the engine range.
- The `.eightfold/` Treasury home is repo-local and gitignored by design; installs never touch the operating-system home.
