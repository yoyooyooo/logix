# Matrix Examples: External & Lifecycle (Standard Paradigm)

> **Focus**: 外部流集成、高频推送、生命周期管理  
> **Note**: 本文示例基于当前主线 Effect-Native 标准范式。所有外部事件源都应被封装为 `Effect.Service` 并通过依赖注入在 `Logic` 中消费。实际代码应在对应 ModuleDef 上通过 `ModuleDef.logic(($)=>...)` 获取 `$`。

## S10: 实时推送 (Realtime Push)

**标准模式**: 将 WebSocket 封装为服务，`Logic` 订阅其暴露的 `Stream`。

```typescript
// 1. 定义服务接口
class PriceService extends Context.Tag("PriceService")<PriceService, {
  readonly price$: Stream.Stream<number>;
}>() {}

// 2. 在 Logic 中消费（概念上，这里的 `$Stock` 表示针对 StockShape + PriceService 预绑定的 Bound API）
const realTimeLogic: Logic.Of<StockShape, PriceService> =
  Effect.gen(function* (_) {
    const priceSvc = yield* $Stock.use(PriceService);

    // 将外部价格流接入状态更新
    yield* priceSvc.price$.pipe(
      $Stock.flow.run(price =>
        $Stock.state.mutate(draft => { draft.stock.price = price; })
      )
    );
  })
);
```

## S11: 高频推送 (High Frequency Push)

**标准模式**: 在 `Logic` 消费 `Stream` 之前，使用 `Stream` 的原生操作符（如 `chunkN` 或 `debounce`) 进行缓冲或采样，然后通过一次 `state.mutate` 批量更新。

```typescript
// 概念上，这里的 `$Data` 表示针对 DataShape + HighFrequencyService 预绑定的 Bound API。
const highFrequencyLogic: Logic.Of<DataShape, HighFrequencyService> =
  Effect.gen(function* (_) {
    const hfSvc = yield* $Data.use(HighFrequencyService);

    yield* hfSvc.events$.pipe(
      // 每 50 毫秒或每 100 个事件，将事件打包成一个数组 (Chunk)
      Stream.chunkN(100),
      Stream.debounce('50 millis'),
      // 对每个事件包进行批量处理
      $Data.flow.run(chunk =>
        $Data.state.mutate(draft => {
          chunk.forEach(event => {
            draft.data[event.id] = event.value;
          });
        })
      )
    );
  })
);
```

## S12: 初始化加载 (Init Load)

**标准模式**: 在 Logic 程序的 `Effect.gen` 主体中直接编写初始化逻辑。这个 Effect 只会在 `Logic` 首次启动时执行一次。

```typescript
// 概念上，这里的 `$User` 表示针对 UserShape + UserApi 预绑定的 Bound API。
const initialLoadLogic: Logic.Of<UserShape, UserApi> =
  Effect.gen(function* (_) {
    const api = yield* $User.use(UserApi);
    const { userId } = yield* $User.state.read;

    // Logic 初始化时直接执行加载
    yield* $User.state.mutate(draft => { draft.meta.isLoading = true; });
    const data = yield* api.fetchUser(userId);
    yield* $User.state.mutate(draft => {
      draft.data = data;
      draft.meta.isLoading = false;
    });

    // ... 此处可以继续定义其他流式监听逻辑
  })
);
```

## S13: 销毁清理 (Dispose)

**标准模式**: 开发者 **无需手动清理**。所有在 `Logic` 中启动的流 (`flow.run`) 或 `Effect` (`Effect.forkScoped`) 都会被绑定到 `Store` 的 `Scope` 上。当 `Store` 被销毁时，`Scope` 会被关闭，Effect 运行时会自动中断所有相关的 Fibers，并执行所有注册的 `finalizer`（例如断开 WebSocket 连接、清除定时器等）。这是 Effect 结构化并发带来的核心优势之一。
