# Prefab / 资源目录约定（P0）

- **素材**（图/音/字）：`client/assets/resources/`（`ui/`、`audio/`、`font/` 等）
- **界面 Prefab**：`client/assets/prefabs/ui/`（与素材分目录，勿把 Prefab 和 PNG 放同一层）
- Prefab 内 SpriteFrame 仍通过 uuid 引用 `resources/` 下素材

| Prefab | 路径 |
|--------|------|
| LoginPanel | `client/assets/prefabs/ui/login/LoginPanel.prefab` |
| CityChrome | `client/assets/prefabs/ui/city/CityChrome.prefab` |
| CreateRole（待） | `client/assets/prefabs/ui/login/CreateRolePanel.prefab` |

详细节点规格见 agent 侧 `/workspace/mxzg-p0-prefab-spec.md`。