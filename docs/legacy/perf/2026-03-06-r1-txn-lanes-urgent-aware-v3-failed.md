# 2026-03-06 · R-1 失败试验：urgent-aware remembered-pressure cap

本记录对应 `txnLanes` 主线在 **current-head 干净分支** 上的一次最小重落。

目标是在不重复以下已证伪路径的前提下，继续验证 `R-1`：
- 不做 `blind first-host-yield`
- 不把 `startup-phase` 显式切面直接固化成正式策略
- 不重试 handoff-lite 那版 `txnQueue snapshot + preUrgent chunk cap + urgent_waiter handoff/requeue`

## 本次最小方案

本轮实际验证的是一版更窄的 `urgent-aware handoff`：
- `txnQueue` 只暴露 slim `urgent waiter` snapshot（当前 lane / urgent waiters / lastWaiterSeq）
- non-urgent backlog 只在“**上一轮真实观察到 urgent waiter**”时，对下一轮 backlog 启用一个很窄的 `pre-urgent chunk growth cap`
- 本次 cap 只限制 growth，不做 requeue；`maxChunkSize = 8`
- 一旦本轮真的观察到 `urgent waiter`，立即解除 cap，让余下 catch-up 回到正常增长

换句话说，这一刀想验证的是：
- 能不能不用 blind host yield
- 也不用 handoff-lite 的 cancel/requeue
- 只靠“上一轮真实 urgent pressure 的记忆”把下一轮 backlog 的首段 slice 上界压窄一点点

## 结论

- 这版 remembered-pressure cap **不值得保留**。
- `run1 / run2` 看起来能把 `mode=default, steps=200` 稳定拉回 `50ms` 线内，并让 `steps=800` 只剩约 `1ms` 级边缘差距。
- 但 `run3` 又把 `mode=default` 三档拉回 `53.4 / 54.7 / 51.2ms`。
- 也就是说，这版不是“稳定改善但还没 fully close”，而是 **收益不可复现**。
- 因此本线只保留 docs/evidence；runtime 代码已清回 branch HEAD。

## 证据

baseline：
- `specs/103-effect-v4-forward-cutover/perf/s2.before.local.quick.r1urgent-aware-v3.currenthead.txn-lanes.targeted.json`

3 轮 after：
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.r1urgent-aware-v3.run1.txn-lanes.targeted.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.r1urgent-aware-v3.run2.txn-lanes.targeted.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.r1urgent-aware-v3.run3.txn-lanes.targeted.json`

strict diff：
- `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.r1urgent-aware-v3.run1.txn-lanes.strict.targeted.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.r1urgent-aware-v3.run2.txn-lanes.strict.targeted.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.r1urgent-aware-v3.run3.txn-lanes.strict.targeted.json`

## 关键结果

before：
- `default 200`: `56.5ms`
- `default 800`: `52.2ms`
- `default 2000`: `48.9ms`
- `off 200`: `51.6ms`
- `off 800`: `50.5ms`
- `off 2000`: `60.1ms`

after run1：
- `default 200`: `49.7ms`
- `default 800`: `51.5ms`
- `default 2000`: `49.3ms`
- `off 200`: `64.5ms`
- `off 800`: `54.8ms`
- `off 2000`: `52.8ms`

after run2：
- `default 200`: `48.8ms`
- `default 800`: `51.2ms`
- `default 2000`: `50.0ms`
- `off 200`: `54.5ms`
- `off 800`: `54.2ms`
- `off 2000`: `56.3ms`

after run3：
- `default 200`: `53.4ms`
- `default 800`: `54.7ms`
- `default 2000`: `51.2ms`
- `off 200`: `60.9ms`
- `off 800`: `66.8ms`
- `off 2000`: `53.4ms`

最关键的稳定性问题：
- `mode=default, steps=200`: `56.5 -> 49.7 / 48.8 / 53.4ms`
- `mode=default, steps=800`: `52.2 -> 51.5 / 51.2 / 54.7ms`
- `mode=default, steps=2000`: `48.9 -> 49.3 / 50.0 / 51.2ms`

换句话说：
- `run1 / run2` 像是对 `default 200` 有真收益
- 但 `run3` 又把 `default` 的关键档位拉回门外
- `steps=2000` 没有形成可重复改善，更多是持平到轻回归

## 为什么失败

这版 remembered-pressure cap 的问题，不是它完全没有帮助，而是它的帮助 **过于间接**：
- 它依赖“上一轮刚刚出现过 urgent waiter”的记忆来影响下一轮 backlog
- 这个切面比 blind startup cap 更收敛，但仍然不是“本轮 urgent 已真实排队时，直接改变下一 slice 上界”
- 结果就是：有些 run 会吃到收益，有些 run 则回到 current-head 的边缘抖动

与 handoff-lite 相比：
- 它没有引入 `cancel + requeue` 带来的 catch-up 爆炸
- 但也没有把 `steps=800/2000` 的等待上界稳定打下来

因此这版更像“有方向感的线索”，还不是可交付的 runtime policy。

## 裁决

- `R-1` 主线仍然保持打开；当前活跃方向仍然是 **更高信息量的 urgent-aware handoff**。
- 但本次的 `remembered-pressure pre-urgent growth cap` 应明确列入失败子尝试。
- 后续若继续 `R-1`，不要原样重试这版：
  - `txnQueue snapshot` + “上一轮 remembered pressure” + `pre-urgent growth cap=8`
- 下一轮如果还要继续，应优先找更直接的切面：
  - **本轮** `urgent waiter` 已真实出现时，如何直接影响下一 slice 的上界/hand-off
  - 而不是继续依赖上一轮的 remembered pressure
