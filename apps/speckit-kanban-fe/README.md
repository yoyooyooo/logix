# speckit-kanban-fe

本地“Specs 时间线 Kanban”前端（Vite + React）。

## 开发

- `pnpm -C apps/speckit-kanban-fe dev`

默认通过 Vite proxy 把 `/api/*` 转发到 `http://127.0.0.1:5510`（可用 `SPECKIT_KANBAN_API_PROXY_TARGET` 覆盖）。

