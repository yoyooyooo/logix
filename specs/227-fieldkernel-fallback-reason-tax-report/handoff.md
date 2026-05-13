# Handoff — FieldKernel Fallback Reason Tax Report

## Preflight

```text
repo_head_before: ae91fe6b77935446fccbbf0de866812166ebf070
dirty_worktree_before: yes; bundle/spec/docs/test additions from 221-226 already present; no packed source edited
prior_wave_status: PASS; specs/212 handoff and specs/220 perf clean report show selector notify accepted as tax_removed / stable_guarded guardrail
existing_unrelated_changes: logix-field-kernel-dirty-work-requirements-bundle.zip, unpacked bundle, specs/221-226, specs/228, docs/next wave docs, docs/superpowers plans, and 223-226 sentinel tests were already present before 227 implementation
agent_start_time: 2026-05-11T22:18+08:00
```

## Scope Decision

```text
started: yes
blocked: no
waiver_if_any: none
```

## Files Changed

```text
source_files:
  - packages/logix-core/src/internal/runtime/core/kernelFallbackReason.ts
test_files:
  - packages/logix-core/test/Contracts/KernelFallbackReason.contract.test.ts
  - packages/logix-perf-evidence/scripts/ci.field-kernel-dirty-work-tax-report.test.ts
doc_files:
  - docs/next/field-kernel-dirty-work-tax-migration-report-template.md
  - packages/logix-perf-evidence/README.md
  - specs/227-fieldkernel-fallback-reason-tax-report/handoff.md
  - specs/227-fieldkernel-fallback-reason-tax-report/tasks.md
  - specs/227-fieldkernel-fallback-reason-tax-report/checklists/requirements.md
perf_files:
  - packages/logix-perf-evidence/scripts/ci.field-kernel-dirty-work-tax-report.ts
  - packages/logix-perf-evidence/package.json
```

## Commands Run

```text
command: rtk pnpm -C packages/logix-perf-evidence test scripts/ci.field-kernel-dirty-work-tax-report.test.ts
result: FAIL before implementation
notes: RED: module './ci.field-kernel-dirty-work-tax-report' did not exist; expected sentinel failure.

command: rtk pnpm -C packages/logix-core test test/Contracts/KernelFallbackReason.contract.test.ts
result: FAIL before implementation
notes: RED: vocabulary lacked dirtyPlan/externalStore reason family and source missing_dirty_plan mapped to missing_ir.

command: rtk pnpm -C packages/logix-core test test/Contracts/KernelFallbackReason.contract.test.ts
result: PASS
notes: unified reason vocabulary and local mappings pass after owner-local implementation.

command: rtk pnpm -C packages/logix-perf-evidence test scripts/ci.field-kernel-dirty-work-tax-report.test.ts
result: PASS
notes: report classifier tests pass; package test runner also executed existing script tests.

command: rtk pnpm -C packages/logix-core test test/Contracts/KernelHotPathAudit.contract.test.ts test/internal/FieldKernel/FieldKernel.Validate.StaticIr.test.ts test/internal/FieldKernel/FieldKernel.Source.SyncIdle.DirtyGate.test.ts
result: PASS
notes: adjacent fallback audit/source/validate guards pass.

command: rtk pnpm -C packages/logix-core test test/internal/FieldKernel/FieldKernel.ExternalStore.CoalesceWindow.test.ts test/internal/FieldKernel/FieldKernel.ExternalStore.DisposeCancelsFlush.test.ts test/internal/FieldKernel/FieldKernel.ExternalStore.UrgentInterleave.test.ts
result: PASS
notes: adjacent externalStore lifecycle/scheduler guards pass.

command: rtk pnpm -C packages/logix-perf-evidence typecheck
result: PASS
notes: report script typechecks.

command: rtk pnpm -C packages/logix-core typecheck
result: PASS
notes: kernel fallback reason type expansion typechecks.

command: rtk git diff --check
result: PASS
notes: no whitespace errors.
```

## Sentinel Status

```text
structural_sentinels: PASS; FieldKernel report classifier covers tax_removed/stable_guarded/tax_migrated/inconclusive/failed and fails missing watched dirty-work evidence.
allocation_sentinels: PASS via prior 226 and adjacent core typecheck; no new allocation counters introduced in 227.
fallback_reason_sentinels: PASS; KernelFallbackReason now covers converge/validate/source/list/dirtyPlan/externalStore internal reason families.
semantic_sentinels: PASS; source/validate/externalStore adjacent tests pass; no public API/root export changes.
```

## Evidence

```text
quick_clues: none collected in 227; quick remains clue-only in classifier tests.
same_commit_ab: none; report gate is measurement-only.
before_after_default: none collected in 227; required for 228 hard claim.
before_after_soak: none.
report_files:
  - packages/logix-perf-evidence/scripts/ci.field-kernel-dirty-work-tax-report.ts
  - docs/next/field-kernel-dirty-work-tax-migration-report-template.md
```

## Tax Migration

```text
classification: stable_guarded
improved_area: no runtime performance claim; fallback/report taxonomy is now guarded and auditable.
regressed_or_shifted_area: none observed by focused tests; no behavior path changed.
evidence: focused classifier tests, kernel fallback reason contract, adjacent source/validate/externalStore tests, typecheck.
required_follow_up: run 228 focused before/after gate if clean comparable evidence can be produced; otherwise mark no-hard-claim.
```

## Claims

```text
allowed_claims:
  - FieldKernel fallback reason vocabulary covers converge/validate/source/list/dirtyPlan/externalStore internal reason families.
  - FieldKernel dirty-work tax report gate exists and classifies tax_removed/stable_guarded/tax_migrated/inconclusive/failed.
  - quick/non-comparable/dirty evidence remains clue-only and cannot support hard performance claims.
  - No public API/root export/transaction semantic change was made in 227.
forbidden_claims:
  - Global Runtime performance improved.
  - No global regressions.
  - All field-kernel dirty work is fixed.
  - FieldKernel is optimal.
  - Production performance improved globally.
```

## Next Anchor

```text
recommended_next_spec: 228-fieldkernel-focused-before-after-evidence-gate
open_questions: none for 227; 228 hard claim depends on clean comparable before/after artifacts.
```
