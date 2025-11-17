# Data Model: 067 core 纯赚/近纯赚性能优化（默认零成本诊断与单内核）

## Entities

### DebugSinkConsumptionProfile

用于描述“当前 sinks 集合是否可被判定为 errorOnly-only”，以便做门控与验收（不作为对外 API）。

- `hasAnySink`: `boolean`
- `isErrorOnlyOnly`: `boolean`
- `mayConsumeStateUpdate`: `boolean`（保守：除 errorOnly-only 外一律视为 true）
- `mayConsumeTraitTrace`: `boolean`（保守：除 errorOnly-only 外一律视为 true）

### DefaultTaxEvidenceSet

用于把“默认税”相关的 before/after/diff 证据落盘并可交接。

- `profile`: `'default' | 'soak' | 'quick' | string`
- `node`: `{ before: string; after: string; diff: string }`（suite: `converge.txnCommit`）
- `browser`: `{ before: string; after: string; diff: string }`（suite: `diagnostics.overhead.e2e`）
