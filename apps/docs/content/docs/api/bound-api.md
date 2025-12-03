---
title: "Bound API ($)"
description: Logix 逻辑编写的核心上下文对象。
---



`BoundApi`（通常简写为 `$`）是 Logix 逻辑编写的核心上下文对象。它为特定的 Module Shape 和 Environment 提供了预绑定的访问能力。

## 概览

```typescript
interface BoundApi<Sh, R> {
  // 状态访问与更新
  readonly state: {
    readonly read: Effect<State>;
    readonly update: (f: (prev: State) => State) => Effect<void>;
    readonly mutate: (f: (draft: Draft<State>) => void) => Effect<void>;
    readonly ref: () => SubscriptionRef<State>;
  };

  // 动作派发与监听
  readonly actions: {
    readonly dispatch: (action: Action) => Effect<void>;
    readonly actions$: Stream<Action>;
    // ...以及根据 actionMap 生成的快捷方法
  };

  // 逻辑流构建
  readonly flow: FlowApi<Sh, R>;
  readonly onAction: ...;
  readonly onState: ...;
  readonly on: ...;

  // 依赖注入
  readonly use: (tagOrModule) => Effect<Service>;
  readonly services: (tag) => Effect<Service>;

  // 结构化匹配
  readonly match: (value) => FluentMatch;
  readonly matchTag: (value) => FluentMatchTag;

  // 生命周期
  readonly lifecycle: {
    readonly onInit: (eff) => Effect<void>;
    readonly onDestroy: (eff) => Effect<void>;
    readonly onError: (handler) => Effect<void>;
    readonly onSuspend: (eff) => Effect<void>;
    readonly onResume: (eff) => Effect<void>;
  };
}
```

## 状态 (State)

-   **`read`**: 读取当前状态快照。
-   **`update`**: 使用纯函数更新状态。
-   **`mutate`**: 使用 `mutative` 风格的可变 Draft 更新状态（推荐）。
-   **`ref`**: 获取底层的 `SubscriptionRef`，用于高级响应式操作。

```typescript
// 读取
const { count } = yield* $.state.read;

// 更新
yield* $.state.mutate(draft => {
  draft.count++;
});
```

## 动作 (Actions)

-   **`dispatch`**: 派发一个 Action。
-   **`actions$`**: 原始 Action 流。
-   **快捷方法**: 如果 Module 定义了 `actionMap`，可以直接调用 `$.actions.increment()`。

## 逻辑流 (Flow)

参见 [Logic Flow API](./logic-flow)。

-   `$.onAction(...)`
-   `$.onState(...)`
-   `$.flow.run(...)`

## 依赖注入 (Dependency Injection)

-   **`use`**: 统一的依赖注入入口。可以获取其他 Module 的 Handle，或者获取 Service 实例。
-   **`services`**: 获取 Service 实例（`use` 的别名，保留用于兼容）。

```typescript
const userApi = yield* $.use(UserApi);
const otherModule = yield* $.use(OtherModule);
```

## 结构化匹配 (Pattern Matching)

提供 Fluent 风格的模式匹配，基于 `Effect.match`。

-   **`match(value)`**: 对值进行匹配。
-   **`matchTag(value)`**: 对带有 `_tag` 字段的联合类型进行匹配。

```typescript
yield* $.matchTag(action)
  .tag("increment", () => ...)
  .tag("decrement", () => ...)
  .exhaustive();
```

## 生命周期 (Lifecycle)

定义 Module 实例的生命周期钩子。

-   **`onInit`**: 模块初始化时执行。
-   **`onDestroy`**: 模块销毁时执行。
-   **`onError`**: 捕获 Logic 中的未处理错误（Defect）。
-   **`onSuspend` / `onResume`**: 响应平台的挂起/恢复信号（如 App 切后台）。

```typescript
yield* $.lifecycle.onInit(Effect.log("Module initialized"));
```
