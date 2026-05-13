# 202 Runtime Transaction Fixed-Cost Tax Wave Tasks

**Priority:** P0
**Depends On:** 190-201 or equivalent kernel stabilization applied

## Tasks

- [x] **T001 Create group-level tax ledger:** Write docs/next/runtime-transaction-fixed-cost-tax-wave.md with member order, tax owners, and stop conditions.
- [x] **T001a Test first:** Add or update the focused failing guard/checklist for T001.
- [x] **T001b Implement:** Make the minimal scoped code/doc/script change.
- [x] **T001c Verify:** Run focused command(s) and record outcome in `handoff.md`.
- [x] **T002 Create evidence playbook:** Write docs/next/runtime-transaction-fixed-cost-evidence-playbook.md with before/after modes, A/B mode, focused diff, and final gate.
- [x] **T002a Test first:** Add or update the focused failing guard/checklist for T002.
- [x] **T002b Implement:** Make the minimal scoped code/doc/script change.
- [x] **T002c Verify:** Run focused command(s) and record outcome in `handoff.md`.
- [x] **T003 Add group execution checklist:** Create group.members.md with links to member specs and completion gates.
- [x] **T003a Test first:** Add or update the focused failing guard/checklist for T003.
- [x] **T003b Implement:** Make the minimal scoped code/doc/script change.
- [x] **T003c Verify:** Run focused command(s) and record outcome in `handoff.md`.
- [x] **T004 Run structure validation:** Run bundle/repo structure validation only; do not run perf collection in the group spec.
- [x] **T004a Test first:** Add or update the focused failing guard/checklist for T004.
- [x] **T004b Implement:** Make the minimal scoped code/doc/script change.
- [x] **T004c Verify:** Run focused command(s) and record outcome in `handoff.md`.

## Completion Gate

- [x] Member spec order is explicit and does not duplicate member tasks.
- [x] The tax ledger lists first-order and second-order tax points with owners and evidence surfaces.
- [x] The evidence playbook states what can and cannot be claimed before comparable default-profile diff exists.
- [x] No public API or runtime semantics are changed by this group spec.
