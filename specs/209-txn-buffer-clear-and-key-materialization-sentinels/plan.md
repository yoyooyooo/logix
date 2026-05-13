# Txn Buffer Clear and Key Materialization Sentinels Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Catch second-order costs caused by buffer reuse, collection clearing, and cache-key materialization.

**Architecture:** This spec isolates one part of the runtime transaction fixed-cost wave. The implementation must keep public API stable, preserve transaction semantics, and make phase/tax movement observable rather than hidden. It uses focused tests and sentinel-style evidence before any hard performance claim.

**Tech Stack:** TypeScript 5.x, Effect, Vitest, pnpm monorepo, Logix core/react perf-boundary harness.

---

## Global Guardrails

- Do not add public root exports, public submodules, or public authoring nouns.
- Do not bypass transaction queue semantics. Fast paths must be branch-shape optimizations, not semantic shortcuts.
- Do not move correctness ownership to React, Playground, Devtools, CLI, or examples.
- Do not claim performance success from `quick`, dirty, unstable, or non-comparable evidence.
- Do not introduce public runtime config for test-only A/B switches.
- Do not add diagnostics/debug payload construction on `diagnostics=off`.
- Do not put IO, `await`, timers, or write escape hatches inside the transaction window.
- Do not use destructive git operations: `git reset`, `git clean`, `git checkout -- <path>`, `git restore`, `git stash`.
- Keep each member spec as a small PR. Commit after each focused task group passes.
- If a focused test reveals a pre-existing unrelated failure, record it in `handoff.md`; do not hide it with broad changes.

## File Structure / Responsibility Map

### Create

- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnSecondOrderCosts.Sentinels.test.ts`

### Modify

- `packages/logix-core/src/internal/runtime/core/StateTransaction.dirty.ts`
- `packages/logix-core/src/internal/runtime/core/StateTransaction.snapshot.ts`
- `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- `packages/logix-core/src/internal/field-kernel/plan-cache.ts`
- `packages/logix-core/src/internal/field-kernel/converge-planner.ts`
- `packages/logix-core/src/internal/field-kernel/field-path.ts`
- `packages/logix-core/test/internal/Runtime/StateTransaction.DirtyPlanSnapshot.test.ts`
- `packages/logix-core/test/FieldKernel/FieldKernel.ConvergePlanner.StableRootHash.test.ts`

### Focused Tests

- `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnSecondOrderCosts.Sentinels.test.ts`
- `pnpm -C packages/logix-core test test/internal/Runtime/StateTransaction.DirtyPlanSnapshot.test.ts`
- `pnpm -C packages/logix-core test test/FieldKernel/FieldKernel.ConvergePlanner.StableRootHash.test.ts`
- `pnpm -C packages/logix-core test test/FieldPath/FieldPath.toKey.test.ts`

## Implementation Notes

- Start with tests or checklist/preflight material.
- Keep code edits within the listed files unless inspection proves a narrower adjacent file is the true owner.
- If another file is required, record the reason in `handoff.md` before editing it.
- Do not turn measurements into production payload allocation.

## Chunk 1: Implementation Tasks


### Task 1: Write large-then-small sentinel

**Task ID:** T001

**Files:**
- Create: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnSecondOrderCosts.Sentinels.test.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.dirty.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.snapshot.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- Modify: `packages/logix-core/src/internal/field-kernel/plan-cache.ts`
- Modify: `packages/logix-core/src/internal/field-kernel/converge-planner.ts`
- Modify: `packages/logix-core/src/internal/field-kernel/field-path.ts`
- Modify: `packages/logix-core/test/internal/Runtime/StateTransaction.DirtyPlanSnapshot.test.ts`
- Modify: `packages/logix-core/test/FieldKernel/FieldKernel.ConvergePlanner.StableRootHash.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnSecondOrderCosts.Sentinels.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/StateTransaction.DirtyPlanSnapshot.test.ts`
- Test: `pnpm -C packages/logix-core test test/FieldKernel/FieldKernel.ConvergePlanner.StableRootHash.test.ts`
- Test: `pnpm -C packages/logix-core test test/FieldPath/FieldPath.toKey.test.ts`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Add a test that simulates large dirty burst followed by repeated one-field txns and records clear/key counters.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnSecondOrderCosts.Sentinels.test.ts
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Write large-then-small sentinel`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T001>
  git commit -m "chore(runtime): txn-buffer-clear-and-key-materialization-sentinels t001"
  ```


### Task 2: Write dirtyPlan cache identity guard

**Task ID:** T002

**Files:**
- Create: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnSecondOrderCosts.Sentinels.test.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.dirty.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.snapshot.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- Modify: `packages/logix-core/src/internal/field-kernel/plan-cache.ts`
- Modify: `packages/logix-core/src/internal/field-kernel/converge-planner.ts`
- Modify: `packages/logix-core/src/internal/field-kernel/field-path.ts`
- Modify: `packages/logix-core/test/internal/Runtime/StateTransaction.DirtyPlanSnapshot.test.ts`
- Modify: `packages/logix-core/test/FieldKernel/FieldKernel.ConvergePlanner.StableRootHash.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnSecondOrderCosts.Sentinels.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/StateTransaction.DirtyPlanSnapshot.test.ts`
- Test: `pnpm -C packages/logix-core test test/FieldKernel/FieldKernel.ConvergePlanner.StableRootHash.test.ts`
- Test: `pnpm -C packages/logix-core test test/FieldPath/FieldPath.toKey.test.ts`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Assert same-phase repeated materializeDirtyPlanSnapshot returns cached identity/equivalent counters.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnSecondOrderCosts.Sentinels.test.ts
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Write dirtyPlan cache identity guard`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T002>
  git commit -m "chore(runtime): txn-buffer-clear-and-key-materialization-sentinels t002"
  ```


### Task 3: Wire key materialization counters

**Task ID:** T003

**Files:**
- Create: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnSecondOrderCosts.Sentinels.test.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.dirty.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.snapshot.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- Modify: `packages/logix-core/src/internal/field-kernel/plan-cache.ts`
- Modify: `packages/logix-core/src/internal/field-kernel/converge-planner.ts`
- Modify: `packages/logix-core/src/internal/field-kernel/field-path.ts`
- Modify: `packages/logix-core/test/internal/Runtime/StateTransaction.DirtyPlanSnapshot.test.ts`
- Modify: `packages/logix-core/test/FieldKernel/FieldKernel.ConvergePlanner.StableRootHash.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnSecondOrderCosts.Sentinels.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/StateTransaction.DirtyPlanSnapshot.test.ts`
- Test: `pnpm -C packages/logix-core test test/FieldKernel/FieldKernel.ConvergePlanner.StableRootHash.test.ts`
- Test: `pnpm -C packages/logix-core test test/FieldPath/FieldPath.toKey.test.ts`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Instrument transaction-window Array.from/join/split/key materialization points with internal counters.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnSecondOrderCosts.Sentinels.test.ts
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Wire key materialization counters`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T003>
  git commit -m "chore(runtime): txn-buffer-clear-and-key-materialization-sentinels t003"
  ```


### Task 4: Do not over-optimize prematurely

**Task ID:** T004

**Files:**
- Create: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnSecondOrderCosts.Sentinels.test.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.dirty.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.snapshot.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- Modify: `packages/logix-core/src/internal/field-kernel/plan-cache.ts`
- Modify: `packages/logix-core/src/internal/field-kernel/converge-planner.ts`
- Modify: `packages/logix-core/src/internal/field-kernel/field-path.ts`
- Modify: `packages/logix-core/test/internal/Runtime/StateTransaction.DirtyPlanSnapshot.test.ts`
- Modify: `packages/logix-core/test/FieldKernel/FieldKernel.ConvergePlanner.StableRootHash.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnSecondOrderCosts.Sentinels.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/StateTransaction.DirtyPlanSnapshot.test.ts`
- Test: `pnpm -C packages/logix-core test test/FieldKernel/FieldKernel.ConvergePlanner.StableRootHash.test.ts`
- Test: `pnpm -C packages/logix-core test test/FieldPath/FieldPath.toKey.test.ts`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Only add generation stamping/touched-word clear if sentinel shows clear tax; otherwise leave implementation unchanged and document.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnSecondOrderCosts.Sentinels.test.ts
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Do not over-optimize prematurely`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T004>
  git commit -m "chore(runtime): txn-buffer-clear-and-key-materialization-sentinels t004"
  ```


### Task 5: Run dirtyPlan/converge tests

**Task ID:** T005

**Files:**
- Create: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnSecondOrderCosts.Sentinels.test.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.dirty.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.snapshot.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- Modify: `packages/logix-core/src/internal/field-kernel/plan-cache.ts`
- Modify: `packages/logix-core/src/internal/field-kernel/converge-planner.ts`
- Modify: `packages/logix-core/src/internal/field-kernel/field-path.ts`
- Modify: `packages/logix-core/test/internal/Runtime/StateTransaction.DirtyPlanSnapshot.test.ts`
- Modify: `packages/logix-core/test/FieldKernel/FieldKernel.ConvergePlanner.StableRootHash.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnSecondOrderCosts.Sentinels.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/StateTransaction.DirtyPlanSnapshot.test.ts`
- Test: `pnpm -C packages/logix-core test test/FieldKernel/FieldKernel.ConvergePlanner.StableRootHash.test.ts`
- Test: `pnpm -C packages/logix-core test test/FieldPath/FieldPath.toKey.test.ts`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Run focused tests and document whether this spec only added sentinels or also changed buffers.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnSecondOrderCosts.Sentinels.test.ts
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Run dirtyPlan/converge tests`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T005>
  git commit -m "chore(runtime): txn-buffer-clear-and-key-materialization-sentinels t005"
  ```


## Completion Gate

- [ ] Repeated small transactions after one large transaction do not pay full previous-capacity clear cost without visibility.
- [ ] DirtyPlanSnapshot repeated reads within the same phase hit cache and do not recreate root/list arrays.
- [ ] String join/split or Array.from in the transaction window is either absent or counted as a failing sentinel in covered paths.
- [ ] If generation stamping or touched-word clear is introduced, it is justified by the sentinel and covered by behavior tests.

## Final Verification

Run the focused command set for this spec. If this spec changes shared runtime internals, also run:

```bash
pnpm typecheck
pnpm typecheck:test
```

Update `handoff.md` with pass/fail evidence and the next recommended spec.
