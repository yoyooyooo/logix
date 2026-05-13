# P1 Kernel Fixed Cost and Diagnostics Closure Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete `233-p1-kernel-fixed-cost-and-diagnostics-closure` without changing public API or weakening evidence gates.

**Architecture:** This stage is implemented as a narrow kernel-performance work package. It must use existing runtime ownership laws and emit local evidence through the perf-evidence pipeline and convergence stage gate.

**Tech Stack:** TypeScript, Vitest, pnpm, Logix core/react/form/perf-evidence packages, browser perf-boundary suites.

---

## File Structure

### Inspect first

- `packages/logix-core/src/internal/runtime/core/StateTransaction.dirty.ts`
- `packages/logix-core/src/internal/runtime/core/StateTransaction.patch.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnQueue.ts`
- `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`
- `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
- `packages/logix-core/src/internal/field-kernel/converge-in-transaction.impl.ts`
- `packages/logix-core/src/internal/field-kernel/converge-planner.ts`
- `packages/logix-core/src/internal/field-kernel/source.impl.ts`
- `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`
- `packages/logix-react/src/internal/hooks/useSelector.ts`
- `packages/logix-react/test/browser/perf-boundaries/**`
- `packages/logix-perf-evidence/scripts/**`

### Stage-owned outputs

- `specs/233-p1-kernel-fixed-cost-and-diagnostics-closure/handoff.md`
- `specs/233-p1-kernel-fixed-cost-and-diagnostics-closure/perf/README.md`
- `specs/233-p1-kernel-fixed-cost-and-diagnostics-closure/perf/*.json`
- `specs/233-p1-kernel-fixed-cost-and-diagnostics-closure/perf/*.md`

## Tasks


- [ ] T301 Add/verify no-topic dispatch allocation sentinel.
- [ ] T302 Add/verify RuntimeStore/externalStore runSync fallback and topic lifecycle sentinels.
- [ ] T303 Add/verify diagnostics-off payload/trace allocation sentinels.
- [ ] T304 Add/verify list evidence string hot-path sentinel.
- [ ] T305 Run migration classification to ensure costs did not move to React/store/source phases.


## Verification

```bash
pnpm -C packages/logix-perf-evidence test scripts/ci.kernel-performance-convergence-stage-gate.test.ts
pnpm -C packages/logix-perf-evidence test scripts/ci.kernel-performance-evidence-lock.test.ts
```

When local evidence exists:

```bash
pnpm exec tsx packages/logix-perf-evidence/scripts/assemble-kernel-performance-convergence-manifest.ts   --input specs/235-kernel-performance-convergence-final-gate/perf/assembly.default.json   --out specs/235-kernel-performance-convergence-final-gate/perf/convergence.default.manifest.json

pnpm exec tsx packages/logix-perf-evidence/scripts/ci.kernel-performance-convergence-stage-gate.ts   --manifest specs/235-kernel-performance-convergence-final-gate/perf/convergence.default.manifest.json   --out specs/235-kernel-performance-convergence-final-gate/perf/reports/convergence.default.md   --json-out specs/235-kernel-performance-convergence-final-gate/perf/reports/convergence.default.json
```