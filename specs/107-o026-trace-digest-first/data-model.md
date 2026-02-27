# Data Model: O-026 Trace digest-first

## Entity: TraceDigestPayload

- **Fields**:
  - `schemaVersion`（当前为 `1`）
  - `digestAlgoVersion`（当前为 `converge_ir_v2`）
  - `lookupKey`
    - `staticIrDigest`
    - `nodeId`
    - `stepId`
  - `anchor`
    - `moduleId`
    - `instanceId`
    - `txnSeq`
    - `txnId`
    - `opSeq`
- **Validation Rules**:
  - `schemaVersion` 与 `digestAlgoVersion` 必须显式存在，作为跨端解码与回放兼容闸门。
  - `lookupKey.staticIrDigest` 与 `anchor` 必须同时存在，禁止仅出现其一。
  - `lookupKey.nodeId/stepId` 与 `lookupKey.staticIrDigest` 必须来自同一静态 IR 事实源（不可跨版本拼装）。
  - 任一字段缺失或错配必须产出可区分的降级原因码（`missing` vs `mismatch`）。

## Entity: StaticIrLookupKey

- **Fields**:
  - `staticIrDigest`
  - `nodeId`
  - `stepId`
- **Validation Rules**:
  - 在 `nodeId/stepId` 存在时，lookup key 必须可唯一定位静态结构。
  - 当只有 `staticIrDigest`（无 `nodeId/stepId`）时，消费端必须叠加 fieldPath/上下文约束，禁止裸 digest 直接回放。
  - `StaticIrLookupKey` 必须与 `TraceDigestPayload.lookupKey` 完全一致。

## Entity: TraceDigestDegradeRecord

- **Fields**:
  - `reasonCode`
  - `fallbackMode`
  - `anchor`
- **Validation Rules**:
  - 缺失与错配场景必须可区分。
  - `anchor` 字段必须回填触发降级时观测到的原始锚点快照，便于审计与重放解释。
