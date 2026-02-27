# Contract: Digest Payload (O-026)

## Event Contract

- 默认字段：`schemaVersion + digestAlgoVersion + lookupKey + anchor`。
- `lookupKey` 结构：`staticIrDigest + nodeId? + stepId?`。
- 当前版本约束：`schemaVersion=1`，`digestAlgoVersion=converge_ir_v2`。
- 不再默认附带完整结构化 payload。
- payload 必须 Slim + serializable。

## Degrade Contract

- digest 缺失或错配必须输出稳定 reasonCode。
