# Evidence Protocol

## Layers

### Layer 1 — Structural Sentinels

Required counters/sentinels:

```text
unrelatedExactDirty.notifiedTopicCount = 0
exactOverlap.notifiedTopicCount <= overlapTopicCount
broadcastFallback.reason != undefined
runSyncFallbackCount.activeCommittedSnapshot = 0
firstListenerDuplicateNotifyCount = 0
retainedTopicCount.afterUnmount = 0
listenerSnapshotCloneCount.unchangedSubscribers = 0
renderCount.unrelatedExactSelector = 0 or unchanged
```

### Layer 2 — Focused Local Tests

Run focused core/react tests from `scripts/list_focused_commands.sh`.

### Layer 3 — Same-Commit Diagnostics

Optional. Useful only for local localization. Must not enter public Runtime config.

### Layer 4 — Comparable Before/After

Use default profile for focused browser suites:

```bash
pnpm perf collect -- --profile default   --files test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx   --out specs/219-runtime-store-no-tearing-focused-evidence-gate/perf/before.runtimeStore.<sha>.<envId>.default.json

pnpm perf collect -- --profile default   --files test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx   --out specs/219-runtime-store-no-tearing-focused-evidence-gate/perf/after.runtimeStore.<sha-or-dev>.<envId>.default.json

pnpm perf diff --   --before <before.json>   --after <after.json>   --out specs/219-runtime-store-no-tearing-focused-evidence-gate/perf/diff.runtimeStore.before__after.<envId>.default.json
```

Optionally repeat for:

```text
test/browser/perf-boundaries/negative-dirty-pattern.test.tsx
test/browser/perf-boundaries/selector-render-fanout.test.tsx
```

### Layer 5 — Tax Migration Report

Run:

```bash
pnpm perf ci:selector-notify-tax-report --   --diff <diff.json>   --before <before.json>   --after <after.json>   --profile default   --out specs/220-selector-notify-tax-migration-report-gate/perf/report.selectorNotify.<envId>.default.md   --json-out specs/220-selector-notify-tax-migration-report-gate/perf/report.selectorNotify.<envId>.default.json
```

## Claim Rules

- `quick` is clue-only.
- same-commit A/B is clue-only unless followed by comparable before/after.
- `stable_guarded` may claim structural fanout closure, not performance improvement.
- `tax_removed` may claim focused selector notify path improvement.
- No outcome may claim global Runtime or React performance.
