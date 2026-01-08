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

  // Action（067 action surface）
  // - actions: ActionToken（创建 action value）
  // - dispatchers: 直接 dispatch（推荐）
  // - dispatch: 通用 dispatch（action/token/tag）
  readonly actions: ActionMap;
  readonly dispatchers: Record<string, (...args) => Effect<void>>;
  readonly dispatch: (actionOrTokenOrTag, ...args) => Effect<void>;

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
    // setup-only：注册 ≠ 执行（由 Runtime 在合适时机调度）
    // 必需初始化：决定实例可用性（阻塞 init gate）
    readonly onInitRequired: (eff) => void;
    // 启动任务：不阻塞可用性（ready 后启动）
    readonly onStart: (eff) => void;
    // legacy alias：语义等同于 onInitRequired
    readonly onInit: (eff) => void;
    readonly onDestroy: (eff) => void;
    readonly onError: (handler) => void;
    readonly onSuspend: (eff) => void;
    readonly onResume: (eff) => void;
    readonly onReset: (eff) => void;
  };

  // Traits（setup-only：声明/贡献能力规则）
  readonly traits: {
    /**
     * 在 setup 阶段声明/贡献 traits。Runtime 会在模块初始化阶段汇总并生成“最终 traits 集”。
     *
     * - 只允许在 setup 段调用；setup 结束后会冻结，run 段调用会失败（防止运行期行为漂移）。
     * - 输入必须是纯数据声明：不要依赖随机/时间/外部 IO 才能确定最终 traits。
     */
    readonly declare: (traits: Record<string, unknown>) => void
  }
}
```

## 日常用法速查

大部分业务开发场景，只需要记住 `$` 上的这几类能力：

- 状态：
  - `$.state.read`：读取当前状态快照；
  - `$.state.mutate(draft => { ... })`：更新状态（推荐；默认优先使用）；
  - `$.state.update(prev => next)`：整棵替换（通常会被视为全量写入，谨慎使用）；
- Actions：
  - `yield* $.dispatchers.<K>(payload)`：派发 Action（常用短写）；
  - `yield* $.dispatch($.actions.<K>, payload)`：token-first（让代码里显式出现 ActionToken，便于 IDE 跳转/找引用/重命名）；
  - `yield* $.dispatch({ _tag: "<K>", payload })`：通用派发；
- 事件与 Flow：
  - `$.onAction("tag").run(handler)` / `.runLatest(handler)` / `.runExhaust(handler)`；
  - `$.onState(selector).debounce(300).run(handler)`；
  - `$.reducer("tag", (state, action) => nextState)`：为某个 Action Tag 注册主状态变换（Primary Reducer，纯同步函数）；
- 依赖注入：
  - `const api = yield* $.use(ApiService)`；
  - `const $Other = yield* $.use(OtherModule)`；
- 生命周期（setup-only 注册）：
  - `$.lifecycle.onInitRequired(effect)` / `.onStart(effect)` / `.onDestroy(effect)` / `.onError(handler)`。

其余属性（`flow`、`match`、`traits` 等）在 Learn / Advanced / Recipes 中都有配套示例，建议按场景查阅。

> 写法提示：`Module.logic(($)=>{ ...; return Effect.gen(...) })` 默认分成 setup（return 前）与 run（return 的 Effect）两段。setup 只做**注册**（例如 `$.lifecycle.*`、`$.reducer`），run 段才允许 `yield* $.use/$.onAction/$.onState` 等“运行期能力”。`$.lifecycle.*` 必须在 setup 段注册；在 run 段调用会触发 `logic::invalid_phase` 诊断。

## 状态 (State)

- **`read`**: 读取当前状态快照。
- **`update`**: 使用纯函数整棵替换状态（通常会被视为全量写入，谨慎使用）。
- **`mutate`**: 使用 `mutative` 风格的可变 Draft 更新状态（推荐；会保留字段级影响域）。
- **`ref`**: 获取底层的 `SubscriptionRef`，用于高级响应式操作。

```typescript
// 读取
const { count } = yield* $.state.read;

// 更新
yield* $.state.mutate(draft => {
  draft.count++;
});
```

## 动作 (Actions)

- **`dispatch`**: 通用派发（action value / ActionToken / tag）。
- **`dispatchers`**: 常用短写：`yield* $.dispatchers.increment()`（payload 类型来自 `actions` 定义）。
- **`actions`**: ActionToken（创建 action value）：`const action = $.actions.increment()`；需要 action object 时可配合 `yield* $.dispatch(action)`。
  - 如果你希望 IDE 能稳定“跳转/找引用/重命名”，请让代码里显式出现 ActionToken：例如 `yield* $.dispatch($.actions.increment)` 或 `yield* $.dispatch($.actions.add, 1)`，并把同一个 token 传给 `$.onAction(token)`。

## 逻辑流 (Flow)

参见 [Flow API](./flow)。

- `$.onAction(...)`
- `$.onState(...)`
- `$.flow.run(...)`

## 依赖注入 (Dependency Injection)

- **`use`**: 统一的依赖注入入口。可以获取其他 Module 的 `ModuleHandle`，或者获取 Service 实例（也可视为 `ServiceHandle`）。参见：[Handle（消费面）](./handle)。

```typescript
const userApi = yield* $.use(UserApi);
const otherModule = yield* $.use(OtherModule);
```

## 结构化匹配 (Pattern Matching)

提供 Fluent 风格的轻量模式匹配（由 `@logix/core` 内部 helper 实现），约定 handler 返回 `Effect`。

- **`match(value)`**: 对值进行匹配。
- **`matchTag(value)`**: 对带有 `_tag` 字段的联合类型进行匹配。

```typescript
yield* $.matchTag(action)
  .with("increment", () => ...)
  .with("decrement", () => ...)
  .exhaustive();
```

## 生命周期 (Lifecycle)

定义 Module 实例的生命周期钩子。

- **`onInit`**: 模块初始化时执行。
- **`onDestroy`**: 模块销毁时执行。
- **`onError`**: 捕获 Logic 中的未处理错误（Defect）。
- **`onSuspend` / `onResume`**: 响应平台的挂起/恢复信号（如 App 切后台）。

```typescript
Module.logic(($) => {
  $.lifecycle.onInit(Effect.log("Module initialized"))
  return Effect.gen(function* () {
    // run 段：Watcher/Flow/Env access
  })
})
```

## Traits（Setup-only）

`$.traits.declare(...)` 用于在 **setup 阶段** 声明 traits，让一个 Logic 在被复用/组合时能“携带能力规则一起复用”。

> [!TIP]
> 想快速建立 traits 的心智模型（它如何与事务窗口、收敛、Form/Query 等能力对齐），先读：
> - [Traits（能力声明与收敛）](../../guide/essentials/traits)

### 关键语义

- **setup-only**：只允许在 setup 段调用；setup 结束后 traits 会冻结，避免运行期追加/变更导致行为漂移。
- **同步声明**：`declare` 是同步 API（返回 `void`）；若写在 `LogicPlan.setup` 中，推荐用 `Effect.sync(() => $.traits.declare(...))` 包一层。
- **来源（provenance）**：默认把当前逻辑单元的 `logicUnitId` 作为来源锚点；为了跨组合/回放稳定，建议显式提供 `logicUnitId`（见下方示例）。
- **纯数据声明**：traits 声明应当是可序列化、可比对的配置；不要依赖随机/时间/外部 IO 才能确定最终 traits。

### 示例：让一个可复用 Logic 携带 traits

```ts
Module.logic(($) => ({
  setup: Effect.sync(() => {
    // 具体 traits 形态以对应包的 traits DSL 为准（例如 state trait / form trait）
    const traits = Logix.StateTrait.from(StateSchema)({
      /* ... */
    })
    $.traits.declare(traits)
  }),
  run: Effect.void,
}))
```

> 提示：为了让 provenance 稳定，建议在 `module.logic(build, { id })` 或 `withLogic/withLogics(..., { id })` 中显式提供 `logicUnitId`。
