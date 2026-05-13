# P2 Examples and Playground Performance Isolation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete `234-p2-examples-playground-perf-isolation` without changing public API or weakening evidence gates.

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

- `specs/234-p2-examples-playground-perf-isolation/handoff.md`
- `specs/234-p2-examples-playground-perf-isolation/perf/README.md`
- `specs/234-p2-examples-playground-perf-isolation/perf/*.json`
- `specs/234-p2-examples-playground-perf-isolation/perf/*.md`

## Tasks


- [ ] T401 Create runtime-example evidence manifest separate from playground/product evidence.
- [ ] T402 Add/verify playground noise isolation suite.
- [ ] T403 Add/verify kernel-playground cost-mixing counter.
- [ ] T404 Add/verify example public residue counter.
- [ ] T405 Update local report to state which example artifacts may support kernel claims and which are product-only clues.


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