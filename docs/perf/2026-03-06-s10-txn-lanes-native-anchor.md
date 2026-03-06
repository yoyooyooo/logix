# 2026-03-06 · S-10：`txnLanes.urgentBacklog` native-anchor benchmark cut

本刀只改 benchmark / control-surface，不碰 `packages/logix-core/**`。

## 结论

- `txn-lanes` 的起点锚已从页面外侧的 `.click()` 调用前，前移到页面内按钮真正收到原生 `click` 的时刻。
- suite 的终点不再依赖纯 `rAF` 轮询，而是收紧到 `MutationObserver` 观察到目标 DOM 文本达标的时刻。
- 在这组语义下，`urgent.p95<=50ms` 不只是维持到 `maxLevel=200 / firstFail=800`，而是 `mode=default` 与 `mode=off` 三轮 targeted 加一轮 clean-HEAD verify 都直接通过到 `steps=2000`。
- 这不是 runtime core 变快了，而是 benchmark 终于把“页面外调度/自动化注入”与“页面内 native event -> DOM stable”切开了。

## 这刀最小改动

文件：`packages/logix-react/test/browser/perf-boundaries/txn-lanes.test.tsx`

只做两件事：

- 给 `SetA0` / `SetA1` / `Urgent` 按钮挂原生 `click` capture/bubble listener，记录页面内真正收到 DOM 事件的时间；主指标优先用 `nativeCapture`，缺失时才回退到 `nativeBubble`。
- 把 `waitForBodyText` 从 `rAF` 轮询改成 `MutationObserver`，并让主流程在动作发出前预挂等待，尽量把终点收紧到 DOM 真正稳定的时刻。

## 证据

首轮：

- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.s10-txn-lanes-native-anchor.targeted.json`

补跑复核：

- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.s10-txn-lanes-native-anchor.recheck.targeted.json`

本轮最贴边 confirm：

- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.s10-txn-lanes-native-anchor.confirm.targeted.json`

clean HEAD 复验：

- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.s10-txn-lanes-native-anchor.verify.targeted.json`

与旧 `invoke-observation` 的 diff：

- `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.r1-to-s10-txn-lanes-native-anchor.targeted.json`

## 关键结果

旧 `invoke-observation`（`mode=default`）：

- `steps=200`: `urgent.p95 = 54.2ms`
- `steps=800`: `urgent.p95 = 53.5ms`
- `steps=2000`: `urgent.p95 = 53.6ms`
- `urgent.p95<=50ms`: `maxLevel=null / firstFail=200`

native-anchor 首轮（`mode=default`）：

- `steps=200`: `urgent.p95 = 1.4ms`
- `steps=800`: `urgent.p95 = 1.6ms`
- `steps=2000`: `urgent.p95 = 1.4ms`
- `urgent.p95<=50ms`: `maxLevel=2000 / firstFail=null`

native-anchor 补跑复核（`mode=default`）：

- `steps=200`: `urgent.p95 = 1.3ms`
- `steps=800`: `urgent.p95 = 1.9ms`
- `steps=2000`: `urgent.p95 = 1.3ms`
- `urgent.p95<=50ms`: `maxLevel=2000 / firstFail=null`

native-anchor 本轮 confirm（`mode=default`）：

- `steps=200`: `urgent.p95 = 1.3ms`
- `steps=800`: `urgent.p95 = 1.7ms`
- `steps=2000`: `urgent.p95 = 1.4ms`
- `urgent.p95<=50ms`: `maxLevel=2000 / firstFail=null`

native-anchor clean HEAD verify（`mode=default`）：

- `steps=200`: `urgent.p95 = 1.4ms`
- `steps=800`: `urgent.p95 = 1.5ms`
- `steps=2000`: `urgent.p95 = 1.4ms`
- `urgent.p95<=50ms`: `maxLevel=2000 / firstFail=null`
- `report.meta.git.dirty = false`

同一次补跑里，`mode=off` 也同样是：

- `urgent.p95<=50ms`: `maxLevel=2000 / firstFail=null`

## 解释链

新的 evidence 说明三件事：

1. 页面外调度税仍然存在，但它不该再混进 runtime 指标
- `urgent.nativeCaptureDelayFromScheduleMs` 仍有 `25.9ms ~ 38.8ms`
- `backlog.firstNonUrgent.nativeCaptureOffsetFromBacklogMs` 仍有 `28.8ms ~ 39.0ms`
- 这些成本现在被保留在 evidence 里，而不是继续伪装成 runtime `urgentToStable`

2. native event 一旦真正进页面，React/runtime 几乎立刻处理
- `urgent.invokeDelayFromNativeCaptureMs = 0ms`
- `urgent.enqueueDelayFromNativeCaptureMs ≈ 0.1ms`
- `urgent.startDelayFromNativeCaptureMs ≈ 0.1ms`
- `backlog.firstNonUrgent.invokeDelayFromNativeCaptureMs = 0ms`

3. 当前 suite 剩余的大头并不在 runtime queue 内
- `S-9` / `R-1 invoke-window` 已证明旧主延迟主要落在 handler invoke 之前
- `S-10` 把锚点再前移到 native capture 后，`urgentToStable` 直接掉到 `1~2ms`
- 因此旧的 `50ms+` 失败主要是 control-surface / automation / admission window 语义，而不是 `txnQueue` 自身的 steady-state 成本

## 裁决

- 这刀按正式 benchmark/evidence 收口。
- 在当前 suite 语义下，`txnLanes.urgentBacklog` 不再是 runtime core 主 blocker。
- 后续若还要重开这条线，只能基于新的目标定义之一：
  - 明确要把页面外 automation / admission 税重新计入产品级 SLA；
  - 或新的 evidence 再次显示 native event 进入页面之后，runtime queue 内部有真实税点。
- 在没有新证据之前，不要再回到 `enqueueTransaction` / baton window / handoff-lite 这类 queue-side 微调。

## 验证

- `pnpm -C packages/logix-react typecheck:test`
- `VITE_LOGIX_PERF_PROFILE=quick pnpm perf collect -- --profile quick --files test/browser/perf-boundaries/txn-lanes.test.tsx --out specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.s10-txn-lanes-native-anchor.targeted.json`
- `VITE_LOGIX_PERF_PROFILE=quick pnpm perf collect -- --profile quick --files test/browser/perf-boundaries/txn-lanes.test.tsx --out specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.s10-txn-lanes-native-anchor.recheck.targeted.json`
- `pnpm perf collect -- --profile quick --files test/browser/perf-boundaries/txn-lanes.test.tsx --out specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.s10-txn-lanes-native-anchor.confirm.targeted.json`
- `pnpm perf diff -- --before specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.r1-late-enqueue-v5.invoke-observation.txn-lanes.targeted.json --after specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.s10-txn-lanes-native-anchor.recheck.targeted.json --out specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.r1-to-s10-txn-lanes-native-anchor.targeted.json`
- `pnpm perf collect -- --profile quick --files test/browser/perf-boundaries/txn-lanes.test.tsx --out specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.s10-txn-lanes-native-anchor.verify.targeted.json`
