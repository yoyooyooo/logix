# Pressure Knob Runtime Map

Use this file when planning a requirement, interpreting a regression, or choosing the next focused implementation step.

Pressure knobs are CI/perf-evidence workload axes. They are not public runtime config and must not be promoted into `@logixjs/core`, `@logixjs/react`, or `Runtime.make` options without a separate runtime SSoT decision.

The machine-readable CI/report mapping lives in `packages/logix-perf-evidence/scripts/lib/kernel-performance-observability.ts`.

## Map

| Pressure knob | Runtime owner | Typical files / proof areas |
| --- | --- | --- |
| `steps` | transaction commit / scheduler | `ModuleRuntime.*`, `StateTransaction.*`, `TickScheduler.*`, perf-boundary browser tests |
| `dirtyRootsRatio` | dirtyPlan / source / selector | `StateTransaction.*`, field kernel tests, source dirty gate tests, selector fallback tests |
| `mutationPattern` | dirty precision | kernel fallback reason tests, dirtyPlan sentinels, negative-boundary matrix cells |
| `selectorFanout` | selector graph / notify | `selectorRoute.*`, `RuntimeStore.*`, React selector tests |
| `sourceListWidth` | source/list evidence | source ingest, list scope checks, string normalization sentinels |
| `diagnosticsLevel` | diagnostics | diagnostics-off sentinels, overhead reports, debug payload counters |
| `storeTopicCount` | RuntimeStore | topic fanout, retained topics, listener snapshots, no-tearing notify |
| `txnQueueBacklog` | txn queue / lane policy | `ModuleRuntime.txnQueue.*`, urgent backlog, direct idle counters |
| `reactMode` | React host | `RuntimeExternalStore`, strict/suspense browser tests, render/commit counters |
| `playgroundNoise` | examples/playground isolation | examples runtime witness, live carrier, playground noise logs |

## Required Mapping Per Step

Before implementing, write:

```text
owner path:
pressure knob:
expected counter movement:
primary metric:
forbidden migration:
test target:
CI artifact target:
```

## Migration Examples

- Dirty precision improves but `selector.evaluateAll` rises: possible cost migration from dirtyPlan to selector.
- Txn queue improves but React render count rises: possible migration into host subscription.
- Diagnostics overhead falls while `diagnosticsOff.payloadCount` is missing: evidence hole, not a valid win.
- Playground runtime witness passes while product playground logs fail: keep P2 logs but do not mix product/editor cost into kernel claim.

## Counter Handling

Use counter states as facts:

```text
missing -> evidence hole
0       -> absence proven for recorded scope
>0      -> fallback/risk occurred
```

Never replace missing counters with zero. Add real collection, sentinel mapping, or counter census entries instead.
