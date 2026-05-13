# DirtyPlan Converge Single Source Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 converge 正常热路径从 dirtyPlan 优先推进到 dirtyPlan 唯一事实源，legacy dirty handoff 只保留在 adapter/fallback。

**Architecture:** `ConvergePlanRequest` 当前同时有 `dirtyPlan` 和 legacy `dirtyAllReason/dirtyPaths/dirtyPathsKeyHash/dirtyPathsKeySize`。本需求把 production `planConverge` request 收窄为 dirtyPlan-only，并新增 explicit legacy adapter 供旧 tests 或特殊 compatibility 使用。dirtyPlan 存在时，legacy 输入不得改变 mode、reason、planKeyHash 或 affected steps。

**Tech Stack:** TypeScript 5.x, Effect, Vitest, pnpm monorepo. This plan is source-level and contract-test driven.

---

## Global Guardrails

- Do not add public root exports, public submodules, or public authoring nouns.
- Do not add benchmark/perf collection scripts in this wave. Existing focused contract/perf-off tests may be run only as correctness guards.
- Do not claim performance improvement. The goal is architecture stabilization and regression-proofing.
- Do not use destructive git operations (`git reset`, `git clean`, `git checkout -- <path>`, `git restore`, `git stash`).
- Keep every PR small and reviewable. Commit after each passing task group.
- Diagnostics-level `off` must not allocate trace payloads or emit debug events.
- Runtime owns truth. React, Playground, Devtools, CLI, and domain packages may only consume/project existing truth.

## File Structure / Responsibility Map
### Create
- `packages/logix-core/src/internal/field-kernel/converge-legacy-dirty-adapter.ts` — new focused artifact for this requirement; keep it internal unless explicitly a docs/script artifact.
- `packages/logix-core/test/FieldKernel/FieldKernel.ConvergePlanner.LegacyDirtyInputGuard.test.ts` — new focused artifact for this requirement; keep it internal unless explicitly a docs/script artifact.

### Modify
- `packages/logix-core/src/internal/field-kernel/converge-planner.ts` — update only for this requirement's stated responsibility; avoid opportunistic cleanup.
- `packages/logix-core/src/internal/field-kernel/converge-in-transaction.impl.ts` — update only for this requirement's stated responsibility; avoid opportunistic cleanup.
- `packages/logix-core/src/internal/field-kernel/converge.types.ts` — update only for this requirement's stated responsibility; avoid opportunistic cleanup.
- `packages/logix-core/src/internal/field-kernel/plan-cache.ts` — update only for this requirement's stated responsibility; avoid opportunistic cleanup.
- `packages/logix-core/test/FieldKernel/FieldKernel.ConvergePlanner.DecisionExecutionSinglePath.test.ts` — update only for this requirement's stated responsibility; avoid opportunistic cleanup.
- `packages/logix-core/test/FieldKernel/FieldKernel.ConvergePlanner.StableRootHash.test.ts` — update only for this requirement's stated responsibility; avoid opportunistic cleanup.

### Focused Tests
- `packages/logix-core/test/FieldKernel/FieldKernel.ConvergePlanner.DecisionExecutionSinglePath.test.ts`
- `packages/logix-core/test/FieldKernel/FieldKernel.ConvergePlanner.StableRootHash.test.ts`
- `packages/logix-core/test/FieldKernel/FieldKernel.ConvergeAuto.ExactEmptyDirtyPlan.test.ts`
- `packages/logix-core/test/FieldKernel/FieldKernel.ConvergeAuto.UnknownWriteCoverage.test.ts`
- `packages/logix-core/test/FieldKernel/FieldKernel.ConvergeAuto.GenerationInvalidation.test.ts`


## Focused Commands

Run the smallest applicable command first, then broaden only after the narrow test passes.

```bash
pnpm -C packages/logix-core test test/FieldKernel/FieldKernel.ConvergePlanner.DecisionExecutionSinglePath.test.ts
pnpm -C packages/logix-core test test/FieldKernel/FieldKernel.ConvergePlanner.StableRootHash.test.ts
pnpm -C packages/logix-core test test/FieldKernel/FieldKernel.ConvergeAuto.ExactEmptyDirtyPlan.test.ts
pnpm -C packages/logix-core test test/FieldKernel/FieldKernel.ConvergeAuto.UnknownWriteCoverage.test.ts
pnpm -C packages/logix-core test test/FieldKernel/FieldKernel.ConvergeAuto.GenerationInvalidation.test.ts
pnpm typecheck
pnpm typecheck:test
```

## Chunk 1: Implementation Tasks
### Task 1: Write legacy override failing test

**Files:**
- Create/Modify: see responsibility map above. Touch only the files required for this task.
- Test: focused tests listed for this requirement.

- [ ] **Step 1: Inspect the current code path**

  Read the target files and identify the smallest symbols/functions needed for this task. Do not edit yet.

- [ ] **Step 2: Write or update the failing guard/contract test**

  Expected before implementation: FAIL for the specific missing guard/behavior described below.

  ```text
  Add a test where dirtyPlan has one root but legacy dirtyPaths point elsewhere; expect dirtyPlan result.
  ```

- [ ] **Step 3: Run the focused failing test**

  Run the narrowest relevant command from the command list. Expected: FAIL for the intended reason only.

- [ ] **Step 4: Implement the minimal change**

  Implement only what makes the test pass. Do not widen public API. Do not add benchmark/perf collection.

- [ ] **Step 5: Run focused tests**

  Run the relevant focused tests. Expected: PASS. If a pre-existing unrelated failure appears, document it in the handoff and do not mask it.

- [ ] **Step 6: Commit**

  ```bash
  git add <changed-files-for-this-task>
  git commit -m "chore(kernel): dirtyplan-converge-single-source task 1"
  ```

### Task 2: Create adapter module

**Files:**
- Create/Modify: see responsibility map above. Touch only the files required for this task.
- Test: focused tests listed for this requirement.

- [ ] **Step 1: Inspect the current code path**

  Read the target files and identify the smallest symbols/functions needed for this task. Do not edit yet.

- [ ] **Step 2: Write or update the failing guard/contract test**

  Expected before implementation: FAIL for the specific missing guard/behavior described below.

  ```text
  Move `dirtyRootIdsFromLegacyDirtyPaths` usage into `converge-legacy-dirty-adapter.ts`.
  ```

- [ ] **Step 3: Run the focused failing test**

  Run the narrowest relevant command from the command list. Expected: FAIL for the intended reason only.

- [ ] **Step 4: Implement the minimal change**

  Implement only what makes the test pass. Do not widen public API. Do not add benchmark/perf collection.

- [ ] **Step 5: Run focused tests**

  Run the relevant focused tests. Expected: PASS. If a pre-existing unrelated failure appears, document it in the handoff and do not mask it.

- [ ] **Step 6: Commit**

  ```bash
  git add <changed-files-for-this-task>
  git commit -m "chore(kernel): dirtyplan-converge-single-source task 2"
  ```

### Task 3: Narrow request type

**Files:**
- Create/Modify: see responsibility map above. Touch only the files required for this task.
- Test: focused tests listed for this requirement.

- [ ] **Step 1: Inspect the current code path**

  Read the target files and identify the smallest symbols/functions needed for this task. Do not edit yet.

- [ ] **Step 2: Write or update the failing guard/contract test**

  Expected before implementation: FAIL for the specific missing guard/behavior described below.

  ```text
  Remove legacy fields from `ConvergePlanRequest`; keep request extension only in adapter type.
  ```

- [ ] **Step 3: Run the focused failing test**

  Run the narrowest relevant command from the command list. Expected: FAIL for the intended reason only.

- [ ] **Step 4: Implement the minimal change**

  Implement only what makes the test pass. Do not widen public API. Do not add benchmark/perf collection.

- [ ] **Step 5: Run focused tests**

  Run the relevant focused tests. Expected: PASS. If a pre-existing unrelated failure appears, document it in the handoff and do not mask it.

- [ ] **Step 6: Commit**

  ```bash
  git add <changed-files-for-this-task>
  git commit -m "chore(kernel): dirtyplan-converge-single-source task 3"
  ```

### Task 4: Update production callers

**Files:**
- Create/Modify: see responsibility map above. Touch only the files required for this task.
- Test: focused tests listed for this requirement.

- [ ] **Step 1: Inspect the current code path**

  Read the target files and identify the smallest symbols/functions needed for this task. Do not edit yet.

- [ ] **Step 2: Write or update the failing guard/contract test**

  Expected before implementation: FAIL for the specific missing guard/behavior described below.

  ```text
  Update `converge-in-transaction.impl.ts` to call `planConverge` with dirtyPlan-only input.
  ```

- [ ] **Step 3: Run the focused failing test**

  Run the narrowest relevant command from the command list. Expected: FAIL for the intended reason only.

- [ ] **Step 4: Implement the minimal change**

  Implement only what makes the test pass. Do not widen public API. Do not add benchmark/perf collection.

- [ ] **Step 5: Run focused tests**

  Run the relevant focused tests. Expected: PASS. If a pre-existing unrelated failure appears, document it in the handoff and do not mask it.

- [ ] **Step 6: Commit**

  ```bash
  git add <changed-files-for-this-task>
  git commit -m "chore(kernel): dirtyplan-converge-single-source task 4"
  ```

### Task 5: Update tests

**Files:**
- Create/Modify: see responsibility map above. Touch only the files required for this task.
- Test: focused tests listed for this requirement.

- [ ] **Step 1: Inspect the current code path**

  Read the target files and identify the smallest symbols/functions needed for this task. Do not edit yet.

- [ ] **Step 2: Write or update the failing guard/contract test**

  Expected before implementation: FAIL for the specific missing guard/behavior described below.

  ```text
  Where tests intentionally exercise legacy conversion, route through the adapter.
  ```

- [ ] **Step 3: Run the focused failing test**

  Run the narrowest relevant command from the command list. Expected: FAIL for the intended reason only.

- [ ] **Step 4: Implement the minimal change**

  Implement only what makes the test pass. Do not widen public API. Do not add benchmark/perf collection.

- [ ] **Step 5: Run focused tests**

  Run the relevant focused tests. Expected: PASS. If a pre-existing unrelated failure appears, document it in the handoff and do not mask it.

- [ ] **Step 6: Commit**

  ```bash
  git add <changed-files-for-this-task>
  git commit -m "chore(kernel): dirtyplan-converge-single-source task 5"
  ```

### Task 6: Run focused tests

**Files:**
- Create/Modify: see responsibility map above. Touch only the files required for this task.
- Test: focused tests listed for this requirement.

- [ ] **Step 1: Inspect the current code path**

  Read the target files and identify the smallest symbols/functions needed for this task. Do not edit yet.

- [ ] **Step 2: Write or update the failing guard/contract test**

  Expected before implementation: FAIL for the specific missing guard/behavior described below.

  ```text
  Run converge planner and converge auto suites listed above.
  ```

- [ ] **Step 3: Run the focused failing test**

  Run the narrowest relevant command from the command list. Expected: FAIL for the intended reason only.

- [ ] **Step 4: Implement the minimal change**

  Implement only what makes the test pass. Do not widen public API. Do not add benchmark/perf collection.

- [ ] **Step 5: Run focused tests**

  Run the relevant focused tests. Expected: PASS. If a pre-existing unrelated failure appears, document it in the handoff and do not mask it.

- [ ] **Step 6: Commit**

  ```bash
  git add <changed-files-for-this-task>
  git commit -m "chore(kernel): dirtyplan-converge-single-source task 6"
  ```
## Final Verification

- [ ] Run all focused tests listed in this plan.
- [ ] Run `pnpm typecheck` and `pnpm typecheck:test` if the local dependency state supports it.
- [ ] Run public surface guards if this touched any root barrel, docs, examples, or React/Form host files.
- [ ] Update this spec's `handoff.md` with exact commands and outcomes.
- [ ] Do not mark this requirement complete with unresolved type errors unless the blocker is explicitly outside the requirement and documented.

## Review Checklist

- [ ] No public API expansion.
- [ ] No benchmark/perf collection added.
- [ ] Diagnostics-off path does not allocate new trace payloads.
- [ ] Tests fail before implementation and pass after implementation.
- [ ] Commit history is task-sized.
