# Artifacts & Naming: Logix CLI（085）

## 目标

- 工件命名与目录结构必须稳定、可预测，便于 CI/平台/Agent 消费与 diff。
- stdout 只输出 `CommandResult@v1`；“大对象”优先落盘为 artifact file。

## 建议命名（MVP）

> 具体是否落盘由 `--out` 决定；若未提供 `--out`，允许仅 stdout + inline artifacts。

- `control-surface.manifest.json`
- `workflow.surface.json`
- `anchor.index.json`
- `trialrun.report.json`
- `trace.slim.json`（可选）
- `ir.validate.report.json`
- `ir.diff.report.json`
- `patch.plan.json`
- `transform.report.json`
- `writeback.result.json`
- `autofill.report.json`

## 稳定性规则

- artifact 列表排序必须稳定（按 `outputKey` 字典序）。
- JSON 输出必须使用 stable stringify（同口径裁剪/排序）；digest 复算口径必须对齐 Root IR 合同。
- 超预算截断必须显式标记 `truncated/budgetBytes/actualBytes`，且 digest 必须有统一口径（实现阶段固化，禁止混用“截断前/截断后”口径）。

