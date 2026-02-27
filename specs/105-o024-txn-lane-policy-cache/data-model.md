# Data Model: O-024 Txn Lane 策略前移缓存

## Entity: TxnLanePolicyCacheEntry

- **Fields**:
  - `captureSeq`
  - `reason`: `capture | re_capture`
  - `resolvedPolicy`
- **Validation Rules**:
  - captureSeq 必须单调
  - resolvedPolicy 必须可序列化

## Entity: TxnLanePolicyResolutionContext

- **Fields**:
  - `cacheHit`
  - `captureSeq`
  - `reason`: `cache_hit | cache_miss_recompute`
  - `configScope`: `provider | runtime_module | runtime_default | builtin`
  - `queueMode`: `fifo | lanes`
- **Validation Rules**:
  - `captureSeq=0` 仅允许出现在 `cache_miss_recompute` 场景

## Entity: TxnLanePolicyDiagnosticRecord

- **Fields**:
  - `eventCode`
  - `cacheHit`
  - `captureSeq`
  - `reason`
  - `configScope`
  - `queueMode`
  - `anchor`（`instanceId` 必填；`txnSeq/opSeq` 按事件上下文可选）
- **Validation Rules**:
  - 事件必须 Slim + serializable
