# Safety: Logix CLI（085）

> Superseded background only. This 085 safety contract is not current CLI authority.
> Current CLI authority is [../../160-cli-agent-first-control-plane-cutover/spec.md](../../160-cli-agent-first-control-plane-cutover/spec.md) and [../../../docs/ssot/runtime/15-cli-agent-first-control-plane.md](../../../docs/ssot/runtime/15-cli-agent-first-control-plane.md).
> `mode=report|write`, writeback, and `CommandResult.mode` are negative-only legacy references for `160`.

## 1) 默认 report-only

- 任何可能写回源码的命令默认必须是 `mode=report`（不写回）。
- `mode=write` 必须显式开启，并在 stdout 的 `CommandResult.mode` 字段中体现（对齐 085 schema）。
- `mode=write` 不是“执行建议”，而是“显式授权位”；未显式提供时必须保持只读。

## 2) 写回的硬门槛（复用 082）

- write-back 前必须校验目标文件 digest 与 plan 时一致（expectedFileDigest）；不一致必须拒绝写回（防竞态）。
- 补丁必须最小 diff，尽量保持原文件风格；做不到则拒绝写回（宁可失败）。
- 幂等：应用补丁后再次运行应产生 0 diff（字节级无变化）。
- 子集外形态一律 Raw Mode：不得写回，并给出 reason codes（宁可漏不乱补）。

## 2.1) write 诊断与审计（S 级补强）

- 任一 write 命令必须在 artifacts 中提供可审计诊断（至少包含风险提示与下一步动作建议）。
- 推荐最小 reason codes：
  - `AUTOFILL_REPORT_ONLY`（默认只读）
  - `AUTOFILL_WRITE_APPLIED`（已写回，需复核）
  - `AUTOFILL_WRITE_FAILED`（写回失败，阻断）
- 诊断必须 JsonValue-only，不得依赖非结构化日志。

## 3) Transform 的边界（可选加速器）

- v1 只覆盖 Platform-Grade 子集内的“可确定插入点”的机械改动（例如对象字面量增补）。
- Transform 的输入必须是纯 JSON（delta），禁止携带函数/闭包语义。
- Transform 产出 PatchPlan 后再写回；不允许“直接改文件不出 plan”。

## 4) 受控运行（trialrun/introspect）

- 必须支持 timeout/budget，避免 CLI 常驻或卡死。
- 默认禁止真实 IO：通过测试 Layer/stub ports 提供依赖；若用户显式允许 IO，必须在输出中标记并给出 reason codes（实现阶段固化策略）。
- 输出必须可序列化且 Slim；不得把非结构化日志当作协议。
