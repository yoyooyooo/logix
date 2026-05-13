# FieldKernel Focused Before/After Evidence Gate Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collect and classify comparable focused evidence for field-kernel dirty-work paths.

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

- Create: `specs/228-fieldkernel-focused-before-after-evidence-gate/perf/README.md`

### Modify

- Modify: `docs/next/field-kernel-dirty-work-before-after-playbook.md`
- Modify: `docs/next/field-kernel-dirty-work-evidence-protocol.md`
- Modify: `docs/next/field-kernel-dirty-work-tax-migration-report-template.md`
- Modify: `packages/logix-perf-evidence/README.md`
- Modify: `packages/logix-perf-evidence/scripts/ci.field-kernel-dirty-work-tax-report.ts`
- Modify: `packages/logix-perf-evidence/scripts/ci.field-kernel-dirty-work-tax-report.test.ts`
- Modify: `specs/228-fieldkernel-focused-before-after-evidence-gate/handoff.md`

### Focused Tests

- `pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/converge-steps.test.tsx`
- `pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/converge-time-slicing.test.tsx`
- `pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/form-list-scope-check.test.tsx`
- `pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/external-store-ingest.test.tsx`
- `pnpm -C packages/logix-perf-evidence test scripts/ci.field-kernel-dirty-work-tax-report.test.ts`

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
