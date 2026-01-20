# 075 · Perf Evidence

本目录用于归档可对比的 `PerfReport` / `PerfDiff`（before/after/diff），作为 075 的性能预算与回归门禁证据落点。

> 口径：`.codex/skills/logix-perf-evidence/references/perf-evidence.md`

## Baseline 语义（MUST）

优先采用“同一份代码下的策略 A/B”对比（避免必须切回旧 commit 才能采 before）：

- `mode=manualWatcher`：手写 watcher（参考基线）
- `mode=workflow`：WorkflowRuntime（目标实现）

## 环境元信息（硬结论必填）

> 交付硬结论必须使用 `profile=default`（必要时 `soak` 复测）；`quick` 仅用于探路。

- Date：2026-01-20
- Branch / commit（working tree 是否 dirty）：`075-from-specs` / `3c7af47b`（dirty）
- OS / arch / CPU / Memory：darwin / arm64 / Apple M2 Max / 64GB
- Node.js / pnpm：v22.21.1 / 9.15.9
- Browser（name/version/headless）（如为 browser 跑道）：chromium 143.0.7499.4（headless）
- Matrix（matrixId/matrixHash）：`logix-browser-perf-matrix-v1` / `5b637a7f6a69f6d760459b3fe90cb3f41060eee3bc26d9ebe90021d20ffaddfe`
- Profile（quick/default/soak）：default
- Sampling（runs/warmupDiscard/timeoutMs）（按 suite 记录）：10 / 2 / 30000ms
- Notes：对比轴为 `VITE_LOGIX_PERF_WORKFLOW_MODE=manualWatcher|workflow`；suite 固定 `watchers=256`，覆盖 `diagnostics=off/full`。

## 证据文件（占位）

> 文件命名建议沿用 073 形态（envId/profile/suite/mode 维度明确），并确保 before/after 的可比性参数一致。

### workflow.submit.tickNotify

- Before（manualWatcher）：`browser.before.3c7af47b-dirty.darwin-arm64.logix-browser-perf-matrix-v1.default.mode=manualWatcher.json`
- After（workflow）：`browser.after.3c7af47b-dirty.darwin-arm64.logix-browser-perf-matrix-v1.default.mode=workflow.json`
- Diff：`diff.browser.mode=manualWatcher__workflow.3c7af47b-dirty.darwin-arm64.logix-browser-perf-matrix-v1.default.json`

### workflow.delay.timer

- Before（manualWatcher）：`browser.before.3c7af47b-dirty.darwin-arm64.logix-browser-perf-matrix-v1.default.mode=manualWatcher.json`
- After（workflow）：`browser.after.3c7af47b-dirty.darwin-arm64.logix-browser-perf-matrix-v1.default.mode=workflow.json`
- Diff：`diff.browser.mode=manualWatcher__workflow.3c7af47b-dirty.darwin-arm64.logix-browser-perf-matrix-v1.default.json`

## 预算策略（Hard Gate）

> 先固化 baseline，再用 `baseline.p95 * 1.05` 做 `diagnostics=off` 的回归阈值（噪声过大可放宽到 1.10，但必须写明原因）。

- off：baseline * 1.05（默认；本次固化为 submit p95<=1.58ms、delay p95<=6.09ms）
- full：单独设阈值（允许更贵，但必须是“开关付费”，不能泄漏到 off）

## 结论（可交接摘要）

- Gate：PASS（`meta.comparability.comparable=true` 且 `summary.regressions==0` 且 `summary.budgetViolations==0`）
- 关键指标（p95）：
  - submit：manualWatcher 1.40ms → workflow 1.20ms（-0.20ms，×0.86）
  - delay(timer)：manualWatcher 5.40ms → workflow 5.00ms（-0.40ms，×0.93）
