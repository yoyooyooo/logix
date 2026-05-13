# Handoff — Kernel Performance Convergence Final Gate

## Objective

Classify the combined P0/P1/P2 convergence evidence and produce the controlled local report used for handoff. This stage is the final gate, not a runtime optimization.

## Delivery Mode

```text
mixed:
- performance / hot path
- requirements/spec
- implementation plan
- smoke / command
```

## Scope

This stage may change only the files required to implement its stated local evidence and sentinels. It must not expand public API or rewrite unrelated runtime subsystems.

## Local Execution Notes


The final gate reads evidence. It does not run benchmarks and does not create performance proof by itself. It is only as strong as the local manifest supplied to it.


## Cloud LLM Validation Limitations

The cloud LLM created this staged patch from uploaded snapshots. It did not run pnpm install, package tests, browser tests, perf collect, perf diff, default/soak profile, or local CI.

## Report Template

```text
stage: 235-kernel-performance-convergence-final-gate
repo_head_before:
repo_head_after:
commands_run:
passed_checks:
failed_checks:
local_fixes:
evidence_artifacts:
classification:
claim_strength:
risk_or_cost_migration:
stop_conditions_hit:
allowed_claims:
forbidden_claims:
```

## Cloud-Owned Patch Delivery Notes

This delivery fixes the final gate classifier syntax blocker and adds explicit risk/cost migration gating. A final convergence manifest must include `migration.migratedCost` and `migration.migratedRisk`; any positive migrated cost/risk blocks hard claims unless `acceptedByAuthority=true` is supplied with local authority notes.

Implemented source/test anchors:

- `packages/logix-perf-evidence/scripts/ci.kernel-performance-convergence-stage-gate.ts`
- `packages/logix-perf-evidence/scripts/ci.kernel-performance-convergence-stage-gate.test.ts`

## Cloud-Owned Reconciliation Implementation — 2026-05-12

This stage now owns the manifest assembly bridge. The local agent must not hand-build the final convergence manifest except as an emergency diagnostic. Use:

```bash
pnpm exec tsx packages/logix-perf-evidence/scripts/assemble-kernel-performance-convergence-manifest.ts \
  --input specs/235-kernel-performance-convergence-final-gate/perf/assembly.<profile>.json \
  --out specs/235-kernel-performance-convergence-final-gate/perf/convergence.<profile>.manifest.json

pnpm exec tsx packages/logix-perf-evidence/scripts/ci.kernel-performance-convergence-stage-gate.ts \
  --manifest specs/235-kernel-performance-convergence-final-gate/perf/convergence.<profile>.manifest.json \
  --out specs/235-kernel-performance-convergence-final-gate/perf/reports/convergence.<profile>.md \
  --json-out specs/235-kernel-performance-convergence-final-gate/perf/reports/convergence.<profile>.json
```

Assembler inputs may include:

```text
- AdversarialPerformanceMatrixReport JSON
- KernelPerformanceEvidenceLockReport JSON
- ExamplesPlaygroundIsolationReport JSON
- raw txnHotPath sentinel snapshot
- raw RuntimeExternalStore convergence sentinel snapshot
- explicit local stage/suite/counter overrides backed by local CI evidence
```

Local agent allowed work is limited to applying the patch, resolving small import/context drift, running focused tests, collecting local CI/perf/browser evidence, filling `assembly.<profile>.json`, assembling the manifest, and running the final gate. Stop if evidence requires new runtime design or broad coding.
