# Field Kernel Dirty Work Preflight Ledger Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the current field-kernel dirty-work ledger before production changes.

**Architecture:** Add or confirm focused sentinels first, then make the smallest owner-local implementation change. Preserve public API, transaction semantics, field-kernel ownership, and diagnostics-off hot-path behavior.

**Tech Stack:** TypeScript 5.x, Effect, Vitest, pnpm monorepo, Logix browser perf-boundary harness.

---

## Global Guardrails

- Do not add public root exports, public submodules, or public fast-path config.
- Do not restore public FieldKernel family or grammar.
- Do not silently convert exact dirty evidence into full work.
- Do not weaken rollback, validate, source, list, externalStore, or diagnostics tests.
- Do not claim performance success from quick, dirty, unstable, or non-comparable evidence.
- Do not allocate diagnostics/debug payloads on `diagnostics=off` exact fast paths.
- Do not use destructive git operations: `git reset`, `git clean`, `git checkout -- <path>`, `git restore`, `git stash`.

## File Structure / Responsibility Map

### Create

- Create: `docs/next/field-kernel-dirty-work-preflight-ledger.md`

### Modify

- Modify: `FIELD_KERNEL_DIRTY_WORK_LEDGER.md`
- Modify: `specs/222-field-kernel-dirty-work-preflight-ledger/handoff.md`

### Focused Tests

- `pnpm -C packages/logix-core test test/FieldKernel/FieldKernel.ConvergePlanner.DecisionExecutionSinglePath.test.ts`
- `pnpm -C packages/logix-core test test/internal/FieldKernel/FieldKernel.Source.SyncIdle.DirtyGate.test.ts`

## Chunk 1: Preflight and Failing Guard

### Task 1: Record current owner path

- [ ] Run `git status --short` and `git rev-parse HEAD`.
- [ ] Inspect target files listed above.
- [ ] Update `handoff.md` with existing unrelated changes.
- [ ] Confirm no packed source/XML file will be edited.

### Task 2: Add or confirm sentinel

- [ ] Write the smallest focused test/sentinel for this spec's first tax point.
- [ ] Run the focused test.
- [ ] Expected before implementation: FAIL if the gap exists; PASS only if current repo already satisfies the sentinel.
- [ ] If PASS already, record as existing protection and move to the next acceptance criterion.

## Chunk 2: Minimal Implementation

### Task 3: Implement narrow owner change

- [ ] Modify only listed owner file(s).
- [ ] Keep exact fast path branch-shaped.
- [ ] Keep fallback paths explicit and reason-coded.
- [ ] Keep counters test-only or diagnostics-gated.

### Task 4: Validate focused behavior

- [ ] Run the focused test(s) listed above.
- [ ] Expected after implementation: PASS.
- [ ] Run adjacent existing tests that protect rollback/validate/source/externalStore/public surface.
- [ ] If unrelated tests fail, record the failure and do not broaden scope.

## Chunk 3: Evidence and Handoff

### Task 5: Update handoff

- [ ] List files changed.
- [ ] List commands run and exact outcomes.
- [ ] Record structural sentinel status.
- [ ] Record allocation/fallback status.
- [ ] Record any `migrated_cost` / `migrated_risk`.
- [ ] State allowed and forbidden claims.

### Task 6: Commit guidance

```bash
git diff --check
# Expected: PASS
```

Commit only this spec's files when working in a real repo.
