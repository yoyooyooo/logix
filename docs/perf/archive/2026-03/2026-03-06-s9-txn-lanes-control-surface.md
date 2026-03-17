# 2026-03-06 · S-9：txn-lanes control-surface / native event window observation

本刀不继续改 `txnQueue` / `ModuleRuntime.impl.ts`，而是把 `txn-lanes` 的 pre-queue 区段进一步拆细，判断几十毫秒的大头到底更像：
- Playwright/browser click transport
- DOM/React 事件派发到 handler 的成本
- 还是 Logix dispatch admission 本身的成本

## 改动

- `packages/logix-react/test/browser/perf-boundaries/txn-lanes.test.tsx`
  - 为 backlog/urgent 两个按钮补充 DOM `click` capture/bubble 时刻采样
  - 在既有 `actionInvokedAt` 基础上，继续输出：
    - `txnQueue.urgent.nativeCaptureDelayFromScheduleMs`
    - `txnQueue.urgent.nativeBubbleDelayFromScheduleMs`
    - `txnQueue.urgent.invokeDelayFromNativeCaptureMs`
    - `txnQueue.urgent.invokeDelayFromNativeBubbleMs`
    - `txnQueue.backlog.firstNonUrgent.nativeCaptureOffsetFromBacklogMs`
    - `txnQueue.backlog.firstNonUrgent.nativeBubbleOffsetFromBacklogMs`
    - `txnQueue.backlog.firstNonUrgent.invokeDelayFromNativeCaptureMs`
    - `txnQueue.backlog.firstNonUrgent.invokeDelayFromNativeBubbleMs`

## 验证

- `pnpm -C packages/logix-react typecheck:test`
- `VITE_LOGIX_PERF_PROFILE=quick pnpm perf collect -- --profile quick --files test/browser/perf-boundaries/txn-lanes.test.tsx --out specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.s8-retriage-native-event-window.confirm.txn-lanes.targeted.json`

## 结果

这轮继续支持同一个结论：
- `schedule -> native capture/bubble -> handler invoke` 这一层就已经吃掉了几十毫秒
- `handler invoke -> runtime enqueue/start` 仍然只有 `0.1~0.8ms`

也就是说：
- 当前 `R-1` 的主问题已经不在 queue 内部
- 下一刀如果还要继续做“一阶方向”，优先级应在 control-surface / benchmark admission / React 事件交付层，而不是继续磨 `txnQueue`

## 后续

- `S-9` 到此收口为 evidence-first 一刀
- 若未来要继续做这条线，最自然的下一步是把 `locator.click()`、页面内原生 `HTMLElement.click()/dispatchEvent()`、以及直接 imperative handler 调用并排量化，继续把 control-surface 这一层切开
