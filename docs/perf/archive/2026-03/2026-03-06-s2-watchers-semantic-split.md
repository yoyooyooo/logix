# 2026-03-06 · S-2：watchers benchmark 语义拆成双轨

本刀不是继续优化 watcher runtime，而是把原来单一的 `watchers.clickToPaint` 指标拆成两条更可解释的语义轨道：
- `watchers.clickToPaint`：click -> DOM stable -> next frame 的近似 paint 口径
- `watchers.clickToDomStable`：click -> DOM stable，更直接反映 watcher runtime + DOM 提交成本

## 改动

- `.codex/skills/logix-perf-evidence/assets/matrix.json`
  - 保留 `watchers.clickToPaint`
  - 新增 `watchers.clickToDomStable`
- `packages/logix-react/test/browser/watcher-browser-perf.test.tsx`
  - 把单次采样拆成 `domStableMs` 与 `paintishMs`
  - 两个 suite 各自跑 `runMatrixSuite`，独立得到 thresholds

## 为什么要做这刀

current-head 已经裁定这条线更像 benchmark / browser floor 问题，而不是 watcher runtime 主瓶颈。
如果继续只保留一个 `click->paint` 数字，就无法区分：
- watcher runtime / DOM 提交成本
- 浏览器下一帧 / paint 地板

双轨之后，后续再看 watcher 线，就不会把两层语义继续混成一个数。

## 验证

- `pnpm -C packages/logix-react typecheck:test`
- `pnpm -C packages/logix-react test -- --project browser test/browser/watcher-browser-perf.test.tsx`
- `pnpm perf collect -- --profile quick --files test/browser/watcher-browser-perf.test.tsx --out specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.s2-watchers-semantic-split.targeted.json`

## 证据

- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.s2-watchers-semantic-split.targeted.json`

## 结果解读

- `clickToPaint` 仍然明显带着浏览器帧地板，整体 p95 更高。
- `clickToDomStable` 相对更低，但也没有形成“随 watcher 数单调恶化”的形态。
- 这进一步支持：当前 `watchers` 线的主问题仍是 benchmark 语义，不应重新升级为 watcher runtime 主线。

## 后续

- 若要继续做 `S-2`，下一刀应围绕这两条指标的解释链与展示方式，而不是回头继续往 runtime 里塞 watcher 优化。
