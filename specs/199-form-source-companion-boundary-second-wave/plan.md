# Form Source/Companion Boundary Second Wave Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 继续收紧 Form 的 source、companion、rule/list/root/submit owner law，防止 Form 领域包长出第二 runtime 或第二 host read law。

**Architecture:** Form remains a program-first domain package. Remote fact goes through source, local soft fact goes through synchronous companion, final truth goes through rule/list/root/submit, and React reads continue through core `useModule + useSelector`. This requirement strengthens guard tests and fixes any implementation drift; it does not expand Form public API. 

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
- `packages/logix-form/test/Form/Form.Companion.NoAsyncGuard.test.ts` — new focused artifact for this requirement; keep it internal unless explicitly a docs/script artifact.
- `packages/logix-form/test/Form/Form.Source.NotOptionsApi.guard.test.ts` — new focused artifact for this requirement; keep it internal unless explicitly a docs/script artifact.
- `packages/logix-form/test/Form/Form.ReadRoute.CoreSelectorOnly.guard.test.ts` — new focused artifact for this requirement; keep it internal unless explicitly a docs/script artifact.

### Modify
- `packages/logix-form/src/internal/form/impl.ts` — update only for this requirement's stated responsibility; avoid opportunistic cleanup.
- `packages/logix-form/src/internal/form/install.ts` — update only for this requirement's stated responsibility; avoid opportunistic cleanup.
- `packages/logix-form/src/internal/form/rules.ts` — update only for this requirement's stated responsibility; avoid opportunistic cleanup.
- `packages/logix-form/src/internal/form/fields.ts` — update only for this requirement's stated responsibility; avoid opportunistic cleanup.
- `packages/logix-form/src/Companion.ts` — update only for this requirement's stated responsibility; avoid opportunistic cleanup.
- `packages/logix-form/src/Form.ts` — update only for this requirement's stated responsibility; avoid opportunistic cleanup.
- `packages/logix-form/test/Form/Form.Companion.Authoring.test.ts` — update only for this requirement's stated responsibility; avoid opportunistic cleanup.
- `packages/logix-form/test/Form/Form.Source.Authoring.test.ts` — update only for this requirement's stated responsibility; avoid opportunistic cleanup.
- `packages/logix-form/test/Form/Form.DomainBoundary.test.ts` — update only for this requirement's stated responsibility; avoid opportunistic cleanup.
- `packages/logix-react/test/form-companion-host-gate.integration.test.tsx` — update only for this requirement's stated responsibility; avoid opportunistic cleanup.

### Focused Tests
- `packages/logix-form/test/Form/Form.Companion.Authoring.test.ts`
- `packages/logix-form/test/Form/Form.Companion.NoAsyncGuard.test.ts`
- `packages/logix-form/test/Form/Form.Source.Authoring.test.ts`
- `packages/logix-form/test/Form/Form.Source.NotOptionsApi.guard.test.ts`
- `packages/logix-form/test/Form/Form.DomainBoundary.test.ts`
- `packages/logix-react/test/form-companion-host-gate.integration.test.tsx`


## Focused Commands

Run the smallest applicable command first, then broaden only after the narrow test passes.

```bash
pnpm -C packages/logix-form test test/Form/Form.Companion.Authoring.test.ts
pnpm -C packages/logix-form test test/Form/Form.Companion.NoAsyncGuard.test.ts
pnpm -C packages/logix-form test test/Form/Form.Source.Authoring.test.ts
pnpm -C packages/logix-form test test/Form/Form.Source.NotOptionsApi.guard.test.ts
pnpm -C packages/logix-form test test/Form/Form.DomainBoundary.test.ts
pnpm -C packages/logix-react test test/form-companion-host-gate.integration.test.tsx
pnpm typecheck
pnpm typecheck:test
```

## Chunk 1: Implementation Tasks
### Task 1: Write async companion guard

**Files:**
- Create/Modify: see responsibility map above. Touch only the files required for this task.
- Test: focused tests listed for this requirement.

- [ ] **Step 1: Inspect the current code path**

  Read the target files and identify the smallest symbols/functions needed for this task. Do not edit yet.

- [ ] **Step 2: Write or update the failing guard/contract test**

  Expected before implementation: FAIL for the specific missing guard/behavior described below.

  ```text
  Add test with companion returning Promise/Effect and expect authoring error/diagnostic.
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
  git commit -m "chore(kernel): form-source-companion-boundary-second-wave task 1"
  ```

### Task 2: Write source-not-options guard

**Files:**
- Create/Modify: see responsibility map above. Touch only the files required for this task.
- Test: focused tests listed for this requirement.

- [ ] **Step 1: Inspect the current code path**

  Read the target files and identify the smallest symbols/functions needed for this task. Do not edit yet.

- [ ] **Step 2: Write or update the failing guard/contract test**

  Expected before implementation: FAIL for the specific missing guard/behavior described below.

  ```text
  Add public surface/text guard rejecting source-as-options/candidates wording or API.
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
  git commit -m "chore(kernel): form-source-companion-boundary-second-wave task 2"
  ```

### Task 3: Write read route guard

**Files:**
- Create/Modify: see responsibility map above. Touch only the files required for this task.
- Test: focused tests listed for this requirement.

- [ ] **Step 1: Inspect the current code path**

  Read the target files and identify the smallest symbols/functions needed for this task. Do not edit yet.

- [ ] **Step 2: Write or update the failing guard/contract test**

  Expected before implementation: FAIL for the specific missing guard/behavior described below.

  ```text
  Add test scanning for `useFormField/useCompanion/useFormSelector` canonical exports.
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
  git commit -m "chore(kernel): form-source-companion-boundary-second-wave task 3"
  ```

### Task 4: Fix companion lower

**Files:**
- Create/Modify: see responsibility map above. Touch only the files required for this task.
- Test: focused tests listed for this requirement.

- [ ] **Step 1: Inspect the current code path**

  Read the target files and identify the smallest symbols/functions needed for this task. Do not edit yet.

- [ ] **Step 2: Write or update the failing guard/contract test**

  Expected before implementation: FAIL for the specific missing guard/behavior described below.

  ```text
  Tighten implementation to reject async values without changing valid sync companion behavior.
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
  git commit -m "chore(kernel): form-source-companion-boundary-second-wave task 4"
  ```

### Task 5: Fix source boundary drift

**Files:**
- Create/Modify: see responsibility map above. Touch only the files required for this task.
- Test: focused tests listed for this requirement.

- [ ] **Step 1: Inspect the current code path**

  Read the target files and identify the smallest symbols/functions needed for this task. Do not edit yet.

- [ ] **Step 2: Write or update the failing guard/contract test**

  Expected before implementation: FAIL for the specific missing guard/behavior described below.

  ```text
  Remove or reword any source code/docs that imply options/final truth ownership.
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
  git commit -m "chore(kernel): form-source-companion-boundary-second-wave task 5"
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
  Run Form domain boundary and React host gate tests.
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
  git commit -m "chore(kernel): form-source-companion-boundary-second-wave task 6"
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
