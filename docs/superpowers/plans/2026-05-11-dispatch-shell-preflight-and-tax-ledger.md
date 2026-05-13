# Dispatch Shell Preflight and Tax Ledger Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the local preflight snapshot and tax map before any transaction shell optimization starts.

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

- `specs/203-dispatch-shell-preflight-and-tax-ledger/notes/preflight.md`
- `docs/next/runtime-dispatch-shell-tax-ledger.md`
- `docs/next/runtime-dispatch-shell-before-after-playbook.md`

### Modify

- `packages/logix-react/test/browser/perf-boundaries/dispatch-shell-fixed-cost.test.tsx`
- `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts`
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchOuterShell.PerfBoundary.test.ts`
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts`

### Focused Tests

- `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchOuterShell.PerfBoundary.test.ts`
- `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts`
- `pnpm -C packages/logix-react test test/perf-boundaries/contract-preflight.test.ts`

## Implementation Notes

- Start with tests or checklist/preflight material.
- Keep code edits within the listed files unless inspection proves a narrower adjacent file is the true owner.
- If another file is required, record the reason in `handoff.md` before editing it.
- Do not turn measurements into production payload allocation.

## Chunk 1: Implementation Tasks


### Task 1: Inspect dispatch-shell suite

**Task ID:** T001

**Files:**
- Create: `specs/203-dispatch-shell-preflight-and-tax-ledger/notes/preflight.md`
- Create: `docs/next/runtime-dispatch-shell-tax-ledger.md`
- Create: `docs/next/runtime-dispatch-shell-before-after-playbook.md`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell-fixed-cost.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts`
- Modify: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchOuterShell.PerfBoundary.test.ts`
- Modify: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchOuterShell.PerfBoundary.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts`
- Test: `pnpm -C packages/logix-react test test/perf-boundaries/contract-preflight.test.ts`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Read dispatch-shell-fixed-cost.test.tsx and dispatch-shell.runtime.ts; record all required evidence fields in notes/preflight.md.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchOuterShell.PerfBoundary.test.ts
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Inspect dispatch-shell suite`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T001>
  git commit -m "chore(runtime): dispatch-shell-preflight-and-tax-ledger t001"
  ```


### Task 2: Inspect core phase probes

**Task ID:** T002

**Files:**
- Create: `specs/203-dispatch-shell-preflight-and-tax-ledger/notes/preflight.md`
- Create: `docs/next/runtime-dispatch-shell-tax-ledger.md`
- Create: `docs/next/runtime-dispatch-shell-before-after-playbook.md`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell-fixed-cost.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts`
- Modify: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchOuterShell.PerfBoundary.test.ts`
- Modify: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchOuterShell.PerfBoundary.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts`
- Test: `pnpm -C packages/logix-react test test/perf-boundaries/contract-preflight.test.ts`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Read ModuleRuntime.dispatchOuterShell.PerfBoundary.test.ts and ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts; record what they prove and what they do not prove.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchOuterShell.PerfBoundary.test.ts
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Inspect core phase probes`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T002>
  git commit -m "chore(runtime): dispatch-shell-preflight-and-tax-ledger t002"
  ```


### Task 3: Create tax ledger

**Task ID:** T003

**Files:**
- Create: `specs/203-dispatch-shell-preflight-and-tax-ledger/notes/preflight.md`
- Create: `docs/next/runtime-dispatch-shell-tax-ledger.md`
- Create: `docs/next/runtime-dispatch-shell-before-after-playbook.md`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell-fixed-cost.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts`
- Modify: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchOuterShell.PerfBoundary.test.ts`
- Modify: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchOuterShell.PerfBoundary.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts`
- Test: `pnpm -C packages/logix-react test test/perf-boundaries/contract-preflight.test.ts`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Write docs/next/runtime-dispatch-shell-tax-ledger.md with first-order and second-order tax points.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchOuterShell.PerfBoundary.test.ts
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Create tax ledger`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T003>
  git commit -m "chore(runtime): dispatch-shell-preflight-and-tax-ledger t003"
  ```


### Task 4: Create before/after playbook

**Task ID:** T004

**Files:**
- Create: `specs/203-dispatch-shell-preflight-and-tax-ledger/notes/preflight.md`
- Create: `docs/next/runtime-dispatch-shell-tax-ledger.md`
- Create: `docs/next/runtime-dispatch-shell-before-after-playbook.md`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell-fixed-cost.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts`
- Modify: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchOuterShell.PerfBoundary.test.ts`
- Modify: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchOuterShell.PerfBoundary.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts`
- Test: `pnpm -C packages/logix-react test test/perf-boundaries/contract-preflight.test.ts`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Write docs/next/runtime-dispatch-shell-before-after-playbook.md with same-commit A/B, focused diff, and final default-profile diff rules.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchOuterShell.PerfBoundary.test.ts
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Create before/after playbook`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T004>
  git commit -m "chore(runtime): dispatch-shell-preflight-and-tax-ledger t004"
  ```


### Task 5: Run preflight health checks

**Task ID:** T005

**Files:**
- Create: `specs/203-dispatch-shell-preflight-and-tax-ledger/notes/preflight.md`
- Create: `docs/next/runtime-dispatch-shell-tax-ledger.md`
- Create: `docs/next/runtime-dispatch-shell-before-after-playbook.md`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell-fixed-cost.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts`
- Modify: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchOuterShell.PerfBoundary.test.ts`
- Modify: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchOuterShell.PerfBoundary.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts`
- Test: `pnpm -C packages/logix-react test test/perf-boundaries/contract-preflight.test.ts`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Run the focused tests listed above and record command output in handoff.md.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchOuterShell.PerfBoundary.test.ts
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Run preflight health checks`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T005>
  git commit -m "chore(runtime): dispatch-shell-preflight-and-tax-ledger t005"
  ```


## Completion Gate

- [ ] Preflight notes identify current evidence fields for dispatch shell phase timing.
- [ ] The tax ledger maps every later member spec to exactly one dominant tax point and possible secondary tax migration.
- [ ] No implementation optimization is performed in this spec.
- [ ] Focused tests are recorded as health checks, not as performance claims.

## Final Verification

Run the focused command set for this spec. If this spec changes shared runtime internals, also run:

```bash
pnpm typecheck
pnpm typecheck:test
```

Update `handoff.md` with pass/fail evidence and the next recommended spec.
