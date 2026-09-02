# @deepseek-ai/dsh-marketplace

[English](README.md) | 中文

Eightfold 市场 Host 服务。它暴露一个 Remote 命名空间 `marketplace`，网页客户端通过它浏览并安装 Armoury 与 Treasury 目录：`catalog` 列出每个 registry 条目及其安装与更新状态，`install` 在 Eightfold home 下安装一个条目，`skin` 把一个已安装皮肤解析为客户端主题词汇。该服务是架在 `@deepseek-ai/dsh-treasury` 与 `@deepseek-ai/dsh-armoury` 之上的薄 Remote 接缝；传输、校验与安装契约由那两个包拥有。

## Remote API

- `marketplace/catalog({ kind })` — 每个 registry 条目一个冻结条目：身份、来源、固定或记录的 commit、`installed` 与 `updateAvailable`。更新检测基于 commit：对每个已安装条目，服务解析当前源分支头（未固定源执行 `git ls-remote`）并与记录的 commit 比较。
- `marketplace/install({ kind, id })` — 安装该条目并替换既有安装；激活由消费者负责。
- `marketplace/skin({ id })` — 返回已安装皮肤的 id、名称、配色方案与解析后的 `--dsw-alias-*` token 覆盖，可直接交给客户端主题 registry。

失败以 `RemoteError` 表达，代码为 `marketplace/registry-unavailable`、`marketplace/invalid-registry`、`marketplace/unknown-item`、`marketplace/install-failed`、`marketplace/skin-not-installed` 与 `marketplace/skin-invalid`。

## 配置

无。registry 端点与 Eightfold home 通过分发库从环境读取（`$EIGHTFOLD_TREASURY_URL`、`$EIGHTFOLD_ARMOURY_URL`、`$EIGHTFOLD_HOME`）。

## Known Limitations and Deferred Work

- **每次列表对每个已安装条目执行一次 `git ls-remote`** — 一次目录调用会解析每个已安装条目的源分支头；registry 级更新订阅尚未实现。
- **安装未授权** — 任何能到达 `/api` 路由的网页客户端会话都可以安装到宿主的 Eightfold home；范围受限的安装策略尚未实现。
- **皮肤激活只在运行期生效** — 通过 `marketplace/skin` 应用的皮肤注册在客户端主题 registry 中；跨刷新持久化皮肤偏好尚未实现。
