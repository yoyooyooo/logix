# Quickstart: Kernel Performance Convergence Final Gate

## Apply/Preflight

```bash
git status --short
git rev-parse HEAD
```

## Focused verification

```bash
pnpm -C packages/logix-perf-evidence test \
  scripts/ci.kernel-performance-convergence-assembly-input.test.ts \
  scripts/assemble-kernel-performance-convergence-manifest.test.ts \
  scripts/ci.kernel-performance-convergence-stage-gate.test.ts
```

## Stage evidence

Write local evidence under:

```text
specs/235-kernel-performance-convergence-final-gate/perf/
```

## Final classification

```bash
pnpm exec tsx packages/logix-perf-evidence/scripts/ci.kernel-performance-convergence-assembly-input.ts \
  --before specs/235-kernel-performance-convergence-final-gate/perf/before.<env>.default.json \
  --after specs/235-kernel-performance-convergence-final-gate/perf/after.<env>.default.json \
  --diff specs/235-kernel-performance-convergence-final-gate/perf/diff.<env>.default.json \
  --adversarial-report specs/231-adversarial-performance-matrix/perf/reports/adversarial.<env>.default.json \
  --examples-report specs/234-p2-examples-playground-perf-isolation/perf/reports/examples-playground.default.json \
  --profile adversarial-default \
  --out specs/235-kernel-performance-convergence-final-gate/perf/assembly.default.json

pnpm exec tsx packages/logix-perf-evidence/scripts/assemble-kernel-performance-convergence-manifest.ts \
  --input specs/235-kernel-performance-convergence-final-gate/perf/assembly.default.json \
  --out specs/235-kernel-performance-convergence-final-gate/perf/convergence.default.manifest.json

pnpm exec tsx packages/logix-perf-evidence/scripts/ci.kernel-performance-convergence-stage-gate.ts \
  --manifest specs/235-kernel-performance-convergence-final-gate/perf/convergence.default.manifest.json \
  --out specs/235-kernel-performance-convergence-final-gate/perf/reports/convergence.default.md \
  --json-out specs/235-kernel-performance-convergence-final-gate/perf/reports/convergence.default.json
```

## CI artifact chain

Use the performance CI split from [Kernel Performance Observability Standard](../../docs/standards/kernel-performance-observability-standard.md):

```text
logix-perf (evidence structure) -> evidence plumbing
logix-perf (knob snapshot) -> current-commit pressure/counter/suite-status artifacts
logix-perf (trend analyze) -> same-branch recent snapshot comparison
logix-perf (convergence) -> explicit before/after final-gate input
logix-perf (convergence soak) -> soak/tail/stability final-gate input
```

Use `logix-perf (convergence)` only when a hard evidence input needs scoped before/after collection. Local evidence remains preflight unless it is reproduced on CI or a dedicated stable runner and uploaded as retained artifacts. Snapshot and trend artifacts improve diagnosis, but they do not prove final 231-235 convergence by themselves.
