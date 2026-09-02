# Treasury：Eightfold Harness 的能力分发

[English](treasury.md) | 中文

Treasury 是 Eightfold 的分发层。用户按需发现并安装能力。一个能力以*适配（adaptation）*形式发布：插件源码归档加一份声明身份、权限与兼容性的清单。

Treasury 还可以发布命名的*捆绑（bundle）*。bundle 只是 registry 层面的适配 id 列表，不引入另一种插件格式。Harness 展开 bundle，并通过同一条经过校验的安装路径安装其中每个被引用的适配。

## CLI

查看公共 registry：

```bash
dsh eightfold treasury list
dsh eightfold treasury search <query>
```

安装并管理单个适配：

```bash
dsh eightfold add <name>
dsh eightfold remove <name>
dsh eightfold update [name]
```

查看并安装命名 bundle：

```bash
dsh eightfold bundle list
dsh eightfold bundle add <name>
```

例如，若 Treasury 发布了包含 `hello-eightfold` 与 `session-search` 的 `developer` bundle，`dsh eightfold bundle add developer` 会安装每个缺失的适配，并保持已存在的适配不变。

## 安装流程

`dsh eightfold add <name>` 运行以下管线：

```text
User
  -> dsh eightfold add <name>
  -> Eightfold CLI
  -> Treasury Registry          (name -> adaptation descriptor)
  -> resolve adaptation
  -> pinned commit
  -> download archive           (GitHub tarball/zip at that commit)
  -> validate manifest
  -> install dependencies
  -> register plugin            (profile package.json and bundles list)
  -> update local profile
```

`dsh eightfold bundle add <name>` 先把命名 bundle 解析为适配 id，再对每个适配运行同一条安装管线。bundle 成员关系在解析 registry 时校验：未知与重复的适配 id 会被拒绝。

每个箭头都是独立步骤，拥有各自的失败点与日志点。

## 传输

Treasury 针对特定分支或 commit 下载 GitHub 归档（tarball 或 zip）。普通用户不会触发完整 clone。固定 commit 使安装产物可复现；下载 URL 显式指名该 commit。

## 安全要求

Treasury 把下载的适配视为不可信内容，执行以下要求：

- 写入任何文件之前先校验 manifest。
- 对照 manifest 校验申请的权限。
- 校验与运行中 Eightfold 版本的兼容性。
- 固定 commit；拒绝未固定的源。
- 拒绝畸形的归档路径。
- 阻止逃逸出解压目录的路径穿越。
- 未经明确批准不执行任意安装前 shell 脚本。
- 下载期间不执行下载的代码。
- 安装与激活是分离的操作。

## 本地存储（临时）

`~/.eightfold` 下的暂定布局：

```text
~/.eightfold/
  config.json        Treasury configuration
  adaptations/       downloaded, validated capability sources
  cache/             archives and resolved descriptors
  profiles/          local profile state
```

该布局是临时的，可能随安装器演进而改变。

## 适配 DeepSeek Harness 的插件解析

DeepSeek Harness 通过 [architecture.md](../architecture.zh.md) 描述的 profile 机制加载树外插件。Harness home 下的 profile 目录持有 `package.json`（树外插件依赖以及 `dsh.profile` manifest 的有序 `bundles` 列表）和 `cordis.patch.yml` 用户补丁层。`dsh plugin --profile <name> add <package>` 命令把安装转发到 profile 目录中的 pnpm（[plugin.ts](../../apps/cli/src/plugin.ts)）。bundle 名按两个锚点解析——先 dsh 安装本身，再 profile 目录——裸插件名经由 profile 目录的 Node 父目录逐级查找解析到维护的扁平回退 `$DSH_HOME/profiles/node_modules`（[profile.ts](../../packages/boot/app-boot/src/profile.ts)）。

Eightfold 安装器必须适配这一机制而不是发明一个冲突的机制：它下载并校验能力归档，把得到的插件安装进 profile 的 `package.json` 与 `node_modules`，并更新 `dsh.profile.bundles`，使解析继续走既有 loader。
