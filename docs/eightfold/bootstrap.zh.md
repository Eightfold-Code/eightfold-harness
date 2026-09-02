# Eightfold Harness 引导记录

[English](bootstrap.md) | 中文

本记录捕获 Eightfold Harness fork 在本机上的首次完整启动：上游基线、环境、每个引导门禁的真实结果，以及 Treasury 的线上端到端证明。它是证据，不是教程；用 [scripts/eightfold-e2e.sh](../../scripts/eightfold-e2e.sh) 复现该环路。

## 上游基线

该 fork 基于上游 commit `b150a551b8`（Merge pull request #2908 from `deepseek-harness/release/dsh-0.1.1-rc.2`）。版本 `0.1.1-rc.2` 在该合并之上提交于此树。

## 环境

- 操作系统：Linux 6.8.0-137-generic x86_64
- Node：v26.7.0
- pnpm：11.7.0
- 仓库：`/home/hermes/projects/eightfold-harness`，分支 `main`

引擎范围为 `^22.19.0 || >=24.0.0`，因此 Node 26 属于受支持集合。Eightfold CI 工作流固定 Node 22 与 pnpm 11.7.0；本次本地启动运行于 Node 26。

## 包管理器

pnpm（workspace 根 `pnpm@11.7.0`）。已尝试并成功完成 frozen-lockfile 安装：lockfile 与 `node_modules` 一致，无需变更 store。

```text
$ pnpm install --frozen-lockfile
native/landlock-run/packages/linux-arm64 | [WARN] Unsupported platform: wanted: {"cpu":["arm64"],"os":["linux"],"libc":["any"]} (current: {"os":"linux","cpu":"x64","libc":"glibc"})
Scope: all 247 workspace projects
Already up to date
Done in 870ms using pnpm v11.7.0
```

## 引导门禁

每个门禁一次有界尝试即通过。尾部输出为逐字记录。

| 门禁 | 命令 | 结果 |
|---|---|---|
| 安装 | `pnpm install --frozen-lockfile` | 通过 |
| 启动检查 | `node --import tsx/esm apps/cli/src/bin.ts --version` | 通过 |
| Web 启动 | `node --import tsx/esm apps/cli/src/bin.ts web --no-open` | 通过 |
| Lint | `pnpm run lint` | 通过 |
| Typecheck | `pnpm run typecheck` | 通过 |
| 测试 | `pnpm run test` | 通过 |
| 构建 | `pnpm run build` | 通过 |

### 启动检查

```text
$ node --import tsx/esm apps/cli/src/bin.ts --version
0.1.1-rc.2
```

### Web 启动

web profile 绑定 `http://127.0.0.1:3080`，返回 HTTP 200 与 web 应用 HTML。它以 `--no-open` 启动，并在探测后关闭。

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

### 测试

```text
$ pnpm run test
 Test Files  868 passed | 9 skipped (877)
      Tests  14632 passed | 114 skipped (14746)
   Duration  379.68s (transform 86.07s, setup 47.23s, import 202.86s, tests 626.96s, environment 107.01s)
exit: 0
```

### 构建

```text
$ pnpm run build
✓ built in 3.69s
build: recorded 200 client artifact(s) with 1 public value(s)
exit: 0
```

## Treasury 端到端证明

线上公共 registry 可达，因此无需本地夹具。完整环路针对真实 registry 与 codeload 归档运行，固定 commit `6972d70`，校验了 manifest，安装进仓库局部的 `.eightfold/` home，并以完全符合预期的输出执行了已安装的适配。

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

固定的 commit 与线上 `adaptation/hello-eightfold` 分支头一致，且已安装的 `src/index.ts` 实现了该适配 `eightfold.json` 条目中的 `eightfoldHello`。分发设计见 [treasury.md](treasury.zh.md)。

## 已知失败与临时兼容性说明

- 没有引导门禁失败；本记录不含失败项。
- `pnpm run verify-md-wrap` 在根 `AGENTS.md` 的 House Writing Standards 小节为红，该小节把编号规则散文硬换行。该失败早于本记录（由 `docs: add house writing standards overlay` 提交引入），与引导门禁无关。
- `pnpm install --frozen-lockfile` 警告 `native/landlock-run/packages/linux-arm64` 面向 `arm64` 而本机为 `x64`。store 会跳过该平台专属原生包；警告符合预期且非致命。
- `pnpm run build` 会为超过 500 kB 的 client chunk 打印 Vite chunk 体积警告。它们只是提示，非致命。
- 本地启动运行于 Node 26，而 Eightfold CI 固定 Node 22；两者都在引擎范围内。
- `.eightfold/` Treasury home 是仓库局部且按设计被 gitignore；安装从不触碰操作系统 home。
