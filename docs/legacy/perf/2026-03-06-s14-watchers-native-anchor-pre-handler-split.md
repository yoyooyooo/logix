# 2026-03-06 · S-14：watchers native-anchor pre-handler split

本刀不做 runtime cut，也不改 public API。目标是把 `S-12` 里仍然偏粗的 `clickToHandler` 再拆成“页面外 click 注入税”与“页面内 native event -> handler”两段，裁掉 watchers benchmark 解释链上最后这块关键不确定性。

## 问题

`S-12` / `S-13` 已经证明 watchers 红样本的 dominant phase 落在旧的 `clickToHandler`，但这个名字还混着两件事：

- 测试侧 `button.click()` / locator click 真正把 native click 注入页面之前的外部税点
- 页面内按钮收到原生 click capture 之后，到 React handler 真正启动之前的内部税点

如果不把这两段继续拆开，后续仍然可能把“页面外 click 注入税”误判成 runtime / handler 路径问题。

## 改动

- `packages/logix-react/test/browser/watcher-browser-perf.test.tsx`
  - 在 `await button.click()` 之前记录 `clickInvokeAt`
  - 在按钮原生 `click` capture 监听里记录 `nativeCaptureAt`
  - 继续记录 `handlerStartAt`、`domStableAt`、`paintishAt`
  - 每次 sample 额外输出四段 phase evidence：
    - `watchers.phase.clickInvokeToNativeCaptureMs`
    - `watchers.phase.nativeCaptureToHandlerMs`
    - `watchers.phase.handlerToDomStableMs`
    - `watchers.phase.domStableToPaintGapMs`
- `.codex/skills/logix-perf-evidence/assets/matrix.json`
  - 两个 watchers suite 的 `requiredEvidence` 改为四段新口径
  - notes 同步改成优先读 `click invoke -> native capture -> handler -> DOM stable -> paint gap`
- `.codex/skills/logix-perf-evidence/scripts/watchers-phase-display.ts`
  - paired phase display 从旧三段切到新四段
- `.codex/skills/logix-perf-evidence/scripts/watchers-phase-display.test.ts`
  - 新增四段 display 断言，先红后绿

## 关键读数

基于 `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.s14-watchers-native-anchor-pre-handler-split.targeted.json`：

### `watchers.clickToPaint`

phase 范围（14 个点位的 point-level evidence）：
- `clickInvokeToNativeCaptureMs`: `31.8ms ~ 40.0ms`，中位 `36.5ms`
- `nativeCaptureToHandlerMs`: `0.0ms ~ 0.0ms`，中位 `0.0ms`
- `handlerToDomStableMs`: `9.4ms ~ 15.0ms`，中位 `13.0ms`
- `domStableToPaintGapMs`: `3.9ms ~ 9.5ms`，中位 `6.0ms`

paired phase display（after median）：
- `clickInvokeToNativeCapture=36.2ms`
- `nativeCaptureToHandler=0.0ms`
- `handlerToDomStable=13.0ms`
- `domStableToPaintGap=5.8ms`
- dominant=`clickInvokeToNativeCapture`（`65.8%`）

### `watchers.clickToDomStable`

phase 范围（14 个点位的 point-level evidence）：
- `clickInvokeToNativeCaptureMs`: `30.5ms ~ 42.3ms`，中位 `34.6ms`
- `nativeCaptureToHandlerMs`: `0.0ms ~ 0.1ms`，中位 `0.0ms`
- `handlerToDomStableMs`: `8.0ms ~ 15.2ms`，中位 `13.9ms`
- `domStableToPaintGapMs`: `3.1ms ~ 7.6ms`，中位 `5.1ms`

paired phase display（after median）：
- `clickInvokeToNativeCapture=34.3ms`
- `nativeCaptureToHandler=0.0ms`
- `handlerToDomStable=13.7ms`
- `domStableToPaintGap=5.0ms`
- dominant=`clickInvokeToNativeCapture`（`64.7%`）

## 裁决

1. dominant phase 已明确是页面外 click 注入税。
- 两条 watchers suite 的 paired phase display 都显示 `clickInvokeToNativeCapture` 占比约 `64% ~ 66%`。
- 这段税点发生在测试调用 `button.click()` 之后、页面收到原生 click capture 之前，更像 browser/driver 注入成本，而不是 runtime core 内部路径。

2. 页面内 `nativeCapture -> handler` 几乎没有可观测税点。
- `nativeCaptureToHandlerMs` 在 `watchers.clickToPaint` 上是 `0.0ms` 全范围，在 `watchers.clickToDomStable` 上也只是 `0.0ms ~ 0.1ms`。
- 因此旧 `clickToHandler` 的大头不是 handler dispatch，也不是 React handler 启动前的页面内排队。

3. 页面内剩余的主要成本已经收敛到 `handler -> DOM stable`，但它不是本轮 dominant segment。
- `handlerToDomStableMs` 稳定落在 `~13-14ms` 中位数，明显低于页面外 click 注入税。
- `domStableToPaintGapMs` 仍只是次要段（约 `5-6ms` 中位数）。

4. `S-2` 这条线到此按 docs/evidence-only 关闭。
- 当前没有新的 runtime core blocker。
- 若未来要重开，只能基于新的 clean/comparable native-anchor 证据，或 `nativeCaptureToHandlerMs` 再次出现稳定非零税点。

## 验证

- `pnpm exec vitest run .codex/skills/logix-perf-evidence/scripts/watchers-phase-display.test.ts`
  - 先红：旧 display 只认三段，不包含 `clickInvokeToNativeCapture`
  - 再绿：更新 display 后通过
- `pnpm -C packages/logix-react typecheck:test`
  - 通过
- `pnpm -C packages/logix-react test -- --project browser test/browser/watcher-browser-perf.test.tsx`
  - 通过
- `pnpm perf collect -- --profile quick --files test/browser/watcher-browser-perf.test.tsx --out specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.s14-watchers-native-anchor-pre-handler-split.targeted.json`
  - 通过
- `pnpm perf diff:triage -- --before specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.s12-watchers-paired-phase-evidence.targeted.json --after specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.s14-watchers-native-anchor-pre-handler-split.targeted.json --out specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.s14-vs-s12-watchers-native-anchor-pre-handler-split.triage.json`
  - 通过
  - 仅作 triage：`matrixHash`、git branch/commit、dirty 状态有 drift，`comparable=false`

## 证据

- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.s14-watchers-native-anchor-pre-handler-split.targeted.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.s14-vs-s12-watchers-native-anchor-pre-handler-split.triage.json`

## 回写

- `docs/perf/README.md`
- `docs/perf/06-current-head-triage.md`
- `docs/perf/07-optimization-backlog-and-routing.md`

## 后续

- 默认不再重开 `S-2`。
- 只有在 future evidence 再次显示页面内 `nativeCaptureToHandler` 稳定非零，或 paired phase display/report 丢失这条 split 语义时，才单开新的 evidence/tooling worktree。
