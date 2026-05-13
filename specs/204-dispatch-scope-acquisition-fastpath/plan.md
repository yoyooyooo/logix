# Dispatch Scope Acquisition Fast Path Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce `resolveEach` acquisition overhead without changing module/runtime acquisition semantics.

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

- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchScopeAcquisition.FastPath.test.ts`

### Modify

- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.registry.ts`
- `packages/logix-core/src/internal/runtime/core/RuntimeKernel.selection.ts`
- `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts`
- `packages/logix-react/test/browser/perf-boundaries/dispatch-shell-fixed-cost.test.tsx`

### Focused Tests

- `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchScopeAcquisition.FastPath.test.ts`
- `pnpm -C packages/logix-core test test/internal/Runtime/HierarchicalInjector/hierarchicalInjector.strict-isolation.test.ts`
- `pnpm -C packages/logix-core test test/Runtime/Runtime.openProgram.multiRoot.isolated.test.ts`
- `pnpm -C packages/logix-react test test/Hooks/useImportedModule.hierarchical.test.tsx`

## Implementation Notes

- Start with tests or checklist/preflight material.
- Keep code edits within the listed files unless inspection proves a narrower adjacent file is the true owner.
- If another file is required, record the reason in `handoff.md` before editing it.
- Do not turn measurements into production payload allocation.

## Chunk 1: Implementation Tasks


### Task 1: Write acquisition reuse guard

**Task ID:** T001

**Files:**
- Create: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchScopeAcquisition.FastPath.test.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.registry.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/RuntimeKernel.selection.ts`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell-fixed-cost.test.tsx`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchScopeAcquisition.FastPath.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/HierarchicalInjector/hierarchicalInjector.strict-isolation.test.ts`
- Test: `pnpm -C packages/logix-core test test/Runtime/Runtime.openProgram.multiRoot.isolated.test.ts`
- Test: `pnpm -C packages/logix-react test test/Hooks/useImportedModule.hierarchical.test.tsx`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Add a test proving repeated dispatch against the same acquired runtime does not reconstruct the acquisition carrier.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchScopeAcquisition.FastPath.test.ts
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Write acquisition reuse guard`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T001>
  git commit -m "chore(runtime): dispatch-scope-acquisition-fastpath t001"
  ```


### Task 2: Write isolation guard

**Task ID:** T002

**Files:**
- Create: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchScopeAcquisition.FastPath.test.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.registry.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/RuntimeKernel.selection.ts`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell-fixed-cost.test.tsx`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchScopeAcquisition.FastPath.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/HierarchicalInjector/hierarchicalInjector.strict-isolation.test.ts`
- Test: `pnpm -C packages/logix-core test test/Runtime/Runtime.openProgram.multiRoot.isolated.test.ts`
- Test: `pnpm -C packages/logix-react test test/Hooks/useImportedModule.hierarchical.test.tsx`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Add or update a hierarchical/imported-module test proving cached acquisition cannot cross provider/runtime boundaries.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchScopeAcquisition.FastPath.test.ts
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Write isolation guard`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T002>
  git commit -m "chore(runtime): dispatch-scope-acquisition-fastpath t002"
  ```


### Task 3: Introduce internal acquisition cache

**Task ID:** T003

**Files:**
- Create: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchScopeAcquisition.FastPath.test.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.registry.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/RuntimeKernel.selection.ts`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell-fixed-cost.test.tsx`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchScopeAcquisition.FastPath.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/HierarchicalInjector/hierarchicalInjector.strict-isolation.test.ts`
- Test: `pnpm -C packages/logix-core test test/Runtime/Runtime.openProgram.multiRoot.isolated.test.ts`
- Test: `pnpm -C packages/logix-react test test/Hooks/useImportedModule.hierarchical.test.tsx`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Add the smallest internal cache or bound executor reuse point in ModuleRuntime.dispatch/registry; keep it instance-scoped.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchScopeAcquisition.FastPath.test.ts
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Introduce internal acquisition cache`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T003>
  git commit -m "chore(runtime): dispatch-scope-acquisition-fastpath t003"
  ```


### Task 4: Expose harness breakdown

**Task ID:** T004

**Files:**
- Create: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchScopeAcquisition.FastPath.test.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.registry.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/RuntimeKernel.selection.ts`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell-fixed-cost.test.tsx`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchScopeAcquisition.FastPath.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/HierarchicalInjector/hierarchicalInjector.strict-isolation.test.ts`
- Test: `pnpm -C packages/logix-core test test/Runtime/Runtime.openProgram.multiRoot.isolated.test.ts`
- Test: `pnpm -C packages/logix-react test test/Hooks/useImportedModule.hierarchical.test.tsx`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Ensure dispatch-shell.runtime.ts still reports resolveScopeMsPerDispatch for reuseScope and resolveEach.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchScopeAcquisition.FastPath.test.ts
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Expose harness breakdown`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T004>
  git commit -m "chore(runtime): dispatch-scope-acquisition-fastpath t004"
  ```


### Task 5: Run focused tests and record tax movement

**Task ID:** T005

**Files:**
- Create: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchScopeAcquisition.FastPath.test.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.registry.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/RuntimeKernel.selection.ts`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell-fixed-cost.test.tsx`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchScopeAcquisition.FastPath.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/HierarchicalInjector/hierarchicalInjector.strict-isolation.test.ts`
- Test: `pnpm -C packages/logix-core test test/Runtime/Runtime.openProgram.multiRoot.isolated.test.ts`
- Test: `pnpm -C packages/logix-react test test/Hooks/useImportedModule.hierarchical.test.tsx`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Run tests and record whether the suspected next tax point is queue, bodyShell, or commit publish.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchScopeAcquisition.FastPath.test.ts
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Run focused tests and record tax movement`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T005>
  git commit -m "chore(runtime): dispatch-scope-acquisition-fastpath t005"
  ```


## Completion Gate

- [ ] A focused guard proves bound runtime acquisition is reused when the same module runtime is already resolved.
- [ ] A focused guard proves imported module and hierarchical override resolution still isolate correctly.
- [ ] `resolveEach` remains semantically distinct in the perf harness but does not pay avoidable repeated construction cost.
- [ ] No public config or public API is added for acquisition caching.

## Final Verification

Run the focused command set for this spec. If this spec changes shared runtime internals, also run:

```bash
pnpm typecheck
pnpm typecheck:test
```

Update `handoff.md` with pass/fail evidence and the next recommended spec.
