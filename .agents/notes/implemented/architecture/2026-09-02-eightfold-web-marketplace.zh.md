# Agent Note：基于分发库的 Eightfold 网页市场

Status: implemented

[English](2026-09-02-eightfold-web-marketplace.md) | 中文

## 问题

Eightfold 网页客户端此前无法触达分发层：Treasury 适配与 Armoury 皮肤只能通过 `dsh eightfold` CLI 安装；Armoury 一侧更没有任何 harness 实现——根 README 记载的 `dsh eightfold armoury` 命令没有任何包支撑，唯一的 Armoury 证据是 `.eightfold/` 下的示例安装皮肤。一个初稿客户端组件（`EightfoldMarketplace`）假设了从未存在的 `connection.api.host` 表面：`ConnectionHandle` 没有 `api` 成员，也没有任何 Remote 命名空间提供目录服务。

## 决策

市场是单一 Host Remote 命名空间 `marketplace`（`packages/treasury/marketplace`），架在两个分发库之上；客户端注册进侧边栏既有的 footer-action 槽位，而不是发明新的 shell 接缝。

- **Armoury 成为一个库，`@deepseek-ai/dsh-armoury`。** 它逐模块对照 Treasury 包（registry 客户端、registry/manifest/theme 解析器、安装器），面向线上 `eightfold-armoury` registry 格式：字符串化的 `"1.0"` schema 版本、描述符 `id` 必须匹配 registry 键、token 文档以路径引用而非内联。共享机制（tar 读取、路径校验、原子抽取、source/compatibility/安装记录解析）由 `@deepseek-ai/dsh-treasury` 导出并复用，不做复制。
- **皮肤应用在 Host 侧解析。** Armoury 提供的是原始色板值而非客户端变量；`resolveSkinTheme` 通过固定映射表（`SKIN_COLOR_ALIASES`）把 `colors` 组映射为 `--dsw-alias-*` 覆盖值，`marketplace/skin` 返回解析后的载荷。客户端 inject face 把它接入既有主题 registry：先注册、再选中。不持久化任何新状态；皮肤是会话级主题。
- **一个组件、两次注册。** `EightfoldMarketplace` 通过 inject face 接收 `kind` 和纯目录/安装回调——组件永远接触不到 `ctx.remote`——`ui-settings-general` 向 `sidebar.footer.action` 注册两次（`eightfold-armoury`、`eightfold-treasury`），遵循 `ui-cordis` 的跨包先例。组件拿到的是回调，绝不是 connection 或 remote 服务。
- **失败只有一层。** 服务把库失败归类为六个 `marketplace/*` 代码，客户端把任何非 ok 分支当作展示文案；线上不再承载业务结果联合类型。

## 后果

更新检测保持基于 commit 且由客户端触发：每次列表对每个已安装条目执行一次 `git ls-remote`，因此没有推送或后台更新流。除既有 `/api` 信任围栏外，安装不做会话级授权；策略接缝推迟到有部署需要时再建。typography 与 preset token 组暂不解析；别名映射表目前只覆盖色彩色板，通过 `marketplace/skin` 应用的皮肤是会话级主题偏好，不会持久化。

## 已考虑的替代方案

- **在 `dsh-treasury` 内扩展服务**——否决：该包是拥有独立发布表面的纯分发库；Typert 服务需要 zod、生成的 `./typert`/`./remote` 产物和组成行，会为单一消费者改变这个库的角色与发布载荷。
- **下发原始皮肤文档、在客户端映射**——否决：别名映射应是 wire 流量与客户端代码之上的单一权威；否则线上承载客户端必须重新校验的文档。
- **为市场新开一个 shell 槽位**——否决：`sidebar.footer.action` 已存在，带有 `wide` owner 参数和跨包注册先例（`ui-cordis`）；新槽位在没有新消费者的情况下重复该组成。

## 验证

- `pnpm run build:lib` 重新生成 marketplace 的 `./typert` 与 `./remote` 产物；`pnpm run typecheck` 覆盖两个编译面。
- 组成行由 `pnpm run verify-cordis-config` 校验；客户端名册由 `pnpm run verify-client-packages` 校验；文案归属由 `pnpm run verify-client-ui-i18n` 校验。
