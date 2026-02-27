# Data Model: O-022 Action API 收敛

## Entity: ActionIntent

- **Fields**:
  - `entrypoint`: `dispatchers | actionToken | dispatchString`
  - `tokenOrType`: action 标识
  - `payload`: 规范化负载
  - `anchor`: 诊断锚点
- **Validation Rules**:
  - token/type 必须可解析到已注册 action
  - payload 必须匹配 action schema

## Entity: DispatcherFacade

- **Fields**:
  - `tokenMap`
  - `typedInvoker`
- **Validation Rules**:
  - facade 仅做薄封装，不持有额外状态

## Entity: ActionDispatchDiagnostic

- **Fields**:
  - `eventCode`
  - `entrypoint`
  - `actionId`
  - `instanceId/txnSeq/opSeq`
  - `result`
- **Validation Rules**:
  - payload slim + serializable
  - 入口字段与内核执行路径一致
