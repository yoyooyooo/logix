# Data Model: 062 logix-galaxy-api（PostgreSQL 开发环境样例）

**Feature**: `specs/062-galaxy-api-postgres/spec.md`  
**SSoT**: `docs/ssot/platform/examples/02-logix-galaxy-api-postgres.md`  
**Date**: 2025-12-30

## 1) 范围

- 本数据模型只覆盖“开发环境打样”所需的最小实体：Todo 与健康检查的返回形状。
- 不包含：认证/鉴权、多租户、审计、软删、分页/排序策略等生产化能力。

## 2) 领域实体（Domain）

### 2.1 Todo

用于演示最小的持久化 CRUD。

- `id: number`：自增主键。
- `title: string`：标题（示例阶段只要求为字符串；不引入额外校验规则）。
- `completed: boolean`：是否完成。
- `createdAt: string`：创建时间（可序列化字符串；建议为 ISO-8601）。

### 2.2 HealthStatus

用于向调用方暴露服务与数据库状态。

- `ok: boolean`：服务是否认为自身健康。
- `db: "ok" | "disabled" | "down"`：
  - `disabled`：未配置数据库连接（`DATABASE_URL` 缺失）。
  - `ok`：数据库连通且可执行探测查询。
  - `down`：数据库连接存在但不可达/查询失败。
- `probe?: number`：`GET /health/:probe` 的路径参数回显。

## 3) 持久化模型（PostgreSQL，开发环境）

### 3.1 表：`todos`

#### 规范 DDL（与 SSoT 一致）

```sql
create table if not exists todos (
  id serial primary key,
  title text not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);
```

#### 字段语义

- `id`：自增主键；对外通过 API 暴露为 `Todo.id`。
- `title`：标题文本；对外通过 API 暴露为 `Todo.title`。
- `completed`：完成状态；对外通过 API 暴露为 `Todo.completed`。
- `created_at`：创建时间；对外通过 API 暴露为 `Todo.createdAt`（字符串）。

#### 约束与不变量

- `title` 不可为 `NULL`；`completed` 不可为 `NULL` 且默认 `false`。
- 示例阶段不引入额外索引与查询优化策略（单表小数据量）。

## 4) 错误模型（HTTP）

仅固化“调用方可依赖的错误形状”，避免泄露内部细节。

- `NotFoundError`：用于 Todo 不存在。
- `ServiceUnavailableError`：用于数据库不可用（disabled/down）或数据库错误。

错误结构以 `contracts/openapi.yaml` 为准（字段：`_tag` + `message`）。

