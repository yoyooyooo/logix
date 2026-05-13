# Handoff: Selector Notify Tax Migration Report Gate

## Preflight

```text
repo_head_before: 926fdeaa26a40bd7fd4ccca4a87efa2fdd5af20d
dirty_worktree_before: clean tracked tree before bundle copy; generated bundle/perf artifacts remained untracked until finalization
existing_unrelated_changes: none identified
agent_start_time: 2026-05-11; finalization resumed at 2026-05-11T21:13:54+0800
```

## Scope Confirmation

```text
spec_id: 220-selector-notify-tax-migration-report-gate
expected_owner_files:
- packages/logix-perf-evidence/README.md
actual_owner_files:
- packages/logix-perf-evidence/scripts/ci.selector-notify-tax-report.ts
- packages/logix-perf-evidence/scripts/ci.selector-notify-tax-report.test.ts
- packages/logix-perf-evidence/package.json
- packages/logix-perf-evidence/tsconfig.json
- packages/logix-perf-evidence/assets/matrix.json
- packages/logix-perf-evidence/README.md
- docs/next/runtime-store-selector-notify-tax-migration-report-template.md
- specs/220-selector-notify-tax-migration-report-gate/perf/clean/report.md
- specs/220-selector-notify-tax-migration-report-gate/perf/clean/report.json
```

## Implementation Notes

```text
what_changed: Added selector notify tax classifier, tests, package script, matrix wiring, and final Markdown/JSON reports.
why_in_scope: 220 owns final tax migration classification and allowed/forbidden claim boundaries.
files_changed: listed below
- packages/logix-perf-evidence/scripts/ci.selector-notify-tax-report.ts
- packages/logix-perf-evidence/scripts/ci.selector-notify-tax-report.test.ts
- packages/logix-perf-evidence/package.json
- packages/logix-perf-evidence/tsconfig.json
- packages/logix-perf-evidence/assets/matrix.json
- packages/logix-perf-evidence/README.md
- docs/next/runtime-store-selector-notify-tax-migration-report-template.md
- specs/220-selector-notify-tax-migration-report-gate/perf/clean/report.md
- specs/220-selector-notify-tax-migration-report-gate/perf/clean/report.json
```

## Commands Run

```text
command: see entries below
- rtk pnpm -C packages/logix-perf-evidence test scripts/ci.selector-notify-tax-report.test.ts
result: PASS
- rtk pnpm -C packages/logix-perf-evidence typecheck
result: PASS
- rtk pnpm perf ci:selector-notify-tax-report -- --diff specs/219-runtime-store-no-tearing-focused-evidence-gate/perf/diff.runtimeStore.efd21e85__7d1c332e.local-darwin-arm64.default.json --before specs/219-runtime-store-no-tearing-focused-evidence-gate/perf/before.runtimeStore.efd21e85.local-darwin-arm64.default.json --after specs/219-runtime-store-no-tearing-focused-evidence-gate/perf/after.runtimeStore.7d1c332e.local-darwin-arm64.default.json --profile default --out specs/220-selector-notify-tax-migration-report-gate/perf/clean/report.md --json-out specs/220-selector-notify-tax-migration-report-gate/perf/clean/report.json
result: PASS
notes: see entries below
- No focused commands intentionally skipped for this spec.
```

## Sentinel Status

```text
structural_sentinels: PASS by 214-218 focused tests and report gate pointStatus.
allocation_sentinels: PASS; watched selector notify evidence present and available.
no_tearing_status: PASS; runtimeStore.noTearing.tickNotify before/after all ok.
public_surface_status: PASS; classifier adds perf-evidence script only, no public runtime API.
```

## Evidence

```text
before_artifact: specs/219-runtime-store-no-tearing-focused-evidence-gate/perf/before.runtimeStore.efd21e85.local-darwin-arm64.default.json
after_artifact: specs/219-runtime-store-no-tearing-focused-evidence-gate/perf/after.runtimeStore.7d1c332e.local-darwin-arm64.default.json
diff_artifact: specs/219-runtime-store-no-tearing-focused-evidence-gate/perf/diff.runtimeStore.efd21e85__7d1c332e.local-darwin-arm64.default.json
report_artifact: specs/220-selector-notify-tax-migration-report-gate/perf/clean/report.md
report_json: specs/220-selector-notify-tax-migration-report-gate/perf/clean/report.json
classification: tax_removed
claim_strength: hard
primary_metric: timePerTickMs, improved=5, regressed=0, bestP95DeltaMs=-0.0056
gates: profile PASS, comparable PASS, regressions PASS, budgetViolations PASS, warnings PASS, pointStatus PASS, metricEvidence PASS, watchedEvidence PASS
blockers: none
```

## Risk / Cost Migration

```text
migrated_cost: none observed.
migrated_risk: final allowed claim remains focused only.
observed_phase_or_counter_increase: none; all watched counters stable.
required_follow_up: do not use this report to claim global Runtime or React performance.
```

## Claims

Allowed:
- Focused validation passed for `220-selector-notify-tax-migration-report-gate` if all focused tests pass.
- Structural guard added/confirmed for this specific notify tax point.

Forbidden:
- Global Runtime performance improved.
- No regressions exist globally.
- React performance improved globally.
- Selector notification path is optimal.

## Next Recommended Spec

```text
next_spec: none inside 212-220
reason: classifier produced tax_removed with hard focused claim strength and no blockers.
```
