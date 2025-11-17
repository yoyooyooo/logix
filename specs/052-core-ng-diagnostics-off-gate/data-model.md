# Data Model: 052 diagnostics=off 近零成本 Gate

## Entities

### DiagnosticsOffGateViolation

- `kind`: `'steps_array' | 'label_materialize' | 'timing_in_loop' | 'mapping_materialize' | string`
- `hint?`: `string`（仅 light/full）

### DiagnosticsOverheadEvidenceSet

- `profile`: `'default' | 'soak' | 'quick' | string`
- `node`: `{ before: string; after: string; diff: string }`（suite: `converge.txnCommit`）
- `browser`: `{ before: string; after: string; diff: string }`
