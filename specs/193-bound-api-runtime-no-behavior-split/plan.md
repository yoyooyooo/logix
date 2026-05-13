# BoundApiRuntime No-Behavior Split Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 BoundApiRuntime 的 readiness、direct state write metadata、Logic builder factory 和 facade assembly 拆开，避免生命周期/authoring 后续改动污染热路径。

**Architecture:** `BoundApiRuntime.ts` 已有 `BoundApiRuntime.readiness.ts`，但仍同时承载 direct state write metadata、Logic builder factory、state/action facade assembly。本需求不改 Bound API 行为，只把职责拆成 focused internal modules，并用 existing tests 保证 readiness/logic authoring 不漂移。

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
- `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.directStateWrite.ts` — new focused artifact for this requirement; keep it internal unless explicitly a docs/script artifact.
- `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.logicBuilder.ts` — new focused artifact for this requirement; keep it internal unless explicitly a docs/script artifact.
- `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.facade.ts` — new focused artifact for this requirement; keep it internal unless explicitly a docs/script artifact.

### Modify
- `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts` — update only for this requirement's stated responsibility; avoid opportunistic cleanup.
- `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.readiness.ts` — update only for this requirement's stated responsibility; avoid opportunistic cleanup.
- `packages/logix-core/test/internal/Runtime/BoundApiRuntime.decomposition.guard.test.ts` — update only for this requirement's stated responsibility; avoid opportunistic cleanup.
- `packages/logix-core/test/Contracts/LogicLifecycleAuthoringSurface.contract.test.ts` — update only for this requirement's stated responsibility; avoid opportunistic cleanup.

### Focused Tests
- `packages/logix-core/test/internal/Runtime/BoundApiRuntime.decomposition.guard.test.ts`
- `packages/logix-core/test/Contracts/LogicLifecycleAuthoringSurface.contract.test.ts`
- `packages/logix-core/test/Contracts/LogicLifecycleTextSweep.contract.test.ts`
- `packages/logix-core/test/Logic/LogicPhaseAuthoringContract.test.ts`
- `packages/logix-core/test/Runtime/ModuleRuntime/ModuleRuntime.ReadinessRequirement.contract.test.ts`


## Focused Commands

Run the smallest applicable command first, then broaden only after the narrow test passes.

```bash
pnpm -C packages/logix-core test test/internal/Runtime/BoundApiRuntime.decomposition.guard.test.ts
pnpm -C packages/logix-core test test/Contracts/LogicLifecycleAuthoringSurface.contract.test.ts
pnpm -C packages/logix-core test test/Contracts/LogicLifecycleTextSweep.contract.test.ts
pnpm -C packages/logix-core test test/Logic/LogicPhaseAuthoringContract.test.ts
pnpm -C packages/logix-core test test/Runtime/ModuleRuntime/ModuleRuntime.ReadinessRequirement.contract.test.ts
pnpm typecheck
pnpm typecheck:test
```

## Chunk 1: Implementation Tasks
### Task 1: Extend guard

**Files:**
- Create/Modify: see responsibility map above. Touch only the files required for this task.
- Test: focused tests listed for this requirement.

- [ ] **Step 1: Inspect the current code path**

  Read the target files and identify the smallest symbols/functions needed for this task. Do not edit yet.

- [ ] **Step 2: Write or update the failing guard/contract test**

  Expected before implementation: FAIL for the specific missing guard/behavior described below.

  ```text
  Update `BoundApiRuntime.decomposition.guard.test.ts` to require the three new modules and ban copied helper bodies in the root file.
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
  git commit -m "chore(kernel): bound-api-runtime-no-behavior-split task 1"
  ```

### Task 2: Extract direct state helpers

**Files:**
- Create/Modify: see responsibility map above. Touch only the files required for this task.
- Test: focused tests listed for this requirement.

- [ ] **Step 1: Inspect the current code path**

  Read the target files and identify the smallest symbols/functions needed for this task. Do not edit yet.

- [ ] **Step 2: Write or update the failing guard/contract test**

  Expected before implementation: FAIL for the specific missing guard/behavior described below.

  ```text
  Move `DIRECT_STATE_WRITE_EFFECT`, mark/read metadata helpers into `BoundApiRuntime.directStateWrite.ts`.
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
  git commit -m "chore(kernel): bound-api-runtime-no-behavior-split task 2"
  ```

### Task 3: Extract Logic builder

**Files:**
- Create/Modify: see responsibility map above. Touch only the files required for this task.
- Test: focused tests listed for this requirement.

- [ ] **Step 1: Inspect the current code path**

  Read the target files and identify the smallest symbols/functions needed for this task. Do not edit yet.

- [ ] **Step 2: Write or update the failing guard/contract test**

  Expected before implementation: FAIL for the specific missing guard/behavior described below.

  ```text
  Move `LogicBuilderFactory` and narrow imports into `BoundApiRuntime.logicBuilder.ts`.
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
  git commit -m "chore(kernel): bound-api-runtime-no-behavior-split task 3"
  ```

### Task 4: Extract facade assembly

**Files:**
- Create/Modify: see responsibility map above. Touch only the files required for this task.
- Test: focused tests listed for this requirement.

- [ ] **Step 1: Inspect the current code path**

  Read the target files and identify the smallest symbols/functions needed for this task. Do not edit yet.

- [ ] **Step 2: Write or update the failing guard/contract test**

  Expected before implementation: FAIL for the specific missing guard/behavior described below.

  ```text
  Move pure facade-building helpers into `BoundApiRuntime.facade.ts`.
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
  git commit -m "chore(kernel): bound-api-runtime-no-behavior-split task 4"
  ```

### Task 5: Wire make coordinator

**Files:**
- Create/Modify: see responsibility map above. Touch only the files required for this task.
- Test: focused tests listed for this requirement.

- [ ] **Step 1: Inspect the current code path**

  Read the target files and identify the smallest symbols/functions needed for this task. Do not edit yet.

- [ ] **Step 2: Write or update the failing guard/contract test**

  Expected before implementation: FAIL for the specific missing guard/behavior described below.

  ```text
  Update `BoundApiRuntime.ts` imports and keep public behavior unchanged.
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
  git commit -m "chore(kernel): bound-api-runtime-no-behavior-split task 5"
  ```

### Task 6: Run focused tests

**Files:**
- Create/Modify: see responsibility map above. Touch only the files required for this task.
- Test: focused tests listed for this requirement.

- [ ] **Step 1: Inspect the current code path**

  Read the target files and identify the smallest symbols/functions needed for this task. Do not edit yet.

- [ ] **Step 2: Write or update the failing guard/contract test**

  Expected before implementation: FAIL for the specific missing guard/behavior described below.

  ```text
  Run readiness, Logic lifecycle, and decomposition tests.
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
  git commit -m "chore(kernel): bound-api-runtime-no-behavior-split task 6"
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
