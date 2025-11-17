# @examples/effect-api

一个最小可跑的后端示例：`Effect` + `@effect/platform`（HttpApi）+ `@effect/platform-node`。

## 运行

```bash
pnpm -C examples/effect-api dev
```

默认监听 `http://localhost:3000/health`。
可通过 `PORT=3001 pnpm -C examples/effect-api dev` 修改端口。
启动后会打印 `Listening on ...`，请求会打印简单的访问日志。
另有动态参数示例：`GET /health/42`（路径参数按 Schema 解码）。

`dev` 使用 `tsx watch`，保存文件会自动重启（热重载）；如需单次启动用 `pnpm -C examples/effect-api dev:once`。

## 测试

```bash
pnpm -C examples/effect-api test
```

## 可选：启用 PostgreSQL

设置环境变量 `DATABASE_URL`（示例：`postgres://user:pass@localhost:5432/db`），`/health` 会附带数据库连通性状态。

### Todo CRUD（需要 PostgreSQL）

服务启动后会自动创建 `todos` 表（如果不存在），然后可用以下接口：

- `POST /todos`（body：`{ "title": string, "completed"?: boolean }`）→ `201`
- `GET /todos` → `200`
- `GET /todos/:id` → `200` / `404`
- `PATCH /todos/:id`（body：`{ "title"?: string, "completed"?: boolean }`）→ `200` / `404`
- `DELETE /todos/:id` → `204` / `404`

示例（假设已设置 `DATABASE_URL`）：

```bash
curl -sS -X POST http://127.0.0.1:3000/todos \
  -H 'content-type: application/json' \
  -d '{"title":"hello"}'

curl -sS http://127.0.0.1:3000/todos
```

也可以跑一次脚本烟测（需要 `DATABASE_URL`）：

```bash
pnpm -C examples/effect-api smoke:pg
```
