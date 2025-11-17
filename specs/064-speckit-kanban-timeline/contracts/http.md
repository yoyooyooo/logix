# HTTP Contract: 064-speckit-kanban-timeline

本文件描述本地工具的 HTTP 接口（供前端调用）。接口默认以 `/api` 作为前缀（由内置 server 统一提供；开发模式也可用 Vite proxy）。

> 说明：这是本地工具协议，不面向公网；仍需保持“路径受控 + 错误结构化”的稳定口径。

## Common

### Error

所有非 2xx 响应应尽量返回 JSON：

```json
{ "_tag": "<StableErrorTag>", "message": "<human readable>" }
```

## Specs

### GET /api/specs

列出所有 specs（时间线：最新在前）。

Response: `200`

- `items`: Spec[]

### GET /api/specs/:specId/tasks

读取某个 spec 的任务列表（来自 `tasks.md`）。

Response: `200`

- `specId`: string
- `tasks`: Task[]

Errors:

- `404 NotFoundError`: spec 不存在或 tasks.md 不存在

### POST /api/specs/:specId/tasks/toggle

切换某个任务的勾选状态，并写回 `tasks.md`。

Request body:

- `line`: number（1-based）
- `checked`: boolean（目标状态）

Response: `200`

- `specId`: string
- `tasks`: Task[]（更新后最新任务列表，便于 UI 刷新）

Errors:

- `404 NotFoundError`: spec 或 tasks.md 不存在
- `409 ConflictError`: 检测到并发冲突（可选）
- `400 ValidationError`: line 越界或不对应 checkbox task

## Files（受控读写）

### GET /api/specs/:specId/files/:name

读取受控文件内容。

Params:

- `name`: `spec.md | plan.md | tasks.md`

Response: `200`

- `name`: string
- `path`: string
- `content`: string

### PUT /api/specs/:specId/files/:name

写入受控文件内容（原子写入）。

Request body:

- `content`: string

Response: `200`

- `name`: string
- `path`: string

Errors:

- `404 NotFoundError`: spec 不存在或文件不存在（是否允许创建由实现决定）
- `403 ForbiddenError`: 越权路径或不可写
