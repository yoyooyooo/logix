# Contract: Replay Lookup (O-026)

## Lookup Mechanism

- Replay/Devtools 通过 `StaticIrLookupKey` 查询详情。
- lookup 失败时走降级策略并保留解释链。
- resolve 时必须校验 `lookupKey.staticIrDigest` 与目标事件一致，防止跨版本误命中。

## Invariants

- `traceDigestPayload.lookupKey` 与顶层 `traceLookupKey` 必须一致。
- `anchor` 与 `lookupKey.staticIrDigest` 必须来自同一事实源。
