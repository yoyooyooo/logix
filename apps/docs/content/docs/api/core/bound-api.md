---
title: "Bound API ($)"
description: Logix 逻辑编写的核心上下文对象。
---



`BoundApi`（通常简写为 `$`）是 Logix 逻辑编写的核心上下文对象。它为特定的 Module Shape 和 Environment 提供了预绑定的访问能力。

> **如果你只写业务逻辑，可以只关注本页的「日常用法速查」小节，忽略完整接口定义与类型细节。**  
> 完整签名主要服务于库作者 / Pattern 作者 / 引擎实现者。

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

  // Primary Reducer 定义（可选）
  readonly reducer: (tag: string, reducer: (state: State, action: Action) => State) => Effect<void>;

  // 依赖注入
  readonly use: (tagOrModule) => Effect<Service>;

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

## 日常用法速查

大部分业务开发场景，只需要记住 `$` 上的这几类能力：

- 状态：
  - `$.state.read`：读取当前状态快照；
  - `$.state.update(prev => next)` / `$.state.mutate(draft => { ... })`：更新状态；
- 事件与 Flow：
  - `$.onAction("tag").run(handler)` / `.runLatest(handler)` / `.runExhaust(handler)`；
  - `$.onState(selector).debounce(300).run(handler)`；
  - `$.reducer("tag", (state, action) => nextState)`：为某个 Action Tag 注册主状态变换（Primary Reducer，纯同步函数）；
- 依赖注入：
  - `const api = yield* $.use(ApiService)`；
  - `const $Other = yield* $.use(OtherModule)`；
- 生命周期：
  - `$.lifecycle.onInit(effect)` / `.onDestroy(effect)` / `.onError(handler)`。

其余属性（`flow`、`match`、`useRemote` 等）在 Learn / Advanced / Recipes 中都有配套示例，建议按场景查阅。

> 写法提示：`Module.logic(($)=>{ ...; return Effect.gen(...) })` 默认分成 setup（return 前）与 run（return 的 Effect）两段。setup 只做注册，不访问 `$.use/$.onAction/$.onState`，否则开发模式下会收到 `logic::invalid_phase` 诊断；Env 访问和 Watcher/Flow 应放在 return 内。若不需要显式 setup，推荐统一写成 `Module.logic(($) => Effect.gen(function* () { /* 这里是 run 段 */ }))`，这样可以“无脑”把所有 `yield* $.onAction/$.onState/$.use` 放进 generator 内，而不要写成 `Module.logic(($) => $.onAction("inc").run(...))` 这种直接在 builder 里调用 run-only 能力的形式。

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
