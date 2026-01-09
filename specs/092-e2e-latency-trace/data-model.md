# Data Model: 092 E2E Latency Trace

> 本文件定义 092 的关键实体、segment 集合与采样/去重规则，用于实现阶段对齐 Devtools 展示、回归断言与成本控制门禁。

## Identity Rules（稳定锚点）

- `linkId`（ActionRunId）: 来自 088 的 ActionRun 锚点（E2E trace 主锚点）。
- `txnSeq/txnId/opSeq`: 复用既有稳定锚点体系，用于把 segment 关联到事务与边界操作。

## Segment Set（最小集合）

> 最小集合固定（paint 可选增强）：

- `action:pending`
- `io:wait`
- `txn:commit`
- `notify:scheduled`
- `notify:flush`
- `react:commit`
- `action:settle`
- `paint`（可选；默认不采集，必须可关）

> `io:wait` 允许缺失（例如纯同步 action）；当存在时，其 start/end 必须对应同一条可解释 IO（如一次资源请求或一次 service 调用）。

## Entities

### TraceSegment（Slim）

- `kind: TraceSegmentKind`
- `startMonoMs: number`（单调时钟）
- `durationMs: number`（单调时钟差值）
- `reasonCode?: string`（有限枚举由实现固化；用于解释 priority/合并/取消等）
- `detail?: JsonValue`（可选；必须 Slim/可裁剪）

### E2ETraceSegmentEvent（导出事件）

每个 segment 一个事件，便于流式写入 ring buffer。

- `kind: "devtools"`
- `label: "trace:e2e"`
- `linkId: string`（ActionRunId）
- `meta`: 见 `specs/092-e2e-latency-trace/contracts/schemas/e2e-trace-segment-meta.schema.json`

### TraceSampleConfig

- `enabled: boolean`（默认 false）
- `sampleRate: number`（0..1；默认关闭；开启时建议从 0.01 起步）
- `allowList?: { actionIds?: ReadonlyArray<string>; moduleIds?: ReadonlyArray<string> }`

## Dedup & Correlation Rules（强约束）

- **commit 去重**：StrictMode/并发渲染下只记录 commit 级事件（不记录 render 次数），同一 commit 只记一次；以“快照锚点变化（snapshotToken/tickSeq）”进行去重。
- **commit 关联**：commit 必须关联本次 commit 的主 action `linkId`；若合并了多个链路，允许记录 `linkIds`（Slim/截断）并标注 `droppedLinkIdCount`。
- **时间线时间源**：segment 的 start/duration 必须基于单调时钟（`performance.now()` 或等价单调源）；不得用 epoch `timestamp` 计算 segment 时间线。
