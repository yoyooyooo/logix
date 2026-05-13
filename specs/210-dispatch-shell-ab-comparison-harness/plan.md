# Dispatch Shell Same-Commit A/B Comparison Harness Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide a test-only same-commit A/B harness for transaction shell fast-path changes.

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

- `packages/logix-react/test/browser/perf-boundaries/dispatch-shell-ab-comparison.contract.test.tsx`

### Modify

- `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts`
- `packages/logix-react/test/browser/perf-boundaries/dispatch-shell-fixed-cost.test.tsx`
- `packages/logix-react/test/browser/perf-boundaries/protocol.ts`
- `packages/logix-react/test/perf-boundaries/contract-preflight.test.ts`
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts`

### Focused Tests

- `pnpm -C packages/logix-react test test/browser/perf-boundaries/dispatch-shell-ab-comparison.contract.test.tsx`
- `pnpm -C packages/logix-react test test/perf-boundaries/contract-preflight.test.ts`
- `pnpm -C packages/logix-react test test/perf-boundaries/semantics.test.ts`

## Implementation Notes

- Start with tests or checklist/preflight material.
- Keep code edits within the listed files unless inspection proves a narrower adjacent file is the true owner.
- If another file is required, record the reason in `handoff.md` before editing it.
- Do not turn measurements into production payload allocation.

## Chunk 1: Implementation Tasks


### Task 1: Add test-only shell mode type

**Task ID:** T001

**Files:**
- Create: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell-ab-comparison.contract.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell-fixed-cost.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/protocol.ts`
- Modify: `packages/logix-react/test/perf-boundaries/contract-preflight.test.ts`
- Modify: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts`
- Test: `pnpm -C packages/logix-react test test/browser/perf-boundaries/dispatch-shell-ab-comparison.contract.test.tsx`
- Test: `pnpm -C packages/logix-react test test/perf-boundaries/contract-preflight.test.ts`
- Test: `pnpm -C packages/logix-react test test/perf-boundaries/semantics.test.ts`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Add `shellMode: baseline | fastPath` to dispatch-shell.runtime.ts test helpers only.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  pnpm -C packages/logix-react test test/browser/perf-boundaries/dispatch-shell-ab-comparison.contract.test.tsx
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Add test-only shell mode type`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T001>
  git commit -m "chore(runtime): dispatch-shell-ab-comparison-harness t001"
  ```


### Task 2: Add env adapter

**Task ID:** T002

**Files:**
- Create: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell-ab-comparison.contract.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell-fixed-cost.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/protocol.ts`
- Modify: `packages/logix-react/test/perf-boundaries/contract-preflight.test.ts`
- Modify: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts`
- Test: `pnpm -C packages/logix-react test test/browser/perf-boundaries/dispatch-shell-ab-comparison.contract.test.tsx`
- Test: `pnpm -C packages/logix-react test test/perf-boundaries/contract-preflight.test.ts`
- Test: `pnpm -C packages/logix-react test test/perf-boundaries/semantics.test.ts`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Optionally map LOGIX_TXN_SHELL_FASTPATH=0/1 inside the perf harness, not Runtime public config.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  pnpm -C packages/logix-react test test/browser/perf-boundaries/dispatch-shell-ab-comparison.contract.test.tsx
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Add env adapter`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T002>
  git commit -m "chore(runtime): dispatch-shell-ab-comparison-harness t002"
  ```


### Task 3: Write leakage guard

**Task ID:** T003

**Files:**
- Create: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell-ab-comparison.contract.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell-fixed-cost.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/protocol.ts`
- Modify: `packages/logix-react/test/perf-boundaries/contract-preflight.test.ts`
- Modify: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts`
- Test: `pnpm -C packages/logix-react test test/browser/perf-boundaries/dispatch-shell-ab-comparison.contract.test.tsx`
- Test: `pnpm -C packages/logix-react test test/perf-boundaries/contract-preflight.test.ts`
- Test: `pnpm -C packages/logix-react test test/perf-boundaries/semantics.test.ts`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Add a guard that shellMode is not exported from core/react public packages.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  pnpm -C packages/logix-react test test/browser/perf-boundaries/dispatch-shell-ab-comparison.contract.test.tsx
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Write leakage guard`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T003>
  git commit -m "chore(runtime): dispatch-shell-ab-comparison-harness t003"
  ```


### Task 4: Emit phase deltas

**Task ID:** T004

**Files:**
- Create: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell-ab-comparison.contract.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell-fixed-cost.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/protocol.ts`
- Modify: `packages/logix-react/test/perf-boundaries/contract-preflight.test.ts`
- Modify: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts`
- Test: `pnpm -C packages/logix-react test test/browser/perf-boundaries/dispatch-shell-ab-comparison.contract.test.tsx`
- Test: `pnpm -C packages/logix-react test test/perf-boundaries/contract-preflight.test.ts`
- Test: `pnpm -C packages/logix-react test test/perf-boundaries/semantics.test.ts`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Add report fields that include baseline/fastPath total and phase deltas.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  pnpm -C packages/logix-react test test/browser/perf-boundaries/dispatch-shell-ab-comparison.contract.test.tsx
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Emit phase deltas`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T004>
  git commit -m "chore(runtime): dispatch-shell-ab-comparison-harness t004"
  ```


### Task 5: Run preflight

**Task ID:** T005

**Files:**
- Create: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell-ab-comparison.contract.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell-fixed-cost.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/protocol.ts`
- Modify: `packages/logix-react/test/perf-boundaries/contract-preflight.test.ts`
- Modify: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts`
- Test: `pnpm -C packages/logix-react test test/browser/perf-boundaries/dispatch-shell-ab-comparison.contract.test.tsx`
- Test: `pnpm -C packages/logix-react test test/perf-boundaries/contract-preflight.test.ts`
- Test: `pnpm -C packages/logix-react test test/perf-boundaries/semantics.test.ts`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Run contract-preflight and semantics tests; document mode field names in handoff.md.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  pnpm -C packages/logix-react test test/browser/perf-boundaries/dispatch-shell-ab-comparison.contract.test.tsx
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Run preflight`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T005>
  git commit -m "chore(runtime): dispatch-shell-ab-comparison-harness t005"
  ```


## Completion Gate

- [ ] Harness can run baseline and fastPath modes in the same commit and include mode in evidence.
- [ ] The mode is test-only; it is not a public runtime option and not exported from package roots.
- [ ] Diff interpretation includes total and phase delta, not only runtime.txnCommitMs.
- [ ] A/B output can flag tax migration: total down but commit/queue/diagnostics up.

## Final Verification

Run the focused command set for this spec. If this spec changes shared runtime internals, also run:

```bash
pnpm typecheck
pnpm typecheck:test
```

Update `handoff.md` with pass/fail evidence and the next recommended spec.
