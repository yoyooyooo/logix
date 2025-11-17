# logix-galaxy-api · PostgreSQL 开发环境样例（SSoT）

> 目标：把 `apps/logix-galaxy-api` 的“开发环境数据库表结构 + 对外接口形状”沉淀为单一事实源，避免实现漂移。

## 1) 背景与定位

`apps/logix-galaxy-api` 用于验证“平台生成/编排的 Effect API”在真实网络边界下的契约与可测性。

本文件只覆盖 **开发环境** 所需的最小 PostgreSQL 表结构（`todos`）及其与 HTTP API 返回形状的映射。

## 2) 范围与非目标

**范围**：

- 单表 `todos`（Todo CRUD 所需最小字段）
- 字段语义与对外 JSON 映射
- 漂移治理（变更需要同步更新的落点）

**非目标**：

- 生产化迁移体系、权限/鉴权、多租户、审计、软删、复杂索引设计
- 任何“必须依赖 PostgreSQL 才能跑通”的默认测试策略

## 3) 环境约定

- HTTP 服务默认端口：`7001`（可通过 `PORT` 覆盖）。
- PostgreSQL 连接由 `DATABASE_URL` 注入：host/port/库名均由连接串决定（不在代码中固定）。
- PostgreSQL 仅作为开发/演示环境可选依赖；CI/默认测试应可在无数据库环境下通过。

## 4) 数据库表结构：`todos`

### 4.1 规范 DDL

```sql
create table if not exists todos (
  id serial primary key,
  title text not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);
```

### 4.2 字段语义与对外映射

- `id`：自增主键 → API `Todo.id: number`
- `title`：标题文本 → API `Todo.title: string`
- `completed`：完成状态（默认 `false`）→ API `Todo.completed: boolean`
- `created_at`：创建时间（带时区）→ API `Todo.createdAt: string`（建议 ISO-8601）

## 5) HTTP API 契约（机读）

对外接口形状以 OpenAPI 工件为准：

- `specs/062-galaxy-api-postgres/contracts/openapi.yaml`

## 5.1) CRUD 模板（可复用）

如需复用一套“目录结构 + 测试用例 + 表设计 + 契约工件”的 CRUD 模板，见：

- `docs/specs/intent-driven-ai-coding/examples/03-effect-httpapi-postgres-crud-template.md`

## 6) 漂移治理（强约束）

任何修改 `todos` 表结构、字段语义或对外返回形状的变更，必须同时更新：

1. 本文件（SSoT）
2. `specs/062-galaxy-api-postgres/contracts/openapi.yaml`（对外契约）
3. 实现落点（示例）：`apps/logix-galaxy-api/src/todo/todo.repo.live.ts`

## 7) 对应交付 spec

- `specs/062-galaxy-api-postgres/spec.md`
- `specs/062-galaxy-api-postgres/plan.md`
- `specs/062-galaxy-api-postgres/data-model.md`
