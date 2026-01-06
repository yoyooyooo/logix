# Implementation Plan: 062 logix-galaxy-api（PostgreSQL 开发环境样例）

**Branch**: `062-galaxy-api-postgres` | **Date**: 2025-12-30 | **Spec**: `specs/062-galaxy-api-postgres/spec.md`  
**Input**: Feature specification from `specs/062-galaxy-api-postgres/spec.md`

## Summary

目标：把 `apps/logix-galaxy-api` 固化为一个“可跑、可测、可解释、可对齐”的后端示例服务：

- HTTP 服务默认端口为 `7001`（支持 `PORT` 覆盖）；
- PostgreSQL 作为 **开发环境可选依赖**（由 `DATABASE_URL` 决定是否启用；数据库端口不在代码中固定）；
- 提供 `/health`（含数据库状态）与 Todo CRUD（`/todos*`）“打样”接口；
- 默认自动化测试 **不依赖 PostgreSQL**（用可替换 Repo 覆盖核心语义），确保在 CI/新机器上稳定回归；
- 数据库表结构与接口契约以 SSoT + `contracts/` 工件固化，避免实现漂移。

本 plan 的关键裁决（避免实现漂移）：

1. **端口与环境**：服务端口默认 `7001`；数据库仅用于开发/演示环境，是否启用由 `DATABASE_URL` 决定。
2. **表结构 SSoT**：`todos` 表结构与字段语义作为“开发环境数据库协议”沉淀到 SSoT：`docs/specs/sdd-platform/ssot/examples/02-logix-galaxy-api-postgres.md`。
3. **对外契约**：HTTP API 用 OpenAPI 3.1 固化为 `specs/062-galaxy-api-postgres/contracts/openapi.yaml`，作为平台侧/生成器侧的稳定消费面。
4. **测试口径**：默认测试以“WebHandler 级别”覆盖 `/health` 与 Todo CRUD 的主要行为；数据库连通性仅在可选 smoke 中验证。
5. **可复用模板沉淀**：以 `apps/logix-galaxy-api` 为参考实现，沉淀一份 CRUD 写法模板（目录结构、测试用例、表设计与契约工件）到 SSoT：`docs/specs/sdd-platform/ssot/examples/03-effect-httpapi-postgres-crud-template.md`。

## Existing Foundations（直接复用）

- 示例服务骨架：`apps/logix-galaxy-api/src/main.ts`（Effect HttpApi + Node server）。
- 数据库适配：`apps/logix-galaxy-api/src/db/db.live.ts`（`DATABASE_URL` 可选注入；未配置时显式 disabled）。
- Todo CRUD：`apps/logix-galaxy-api/src/todo/*`（Repo + HTTP handlers + Schema）。
- 自动化测试：`apps/logix-galaxy-api/src/health/health.http.test.ts`、`apps/logix-galaxy-api/src/todo/todo.http.test.ts`（无 DB 的 handler 级测试）。

## Technical Context

**Language/Version**: TypeScript 5.8.2（ESM）  
**Primary Dependencies**: pnpm workspace、`effect` v3（workspace override `3.19.13`）、`@effect/platform`、`@effect/platform-node`、`pg`、Vitest  
**Storage**: PostgreSQL（开发环境可选；通过 `DATABASE_URL` 注入）  
**Testing**: Vitest（`vitest run`；默认不依赖 PostgreSQL）  
**Target Platform**: Node.js 20+（建议；按仓库 ESM/tsx 约定）  
**Project Type**: pnpm workspace（示例 app 位于 `apps/logix-galaxy-api`）  
**Performance Goals**: N/A（示例服务；不触及 Logix Runtime 核心路径或对外性能边界）  
**Constraints**:

- 默认端口为 `7001`（允许 `PORT` 覆盖）；
- 数据库端口/host 不在代码中固定；由 `DATABASE_URL` 决定；
- 错误响应不得泄露数据库连接字符串/凭据等敏感信息；
- 数据库表结构必须沉淀到 SSoT，并与实现保持一致；
- 自动化测试必须在无 PostgreSQL 环境下可一键通过。

**Scale/Scope**: 单表（`todos`）+ 最小 CRUD + 健康检查

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Intent → Flow/Logix → Code → Runtime**：本特性位于“平台/Playground 的真实网络边界验证”链路上，交付一个可运行的 API 示例服务；不改变 Logix Runtime/Flow 的语义，仅提供真实 HTTP 边界下的可测契约。
- **docs-first & SSoT**：数据库表结构与语义作为 SSoT 文档沉淀到 `docs/specs/sdd-platform/ssot/examples/02-logix-galaxy-api-postgres.md`，并通过本 spec 的 `contracts/openapi.yaml` 固化接口形状，避免并行真相源。
- **Effect/Logix contracts**：不新增/修改对外的 Effect/Logix runtime 契约；仅新增“示例服务的网络契约/DB schema”文档与工件。
- **IR & anchors**：不涉及统一最小 IR、锚点协议、parser/codegen。
- **Deterministic identity**：不涉及 runtime identity；示例服务层不引入随机/时间作为业务身份（`createdAt` 为数据字段，不作为 identity）。
- **Transaction boundary**：不涉及 Logix 事务窗口；数据库访问发生在常规请求处理边界内。
- **Internal contracts & trial runs**：数据库/Repo 通过显式服务注入；测试通过替身 Repo 完成试运行，不依赖进程级全局单例。
- **Dual kernels (core + core-ng)**：不触及 kernel/hot path，不涉及 core/core-ng 支持矩阵。
- **Performance budget**：不触及 Logix Runtime 热路径；本特性性能仅要求“开发者可用且可诊断”，不设 perf evidence gate（见下方 N/A）。
- **Diagnosability & explainability**：健康检查必须返回 `db: ok|disabled|down`；错误体结构化（`_tag/message`）并可解释；日志仅作为开发排错手段。
- **User-facing performance mental model**：N/A（不改变 runtime 性能边界或自动策略）。
- **Breaking changes**：仅示例 app 行为调整（默认端口从旧值迁移到 `7001`）；通过更新 `apps/logix-galaxy-api/README.md` 与 quickstart 提供迁移口径（不保留兼容层）。
- **Public submodules**：不触及 `packages/*` 的公共导出结构。
- **Quality gates**：实现完成后必须通过：
  - `pnpm -C apps/logix-galaxy-api typecheck`
  - `pnpm -C apps/logix-galaxy-api test`

### Gate Result (Pre-Design)

- PASS（不触及 runtime 核心路径；契约与 schema 有 SSoT/工件落点；测试策略可在无 DB 环境下稳定回归）

### Gate Result (Post-Design)

- PASS（已产出 `research.md`、`data-model.md`、`contracts/openapi.yaml`、`quickstart.md` 与 SSoT 文档；实现按这些落点交付即可）

## Perf Evidence Plan（MUST）

N/A（不触及 Logix Runtime 核心路径或对外性能边界）

## Project Structure

### Documentation (this feature)

```text
specs/062-galaxy-api-postgres/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── openapi.yaml
└── tasks.md
```

### Source Code (repository root)

```text
apps/logix-galaxy-api/
├── package.json
├── README.md
├── scripts/
│   └── pg-smoke.ts
└── src/
    ├── main.ts
    ├── app/
    │   └── effect-api.ts
    ├── db/
    │   ├── db.ts
    │   └── db.live.ts
    ├── health/
    │   ├── health.contract.ts
    │   ├── health.http.live.ts
    │   └── health.http.test.ts
    └── todo/
        ├── todo.contract.ts
        ├── todo.http.live.ts
        ├── todo.http.test.ts
        ├── todo.model.ts
        ├── todo.repo.ts
        └── todo.repo.live.ts

docs/specs/sdd-platform/ssot/examples/
├── README.md
└── 02-logix-galaxy-api-postgres.md
└── 03-effect-httpapi-postgres-crud-template.md
```

**Structure Decision**:

- 继续把示例服务落在 `apps/logix-galaxy-api`（避免把“示例工程”下沉为通用包，防止无谓影响 runtime 核心路径）。
- 数据库 schema 以 SSoT 文档固化，并在 `contracts/openapi.yaml` 中对齐返回形状；实现层仅作为对这些契约的映射与执行。

## Complexity Tracking

无（不触及宪章硬约束；复杂度主要来自“契约/SSoT 防漂移”与“无 DB 的稳定测试口径”，已在本 plan 中固化）

## Phase N: Handoff Assets（最后一步）

- [x] 使用 `$skill-creator` 完善 `.codex/skills/effect-httpapi-postgres-crud/SKILL.md`，沉淀“Effect HttpApi + PostgreSQL”的 CRUD 写法模板（目录结构/测试用例/表设计/契约与 SSoT 防漂移）。
