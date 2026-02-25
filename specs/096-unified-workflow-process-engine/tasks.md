# Tasks: Workflow/Process 统一内核第一阶段（O-003）

**Input**: `specs/096-unified-workflow-process-engine/plan.md`, `specs/096-unified-workflow-process-engine/spec.md`  
**Prerequisites**: `plan.md`、`spec.md`  
**Tests**: REQUIRED（至少一组 workflow/process 调度策略一致性）

**Organization**: 按 user story 分组，优先完成“可验证共核抽取”，避免激进重写。

## Format: `[ID] [P?] [Story] Description with file path`

---

## Phase 1: Setup（Spec Artifacts）

- [x] T001 Create/complete feature spec in `specs/096-unified-workflow-process-engine/spec.md`
- [x] T002 Create/complete implementation plan in `specs/096-unified-workflow-process-engine/plan.md`
- [x] T003 Create/complete executable tasks in `specs/096-unified-workflow-process-engine/tasks.md`

---

## Phase 2: User Story 1 - Workflow 调度/诊断共核抽取（Priority: P1）

**Goal**: 抽取 Workflow 的边界执行与 meta 组装共核，减少重复且不改 DSL/API。

**Independent Test**: `WorkflowRuntime.075` 相关语义测试保持通过。

- [x] T004 [US1] Identify repeated boundary/meta assembly hotspots in `packages/logix-core/src/internal/runtime/core/WorkflowRuntime.ts`
- [x] T005 [US1] Extract reusable boundary/meta helper(s) in `packages/logix-core/src/internal/runtime/core/WorkflowRuntime.ts`
- [x] T006 [US1] Keep existing behavior for `workflow.run/drop/cancel/dispatch/delay/call/timeout` and update inline comments if needed in `packages/logix-core/src/internal/runtime/core/WorkflowRuntime.ts`

---

## Phase 3: User Story 2 - Process 调度链路共核抽取（Priority: P1）

**Goal**: 抽取 Process trigger 链路接线共核（triggerSeq/预算/onDrop），降低重复。

**Independent Test**: `Process.Concurrency.*` 行为语义保持通过。

- [x] T007 [US2] Identify repeated trigger-run wiring in `packages/logix-core/src/internal/runtime/core/process/ProcessRuntime.make.ts`
- [x] T008 [US2] Extract reusable trigger-chain helper(s) in `packages/logix-core/src/internal/runtime/core/process/ProcessRuntime.make.ts`
- [x] T009 [US2] Touch `packages/logix-core/src/internal/runtime/core/process/concurrency.ts` only if strictly required by extraction
- [x] T010 [US2] Touch `packages/logix-core/src/internal/runtime/core/process/triggerStreams.ts` only if strictly required by extraction

---

## Phase 4: User Story 3 - Workflow/Process 策略行为对齐测试（Priority: P2）

**Goal**: 至少一组跨 workflow/process 的策略对齐证据。

**Independent Test**: 新增或改造测试可单独运行并稳定复现。

- [x] T011 [US3] Add/adjust one strategy-alignment test under `packages/logix-core/test/**` (workflow/process scheduling consistency)
- [x] T012 [US3] Verify existing related suites still pass:
  - `packages/logix-core/test/internal/Runtime/WorkflowRuntime.075.test.ts`
  - `packages/logix-core/test/Process/Process.Concurrency.DropVsParallel.test.ts`
  - `packages/logix-core/test/Process/Process.Concurrency.LatestVsSerial.test.ts`

---

## Phase 5: Validation & Evidence

- [x] T013 Run minimal type checks for touched scope: `pnpm --filter @logixjs/core typecheck:test`
- [x] T014 Run minimal tests for touched scope (non-watch)
- [ ] T015 Capture at least one reproducible perf baseline command result (`pnpm perf bench:012:process-baseline`) and record output path under `specs/096-unified-workflow-process-engine/perf/`（已执行命令但 gate fail）
- [ ] T016 Produce implementation report including changed files, extracted kernels, test results, and unfinished items

---

## Dependencies & Execution Order

1. Phase 1（T001-T003）必须先完成。
2. Phase 2 与 Phase 3 可并行探索，但建议先完成 Workflow 共核（T004-T006）再做 Process（T007-T010）。
3. Phase 4（测试对齐）依赖 Phase 2/3 的代码落地。
4. Phase 5（验证与证据）在代码与测试完成后执行。

## Parallel Opportunities

- T004 与 T007 可并行（分别分析 workflow/process 重复点）
- T011 可与 T012 部分并行（先写对齐测试，再跑现有回归）
- T013 与 T015 可并行（类型检查与性能基线）

## MVP Scope

1. 完成 T004-T008（双侧最小共核抽取）
2. 完成 T011（至少一组策略对齐测试）
3. 完成 T014（最小测试验证）
