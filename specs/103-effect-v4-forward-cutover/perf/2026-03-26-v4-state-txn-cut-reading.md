# 2026-03-26 v4 state-txn cut reading

## 本轮实现

文件：

- `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`

两刀：

1. commit dirty snapshot ownership transfer
   - committed transaction 直接接管 materialized dirty snapshot
   - scratch 在 commit 后切到新数组
   - 去掉 commit 时对大 dirty array 的额外 `slice()`
2. materialize snapshot reuse
   - `materializeDirtyPathSnapshotAndKey()` 不再 `Array.from(set)`
   - 改为复用 scratch array 原地填充

语义回归：

- `test/internal/Runtime/StateTransaction.LazyDirtySnapshot.test.ts`
- `test/internal/Runtime/StateTransaction.SingleDirtyPathKey.test.ts`

均通过。

## node focused quick 结果

矩阵：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-26-converge-band-075-080.node-matrix.json`

工件：

- 第一刀后 after:
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-26-traitConverge-node.band-075-080.after.state-txn-ownership.local.quick.json`
- 第二刀后 after:
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-26-traitConverge-node.band-075-080.after.state-txn-snapshot-reuse.local.quick.json`
- clean `v4-perf` baseline:
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-26-traitConverge-node.band-075-080.before.main.quick.json`

diff：

- 第一刀 vs clean:
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-26-traitConverge-node.band-075-080.clean-v4perf-vs-state-txn-ownership.local.quick.diff.json`
- 第二刀 vs第一刀:
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-26-traitConverge-node.band-075-080.state-txn-ownership-vs-snapshot-reuse.local.quick.diff.json`
- 第二刀 vs clean:
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-26-traitConverge-node.band-075-080.clean-v4perf-vs-state-txn-snapshot-reuse.local.quick.diff.json`

关键读数：

- 第二刀相对第一刀继续改善
  - `full 1600 @ 0.75: p95 1.226 -> 0.779`
  - `full 2000 @ 0.75: p95 1.324 -> 0.906`
  - `full 2000 @ 0.8: p95 1.225 -> 0.883`
  - `auto 2000 @ 0.75: p95 1.050 -> 0.808`
  - `auto 2000 @ 0.8: p95 1.136 -> 0.805`

第二刀相对 clean baseline 的状态：

- `full 1600 @ 0.75: 0.785 -> 0.779`
- `auto 1600 @ 0.75: 0.911 -> 0.767`
- `auto 1600 @ 0.8: 0.725 -> 0.720`
- `full 2000 @ 0.75: 1.079 -> 0.906`
- `full 2000 @ 0.8: 1.078 -> 0.883`
- `auto 2000 @ 0.8: 0.817 -> 0.805`
- 唯一仍略高的是：
  - `auto 2000 @ 0.75: 0.801 -> 0.808`

## browser focused bridge 结果

probe：

- `packages/logix-react/test/browser/perf-boundaries/converge-band-075-080-bridge.local.test.tsx`

当前读数：

- ascending
  - `1600 @ 0.75: delta p95 +0.054`
  - `2000 @ 0.75: delta p95 +0.024`
  - `2000 @ 0.8: delta p95 +0.010`
- descending
  - `1600 @ 0.75: delta p95 +0.066`
  - `2000 @ 0.75: delta p95 +0.056`
  - `2000 @ 0.8: delta p95 +0.030`

结论：

- focused browser band 仍然稳定贴边
- 没有出现 soak 那种高 dirty 门线换位

## ModuleRuntime.transaction attribution

probe：

- `packages/logix-react/test/browser/perf-boundaries/converge-internal-highband-plain-vs-cont.local.test.tsx`

结果：

- `1600 @ 0.75: withContinuation p95 比 plain 低 ~0.122`
- `2000 @ 0.75: withContinuation p95 比 plain 低 ~0.078`
- `2000 @ 0.8: withContinuation p95 比 plain 低 ~0.132`

补充：

- `dispatch` 热路径本身已经持有 `cachedDispatchTxnContinuationHandle`
- 所以 `ModuleRuntime.transaction` 的 continuation shell 目前更像收益项，不是当前主因

## 当前裁决

- 当前两刀 `StateTransaction` cut 已经显著压小 shared full-path / bookkeeping 税
- focused node quick 基本回到 clean `v4-perf` baseline
- browser focused bridge 也稳定
- 下一步应回到 `converge-steps soak` 做 targeted rerun，验证大盘是否跟随回落
