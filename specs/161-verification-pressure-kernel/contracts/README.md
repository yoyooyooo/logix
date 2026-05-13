# Contracts: Verification Pressure Kernel

This directory records the implementation-facing contracts for `161`. Exact TypeScript types remain owned by `@logixjs/core/ControlPlane` and internal core modules.

## Contract 1: Static Pressure Check

Input:

- Program blueprint
- optional derived source artifact
- check options

Output:

- `VerificationControlPlaneReport`
- `stage="check"`
- `mode="static"`
- `PASS / FAIL / INCONCLUSIVE`
- static pressure repair hints where applicable

Required proof:

- Runtime startup path is not invoked.
- Program-only imports, duplicate imports, missing blueprint and declaration freshness can fail in check.
- PASS describes check coverage only.

## Contract 2: Startup Dependency Cause

Input:

- Program
- startup trial options

Output:

- `VerificationControlPlaneReport`
- `stage="trial"`
- `mode="startup"`
- typed dependency cause pressure in report summary, repair hint, artifact or stable evidence projection

Required proof:

- Missing service, missing config, missing Program import and child dependency are machine-distinguishable.
- Provider source is classified without CLI raw provider overlay input.
- Agent does not parse free-text messages for repair.

## Contract 3: Lifecycle Dual Summary

Input:

- Startup trial where boot and close can both fail

Output:

- Primary failure remains visible.
- Close summary remains visible.
- Close artifacts are linked through `artifacts[].outputKey`.

Required proof:

- Close failure never swallows primary boot failure.
- Related artifact keys reference existing artifacts.

## Contract 4: Compare Admissibility

Input:

- before report
- after report
- optional admissible evidence summary

Output:

- `VerificationControlPlaneReport`
- `stage="compare"`
- `mode="compare"`
- admissibility result before repair verdict comparison

Required proof:

- Declaration digest mismatch, scenario plan mismatch, evidence summary mismatch or environment mismatch returns admissibility result.
- Raw evidence full compare remains outside the default axis.

## Contract 5: Repeatability

Input:

- same normalized control-plane input run more than once

Output:

- Stable verdict, errorCode, artifact keys, digest and next stage
- Allowed variation only for runId and approved file path/outDir fields

Required proof:

- Repeatability tests fail when stable fields drift.
- Normalizer does not hide compare-relevant environment differences.
