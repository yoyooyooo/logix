# Contract: [DEFERRED] React ModuleCache 显式回收（eviction / clear）

**Branch**: `037-route-scope-eviction`  
**Source Spec**: `specs/037-route-scope-eviction/spec.md`

> **[DEFERRED]** 本契约对应的显式回收 API 当前不在 037 的交付范围内。
>
> 若后续确认“卸载/替换边界 Provider 或切换稳定 key”仍不足以覆盖 keep-alive 边界，再另起 spec 推进该能力，并补齐性能基线与诊断链路。

## 1) API Surface

`@logixjs/react` MUST 提供一个稳定的 public API（不得依赖 `./internal/*`）用于显式回收 ModuleCache 条目。契约以命名空间形式描述（具体导出形态由实现决定）：

```ts
type EvictReport = {
  readonly matched: number
  readonly evictedNow: number
  readonly deferred: number
}

ReactModuleCache.evictKey(
  runtime: ManagedRuntime,
  key: string,
): EvictReport

ReactModuleCache.evictPrefix(
  runtime: ManagedRuntime,
  prefix: string,
): EvictReport

ReactModuleCache.clear(
  runtime: ManagedRuntime,
): EvictReport
```

### 1.1 返回值语义（EvictReport）

- `matched`：本次选择器命中的条目数
- `evictedNow`：本次调用中立即回收并移除的条目数（Idle 或可立即终止的 pending）
- `deferred`：由于 `refCount>0` 等原因无法立刻回收、已标记为“待释放后回收”的条目数

约束：

- API MUST 不抛异常（未知 key/prefix 为 `matched=0` 的 no-op）。
- API MUST 不跨 runtime tree 生效（只影响传入的 runtime 对应 cache）。

## 2) Selector Semantics

### 2.1 evictKey(runtime, key)

`key` 的语义与 `useModule(Impl, { key })` 的 `options.key` 对齐：

- 回收应匹配所有 internalKey 以 `${key}:` 开头的条目（覆盖 depsHash 变化导致的多条目）。

### 2.2 evictPrefix(runtime, prefix)

- 回收应匹配所有 internalKey 以 `prefix` 开头的条目。
- 推荐业务侧显式带分隔符前缀（如 `route:${routeId}:`）以避免误匹配。

### 2.3 clear(runtime)

- 回收该 runtime 对应 cache 下的全部条目。

## 3) Deterministic Behavior（状态相关语义）

### 3.1 Idle 条目（refCount=0）

- MUST 立即回收并从 cache 移除（`evictedNow++`）。

### 3.2 In-use 条目（refCount>0）

- MUST 不关闭条目的 Scope（不得破坏当前持有方稳定运行）。
- MUST 标记该条目为 `evictRequested`，并保证最后一次释放后尽快回收：
  - 最后一次 `release` 归零后应以近似“立即”触发回收（不再等待 `gcTime`）。
- 本次调用计入 `deferred++`。

### 3.3 Pending 条目（status=pending）

- 被动 GC 为避免 Suspense 永远挂起可以选择延后回收；
- 但显式回收作为更强边界信号：
  - MUST 允许中止并移除 pending 条目（`evictedNow++`），保证不会留下僵尸 Entry/Scope。

### 3.4 Error 条目（status=error）

- MUST 允许显式回收并移除（`evictedNow++`）。
- 回收后下一次同 selector 的创建应允许重试并可恢复。

## 4) Diagnostics（可解释链路）

显式回收 MUST 提供可解释链路（默认近零成本）：

- 在显式回收调用点记录一条 trace 事件，至少包含：
  - selector（key/prefix/clear）、matched/evictedNow/deferred
  - 若 deferred>0，必须能解释“为何未立刻回收”（例如 `refCount>0`）
- 在最终回收发生时（GC/evict 完成）记录一条 trace 事件，能关联到 moduleId/instanceId/key。

事件形态建议复用既有 `trace:react.module-instance`（实现可扩展其 `data.event` 值）。

## 5) Test Matrix（实现必须覆盖）

- `evictKey`：
  - idle：回收后同 key 重建为新实例（状态归零、instanceId 变化）。
  - in-use：不打断，释放后回收并重建为新实例。
- `evictPrefix`：
  - 多条目命中与部分命中，结果报告正确。
  - 幂等：重复调用不抛错。
- pending：
  - 显式回收不会留下僵尸条目；后续重试可重新创建。
- error：
  - 显式回收后允许重试恢复；不永久卡在错误缓存。
- 隔离：
  - 不同 runtime tree 之间的回收互不影响。
