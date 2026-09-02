# Treasury

[English](README.md) | 中文

Treasury 组承载 Eightfold 分发层：获取公共 Treasury 与 Armoury registry、校验适配与皮肤 manifest、在本地 Treasury home 下安装适配与皮肤，以及向网页客户端提供两套目录的 marketplace Remote。marketplace Remote 契约见[市场子系统页](../../docs/subsystems/marketplace.zh.md)。

| 包 | 职责 |
|---|---|
| [`treasury/`](treasury/README.zh.md) | Registry 客户端、registry 与 manifest 校验、适配安装器 |
| [`armoury/`](armoury/README.zh.md) | 皮肤 registry 客户端、皮肤与主题校验、皮肤安装器、主题解析 |
| [`marketplace/`](marketplace/README.zh.md) | Host Remote：面向网页客户端的目录、安装与皮肤解析 API |
