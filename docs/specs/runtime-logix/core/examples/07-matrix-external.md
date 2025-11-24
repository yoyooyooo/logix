# Matrix Examples: External & Lifecycle (S10-S13)

> **Focus**: 外部流集成、高频推送、生命周期

## S10: 实时推送 (Realtime Push)
**Trigger**: T4 (External) -> **Effect**: E1 (Sync Mutation)

```typescript
// 需求：将 WebSocket 的 price 消息同步到 Store
on(services.WebSocket.priceStream, (msg, { set }) => 
  set('stock.price', msg.price)
)
```

## S11: 高频推送 (High Frequency Push)
**Trigger**: T4 (External) -> **Effect**: E4 (Batch)

```typescript
// 需求：WS 每秒推送 1000 次，需要缓冲并批量更新
// 这是一个 User Land 的实现模式，Logix 提供基础能力
on(
  services.WebSocket.highFreqStream.pipe(
    // 使用 Effect Stream 的缓冲能力
    Stream.groupedWithin(100, "50 millis")
  ), 
  (chunk, { batch }) => 
    // chunk 是一个数组
    batch((ops) => 
      Effect.forEach(chunk, (msg) => 
        ops.set(`data.${msg.id}`, msg.value)
      )
    )
)
```

## S12: 初始化加载 (Init Load)
**Trigger**: T5 (Lifecycle) -> **Effect**: E2 (Async Computation)

```typescript
watch('userId', (id, { set, services }) => 
  Effect.gen(function*() {
    const api = yield* services.UserApi;
    const data = yield* api.fetch(id);
    yield* set('data', data);
  }),
  { immediate: true } // 关键：Store 创建时立即触发
)
```

## S13: 销毁清理 (Dispose)
**Trigger**: T5 (Lifecycle) -> **Effect**: E1 (Cleanup)

```typescript
// 需求：Store 销毁时断开连接
// 实际上，on/mount 产生的流会自动被 Scope 管理
// 如果有额外的资源，可以在 handler 里注册 finalizer
watch('isConnected', (connected, { services }) => 
  Effect.gen(function*() {
    if (connected) {
      const socket = yield* services.WebSocket.connect();
      // 注册清理逻辑
      yield* Effect.addFinalizer(() => socket.disconnect());
    }
  })
)
```
