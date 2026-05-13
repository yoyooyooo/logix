# Txn Queue and Lane Empty Fast Path Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make no-backlog/default-lane transaction enqueue pay only the minimal queue and lane policy cost.

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

- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.EmptyFastPath.test.ts`

### Modify

- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnQueue.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnLanePolicy.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts`
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts`
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.Overrides.test.ts`

### Focused Tests

- `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.EmptyFastPath.test.ts`
- `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts`
- `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts`
- `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.Overrides.test.ts`

## Implementation Notes

- Start with tests or checklist/preflight material.
- Keep code edits within the listed files unless inspection proves a narrower adjacent file is the true owner.
- If another file is required, record the reason in `handoff.md` before editing it.
- Do not turn measurements into production payload allocation.

## Chunk 1: Implementation Tasks


### Task 1: Write direct-idle semantic guard

**Task ID:** T001

**Files:**
- Create: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.EmptyFastPath.test.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnQueue.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnLanePolicy.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- Modify: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts`
- Modify: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts`
- Modify: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.Overrides.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.EmptyFastPath.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.Overrides.test.ts`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Add a test that no-backlog urgent/default transactions preserve enqueue order and queue timing shape.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.EmptyFastPath.test.ts
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Write direct-idle semantic guard`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T001>
  git commit -m "chore(runtime): txn-queue-lane-empty-fastpath t001"
  ```


### Task 2: Write backlog escape guard

**Task ID:** T002

**Files:**
- Create: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.EmptyFastPath.test.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnQueue.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnLanePolicy.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- Modify: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts`
- Modify: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts`
- Modify: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.Overrides.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.EmptyFastPath.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.Overrides.test.ts`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Add a test proving nonUrgent/backlog/visibility-window cases do not take the empty fast path.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.EmptyFastPath.test.ts
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Write backlog escape guard`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T002>
  git commit -m "chore(runtime): txn-queue-lane-empty-fastpath t002"
  ```


### Task 3: Move invariant policy work out of hot branch

**Task ID:** T003

**Files:**
- Create: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.EmptyFastPath.test.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnQueue.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnLanePolicy.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- Modify: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts`
- Modify: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts`
- Modify: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.Overrides.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.EmptyFastPath.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.Overrides.test.ts`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Precompute or memoize default lane policy where possible without changing overrides.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.EmptyFastPath.test.ts
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Move invariant policy work out of hot branch`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T003>
  git commit -m "chore(runtime): txn-queue-lane-empty-fastpath t003"
  ```


### Task 4: Thin direct-idle branch

**Task ID:** T004

**Files:**
- Create: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.EmptyFastPath.test.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnQueue.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnLanePolicy.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- Modify: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts`
- Modify: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts`
- Modify: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.Overrides.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.EmptyFastPath.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.Overrides.test.ts`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Implement the minimal no-backlog branch inside txnQueue while retaining queue-owned handoff.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.EmptyFastPath.test.ts
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Thin direct-idle branch`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T004>
  git commit -m "chore(runtime): txn-queue-lane-empty-fastpath t004"
  ```


### Task 5: Run focused lane suite

**Task ID:** T005

**Files:**
- Create: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.EmptyFastPath.test.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnQueue.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnLanePolicy.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- Modify: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts`
- Modify: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts`
- Modify: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.Overrides.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.EmptyFastPath.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.Overrides.test.ts`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Run lane and queue tests; record any tax migration to commit publish/body shell.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.EmptyFastPath.test.ts
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Run focused lane suite`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T005>
  git commit -m "chore(runtime): txn-queue-lane-empty-fastpath t005"
  ```


## Completion Gate

- [ ] A direct-idle no-backlog dispatch still enters the queue boundary and emits equivalent transaction order semantics.
- [ ] The fast path records or exposes zero/near-zero backpressure and wait timing without fabricating trace payloads when diagnostics are off.
- [ ] Backlog, nonUrgent lane, visibility window, and override cases continue to use the full path.
- [ ] No scheduling starvation or priority inversion is introduced.

## Final Verification

Run the focused command set for this spec. If this spec changes shared runtime internals, also run:

```bash
pnpm typecheck
pnpm typecheck:test
```

Update `handoff.md` with pass/fail evidence and the next recommended spec.
