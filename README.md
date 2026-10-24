# mxzg

统一工程根目录：`F:\project\mxzg`

| 目录 | 说明 |
|------|------|
| `client/` | Cocos Creator 3.8.8 新前端（用 Creator 打开此目录） |
| `config/gameconfig/` | 策划表 xlsx。源路径 `F:\project\mxzg\config\gameconfig`。客户端运行时读导出的 JSON |
| `server/` | 服务端。本机当前为目录联接 → `F:\源码\mj\program\server`（暂不进 Git） |

## 本地联接说明

`server/` 仍用 junction 复用服代码。策划表在仓库 `config/gameconfig`。`ip2region.db` 留在本机。  
导出与服的 `config.path` 见 [`docs/config-pipeline.md`](docs/config-pipeline.md)。

预览默认连真服 `ws://127.0.0.1:13111/game`，不必加 `?transport=ws`。Mock 只在 `?dev=mock`。日常启动见 `scripts/start-local-all.bat`。

## 打开方式

Cocos Creator 3.8.8 → 打开 `F:\project\mxzg\client`

预览登录 → 主城 → 主线（新 Prefab 壳、开关和缺口）见 [`docs/prefab-demo-path.md`](docs/prefab-demo-path.md)。
