# Logix v2 Capabilities: AI-Driven Enhancements

> **Status**: Draft
> **Purpose**: 扩展 Logix 核心能力，以支撑 `intent-driven-ai-coding` v2 规划中的复杂场景（流编排、意图优先级、瞬态事件）。

## 1. Stream Orchestration (流式编排)

为了解决复杂并发协同（如 Auto Save vs Manual Save），Logix 引入 **Inputs** 和 **Stream Logic**。

### 1.1 Inputs Definition

`inputs` 定义了不属于 State 的外部事件流（External Event Sources）。

```typescript
const store = makeStore({
  // ...
  inputs: {
    saveBtnClick: Stream.make<void>(),
    wsMessage: Stream.make<Message>()
  }
});
```

### 1.2 Stream Logic

`logic` 函数除了返回 `watch` 规则外，还可以返回可执行的 `Effect`（通常是 `Stream.run...`）。

```typescript
logic: ({ inputs, state$, services }) => [
  // 传统的 Watch Rule
  watch('count', ...),

  // Stream Orchestration Rule
  Stream.merge(
    inputs.saveBtnClick.pipe(map(() => 'manual')),
    state$.pipe(map(() => 'auto'), debounce('2s'))
  ).pipe(
    // 核心价值：声明式并发控制
    switchMap(mode => performSave(mode)),
    Stream.runDrain // 必须显式运行
  )
]
```

## 2. Intent Priority & Metadata (意图优先级与元数据)

为了解决多规则冲突（User vs Rule vs Admin），Logix 增强了 `set` 操作，支持传递元数据。

### 2.1 Enhanced Set API

```typescript
interface SetOptions {
  source?: string;   // e.g. 'user-input', 'rule-calc', 'admin-policy'
  priority?: number; // e.g. 0 (default), 10 (high), 100 (force)
  tag?: string;      // 调试标签
}

// 在 Handler 中使用
watch('price', (price, { set }) => 
  set('total', price * qty, { source: 'rule-calc', priority: 1 })
)
```

### 2.2 Conflict Resolution Strategy

Logix 内部维护一个 `FieldMeta` 映射。当发生 `set` 时：

1.  **Check Priority**: 如果 `newPriority < currentPriority`，则忽略写入（或抛出警告）。
2.  **Update Meta**: 如果写入成功，更新该字段的 `currentPriority` 和 `source`。
3.  **Reset Mechanism**: 需要一种机制重置优先级（例如用户手动清除覆盖）。

### 2.3 Context Meta Access

`watch` 的 `ctx` 参数暴露触发源的元数据，允许逻辑层做决策。

```typescript
watch('total', (total, { set }, ctx) => {
  // 如果 total 是用户手动修改的 (High Priority)，则不反算单价
  if (ctx.meta.priority > 0) return;
  // ...
})
```

## 3. Unified Action (统一意图)

为了避免 Schema 污染，Logix 将瞬态信号（Ephemeral Signals）合并入 Action 体系。

### 3.1 Action Definition

```typescript
const store = makeStore({
  schema: DataSchema,
  actionSchema: Schema.Union(
    // 数据变更意图
    Schema.Struct({ _tag: 'updateUser', name: Schema.String }),
    // 瞬态交互意图 (原 Signal)
    Schema.Struct({ _tag: 'openDialog', dialogId: Schema.String }),
    Schema.Struct({ _tag: 'toast', msg: Schema.String })
  )
});
```

### 3.2 Action Usage

*   **Dispatch**: `api.ops.actions.openDialog({ dialogId: 'my-modal' })`
*   **Listen**: `api.on.action('openDialog')`

Action 统一承载所有意图，无论是改数据还是弹窗。瞬态 Action 不会触发 Reducer，只触发监听它的 Rule。

## 4. Fine-Grained Subscription (细粒度订阅)

为了支持高性能 UI，Logix 暴露 Selector 能力。

```typescript
// React Adapter
const price = useStore(store, 
  // Selector: 只订阅 items[0].price 的变化
  state => state.items[0].price,
  // Equality Fn
  (a, b) => a === b
);
```

Logix 的 `state$` 流支持 `map` + `distinctUntilChanged` 派生出细粒度流。
