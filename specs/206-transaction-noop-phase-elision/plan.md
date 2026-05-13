# Transaction No-Op Phase Elision Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Skip field/source/validate/selector phases when a module has no assets or no subscribers requiring those phases.

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

- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.NoopPhaseElision.test.ts`

### Modify

- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.fieldConvergeConfig.ts`
- `packages/logix-core/src/internal/runtime/core/StateTransaction.snapshot.ts`
- `packages/logix-core/src/internal/field-kernel/source.impl.ts`
- `packages/logix-core/src/internal/field-kernel/validate.impl.ts`
- `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
- `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts`

### Focused Tests

- `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.NoopPhaseElision.test.ts`
- `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.ListConfigsGuard.Perf.off.test.ts`
- `pnpm -C packages/logix-core test test/internal/FieldKernel/FieldKernel.Source.SyncIdle.DirtyGate.test.ts`
- `pnpm -C packages/logix-core test test/internal/FieldKernel/FieldKernel.Validate.StaticIr.test.ts`
- `pnpm -C packages/logix-core test test/Runtime/Runtime.selectorDirtyOverlap.contract.test.ts`

## Implementation Notes

- Start with tests or checklist/preflight material.
- Keep code edits within the listed files unless inspection proves a narrower adjacent file is the true owner.
- If another file is required, record the reason in `handoff.md` before editing it.
- Do not turn measurements into production payload allocation.

## Chunk 1: Implementation Tasks


### Task 1: Write no-assets failing guard

**Task ID:** T001

**Files:**
- Create: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.NoopPhaseElision.test.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.fieldConvergeConfig.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.snapshot.ts`
- Modify: `packages/logix-core/src/internal/field-kernel/source.impl.ts`
- Modify: `packages/logix-core/src/internal/field-kernel/validate.impl.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.NoopPhaseElision.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.ListConfigsGuard.Perf.off.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/FieldKernel/FieldKernel.Source.SyncIdle.DirtyGate.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/FieldKernel/FieldKernel.Validate.StaticIr.test.ts`
- Test: `pnpm -C packages/logix-core test test/Runtime/Runtime.selectorDirtyOverlap.contract.test.ts`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Add a dispatch shell/core test proving no-field modules do not execute field/source/validate phases.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.NoopPhaseElision.test.ts
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Write no-assets failing guard`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T001>
  git commit -m "chore(runtime): transaction-noop-phase-elision t001"
  ```


### Task 2: Write asset-presence guard

**Task ID:** T002

**Files:**
- Create: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.NoopPhaseElision.test.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.fieldConvergeConfig.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.snapshot.ts`
- Modify: `packages/logix-core/src/internal/field-kernel/source.impl.ts`
- Modify: `packages/logix-core/src/internal/field-kernel/validate.impl.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.NoopPhaseElision.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.ListConfigsGuard.Perf.off.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/FieldKernel/FieldKernel.Source.SyncIdle.DirtyGate.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/FieldKernel/FieldKernel.Validate.StaticIr.test.ts`
- Test: `pnpm -C packages/logix-core test test/Runtime/Runtime.selectorDirtyOverlap.contract.test.ts`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Add tests proving a module with source/validate/converge assets still executes needed phases.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.NoopPhaseElision.test.ts
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Write asset-presence guard`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T002>
  git commit -m "chore(runtime): transaction-noop-phase-elision t002"
  ```


### Task 3: Add runtime fast-path flags

**Task ID:** T003

**Files:**
- Create: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.NoopPhaseElision.test.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.fieldConvergeConfig.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.snapshot.ts`
- Modify: `packages/logix-core/src/internal/field-kernel/source.impl.ts`
- Modify: `packages/logix-core/src/internal/field-kernel/validate.impl.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.NoopPhaseElision.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.ListConfigsGuard.Perf.off.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/FieldKernel/FieldKernel.Source.SyncIdle.DirtyGate.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/FieldKernel/FieldKernel.Validate.StaticIr.test.ts`
- Test: `pnpm -C packages/logix-core test test/Runtime/Runtime.selectorDirtyOverlap.contract.test.ts`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Compute instance-scoped flags at module/runtime construction instead of repeated deep lookups inside each transaction.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.NoopPhaseElision.test.ts
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Add runtime fast-path flags`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T003>
  git commit -m "chore(runtime): transaction-noop-phase-elision t003"
  ```


### Task 4: Elide no-op phases

**Task ID:** T004

**Files:**
- Create: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.NoopPhaseElision.test.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.fieldConvergeConfig.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.snapshot.ts`
- Modify: `packages/logix-core/src/internal/field-kernel/source.impl.ts`
- Modify: `packages/logix-core/src/internal/field-kernel/validate.impl.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.NoopPhaseElision.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.ListConfigsGuard.Perf.off.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/FieldKernel/FieldKernel.Source.SyncIdle.DirtyGate.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/FieldKernel/FieldKernel.Validate.StaticIr.test.ts`
- Test: `pnpm -C packages/logix-core test test/Runtime/Runtime.selectorDirtyOverlap.contract.test.ts`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Use fast-path flags in ModuleRuntime.transaction; do not remove fallback diagnostics for asset-present cases.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.NoopPhaseElision.test.ts
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Elide no-op phases`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T004>
  git commit -m "chore(runtime): transaction-noop-phase-elision t004"
  ```


### Task 5: Update phase evidence

**Task ID:** T005

**Files:**
- Create: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.NoopPhaseElision.test.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.fieldConvergeConfig.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.snapshot.ts`
- Modify: `packages/logix-core/src/internal/field-kernel/source.impl.ts`
- Modify: `packages/logix-core/src/internal/field-kernel/validate.impl.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.NoopPhaseElision.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.ListConfigsGuard.Perf.off.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/FieldKernel/FieldKernel.Source.SyncIdle.DirtyGate.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/FieldKernel/FieldKernel.Validate.StaticIr.test.ts`
- Test: `pnpm -C packages/logix-core test test/Runtime/Runtime.selectorDirtyOverlap.contract.test.ts`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Make dispatch-shell runtime report skipped phase status or zero timings unambiguously.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.NoopPhaseElision.test.ts
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Update phase evidence`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T005>
  git commit -m "chore(runtime): transaction-noop-phase-elision t005"
  ```


## Completion Gate

- [ ] No-field modules skip fieldConverge, scopedValidate, and sourceSync phases while preserving commit semantics.
- [ ] Modules with field/source/validate assets still execute the correct phase with existing fallback reason visibility.
- [ ] No selector subscribers means no selector overlap walk or topic publish iteration.
- [ ] The perf harness phase breakdown can distinguish skipped phase from executed zero-duration phase.

## Final Verification

Run the focused command set for this spec. If this spec changes shared runtime internals, also run:

```bash
pnpm typecheck
pnpm typecheck:test
```

Update `handoff.md` with pass/fail evidence and the next recommended spec.
