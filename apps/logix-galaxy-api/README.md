# logix-galaxy-api

一个最小可跑的后端示例：`Effect` + `@effect/platform`（HttpApi）+ `@effect/platform-node`。

## 运行

```bash
pnpm -C apps/logix-galaxy-api dev
```

默认监听 `http://localhost:5500/health`。
默认端口为 `5500`（即 `http://localhost:5500/health`）。
可通过 `PORT=5501 pnpm -C apps/logix-galaxy-api dev` 修改端口。
启动后会打印 `Listening on ...`，请求会打印简单的访问日志。
另有动态参数示例：`GET /health/42`（路径参数按 Schema 解码）。

`dev` 使用 `tsx watch`，保存文件会自动重启（热重载）；如需单次启动用 `pnpm -C apps/logix-galaxy-api dev:once`。

## 测试

```bash
pnpm -C apps/logix-galaxy-api test
```

## 可选：启用 PostgreSQL

设置环境变量 `DATABASE_URL`（示例：`postgres://user:pass@localhost:5432/db`），`/health` 会附带数据库连通性状态。

本地开发推荐把环境变量写到 `apps/logix-galaxy-api/.env.local`（仅本地用，已被 gitignore），服务启动会自动加载该文件。
可从 `apps/logix-galaxy-api/env.local.template` 复制一份作为起点。

如果你设置了 `LOGIX_GALAXY_AUTO_SEED_ADMIN=1`，服务启动前会自动执行一次管理员 seed（本地开发用）。

### Todo CRUD（需要 PostgreSQL）

服务启动后会自动创建 `todos` 表（如果不存在），然后可用以下接口：

- `POST /todos`（body：`{ "title": string, "completed"?: boolean }`）→ `201`
- `GET /todos` → `200`
- `GET /todos/:id` → `200` / `404`
- `PATCH /todos/:id`（body：`{ "title"?: string, "completed"?: boolean }`）→ `200` / `404`
- `DELETE /todos/:id` → `204` / `404`

示例（假设已设置 `DATABASE_URL`）：

```bash
curl -sS -X POST http://127.0.0.1:5500/todos \
  -H 'content-type: application/json' \
  -d '{"title":"hello"}'

curl -sS http://127.0.0.1:5500/todos
```

也可以跑一次脚本烟测（需要 `DATABASE_URL`）：

```bash
pnpm -C apps/logix-galaxy-api smoke:pg
```
