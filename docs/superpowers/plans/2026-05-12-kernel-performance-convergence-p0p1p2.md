# Kernel Performance Convergence P0/P1/P2 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the staged Kernel Performance Convergence stream across adversarial matrix, P0 fallback precision, P1 fixed-cost/diagnostics/list evidence, and P2 examples/playground isolation.

**Architecture:** Use one shared adversarial matrix and one convergence stage gate. Each stage is a separate speckit folder with its own handoff, evidence rules, and stop conditions. Runtime semantics and public surface remain unchanged; optimization work must be validated through local default/soak evidence.

**Tech Stack:** TypeScript, Vitest, pnpm, Logix perf-evidence scripts, browser perf-boundary suites, speckit folders, docs/next evidence protocols.

---

## File Structure

### Create

- `packages/logix-perf-evidence/scripts/ci.kernel-performance-convergence-stage-gate.ts` — deterministic P0/P1/P2 convergence classifier.
- `packages/logix-perf-evidence/scripts/ci.kernel-performance-convergence-stage-gate.test.ts` — focused classifier tests.
- `docs/next/kernel-performance-convergence-p0p1p2.md` — staged convergence rule.
- `docs/next/kernel-performance-convergence-local-agent-handoff.md` — local execution handoff.
- `docs/superpowers/plans/2026-05-12-kernel-performance-convergence-p0p1p2.md` — implementation plan.
- `specs/231-adversarial-performance-matrix/**` — matrix base work package.
- `specs/232-p0-kernel-precision-fallback-closure/**` — P0 work package.
- `specs/233-p1-kernel-fixed-cost-and-diagnostics-closure/**` — P1 work package.
- `specs/234-p2-examples-playground-perf-isolation/**` — P2 work package.

### Modify

- `packages/logix-react/src/internal/store/RuntimeExternalStore.ts` — add afterBoot runSync fallback and readQuery retain/release sentinels.
- `packages/logix-react/test/internal/store/RuntimeExternalStore.runSyncFallback.contract.test.tsx` — prove steady-state fallback remains zero and retained readQuery topics release.
- `packages/logix-perf-evidence/scripts/ci.kernel-performance-convergence-stage-gate.ts` — existing final gate remains the hard classifier.
- `docs/next/kernel-performance-convergence-p0p1p2.md` and `specs/23x/**` — align stage status with implemented assembler/sentinel/report bridges.

### Create

- `packages/logix-perf-evidence/scripts/assemble-kernel-performance-convergence-manifest.ts` — assemble final convergence manifest from local reports and raw sentinel snapshots.
- `packages/logix-perf-evidence/scripts/assemble-kernel-performance-convergence-manifest.test.ts` — focused assembler tests.
- `packages/logix-perf-evidence/scripts/ci.examples-playground-isolation-report.ts` — P2 examples/runtime vs playground/product isolation classifier.
- `packages/logix-perf-evidence/scripts/ci.examples-playground-isolation-report.test.ts` — focused P2 isolation tests.

Runtime/source implementation is no longer deferred as a general instruction. Local agent owns apply, validation, local evidence collection, and only minimal fixups.

## Global Guardrails

- Do not add public API, root exports, public selector namespaces, public field helper families, or public performance toggles.
- Do not change production semantics for benchmark-only wins.
- Do not weaken tests, budgets, fallback sentinels, no-tearing sentinels, or diagnostics-off guards.
- Do not use quick/smoke evidence for hard claims.
- Do not edit packed XML/Repomix snapshots.

## Chunk 1: Apply and validate the stage gate patch

### Task 1: Preflight

- [ ] Run `git status --short`.
- [ ] Run `git rev-parse HEAD`.
- [ ] Record unrelated worktree changes.
- [ ] Confirm packed XML snapshots will not be edited.

### Task 2: Apply patch

- [ ] Run:

```bash
git apply --check patches/0001-kernel-performance-convergence-p0p1p2.patch
git apply patches/0001-kernel-performance-convergence-p0p1p2.patch
```

Expected: both commands pass from repo root.

### Task 3: Run focused classifier tests

- [ ] Run:

```bash
pnpm -C packages/logix-perf-evidence test scripts/ci.kernel-performance-convergence-stage-gate.test.ts
```

Expected: PASS.

## Chunk 2: Validate 231 Adversarial Performance Matrix

### Task 4: Matrix schema and cell identity

**Files:**

- Create/modify under `packages/logix-perf-evidence/scripts/lib/*` as needed.
- Modify browser perf boundary suites only after preserving existing semantics.
- Save reports under `specs/231-adversarial-performance-matrix/perf/`.

- [ ] Add matrix axes for hot path, diagnostics level, dirty ratio, pattern kind, topology, source key mode, selector kind, rows, watchers, and seed.
- [ ] Add stable cell id generation and matrix hash evidence.
- [ ] Add focused tests for deterministic cell ids.
- [ ] Run focused tests.

### Task 5: Phase attribution and migration classification

- [ ] Add phase fields for dirtyPlan, source gate, selector route, RuntimeStore notify, externalStore snapshot, React render, diagnostics emit.
- [ ] Add cost/risk migration classifier.
- [ ] Ensure diagnostics=off only uses numeric counters, not heavy payloads.
- [ ] Produce quick evidence as clue only.

## Chunk 3: Validate P0 precision/fallback closure

### Task 6: dirtyPlan fallback closure

- [ ] Add/verify counters for unknownWrite, missingRegistry, dirtyAll, nonFieldAuthority, legacyDirtyInput.
- [ ] Make canonical examples fail the local gate if any P0 fallback counter is non-zero.
- [ ] Do not introduce compatibility or broad fallback paths.

### Task 7: source/list/selector fallback closure

- [ ] Add/verify source full fallback, row full scan, unrelated key eval, selector evaluate-all, selector dirtyAll fallback, and non-field authority fallback counters.
- [ ] Validate list row scope uses changed indices when evidence exists.
- [ ] Validate selector route does not evaluate all for exact dirty/read overlap.

### Task 8: direct-idle guard

- [ ] Add/verify direct-idle queue wait/backpressure non-zero sentinels.
- [ ] Ensure no hard claim if direct-idle still allocates or waits under no-backlog default-lane diagnostics-off path.

## Chunk 4: Validate P1 fixed-cost/diagnostics/list evidence closure

### Task 9: dispatch/store/externalStore fixed-cost closure

- [ ] Add/verify no-topic fanout allocation sentinel.
- [ ] Add/verify RuntimeStore runSync fallback after boot is zero.
- [ ] Add/verify retained topics return to zero after teardown.
- [ ] Validate no render fanout migration.

### Task 10: diagnostics/list evidence closure

- [ ] Add/verify diagnostics-off payload counter is zero.
- [ ] Add/verify list evidence string normalization is not on the hot path.
- [ ] Ensure light/full diagnostics remain sampled/budgeted.

## Chunk 5: Validate P2 examples/playground isolation

### Task 11: runtime examples vs product playground split

- [ ] Mark runtime canonical examples separately from Monaco/Sandpack/editor/type-bundle playground evidence.
- [ ] Add/verify examples runtime witness suite.
- [ ] Add/verify playground noise isolation suite.
- [ ] Ensure kernel claims exclude product playground/editor costs unless reported separately.

## Chunk 6: Final evidence and report

### Task 12: Produce convergence manifest

- [ ] Collect default or soak evidence.
- [ ] Assemble `specs/231-adversarial-performance-matrix/perf/convergence.manifest.default.json`.
- [ ] Include all required stages, suites, counters, local CI commands, evidence refs, and cloud limitations.

### Task 13: Run final stage gate

- [ ] Run:

```bash
pnpm exec tsx packages/logix-perf-evidence/scripts/ci.kernel-performance-convergence-stage-gate.ts \
  --manifest specs/231-adversarial-performance-matrix/perf/convergence.manifest.default.json \
  --out specs/235-kernel-performance-convergence-final-gate/perf/reports/convergence.default.md \
  --json-out specs/235-kernel-performance-convergence-final-gate/perf/reports/convergence.default.json
```

Expected: `classification=complete` and `claimStrength=hard` only if all gates pass.

### Task 14: Commit boundary

- [ ] Commit each stage separately if implemented locally.
- [ ] Do not merge stage implementation commits if the final gate is blocked or incomplete.
