# Tasks: 063 logix-galaxy-api 登录与用户模块（BetterAuth-first）

**Input**: Design documents from `specs/063-galaxy-user-auth/`
**Prerequisites**: `specs/063-galaxy-user-auth/plan.md`、`specs/063-galaxy-user-auth/spec.md`（必需），其余按需参考：`research.md`、`data-model.md`、`contracts/`、`quickstart.md`

## Phase 1: Setup（共享基础）

- [x] T001 增加依赖 `better-auth`：更新 `apps/logix-galaxy-api/package.json`
- [x] T002 增加 BetterAuth CLI 配置文件：新增 `apps/logix-galaxy-api/auth.ts`
- [x] T003 [P] 对齐验收文档：更新 `specs/063-galaxy-user-auth/quickstart.md`

---

## Phase 2: Foundational（阻塞前置）

- [x] T004 新增 Auth DTO 与通用错误 Schema：新增 `apps/logix-galaxy-api/src/auth/auth.contract.ts`
- [x] T005 新增 User 管理 DTO 与 Schema：新增 `apps/logix-galaxy-api/src/user/user.contract.ts`
- [x] T006 新增 AuthService 抽象（Tag + 接口）：新增 `apps/logix-galaxy-api/src/auth/auth.service.ts`
- [x] T007 [P] 新增审计事件 Repo 抽象（Tag + 接口）：新增 `apps/logix-galaxy-api/src/auth/auth-event.repo.ts`
- [x] T008 [P] 新增登录限速实现（可配置、可测试）：新增 `apps/logix-galaxy-api/src/auth/auth.rate-limit.ts`
- [x] T009 把新 group 接入 API：更新 `apps/logix-galaxy-api/src/app/effect-api.ts`

---

## Phase 3: User Story 1 - 登录并访问受保护接口 (Priority: P1) 🎯 MVP

**Goal**: 登录闭环 `POST /auth/login` → `GET /me` → `POST /auth/logout`，并满足错误语义与限速要求。

**Independent Test**: 不依赖 PostgreSQL，通过 handler-level 测试覆盖登录/鉴权/登出/限速核心场景。

- [x] T010 [P] [US1] 实现 Auth HTTP handlers（login/me/logout）：新增 `apps/logix-galaxy-api/src/auth/auth.http.live.ts`
- [x] T011 [P] [US1] 为 US1 提供 AuthService 测试替身 + handler-level 测试：新增 `apps/logix-galaxy-api/src/auth/auth.http.test.ts`

---

## Phase 4: User Story 2 - 管理员管理用户（创建/查询/更新/禁用/重置密码） (Priority: P2)

**Goal**: 管理员用户管理接口可用，且权限边界清晰、错误稳定。

**Independent Test**: 不依赖 PostgreSQL，通过 handler-level 测试覆盖创建/查询/更新/禁用/启用/重置密码与权限拦截。

- [x] T012 [P] [US2] 实现 User HTTP handlers（/users*）：新增 `apps/logix-galaxy-api/src/user/user.http.live.ts`
- [x] T013 [P] [US2] 为 US2 提供 AuthService 测试替身 + handler-level 测试：新增 `apps/logix-galaxy-api/src/user/user.http.test.ts`

---

## Phase 5: User Story 3 - 自动化测试与安全审计可回归 (Priority: P3)

**Goal**: 审计事件落库与查询可回归；默认测试不依赖 PostgreSQL。

**Independent Test**: 使用 AuthEventRepo 测试替身断言事件写入与查询的最小语义。

- [x] T014 [P] [US3] 实现审计事件 Repo Live（PostgreSQL）：新增 `apps/logix-galaxy-api/src/auth/auth-event.repo.live.ts`
- [x] T015 [P] [US3] 增加 `GET /auth/events` handler 并接入 repo：更新 `apps/logix-galaxy-api/src/auth/auth.http.live.ts`
- [x] T016 [P] [US3] 增加审计事件相关测试用例：更新 `apps/logix-galaxy-api/src/auth/auth.http.test.ts`

---

## Phase 6: Live 实现与冒烟（BetterAuth + PostgreSQL）

**Purpose**: 接入 BetterAuth Live，实现真实 DB 下可运行闭环，并提供 seed 脚本。

- [x] T017 新增 BetterAuth 构造（纯函数）：新增 `apps/logix-galaxy-api/src/auth/better-auth.ts`
- [x] T018 新增 AuthServiceLive（BetterAuth 适配实现）：新增 `apps/logix-galaxy-api/src/auth/auth.service.live.ts`
- [x] T019 更新主入口 Layer wiring：更新 `apps/logix-galaxy-api/src/main.ts`
- [x] T020 新增 seed 脚本：创建/修复 admin 用户：新增 `apps/logix-galaxy-api/scripts/seed-admin.ts`

---

## Phase 7: Polish & Cross-Cutting

- [x] T021 统一错误映射与敏感字段清理（message 不泄露内部细节）：更新 `apps/logix-galaxy-api/src/auth/auth.http.live.ts`
- [x] T022 [P] 对齐 OpenAPI 与 Schema（id 为 string；错误形状一致）：更新 `apps/logix-galaxy-api/src/auth/auth.contract.ts`、`apps/logix-galaxy-api/src/user/user.contract.ts`
- [ ] T023 运行 `specs/063-galaxy-user-auth/quickstart.md` 的最小验收路径（含前端联调）并修补文档/代码偏差：更新对应文件

---

## Phase 8: Frontend Integration（apps/logix-galaxy-fe 联调） 🎯

**Goal**: 在 `apps/logix-galaxy-fe` 跑通登录闭环：`POST /auth/login` → `GET /me` → `POST /auth/logout`。

**Independent Test**: 启动 `apps/logix-galaxy-api`（默认 `5500`）与 `apps/logix-galaxy-fe`（Vite 默认 `5173`），用 seed 的管理员账号登录后能看到 `/me` 的 user 信息，登出后再次刷新 `/me` 被拒绝（`401`）。

- [x] T024 增加 Vite dev proxy（`/api` → `http://127.0.0.1:5500`）：更新 `apps/logix-galaxy-fe/vite.config.ts`
- [x] T025 [P] 新增最小 Galaxy API client + token 存储：新增 `apps/logix-galaxy-fe/src/galaxy-api/*`
- [x] T026 更新联调 UI：登录/登出/展示当前用户：更新 `apps/logix-galaxy-fe/src/App.tsx`
- [x] T027 对齐验收文档：补充前端联调步骤：更新 `specs/063-galaxy-user-auth/quickstart.md`

---

## Dependencies & Execution Order（简版）

- Phase 1 → Phase 2 为全局前置；US1/US2/US3 依赖 Phase 2
- Phase 6 依赖 US1/US2/US3 的 handler/契约形态稳定后再接入（避免测试与运行态耦合）
- Phase 8 依赖 Phase 6（需要可运行的 Live 服务作为联调目标）
