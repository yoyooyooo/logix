# 018 定期自校准 · Quickstart

本 Quickstart 用于在实现完成后快速验证 018 的 MVP（P1~P4）是否达标。

## 前置：确认 017 跑道口径可用

1. 启动示例：`pnpm -C examples/logix-react dev`
2. 打开页面：`/perf-tuning-lab`
3. 在页面中先用 baseline（builtin/当前默认覆盖）跑 1~2 轮，确认趋势口径一致（median/p95 + outcome）。

## P1：库侧默认值审计（是否需要更新库内置默认值）

1. 运行一次审计（周期性跑、或手动触发）。
2. 期望输出：
   - 结论：建议更新 / 不建议更新 / 证据不足
   - 当前内置默认值 vs 候选集合的对比（Δ median / Δ p95）与淘汰原因（含 `outcome=Degraded` 止损）
   - 结论可复跑验证一致性（同一套工作负载与阈值下结论一致）
   - 结果可导出为 JSON（符合 `contracts/calibration-run.schema.json`，且 `kind=libraryAudit`）

## P2：用户侧显式运行一次自校准并应用为覆盖

1. 在 `/perf-tuning-lab` 启用 “Self Calibration（018）” 面板（默认关闭）。
2. 点击 “Run calibration now”。
3. 期望：
   - 产出本机推荐配置（或明确说明“无安全候选/证据不足”）
   - 应用推荐作为默认覆盖后，同一 workload 下可复现地优于 baseline（或在稳定性阈值内不回归）
   - 可一键回退到 baseline/builtin
   - 结果可导出为 JSON（符合 `contracts/calibration-run.schema.json`，且 `kind=runtimeCalibration`）

## P3：周期/按需重校准且不影响交互

1. 触发校准后，开始连续滚动/点击。
2. 期望：校准在短时间内暂停或明显降速，交互无可感知持续卡顿；停止交互后可恢复。
3. 连续多次触发“需要重校准”的信号（例如手动触发 + 版本变化模拟），期望被合并/节流为一次执行。

## P4：可解释、可审计、LLM 友好

1. 打开“运行记录/历史”面板，查看最近一次校准 Run。
2. 期望：能定位到
   - 输入：workloads/candidates/safety 阈值
   - 环境：硬件与 UA 摘要
   - 过程：每个候选的指标与淘汰原因
   - 结论：推荐理由、置信度与不确定性

## 回退验证（必须）

1. 应用推荐作为默认覆盖（Provider / runtime options）。
2. 运行同一 workload 复测。
3. 点击“一键回退到 baseline/builtin”，复测应恢复到回退目标的趋势与结果口径。
