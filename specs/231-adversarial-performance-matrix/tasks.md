# Tasks: Adversarial Performance Matrix

## Preflight

- [ ] T001 Run `git status --short` and `git rev-parse HEAD`.
- [ ] T002 Record unrelated dirty worktree changes in `handoff.md`.
- [ ] T003 Confirm packed XML/Repomix snapshots will not be edited.
- [ ] T004 Read authority docs listed in `spec.md`.

## Implementation


- [ ] T101 Define matrix axes and cell ID/matrix hash rules.
- [ ] T102 Add phase attribution schema and deterministic report shape.
- [ ] T103 Add migration classification for total improvement plus phase regression.
- [ ] T104 Wire required hot-path suites into the matrix manifest.
- [ ] T105 Save quick/default/soak artifacts under `specs/231-adversarial-performance-matrix/perf/`.


## Evidence

- [ ] T900 Run focused tests for this stage.
- [ ] T901 Collect quick evidence only as a diagnostic clue.
- [ ] T902 Collect default or soak evidence before any hard claim.
- [ ] T903 Write report artifacts under `specs/231-adversarial-performance-matrix/perf/`.
- [ ] T904 Run `ci.kernel-performance-convergence-stage-gate.ts` against the convergence manifest.

## Closure

- [ ] T990 Record classification, claim strength, blockers, missing evidence, and migration risks in `handoff.md`.
- [ ] T991 Stop if classification is `blocked` or `incomplete`.
- [ ] T992 Do not claim broad runtime, React, or release-safe performance.
