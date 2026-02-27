# Data Model: O-021 Module 实例化 API 统一

## Entity: ModuleInstantiationIntent

- **Fields**:
  - `moduleDef`: 目标模块定义
  - `runtimeOptions`: 实例化配置
  - `caller`: 调用来源（core/examples/react/sandbox）
- **Validation Rules**:
  - moduleDef 必须存在且可构造
  - runtimeOptions 与模块契约版本匹配

## Entity: ModuleInstantiationResult

- **Fields**:
  - `instanceRef`: 运行实例引用
  - `contractVersion`: 使用的装配契约版本
  - `diagnosticAnchor`: 锚点集合（instanceId/txnSeq/opSeq）
- **State Transitions**:
  - `created` -> `wired` -> `ready`

## Entity: InstantiationDiagnosticRecord

- **Fields**:
  - `code`
  - `message`
  - `hint`
  - `anchor`
  - `payload`
  - `source`
- **Validation Rules**:
  - payload 必须可序列化
  - anchor 字段必须完整且稳定
