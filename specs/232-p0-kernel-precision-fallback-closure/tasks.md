# Tasks: P0 Kernel Precision Fallback Closure

## Preflight

- [ ] T001 Run `git status --short` and `git rev-parse HEAD`.
- [ ] T002 Record unrelated dirty worktree changes in `handoff.md`.
- [ ] T003 Confirm packed XML/Repomix snapshots will not be edited.
- [ ] T004 Read authority docs listed in `spec.md`.

## Implementation


- [ ] T201 Add/verify dirtyPlan fallback counters and hard gates.
- [ ] T202 Add/verify source dirty gate and row scope counters.
- [ ] T203 Add/verify selector evaluate-all and authority fallback counters.
- [ ] T204 Add/verify direct-idle queue wait/backpressure sentinels.
- [ ] T205 Run default evidence and block if any P0 counter is missing or non-zero.


## Evidence

- [ ] T900 Run focused tests for this stage.
- [ ] T901 Collect quick evidence only as a diagnostic clue.
- [ ] T902 Collect default or soak evidence before any hard claim.
- [ ] T903 Write report artifacts under `specs/232-p0-kernel-precision-fallback-closure/perf/`.
- [ ] T904 Run `ci.kernel-performance-convergence-stage-gate.ts` against the convergence manifest.

## Closure

- [ ] T990 Record classification, claim strength, blockers, missing evidence, and migration risks in `handoff.md`.
- [ ] T991 Stop if classification is `blocked` or `incomplete`.
- [ ] T992 Do not claim broad runtime, React, or release-safe performance.
