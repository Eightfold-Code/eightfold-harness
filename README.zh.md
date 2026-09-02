# Eightfold Harness

[English](README.md) | 中文

**面向可组合、可适配 AI 系统的运行时。**

Eightfold Harness 是基于 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 与 [Cordis](https://github.com/cordiverse/cordis) 的插件优先 agent 运行时。它保留原生 Harness 生命周期，并加入 Eightfold 模型来发现、安装与组合可替换能力。

> Eightfold 处于开发者预览阶段。API、命令、manifest 与仓库结构都可能变化。

## Eightfold 模型

| 项目 | 角色 | 拥有 |
| --- | --- | --- |
| [Harness](https://github.com/Eightfold-Code/eightfold-harness) | 运行时 | 会话、profile、生命周期与插件组合 |
| [Treasury](https://github.com/Eightfold-Code/eightfold-treasury) | 能力目录 | 可安装的适配与命名 bundle |
| [Armoury](https://github.com/Eightfold-Code/eightfold-armoury) | 视觉目录 | 纯展示的皮肤与主题 |

Harness 是引擎。Treasury 提供能力。Armoury 提供视觉呈现。

## Harness 提供什么

- 建立在 Cordis 生命周期之上的插件图。
- 面向 web、终端、headless 及其他表面的可组合 profile。
- 会话、工具、模型、文件系统、shell、子代理与工作流的运行时服务。
- Treasury 发布适配的原生安装路径。
- 通过 Armoury 独立选择皮肤。

Eightfold 扩展现有 Harness 架构，而不是创建一个并行的插件运行时。

## 快速开始

### 要求

- Node.js `^22.19.0` 或 `>=24.0.0`
- pnpm 11

### 从源码运行

<a id="run-from-source"></a>

```bash
git clone https://github.com/Eightfold-Code/eightfold-harness.git
cd eightfold-harness
corepack enable
pnpm install
pnpm run build
pnpm dsh web
```

Web UI 默认从 `http://127.0.0.1:3080` 启动。

运行其他 profile：

```bash
pnpm dsh --profile tui
pnpm dsh --profile headless "inspect this repository"
```

## 安装能力

通过 Treasury 发现并安装适配：

```bash
pnpm dsh eightfold treasury list
pnpm dsh eightfold treasury search session
pnpm dsh eightfold add session-search
```

安装命名 bundle：

```bash
pnpm dsh eightfold bundle list
pnpm dsh eightfold bundle add developer
```

更新或移除已安装的适配：

```bash
pnpm dsh eightfold update session-search
pnpm dsh eightfold remove session-search
```

安装适配不会悄悄改写既有 profile。profile 激活始终是显式的。

## 选择皮肤

独立于能力选择呈现层：

```bash
pnpm dsh eightfold armoury list
pnpm dsh eightfold armoury search dark
pnpm dsh eightfold skin add obsidian
pnpm dsh eightfold skin use obsidian
```

一个 profile 可以同时包含两种选择：

```json
{
  "adaptations": ["session-search", "developer-tools"],
  "skin": "obsidian"
}
```

## 可复现安装

Treasury 与 Armoury 的 registry 条目把已发布的包解析到确切的 Git commit。Harness 在记录一次安装之前校验 manifest、兼容性元数据、归档路径与声明的权限。

默认情况下，Eightfold 将受管状态存储在当前工作目录的 `.eightfold/` 中。设置 `EIGHTFOLD_HOME` 使用其他位置；设置 `EIGHTFOLD_TREASURY_URL` 使用其他 registry 端点。

## 开发

在 Eightfold 层演进的同时，仓库保留上游包结构与 `@deepseek-ai/*` 包命名。

有用的参考：

- [架构](docs/architecture.zh.md)
- [开发指南](docs/development.zh.md)
- [贡献](CONTRIBUTING.zh.md)
- [Agent 指令](AGENTS.md)
- [Eightfold Treasury](https://github.com/Eightfold-Code/eightfold-treasury)
- [Eightfold Armoury](https://github.com/Eightfold-Code/eightfold-armoury)

## 设计原则

- **默认模块化** — 运行时行为由可替换模块组合而成。
- **原生而非并行** — 使用既有 Harness 与 Cordis 生命周期。
- **可复现** — 已发布的源解析到确切 commit。
- **可检视** — manifest 与权限描述将被安装的内容。
- **可组合** — profile 独立组合能力与呈现。

## 上游

Eightfold Harness 基于 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)。在 Eightfold 发展自己的分发模型的同时，保持对上游的显式署名。

## 许可证

[MIT](LICENSE)

第三方依赖及其许可证列于 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
