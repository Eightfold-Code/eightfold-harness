# Treasury

English | [中文](README.zh.md)

The Treasury group carries the Eightfold distribution layer: fetching the public Treasury and Armoury registries, validating adaptation and skin manifests, installing adaptations and skins under the local Treasury home, and the marketplace Remote that serves both catalogs to the web client. The marketplace Remote contract lives on the [marketplace subsystem page](../../docs/subsystems/marketplace.md).

| Package | Role |
|---|---|
| [`treasury/`](treasury/README.md) | Registry client, registry and manifest validation, and the adaptation installer |
| [`armoury/`](armoury/README.md) | Skin registry client, skin and theme validation, skin installer, and theme resolution |
| [`marketplace/`](marketplace/README.md) | Host Remote: catalogue, install, and skin-resolution API for the web client |
