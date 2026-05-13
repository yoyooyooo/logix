# Adversarial Performance Matrix Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete `231-adversarial-performance-matrix` without changing public API or weakening evidence gates.

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

- `specs/231-adversarial-performance-matrix/handoff.md`
- `specs/231-adversarial-performance-matrix/perf/README.md`
- `specs/231-adversarial-performance-matrix/perf/*.json`
- `specs/231-adversarial-performance-matrix/perf/*.md`

## Tasks


- [ ] T101 Define matrix axes and cell ID/matrix hash rules.
- [ ] T102 Add phase attribution schema and deterministic report shape.
- [ ] T103 Add migration classification for total improvement plus phase regression.
- [ ] T104 Wire required hot-path suites into the matrix manifest.
- [ ] T105 Save quick/default/soak artifacts under `specs/231-adversarial-performance-matrix/perf/`.


## Verification

```bash
pnpm -C packages/logix-perf-evidence test scripts/ci.adversarial-matrix-report.test.ts
pnpm -C packages/logix-perf-evidence test scripts/ci.kernel-performance-convergence-stage-gate.test.ts
pnpm -C packages/logix-perf-evidence test scripts/ci.kernel-performance-evidence-lock.test.ts
```

When local evidence exists:

```bash
pnpm exec tsx packages/logix-perf-evidence/scripts/ci.adversarial-matrix-report.ts \
  --diff specs/231-adversarial-performance-matrix/perf/diff/local.default.diff.json \
  --before specs/231-adversarial-performance-matrix/perf/before/local.default.json \
  --after specs/231-adversarial-performance-matrix/perf/after/local.default.json \
  --profile adversarial-default \
  --out specs/231-adversarial-performance-matrix/perf/reports/local.default.md \
  --json-out specs/231-adversarial-performance-matrix/perf/reports/local.default.json

pnpm exec tsx packages/logix-perf-evidence/scripts/assemble-kernel-performance-convergence-manifest.ts \
  --input specs/235-kernel-performance-convergence-final-gate/perf/assembly.default.json \
  --out specs/235-kernel-performance-convergence-final-gate/perf/convergence.default.manifest.json

pnpm exec tsx packages/logix-perf-evidence/scripts/ci.kernel-performance-convergence-stage-gate.ts \
  --manifest specs/235-kernel-performance-convergence-final-gate/perf/convergence.default.manifest.json \
  --out specs/235-kernel-performance-convergence-final-gate/perf/reports/convergence.default.md \
  --json-out specs/235-kernel-performance-convergence-final-gate/perf/reports/convergence.default.json
```