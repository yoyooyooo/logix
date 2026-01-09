# Research: 092 E2E Latency Trace

## Decision: 以 ActionRun 作为 trace 主锚点

**Chosen**: E2E trace 不新增独立 traceId；复用/附着 088 的 action 链路 id，并通过 txnId/opSeq/notify 事件把链路串起来。

**Rationale**:

- 避免并行真相源：action/optimistic/resource/busy 都应共享同一锚点，才能解释因果链。

## Decision: 采样是硬要求（成本控制）

**Chosen**: 提供显式采样控制面（开关/比例/白名单），并要求采样关闭时近零成本；采样开启时开销可度量且在预算内。

## Decision: 最小 segment 集合固定（paint 可选）

**Chosen**: 最小 segment 集合固定为：`action:pending`、`action:settle`、`txn:commit`、`notify:scheduled`、`notify:flush`、`react:commit`；`paint` 为可选增强且默认不采集（必须可关）。

## Decision: React 侧只记录 commit 事件，并按快照锚点去重

**Chosen**: StrictMode/并发渲染下不记录 render 次数，只记录 commit 级别事件；以“快照锚点变化（snapshotToken/tickSeq）”进行去重，避免重复计费与误导。
