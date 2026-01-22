# Quickstart: 085 Logix CLI（Node-only）

> 目标：在平台落地前，用 `logix` CLI 串起 IR 导出 / 受控试跑 / Anchor 索引 / 保守回写，并输出版本化 JSON 工件供 CI/Devtools/平台侧消费。

## 1) 产物是什么

- `CommandResult@v1`：CLI 输出 envelope（stdout + 落盘引用）。
- 工件示例（按子命令不同）：`TrialRunReport`、`AnchorIndex@v1`、`PatchPlan@v1`、`WriteBackResult@v1` 等。

权威 schema：

- `specs/085-logix-cli-node-only/contracts/schemas/cli-command-result.schema.json`

## 2) 怎么运行（预期入口）

由 `packages/logix-cli` 暴露 `logix` 命令（本 spec 只固化语义与工件形态）：

- `logix ir export`：导出 Manifest/StaticIR/Artifacts（可落盘）
- `logix ir validate`：对导出工件做门禁（锚点/预算/Raw Mode 统计）
- `logix ir diff`：对两份工件做稳定 diff（用于 CI gate）
- `logix trialrun`：导出 TrialRunReport（受控窗口 + 预算/超时）
- `logix anchor index`：导出 `AnchorIndex@v1`（081）
- `logix anchor autofill --mode report|write`：导出 PatchPlan/WriteBackResult（082），并在 `mode=write` 时执行写回（079）
- （可选）`logix transform module --ops <delta.json> --mode report|write`：对 Platform-Grade 子集内的 Module 做 batch ops（默认 report-only）

## 3) 安全边界（必须牢记）

- 强制显式 `runId`；输出必须确定性、可序列化、可 diff。
- `--mode write` 会修改源码：只补“未声明且高置信度”的锚点缺口；对子集外/歧义形态必须拒绝写回并给出 reason codes。
- 默认工作方式建议：先直接出码/重构，再用 `ir export/validate/diff` 做证据链与门禁；仅在“机械且高风险小改动”时才考虑 `transform module`。
