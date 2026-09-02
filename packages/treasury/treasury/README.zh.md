# @deepseek-ai/dsh-treasury

[English](README.md) | 中文

Eightfold Treasury 分发层。本包获取公共 Treasury registry，结构化校验 registry 与 `eightfold.json` manifest，并安装适配：把源分支固定到 commit，下载该 commit 的 codeload tarball，写入前校验 manifest 与每一条归档路径，安全解压到 `$EIGHTFOLD_HOME`，并记录 manifest 与申请的权限。分发设计见 [docs/eightfold/treasury.md](../../../docs/eightfold/treasury.zh.md)。

## Modules

- `client.ts` — registry JSON 传输，带超时与定位错误。`$EIGHTFOLD_TREASURY_URL` 覆盖默认的 `https://raw.githubusercontent.com/Eightfold-Code/eightfold-treasury/main/registry.json`。
- `registry.ts` — `parseRegistry` 结构化校验 registry 文档（`schemaVersion` 加上 id 到描述符的 `adaptations` 映射）。`isCompatible` 把描述符的 `eightfoldHarness` 下限应用于 harness 版本。
- `manifest.ts` — `parseManifest` 结构化校验适配的 `eightfold.json`（`schemaVersion`、`id`、`name`、`version`、`description`、`entry`、`compatibility`、`permissions`、`dependencies`）。
- `installer.ts` — `installAdaptation` 解析固定 commit（对分支头执行 `git ls-remote`，或使用显式的 source `commit`），下载 `https://codeload.github.com/<repo>/tar.gz/<commit>`，写入前校验 manifest 与每条归档路径，原子解压到 `$EIGHTFOLD_HOME/adaptations/<id>`，并把结果记录到 `$EIGHTFOLD_HOME/installed.json`。`removeAdaptation` 删除安装。`resolveEightfoldHome` 解析 `$EIGHTFOLD_HOME`，默认为调用目录下的 `.eightfold/`。抽取、源校验与 tar 辅助函数（`planExtraction`、`extractAtomically`、`parseDescriptorSource`、`parseDescriptorCompatibility`、`parseInstalledSource`、`downloadBytes`、`resolveCommit`、`decompressTarGz`、`parseTarArchive`）导出给本组的其他分发包使用。

## 本地存储

`$EIGHTFOLD_HOME` 默认为调用目录下的 `.eightfold/`，使原型永不触碰操作系统 home。该布局是临时的（[docs/eightfold/treasury.md](../../../docs/eightfold/treasury.zh.md)）。

## 安全姿态

适配是不可信内容。安装器在写入任何文件前校验 manifest，写入前拒绝每条畸形归档路径（穿越、绝对路径、反斜杠、盘符冒号、符号/硬链接条目），解压到同级临时目录后再原位改名，且从不执行下载的代码。安装与激活分离：激活不在本包范围内。

## Known Limitations and Deferred Work

- **分支解析依赖 `git`** — `installAdaptation` 需要调用 `git ls-remote`；GitHub API 回退尚未实现。
- **朴素的兼容性下限** — `isCompatible` 只对 `>=x.y.z` 下限做数值前缀比较；其他区间形式（`~`、`^`、`=`）一律视为兼容。
- **重装即替换已安装副本** — `installAdaptation` 覆盖既有安装；依赖安装与 profile 激活尚未实现。
