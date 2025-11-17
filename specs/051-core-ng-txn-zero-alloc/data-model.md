# Data Model: 051 core-ng 事务零分配（txn zero-alloc）

> 本 spec 主要是“实现形态/分配行为”约束，因此数据模型仅保留对证据与降级策略有帮助的最小实体。

## Entities

### TxnAllocGate

- `mode`: `'light' | 'full'`
- `violations`: `ReadonlyArray<string>`（仅 diagnostics=light/full；off 不输出）

### TxnPerfEvidenceSet

- `matrixId`: `string`
- `matrixHash`: `string`
- `profile`: `'default' | 'soak' | 'quick' | string`
- `node`: `{ before: string; after: string; diff: string }`
- `browser`: `{ before: string; after: string; diff: string }`
