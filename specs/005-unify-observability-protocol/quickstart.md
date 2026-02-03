# Quickstart: 005 Foundational（Envelope / EvidencePackage / Aggregation / Commands）

> 本 quickstart 只覆盖 005 的收口范围：协议与聚合引擎闭环；不涉及 Devtools UI/Chrome 扩展形态。

## 1) 运行侧：导出 EvidencePackage（JSON hard gate）

目标：同一份证据包在 `JSON.stringify → JSON.parse → import` 后仍可稳定读取，且 `seq` 允许间隙/不从 1 开始（Recording Window）。

参考实现与单测：

- 导出：`Logix.Debug.exportEvidencePackage`（底层：`packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`）
- JSON gate：`packages/logix-core/test/observability/Observability.EvidencePackage.JsonGate.test.ts`
- Recording Window：`packages/logix-core/test/observability/EvidencePackage.test.ts`

## 2) 离线侧：导入 + 聚合（同输入同输出）

目标：对同一份输入（相同 `runId` + 相同 envelopes 列表），聚合输出确定且可复现（同输入同输出）。

参考实现与单测：

- 导入：`Logix.Observability.importEvidencePackage`（底层：`packages/logix-core/src/internal/observability/evidence.ts`）
- 聚合：`Logix.Observability.aggregateEvidencePackage` / `aggregateObservationEnvelopes`
- 确定性：`packages/logix-core/test/observability/AggregationEngine.test.ts`

## 3) 命令面：clear / pause / resume（运行侧可控录制窗口）

目标：命令面可被宿主调用并返回结构化回执；`pause` 时不再向 recording window 写入新事件；`resume` 恢复；`clear` 清空窗口。

参考实现与单测：

- 命令：`Logix.Debug.sendControlCommand`（底层：`packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`）
- 行为：`packages/logix-core/test/observability/ControlCommand.test.ts`

