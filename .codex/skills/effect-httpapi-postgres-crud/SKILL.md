---
name: effect-httpapi-postgres-crud
description: 在 intent-flow 仓库内基于 Effect v3 + @effect/platform HttpApi + PostgreSQL（DATABASE_URL 可选注入）的技术选型，指导如何设计表结构与数据模型、编写 Repo/SQL 与 HTTP handlers、固化 OpenAPI 契约与 SSoT 文档、并编写默认不依赖数据库的自动化测试；并提供脚本生成 CRUD 资源骨架（contract/model/repo/http/tests）；适用于在 apps/* 新建/扩展 CRUD 资源（如 Todo CRUD）或对齐 apps/logix-galaxy-api 的写法模板与目录结构。
---

# Effect HttpApi + PostgreSQL CRUD（模板化写法）

## Overview

本 skill 把“可跑、可测、可对齐”的 CRUD 写法固化成可复用流程：先定契约（Schema/OpenAPI）与表结构（SSoT），再写 Repo/handlers，最后用“无 DB 的 handler 级测试 + 可选（DATABASE_URL）PG 集成测试/pg smoke”保证长期可回归。

## Codegen（生成一个 CRUD 资源文件夹）

生成 `<out>/<resource>/`（contract/model/repo/repo.live/http.live/http.test/pg.integration.test；`--out` 通常指向 app 的 `src` 目录），并可选自动注册到 `src/app/effect-api.ts` 与 `src/main.ts`：

```bash
pnpm -C .codex/skills/effect-httpapi-postgres-crud generate -- --out apps/logix-galaxy-api/src --domain Todo
```

也可以用仓库级 runner（默认非交互）：

```bash
npx tsx scripts/skill-runner.ts effect-httpapi-postgres-crud generate --out apps/logix-galaxy-api/src --domain Todo
```

只生成文件夹，不自动注册：

```bash
pnpm -C .codex/skills/effect-httpapi-postgres-crud generate -- --out apps/logix-galaxy-api/src --domain Todo --no-wire
```

## Quick Start（从 0 到 1 增加一个 CRUD 资源）

> 推荐先把“契约/SSoT/测试口径”定死，再落实现；避免“实现即规范”导致漂移。

1. 选定资源与最小接口（CRUD + 错误形状）
   - 参考模板：`docs/ssot/platform/appendix/examples/03-effect-httpapi-postgres-crud-template.md`
   - 参考实现：`apps/logix-galaxy-api/src/todo/todo.contract.ts`

2. 设计表结构（开发环境 PostgreSQL）并沉淀到 SSoT
   - 深入表设计：优先用现有 skill：`postgresql-table-design`
   - SSoT 资产：在 `docs/ssot/platform/appendix/examples/` 增加或更新一份 `<nn>-*.md`，并在 `docs/ssot/platform/appendix/examples/README.md` 建索引
   - 示例：`docs/ssot/platform/appendix/examples/02-logix-galaxy-api-postgres.md`

3. 固化对外契约（OpenAPI 3.1）
   - 产物落点：`specs/<id>/contracts/openapi.yaml`
   - 示例：`specs/062-galaxy-api-postgres/contracts/openapi.yaml`

4. 编写 Repo（SQL 只放在 RepoLive）
   - 参考实现：`apps/logix-galaxy-api/src/todo/todo.repo.live.ts`
   - 约定：`get/update` 用 `Option` 表达“可能不存在”，避免用异常表达业务分支

5. 编写 HTTP handlers（把 Repo 映射成 HTTP 语义）
   - 参考实现：`apps/logix-galaxy-api/src/todo/todo.http.live.ts`
   - 约定：错误体结构化（至少 `_tag` + `message`）；不得泄露 `DATABASE_URL` 等敏感信息

6. 编写自动化测试（默认无 PostgreSQL）
   - handler 级测试：`HttpApiBuilder.toWebHandler` + 内存 Repo 替身（参考 `apps/logix-galaxy-api/src/todo/todo.http.test.ts`）
   - 健康检查测试：未配置 `DATABASE_URL` 时 `db = "disabled"`（参考 `apps/logix-galaxy-api/src/health/health.http.test.ts`）
   - 可选 PG 集成测试（需要 `DATABASE_URL`，schema 隔离）：参考 `apps/logix-galaxy-api/src/todo/todo.pg.integration.test.ts`
   - 可选 smoke（需要 `DATABASE_URL`）：参考 `apps/logix-galaxy-api/scripts/pg-smoke.ts`

## Workflow Decision Tree

- 新建一个后端 app（Effect HttpApi 骨架） → 优先用：`effect-api-project-init`
- 只是在已有 app 里新增/扩展一个 CRUD 资源 → 用本 skill（按 Quick Start 执行）
- 只想讨论 PostgreSQL 表设计/索引/约束 → 优先用：`postgresql-table-design`

## 输出与验收（必须可交付）

每次按本 skill 落地一个 CRUD 资源，至少应交付并保持一致：

- **代码**：`apps/<service>/src/<resource>/*`（contract/model/repo/repo.live/http.live/http.test）
- **契约**：`specs/<id>/contracts/openapi.yaml`
- **数据模型**：`specs/<id>/data-model.md`
- **SSoT**：`docs/ssot/platform/appendix/examples/<nn>-*.md`（并更新 `docs/ssot/platform/appendix/examples/README.md` 索引）

### 验收最小集（建议）

- 无 DB 环境下：`pnpm -C apps/<service> test` 通过（handler 级测试）
- 有 DB 环境下（可选）：`DATABASE_URL=... pnpm -C apps/<service> test` 通过（会运行 PG 集成测试；测试用例应做 schema 隔离）
- 有 DB 环境下（可选）：`DATABASE_URL=... pnpm -C apps/<service> smoke:pg` 通过
