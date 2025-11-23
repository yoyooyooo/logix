# Example: External Integration

> **Scenario**: 实时股票看板
> **Features**: WebSocket 接入、外部事件响应、资源管理

## Schema Definition

```typescript
const StockSchema = Schema.Struct({
  symbol: Schema.String,
  price: Schema.Number,
  lastUpdate: Schema.Number,
  connectionStatus: Schema.Literal('connected', 'disconnected')
});
```

## Store Implementation

```typescript
const store = makeStore({
  schema: StockSchema,
  initialValues: { ... },
  context: WebSocketContext,

  logic: ({ on, mount, watch }) => [
    
    // 1. 挂载外部流 (Mount External Stream)
    // 将 WebSocket 的 price 流直接映射到 store.price
    // 这是一个 "Source of Truth" 的转移
    mount('price', (services) => 
      services.WebSocket.priceStream.pipe(
        Stream.map(msg => msg.price)
      )
    ),

    // 2. 响应外部事件 (React to Events)
    // 监听连接状态变化事件，更新 UI 状态
    on((services) => services.WebSocket.statusStream, 
      (status, { set }) => set('connectionStatus', status)
    ),

    // 3. 混合逻辑 (Mixed Logic)
    // 当价格变化时，自动更新 lastUpdate 时间戳
    // 注意：这里的 price 变化可能来自 mount 的 WebSocket 流
    watch('price', (_, { set }) => 
      set('lastUpdate', Date.now())
    )
  ]
});
```

## API Review

*   **一等公民**: `mount` 和 `on` 让外部流的处理变得和内部状态一样自然。
*   **资源管理**: 用户不需要手动 `subscribe/unsubscribe` WebSocket。Logix 的 Scope 会自动管理这些流的生命周期。
*   **流式思维**: 通过 `Stream.map` 等操作符，可以在数据进入 Store 之前进行预处理（清洗、转换）。
