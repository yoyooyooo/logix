# Handoff — P0 Kernel Precision Fallback Closure

## Objective

Eliminate or hard-gate the highest-risk precision fallbacks across dirtyPlan, source/list dirty gate, selector route, and transaction direct-idle paths. P0 owns the failure modes that turn precise incremental execution into full/fanout work.

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


P0 is a stop-the-line stage. Do not proceed to P1 optimizations if P0 fallback counters are non-zero, unless the local report proves the failing counter is outside canonical examples and explicitly excluded by maintainer authority.


## Cloud LLM Validation Limitations

The cloud LLM created this staged patch from uploaded snapshots. It did not run pnpm install, package tests, browser tests, perf collect, perf diff, default/soak profile, or local CI.

## Report Template

```text
stage: 232-p0-kernel-precision-fallback-closure
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

This delivery implements P0 as a hard-gated evidence surface rather than a silent runtime optimization. The convergence and evidence-lock classifiers now require P0 fallback counters for dirtyPlan, source/list, selector, and direct-idle sentinels. Local runtime/perf work remains evidence-gated: if any required P0 counter is missing or non-zero, the local report must classify the stage as `incomplete` or `blocked`.

Implemented source/test anchors:

- `packages/logix-perf-evidence/scripts/ci.kernel-performance-evidence-lock.ts`
- `packages/logix-perf-evidence/scripts/ci.kernel-performance-evidence-lock.test.ts`
- `packages/logix-perf-evidence/scripts/ci.kernel-performance-convergence-stage-gate.ts`
- `packages/logix-perf-evidence/scripts/ci.kernel-performance-convergence-stage-gate.test.ts`
