# Research: 090 Suspense Resource/Query

## Decision: Resource/Query 的第一优先级是“协调”，不是“更快的 fetch”

**Chosen**: 资源层必须提供可协调语义：去重/取消/失效/预取/可解释事件；快网无 fallback、慢网稳定 fallback 作为验收目标。

**Rationale**:

- 单纯把 fetch 封装成 hook 并不能解决闪烁与过度反馈；需要框架级的协调与裁决点（尤其是去重与取消）。

## Decision: 资源请求必须能挂在 ActionRun 上

**Chosen**: Resource 生命周期事件与取消语义必须能关联到 088 的 ActionRun（或等价协调链）。

**Rationale**:

- 资源请求往往由交互触发；如果无法关联 action，就无法解释“谁触发、为什么取消、为什么失效刷新”。

## Decision: React 默认 suspend，同时提供显式 degrade

**Chosen**: React 消费侧默认采用 Suspense（suspend）；同时提供显式 degrade 模式（不 throw promise，返回 pending 状态）用于测试/诊断/特殊场景；两种模式共享同一资源状态机与去重/取消语义。

## Decision: cache 有界 + LRU（默认 maxEntries=200）

**Chosen**: 资源缓存必须有界、可配置；默认采用 LRU 淘汰，默认 `maxEntries=200`（保守基线）；优先淘汰已 settle 且无订阅者条目，避免内存泄露与请求风暴。

**Rationale**:

- “默认异步”若无上界会直接演化为缓存/诊断灾难；LRU + 上界是最小可交付的可控策略。
