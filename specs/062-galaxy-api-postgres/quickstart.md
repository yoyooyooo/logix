# Quickstart: 062 logix-galaxy-api（验收）

本 quickstart 用于在实现完成后，按 `specs/062-galaxy-api-postgres/spec.md` 验收：

- 默认端口为 `7001`
- `/health` 能解释数据库状态（ok/disabled/down）
- Todo CRUD 行为正确
- 自动化测试在无数据库环境下可一键通过

## 0) 一键自动化测试（无 PostgreSQL）

```bash
pnpm -C apps/logix-galaxy-api test
```

期望：所有用例通过，且无需设置 `DATABASE_URL`。

## 0.1) 可选：一键数据库集成测试（需要 PostgreSQL）

当你提供 `DATABASE_URL` 时，会额外运行“真实 PostgreSQL”的集成用例（会在目标数据库内创建并销毁独立 schema，避免污染开发数据）。

```bash
export DATABASE_URL='postgres://user:pass@localhost:5432/db'
pnpm -C apps/logix-galaxy-api test
```

## 1) 启动服务（默认 7001）

```bash
pnpm -C apps/logix-galaxy-api dev
```

如需显式指定端口：

```bash
PORT=7001 pnpm -C apps/logix-galaxy-api dev
```

## 2) 健康检查

```bash
curl -sS http://127.0.0.1:7001/health
curl -sS http://127.0.0.1:7001/health/42
```

- 未设置 `DATABASE_URL`：期望 `db = "disabled"` 且 `ok = true`
- 数据库可用：期望 `db = "ok"` 且 `ok = true`
- 数据库不可达：期望 `db = "down"` 且 `ok = false`

## 3) Todo CRUD（需要 PostgreSQL）

设置 `DATABASE_URL`（示例）：

```bash
export DATABASE_URL='postgres://user:pass@localhost:5432/db'
```

创建：

```bash
curl -sS -X POST http://127.0.0.1:7001/todos \
  -H 'content-type: application/json' \
  -d '{"title":"hello"}'
```

列表：

```bash
curl -sS http://127.0.0.1:7001/todos
```

获取 / 更新 / 删除（假设 id=1）：

```bash
curl -sS http://127.0.0.1:7001/todos/1
curl -sS -X PATCH http://127.0.0.1:7001/todos/1 -H 'content-type: application/json' -d '{"completed":true}'
curl -sS -X DELETE http://127.0.0.1:7001/todos/1
```

## 4) 契约对齐（OpenAPI）

- 接口契约：`specs/062-galaxy-api-postgres/contracts/openapi.yaml`
- 数据模型与表结构：`specs/062-galaxy-api-postgres/data-model.md`
- 表结构 SSoT：`docs/specs/intent-driven-ai-coding/examples/02-logix-galaxy-api-postgres.md`
