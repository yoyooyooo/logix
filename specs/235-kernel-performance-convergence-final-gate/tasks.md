# Tasks: Kernel Performance Convergence Final Gate

## Preflight

- [ ] T001 Run `git status --short` and `git rev-parse HEAD`.
- [ ] T002 Record unrelated dirty worktree changes in `handoff.md`.
- [ ] T003 Confirm packed XML/Repomix snapshots will not be edited.
- [ ] T004 Read authority docs listed in `spec.md`.

## Implementation


- [ ] T501 Apply the classifier patch.
- [ ] T502 Run focused classifier tests.
- [ ] T503 Create `perf/assembly.<profile>.json` from local reports and sentinel snapshots.
- [ ] T503a Run `assemble-kernel-performance-convergence-manifest.ts` to produce `perf/convergence.<profile>.manifest.json`.
- [ ] T504 Run the final gate and save Markdown/JSON reports.
- [ ] T505 Update handoff with classification and forbidden claims.
- [ ] T506 Keep checked-in manifest templates clue-only until replaced by real default/soak evidence.


## Evidence

- [ ] T900 Run focused tests for this stage.
- [ ] T901 Collect quick evidence only as a diagnostic clue.
- [ ] T902 Collect default or soak evidence before any hard claim.
- [ ] T903 Write report artifacts under `specs/235-kernel-performance-convergence-final-gate/perf/`.
- [ ] T904 Run `ci.kernel-performance-convergence-stage-gate.ts` against `perf/convergence.<profile>.manifest.json` and write reports under `perf/reports/`.

## Closure

- [ ] T990 Record classification, claim strength, blockers, missing evidence, and migration risks in `handoff.md`.
- [ ] T991 Stop if classification is `blocked` or `incomplete`.
- [ ] T992 Do not claim broad runtime, React, or release-safe performance.
