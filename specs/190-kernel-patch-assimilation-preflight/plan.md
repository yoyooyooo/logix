# Kernel Patch Assimilation Preflight Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把上一波 hotpath convergence patch 纳入本地工作树，并建立本轮需求的共同前置条件。

**Architecture:** 这是一个前置稳定化需求，不引入新语义。它只负责应用上一波补丁、修复类型/测试冲突、证明 public surface 没有漂移，并把本轮后续需求的基准状态写入本地 handoff。

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
- `docs/next/kernel-stabilization-preflight.md` — new focused artifact for this requirement; keep it internal unless explicitly a docs/script artifact.

### Modify
- `packages/logix-core/src/internal/field-kernel/converge-planner.ts` — update only for this requirement's stated responsibility; avoid opportunistic cleanup.
- `packages/logix-core/src/internal/field-kernel/converge-in-transaction.impl.ts` — update only for this requirement's stated responsibility; avoid opportunistic cleanup.
- `packages/logix-core/src/internal/field-kernel/source.impl.ts` — update only for this requirement's stated responsibility; avoid opportunistic cleanup.
- `packages/logix-core/src/internal/field-kernel/validate.impl.ts` — update only for this requirement's stated responsibility; avoid opportunistic cleanup.
- `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts` — update only for this requirement's stated responsibility; avoid opportunistic cleanup.
- `packages/logix-core/src/internal/runtime/core/selectorRoute.dirty.ts` — update only for this requirement's stated responsibility; avoid opportunistic cleanup.
- `packages/logix-core/test/FieldKernel/FieldKernel.ConvergePlanner.DecisionExecutionSinglePath.test.ts` — update only for this requirement's stated responsibility; avoid opportunistic cleanup.
- `packages/logix-core/test/internal/FieldKernel/FieldKernel.Source.SyncIdle.DirtyGate.test.ts` — update only for this requirement's stated responsibility; avoid opportunistic cleanup.
- `packages/logix-core/test/Runtime/Runtime.selectorDirtyFallback.contract.test.ts` — update only for this requirement's stated responsibility; avoid opportunistic cleanup.

### Focused Tests
- `packages/logix-core/test/FieldKernel/FieldKernel.ConvergePlanner.DecisionExecutionSinglePath.test.ts`
- `packages/logix-core/test/internal/FieldKernel/FieldKernel.Source.SyncIdle.DirtyGate.test.ts`
- `packages/logix-core/test/Runtime/Runtime.selectorDirtyFallback.contract.test.ts`
- `packages/logix-core/test/Contracts/CoreRootBarrel.allowlist.test.ts`
- `packages/logix-react/test/Contracts/ReactSelectorRouteOwner.guard.test.ts`
- `packages/logix-react/test/Contracts/ReactSelectorStoreResidue.guard.test.ts`


## Focused Commands

Run the smallest applicable command first, then broaden only after the narrow test passes.

```bash
pnpm -C packages/logix-core test test/FieldKernel/FieldKernel.ConvergePlanner.DecisionExecutionSinglePath.test.ts
pnpm -C packages/logix-core test test/internal/FieldKernel/FieldKernel.Source.SyncIdle.DirtyGate.test.ts
pnpm -C packages/logix-core test test/Runtime/Runtime.selectorDirtyFallback.contract.test.ts
pnpm -C packages/logix-core test test/Contracts/CoreRootBarrel.allowlist.test.ts
pnpm -C packages/logix-react test test/Contracts/ReactSelectorRouteOwner.guard.test.ts
pnpm -C packages/logix-react test test/Contracts/ReactSelectorStoreResidue.guard.test.ts
pnpm typecheck
pnpm typecheck:test
```

## Chunk 1: Implementation Tasks
### Task 1: Inspect current worktree

**Files:**
- Create/Modify: see responsibility map above. Touch only the files required for this task.
- Test: focused tests listed for this requirement.

- [ ] **Step 1: Inspect the current code path**

  Read the target files and identify the smallest symbols/functions needed for this task. Do not edit yet.

- [ ] **Step 2: Write or update the failing guard/contract test**

  Expected before implementation: FAIL for the specific missing guard/behavior described below.

  ```text
  Run `git status --short` and record whether the previous patch has already been applied.
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
  git commit -m "chore(kernel): kernel-patch-assimilation-preflight task 1"
  ```

### Task 2: Apply or verify previous patch

**Files:**
- Create/Modify: see responsibility map above. Touch only the files required for this task.
- Test: focused tests listed for this requirement.

- [ ] **Step 1: Inspect the current code path**

  Read the target files and identify the smallest symbols/functions needed for this task. Do not edit yet.

- [ ] **Step 2: Write or update the failing guard/contract test**

  Expected before implementation: FAIL for the specific missing guard/behavior described below.

  ```text
  If not already applied, unzip `logix-kernel-hotpath-convergence-patch-bundle.zip` and run its `inspect_patch_context.sh` then `apply_patch.sh`.
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
  git commit -m "chore(kernel): kernel-patch-assimilation-preflight task 2"
  ```

### Task 3: Run focused tests

**Files:**
- Create/Modify: see responsibility map above. Touch only the files required for this task.
- Test: focused tests listed for this requirement.

- [ ] **Step 1: Inspect the current code path**

  Read the target files and identify the smallest symbols/functions needed for this task. Do not edit yet.

- [ ] **Step 2: Write or update the failing guard/contract test**

  Expected before implementation: FAIL for the specific missing guard/behavior described below.

  ```text
  Run the six focused test files listed in this spec; record output.
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
  git commit -m "chore(kernel): kernel-patch-assimilation-preflight task 3"
  ```

### Task 4: Fix only assimilation errors

**Files:**
- Create/Modify: see responsibility map above. Touch only the files required for this task.
- Test: focused tests listed for this requirement.

- [ ] **Step 1: Inspect the current code path**

  Read the target files and identify the smallest symbols/functions needed for this task. Do not edit yet.

- [ ] **Step 2: Write or update the failing guard/contract test**

  Expected before implementation: FAIL for the specific missing guard/behavior described below.

  ```text
  Resolve compile/test conflicts caused by the patch; do not introduce new behavior.
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
  git commit -m "chore(kernel): kernel-patch-assimilation-preflight task 4"
  ```

### Task 5: Write preflight note

**Files:**
- Create/Modify: see responsibility map above. Touch only the files required for this task.
- Test: focused tests listed for this requirement.

- [ ] **Step 1: Inspect the current code path**

  Read the target files and identify the smallest symbols/functions needed for this task. Do not edit yet.

- [ ] **Step 2: Write or update the failing guard/contract test**

  Expected before implementation: FAIL for the specific missing guard/behavior described below.

  ```text
  Create `docs/next/kernel-stabilization-preflight.md` with commands, outcomes, and blockers.
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
  git commit -m "chore(kernel): kernel-patch-assimilation-preflight task 5"
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
