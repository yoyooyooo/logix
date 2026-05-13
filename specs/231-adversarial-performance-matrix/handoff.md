# Handoff — Adversarial Performance Matrix

## Objective

Create the shared matrix and evidence pipeline used by all P0/P1/P2 optimizations. This stage does not optimize runtime by itself; it makes failures attributable by cell, phase, fallback reason, and risk/cost migration.

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


The local agent may reuse an already accepted Adversarial Performance Matrix implementation if it proves the matrix id/hash, profiles, required hot paths, and migration classifier match this stage. If an existing implementation uses a different spec number, record the alias in this handoff rather than duplicating work.


## Cloud LLM Validation Limitations

The cloud LLM created this staged patch from uploaded snapshots. It did not run pnpm install, package tests, browser tests, perf collect, perf diff, default/soak profile, or local CI.

## Report Template

```text
stage: 231-adversarial-performance-matrix
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

This delivery adds the classifier implementation for stable adversarial cell IDs, deterministic matrix hash handling, expanded required hot-path coverage, and migration-aware claim boundaries. The local agent must still run focused perf-evidence tests before recording this stage as validated. Missing artifact `matrixHash` remains a hard-claim blocker; a report-local computed fallback is diagnostic only.

Implemented source/test anchors:

- `packages/logix-perf-evidence/scripts/lib/adversarial-axis.ts`
- `packages/logix-perf-evidence/scripts/lib/adversarial-cell-id.ts`
- `packages/logix-perf-evidence/scripts/lib/adversarial-cell-id.test.ts`
- `packages/logix-perf-evidence/scripts/ci.adversarial-matrix-report.ts`
- `packages/logix-perf-evidence/scripts/ci.adversarial-matrix-report.test.ts`
