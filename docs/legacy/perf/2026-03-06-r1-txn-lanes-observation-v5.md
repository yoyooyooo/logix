# 2026-03-06 · R-1 observation cut：txnQueue start evidence

本记录对应 `R-1` 在 `urgent-aware v4` 失败之后的一次 observation-first 收口。

## 结论

- 这次是 **observation 刀**，不是 runtime 提速刀。
- 当前 `txn-lanes` targeted 已经能直接导出 `txnQueue.*` 证据，用来回答：
  - urgent 是不是已经进 queue 但抢不到 baton
  - 还是根本在第一片 non-urgent backlog 跑起来之后，才被 enqueue / start
- 本轮 evidence 指向很明确：在 `mode=default` 下，当前主要问题更像 **late enqueue**，不是 **queued waiter**。

## 这次落了什么

- `txnQueue` 在 transaction 真正开始执行时，发出一条 slim `trace:txn-queue` start 事件。
- 事件字段只保留 queue 事实：
  - `enqueueAtMs`
  - `startAtMs`
  - `queueWaitMs`
  - `startMode`
  - `visibilityWindowMs`
  - `previousCompletedLane`
  - `activeLaneAtEnqueue`
  - `queueDepthAtStart`
- `packages/logix-react/test/browser/perf-boundaries/txn-lanes.test.tsx` 会把这些 trace 汇总成 `txnQueue.*` evidence，直接写进 targeted perf report。

## 证据

- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.r1observation-v5.run2.txn-lanes.targeted.json`

## 关键观测（`mode=default`）

在本次 quick targeted report 里：

- `steps=200`
  - `urgent.p95`: `46.4ms`
  - `txnQueue.urgent.enqueueVsFirstNonUrgentStartMs`: `37.7ms`
  - `txnQueue.urgent.queueWaitMs`: `0ms`
  - `txnQueue.urgent.diagnosis.lateEnqueue`: `1`
  - `txnQueue.urgent.diagnosis.queuedWaiter`: `0`
- `steps=800`
  - `urgent.p95`: `50.2ms`
  - `txnQueue.urgent.enqueueVsFirstNonUrgentStartMs`: `35.1ms`
  - `txnQueue.urgent.queueWaitMs`: `0ms`
  - `txnQueue.urgent.diagnosis.lateEnqueue`: `1`
  - `txnQueue.urgent.diagnosis.queuedWaiter`: `0`
- `steps=2000`
  - `urgent.p95`: `49.9ms`
  - `txnQueue.urgent.enqueueVsFirstNonUrgentStartMs`: `42.7ms`
  - `txnQueue.urgent.queueWaitMs`: `0ms`
  - `txnQueue.urgent.diagnosis.lateEnqueue`: `1`
  - `txnQueue.urgent.diagnosis.queuedWaiter`: `0`

共同模式：
- `txnQueue.urgent.previousCompletedLane.nonUrgent = 1`
- `txnQueue.urgent.queueDepthAtStart.nonUrgent = 0`
- `txnQueue.urgent.startMode.directHandoff = 1`

这组组合说明：
- urgent 大多数时候不是“已经排进 queue，但被正在运行的 non-urgent slice 卡住很多毫秒”
- 更像是“first non-urgent slice 已经开始，甚至完成了一次 handoff，urgent 才进入 queue 并直接拿到下一棒”

## 对下一刀的意义

因此，下一轮 runtime 刀不应该继续做：
- post-waiter handoff
- blind host yield
- chunk/budget 常数细磨

而应该优先做：
- **让 urgent 更早被 enqueue / 更早被 runtime 看见**
- 或者让 backlog 启动前后，runtime 能更早观察到“host 上已有 urgent 将至”的事实源

一句话裁决：
- 当前更像 `urgent seen too late`
- 不是 `urgent queued but starved`

## 验证

- `pnpm -C packages/logix-core typecheck`
- `pnpm -C packages/logix-react typecheck:test`
- `VITE_LOGIX_PERF_PROFILE=quick pnpm perf collect -- --profile quick --files test/browser/perf-boundaries/txn-lanes.test.tsx --out specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.r1observation-v5.run2.txn-lanes.targeted.json`
