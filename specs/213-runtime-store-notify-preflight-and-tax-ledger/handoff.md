# Handoff: RuntimeStore Notify Preflight and Tax Ledger

## Preflight

```text
repo_head_before: 926fdeaa26a40bd7fd4ccca4a87efa2fdd5af20d
dirty_worktree_before: clean tracked tree before bundle copy; generated bundle/perf artifacts remained untracked until finalization
existing_unrelated_changes: none identified
agent_start_time: 2026-05-11; finalization resumed at 2026-05-11T21:13:54+0800
```

## Scope Confirmation

```text
spec_id: 213-runtime-store-notify-preflight-and-tax-ledger
expected_owner_files:
- none
actual_owner_files:
- specs/213-runtime-store-notify-preflight-and-tax-ledger/notes/entrypoints.md
- docs/next/runtime-store-selector-notify-tax-ledger.md
```

## Implementation Notes

```text
what_changed: Added the notify path owner map and tax ledger, including the first-listener duplicate notify finding.
why_in_scope: 213 owns preflight mapping and the ledger used by downstream 214-220 specs.
files_changed: listed below
- specs/213-runtime-store-notify-preflight-and-tax-ledger/notes/entrypoints.md
- docs/next/runtime-store-selector-notify-tax-ledger.md
```

## Commands Run

```text
command: see entries below
- rtk sed -n '1,220p' specs/213-runtime-store-notify-preflight-and-tax-ledger/notes/entrypoints.md
result: PASS, ledger reviewed
notes: see entries below
- SelectorGraph exact dirty/read overlap already exists.
- RuntimeStore empty dirtyTopics and listener snapshot fast paths already exist.
- RuntimeExternalStore first-listener duplicate notify was the only production gap found in this wave.
- No focused commands intentionally skipped for this spec.
```

## Sentinel Status

```text
structural_sentinels: PASS by downstream 214-218 tests.
allocation_sentinels: PASS by RuntimeStore.notifyFastPath and report watched evidence.
no_tearing_status: PASS by 219 default profile focused evidence.
public_surface_status: PASS; ledger introduced no public surface.
```

## Evidence

```text
before_artifact: specs/219-runtime-store-no-tearing-focused-evidence-gate/perf/before.runtimeStore.efd21e85.local-darwin-arm64.default.json
after_artifact: specs/219-runtime-store-no-tearing-focused-evidence-gate/perf/after.runtimeStore.7d1c332e.local-darwin-arm64.default.json
diff_artifact: specs/219-runtime-store-no-tearing-focused-evidence-gate/perf/diff.runtimeStore.efd21e85__7d1c332e.local-darwin-arm64.default.json
report_artifact: specs/220-selector-notify-tax-migration-report-gate/perf/clean/report.md
classification: tax_removed
claim_strength: hard
```

## Risk / Cost Migration

```text
migrated_cost: none observed in watched selector notify counters.
migrated_risk: ledger remains evidence routing only; it is not a global performance claim.
observed_phase_or_counter_increase: none.
required_follow_up: none for 213.
```

## Claims

Allowed:
- Focused validation passed for `213-runtime-store-notify-preflight-and-tax-ledger` if all focused tests pass.
- Structural guard added/confirmed for this specific notify tax point.

Forbidden:
- Global Runtime performance improved.
- No regressions exist globally.
- React performance improved globally.
- Selector notification path is optimal.

## Next Recommended Spec

```text
next_spec: 214-selector-dirty-read-overlap-fanout-sentinels
reason: next spec validates the SelectorGraph overlap fanout assumptions recorded in this ledger.
```
