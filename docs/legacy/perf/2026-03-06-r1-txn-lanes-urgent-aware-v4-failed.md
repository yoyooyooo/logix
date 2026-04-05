# 2026-03-06 · R-1 失败试验：post-urgent visibility window

本记录对应 `txnLanes` 主线在 **current-head 干净分支** 上的一次最小 queue-timing 试探。

## 本次最小方案

本轮没有继续碰 `budgetMs / chunkSize / maxLagMs`，也没有回到旧失败方向。

实际验证的是一版更窄的 queue-level handoff：
- 只改 `txnQueue / enqueueTransaction` 的启动时序，不改公共 API
- 当 queue 从 `urgent -> nonUrgent` 切换时，先给一次受控的 `host-visibility window`
- 这个 window 同时覆盖两种路径：
  - `urgent` 刚结束、首个 `nonUrgent` 此时才入队
  - `urgent` 结束前，首个 `nonUrgent` 已经在队列里等 baton
- 不做 `blind first-host-yield`
- 不把 `startup-phase` 显式落成正式策略
- 不做 `handoff-lite` 的 cancel/requeue
- 不重试 remembered-pressure pre-urgent cap

换句话说，这一刀要回答的是：
- 不等“已经看到 urgent waiter 再让路”
- 而是在 `txnQueue` 的 `urgent -> nonUrgent` 交棒点上，主动让 host 上已经排队的 urgent 更早被 runtime 看见

## 结论

- 这版 `post-urgent visibility window` **不值得保留**。
- 它不是纯负收益：`run3` 曾把 `mode=default` 三档一起压回 `50ms` 线内。
- 但 `run4` 又把 `mode=default` 三档同时拉回 `53.8 / 54.8 / 53.7ms`。
- 这说明收益依赖 browser/event-loop 时序，**不可复现**。
- 因此本线只保留 docs/evidence；runtime 代码已清回 branch HEAD。

## 证据

baseline：
- `specs/103-effect-v4-forward-cutover/perf/s2.before.local.quick.r1urgent-aware-v4.currenthead.txn-lanes.targeted.json`

最终候选的 2 轮 after：
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.r1urgent-aware-v4.run3.txn-lanes.targeted.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.r1urgent-aware-v4.run4.txn-lanes.targeted.json`

strict diff：
- `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.r1urgent-aware-v4.run3.txn-lanes.strict.targeted.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.r1urgent-aware-v4.run4.txn-lanes.strict.targeted.json`

## 关键结果

before：
- `default 200`: `50.2ms`
- `default 800`: `51.0ms`
- `default 2000`: `45.5ms`
- `off 200`: `53.0ms`
- `off 800`: `52.9ms`
- `off 2000`: `51.4ms`

after run3：
- `default 200`: `49.8ms`
- `default 800`: `46.7ms`
- `default 2000`: `50.0ms`
- `off 200`: `49.4ms`
- `off 800`: `50.2ms`
- `off 2000`: `49.9ms`

after run4：
- `default 200`: `53.8ms`
- `default 800`: `54.8ms`
- `default 2000`: `53.7ms`
- `off 200`: `51.3ms`
- `off 800`: `61.5ms`
- `off 2000`: `61.7ms`

最关键的稳定性问题：
- `mode=default, steps=200`: `50.2 -> 49.8 / 53.8ms`
- `mode=default, steps=800`: `51.0 -> 46.7 / 54.8ms`
- `mode=default, steps=2000`: `45.5 -> 50.0 / 53.7ms`

换句话说：
- `run3` 证明 queue handoff 的确有机会把 `default` 三档一起压回门内
- 但 `run4` 又把同一条线整体拉回门外，而且不是单点抖动，而是三档一起坏

## 为什么失败

这版 `post-urgent visibility window` 的问题，不是它完全没有帮助，而是它仍然在和 browser turn ordering 绑定：
- 当 host-visibility window 恰好让 queued urgent 在首个 non-urgent baton 前入队时，结果会显著变好
- 但它没有提供更强的“urgent 已被看见”的内部事实源，只是把一次 host 调度窗口前移到了 `urgent -> nonUrgent` 交棒点
- 一旦这一拍没对上，runtime 就会同时吃到：
  - queue handoff 的额外等待
  - backlog 首片仍然先跑出去的坏情况

因此这刀更像：
- 比 `blind first-host-yield` 更聚焦
- 比 `handoff-lite` 更便宜
- 但仍然不是可以稳定交付的 policy

## 裁决

- `R-1` 主线继续保持打开。
- 但本次的 `post-urgent visibility window` 应明确列入失败子尝试，不保留 runtime 代码。
- 后续若继续 `R-1`，不要原样重试这版：
  - `txnQueue` 的 `urgent -> nonUrgent` host-visibility handoff
- 下一轮如果还要继续，应优先补更细的 `txnQueue/enqueueTransaction` 观测：
  - enqueue 时刻 vs start 时刻
  - 首个 `nonUrgent` 到底是在 `urgent` 完成前还是完成后入队
  - urgent 是否已经进入 queue，只是没抢到 baton；还是根本还没被 runtime 看见
- 在没有这类更细 observation 之前，不要再把“前移一拍 host 窗口”直接固化成正式 policy。
