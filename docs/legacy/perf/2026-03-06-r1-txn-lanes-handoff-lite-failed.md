# 2026-03-06 · R-1 失败试验：urgent-aware handoff-lite

本记录对应 `txnLanes` 主线在 **current-head 干净分支** 上的一次最小重落。

目标是验证一版去掉 blind host yield 的 `R-1` 最小方案：
- `txnQueue snapshot -> urgent-aware handoff`
- `preUrgentChunkCapActive + preUrgentMaxChunkSize`
- `urgent_waiter` 时的 requeue / handoff
- 不保留 blind first-host-yield

## 结论

- 这版 handoff-lite **不值得保留**。
- 它虽然保留了 `urgent-aware` 方向，但在 current-head 的 3-run targeted audit 里，`mode=default` 的关键档位稳定变差。
- 更糟的是，`steps=2000` 的 catch-up 也被显著拉坏；这不是“边缘噪声”，而是明确的策略负收益。
- 因此本次只保留 docs/evidence，不落代码。

## 方案说明

本轮实际验证的最小实现是：
- 给 `txnQueue` 增加只读 backpressure snapshot，用来观察 urgent waiter / queued
- non-urgent backlog 启动期先把 chunk cap 压到 `2`
- 一旦观察到 urgent waiter，立即取消本轮 non-urgent flush，并重新 `Queue.offer(...)` 让 backlog 之后再跑
- 诊断里新增 `urgent_waiter` yield reason，便于区分“预算让步”与“被 urgent 抢占”

刻意没有保留：
- blind first-host-yield
- 任何新的 API / policy surface

## 证据

基线：
- `specs/103-effect-v4-forward-cutover/perf/s2.before.local.quick.r1handoff-lite.currenthead.txn-lanes-urgent-aware.targeted.json`

3 轮 after：
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.r1handoff-lite.run1.txn-lanes-urgent-aware.targeted.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.r1handoff-lite.run2.txn-lanes-urgent-aware.targeted.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.r1handoff-lite.run3.txn-lanes-urgent-aware.targeted.json`

strict diff：
- `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.r1handoff-lite.run1.txn-lanes-urgent-aware.strict.targeted.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.r1handoff-lite.run2.txn-lanes-urgent-aware.strict.targeted.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.r1handoff-lite.run3.txn-lanes-urgent-aware.strict.targeted.json`

## 关键结果

before：
- `default 200`: `49.7ms`
- `default 800`: `50.2ms`
- `default 2000`: `53.0ms`
- `off 200`: `52.1ms`
- `off 800`: `50.2ms`
- `off 2000`: `62.3ms`

after run1：
- `default 200`: `51.5ms`
- `default 800`: `59.3ms`
- `default 2000`: `99.0ms`
- `off 200`: `53.7ms`
- `off 800`: `52.3ms`
- `off 2000`: `52.5ms`

after run2：
- `default 200`: `53.2ms`
- `default 800`: `58.2ms`
- `default 2000`: `99.5ms`
- `off 200`: `48.4ms`
- `off 800`: `54.1ms`
- `off 2000`: `49.3ms`

after run3：
- `default 200`: `51.7ms`
- `default 800`: `64.1ms`
- `default 2000`: `95.2ms`
- `off 200`: `51.6ms`
- `off 800`: `50.9ms`
- `off 2000`: `47.9ms`

最关键的稳定回归：
- `mode=default, steps=800`: `50.2 -> 59.3 / 58.2 / 64.1ms`
- `mode=default, steps=2000`: `53.0 -> 99.0 / 99.5 / 95.2ms`

catch-up 也被显著拉坏：
- `mode=default, steps=2000`: `99.4 -> 398.0 / 410.2 / 390.3ms`

## 为什么失败

这版方案的问题不是“看不到 urgent waiter”，而是：
- handoff 触发后会把 non-urgent backlog 切得过碎
- 在 `steps=800/2000` 档位，反复 cancel + requeue 让 catch-up 成本暴涨
- urgent 虽然偶尔受益于 `off` 档位的抢占，但 `default` 档位整体反而更不稳定

也就是说：
- `txnQueue snapshot` 本身不是问题
- `urgent_waiter` 诊断也不是问题
- 真正有问题的是“当前这版 handoff-lite policy 过早、过频繁地切断 non-urgent flush”

## 裁决

- `R-1` 仍然保持打开，但这版 handoff-lite 应明确列入失败子尝试。
- 后续若继续做 `urgent-aware`，必须避免直接复用这版 `preUrgent chunk cap + immediate handoff` 组合。
- 当前没有足够证据证明它值得作为代码提交，因此本分支只收口为 docs/evidence-only。
