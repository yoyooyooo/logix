# Data Model: 015 Devtools Converge Performance Pane

**Feature**: `015-devtools-converge-performance`  
**Date**: 2025-12-18  

> 本数据模型描述 Devtools 侧的“聚合视图与输出结构”，不定义运行时 converge 的内部实现。

## Entities

### ConvergeTransaction

表示一笔与 converge 相关的事务（txn）在 Devtools 侧的最小展示单元。

- Identity / keys:
  - `moduleId`（模块标识）
  - `instanceId`（模块实例标识）
  - `txnId`（事务标识）
  - `orderKey`（确定性排序键：优先全局排序；缺失时使用实例内单调序号）
- Evidence fields (minimum):
  - `requestedMode` / `executedMode`
  - `reasons[]`
  - `configScope`
  - `decisionDurationMs` / `executionDurationMs`（允许缺失；缺失时必须显式提示）
  - `budgets`（决策/执行预算；缺失时必须显式提示）
  - `stepStats`（total/executed/skipped/changed + optional affected）

### ConvergeLane

时间轴上的一条 lane（默认按 `moduleId + instanceId` 分组）。

- `laneKey`（稳定 key）
- `label`（可读标签）
- `transactions: ConvergeTransaction[]`

### ConvergeAuditFinding

一条审计结果（可序列化，稳定 ID）。

- `id`（稳定 ID，例如 `CNV-001`）
- `severity`（如 info/warn/error）
- `summary`（一句话结论）
- `explanation`（证据依据的解释）
- `requires`（证据前置条件：缺字段则降级为 insufficient_evidence）
- `recommendations`（建议列表）
- `snippets: ActionSnippet[]`（可复制代码片段；两档：Provider 优先 + 模块级兜底）

### ActionSnippet

一段“可复制”的行动代码片段（不要求可直接运行，但必须明确作用域与优先级）。

- `kind`（provider_override | module_override）
- `scope`（影响范围说明）
- `expectedConfigScope`（预期 `configScope`）
- `text`（可复制内容）

### EvidencePackage

离线导入/分享的证据包（结构由观测协议底座定义）；本特性只要求：

- 同一份证据包在“内嵌面板/离线导入”两种形态中结论一致（排序/计数/审计命中）。

