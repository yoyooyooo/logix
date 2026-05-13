# Commit Publish Empty Fast Path Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make empty subscriber/topic/hook commit publish path a structural no-op.

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

- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.commitPublish.EmptyFastPath.test.ts`

### Modify

- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`
- `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
- `packages/logix-core/src/internal/runtime/core/StateTransaction.snapshot.ts`
- `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`
- `packages/logix-react/test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx`
- `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts`

### Focused Tests

- `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.commitPublish.EmptyFastPath.test.ts`
- `pnpm -C packages/logix-core test test/Runtime/ModuleRuntime/SelectorGraph.topicRetain.contract.test.ts`
- `pnpm -C packages/logix-core test test/internal/Runtime/RuntimeStore.listenerSnapshot.test.ts`
- `pnpm -C packages/logix-react test test/Hooks/useSelector.RuntimeStoreSnapshot.contract.test.tsx`
- `pnpm -C packages/logix-react test test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx`

## Implementation Notes

- Start with tests or checklist/preflight material.
- Keep code edits within the listed files unless inspection proves a narrower adjacent file is the true owner.
- If another file is required, record the reason in `handoff.md` before editing it.
- Do not turn measurements into production payload allocation.

## Chunk 1: Implementation Tasks


### Task 1: Write empty publish guard

**Task ID:** T001

**Files:**
- Create: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.commitPublish.EmptyFastPath.test.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.snapshot.ts`
- Modify: `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`
- Modify: `packages/logix-react/test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.commitPublish.EmptyFastPath.test.ts`
- Test: `pnpm -C packages/logix-core test test/Runtime/ModuleRuntime/SelectorGraph.topicRetain.contract.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/RuntimeStore.listenerSnapshot.test.ts`
- Test: `pnpm -C packages/logix-react test test/Hooks/useSelector.RuntimeStoreSnapshot.contract.test.tsx`
- Test: `pnpm -C packages/logix-react test test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Add a test that empty publish path does not iterate or clone subscriber/hook structures.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.commitPublish.EmptyFastPath.test.ts
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Write empty publish guard`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T001>
  git commit -m "chore(runtime): commit-publish-empty-fastpath t001"
  ```


### Task 2: Write active subscriber guard

**Task ID:** T002

**Files:**
- Create: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.commitPublish.EmptyFastPath.test.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.snapshot.ts`
- Modify: `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`
- Modify: `packages/logix-react/test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.commitPublish.EmptyFastPath.test.ts`
- Test: `pnpm -C packages/logix-core test test/Runtime/ModuleRuntime/SelectorGraph.topicRetain.contract.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/RuntimeStore.listenerSnapshot.test.ts`
- Test: `pnpm -C packages/logix-react test test/Hooks/useSelector.RuntimeStoreSnapshot.contract.test.tsx`
- Test: `pnpm -C packages/logix-react test test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Add a test that active selectors/topics still receive exactly one coherent commit notification.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.commitPublish.EmptyFastPath.test.ts
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Write active subscriber guard`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T002>
  git commit -m "chore(runtime): commit-publish-empty-fastpath t002"
  ```


### Task 3: Implement empty publish predicate

**Task ID:** T003

**Files:**
- Create: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.commitPublish.EmptyFastPath.test.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.snapshot.ts`
- Modify: `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`
- Modify: `packages/logix-react/test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.commitPublish.EmptyFastPath.test.ts`
- Test: `pnpm -C packages/logix-core test test/Runtime/ModuleRuntime/SelectorGraph.topicRetain.contract.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/RuntimeStore.listenerSnapshot.test.ts`
- Test: `pnpm -C packages/logix-react test test/Hooks/useSelector.RuntimeStoreSnapshot.contract.test.tsx`
- Test: `pnpm -C packages/logix-react test test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Compute and use a small internal predicate for no subscribers/no topics/no hooks/no rowId sync.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.commitPublish.EmptyFastPath.test.ts
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Implement empty publish predicate`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T003>
  git commit -m "chore(runtime): commit-publish-empty-fastpath t003"
  ```


### Task 4: Preserve hook ordering

**Task ID:** T004

**Files:**
- Create: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.commitPublish.EmptyFastPath.test.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.snapshot.ts`
- Modify: `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`
- Modify: `packages/logix-react/test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.commitPublish.EmptyFastPath.test.ts`
- Test: `pnpm -C packages/logix-core test test/Runtime/ModuleRuntime/SelectorGraph.topicRetain.contract.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/RuntimeStore.listenerSnapshot.test.ts`
- Test: `pnpm -C packages/logix-react test test/Hooks/useSelector.RuntimeStoreSnapshot.contract.test.tsx`
- Test: `pnpm -C packages/logix-react test test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Ensure onCommit before/after hooks still run in documented order when present.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.commitPublish.EmptyFastPath.test.ts
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Preserve hook ordering`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T004>
  git commit -m "chore(runtime): commit-publish-empty-fastpath t004"
  ```


### Task 5: Run no-tearing and selector suites

**Task ID:** T005

**Files:**
- Create: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.commitPublish.EmptyFastPath.test.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.snapshot.ts`
- Modify: `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`
- Modify: `packages/logix-react/test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.commitPublish.EmptyFastPath.test.ts`
- Test: `pnpm -C packages/logix-core test test/Runtime/ModuleRuntime/SelectorGraph.topicRetain.contract.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/RuntimeStore.listenerSnapshot.test.ts`
- Test: `pnpm -C packages/logix-react test test/Hooks/useSelector.RuntimeStoreSnapshot.contract.test.tsx`
- Test: `pnpm -C packages/logix-react test test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Run RuntimeStore/useSelector/no-tearing tests; record any tail cost migration.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.commitPublish.EmptyFastPath.test.ts
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Run no-tearing and selector suites`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T005>
  git commit -m "chore(runtime): commit-publish-empty-fastpath t005"
  ```


## Completion Gate

- [ ] Commit with no subscribers, no topics, no hooks, and no rowId sync requirement does not iterate empty collections or clone hook arrays.
- [ ] Existing selector/no-tearing/topic retain-release tests pass unchanged.
- [ ] The fast path does not suppress commit state update when state actually changed.
- [ ] The dispatch-shell evidence can report commitPublishCommitMs and hook timings without off-path allocation.

## Final Verification

Run the focused command set for this spec. If this spec changes shared runtime internals, also run:

```bash
pnpm typecheck
pnpm typecheck:test
```

Update `handoff.md` with pass/fail evidence and the next recommended spec.
