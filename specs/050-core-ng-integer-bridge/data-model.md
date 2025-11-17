# Data Model: 050 core-ng 整型桥（Integer Bridge）

## Entities

### FieldPath

- `segments`: `ReadonlyArray<string>`
- `canonical`: `string`（仅用于显示/序列化边界；事务内避免反复计算）

### IdRegistry

- `fieldPathId`: `number`（stable id）
- `stepId`: `number`
- `reasonCode`: `number`
- `decode`: `(id) -> readable`（仅 light/full）

### TxnPatchRecording

- `light`: argument-based recording（不 materialize patch 对象）
- `full`: 允许 materialize patch 对象（保留历史），但不得在调用点先分配

### DirtySet

- `dirtyAll`: `boolean`
- `reason?`: `DirtyAllReason`（Slim、可序列化；仅在 `dirtyAll=true` 时必填）

### PerfEvidenceSet

- `matrixId`: `string`
- `matrixHash`: `string`
- `profile`: `'default' | 'soak' | 'quick' | string`
- `envId`: `string`（用于保证可比性；建议从 report `meta.env` 归一化得出）
- `node`: `{ before: string; after: string; diff: string }`
- `browser`: `{ before: string; after: string; diff: string }`
