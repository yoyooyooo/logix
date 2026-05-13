# RuntimeStore / Selector Notify Tax Ledger

## First-Order Tax Points

| Tax | Owner | Primary Sentinel | Evidence Surface |
|---|---|---|---|
| selector dirty/read fanout | `SelectorGraph` | unrelated exact dirty marks zero selector topics | `Runtime.selectorNotifyFanout.contract` |
| broadcast fallback | `selectorRoute.dirty` | fallback reason required | `Runtime.selectorBroadcastFallbackReason.contract` |
| listener snapshot clone | `RuntimeStore` | unchanged subscribers reuse snapshot | `RuntimeStore.listenerSnapshot` |
| callback empty path | `RuntimeStore` | no callback when dirtyTopics empty | `RuntimeStore.notifyFastPath` |
| runSync fallback | `RuntimeExternalStore` | committed snapshot path fallback count zero | `RuntimeExternalStore.runSyncFallback` |
| retained topic leak | `RuntimeExternalStore.hotLifecycle` / `RuntimeStore` | retainedTopicCount returns zero | `topicRetainRelease` |
| React render fanout | `useSelector` | unrelated exact selectors do not render | `useSelector.renderFanout` |

## Second-Order Migration Points

```text
selectorEvalCount rises
renderCount rises
runSyncFallbackCount rises
retainedTopicCount rises
listenerSnapshotCloneCount rises
broadcastFallbackCount rises
commitPublishMs rises
tickNotify p95 improves but no-tearing fails
```

Any rise above expected bounds must be recorded as `migrated_cost` unless explicitly justified.
