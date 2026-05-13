# Runtime Transaction Fixed-Cost Tax Wave Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Coordinate the transaction fixed-cost wave without duplicating member implementation details.

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

- `docs/next/runtime-transaction-fixed-cost-tax-wave.md`
- `docs/next/runtime-transaction-fixed-cost-evidence-playbook.md`
- `specs/202-runtime-transaction-fixed-cost-tax-wave/checklists/group.members.md`

### Modify

- None

### Focused Tests

- `scripts/list_focused_commands.sh`
- `scripts/print_evidence_commands.sh`

## Implementation Notes

- Start with tests or checklist/preflight material.
- Keep code edits within the listed files unless inspection proves a narrower adjacent file is the true owner.
- If another file is required, record the reason in `handoff.md` before editing it.
- Do not turn measurements into production payload allocation.

## Chunk 1: Implementation Tasks


### Task 1: Create group-level tax ledger

**Task ID:** T001

**Files:**
- Create: `docs/next/runtime-transaction-fixed-cost-tax-wave.md`
- Create: `docs/next/runtime-transaction-fixed-cost-evidence-playbook.md`
- Create: `specs/202-runtime-transaction-fixed-cost-tax-wave/checklists/group.members.md`
- Modify: None
- Test: `scripts/list_focused_commands.sh`
- Test: `scripts/print_evidence_commands.sh`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Write docs/next/runtime-transaction-fixed-cost-tax-wave.md with member order, tax owners, and stop conditions.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  scripts/list_focused_commands.sh
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Create group-level tax ledger`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T001>
  git commit -m "chore(runtime): runtime-transaction-fixed-cost-tax-wave t001"
  ```


### Task 2: Create evidence playbook

**Task ID:** T002

**Files:**
- Create: `docs/next/runtime-transaction-fixed-cost-tax-wave.md`
- Create: `docs/next/runtime-transaction-fixed-cost-evidence-playbook.md`
- Create: `specs/202-runtime-transaction-fixed-cost-tax-wave/checklists/group.members.md`
- Modify: None
- Test: `scripts/list_focused_commands.sh`
- Test: `scripts/print_evidence_commands.sh`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Write docs/next/runtime-transaction-fixed-cost-evidence-playbook.md with before/after modes, A/B mode, focused diff, and final gate.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  scripts/list_focused_commands.sh
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Create evidence playbook`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T002>
  git commit -m "chore(runtime): runtime-transaction-fixed-cost-tax-wave t002"
  ```


### Task 3: Add group execution checklist

**Task ID:** T003

**Files:**
- Create: `docs/next/runtime-transaction-fixed-cost-tax-wave.md`
- Create: `docs/next/runtime-transaction-fixed-cost-evidence-playbook.md`
- Create: `specs/202-runtime-transaction-fixed-cost-tax-wave/checklists/group.members.md`
- Modify: None
- Test: `scripts/list_focused_commands.sh`
- Test: `scripts/print_evidence_commands.sh`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Create group.members.md with links to member specs and completion gates.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  scripts/list_focused_commands.sh
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Add group execution checklist`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T003>
  git commit -m "chore(runtime): runtime-transaction-fixed-cost-tax-wave t003"
  ```


### Task 4: Run structure validation

**Task ID:** T004

**Files:**
- Create: `docs/next/runtime-transaction-fixed-cost-tax-wave.md`
- Create: `docs/next/runtime-transaction-fixed-cost-evidence-playbook.md`
- Create: `specs/202-runtime-transaction-fixed-cost-tax-wave/checklists/group.members.md`
- Modify: None
- Test: `scripts/list_focused_commands.sh`
- Test: `scripts/print_evidence_commands.sh`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Run bundle/repo structure validation only; do not run perf collection in the group spec.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  scripts/list_focused_commands.sh
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Run structure validation`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T004>
  git commit -m "chore(runtime): runtime-transaction-fixed-cost-tax-wave t004"
  ```


## Completion Gate

- [ ] Member spec order is explicit and does not duplicate member tasks.
- [ ] The tax ledger lists first-order and second-order tax points with owners and evidence surfaces.
- [ ] The evidence playbook states what can and cannot be claimed before comparable default-profile diff exists.
- [ ] No public API or runtime semantics are changed by this group spec.

## Final Verification

Run the focused command set for this spec. If this spec changes shared runtime internals, also run:

```bash
pnpm typecheck
pnpm typecheck:test
```

Update `handoff.md` with pass/fail evidence and the next recommended spec.
