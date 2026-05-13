# Tasks: Kernel Performance Evidence Lock

## Preflight

- [x] T001 Record `git status --short` and `git rev-parse HEAD` in `handoff.md`.
- [x] T002 Confirm no packed XML/Repomix snapshots will be edited.
- [x] T003 Run `git apply --check patches/0001-kernel-performance-evidence-lock.patch`.

## Patch Application

- [x] T004 Apply `patches/0001-kernel-performance-evidence-lock.patch`.
- [x] T005 Confirm the new classifier script exists under `packages/logix-perf-evidence/scripts`.
- [x] T006 Confirm speckit docs exist under `specs/230-kernel-performance-evidence-lock`.

## Focused Tests

- [x] T007 Run `pnpm -C packages/logix-perf-evidence test scripts/ci.kernel-performance-evidence-lock.test.ts`.
- [x] T008 Run adjacent evidence script tests for selector notify and field-kernel dirty-work reports.
- [x] T009 Run `git diff --check` on the task-owned paths.

## Local Evidence

- [ ] T010 Collect or assemble a default/soak evidence manifest with all required suites.
- [ ] T011 Ensure all watched fallback counters are present.
- [ ] T012 Run the evidence-lock CLI against the manifest.
- [ ] T013 Save Markdown and JSON reports in `specs/230-kernel-performance-evidence-lock/perf/`.

## Handoff Closure

- [x] T014 Update `handoff.md` with commands run and evidence artifact paths.
- [x] T015 Record classification as `locked`, `provisional`, `blocked`, or `incomplete`.
- [x] T016 Record allowed and forbidden claims.
- [x] T017 Stop and report if a hard gate fails, evidence is missing, or local CI cannot run.
