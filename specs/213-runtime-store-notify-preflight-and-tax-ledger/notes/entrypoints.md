# RuntimeStore Selector Notify Entrypoints

## First-Order Notify Path

```text
ModuleRuntime transaction commit
  -> SelectorGraph.onCommit(state, meta, dirtyPlan, diagnosticsLevel, onSelectorChanged)
  -> TickScheduler.onSelectorChanged({ moduleInstanceKey, selectorFingerprint, priority })
  -> RuntimeStore.commitTick({ accepted.dirtyTopics })
  -> RuntimeExternalStore topic subscription
  -> useSelector via useSyncExternalStoreWithSelector
```

## Owner Map

| Tax point | Owner file | Focused sentinel |
| --- | --- | --- |
| selector dirty/read fanout | `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts` | `packages/logix-core/test/Runtime/Runtime.selectorNotifyFanout.contract.test.ts` |
| broadcast fallback reason | `packages/logix-core/src/internal/runtime/core/selectorRoute.dirty.ts` and `SelectorGraph.ts` | `packages/logix-core/test/Runtime/Runtime.selectorBroadcastFallbackReason.contract.test.ts` |
| dirty topic notify fast path | `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts` | `packages/logix-core/test/internal/Runtime/RuntimeStore.notifyFastPath.contract.test.ts` |
| listener snapshot isolation | `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts` | `packages/logix-core/test/internal/Runtime/RuntimeStore.listenerSnapshot.test.ts` |
| readQuery runSync fallback | `packages/logix-react/src/internal/store/RuntimeExternalStore.ts` | `packages/logix-react/test/internal/store/RuntimeExternalStore.runSyncFallback.contract.test.tsx` |
| first-listener duplicate notify | `packages/logix-react/src/internal/store/RuntimeExternalStore.ts` | `packages/logix-react/test/internal/store/RuntimeExternalStore.runSyncFallback.contract.test.tsx` |
| topic retain/release cleanup | `packages/logix-react/src/internal/store/RuntimeExternalStore.ts` and `RuntimeExternalStore.hotLifecycle.ts` | `packages/logix-react/test/internal/store/RuntimeExternalStore.topicRetainRelease.contract.test.tsx` |
| React unrelated render fanout | `packages/logix-react/src/internal/hooks/useSelector.ts` | `packages/logix-react/test/Hooks/useSelector.renderFanout.contract.test.tsx` |
| tax migration report pollution | `packages/logix-perf-evidence/scripts/ci.selector-notify-tax-report.ts` | `packages/logix-perf-evidence/scripts/ci.selector-notify-tax-report.test.ts` |

## Current Findings

- SelectorGraph already uses read-root indexing and exact dirty/read overlap to avoid unrelated topic fanout.
- RuntimeStore already skips empty `dirtyTopics`, reuses listener snapshots, and supports callback delivery without returning cloned listener arrays.
- RuntimeExternalStore had a first-listener duplicate notify gap: first listener subscribed to RuntimeStore before `retainReadQueryTopic` performed its initial selector dirty flush.
- The focused perf suite existed before this wave, but watched selector-notify counters and classifier did not.

## Evidence Boundaries

- The ledger is not a performance claim.
- `quick` artifacts remain clue-only.
- Hard selector-notify claims require the selector-notify report gate and comparable `default` or `soak` before/after evidence.
