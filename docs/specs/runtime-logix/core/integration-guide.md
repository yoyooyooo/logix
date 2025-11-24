# Integration Guide: Third-Party Libraries

> **Status**: Draft
> **Purpose**: 标准化第三方库（React Query, RxJS, WebSocket）与 Logix 的集成模式。

## 1. 核心理念 (Core Philosophy)

Logix 与外部世界的交互遵循 **"Everything is a Stream"** 原则。

*   **Input**: 外部数据源（Query, Socket）通过适配器转换为 `Stream`，然后通过 `mount` 或 `on` 进入 Store。
*   **Output**: Store 的状态变化通过 `state$` 流出，供 UI 或其他系统消费。

## 2. 通用适配器模式 (The Adapter Pattern)

要将任意第三方库集成进 Logix，只需做一件事：**将其封装为 `Effect.Stream`**。

```typescript
function adapt(externalLib): Stream.Stream<Data> {
  return Stream.async(emit => {
    // 1. 订阅外部库
    const unsub = externalLib.subscribe(data => 
      emit.single(data)
    );
    // 2. 返回清理函数 (Effect 会在 Scope 关闭时自动调用)
    return Effect.sync(() => unsub());
  });
}
```

## 3. 实战案例: React Query (@tanstack/query-core)

React Query 的核心是 `QueryObserver`，它不依赖 React。

### 3.1 适配器实现

```typescript
import { QueryObserver, QueryClient } from '@tanstack/query-core';
import { Stream, Effect } from 'effect';

export function fromQuery<T>(client: QueryClient, options: QueryOptions): Stream.Stream<T> {
  return Stream.async(emit => {
    const observer = new QueryObserver(client, options);
    
    const unsubscribe = observer.subscribe(result => {
      if (result.status === 'success') {
        emit.single(result.data);
      } else if (result.status === 'error') {
        emit.fail(result.error);
      }
    });

    return Effect.sync(() => unsubscribe());
  });
}
```

### 3.2 在 Logix 中使用

```typescript
makeStore({
  // ...
  logic: ({ mount }) => [
    mount('userData', (services) => 
      fromQuery(services.QueryClient, {
        queryKey: ['user', '123'],
        queryFn: fetchUser
      })
    )
  ]
})
```

## 4. 实战案例: WebSocket (Socket.io / Native)

### 4.1 适配器实现

```typescript
export function fromSocket(socket, event: string): Stream.Stream<any> {
  return Stream.async(emit => {
    const handler = (data) => emit.single(data);
    socket.on(event, handler);
    
    return Effect.sync(() => socket.off(event, handler));
  });
}
```

### 4.2 在 Logix 中使用

```typescript
makeStore({
  // ...
  logic: ({ on }) => [
    on((services) => fromSocket(services.Socket, 'price_update'), 
      (price, { set }) => set('price', price)
    )
  ]
})
```

## 5. 实战案例: RxJS Observable

Effect 提供了官方适配包 `@effect/rxjs`，可以直接转换。

```typescript
import { Stream } from 'effect';
import { fromObservable } from '@effect/rxjs/Stream';

makeStore({
  logic: ({ mount }) => [
    mount('count', () => 
      fromObservable(() => rxInterval(1000))
    )
  ]
})
```
