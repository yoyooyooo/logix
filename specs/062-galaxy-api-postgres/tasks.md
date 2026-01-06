# Tasks: 062 logix-galaxy-api（PostgreSQL 开发环境样例）

**Input**: `specs/062-galaxy-api-postgres/spec.md` + `specs/062-galaxy-api-postgres/plan.md`  
**Optional**: `specs/062-galaxy-api-postgres/research.md` / `specs/062-galaxy-api-postgres/data-model.md` / `specs/062-galaxy-api-postgres/contracts/openapi.yaml` / `specs/062-galaxy-api-postgres/quickstart.md`

**Tests**: 本特性要求自动化测试；默认测试必须可在未配置 `DATABASE_URL` 的环境中运行通过（不依赖本机 PostgreSQL）。可选 smoke 用于验证真实数据库连通。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件、无依赖）
- **[Story]**: 用户故事标签（`[US1]` / `[US2]` / `[US3]`）

---

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 生成并完善实现计划（含 Constitution Check）：`specs/062-galaxy-api-postgres/plan.md`
- [x] T002 产出 research 决策记录：`specs/062-galaxy-api-postgres/research.md`
- [x] T003 产出 data model（实体 + DDL 映射）：`specs/062-galaxy-api-postgres/data-model.md`
- [x] T004 产出 OpenAPI 3.1 契约：`specs/062-galaxy-api-postgres/contracts/openapi.yaml`
- [x] T005 产出 quickstart 验收步骤：`specs/062-galaxy-api-postgres/quickstart.md`
- [x] T006 沉淀 `todos` 表结构与语义到 SSoT：`docs/specs/sdd-platform/ssot/examples/02-logix-galaxy-api-postgres.md`
- [x] T007 沉淀 CRUD 写法模板到 SSoT：`docs/specs/sdd-platform/ssot/examples/03-effect-httpapi-postgres-crud-template.md`
- [x] T008 完善 CRUD 指导 skill（Effect HttpApi + PostgreSQL）：`.codex/skills/effect-httpapi-postgres-crud/SKILL.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**：本阶段完成前，不进入后续用户故事的最终验收；否则会出现“文档/契约写的是 7001，但服务默认仍是旧端口”的漂移。

- [x] T009 [P] 将服务默认端口改为 `7001`（保留 `PORT` 覆盖）：`apps/logix-galaxy-api/src/main.ts`
- [x] T010 [P] 对齐服务 README 的默认端口与示例命令/curl（统一到 `7001`）：`apps/logix-galaxy-api/README.md`

**Checkpoint**: Foundation ready

---

## Phase 3: User Story 1 - 启动服务并健康检查 (Priority: P1) 🎯 MVP

**Goal**: 默认端口 `7001` 下可启动服务，`/health` 能解释数据库状态（ok/disabled/down），并支持 `/health/:probe`。

**Independent Test**: 按 `specs/062-galaxy-api-postgres/quickstart.md` 的“健康检查”步骤验收；同时对应的自动化测试应可在无数据库环境下通过。

- [x] T011 [P] [US1] 增补 `/health` 在 `db = ok/down` 的自动化测试（注入 DbTest layer，不依赖 `DATABASE_URL`）：`apps/logix-galaxy-api/src/health/health.http.test.ts`
- [x] T012 [US1] 如有漂移，调整 `/health` 的 `ok/db` 三态逻辑以匹配 spec（并避免泄露敏感信息）：`apps/logix-galaxy-api/src/health/health.http.live.ts`

---

## Phase 4: User Story 2 - Todo CRUD 数据库样例链路 (Priority: P2)

**Goal**: Todo CRUD 满足契约与错误形状；数据库不可用（disabled/down）时返回 `503 ServiceUnavailableError`；数据库可用时可用 smoke 验证真实链路。

**Independent Test**:

- 无数据库：`apps/logix-galaxy-api` 的自动化测试覆盖 CRUD 语义与 503/404 行为。
- 有数据库（可选）：按 `specs/062-galaxy-api-postgres/quickstart.md` 跑通 Todo CRUD 或 `smoke:pg`。

- [x] T013 [P] [US2] 增补 Todo CRUD 在 `DbError.disabled/query` 时返回 `503 ServiceUnavailableError` 的自动化测试（不依赖数据库）：`apps/logix-galaxy-api/src/todo/todo.http.test.ts`
- [x] T014 [US2] 如有漂移，调整 `ServiceUnavailableError` 的 message 规则（disabled vs query）并确保不泄露连接信息：`apps/logix-galaxy-api/src/todo/todo.http.live.ts`
- [x] T015 [US2] 如有漂移，调整 `todos` DDL/字段映射与 SSoT 一致：`apps/logix-galaxy-api/src/todo/todo.repo.live.ts`
- [x] T016 [P] [US2] 增强 pg smoke 覆盖 list 行为（建议做，提升“真实 DB 链路”置信度）：`apps/logix-galaxy-api/scripts/pg-smoke.ts`
- [x] T021 [P] [US2] 增补 `DATABASE_URL` 下的 PostgreSQL 集成测试（schema 隔离，真实 CRUD）：`apps/logix-galaxy-api/src/todo/todo.pg.integration.test.ts`

---

## Phase 5: User Story 3 - 一键自动化测试（可在无数据库环境下运行） (Priority: P3)

**Goal**: 一键运行测试与类型检查，且默认不依赖 PostgreSQL；需要 DB 时用 smoke 明确标注与隔离。

**Independent Test**: 完整执行 `specs/062-galaxy-api-postgres/quickstart.md` 的 Step 0 + Step 4。

- [x] T017 [US3] 跑通“一键自动化测试（无 PostgreSQL）”（`pnpm -C apps/logix-galaxy-api test`）：`specs/062-galaxy-api-postgres/quickstart.md`
- [x] T018 [US3] 跑通质量门（`pnpm -C apps/logix-galaxy-api typecheck` + `test`；禁止 watch）：`specs/062-galaxy-api-postgres/plan.md`
- [x] T022 [US3] quickstart 补充“可选：一键数据库集成测试（需要 PostgreSQL）”说明：`specs/062-galaxy-api-postgres/quickstart.md`

---

## Phase N: Polish & Cross-Cutting Concerns

- [x] T019 [P] 用 `$skill-creator` 复核并打包 CRUD skill（可选生成 `.skill` 产物，用于分发）：`.codex/skills/effect-httpapi-postgres-crud/SKILL.md`
- [x] T020 完整跑通 `quickstart.md`（DB smoke 需提供 `DATABASE_URL`；本次以无 DB 的自动化测试作为验收口径），并修复发现的漂移：`specs/062-galaxy-api-postgres/quickstart.md`
- [x] T023 [P] 将“`DATABASE_URL` 集成测试”写法同步沉淀到模板与 skill（避免只剩脚本 smoke）：`docs/specs/sdd-platform/ssot/examples/03-effect-httpapi-postgres-crud-template.md`、`.codex/skills/effect-httpapi-postgres-crud/SKILL.md`

---

## Dependencies & Execution Order

- Phase 2（T009–T010）阻塞最终验收：先把端口/README 对齐到 `7001`，再推进 US1/US2 的完整验收。
- US1（T011–T012）与 US2（T013–T016）在 Phase 2 完成后可并行推进（health 与 todo 分属不同目录）。
- US3（T017–T018）依赖 US1/US2 的实现与测试补齐，用于最后收口质量门。
