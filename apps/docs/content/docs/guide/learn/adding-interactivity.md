---
title: 逻辑流 (Logic Flows)
description: 使用 Effect 编写响应式的业务逻辑。
---



在 Logix 中，业务逻辑不再是散落在组件中的回调函数，而是以 **Logic Flows** 的形式存在的。Flow 本质上是一个响应式的管道：

`Event Source (事件源) -> Transformation (转换) -> Effect Execution (副作用执行)`

## 核心 API

Bound API (`$`) 提供了构建 Flow 的入口：

-   **`$.onAction`**: 监听 Action 派发。
-   **`$.onState`**: 监听 State 变化。
-   **`$.flow`**: 提供流式操作符（如 `debounce`, `filter`）和执行策略（如 `run`, `runLatest`）。

## 示例：搜索自动补全

这是一个典型的“监听状态变化 -> 防抖 -> 竞态处理 -> 异步请求”的场景。

```typescript tab="Logic DSL"
import { Effect } from 'effect';

SearchModule.logic(($) => Effect.gen(function* () {
  // 1. 监听 keyword 状态变化 (Logic DSL)
  // $.onState 返回的是一个 Fluent Flow 对象，可以直接链式调用
  yield* $.onState(s => s.keyword).pipe(
    $.flow.debounce(300),                // 防抖 300ms
    $.flow.filter(kw => kw.length > 2),  // 仅当长度 > 2 时触发
    $.flow.runLatest(kw => Effect.gen(function* () { // 使用 runLatest 处理竞态
      const api = yield* $.services(SearchApi);
      const results = yield* api.search(kw);
      yield* $.state.update(s => ({ ...s, results }));
    }))
  );
}));
```

```typescript tab="Flow API"
import { Effect } from 'effect';

SearchModule.logic(($) => Effect.gen(function* () {
  // 1. 获取原始 Stream
  const keyword$ = $.flow.fromState(s => s.keyword);

  // 2. 定义副作用
  const searchEffect = (kw: string) => Effect.gen(function* () {
    const api = yield* $.services(SearchApi);
    const results = yield* api.search(kw);
    yield* $.state.update(s => ({ ...s, results }));
  });

  // 3. 手动组装 Flow
  yield* keyword$.pipe(
    $.flow.debounce(300),
    $.flow.filter(kw => kw.length > 2),
    $.flow.runLatest(searchEffect)
  );
}));
```

```typescript tab="Raw Effect"
import { Effect, Stream } from 'effect';

// 这展示了 Logix 底层是如何使用 Effect Stream 实现的
SearchModule.logic(($) => Effect.gen(function* () {
  // 1. 从 State 获取 Stream
  yield* Stream.fromEffect($.state.read).pipe(
    Stream.map(s => s.keyword),
    Stream.changes, // 仅在值变化时发射
    Stream.debounce("300 millis"),
    Stream.filter(kw => kw.length > 2),
    // runLatest 本质上就是 switch map
    Stream.flatMap(kw => Effect.gen(function* () {
      const api = yield* $.services(SearchApi);
      const results = yield* api.search(kw);
      yield* $.state.update(s => ({ ...s, results }));
    }), { switch: true }),
    Stream.runDrain // 执行流
  );
}));
```

## 执行策略 (Concurrency Strategies)

Logix 提供了多种执行策略来处理并发事件，这些策略直接对应 `FlowBuilder` 的实现：

| API | 语义 | 适用场景 |
| :--- | :--- | :--- |
| **`run`** | **串行 (Sequential)** | 默认策略。前一个 Effect 执行完才执行下一个。适合大多数有序操作。 |
| **`runParallel`** | **并行 (Unbounded)** | 同时处理所有事件，互不阻塞。适合日志上报、独立埋点。 |
| **`runLatest`** | **最新优先 (Switch)** | 新事件到来时，取消正在执行的 Effect。适合搜索、Tab 切换。 |
| **`runExhaust`** | **阻塞防重 (Exhaust)** | 前一个 Effect 未完成时，忽略新事件。适合表单提交（防止重复点击）。 |
| （已移除） |  |  |

## 状态更新

在 Flow 中，我们通常使用以下方式更新状态：

-   **`$.state.update(prev => next)`**: 纯函数更新。
-   **`$.state.mutate(draft => ...)`**: 基于 `mutative` 的可变风格更新（推荐）。

```typescript
$.onAction("toggle").run(() =>
  $.state.mutate(draft => {
    draft.isOpen = !draft.isOpen;
  })
);
```

## 组合与复用

由于 Logic 本质上是 `Effect`，你可以轻松地组合它们：

```typescript
const FeatureLogic = Effect.all([
  SearchLogic,
  PaginationLogic,
  FilterLogic
]);
```
