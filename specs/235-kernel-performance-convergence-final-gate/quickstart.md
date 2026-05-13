# Quickstart: Kernel Performance Convergence Final Gate

## Apply/Preflight

```bash
git status --short
git rev-parse HEAD
```

## Focused verification

```bash
pnpm -C packages/logix-perf-evidence test scripts/ci.kernel-performance-convergence-stage-gate.test.ts
```

## Stage evidence

Write local evidence under:

```text
specs/235-kernel-performance-convergence-final-gate/perf/
```

## Final classification

```bash
pnpm exec tsx packages/logix-perf-evidence/scripts/assemble-kernel-performance-convergence-manifest.ts   --input specs/235-kernel-performance-convergence-final-gate/perf/assembly.default.json   --out specs/235-kernel-performance-convergence-final-gate/perf/convergence.default.manifest.json

pnpm exec tsx packages/logix-perf-evidence/scripts/ci.kernel-performance-convergence-stage-gate.ts   --manifest specs/235-kernel-performance-convergence-final-gate/perf/convergence.default.manifest.json   --out specs/235-kernel-performance-convergence-final-gate/perf/reports/convergence.default.md   --json-out specs/235-kernel-performance-convergence-final-gate/perf/reports/convergence.default.json
```