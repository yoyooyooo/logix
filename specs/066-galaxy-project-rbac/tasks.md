# Tasks: 066 logix-galaxy 项目管理与 RBAC（成员/角色/权限/成员组）

**Input**: 设计文档来自 `specs/066-galaxy-project-rbac/`
**Prerequisites**: `specs/066-galaxy-project-rbac/spec.md`、`specs/066-galaxy-project-rbac/plan.md`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件、无未完成依赖）
- **[Story]**: 用户故事标签（`[US1]` / `[US2]` / `[US3]`）
- 每条任务描述必须包含明确文件路径

---

## Phase 1: Setup（Shared Infrastructure）

**Purpose**: 建立本特性需要的代码落点目录

- [x] T001 Create backend module folder `apps/logix-galaxy-api/src/project/`
- [x] T002 Create frontend folders `apps/logix-galaxy-fe/src/routes/` and `apps/logix-galaxy-fe/src/galaxy/`

---

## Phase 2: Foundational（Blocking Prerequisites）

**Purpose**: 所有用户故事共享的基础设施（完成后才能进入 US 阶段）

- [x] T003 [P] Implement RBAC primitives (role/permission keys + stable sorting) in `apps/logix-galaxy-api/src/project/project.rbac.ts`
- [x] T004 [P] Define repo Tags and method contracts in `apps/logix-galaxy-api/src/project/project.repo.ts` and `apps/logix-galaxy-api/src/project/project-audit.repo.ts`
- [x] T005 Implement idempotent schema init with env gate `LOGIX_GALAXY_AUTO_MIGRATE_PROJECT_RBAC` in `apps/logix-galaxy-api/src/project/project.schema.live.ts`
- [x] T006 Wire `ProjectSchemaLive` into server startup in `apps/logix-galaxy-api/src/main.ts`

**Checkpoint**: Phase 2 完成后，US1/US2/US3 可以分工并行推进（按依赖约束）。

---

## Phase 3: User Story 1 - 创建项目并管理成员（基础角色闭环） (Priority: P1) 🎯 MVP

**Goal**: 跑通 Project + Member + RBAC 的最小闭环（不要求成员组 UI/接口）。

**Independent Test**: 通过 `specs/066-galaxy-project-rbac/quickstart.md` 的第 6–8 节（curl）可验证：创建项目、添加成员、viewer 无法变更成员。

### Backend（API + DB）

- [x] T007 [P] [US1] Add Project/Member/Access endpoint contracts in `apps/logix-galaxy-api/src/project/project.contract.ts` (align `specs/066-galaxy-project-rbac/contracts/openapi.yaml`)
- [x] T008 [P] [US1] Implement audit repo live (insert/list) in `apps/logix-galaxy-api/src/project/project-audit.repo.live.ts`
- [x] T009 [US1] Implement project/member/access repo live in `apps/logix-galaxy-api/src/project/project.repo.live.ts`
- [x] T010 [US1] Implement US1 handlers in `apps/logix-galaxy-api/src/project/project.http.live.ts`
- [x] T011 [US1] Wire Project group into API wiring in `apps/logix-galaxy-api/src/app/effect-api.ts` and `apps/logix-galaxy-api/src/main.ts`

### Tests（因为 NFR-003 要求可回归审计/权限语义）

- [x] T012 [P] [US1] Create in-memory test harness Layer in `apps/logix-galaxy-api/src/test/project-harness.ts`
- [x] T013 [US1] Add handler-level tests for US1 in `apps/logix-galaxy-api/src/project/project.http.test.ts`

---

## Phase 4: User Story 2 - 成员组（Group）与角色绑定 (Priority: P2)

**Goal**: 在项目域内提供成员组与组成员管理，并将组角色并入有效权限计算。

**Independent Test**: 通过 `specs/066-galaxy-project-rbac/quickstart.md` 的第 9–11 节（curl）可验证：创建组、加组成员、`/access` 返回的有效权限发生变化。

- [x] T014 [P] [US2] Extend group endpoint contracts in `apps/logix-galaxy-api/src/project/project.contract.ts` (align `specs/066-galaxy-project-rbac/contracts/openapi.yaml`)
- [x] T015 [US2] Implement group CRUD + group members in `apps/logix-galaxy-api/src/project/project.repo.live.ts`
- [x] T016 [US2] Implement US2 handlers in `apps/logix-galaxy-api/src/project/project.http.live.ts`
- [x] T017 [US2] Add US2 coverage to `apps/logix-galaxy-api/src/project/project.http.test.ts` (group name uniq 409, non-member join 409, duplicate add 409, privilege escalation guarded by `owner.manage`)

---

## Phase 5: User Story 3 - 前端路由联调闭环（Logix dogfooding） (Priority: P3)

**Goal**: `apps/logix-galaxy-fe` 提供可用路由与页面串起 P1/P2，并且业务状态/请求流程由 Logix 承载。

**Independent Test**: 启动后端 + 前端，完成：登录 → 创建项目 → 添加成员 → 创建组/加组成员（轻量布局即可），并验证直输 URL 的路由守卫行为。

### API Client & Types

- [x] T018 [P] [US3] Extend DTOs + client methods in `apps/logix-galaxy-fe/src/galaxy-api/client.ts` (projects/members/groups/access/audit)
- [x] T019 [P] [US3] Add RBAC helpers/types in `apps/logix-galaxy-fe/src/galaxy/permissions.ts` (align `apps/logix-galaxy-api/src/project/project.rbac.ts`)

### Logix Modules（dogfooding）

- [x] T020 [US3] Implement auth module (token/me/login/logout) in `apps/logix-galaxy-fe/src/galaxy/auth.module.ts`
- [x] T021 [US3] Implement projects module (list/create/select/access) in `apps/logix-galaxy-fe/src/galaxy/projects.module.ts`
- [x] T022 [US3] Implement project members module in `apps/logix-galaxy-fe/src/galaxy/project-members.module.ts`
- [x] T023 [US3] Implement project groups module in `apps/logix-galaxy-fe/src/galaxy/project-groups.module.ts`

### Router & Pages

- [x] T024 [US3] Add router definition in `apps/logix-galaxy-fe/src/routes/router.tsx` and render it from `apps/logix-galaxy-fe/src/main.tsx`
- [x] T025 [US3] Implement route guards in `apps/logix-galaxy-fe/src/routes/guards.tsx` (require login + permission keys)
- [x] T026 [US3] Implement login page in `apps/logix-galaxy-fe/src/routes/login.tsx`
- [x] T027 [US3] Implement projects page (list/create) in `apps/logix-galaxy-fe/src/routes/projects.tsx`
- [x] T028 [US3] Implement project detail page (members/groups) in `apps/logix-galaxy-fe/src/routes/project.tsx`
- [x] T029 [US3] Refactor app shell to remove non-Logix business fetch from `apps/logix-galaxy-fe/src/App.tsx`

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: 补齐审计查询、环境模板与验收/质量门

- [x] T030 Implement audit events endpoint (contract + handler + repo) in `apps/logix-galaxy-api/src/project/project.contract.ts`, `apps/logix-galaxy-api/src/project/project.http.live.ts`, `apps/logix-galaxy-api/src/project/project-audit.repo.live.ts`
- [x] T031 Ensure all governance actions write audit events in `apps/logix-galaxy-api/src/project/project.repo.live.ts`
- [x] T032 Add audit listing + emission assertions in `apps/logix-galaxy-api/src/project/project.http.test.ts`
- [x] T033 Update local env template with `LOGIX_GALAXY_AUTO_MIGRATE_PROJECT_RBAC` in `apps/logix-galaxy-api/env.local.template`
- [x] T034 Run quality gates and validate quickstart: `apps/logix-galaxy-api/package.json`, `apps/logix-galaxy-fe/package.json`, `specs/066-galaxy-project-rbac/quickstart.md`

---

## Dependencies & Execution Order

- Phase 1 → Phase 2（阻塞）
- Phase 2 完成后：
  - **US1** 可启动（建议 MVP 优先）
  - **US2** 依赖 US1 的项目/成员基础能力（需要 projectId 与成员态）
  - **US3** 建议在 US1 完成后启动；若并行开发，则先以 OpenAPI 作为契约并用 mock/占位数据推进
- Polish 依赖 US1+US2 基本完成后再收口

---

## Parallel Examples

### US1（并行示例）

- 任务 T007（contract）与 T008（audit repo）可并行推进（不同文件：`apps/logix-galaxy-api/src/project/project.contract.ts`、`apps/logix-galaxy-api/src/project/project-audit.repo.live.ts`）。
- 任务 T012（harness）可与后端实现并行推进（不同文件：`apps/logix-galaxy-api/src/test/project-harness.ts`）。

---

## Acceptance Follow-ups（Post-acceptance）

**Purpose**: 补齐 `specs/066-galaxy-project-rbac/spec.md` 在 acceptance 阶段暴露的验证缺口（以自动化测试为主）。

- [x] T035 Add member list assertions (directRole/groupRoleKeys/effective keys) in `apps/logix-galaxy-api/src/project/project.http.test.ts`
- [x] T036 Add owner invariants tests (last owner cannot be removed/downgraded; ownership transfer) in `apps/logix-galaxy-api/src/project/project.http.test.ts`
- [x] T037 Add group CRUD/member remove coverage + access change after remove in `apps/logix-galaxy-api/src/project/project.http.test.ts`
- [x] T038 Add structured error body coverage for `400/404` and `401` across all project endpoints in `apps/logix-galaxy-api/src/project/project.http.test.ts`
- [x] T039 Expand audit assertions to cover all event types and actor/subject fields in `apps/logix-galaxy-api/src/project/project.http.test.ts`

---

## Developer Experience（Post-implementation）

- [x] T040 Enable Logix Devtools in FE runtime (DEV-only) and mount UI in `apps/logix-galaxy-fe/src/RuntimeProvider.tsx`, `apps/logix-galaxy-fe/src/App.tsx`, `apps/logix-galaxy-fe/package.json`
- [x] T041 Fix FE Logix watcher startup concurrency (avoid action handlers being skipped) in `apps/logix-galaxy-fe/src/galaxy/auth.module.ts`, `apps/logix-galaxy-fe/src/galaxy/projects.module.ts`, `apps/logix-galaxy-fe/src/galaxy/project-members.module.ts`, `apps/logix-galaxy-fe/src/galaxy/project-groups.module.ts`
- [x] T042 Fix FE strict `$.use(...)` module imports wiring (avoid MissingModuleRuntimeError, ensure actions can trigger effects) in `apps/logix-galaxy-fe/src/galaxy/projects.module.ts`, `apps/logix-galaxy-fe/src/galaxy/project-members.module.ts`, `apps/logix-galaxy-fe/src/galaxy/project-groups.module.ts`
- [x] T043 Map Debug browser console output to diagnostic severity (warn/info/error) so missing imports is visible by default in `packages/logix-core/src/internal/runtime/core/DebugSink.ts`, `packages/logix-core/test/DebugSink.browserConsole.test.ts`
- [x] T044 Add dev diagnostic-only browser console mode (`devConsole: 'diagnostic'`) and use it in FE runtime in `packages/logix-core/src/internal/debug-api.ts`, `packages/logix-core/src/internal/runtime/core/DebugSink.ts`, `apps/logix-galaxy-fe/src/RuntimeProvider.tsx`
- [x] T045 Fold diagnosticsLevel into Debug.layer options (reduce debug layers in app code) in `packages/logix-core/src/internal/debug-api.ts`, `packages/logix-core/test/Debug/Debug.test.ts`
- [x] T046 Fold Debug console + Devtools shipping into `Runtime.make` options (debug/devtools passthrough), keep manual layers opt-in in `packages/logix-core/src/Runtime.ts`, `apps/logix-galaxy-fe/src/RuntimeProvider.tsx`
