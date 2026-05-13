# Tasks: P1 Kernel Fixed Cost and Diagnostics Closure

## Preflight

- [ ] T001 Run `git status --short` and `git rev-parse HEAD`.
- [ ] T002 Record unrelated dirty worktree changes in `handoff.md`.
- [ ] T003 Confirm packed XML/Repomix snapshots will not be edited.
- [ ] T004 Read authority docs listed in `spec.md`.

## Implementation


- [ ] T301 Add/verify no-topic dispatch allocation sentinel.
- [ ] T302 Add/verify RuntimeStore/externalStore runSync fallback and topic lifecycle sentinels.
- [ ] T303 Add/verify diagnostics-off payload/trace allocation sentinels.
- [ ] T304 Add/verify list evidence string hot-path sentinel.
- [ ] T305 Run migration classification to ensure costs did not move to React/store/source phases.


## Evidence

- [ ] T900 Run focused tests for this stage.
- [ ] T901 Collect quick evidence only as a diagnostic clue.
- [ ] T902 Collect default or soak evidence before any hard claim.
- [ ] T903 Write report artifacts under `specs/233-p1-kernel-fixed-cost-and-diagnostics-closure/perf/`.
- [ ] T904 Run `ci.kernel-performance-convergence-stage-gate.ts` against the convergence manifest.

## Closure

- [ ] T990 Record classification, claim strength, blockers, missing evidence, and migration risks in `handoff.md`.
- [ ] T991 Stop if classification is `blocked` or `incomplete`.
- [ ] T992 Do not claim broad runtime, React, or release-safe performance.
