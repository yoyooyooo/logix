# Data Model: 090 Suspense Resource/Query

> 本文件定义 090 涉及的关键实体、标识规则与缓存/去重/取消语义，用于实现阶段对齐协议、测试与诊断事件（Slim/可序列化）。

## Identity Rules（稳定标识）

- `resourceKey`: Resource 的稳定标识（稳定字符串，可确定重建；禁止 random/time 默认）。
  - 推荐形态：`resource:<name>:<stableHash(args)>`（hash 必须稳定）。
- `generation`: 同一 `resourceKey` 下的请求代次（单调递增整数），用于乱序防护与取消后的结果丢弃。
- `linkId`（可选）: 若由 088 的 ActionRun 触发，可在事件中关联 initiator `linkId`；但缓存事实源始终以 `resourceKey` 为准。

## Entities

### ResourceKey

- `value: string`
- 约束：稳定、可比较、可用于 Map key（不允许对象引用作为 key）。

### ResourceState（按 key）

- `status: "idle" | "pending" | "success" | "failure" | "cancelled"`
- `generation: number`
- `value?: unknown`（success）
- `errorSummary?: SerializableErrorSummary`（failure；必须可序列化）
- `pendingSinceMonoMs?: number`（单调时钟；用于 busy 与 trace 的 duration 计算）

### CacheEntry（有界）

- `key: string`
- `state: ResourceState`
- `tags?: ReadonlyArray<string>`（用于 invalidateTag）
- `lastAccessMonoMs: number`（用于 LRU）
- `consumerCount: number`（引用计数；用于取消/清理）

> 上界：
>
> - `maxEntries=200`（默认；可配置）
> - 淘汰优先级：先淘汰已 settle 且 `consumerCount=0` 的条目；必要时才淘汰 pending（并明确 cancel 原因）。

### ResourceRequest（运行期）

- `abort?: AbortController`（优先）
- `promise: Promise<unknown>`（共享同 key 去重）

## Protocol Rules（强约束）

- **去重**：同一 `resourceKey` 的并发请求必须共享同一个 pending（promise/effect）。
- **取消**：采用引用计数；仅当无剩余消费者时才中止底层请求（优先 AbortController）。
- **乱序防护**：resolve/reject 必须携带 generation guard；旧代次结果必须丢弃，禁止污染新状态。
- **失效**：
  - `invalidateKey(key)` 默认删除条目；下次读取触发重取（不默认 SWR）。
  - `invalidateTag(tag)` 删除所有包含该 tag 的条目。
- **Suspend vs Degrade**：React 消费默认 suspend；必须提供显式 degrade 模式（不 throw promise，返回 pending 状态），两种模式共享同一状态机与取消/去重语义。

## Relationships

- ResourceState 的 pending/settle 是 091 BusyPolicy 的事实源之一。
- Resource lifecycle 事件允许关联 initiator `linkId`（用于 092 E2E trace），但不得影响缓存共享与取消判定。

