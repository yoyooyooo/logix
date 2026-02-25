# Identity Model: 097 Runtime-Scoped Observability

## 目标

保证 runtime-scoped 观测在多 runtime 并发下可重建、可解释、可回放。

## 稳定身份字段

- `runtimeLabel`: runtime 作用域主键（分桶键）。
- `moduleId`: 模块主键。
- `instanceId`: 模块实例主键（宿主注入，禁止随机）。
- `txnSeq`: runtime 内事务单调序号。
- `opSeq`: 事务内操作单调序号。
- `eventSeq`: 实例维度事件序号（由 debug sink 维护）。

## 派生规则（确定性）

- `moduleKey = ${runtimeLabel}::${moduleId}`
- `instanceKey = ${runtimeLabel}::${moduleId}::${instanceId}`
- `txnId`（如需）：`${instanceId}::t${txnSeq}`
- `eventId`（如需）：`${instanceId}::e${eventSeq}`

## 约束

- 禁止使用 `Math.random()/Date.now()` 作为默认 identity 源。
- 同一 runtimeLabel 内，`txnSeq/opSeq` 必须单调可重放。
- 任何降级事件（dropped/oversized）不得破坏以上锚点可用性。
