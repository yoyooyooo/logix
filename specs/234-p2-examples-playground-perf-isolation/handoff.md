# Handoff — P2 Examples and Playground Performance Isolation

## Objective

Separate kernel runtime evidence from product playground/editor costs so examples can support kernel claims without Monaco, Sandpack, type-bundle, route UI, or worker costs polluting runtime evidence.

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


P2 must not delete useful playground evidence. It must classify it correctly. Product playground performance can be optimized later, but it cannot be used as kernel proof unless the manifest isolates kernel runtime phases.


## Cloud LLM Validation Limitations

The cloud LLM created this staged patch from uploaded snapshots. It did not run pnpm install, package tests, browser tests, perf collect, perf diff, default/soak profile, or local CI.

## Report Template

```text
stage: 234-p2-examples-playground-perf-isolation
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

This delivery implements P2 as a required evidence classification boundary. The convergence gate now requires `examples.runtimeWitness`, `examples.playgroundNoiseIsolation`, `examples.kernelPlaygroundCostMixed`, and `examples.publicResidueViolation` evidence so kernel runtime claims cannot be supported by mixed playground/product costs. Local browser/playground collection remains required before validation.

Implemented source/test anchors:

- `packages/logix-perf-evidence/scripts/ci.kernel-performance-evidence-lock.ts`
- `packages/logix-perf-evidence/scripts/ci.kernel-performance-convergence-stage-gate.ts`
- `packages/logix-perf-evidence/scripts/ci.kernel-performance-convergence-stage-gate.test.ts`
