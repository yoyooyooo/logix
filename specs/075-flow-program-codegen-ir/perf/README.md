# 075 · Perf Evidence

本目录用于归档可对比的 `PerfReport` / `PerfDiff`（before/after/diff），作为 075 的性能预算与回归门禁证据落点。

> 口径：`.codex/skills/logix-perf-evidence/references/perf-evidence.md`

## Baseline 语义（MUST）

优先采用“同一份代码下的策略 A/B”对比（避免必须切回旧 commit 才能采 before）：

- `mode=manualWatcher`：手写 watcher（参考基线）
- `mode=flowProgram`：FlowProgramRuntime（目标实现）

## 环境元信息（硬结论必填）

> 交付硬结论必须使用 `profile=default`（必要时 `soak` 复测）；`quick` 仅用于探路。

- Date：
- Branch / commit（working tree 是否 dirty）：
- OS / arch / CPU / Memory：
- Node.js / pnpm：
- Browser（name/version/headless）（如为 browser 跑道）：
- Matrix（matrixId/matrixHash）：
- Profile（quick/default/soak）：
- Sampling（runs/warmupDiscard/timeoutMs）（按 suite 记录）：
- Notes：

## 证据文件（占位）

> 文件命名建议沿用 073 形态（envId/profile/suite/mode 维度明确），并确保 before/after 的可比性参数一致。

### flowProgram.submit.tickNotify

- Before（manualWatcher）：`TODO`
- After（flowProgram）：`TODO`
- Diff：`TODO`

### flowProgram.delay.timer

- Before（manualWatcher）：`TODO`
- After（flowProgram）：`TODO`
- Diff：`TODO`

## 预算策略（Hard Gate）

> 先固化 baseline，再用 `baseline.p95 * 1.05` 做 `diagnostics=off` 的回归阈值（噪声过大可放宽到 1.10，但必须写明原因）。

- off：baseline * 1.05（默认）
- full：单独设阈值（允许更贵，但必须是“开关付费”，不能泄漏到 off）

## 结论（可交接摘要）

- Gate：TODO（`meta.comparability.comparable=true` 且 `summary.regressions==0`）
- 关键指标：TODO
