# Tasks: SelectorGraph Watcher Dual Track（O-001）

**Input**: `specs/094-selectorgraph-watcher-dual-track/spec.md`, `specs/094-selectorgraph-watcher-dual-track/plan.md`  
**Prerequisites**: `spec.md`（required）, `plan.md`（required）  
**Tests**: REQUIRED（runtime 订阅路径改动）

## Format: `[ID] [P?] [Story] Description with file path`

- `[P]`：可并行
- `[Story]`：`[US1]` / `[US2]` / `[US3]`

---

## Phase 1: Setup（Spec 产物对齐）

- [x] T001 补齐 `specs/094-selectorgraph-watcher-dual-track/spec.md`
- [x] T002 补齐 `specs/094-selectorgraph-watcher-dual-track/plan.md`
- [x] T003 补齐 `specs/094-selectorgraph-watcher-dual-track/tasks.md`

---

## Phase 2: Foundational（双轨路由核心实现）

**⚠️ CRITICAL**: 后续测试依赖本阶段

- [x] T004 在 `packages/logix-core/src/internal/runtime/core/FlowRuntime.ts` 实现 `fromState` 双轨路由：
  显式 `ReadQuery` 优先静态路径；非显式 selector 自动 compile 静态优先；统一 fallback

---

## Phase 3: User Story 1 - 显式 ReadQuery 直连静态车道 (Priority: P1)

**Independent Test**: 显式 `ReadQuery` 优先调用 `changesReadQueryWithMeta`

- [x] T005 [US1] 更新 `packages/logix-core/test/Flow/FlowRuntime.fromState.ReadQuery.test.ts`：
  覆盖“显式 ReadQuery 优先静态路径”
- [x] T006 [US1] 更新 `packages/logix-core/test/Flow/FlowRuntime.fromState.ReadQuery.test.ts`：
  覆盖“显式 ReadQuery 在静态路径缺失时 fallback”

---

## Phase 4: User Story 2 - 非显式 selector 自动静态编译优先 (Priority: P1)

**Independent Test**: 函数 selector 编译为 static lane 时自动走静态路径

- [x] T007 [US2] 更新 `packages/logix-core/test/Flow/FlowRuntime.fromState.ReadQuery.test.ts`：
  覆盖“非显式 selector 自动 compile + static 路径”

---

## Phase 5: User Story 3 - 保守 fallback (Priority: P2)

**Independent Test**: dynamic lane 下保持旧语义 `changes(selector)`

- [x] T008 [US3] 更新 `packages/logix-core/test/Flow/FlowRuntime.fromState.ReadQuery.test.ts`：
  覆盖“自动编译 dynamic lane fallback 到 changes(selector)”

---

## Phase 6: Verification

- [x] T009 运行最小验证：`pnpm --filter @logixjs/core exec vitest run test/Flow/FlowRuntime.fromState.ReadQuery.test.ts`
- [x] T010 运行最小类型门禁：`pnpm --filter @logixjs/core typecheck:test`
- [x] T011 记录命令与结果，更新任务状态与残留风险说明

---

## Phase 7: Perf Evidence Follow-up

- [ ] T012 建立 `specs/094-selectorgraph-watcher-dual-track/perf/` 并补齐 before/after/diff 证据（后续阶段）

---

## Dependencies & Execution Order

- `T004` 先于所有 story 测试任务（`T005-T008`）。
- `T009-T011` 依赖 `T004-T008` 完成。
- `T012` 为后续增强，不阻塞第一阶段交付。
