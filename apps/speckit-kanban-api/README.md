# speckit-kanban-api
Specs 时间线 Kanban 的本地后端：`Effect` + `@effect/platform`（HttpApi）+ `@effect/platform-node`。

## 运行

```bash
pnpm -C apps/speckit-kanban-api dev
```

默认监听 `http://127.0.0.1:5510/health`（仅本机回环地址，本地工具用途）。
可通过 `PORT=5511 pnpm -C apps/speckit-kanban-api dev` 修改端口。
可通过 `SPECKIT_KANBAN_REPO_ROOT=/path/to/repo` 覆盖仓库根目录解析。

`dev` 使用 `tsx watch`，保存文件会自动重启（热重载）；如需单次启动用 `pnpm -C apps/speckit-kanban-api dev:once`。

## 测试

```bash
pnpm -C apps/speckit-kanban-api test
```

## 接口（摘要）

- `GET /health`
- `GET /specs`
- `GET /specs/:specId/tasks`
- `POST /specs/:specId/tasks/toggle`
- `GET /specs/:specId/files/:name`（`spec.md | plan.md | tasks.md`）
- `PUT /specs/:specId/files/:name`
