# Tasks: Logix Router Bridge（可注入 Router Contract）

**Input**: Design documents from `specs/071-logix-router-bridge/`  
**Prerequisites**: `spec.md`（用户故事/验收）, `plan.md`（落点/约束）, `data-model.md`, `contracts/*`, `research.md`, `quickstart.md`, `notes/*`  
**Tests**: REQUIRED（`packages/logix-*`；且 `spec.md` 的 SC-004 明确要求自动化测试）

## Format: `[ID] [P?] [Story] Description with file path`

- `[P]`：可并行（不同文件/无前置依赖）
- `[US1]/[US2]/[US3]`：对应 `spec.md` 的 User Story

---

## Phase 1: Setup（Shared Infrastructure）

- [ ] T001 Create `packages/logix-router/package.json` + scripts in `packages/logix-router/package.json`
- [ ] T002 [P] Add TypeScript configs in `packages/logix-router/tsconfig.json` and `packages/logix-router/tsconfig.test.json`
- [ ] T003 [P] Create public module skeleton in `packages/logix-router/src/index.ts`
- [ ] T004 [P] Create test scaffold folder in `packages/logix-router/test/`

---

## Phase 2: Foundational（Blocking Prerequisites）

**⚠️ CRITICAL**：此阶段完成前，不进入 Router 包的“事务窗口禁航/诊断事件化”实现。

- [ ] T005 Expose txn-window check via internal contract in `packages/logix-core/src/internal/InternalContracts.ts` (new: `isInSyncTransaction()`)
- [ ] T006 [P] Add InternalContracts public re-export in `packages/logix-core/src/index.ts`
- [ ] T007 Extend ExecuteRequest with generic trace variant in `packages/logix-core/src/internal/trait-lifecycle/model.ts`
- [ ] T008 Record trace ExecuteRequest in `packages/logix-core/src/internal/trait-lifecycle/index.ts`
- [ ] T009 [P] Add/adjust core tests for trace requests in `packages/logix-core/test/internal/trait-lifecycle/TraitLifecycle.Trace.test.ts`
- [ ] T010 Run typecheck coverage for core+tests in `packages/logix-core/tsconfig.test.json` (validate via `pnpm -C packages/logix-core typecheck:test`)

**Checkpoint**：`Logix.InternalContracts` 可被领域包调用；TraitLifecycle 支持通用 trace 事件化。

---

## Phase 3: User Story 1 - 在 `.logic()` 内读取并使用 Route Snapshot (Priority: P1) 🎯 MVP

**Goal**：在 `.logic()` 内读取 snapshot，并可订阅变化（含 initial）；无需组件层手工同步。

**Independent Test**：Memory 实现初始化 A → 读取 A；推送 B → 订阅收到 B（保序、不丢最后、先 emit initial）。

- [ ] T011 [US1] Define `RouteSnapshot` shape + invariants in `packages/logix-router/src/Model.ts`
- [ ] T012 [US1] Define `RouterError` codes + structured hints in `packages/logix-router/src/Error.ts`
- [ ] T013 [US1] Define `RouterService` + `Router.Tag` in `packages/logix-router/src/Router.ts`
- [ ] T014 [US1] Implement `Router.layer(service)` in `packages/logix-router/src/Router.ts`
- [ ] T015 [US1] Implement `Router.use($)` (BoundApi binding + missing-router structured error) in `packages/logix-router/src/Router.ts`
- [ ] T016 [US1] Implement `Router.Memory.make` (getSnapshot + changes w/ initial) in `packages/logix-router/src/Memory.ts`
- [ ] T017 [P] [US1] Add tests for snapshot read/changes semantics in `packages/logix-router/test/Memory.snapshot.test.ts`
- [ ] T018 [P] [US1] Add tests for missing-router error path in `packages/logix-router/test/Router.missing.test.ts`

**Checkpoint**：US1 场景独立通过；`changes` 语义与 `spec.md`/`contracts/public-api.md` 一致。

---

## Phase 4: User Story 2 - 在 `.logic()` 内发起导航意图 (Priority: P2)

**Goal**：在 `.logic()` 内发起 push/replace/back（返回 `void`）；结果通过 changes/getSnapshot 观测；txn-window 内显式失败；diagnostics 可解释链路（start/settled）。

**Independent Test**：Memory history stack：push/replace/back → 产生预期快照演进；back 栈空→结构化错误；txn-window 内调用→结构化错误；diagnostics on 时产生 trace 事件并可按 `navSeq` 关联；diagnostics off 不产生 trace 事件（NFR-002）。

- [ ] T019 [US2] Define `NavigationIntent` discriminated union in `packages/logix-router/src/Model.ts`
- [ ] T020 [P] [US2] Implement `Router.SearchParams` helpers in `packages/logix-router/src/SearchParams.ts`
- [ ] T021 [US2] Implement `navigate(intent)` + `controller.*` in `packages/logix-router/src/Memory.ts`
- [ ] T022 [US2] Enforce txn-window no-navigate using `Logix.InternalContracts` in `packages/logix-router/src/internal/txnGuard.ts`
- [ ] T023 [US2] Implement `navSeq` allocation + trace payload model in `packages/logix-router/src/internal/trace.ts`
- [ ] T024 [US2] Wire navigate tracing via `Logix.TraitLifecycle.scopedExecute` in `packages/logix-router/src/internal/navigateTrace.ts` (settled=final snapshot incl. redirects; quietWindowMs=0; settleTimeoutMs=10_000; timeout => settled status=error)
- [ ] T025 [P] [US2] Add tests for intent semantics + history stack in `packages/logix-router/test/Memory.navigate.test.ts`
- [ ] T026 [P] [US2] Add tests for txn-window violation in `packages/logix-router/test/Router.txn-guard.test.ts`
- [ ] T027 [P] [US2] Add tests for navigate trace start/settled correlation (settled=final snapshot; includes settle-timeout case) + diagnostics off no-trace in `packages/logix-router/test/Router.trace.test.ts` (NFR-002)
- [ ] T042 [US2] Convert engine navigate sync throw / promise rejection into `RouterError` in `packages/logix-router/src/internal/tryNavigate.ts`
- [ ] T043 [P] [US2] Add tests for navigate error wrapping in `packages/logix-router/test/Router.navigate-error.test.ts`

**Checkpoint**：US2 场景独立通过；`contracts/diagnostics.md` 的 two-phase 口径可被测试覆盖。

---

## Phase 5: User Story 3 - 路由引擎可替换，业务 logic 不改动 (Priority: P2)

**Goal**：替换注入实现即可切换路由引擎；业务模块/logic 代码不改。

**Independent Test**：同一份逻辑：分别注入 Memory 与 FakeRouter（或 ReactRouter/TanStackRouter adapter）→ 同一组验收用例通过。

- [ ] T028 [US3] Implement React Router binding builder in `packages/logix-router/src/ReactRouter.ts` (ensure `pathname` is router-local; strip basepath; misconfig => structured error)
- [ ] T029 [US3] Implement TanStack Router binding builder in `packages/logix-router/src/TanStackRouter.ts` (ensure `pathname` is router-local; strip basepath; misconfig => structured error)
- [ ] T044 [US3] Implement basepath normalization + misconfig error in `packages/logix-router/src/internal/basepath.ts`
- [ ] T045 [P] [US3] Add tests for basepath stripping + misconfig error in `packages/logix-router/test/Router.basepath.test.ts`
- [ ] T030 [P] [US3] Add adapter-level fakes for tests in `packages/logix-router/test/fakes.ts`
- [ ] T031 [P] [US3] Add tests proving engine replaceability in `packages/logix-router/test/Router.replaceability.test.ts`
- [ ] T032 [US3] Add minimal PoC scenario in `examples/logix/src/scenarios/router-bridge.ts`

**Checkpoint**：US3 场景独立通过；只替换 `Router.layer(...)` 的参数即可切换实现。

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T033 [P] Align docs wording with SSoT in `specs/071-logix-router-bridge/contracts/public-api.md`
- [ ] T034 [P] Align diagnostics wording with SSoT in `specs/071-logix-router-bridge/contracts/diagnostics.md`
- [ ] T035 Add migration note if TraitLifecycle changes require downstream updates in `specs/071-logix-router-bridge/contracts/migration.md`
- [ ] T036 [P] Add user-facing doc in `apps/docs/content/docs/guide/learn/router.md`
- [ ] T037 Run workspace gates via root scripts in `package.json`: `pnpm typecheck`, `pnpm lint`, `pnpm test:turbo`
- [ ] T038 Add `bench:071:router-navigate` perf micro-bench in `.codex/skills/logix-perf-evidence/scripts/071-logix-router-bridge.router-navigate.ts` + wire script in `.codex/skills/logix-perf-evidence/package.json` (includes `heapDeltaBytes`, run with `NODE_OPTIONS=--expose-gc`) (Perf Evidence Plan)
- [ ] T039 Run perf evidence collection (`NODE_OPTIONS=--expose-gc pnpm perf bench:016:diagnostics-overhead` + `NODE_OPTIONS=--expose-gc pnpm perf bench:071:router-navigate`) and write baseline numbers + sampling params back to `specs/071-logix-router-bridge/plan.md` (Perf Evidence Plan)
- [ ] T040 [P] Add tests proving lazy subscription / no background work when unused in `packages/logix-router/test/Router.lazy.test.ts` (NFR-001)
- [ ] T041 [P] Add tests proving multi-instance isolation in `packages/logix-router/test/Router.multi-instance.test.ts` (FR-006 / NFR-004)

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → Phase 3 (MVP) → Phase 4 → Phase 5 → Phase 6
- US1 依赖 Phase 2 的基础落点（Tag/Layer/包结构），但不依赖 trace/txn 细节即可先跑通 Memory 的 read/changes。
- US2 依赖 Phase 2（txn check + trace ExecuteRequest）。
- US3 可在 US1/US2 之后推进（优先用 fakes 验证可替换性，再补真实 adapter 适配）。

---

## Coverage Map（FR/NFR/SC ↔ Tasks）

- FR-001: T011, T016, T017
- FR-002: T016, T017
- FR-003: T019, T021, T025
- FR-004: T007, T008, T024, T027
- FR-005: T028, T029, T031
- FR-006: T041
- FR-007: T011, T020
- FR-008: T012, T015, T018, T043, T044, T045
- NFR-001: T040
- NFR-002: T027, T038, T039
- NFR-003: T005, T022, T026
- NFR-004: T013, T014, T041
- NFR-005: T035
- SC-001: T017, T032
- SC-002: T031, T032
- SC-003: T024, T027, T034
- SC-004: T017, T018, T025, T027, T031
