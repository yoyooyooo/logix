# 2026-03-20 · P2-1B · continuation 下的 lane evidence / txnSeq / opSeq / replay contract（implementation-ready）

## 目标

在引入 deferred converge continuation 形态后，继续满足以下硬约束：

- `trace:txn-lane` 等证据事件的锚点可追溯、可复现、字段稳定且可序列化。
- `txnSeq/opSeq` 在同一轮 continuation 内保持稳定锚点语义，避免 slice 粒度漂移导致的证据断链。
- `state:update.replayEvent` 在 continuation 下提供 anchor 与 slice 双层语义，保证解释链路与回放桥接成立。

本文只定义协议与语义，不实现 continuation 本体，不改 public API，不回到 queue-side 微调。

## 一页摘要（给实施线）

裁决点只有两个：

1. continuation 存在时，`trace:txn-lane.txnSeq/opSeq` 取 continuation anchor，保证一轮 continuation 内稳定不变。
2. slice 级别的 txn/op 序列与推进窗口不丢，落到 `origin.details` 与 `state:update.replayEvent.continuation.*`，形成 anchor 与 slice 双层语义。

## 范围

- 覆盖面：`trace:txn-lane` 证据事件锚点语义，`origin.details` 的 continuation 细节字段，`state:update.replayEvent` 的重映射语义。
- 默认前提：`P2-1A deferred converge continuation handle` 已存在或将被实现，引入“同一轮 flush 内多 slice 连续推进”的执行形态。

## 术语

- continuation：一次 deferred converge flush 轮次内的“连续推进上下文”，跨多个 slice。
- slice：continuation 内的一个推进片段，对应一次时间片窗口。
- anchor：continuation 内固定不变的锚点序列，用于把多 slice 的证据与回放聚合到同一条可追溯链路上。
- slice proof：为保留片段级证据与解释能力，在 `origin.details` 与 `replayEvent.continuation.*` 中携带的 slice 元数据。

## 出现条件（必须按此分流）

### 情况 1：无 continuation

- `origin.details` 不出现任何 `continuation*` 字段。
- `trace:txn-lane.txnSeq/opSeq` 保持现有语义，等价于 `per_slice_txn_anchor`。
- `state:update.replayEvent` 不做重映射，不出现 `replayEvent.continuation`。

### 情况 2：有 continuation 且可提供 anchor

- `origin.details` 必须包含本文定义的 required 字段集合。
- `trace:txn-lane.txnSeq/opSeq` 使用 anchor 语义，slice proof 只在 `origin.details` 表达。
- `state:update.replayEvent` 必须完成重映射并附带 `replayEvent.continuation.*`。

### 情况 3：有 continuation 但缺少 anchor 信息

契约级错误。实现侧不得产生这种事件组合。

## 总体裁决

### 1) lane evidence 的锚点模型

- 旧模型：`per_slice_txn_anchor`，每个 slice 产生一笔 txn 的 `txnSeq/opSeq`，`trace:txn-lane` 直接使用该对序列作为锚点。
- 新模型：`per_continuation_anchor`，同一轮 continuation 内：
  - `trace:txn-lane` 的 `txnSeq/opSeq` 取 continuation anchor，保证稳定；
  - slice 自身的 txn/op 序列作为 slice proof 保留在 `origin.details`，用于解释链路与 replay 重映射。

### 2) anchor 与 slice 的双层语义

当 continuation 存在并且具备 anchor 信息时，事件里的 `txnSeq/opSeq` 表达 anchor 语义，同时通过以下两个位置提供 slice 语义：

- `origin.details.*` 提供 slice proof，用于 trace 事件解释链路。
- `state:update.replayEvent.continuation.*` 提供 slice proof，用于回放桥接与可视化对齐。

## 事件与字段契约

本节按“增量契约”描述，避免复制现有事件的全量字段集合。

### A. `origin.details` 的 continuation 字段集合

当某次 run 处于 deferred continuation 内时，`origin.details` 必须包含以下 required 字段。字段命名以 camelCase 表达，落到实现侧时允许做细微命名适配，语义与集合不可变。

required:

- `continuationId: string`
  - 同一轮 continuation 内稳定不变。
- `continuationSliceSeq: number`
  - 从 1 开始单调递增，表示当前 slice 在本轮 continuation 内的序号。
- `continuationAnchorTxnSeq: number`
- `continuationAnchorTxnId: string`
- `continuationAnchorOpSeq: number`
  - 语义：本轮 continuation 的锚点序列与锚点 txnId。锚点在首个 slice 固化，后续 slice 不变。
- `continuationSliceTxnSeq: number`
- `continuationSliceTxnId: string`
- `continuationSliceOpSeq: number`
  - 语义：当前 slice 的原始 txn/op 序列与 txnId，用于保留片段级证据。

optional:

- `continuationSliceWindow: { start: number; end: number }`
  - 语义：当前 slice 在 converge step cursor 上覆盖的窗口，`start` 与 `end` 采用 step index，`end` 为 exclusive。
  - 要求：同一轮 continuation 内相邻 slice 的窗口可排序，并且窗口区间不反向。

required invariants:

- `continuationId` 在同一轮 continuation 内稳定不变，跨轮次不得复用。
- `continuationSliceSeq` 严格递增并且从 1 开始，不允许跳回。
- `continuationAnchorTxnSeq/continuationAnchorTxnId/continuationAnchorOpSeq` 在同一轮 continuation 内稳定不变。
- `continuationSliceTxnSeq/continuationSliceTxnId/continuationSliceOpSeq` 允许随 slice 变化，用于保留原始序列语义。

### B. `trace:txn-lane` 的锚点选择与 slice proof

`trace:txn-lane` 的锚点字段集合保持为 `txnSeq/opSeq`，并裁决以下选择规则。

锚点选择规则：

1. 若 `origin.details` 提供了 `continuationAnchorTxnSeq` 与 `continuationAnchorOpSeq`，事件顶层 `txnSeq/opSeq` 取 anchor 值。
2. 否则事件顶层 `txnSeq/opSeq` 取当前 slice 的原始值，语义等价于旧模型。

slice proof 要求：

- 当采用 anchor 作为顶层 `txnSeq/opSeq` 时，必须在 `origin.details` 中保留 slice 字段：
  - `continuationId`
  - `continuationSliceSeq`
  - `continuationSliceTxnSeq/continuationSliceTxnId/continuationSliceOpSeq`
  - 若存在 `continuationSliceWindow`，一并保留
- 解释链路要求：Devtools 或离线证据分析必须能在不读代码的前提下回答：
  - 该 `trace:txn-lane` 属于哪个 continuation
  - 当前 slice 是第几个 slice
  - 当前 slice 的原始 txn/op 序列是多少

### C. `state:update.replayEvent` 的 continuation 重映射

在 continuation 存在且具备 anchor 信息时，`state:update.replayEvent` 需要完成以下重映射并附带 `replayEvent.continuation` 对象。

重映射规则：

- 顶层序列对齐 anchor：
  - `replayEvent.txnSeq = continuationAnchorTxnSeq`
  - `replayEvent.txnId = continuationAnchorTxnId`
- 附带 continuation 对象，提供 anchor 与 slice 双层语义：
  - `replayEvent.continuation.anchor = { txnSeq, txnId, opSeq }`
  - `replayEvent.continuation.slice = { seq, txnSeq, txnId, opSeq }`
  - `replayEvent.continuation.sliceWindow = continuationSliceWindow`（若存在）

字段语义裁决：

- `replayEvent.txnSeq/txnId` 表达 anchor 语义，用于把同一轮 continuation 的多次 `state:update` 归并到同一条回放链路。
- `replayEvent.continuation.slice.*` 表达 slice 语义，用于解释该次更新来自 continuation 的哪个片段。

当 continuation 不存在或缺少 anchor 信息时：

- `replayEvent.txnSeq/txnId` 保持原有语义。
- `replayEvent.continuation` 不出现。

## 不变量与可验证性

- Slim：新增字段只允许数值与短字符串，禁止大对象与不可序列化值。
- 可复现：相同输入与相同执行形态下，锚点选择与重映射结果必须一致。
- 可追溯：
  - anchor 语义用于聚合与索引
  - slice 语义用于解释与定位
  - 两者同时存在时不互相覆盖语义

## 规范化算法（实施线直接照抄）

### 1) trace:txn-lane 的锚点规范化

```ts
function normalizeTxnLaneAnchor(input: {
  readonly txnSeq: number
  readonly opSeq: number
  readonly originDetails?: {
    readonly continuationAnchorTxnSeq?: number
    readonly continuationAnchorOpSeq?: number
  }
}): { readonly txnSeq: number; readonly opSeq: number; readonly usedContinuationAnchor: boolean } {
  const aTxnSeq = input.originDetails?.continuationAnchorTxnSeq
  const aOpSeq = input.originDetails?.continuationAnchorOpSeq
  if (typeof aTxnSeq === 'number' && typeof aOpSeq === 'number') {
    return { txnSeq: aTxnSeq, opSeq: aOpSeq, usedContinuationAnchor: true }
  }
  return { txnSeq: input.txnSeq, opSeq: input.opSeq, usedContinuationAnchor: false }
}
```

### 2) state:update.replayEvent 的重映射

```ts
function remapReplayEventForContinuation(input: {
  readonly replayEvent: { txnSeq: number; txnId: string }
  readonly originDetails?: {
    readonly continuationAnchorTxnSeq?: number
    readonly continuationAnchorTxnId?: string
    readonly continuationAnchorOpSeq?: number
    readonly continuationSliceSeq?: number
    readonly continuationSliceTxnSeq?: number
    readonly continuationSliceTxnId?: string
    readonly continuationSliceOpSeq?: number
    readonly continuationSliceWindow?: { start: number; end: number }
  }
}): {
  readonly replayEvent: {
    txnSeq: number
    txnId: string
    continuation?: {
      anchor: { txnSeq: number; txnId: string; opSeq: number }
      slice: { seq: number; txnSeq: number; txnId: string; opSeq: number }
      sliceWindow?: { start: number; end: number }
    }
  }
} {
  const d = input.originDetails
  if (
    typeof d?.continuationAnchorTxnSeq !== 'number' ||
    typeof d?.continuationAnchorTxnId !== 'string' ||
    typeof d?.continuationAnchorOpSeq !== 'number' ||
    typeof d?.continuationSliceSeq !== 'number' ||
    typeof d?.continuationSliceTxnSeq !== 'number' ||
    typeof d?.continuationSliceTxnId !== 'string' ||
    typeof d?.continuationSliceOpSeq !== 'number'
  ) {
    return { replayEvent: input.replayEvent }
  }
  return {
    replayEvent: {
      txnSeq: d.continuationAnchorTxnSeq,
      txnId: d.continuationAnchorTxnId,
      continuation: {
        anchor: {
          txnSeq: d.continuationAnchorTxnSeq,
          txnId: d.continuationAnchorTxnId,
          opSeq: d.continuationAnchorOpSeq,
        },
        slice: {
          seq: d.continuationSliceSeq,
          txnSeq: d.continuationSliceTxnSeq,
          txnId: d.continuationSliceTxnId,
          opSeq: d.continuationSliceOpSeq,
        },
        sliceWindow: d.continuationSliceWindow,
      },
    },
  }
}
```

## 事件示例（schema 形状对齐）

### `trace:txn-lane` 在 continuation 下的最小示例

```json
{
  "event": "trace:txn-lane",
  "txnSeq": 120,
  "opSeq": 450,
  "origin": {
    "details": {
      "continuationId": "c:abc",
      "continuationSliceSeq": 3,
      "continuationAnchorTxnSeq": 120,
      "continuationAnchorTxnId": "t:120",
      "continuationAnchorOpSeq": 450,
      "continuationSliceTxnSeq": 122,
      "continuationSliceTxnId": "t:122",
      "continuationSliceOpSeq": 461,
      "continuationSliceWindow": { "start": 200, "end": 260 }
    }
  }
}
```

### `state:update.replayEvent` 在 continuation 下的最小示例

```json
{
  "event": "state:update",
  "replayEvent": {
    "txnSeq": 120,
    "txnId": "t:120",
    "continuation": {
      "anchor": { "txnSeq": 120, "txnId": "t:120", "opSeq": 450 },
      "slice": { "seq": 3, "txnSeq": 122, "txnId": "t:122", "opSeq": 461 },
      "sliceWindow": { "start": 200, "end": 260 }
    }
  }
}
```

## 实施线交接清单

实现侧需要满足本文契约的最小落点集合，供开实施线时直接拆任务：

- 在 continuation 首个 slice 固化 anchor，并在每个 slice 更新 slice proof，写入 `origin.details`。
- `trace:txn-lane` 在 continuation 下使用 anchor 作为顶层 `txnSeq/opSeq`，同时保留 slice proof。
- `state:update.replayEvent` 在提交前完成重映射与 `replayEvent.continuation` 附着。

最小门禁建议来自既有证据脚本与用例集合，开线时以实现分支的实际命令为准：

- `packages/logix-core` 的 typecheck:test 与贴边测试
  - `TxnLaneEvidence.Schema`
  - `ModuleRuntime.TxnLanes.DefaultOn`
  - `StateTrait.ReplayEventBridge`

## 最小验收用例（实现线必须过）

1. 单轮 continuation，至少 3 个 slice：
   - `trace:txn-lane.txnSeq/opSeq` 三次事件完全相同
   - 三次事件的 `origin.details.continuationSliceSeq` 依次为 1,2,3
   - 三次事件的 `origin.details.continuationSliceTxnSeq/opSeq` 允许不同
2. 两轮 continuation 连续发生：
   - 两轮的 `origin.details.continuationId` 不相同
   - 两轮的 anchor 不要求相同
3. continuation 下的 replayEvent：
   - `state:update.replayEvent.txnSeq/txnId` 等于 anchor 的 `continuationAnchorTxnSeq/TxnId`
   - `state:update.replayEvent.continuation.slice.seq` 等于 `origin.details.continuationSliceSeq`
4. 无 continuation 的回归：
   - 无 `origin.details.continuation*` 字段时，`trace:txn-lane.txnSeq/opSeq` 与 `state:update.replayEvent` 行为不变

## 证据与参考

- 语义基线与目标语义对比：
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p2-1b-lane-evidence.before.json`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p2-1b-lane-evidence.after.json`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p2-1b-lane-evidence.diff.json`
- 历史草案（只读参考，本文给出最终 contract）：
  - `docs/perf/archive/2026-03/2026-03-19-p2-1b-lane-evidence.md`
