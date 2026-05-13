# Docs Examples Public Residue Sweep Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 清理 docs/examples/Agent recipe 中会把用户带回旧 public surface、旧 selector law、旧 Form read family 或旧 field-kernel noun 的 residue。

**Architecture:** This is a documentation/example contract sweep. It must not create new capabilities. Public docs and examples should teach exact selector input, core React host law, Form program-first boundary, internal field-kernel vocabulary exclusion, and Playground as product witness rather than kernel truth owner. Tests should use text guards and example smoke where appropriate. 

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
- `packages/logix-core/test/Contracts/PublicResidueTextSweep.contract.test.ts` — new focused artifact for this requirement; keep it internal unless explicitly a docs/script artifact.
- `docs/next/public-residue-sweep-2026-05-11.md` — new focused artifact for this requirement; keep it internal unless explicitly a docs/script artifact.

### Modify
- `docs/ssot/runtime/01-public-api-spine.md` — update only for this requirement's stated responsibility; avoid opportunistic cleanup.
- `docs/ssot/runtime/02-hot-path-direction.md` — update only for this requirement's stated responsibility; avoid opportunistic cleanup.
- `docs/ssot/runtime/06-form-field-kernel-boundary.md` — update only for this requirement's stated responsibility; avoid opportunistic cleanup.
- `docs/ssot/runtime/10-react-host-projection-boundary.md` — update only for this requirement's stated responsibility; avoid opportunistic cleanup.
- `docs/ssot/form/13-exact-surface-contract.md` — update only for this requirement's stated responsibility; avoid opportunistic cleanup.
- `examples/logix-react/src/demos/DiShowcaseLayout.tsx` — update only for this requirement's stated responsibility; avoid opportunistic cleanup.
- `examples/logix-react/src/demos/form/*.tsx` — update only for this requirement's stated responsibility; avoid opportunistic cleanup.
- `packages/logix-react/test/Contracts/ReactSelectorDocsSurface.contract.test.ts` — update only for this requirement's stated responsibility; avoid opportunistic cleanup.
- `packages/logix-core/test/Contracts/CoreRootBarrel.allowlist.test.ts` — update only for this requirement's stated responsibility; avoid opportunistic cleanup.
- `packages/logix-form/test/Contracts/FormRootBarrel.allowlist.test.ts` — update only for this requirement's stated responsibility; avoid opportunistic cleanup.

### Focused Tests
- `packages/logix-core/test/Contracts/PublicResidueTextSweep.contract.test.ts`
- `packages/logix-core/test/Contracts/CoreRootBarrel.allowlist.test.ts`
- `packages/logix-react/test/Contracts/ReactSelectorDocsSurface.contract.test.ts`
- `packages/logix-form/test/Contracts/FormRootBarrel.allowlist.test.ts`
- `examples/logix-react/test/frozen-api-shape.contract.test.ts`


## Focused Commands

Run the smallest applicable command first, then broaden only after the narrow test passes.

```bash
pnpm -C packages/logix-core test test/Contracts/PublicResidueTextSweep.contract.test.ts
pnpm -C packages/logix-core test test/Contracts/CoreRootBarrel.allowlist.test.ts
pnpm -C packages/logix-react test test/Contracts/ReactSelectorDocsSurface.contract.test.ts
pnpm -C packages/logix-form test test/Contracts/FormRootBarrel.allowlist.test.ts
pnpm -C examples/logix-react test test/frozen-api-shape.contract.test.ts
pnpm typecheck
pnpm typecheck:test
```

## Chunk 1: Implementation Tasks
### Task 1: Write text sweep guard

**Files:**
- Create/Modify: see responsibility map above. Touch only the files required for this task.
- Test: focused tests listed for this requirement.

- [ ] **Step 1: Inspect the current code path**

  Read the target files and identify the smallest symbols/functions needed for this task. Do not edit yet.

- [ ] **Step 2: Write or update the failing guard/contract test**

  Expected before implementation: FAIL for the specific missing guard/behavior described below.

  ```text
  Create `PublicResidueTextSweep.contract.test.ts` with terms and allowed path buckets.
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
  git commit -m "chore(kernel): docs-examples-public-residue-sweep task 1"
  ```

### Task 2: Audit docs

**Files:**
- Create/Modify: see responsibility map above. Touch only the files required for this task.
- Test: focused tests listed for this requirement.

- [ ] **Step 1: Inspect the current code path**

  Read the target files and identify the smallest symbols/functions needed for this task. Do not edit yet.

- [ ] **Step 2: Write or update the failing guard/contract test**

  Expected before implementation: FAIL for the specific missing guard/behavior described below.

  ```text
  Scan docs/ssot and docs/next; classify and fix public-facing residue.
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
  git commit -m "chore(kernel): docs-examples-public-residue-sweep task 2"
  ```

### Task 3: Audit examples

**Files:**
- Create/Modify: see responsibility map above. Touch only the files required for this task.
- Test: focused tests listed for this requirement.

- [ ] **Step 1: Inspect the current code path**

  Read the target files and identify the smallest symbols/functions needed for this task. Do not edit yet.

- [ ] **Step 2: Write or update the failing guard/contract test**

  Expected before implementation: FAIL for the specific missing guard/behavior described below.

  ```text
  Update examples that teach whole-state selector or Form-owned read hooks as canonical.
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
  git commit -m "chore(kernel): docs-examples-public-residue-sweep task 3"
  ```

### Task 4: Keep internal terms internal

**Files:**
- Create/Modify: see responsibility map above. Touch only the files required for this task.
- Test: focused tests listed for this requirement.

- [ ] **Step 1: Inspect the current code path**

  Read the target files and identify the smallest symbols/functions needed for this task. Do not edit yet.

- [ ] **Step 2: Write or update the failing guard/contract test**

  Expected before implementation: FAIL for the specific missing guard/behavior described below.

  ```text
  Allow internal specs/tests to mention dirtyPlan/fallback reason when explicitly internal.
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
  git commit -m "chore(kernel): docs-examples-public-residue-sweep task 4"
  ```

### Task 5: Run focused guards

**Files:**
- Create/Modify: see responsibility map above. Touch only the files required for this task.
- Test: focused tests listed for this requirement.

- [ ] **Step 1: Inspect the current code path**

  Read the target files and identify the smallest symbols/functions needed for this task. Do not edit yet.

- [ ] **Step 2: Write or update the failing guard/contract test**

  Expected before implementation: FAIL for the specific missing guard/behavior described below.

  ```text
  Run public surface/text sweep/frozen API tests.
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
  git commit -m "chore(kernel): docs-examples-public-residue-sweep task 5"
  ```

### Task 6: Write sweep note

**Files:**
- Create/Modify: see responsibility map above. Touch only the files required for this task.
- Test: focused tests listed for this requirement.

- [ ] **Step 1: Inspect the current code path**

  Read the target files and identify the smallest symbols/functions needed for this task. Do not edit yet.

- [ ] **Step 2: Write or update the failing guard/contract test**

  Expected before implementation: FAIL for the specific missing guard/behavior described below.

  ```text
  Create `docs/next/public-residue-sweep-2026-05-11.md` summarizing changed terms and allowlist rules.
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
  git commit -m "chore(kernel): docs-examples-public-residue-sweep task 6"
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
