# Example: External Integration (v3 Standard Paradigm)

> **Scenario**: 实时股票看板
> **Features**: WebSocket 接入、外部事件响应、资源管理
> **Note**: 本示例是 v3 中处理外部事件源的 **黄金标准实现**。它演示了如何将外部流（如 WebSocket）封装为 `Effect.Service`，并通过依赖注入在 `Logic` 中安全地消费。

## 1. Schema Definition

```typescript
import { Schema, Context, Effect, Stream } from 'effect';
import { Store, Logic } from '~/logix-v3-core'; // 概念性路径

const StockStateSchema = Schema.Struct({
  symbol: Schema.String,
  price: Schema.Number,
  lastUpdate: Schema.Number,
  connectionStatus: Schema.Literal('connected', 'disconnected')
});

const StockActionSchema = Schema.Never;

type StockShape = Store.Shape<typeof StockStateSchema, typeof StockActionSchema>;
```

## 2. Service Definition (The v3 Way)

将 WebSocket 连接和事件流封装为一个独立、可测试的服务。

```typescript
// a-websocket.service.ts

// 定义服务接口
class WebSocketService extends Context.Tag("WebSocketService")<WebSocketService, {
  readonly status$: Stream.Stream<'connected' | 'disconnected'>;
  readonly price$: Stream.Stream<number>;
}>() {}

// 服务的 Live 实现 (Layer)
const WebSocketServiceLive = Layer.succeed(
  WebSocketService,
  {
    status$: Stream.fromIterable(['connected']),
    price$: Stream.periodic(1000).pipe(Stream.map(() => Math.random() * 100 + 100))
  }
);
```

## 3. Logic Implementation

`Logic` 通过其环境 `R` 接收 `WebSocketService`，然后像处理内部流一样处理外部流。

```typescript
// a-stock.logic.ts

const $Stock = Logic.forShape<StockShape, WebSocketService>();

export const StockLogic = Logic.make<StockShape, WebSocketService>(
  Effect.gen(function* (_) {
    const ws = yield* $Stock.services(WebSocketService);

    const statusLogic = ws.status$.pipe(
      $Stock.flow.run(status =>
        $Stock.state.mutate(draft => { draft.connectionStatus = status; })
      )
    );

    const priceLogic = ws.price$.pipe(
      $Stock.flow.run(price =>
        $Stock.state.mutate(draft => {
          draft.price = price;
          draft.lastUpdate = Date.now();
        })
      )
    );

    yield* Effect.all([statusLogic, priceLogic], { discard: true });
  })
);
```

## 4. Store Instantiation

在创建 `Store` 时，需要将 `Logic` 所依赖的 `Layer` 提供给 `Effect.run`。

```typescript
// a-stock.store.ts

const StockStateLayer = Store.State.make(StockStateSchema, { ...initialValues });
const StockActionLayer = Store.Actions.make(StockActionSchema);

export const StockStore = Store.make<StockShape>(
  StockStateLayer,
  StockActionLayer,
  StockLogic
);

// 在应用入口处，为 Store 的运行提供所有依赖的 Layer
const AppLayer = Layer.merge(WebSocketServiceLive, ...otherLayers);

Effect.runFork(StockStore.run.pipe(Effect.provide(AppLayer)));
```

## 5. Design Rationale

- **Architectural Purity**: v3 范式将外部源视为标准的 `Effect.Service`。这确保了所有逻辑，无论是响应内部状态还是外部事件，都遵循统一的依赖注入和生命周期管理模型，使得 `Logic` 单元保持纯粹，只关注业务规则。
- **Resource Safety**: 外部连接的生命周期（如 WebSocket 的连接、订阅和断开）完全由其 `Layer` 实现来管理。`Logic` 无需关心资源清理，当 `Store` 的 `Scope` 关闭时，Effect 运行时会保证所有流的终结和相关资源的释放。
- **Testability**: 通过将外部源封装为服务，可以在测试中轻易地用一个 Mock `Layer` 来替换其真实实现。这使得 `Logic` 的行为测试变得精确、可靠，且不依赖任何真实的网络或外部系统。
