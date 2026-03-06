# 2026-03-06 · S-2：watchers benchmark 在测量前先 settle 一帧

本刀不是继续优化 watcher runtime，而是先把 benchmark 语义往更稳定的方向收一小步：
在真正开始点击计时前，先等一帧，让首帧挂载/初始 paint 不再和 click→paint 的测量窗口混在一起。

## 改动

- `packages/logix-react/test/browser/watcher-browser-perf.test.tsx`
  - 新增 `nextFrame()` helper
  - 在确认初始 DOM 已稳定后，点击前先 `await nextFrame()` 再开始计时

## 为什么要先做这刀

current-head 已经把 `watchers.clickToPaint` 裁定为更像 benchmark / browser floor 问题，而不是 watcher runtime 主瓶颈。
因此在继续讨论是否还要动 runtime 之前，先把 benchmark 的启动边界收得更清楚，是更合理的前置动作。

这刀的目标不是“让 50ms 线过掉”，而是：
- 减少初始挂载噪声对 click→paint 测量窗口的污染
- 让后续 `S-2` 副线可以在更稳定的基线之上继续拆语义

## 验证

1. 定向 browser 测试通过：
- `pnpm -C packages/logix-react test -- --project browser test/browser/watcher-browser-perf.test.tsx`

2. 新 targeted 证据：
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw125.watchers-preclick-settle.targeted.json`

3. 与 O-2 基线的 triage diff：
- `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw120-to-ulw125.s2-watchers-preclick-settle.targeted.json`

## 结果解读

- 这刀没有把 `watchers.clickToPaint` 变成“已解决”；`p95<=50ms` 仍然从低档位就可能失败。
- 但新的分布继续说明：这条线并不随 watcher 数单调恶化，因而仍更像 suite 语义问题，不支持把它重新升级成 watcher runtime 主线。
- 所以后续 `S-2` 仍应定位为 benchmark 纠偏，而不是继续往 runtime 里塞 watcher 优化。

## 后续

- `S-2` 仍建议在独立 worktree 中继续做。
- 若后续要进一步改 `watchers.clickToPaint`，优先统一：warmup / settle / click→paint 的定义，再决定是否需要拆双轨指标。
