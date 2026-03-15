# 2026-03-06 · R-1 失败收口：late enqueue 主要卡在 handler invoke 之前

本记录对应 `R-1` 在 observation-first 之后的一次 **docs/evidence-only** 收口。

## 结论

- 这次没有提交 runtime 刀。
- 我们把 `late enqueue` 再拆了一层：不是只看 `txnQueue` 的 enqueue/start，而是继续看 **浏览器 schedule -> React handler invoke -> runtime enqueue/start**。
- 最新 targeted evidence 表明：当前主要延迟不在 `enqueueTransaction` / baton 交接内部，而在 **handler 真正调用 `module.actions.*` 之前**。
- 因此，在当前允许改动的 queue/runtime 落点内，**没有足够证据支持继续落一刀 runtime policy**；继续改 queue window/handoff 只会重走已失败方向。

## 这次最小 observation 落了什么

只在 `packages/logix-react/test/browser/perf-boundaries/txn-lanes.test.tsx` 增加两类 handler 入口时点：

- backlog 按钮真正调用 `module.actions.setA` 的时刻
- urgent 按钮真正调用 `module.actions.urgent` 的时刻

然后把它们和已有 `txnQueue.*` evidence 拼起来，新增：

- `txnQueue.backlog.firstNonUrgent.invokeOffsetFromBacklogMs`
- `txnQueue.backlog.firstNonUrgent.enqueueDelayFromInvokeMs`
- `txnQueue.backlog.firstNonUrgent.startDelayFromInvokeMs`
- `txnQueue.urgent.invokeDelayFromScheduleMs`
- `txnQueue.urgent.enqueueDelayFromInvokeMs`
- `txnQueue.urgent.startDelayFromInvokeMs`
- `txnQueue.urgent.invokeVsFirstNonUrgentStartMs`

## 证据

- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.r1-late-enqueue-v5.invoke-observation.txn-lanes.targeted.json`

## 关键结果（`mode=default`）

### `steps=200`

- `urgent.p95`: `54.2ms`
- `backlog.firstNonUrgent.invokeOffsetFromBacklogMs`: `32.0ms`
- `backlog.firstNonUrgent.enqueueDelayFromInvokeMs`: `0.6ms`
- `urgent.invokeDelayFromScheduleMs`: `26.6ms`
- `urgent.enqueueDelayFromInvokeMs`: `0.1ms`
- `urgent.invokeVsFirstNonUrgentStartMs`: `41.1ms`
- `urgent.queueWaitMs`: `0ms`

### `steps=800`

- `urgent.p95`: `53.5ms`
- `backlog.firstNonUrgent.invokeOffsetFromBacklogMs`: `29.1ms`
- `backlog.firstNonUrgent.enqueueDelayFromInvokeMs`: `0.7ms`
- `urgent.invokeDelayFromScheduleMs`: `28.1ms`
- `urgent.enqueueDelayFromInvokeMs`: `0.1ms`
- `urgent.invokeVsFirstNonUrgentStartMs`: `40.0ms`
- `urgent.queueWaitMs`: `0ms`

### `steps=2000`

- `urgent.p95`: `53.6ms`
- `backlog.firstNonUrgent.invokeOffsetFromBacklogMs`: `28.1ms`
- `backlog.firstNonUrgent.enqueueDelayFromInvokeMs`: `0.8ms`
- `urgent.invokeDelayFromScheduleMs`: `28.5ms`
- `urgent.enqueueDelayFromInvokeMs`: `0.1ms`
- `urgent.invokeVsFirstNonUrgentStartMs`: `43.7ms`
- `urgent.queueWaitMs`: `0ms`

## 解释

这组数字说明两件事：

1. **non-urgent 一旦进入 handler，就几乎立刻被 runtime 看见并启动**
   - `invoke -> enqueue/start` 只有 `0.6~0.8ms`
2. **urgent 一旦进入 handler，也几乎立刻被 runtime 看见并启动**
   - `invoke -> enqueue/start` 只有 `0.1ms`

真正大的空档在：

- backlog：`backlogStartedAt -> setA handler invoke` 约 `28~32ms`
- urgent：`urgentScheduledAt -> urgent handler invoke` 约 `26.6~28.5ms`

而且：

- `urgent.invokeVsFirstNonUrgentStartMs` 与 `urgent.enqueueVsFirstNonUrgentStartMs` 基本重合
- `urgent.queueWaitMs = 0`

这意味着当前的 `late enqueue`，主因不是：

- urgent 已到 runtime，但卡在 `enqueueTransaction` 之前的 queue blind spot
- urgent 已排进 queue，但拿不到 baton

而是：

- **浏览器 / click 仿真 / handler invoke 本身就让 urgent 到 runtime 的时间晚了几十毫秒**

## 裁决

- 本轮按 **docs/evidence-only** 收口，不提交 runtime 实现代码。
- 在当前 harness / 当前 write scope 下，禁止继续重试：
  - blind first-host-yield
  - startup-phase 策略化
  - handoff-lite 原样重试
  - remembered-pressure pre-urgent cap 原样重试
  - post-urgent visibility window / enqueueTransaction blind-spot 微调
  - 只在 handoff 后半段继续磨常数

## 对 R-1 下一步的意义

如果还要继续 `R-1`，方向必须前移到 queue 之前：

- 要么改 browser / React / benchmark control-surface，让 urgent 更早到达 handler
- 要么扩大实现边界，允许讨论“queue 之前”的 admission model，而不是继续只动 `txnQueue`

在没有这类更早层证据或更大写权限之前，继续在 `ModuleRuntime.txnQueue.ts` / `ModuleRuntime.impl.ts` 上补 policy，不值得。

## 验证

- `pnpm -C packages/logix-react typecheck:test`
- `VITE_LOGIX_PERF_PROFILE=quick pnpm perf collect -- --profile quick --files test/browser/perf-boundaries/txn-lanes.test.tsx --out specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.r1-late-enqueue-v5.invoke-observation.txn-lanes.targeted.json`
