# 2026-03-29 · post-merge big-cut candidates

## Scope

- base:
  - `main@d26a8628`
- goal:
  - after `effect-v4` and `TX-C1` are already in `main`, identify the next round of high-leverage cuts
  - prefer long-chain compression over single-point micro tuning

## Current Probe Snapshot

- `compiled_txn_boundary`
  - current status: `no_go`
  - cheap-local gate 已证明 boundary 内部上界小于外层 residual，不再继续升为 runtime 实施线
  - reading:
    - `/Users/yoyo/Documents/code/personal/logix.worktrees/main.compiled-txn-boundary-probe/docs/perf/2026-03-29-compiled-txn-boundary-probe.md`
- `selector_snapshot_mirror_plane`
  - current status: `inconclusive_after_focused_local_compare`
  - strengthened probe 已证明 React + Flow 平面没有出现消费面放大；Module-as-Source probe 给出 `1 / 8 / 32` 线性信号；non-React plane dedupe PoC 已把 Module-as-Source 与 declarative-link fanout 都压到常数；`selectorId collision` 与 `shallowStruct` gate 已补齐；但 focused local compare 还没给出稳定 route-level 收益
  - reading:
    - `/Users/yoyo/Documents/code/personal/logix.worktrees/main.selector-snapshot-mirror-probe/docs/perf/2026-03-29-selector-snapshot-mirror-probe.md`
    - `/Users/yoyo/Documents/code/personal/logix.worktrees/main.selector-moduleasource-probe/docs/perf/2026-03-29-selector-moduleasource-probe.md`
    - `/Users/yoyo/Documents/code/personal/logix.worktrees/main.selector-moduleasource-probe/docs/perf/2026-03-29-selector-nonreact-dedupe-poc.md`
    - `/Users/yoyo/Documents/code/personal/logix.worktrees/main.selector-moduleasource-probe/docs/perf/2026-03-29-selector-nonreact-focused-compare.md`
- `commit_packet_notify_fusion`
  - current status: `no_go_under_zero_selector_packet_gate`
  - tighter synthetic gate 已把 packet 本体压到微秒级；当前不值得升为新的大切口
  - reading:
    - `/Users/yoyo/Documents/code/personal/logix.worktrees/main.commit-packet-notify-probe/docs/perf/2026-03-29-commit-packet-notify-probe.md`

## Ranked strategic candidates

### 1. `compiled_txn_boundary`

- current probe status:
  - `no_go`

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

- current probe status:
  - `inconclusive_after_focused_local_compare`

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
- current continuation rule:
  - React + Flow 平面已判 flat；当前 non-React plane PoC 已正向，但 focused local compare 未给出稳定收益；暂不升 PR / CI

### 3. `commit_packet_notify_fusion`

- current probe status:
  - `no_go_under_zero_selector_packet_gate`

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
- current continuation rule:
  - 当前不继续沿旧 loose aggregate 深挖；若重开，只能从 tighter same-path browser evidence 重启

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
- `selector_snapshot_mirror_plane` 与 `commit_packet_notify_fusion` 的最新 probe 都说明：只要 gate 口径不够窄，就会给出假阳性或夸大候选体量
- so the next step is not direct implementation; only narrower probe remains on the selector non-React planes
