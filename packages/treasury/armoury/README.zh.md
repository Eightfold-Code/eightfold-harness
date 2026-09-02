# @deepseek-ai/dsh-armoury

[English](README.md) | 中文

Eightfold Armoury 分发层。本包获取公共 Armoury 皮肤 registry，结构化校验 registry、`eightfold.skin.json` manifest 与 `theme.json` 入口文档，并安装皮肤：把源分支固定到 commit，下载该 commit 的 codeload tarball，写入前校验每条归档路径，安全解压到 Eightfold home，并记录安装。它还把已安装皮肤引用的 token 文档解析为主题 registry 可消费的客户端别名变量覆盖。共享分发设计见 [docs/eightfold/treasury.md](../../../docs/eightfold/treasury.zh.md)。

## Modules

- `client.ts` — 皮肤 registry JSON 传输，带超时与定位错误。`$EIGHTFOLD_ARMOURY_URL` 覆盖默认的 `https://raw.githubusercontent.com/Eightfold-Code/eightfold-armoury/main/registry.json`。
- `registry.ts` — `parseArmouryRegistry` 结构化校验 registry 文档（字符串化的 `"1.0"` schema 版本、id 到描述符的 `skins` 映射以及可选 `collections`）。描述符的 `id` 必须匹配其 registry 键；`manifest` 指名归档根部的皮肤 manifest，默认 `eightfold.skin.json`。
- `skin.ts` — `parseSkinManifest` 与 `parseSkinTheme` 结构化校验已安装的 `eightfold.skin.json` 及其指向的 `theme.json`；theme 的 `mode` 选择基础色板（`light` 或 `dark`），其 `tokens` 映射指名被引用的 token 文档。
- `theme.ts` — `resolveSkinTheme` 读取被引用的 token 文档，并通过 `SKIN_COLOR_ALIASES` 把 `colors` 组的原始值映射到客户端 `--dsw-alias-*` 变量。
- `installer.ts` — `installSkin` 解析固定 commit、下载 codeload tarball、写入前校验皮肤 manifest 与每条归档路径、原子解压到 `<home>/skins/<id>`，并把结果记录到 `<home>/armoury.json`。`removeSkin` 删除安装。Eightfold home 与 `@deepseek-ai/dsh-treasury` 共享（`resolveEightfoldHome`）。

## 安全姿态

皮肤是不可信内容。安装器在写入任何文件前校验皮肤 manifest，写入前拒绝每条畸形归档路径，解压到同级临时目录后再原位改名，且从不执行下载的代码。皮肤文档按契约是纯展示性的；token 文件路径被限制在皮肤目录之内。

## Known Limitations and Deferred Work

- **只有 colors 组会解析** — `resolveSkinTheme` 映射 `colors` token 组；typography 与 preset 文档是尚未实现的词汇，当前被忽略。
- **别名覆盖不完整** — `SKIN_COLOR_ALIASES` 映射核心色板原语；未知原语与 `focus` 原语不解析到任何客户端变量。
- **分支解析依赖 `git`** — 未固定的源需要调用 `git ls-remote`；GitHub API 回退尚未实现。
