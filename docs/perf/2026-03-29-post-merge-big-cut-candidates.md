# 2026-03-29 · post-merge big-cut candidates

## Scope

- base:
  - `main@d26a8628`
- goal:
  - after `effect-v4` and `TX-C1` are already in `main`, identify the next round of high-leverage cuts
  - prefer long-chain compression over single-point micro tuning

## Ranked strategic candidates

### 1. `compiled_txn_boundary`

- before chain:
  - `enqueueTransaction`
  - `runOperation(entry)`
  - `runWithStateTransaction(begin/prelude)`
  - `bodyShell + asyncEscapeGuard`
  - `converge`
  - `scopedValidate + sourceSync`
  - nested `runOperation(state:update) + commitWithState`
- after shape:
  - one compiled transaction boundary
  - one entry op
  - direct sync reducer/writeback -> converge -> validate/sourceSync -> commit
  - no nested `state:update` operation shell
- why big:
  - this is the common outer shell for dispatch, watcher writeback and external-store writeback
  - it attacks shared chain length, not a local constant
- cheap local gate:
  - node-only
  - dispatch-shell microbench
  - async-escape guard microbench
  - target `dispatch.p95 / residual.avg / bodyShell / asyncEscapeGuard` all down together

### 2. `selector_snapshot_mirror_plane`

- before chain:
  - `StateTransaction.commit`
  - `SubscriptionRef.set`
  - `commitHub`
  - `SelectorGraph.select`
  - selector pubsub
  - `TickScheduler.markTopicDirty`
  - `RuntimeStore.bumpVersion`
  - React `getSnapshot()` and re-select
  - parallel re-select from Module-as-Source / Flow / process consumers
- after shape:
  - one selector engine computes once per commit
  - `RuntimeStore` carries module snapshot + selector snapshot/value/version
  - React / Flow / process / Module-as-Source consume one shared selector mirror
- why big:
  - current cost is close to `commit × active selectors × consumer planes`
  - this is wider than the service-shell family
- cheap local gate:
  - count-only probe first
  - one module + one static selector + React 256 subscribers + one Module-as-Source link + one Flow/process consumer
  - verify per-commit actual selector evaluations collapse toward `1`

### 3. `commit_packet_notify_fusion`

- before chain:
  - `commitWithState`
  - `runPostCommitPhases`
  - `selectorGraph.onCommit`
  - `TickScheduler.enqueue/scheduleTick`
  - `flushTick`
  - `RuntimeStore.commitTick`
  - `RuntimeExternalStore.notify`
- after shape:
  - one commit packet
  - one notify window
  - normal module commit skips the full scheduler path
- why big:
  - this directly targets the post-commit fanout half of the chain
- cheap local gate:
  - phase metrics first
  - then one targeted browser `external-store-ingest`

## Explicit non-candidate

### `111`-parallel big cut

- current decision:
  - `no_candidate`
- reason:
  - if a next large decision-kernel cut exists, it already belongs inside `111`
  - current evidence still does not upgrade `111` to `controller_related`

## Skeptical note

- the biggest misread to avoid is turning a microbench-visible shell gap into an immediate runtime implementation cut
- `provideInlineContext` no-go is the current proof of that risk
- so the next step is probe-first on top1/top2, not direct implementation
