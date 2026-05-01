# Data Model: 097 Runtime-Scoped Observability

## 核心实体

### RuntimeObservabilityBucket

每个 `runtimeLabel` 对应一个隔离桶：

- `runtimeLabel: string`
- `events: RuntimeDebugEventRef[]`（该 runtime 的 ring window）
- `latestStates: Map<string, JsonValue>`（key: `runtimeLabel::moduleId::instanceId`）
- `latestFieldSummaries: Map<string, JsonValue>`（key: `runtimeLabel::moduleId::instanceId`）
- `exportBudget: { dropped: number; oversized: number }`

### GlobalSnapshotProjection（兼容视图）

- 作为 `getDevtoolsSnapshot()` 的兼容输出。
- 来源：由多个 `RuntimeObservabilityBucket` 聚合生成，不再作为唯一真实存储。

### RuntimeScopedSnapshot

- 作为 `getDevtoolsSnapshotByRuntimeLabel(runtimeLabel)` 输出。
- 仅暴露目标 runtime 的 `events/latest/exportBudget` 与对应实例计数。

## 关系

- `runtimeLabel (1) -> (N) RuntimeObservabilityBucket`
- `RuntimeObservabilityBucket.events` 与 `latest*` 共享同一 runtime 作用域。
- `GlobalSnapshotProjection` 是 buckets 的只读聚合，不反向写入 bucket。

## 状态变化

- `record(event)`：
  - 通过 `event.runtimeLabel` 路由到目标 bucket。
  - 更新 bucket 级 `events/latest/exportBudget`。
  - 同步维护全局兼容视图。
- `clearDevtoolsEvents(runtimeLabel?)`：
  - 传 `runtimeLabel`：仅清空目标 bucket 的事件窗口与预算计数。
  - 不传：清空所有 bucket（保持既有全局 clear 语义）。
