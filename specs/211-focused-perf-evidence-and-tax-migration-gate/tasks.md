# 211 Focused Perf Evidence and Tax Migration Gate Tasks

**Priority:** P1
**Depends On:** 203-210

## Tasks

- [x] **T001 Write perf README:** Create perf/README.md with required evidence surfaces, file naming, and claim rules.
- [x] **T001a Test first:** Add or update the focused failing guard/checklist for T001.
- [x] **T001b Implement:** Make the minimal scoped code/doc/script change.
- [x] **T001c Verify:** Run focused command(s) and record outcome in `handoff.md`.
- [x] **T002 Write report template:** Create docs/next/runtime-dispatch-shell-tax-migration-report-template.md with phase-delta interpretation matrix.
- [x] **T002a Test first:** Add or update the focused failing guard/checklist for T002.
- [x] **T002b Implement:** Make the minimal scoped code/doc/script change.
- [x] **T002c Verify:** Run focused command(s) and record outcome in `handoff.md`.
- [x] **T003 Add tax report script:** Add a small script that reads before/after/A-B JSON and emits a structured report; do not run perf itself.
- [x] **T003a Test first:** Add or update the focused failing guard/checklist for T003.
- [x] **T003b Implement:** Make the minimal scoped code/doc/script change.
- [x] **T003c Verify:** Run focused command(s) and record outcome in `handoff.md`.
- [x] **T004 Update matrix/preflight if needed:** Ensure dispatchShell fixedCost suite and requiredEvidence include all fields needed for tax migration classification.
- [x] **T004a Test first:** Add or update the focused failing guard/checklist for T004.
- [x] **T004b Implement:** Make the minimal scoped code/doc/script change.
- [x] **T004c Verify:** Run focused command(s) and record outcome in `handoff.md`.
- [x] **T005 Validate evidence tooling:** Run preflight/typecheck; record exact commands for final local agent collection in handoff.md.
- [x] **T005a Test first:** Add or update the focused failing guard/checklist for T005.
- [x] **T005b Implement:** Make the minimal scoped code/doc/script change.
- [x] **T005c Verify:** Run focused command(s) and record outcome in `handoff.md`.

## Completion Gate

- [x] Evidence README lists required surfaces: structural sentinels, focused dispatch shell diff, A/B optional, and final report.
- [x] Final report can classify tax removed, tax migrated, inconclusive, or failed.
- [x] Default-profile focused diff must require comparable=true and summary.regressions==0 for any hard claim.
- [x] Quick profile and dirty/non-comparable results are explicitly marked as clues only.
- [x] Matrix additions do not create a second suite/budget truth outside matrix.json.
