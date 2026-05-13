# Selector RuntimeStore Lifecycle Cleanup Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 收紧 SelectorGraph / RuntimeStore / React RuntimeExternalStore 的 retain-release、readQuery snapshot、runSync fallback 和 hot lifecycle cleanup。

**Architecture:** Core continues to own selector route and topic lifecycle. React external stores consume RuntimeStore snapshots and topic retention only. This requirement adds lifecycle guards and narrows fallback runSync to hydration/missing snapshot cases, then proves unmount/hot dispose does not retain topic stores. No new React hook family is allowed.

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
- `packages/logix-react/test/internal/store/RuntimeExternalStore.topicCleanup.contract.test.tsx` — new focused artifact for this requirement; keep it internal unless explicitly a docs/script artifact.

### Modify
- `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts` — update only for this requirement's stated responsibility; avoid opportunistic cleanup.
- `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts` — update only for this requirement's stated responsibility; avoid opportunistic cleanup.
- `packages/logix-react/src/internal/store/RuntimeExternalStore.ts` — update only for this requirement's stated responsibility; avoid opportunistic cleanup.
- `packages/logix-react/src/internal/store/ModuleRuntimeExternalStore.ts` — update only for this requirement's stated responsibility; avoid opportunistic cleanup.
- `packages/logix-react/src/internal/hooks/useSelector.ts` — update only for this requirement's stated responsibility; avoid opportunistic cleanup.
- `packages/logix-core/test/Runtime/ModuleRuntime/SelectorGraph.topicRetain.contract.test.ts` — update only for this requirement's stated responsibility; avoid opportunistic cleanup.
- `packages/logix-react/test/Hooks/useSelector.RuntimeStoreSnapshot.contract.test.tsx` — update only for this requirement's stated responsibility; avoid opportunistic cleanup.

### Focused Tests
- `packages/logix-core/test/Runtime/ModuleRuntime/SelectorGraph.topicRetain.contract.test.ts`
- `packages/logix-core/test/internal/Runtime/RuntimeStore.listenerSnapshot.test.ts`
- `packages/logix-react/test/Hooks/useSelector.RuntimeStoreSnapshot.contract.test.tsx`
- `packages/logix-react/test/internal/store/RuntimeExternalStore.hotLifecycle.test.ts`
- `packages/logix-react/test/Contracts/ReactSelectorRouteOwner.guard.test.ts`
- `packages/logix-react/test/Contracts/ReactSelectorStoreResidue.guard.test.ts`


## Focused Commands

Run the smallest applicable command first, then broaden only after the narrow test passes.

```bash
pnpm -C packages/logix-core test test/Runtime/ModuleRuntime/SelectorGraph.topicRetain.contract.test.ts
pnpm -C packages/logix-core test test/internal/Runtime/RuntimeStore.listenerSnapshot.test.ts
pnpm -C packages/logix-react test test/Hooks/useSelector.RuntimeStoreSnapshot.contract.test.tsx
pnpm -C packages/logix-react test test/internal/store/RuntimeExternalStore.hotLifecycle.test.ts
pnpm -C packages/logix-react test test/Contracts/ReactSelectorRouteOwner.guard.test.ts
pnpm -C packages/logix-react test test/Contracts/ReactSelectorStoreResidue.guard.test.ts
pnpm typecheck
pnpm typecheck:test
```

## Chunk 1: Implementation Tasks
### Task 1: Write cleanup failing test

**Files:**
- Create/Modify: see responsibility map above. Touch only the files required for this task.
- Test: focused tests listed for this requirement.

- [ ] **Step 1: Inspect the current code path**

  Read the target files and identify the smallest symbols/functions needed for this task. Do not edit yet.

- [ ] **Step 2: Write or update the failing guard/contract test**

  Expected before implementation: FAIL for the specific missing guard/behavior described below.

  ```text
  Add `RuntimeExternalStore.topicCleanup.contract.test.tsx` with mount/unmount/hot-dispose and retained topic count assertion.
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
  git commit -m "chore(kernel): selector-runtime-store-lifecycle-cleanup task 1"
  ```

### Task 2: Add internal test hook

**Files:**
- Create/Modify: see responsibility map above. Touch only the files required for this task.
- Test: focused tests listed for this requirement.

- [ ] **Step 1: Inspect the current code path**

  Read the target files and identify the smallest symbols/functions needed for this task. Do not edit yet.

- [ ] **Step 2: Write or update the failing guard/contract test**

  Expected before implementation: FAIL for the specific missing guard/behavior described below.

  ```text
  Expose non-public test-only count helpers from RuntimeExternalStore or test support file.
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
  git commit -m "chore(kernel): selector-runtime-store-lifecycle-cleanup task 2"
  ```

### Task 3: Tighten readSnapshot

**Files:**
- Create/Modify: see responsibility map above. Touch only the files required for this task.
- Test: focused tests listed for this requirement.

- [ ] **Step 1: Inspect the current code path**

  Read the target files and identify the smallest symbols/functions needed for this task. Do not edit yet.

- [ ] **Step 2: Write or update the failing guard/contract test**

  Expected before implementation: FAIL for the specific missing guard/behavior described below.

  ```text
  Ensure readQuery snapshot path consults RuntimeStore first and runSync only when missing.
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
  git commit -m "chore(kernel): selector-runtime-store-lifecycle-cleanup task 3"
  ```

### Task 4: Audit retain/release

**Files:**
- Create/Modify: see responsibility map above. Touch only the files required for this task.
- Test: focused tests listed for this requirement.

- [ ] **Step 1: Inspect the current code path**

  Read the target files and identify the smallest symbols/functions needed for this task. Do not edit yet.

- [ ] **Step 2: Write or update the failing guard/contract test**

  Expected before implementation: FAIL for the specific missing guard/behavior described below.

  ```text
  Make release idempotent across SelectorGraph and RuntimeExternalStore teardown.
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
  git commit -m "chore(kernel): selector-runtime-store-lifecycle-cleanup task 4"
  ```

### Task 5: Keep React route owner

**Files:**
- Create/Modify: see responsibility map above. Touch only the files required for this task.
- Test: focused tests listed for this requirement.

- [ ] **Step 1: Inspect the current code path**

  Read the target files and identify the smallest symbols/functions needed for this task. Do not edit yet.

- [ ] **Step 2: Write or update the failing guard/contract test**

  Expected before implementation: FAIL for the specific missing guard/behavior described below.

  ```text
  Run/extend guard so `useSelector.ts` has no local selectorTopicEligible/lane policy.
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
  git commit -m "chore(kernel): selector-runtime-store-lifecycle-cleanup task 5"
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
  Run core selector and React selector suites listed above.
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
  git commit -m "chore(kernel): selector-runtime-store-lifecycle-cleanup task 6"
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
