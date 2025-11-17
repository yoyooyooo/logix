# Data Model: 057 ReadQuery/SelectorSpec + SelectorGraph（静态 deps / 无 Proxy）

## Entities

### ReadQuery（runtime）

- `selectorId`: `string`
- `debugKey?`: `string`
- `reads`: `ReadonlyArray<string | number>`（fieldPath 或 pathId；初期允许 string）
- `select`: `(state) => unknown`
- `equalsKind`: `'objectIs' | 'shallowStruct' | 'custom'`
- `equals?`: `(prev, next) => boolean`（当 equalsKind=custom）

### ReadQueryStaticIr（可序列化）

- `selectorId`: `string`
- `debugKey?`: `string`
- `lane`: `'static' | 'dynamic'`
- `producer`: `'aot' | 'jit' | 'manual' | 'dynamic'`
- `readsDigest?`: `{ readonly count: number; readonly hash: number }`
- `fallbackReason?`: `string`（lane=dynamic 必填）
- `equalsKind`: `'objectIs' | 'shallowStruct' | 'custom'`

### SelectorGraph（module instance 内）

- `selectorsById`: `Map<selectorId, SelectorEntry>`
- `indexByReadRoot`: `Map<rootKey, ReadonlyArray<selectorId>>`（roots overlap 的倒排索引）
- `lastCommit`: `{ txnSeq; txnId; priority }`

### SelectorEntry

- `readQuery`: `ReadQuery`
- `cachedValue`: `unknown`
- `cachedAtTxnSeq`: `number`
- `subscribers`: `Set<Listener>`

### ReadLaneEvidence（Slim）

- `selectorId`
- `lane/producer/fallbackReason?`
- `txnSeq/txnId`
- `readsDigest?`

### StrictGate（配置）

- `mode`: `'off' | 'warn' | 'error'`
- `requireStatic?`: `{ selectorIds?: string[]; modules?: string[] }`（主键为 selectorId；debugKey 仅用于展示/报错）
- `denyFallbackReasons?`: `ReadonlyArray<string>`
