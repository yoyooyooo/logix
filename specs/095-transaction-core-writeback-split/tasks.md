# Tasks: Transaction Core Writeback Split（O-002）

**Input**: `specs/095-transaction-core-writeback-split/spec.md`, `specs/095-transaction-core-writeback-split/plan.md`  
**Prerequisites**: `spec.md`、`plan.md`  
**Tests**: REQUIRED（transaction/post-commit 顺序与标识稳定性）

## Format: `[ID] [P?] [Story] Description with file path`

---

## Phase 1: Setup（Spec Artifacts）

- [x] T001 Complete `specs/095-transaction-core-writeback-split/spec.md`
- [x] T002 Complete `specs/095-transaction-core-writeback-split/plan.md`
- [x] T003 Complete `specs/095-transaction-core-writeback-split/tasks.md`

---

## Phase 2: User Story 1 - Post-Commit 阶段切分（Priority: P1）

**Goal**: 将 commit 后逻辑提取为显式阶段入口，保持语义不变。

- [x] T004 [US1] Identify exact post-commit block boundaries in `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- [x] T005 [US1] Extract `runPostCommitPhases(...)` (or equivalent) in `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- [x] T006 [US1] Keep original execution order for diagnostics/history/rowId/commitHub/onCommit/debug in `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`

---

## Phase 3: User Story 2 - 行为与标识稳定（Priority: P1）

**Goal**: 验证顺序语义与 `txnId/txnSeq` 不回归。

- [~] T007 [US2] Add or update ordering assertions in `packages/logix-core/test/internal/Runtime/**`（deferred to Phase 2: [#98](https://github.com/yoyooyooo/logix/issues/98)）
- [~] T008 [US2] Add or update txn identity stability assertions in `packages/logix-core/test/internal/Runtime/**`（deferred to Phase 2: [#98](https://github.com/yoyooyooo/logix/issues/98)）
- [ ] T009 [US2] Touch `packages/logix-core/src/internal/runtime/core/StateTransaction.ts` only if data handoff requires it

---

## Phase 4: User Story 3 - 验证与证据（Priority: P2）

**Goal**: 给出最小可复现验证结果。

- [x] T010 [US3] Run minimal test gate: `pnpm --filter @logixjs/core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts`
- [x] T011 [US3] Run minimal type gate: `pnpm --filter @logixjs/core typecheck:test`
- [x] T012 [US3] Record changed files, extraction points, command outputs, and residual risks

---

## Dependencies & Order

- T004-T006 先于 T007-T009。
- T010-T012 依赖 T004-T009。
- 本阶段不做激进行为改写，先锁“结构切分 + 等价语义”。
