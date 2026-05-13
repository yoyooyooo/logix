# 203 Dispatch Shell Preflight and Tax Ledger Tasks

**Priority:** P0
**Depends On:** 202

## Tasks

- [x] **T001 Inspect dispatch-shell suite:** Read dispatch-shell-fixed-cost.test.tsx and dispatch-shell.runtime.ts; record all required evidence fields in notes/preflight.md.
- [x] **T001a Test first:** Add or update the focused failing guard/checklist for T001.
- [x] **T001b Implement:** Make the minimal scoped code/doc/script change.
- [x] **T001c Verify:** Run focused command(s) and record outcome in `handoff.md`.
- [x] **T002 Inspect core phase probes:** Read ModuleRuntime.dispatchOuterShell.PerfBoundary.test.ts and ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts; record what they prove and what they do not prove.
- [x] **T002a Test first:** Add or update the focused failing guard/checklist for T002.
- [x] **T002b Implement:** Make the minimal scoped code/doc/script change.
- [x] **T002c Verify:** Run focused command(s) and record outcome in `handoff.md`.
- [x] **T003 Create tax ledger:** Write docs/next/runtime-dispatch-shell-tax-ledger.md with first-order and second-order tax points.
- [x] **T003a Test first:** Add or update the focused failing guard/checklist for T003.
- [x] **T003b Implement:** Make the minimal scoped code/doc/script change.
- [x] **T003c Verify:** Run focused command(s) and record outcome in `handoff.md`.
- [x] **T004 Create before/after playbook:** Write docs/next/runtime-dispatch-shell-before-after-playbook.md with same-commit A/B, focused diff, and final default-profile diff rules.
- [x] **T004a Test first:** Add or update the focused failing guard/checklist for T004.
- [x] **T004b Implement:** Make the minimal scoped code/doc/script change.
- [x] **T004c Verify:** Run focused command(s) and record outcome in `handoff.md`.
- [x] **T005 Run preflight health checks:** Run the focused tests listed above and record command output in handoff.md.
- [x] **T005a Test first:** Add or update the focused failing guard/checklist for T005.
- [x] **T005b Implement:** Make the minimal scoped code/doc/script change.
- [x] **T005c Verify:** Run focused command(s) and record outcome in `handoff.md`.

## Completion Gate

- [x] Preflight notes identify current evidence fields for dispatch shell phase timing.
- [x] The tax ledger maps every later member spec to exactly one dominant tax point and possible secondary tax migration.
- [x] No implementation optimization is performed in this spec.
- [x] Focused tests are recorded as health checks, not as performance claims.
