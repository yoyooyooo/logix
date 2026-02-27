# Contract: Diagnostics (O-024)

## Event Requirements

- 必须发出 `type='diagnostic'` 且 `code='txn_lane_policy::resolved'` 事件。
- `trigger.details` 必须包含：
  - `cacheHit: boolean`
  - `captureSeq: number`（`cache_miss_recompute` 时固定为 `0`）
  - `reason: 'cache_hit' | 'cache_miss_recompute'`
  - `configScope: 'provider' | 'runtime_module' | 'runtime_default' | 'builtin'`
  - `queueMode: 'fifo' | 'lanes'`
- 事件必须保持 Slim 且可序列化（可直接 `JSON.stringify`）。
- diagnostics=off 时不得引入常驻 merge/诊断额外开销。
