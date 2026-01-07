# Contracts: Diagnostics（auto-trigger 与 tick 关联）

## 原则

- diagnostics=off 近零成本：不得常态分配/扫全量 sources。
- 解释链以 tickSeq 为参考系：能回答“为何触发了这次 refresh”。
- 事件 Slim 且可序列化：仅输出摘要与锚点，不输出大对象。

## 事件口径（最小）

- `trace:tick`：来自 073（tick start/settled/budgetExceeded）
- `trace:source.auto`：本特性新增（diagnostics=light/full）
  - `tickSeq`
  - `instanceId`
  - `reason`: `mount | depsChange`
  - `affectedCount`
  - `debounce`: `{ scheduled, cancelled, fired }`（摘要计数）

## 成本门控

- diagnostics=off：不产生 `trace:source.auto`
- diagnostics=light/full：允许输出 `trace:source.auto` 摘要；不得附带 IR 全量内容

