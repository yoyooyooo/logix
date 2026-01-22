# Safety: Logix CLI（085）

## 1) 默认 report-only

- 任何可能写回源码的命令默认必须是 `mode=report`（不写回）。
- `mode=write` 必须显式开启，并在 stdout 的 `CommandResult.mode` 字段中体现（对齐 085 schema）。

## 2) 写回的硬门槛（复用 082）

- write-back 前必须校验目标文件 digest 与 plan 时一致（expectedFileDigest）；不一致必须拒绝写回（防竞态）。
- 补丁必须最小 diff，尽量保持原文件风格；做不到则拒绝写回（宁可失败）。
- 幂等：应用补丁后再次运行应产生 0 diff（字节级无变化）。
- 子集外形态一律 Raw Mode：不得写回，并给出 reason codes（宁可漏不乱补）。

## 3) Transform 的边界（可选加速器）

- v1 只覆盖 Platform-Grade 子集内的“可确定插入点”的机械改动（例如对象字面量增补）。
- Transform 的输入必须是纯 JSON（delta），禁止携带函数/闭包语义。
- Transform 产出 PatchPlan 后再写回；不允许“直接改文件不出 plan”。

## 4) 受控运行（trialrun/introspect）

- 必须支持 timeout/budget，避免 CLI 常驻或卡死。
- 默认禁止真实 IO：通过测试 Layer/stub ports 提供依赖；若用户显式允许 IO，必须在输出中标记并给出 reason codes（实现阶段固化策略）。
- 输出必须可序列化且 Slim；不得把非结构化日志当作协议。

