# 210 Dispatch Shell Same-Commit A/B Comparison Harness Tasks

**Priority:** P1
**Depends On:** 203; should be available before interpreting 204-209 changes

## Tasks

- [x] **T001 Add test-only shell mode type:** Add `shellMode: baseline | fastPath` to dispatch-shell.runtime.ts test helpers only.
- [x] **T001a Test first:** Add or update the focused failing guard/checklist for T001.
- [x] **T001b Implement:** Make the minimal scoped code/doc/script change.
- [x] **T001c Verify:** Run focused command(s) and record outcome in `handoff.md`.
- [x] **T002 Add env adapter:** Optionally map LOGIX_TXN_SHELL_FASTPATH=0/1 inside the perf harness, not Runtime public config.
- [x] **T002a Test first:** Add or update the focused failing guard/checklist for T002.
- [x] **T002b Implement:** Make the minimal scoped code/doc/script change.
- [x] **T002c Verify:** Run focused command(s) and record outcome in `handoff.md`.
- [x] **T003 Write leakage guard:** Add a guard that shellMode is not exported from core/react public packages.
- [x] **T003a Test first:** Add or update the focused failing guard/checklist for T003.
- [x] **T003b Implement:** Make the minimal scoped code/doc/script change.
- [x] **T003c Verify:** Run focused command(s) and record outcome in `handoff.md`.
- [x] **T004 Emit phase deltas:** Add report fields that include baseline/fastPath total and phase deltas.
- [x] **T004a Test first:** Add or update the focused failing guard/checklist for T004.
- [x] **T004b Implement:** Make the minimal scoped code/doc/script change.
- [x] **T004c Verify:** Run focused command(s) and record outcome in `handoff.md`.
- [x] **T005 Run preflight:** Run contract-preflight and semantics tests; document mode field names in handoff.md.
- [x] **T005a Test first:** Add or update the focused failing guard/checklist for T005.
- [x] **T005b Implement:** Make the minimal scoped code/doc/script change.
- [x] **T005c Verify:** Run focused command(s) and record outcome in `handoff.md`.

## Completion Gate

- [x] Harness can run baseline and fastPath modes in the same commit and include mode in evidence.
- [x] The mode is test-only; it is not a public runtime option and not exported from package roots.
- [x] Diff interpretation includes total and phase delta, not only runtime.txnCommitMs.
- [x] A/B output can flag tax migration: total down but commit/queue/diagnostics up.
