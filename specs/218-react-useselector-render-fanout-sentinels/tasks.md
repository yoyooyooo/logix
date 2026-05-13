# Tasks: React useSelector Render Fanout Sentinels

## Phase 0 — Preflight

- [ ] T001 Record `git status --short` and `git rev-parse HEAD` in `handoff.md`.
- [ ] T002 Read `spec.md`, `plan.md`, `tasks.md`, `handoff.md`, `DOD.md`, and `EVIDENCE_PROTOCOL.md`.
- [ ] T003 Inspect target source/test files and confirm actual owner files.

## Phase 1 — Sentinel First

- [ ] T004 Write or update the focused sentinel/test for the primary tax point.
- [ ] T005 Run the focused test and record FAIL/PASS baseline.
- [ ] T006 If already PASS, record that the guard exists and move to the next AC.

## Phase 2 — Minimal Implementation

- [ ] T007 Apply the smallest source change in the owner file.
- [ ] T008 Keep fallback reason-coded and diagnostics-off allocation-free.
- [ ] T009 Run focused tests and adjacent guard tests.

## Phase 3 — Evidence / Handoff

- [ ] T010 Update `handoff.md` with files, commands, results, blocker status, and claim boundaries.
- [ ] T011 If this spec affects perf evidence, write artifact paths to `handoff.md`.
- [ ] T012 Stop if public API change, no-tearing break, or evidence comparability issue appears.
