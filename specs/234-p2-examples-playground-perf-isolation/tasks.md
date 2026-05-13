# Tasks: P2 Examples and Playground Performance Isolation

## Preflight

- [ ] T001 Run `git status --short` and `git rev-parse HEAD`.
- [ ] T002 Record unrelated dirty worktree changes in `handoff.md`.
- [ ] T003 Confirm packed XML/Repomix snapshots will not be edited.
- [ ] T004 Read authority docs listed in `spec.md`.

## Implementation


- [ ] T401 Create runtime-example evidence input separate from playground/product evidence.
- [ ] T402 Add/verify playground noise isolation suite.
- [ ] T403 Add/verify kernel-playground cost-mixing counter.
- [ ] T404 Add/verify example public residue counter.
- [ ] T405 Run `ci.examples-playground-isolation-report.ts` and save Markdown/JSON reports stating which artifacts may support kernel claims and which are product-only clues.


## Evidence

- [ ] T900 Run focused tests for this stage, including `ci.examples-playground-isolation-report.test.ts`.
- [ ] T901 Collect quick evidence only as a diagnostic clue.
- [ ] T902 Collect default or soak evidence before any hard claim.
- [ ] T903 Write report artifacts under `specs/234-p2-examples-playground-perf-isolation/perf/`.
- [ ] T904 Run `ci.kernel-performance-convergence-stage-gate.ts` against the convergence manifest.

## Closure

- [ ] T990 Record classification, claim strength, blockers, missing evidence, and migration risks in `handoff.md`.
- [ ] T991 Stop if classification is `blocked` or `incomplete`.
- [ ] T992 Do not claim broad runtime, React, or release-safe performance.
