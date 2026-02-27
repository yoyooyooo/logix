# Data Model: O-023 Flow run(config)

## Entity: RunConfig

- **Fields**:
  - `effect`: Flow effect（必填）
  - `mode`: latest | exhaust | parallel | task
  - `options`: operation options（可选）
- **Validation Rules**:
  - mode 缺失时默认使用 `task`
  - mode 仅允许 latest/exhaust/parallel/task

## Entity: FlowRunPolicyDecision

- **Fields**:
  - `decisionType`
  - `reason`
  - `anchor`
- **State Transitions**:
  - `pending` -> `accepted | rejected | queued`

## Entity: FlowRunDiagnosticRecord

- **Fields**:
  - `eventCode`
  - `mode`
  - `decisionType`
  - `instanceId`
  - `txnSeq`
  - `opSeq`
- **Validation Rules**:
  - payload slim + serializable
