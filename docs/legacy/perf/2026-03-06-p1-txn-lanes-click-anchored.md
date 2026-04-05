# 2026-03-06 · P-1：`txnLanes.urgentBacklog` 改成 click-anchored 计时（去掉 timer 排队噪声）

本刀不是继续拧内核常数，而是修正 `txnLanes.urgentBacklog` 的计时语义。

此前这条 suite 的 `urgentToStableMs` 起点是这样取的：

- backlog 已经启动后；
- 先记录 `urgentScheduledAt = performance.now()`；
- 然后用 `setTimeout(0)` 再去触发 `Urgent` 按钮点击。

这意味着指标混进了两部分完全不同的成本：

- 浏览器 timer/事件队列的排队延迟；
- runtime/React 真正处理 urgent 交互到稳定的延迟。

既然 suite 的名字是 “urgent interaction under non-urgent backlog”，那么真正应该测的起点应该是 **click 真的被触发的那一刻**，而不是“把 click 排队”那一刻。

## 结论（已完成）

- `urgentToStableMs` 现在改成 **click-anchored**：
  - 在 `setTimeout(0)` 的 callback 里，真正触发 `ctx.urgent.click()` 前才记录起点。
- 这条纠偏后：
  - `mode=default, steps=2000` 已进入 `p95<=50ms`
  - `mode=default, steps=200` 从 `59.3ms -> 54.7ms`
  - `mode=default, steps=800` 从 `45.6ms -> 50.9ms`（边缘回摆，仍需后续继续压）

## 改了什么

文件：`packages/logix-react/test/browser/perf-boundaries/txn-lanes.test.tsx`

- 原来：
  - `urgentScheduledAt = performance.now()` 在 `setTimeout(0)` 之前
- 现在：
  - 先声明 `let urgentScheduledAt = 0`
  - 在 `setTimeout(0)` callback 内、真正 `ctx.urgent.click()` 前记录时间

这是纯 measurement semantics 修正，不改 runtime 内核逻辑。

## 证据

### before（stable-head full matrix）

- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw115.stable-head.full-matrix.json`

before 的关键点位：

- `mode=default, steps=200`: `p95 59.3ms`
- `mode=default, steps=800`: `p95 45.6ms`
- `mode=default, steps=2000`: `p95 52.5ms`

### after（click-anchored targeted）

- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw116.txn-lanes-click-anchored.targeted.json`

after 的关键点位：

- `mode=default, steps=200`: `p95 54.7ms`
- `mode=default, steps=800`: `p95 50.9ms`
- `mode=default, steps=2000`: `p95 49.6ms`

### 衍生对照：`inputPending`

- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw117.txn-lanes-click-anchored.inputpending.json`

这份专项实验说明：

- 在 click-anchored 语义下，`inputPending` 能把 `steps=200` 拉进 `50ms`（`45.3ms`）
- 但 `steps=800/2000` 仍分别在 `53.6ms / 58.5ms`

裁决：先不把 `inputPending` 升为 builtin 默认；它不是当前最稳的全局答案。

## 这刀的价值判断

- 它不是“靠改测试把失败抹掉”，而是把指标从“timer enqueue + interaction processing”的混合值，纠正成真正的 interaction→stable。
- 这和 K-1 的裁决一致：如果 suite 本身在测错对象，就应该先修 suite，再继续砍性能。

## 回归验证

- `pnpm -C packages/logix-react typecheck:test`
- `pnpm perf collect -- --profile quick --files test/browser/perf-boundaries/txn-lanes.test.tsx --out specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw116.txn-lanes-click-anchored.targeted.json`
- `pnpm perf diff -- --before specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw115.stable-head.full-matrix.json --after specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw116.txn-lanes-click-anchored.targeted.json --out specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw115-to-ulw116.p1-txn-lanes-click-anchored.targeted.json`

## 裁决

- 保留这刀。
- 当前 `txnLanes` 真正剩余的性能问题已经收缩为：
  - `mode=default, steps=200/800` 仍略高于 `50ms`
- 后续如果继续打 `txnLanes`，应直接针对这两个点做真实内核优化，而不是继续让 timer 排队噪声掩盖问题。
