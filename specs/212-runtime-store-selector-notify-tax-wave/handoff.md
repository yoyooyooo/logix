# Handoff: RuntimeStore Selector Notify Tax Wave

## Preflight

```text
repo_head_before: 926fdeaa26a40bd7fd4ccca4a87efa2fdd5af20d
dirty_worktree_before: clean tracked tree before bundle copy; generated bundle/perf artifacts remained untracked until finalization
existing_unrelated_changes: none identified; generated bundle zip/unpacked inputs were cleaned before final commit
agent_start_time: 2026-05-11; finalization resumed at 2026-05-11T21:13:54+0800
```

## Scope Confirmation

```text
spec_id: 212-runtime-store-selector-notify-tax-wave
expected_owner_files:
- none
actual_owner_files:
- docs/next/runtime-store-selector-notify-*.md
- docs/superpowers/plans/2026-05-11-*-selector-*.md
- specs/212-runtime-store-selector-notify-tax-wave/**
- specs/213-runtime-store-notify-preflight-and-tax-ledger/**
- specs/214-selector-dirty-read-overlap-fanout-sentinels/**
- specs/215-runtime-store-listener-snapshot-and-callback-fastpath/**
- specs/216-readquery-external-store-runsync-fallback-sentinels/**
- specs/217-topic-retain-release-and-hot-lifecycle-cleanup/**
- specs/218-react-useselector-render-fanout-sentinels/**
- specs/219-runtime-store-no-tearing-focused-evidence-gate/**
- specs/220-selector-notify-tax-migration-report-gate/**
```

## Implementation Notes

```text
what_changed: Established the 212-220 wave structure, tax ledger, DoD, evidence protocol, focused sentinels, comparable perf route, and selector notify classifier.
why_in_scope: 212 is the coordination spec for the RuntimeStore / selector notification fanout wave.
files_changed: listed below
- docs/next/runtime-store-selector-notify-agent-start-here.md
- docs/next/runtime-store-selector-notify-before-after-playbook.md
- docs/next/runtime-store-selector-notify-dod.md
- docs/next/runtime-store-selector-notify-evidence-protocol.md
- docs/next/runtime-store-selector-notify-local-agent-handoff.md
- docs/next/runtime-store-selector-notify-sequencing.md
- docs/next/runtime-store-selector-notify-tax-ledger.md
- docs/next/runtime-store-selector-notify-tax-migration-report-template.md
- docs/next/runtime-store-selector-notify-tax-wave.md
- specs/212-runtime-store-selector-notify-tax-wave/**
- specs/213-runtime-store-notify-preflight-and-tax-ledger/**
- specs/214-selector-dirty-read-overlap-fanout-sentinels/**
- specs/215-runtime-store-listener-snapshot-and-callback-fastpath/**
- specs/216-readquery-external-store-runsync-fallback-sentinels/**
- specs/217-topic-retain-release-and-hot-lifecycle-cleanup/**
- specs/218-react-useselector-render-fanout-sentinels/**
- specs/219-runtime-store-no-tearing-focused-evidence-gate/**
- specs/220-selector-notify-tax-migration-report-gate/**
commits:
- a7518bf529c7674b48777beeafaece6df462aaa5 test(runtime): add selector notify tax evidence gates
- efd21e85a06ba70fdc5045d7317baeee6026dfa5 test(runtime): fix selector notify perf evidence counter
- 7d1c332e8177753e3f4369657ff6b90b5c73d359 fix(react): avoid first listener duplicate selector notify
```

## Commands Run

```text
bundle_preflight:
- rtk ./logix-runtime-store-selector-notify-requirements-bundle/scripts/validate_bundle_structure.sh: PASS
- rtk ./logix-runtime-store-selector-notify-requirements-bundle/scripts/copy_into_repo.sh: PASS
- rtk ./logix-runtime-store-selector-notify-requirements-bundle/scripts/list_focused_commands.sh: PASS
- rtk ./logix-runtime-store-selector-notify-requirements-bundle/scripts/print_evidence_commands.sh: PASS

focused_tests:
- rtk pnpm -C packages/logix-core test test/Runtime/Runtime.selectorNotifyFanout.contract.test.ts test/Runtime/Runtime.selectorBroadcastFallbackReason.contract.test.ts test/internal/Runtime/RuntimeStore.notifyFastPath.contract.test.ts: PASS
- rtk pnpm -C packages/logix-react test test/internal/store/RuntimeExternalStore.runSyncFallback.contract.test.tsx test/internal/store/RuntimeExternalStore.topicRetainRelease.contract.test.tsx test/Hooks/useSelector.renderFanout.contract.test.tsx: PASS
- rtk pnpm -C packages/logix-react test test/Hooks/useSelector.RuntimeStoreSnapshot.contract.test.tsx: PASS
- rtk pnpm -C packages/logix-react test test/internal/store/RuntimeExternalStore.topicCleanup.contract.test.tsx: PASS
- rtk pnpm -C packages/logix-react test test/Contracts/ReactSelectorRouteOwner.guard.test.ts test/Contracts/ReactSelectorStoreResidue.guard.test.ts: PASS
- rtk pnpm -C packages/logix-perf-evidence test scripts/ci.selector-notify-tax-report.test.ts: PASS
- rtk pnpm -C packages/logix-perf-evidence typecheck: PASS

evidence:
- rtk pnpm perf diff -- --before specs/219-runtime-store-no-tearing-focused-evidence-gate/perf/before.runtimeStore.efd21e85.local-darwin-arm64.default.json --after specs/219-runtime-store-no-tearing-focused-evidence-gate/perf/after.runtimeStore.7d1c332e.local-darwin-arm64.default.json --out specs/219-runtime-store-no-tearing-focused-evidence-gate/perf/diff.runtimeStore.efd21e85__7d1c332e.local-darwin-arm64.default.json: PASS
- rtk pnpm perf ci:selector-notify-tax-report -- --diff specs/219-runtime-store-no-tearing-focused-evidence-gate/perf/diff.runtimeStore.efd21e85__7d1c332e.local-darwin-arm64.default.json --before specs/219-runtime-store-no-tearing-focused-evidence-gate/perf/before.runtimeStore.efd21e85.local-darwin-arm64.default.json --after specs/219-runtime-store-no-tearing-focused-evidence-gate/perf/after.runtimeStore.7d1c332e.local-darwin-arm64.default.json --profile default --out specs/220-selector-notify-tax-migration-report-gate/perf/clean/report.md --json-out specs/220-selector-notify-tax-migration-report-gate/perf/clean/report.json: PASS

failed_or_skipped:
- Initial RuntimeExternalStore.runSyncFallback sentinel exposed first-listener duplicate notify before 7d1c332e.
- No focused commands intentionally skipped.
```

## Sentinel Status

```text
structural_sentinels: PASS; selector overlap, broadcast fallback reason, empty dirtyTopics, listener snapshot, runSync fallback, first listener, retain/release, unrelated render all covered.
allocation_sentinels: PASS; diagnostics-off and listener snapshot clone watched counters present, listenerSnapshotCloneCount=0 in final report.
no_tearing_status: PASS; runtimeStore.noTearing.tickNotify default profile produced 6 ok points before and after.
public_surface_status: PASS; no public API/root export/public config changes, React selector route owner/residue guards passed.
```

## Evidence

```text
pre_wave_head: 926fdeaa26a40bd7fd4ccca4a87efa2fdd5af20d
measurement_anchor: efd21e85a06ba70fdc5045d7317baeee6026dfa5
implementation_head: 7d1c332e8177753e3f4369657ff6b90b5c73d359
before_artifact: specs/219-runtime-store-no-tearing-focused-evidence-gate/perf/before.runtimeStore.efd21e85.local-darwin-arm64.default.json
after_artifact: specs/219-runtime-store-no-tearing-focused-evidence-gate/perf/after.runtimeStore.7d1c332e.local-darwin-arm64.default.json
diff_artifact: specs/219-runtime-store-no-tearing-focused-evidence-gate/perf/diff.runtimeStore.efd21e85__7d1c332e.local-darwin-arm64.default.json
report_artifact: specs/220-selector-notify-tax-migration-report-gate/perf/clean/report.md
report_json: specs/220-selector-notify-tax-migration-report-gate/perf/clean/report.json
classification: tax_removed
claim_strength: hard
```

## Risk / Cost Migration

```text
migrated_cost: none observed in watched selector notify counters.
migrated_risk: hard claim is scoped to focused selector notify path only.
observed_phase_or_counter_increase: none; notifiedTopicCount stable 10, renderCount stable 0, runSyncFallbackCount stable 0, retainedTopicCount stable 256, listenerSnapshotCloneCount stable 0, broadcastFallbackCount stable 0.
required_follow_up: use 7d1c332e plus final handoff/report artifacts as the next perf anchor for any future broad matrix claim.
```

## Claims

Allowed:
- Focused validation passed for `212-runtime-store-selector-notify-tax-wave` if all focused tests pass.
- Structural guard added/confirmed for this specific notify tax point.

Forbidden:
- Global Runtime performance improved.
- No regressions exist globally.
- React performance improved globally.
- Selector notification path is optimal.

## Next Recommended Spec

```text
next_spec: none inside 212-220
reason: wave closed; further global claims require a separate broad/default or soak evidence spec.
```
