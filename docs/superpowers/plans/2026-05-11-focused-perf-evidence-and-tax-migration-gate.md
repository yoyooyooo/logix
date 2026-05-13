# Focused Perf Evidence and Tax Migration Gate Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Define the evidence set and post-change report required to decide whether the fixed-cost wave moved or removed tax.

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

- `specs/211-focused-perf-evidence-and-tax-migration-gate/perf/README.md`
- `docs/next/runtime-dispatch-shell-tax-migration-report-template.md`
- `packages/logix-perf-evidence/scripts/ci.dispatch-shell-tax-report.ts`

### Modify

- `packages/logix-react/test/browser/perf-boundaries/dispatch-shell-fixed-cost.test.tsx`
- `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts`
- `packages/logix-perf-evidence/scripts/diff.ts`
- `packages/logix-perf-evidence/scripts/ci.interpret-artifact.ts`
- `packages/logix-perf-evidence/assets/matrix.json`

### Focused Tests

- `pnpm -C packages/logix-react test test/perf-boundaries/contract-preflight.test.ts`
- `pnpm -C packages/logix-react test test/perf-boundaries/semantics.test.ts`
- `pnpm -C packages/logix-perf-evidence test scripts/lib/capacity-collect-decision.test.ts`
- pnpm typecheck

## Implementation Notes

- Start with tests or checklist/preflight material.
- Keep code edits within the listed files unless inspection proves a narrower adjacent file is the true owner.
- If another file is required, record the reason in `handoff.md` before editing it.
- Do not turn measurements into production payload allocation.

## Chunk 1: Implementation Tasks


### Task 1: Write perf README

**Task ID:** T001

**Files:**
- Create: `specs/211-focused-perf-evidence-and-tax-migration-gate/perf/README.md`
- Create: `docs/next/runtime-dispatch-shell-tax-migration-report-template.md`
- Create: `packages/logix-perf-evidence/scripts/ci.dispatch-shell-tax-report.ts`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell-fixed-cost.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts`
- Modify: `packages/logix-perf-evidence/scripts/diff.ts`
- Modify: `packages/logix-perf-evidence/scripts/ci.interpret-artifact.ts`
- Modify: `packages/logix-perf-evidence/assets/matrix.json`
- Test: `pnpm -C packages/logix-react test test/perf-boundaries/contract-preflight.test.ts`
- Test: `pnpm -C packages/logix-react test test/perf-boundaries/semantics.test.ts`
- Test: `pnpm -C packages/logix-perf-evidence test scripts/lib/capacity-collect-decision.test.ts`
- Test: `pnpm typecheck`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Create perf/README.md with required evidence surfaces, file naming, and claim rules.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  pnpm -C packages/logix-react test test/perf-boundaries/contract-preflight.test.ts
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Write perf README`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T001>
  git commit -m "chore(runtime): focused-perf-evidence-and-tax-migration-gate t001"
  ```


### Task 2: Write report template

**Task ID:** T002

**Files:**
- Create: `specs/211-focused-perf-evidence-and-tax-migration-gate/perf/README.md`
- Create: `docs/next/runtime-dispatch-shell-tax-migration-report-template.md`
- Create: `packages/logix-perf-evidence/scripts/ci.dispatch-shell-tax-report.ts`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell-fixed-cost.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts`
- Modify: `packages/logix-perf-evidence/scripts/diff.ts`
- Modify: `packages/logix-perf-evidence/scripts/ci.interpret-artifact.ts`
- Modify: `packages/logix-perf-evidence/assets/matrix.json`
- Test: `pnpm -C packages/logix-react test test/perf-boundaries/contract-preflight.test.ts`
- Test: `pnpm -C packages/logix-react test test/perf-boundaries/semantics.test.ts`
- Test: `pnpm -C packages/logix-perf-evidence test scripts/lib/capacity-collect-decision.test.ts`
- Test: `pnpm typecheck`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Create docs/next/runtime-dispatch-shell-tax-migration-report-template.md with phase-delta interpretation matrix.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  pnpm -C packages/logix-react test test/perf-boundaries/contract-preflight.test.ts
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Write report template`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T002>
  git commit -m "chore(runtime): focused-perf-evidence-and-tax-migration-gate t002"
  ```


### Task 3: Add tax report script

**Task ID:** T003

**Files:**
- Create: `specs/211-focused-perf-evidence-and-tax-migration-gate/perf/README.md`
- Create: `docs/next/runtime-dispatch-shell-tax-migration-report-template.md`
- Create: `packages/logix-perf-evidence/scripts/ci.dispatch-shell-tax-report.ts`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell-fixed-cost.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts`
- Modify: `packages/logix-perf-evidence/scripts/diff.ts`
- Modify: `packages/logix-perf-evidence/scripts/ci.interpret-artifact.ts`
- Modify: `packages/logix-perf-evidence/assets/matrix.json`
- Test: `pnpm -C packages/logix-react test test/perf-boundaries/contract-preflight.test.ts`
- Test: `pnpm -C packages/logix-react test test/perf-boundaries/semantics.test.ts`
- Test: `pnpm -C packages/logix-perf-evidence test scripts/lib/capacity-collect-decision.test.ts`
- Test: `pnpm typecheck`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Add a small script that reads before/after/A-B JSON and emits a structured report; do not run perf itself.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  pnpm -C packages/logix-react test test/perf-boundaries/contract-preflight.test.ts
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Add tax report script`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T003>
  git commit -m "chore(runtime): focused-perf-evidence-and-tax-migration-gate t003"
  ```


### Task 4: Update matrix/preflight if needed

**Task ID:** T004

**Files:**
- Create: `specs/211-focused-perf-evidence-and-tax-migration-gate/perf/README.md`
- Create: `docs/next/runtime-dispatch-shell-tax-migration-report-template.md`
- Create: `packages/logix-perf-evidence/scripts/ci.dispatch-shell-tax-report.ts`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell-fixed-cost.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts`
- Modify: `packages/logix-perf-evidence/scripts/diff.ts`
- Modify: `packages/logix-perf-evidence/scripts/ci.interpret-artifact.ts`
- Modify: `packages/logix-perf-evidence/assets/matrix.json`
- Test: `pnpm -C packages/logix-react test test/perf-boundaries/contract-preflight.test.ts`
- Test: `pnpm -C packages/logix-react test test/perf-boundaries/semantics.test.ts`
- Test: `pnpm -C packages/logix-perf-evidence test scripts/lib/capacity-collect-decision.test.ts`
- Test: `pnpm typecheck`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Ensure dispatchShell fixedCost suite and requiredEvidence include all fields needed for tax migration classification.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  pnpm -C packages/logix-react test test/perf-boundaries/contract-preflight.test.ts
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Update matrix/preflight if needed`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T004>
  git commit -m "chore(runtime): focused-perf-evidence-and-tax-migration-gate t004"
  ```


### Task 5: Validate evidence tooling

**Task ID:** T005

**Files:**
- Create: `specs/211-focused-perf-evidence-and-tax-migration-gate/perf/README.md`
- Create: `docs/next/runtime-dispatch-shell-tax-migration-report-template.md`
- Create: `packages/logix-perf-evidence/scripts/ci.dispatch-shell-tax-report.ts`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell-fixed-cost.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts`
- Modify: `packages/logix-perf-evidence/scripts/diff.ts`
- Modify: `packages/logix-perf-evidence/scripts/ci.interpret-artifact.ts`
- Modify: `packages/logix-perf-evidence/assets/matrix.json`
- Test: `pnpm -C packages/logix-react test test/perf-boundaries/contract-preflight.test.ts`
- Test: `pnpm -C packages/logix-react test test/perf-boundaries/semantics.test.ts`
- Test: `pnpm -C packages/logix-perf-evidence test scripts/lib/capacity-collect-decision.test.ts`
- Test: `pnpm typecheck`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Run preflight/typecheck; record exact commands for final local agent collection in handoff.md.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  pnpm -C packages/logix-react test test/perf-boundaries/contract-preflight.test.ts
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Validate evidence tooling`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T005>
  git commit -m "chore(runtime): focused-perf-evidence-and-tax-migration-gate t005"
  ```


## Completion Gate

- [x] Evidence README lists required surfaces: structural sentinels, focused dispatch shell diff, A/B optional, and final report.
- [x] Final report can classify tax removed, tax migrated, inconclusive, or failed.
- [x] Default-profile focused diff must require comparable=true and summary.regressions==0 for any hard claim.
- [x] Quick profile and dirty/non-comparable results are explicitly marked as clues only.
- [x] Matrix additions do not create a second suite/budget truth outside matrix.json.

## Final Status

- `211-focused-perf-evidence-and-tax-migration-gate`: accepted
- classification: `tax_removed`
- claimStrength: focused hard
- global performance claim: not made
- accepted evidence directory: `specs/211-focused-perf-evidence-and-tax-migration-gate/perf/clean/`

## Final Verification

Run the focused command set for this spec. If this spec changes shared runtime internals, also run:

```bash
pnpm typecheck
pnpm typecheck:test
```

Update `handoff.md` with pass/fail evidence and the next recommended spec.
