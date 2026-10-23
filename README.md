# mxzg

统一工程根目录：`F:\project\mxzg`

| 目录 | 说明 |
|------|------|
| `client/` | Cocos Creator 3.8.8 新前端（用 Creator 打开此目录） |
| `config/` | 配置表。本机当前为目录联接 → `F:\mxzg-local`（暂不进 Git） |
| `server/` | 服务端。本机当前为目录联接 → `F:\源码\mj\program\server`（暂不进 Git） |

## 本地联接说明

开发机用 junction 复用已有配置与服代码，避免复制数 GB。  
以后要正式进仓时：去掉联接，放入真实 `config` / `server` 内容或子模块，并改 `.gitignore`。

## 打开方式

Cocos Creator 3.8.8 → 打开 `F:\project\mxzg\client`

预览登录 → 主城 → 主线（新 Prefab 壳、开关和缺口）见 [`docs/prefab-demo-path.md`](docs/prefab-demo-path.md)。
