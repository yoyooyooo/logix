# Logic & Flow (The Tools)

> **Status**: Definitive (v3 Effect-Native)  
> **Date**: 2025-11-26  
> **Scope**: Logix Core Primitives

本节描述 Logix v3 中的 `Logic` / `Flow` / `Control` 原语，它们在 `v3/effect-poc/shared/logix-v3-core.ts` 中有完整类型定义。本文件给出概念性 API 视图，实际签名以 PoC 为准。

## 1. Bound API：以 `$` 为中心的编程模型

在 v3 中，我们全面拥抱 **Bound API（Logic.for）** 模式：  
每个 Logic 文件应在顶部绑定一个“当前 Store 上下文”的符号锚点（通常命名为 `$`）：

```ts
type MyShape = Store.Shape<typeof StateSchema, typeof ActionSchema>;

// 1. 绑定当前上下文，创建符号锚点 `$`
const $ = Logic.forShape<MyShape, MyServices>();

// 2. 使用纯 Effect 定义 Logic
export const MyLogic = Logic.make<MyShape, MyServices>(
  Effect.gen(function* (_) {
    // s 被推导为 StateOf<MyShape>
    const changes$ = $.flow.fromChanges(s => s.field);

    yield* changes$.pipe(
      $.flow.run(
        // draft 被推导为 StateOf<MyShape>
        $.state.mutate(draft => {
          draft.field = "updated";
        }),
      ),
    );
  }),
);
```

### 1.1 `$` 作为静态锚点（Static Anchor）

为了方便平台 Parser 构建 Logic Graph，需要遵守以下约定：

- `$` 必须是 **文件顶层的 `const` 声明**，或在 Logic 文件中作为顶层常量出现；  
- 不允许对 `$` 重新赋值；  
- 不推荐将 `$` 作为普通函数参数层层传递——如需封装，优先使用 Pattern 与 `Intent.*`；  
- Parser 只对满足上述条件的 `$` 做结构化解析，其他写法统一降级为 Gray/Black Box。

在这一模式下：

- 业务代码主要通过 `Intent.*` 与 `$.*` 进行编排；  
- 内核与 Pattern 可以使用 `Logic.RuntimeTag` / `Store.Tag<Sh>` 等底层设施，但对业务 Logic 隐藏这些细节。

## 2. Logic (The Program)

Logic 是一段在 `Logic.Env<Sh,R>` 上运行的长生命周期 Effect 程序：

```ts
type Env<Sh, R> = Store.Runtime<Store.StateOf<Sh>, Store.ActionOf<Sh>> & R;
type Fx<Sh, R, A, E> = Effect.Effect<A, E, Env<Sh, R>>;
```

### 2.1 Logic.make（v3 标准范式）

v3 只定义一种对外推荐的 Logic 形态：接收已经绑定好 Env 的 Effect，
并假定 Effect 运行在 `Logic.Env<Sh,R>` 上：

```ts
Logic.make<Shape, R>(Effect.gen(...));
```

在该范式下，Logic 作者不再解构 `({ state, flow, actions, control })`，  
而是通过文件顶部的 `$ = Logic.forShape<Sh,R>()` 访问所有能力。

### 2.2 Logic.Env 与 Logic.Fx

为了在 Pattern、Intent 等场景中精确表达上下文依赖，v3 引入了 `Logic.Fx` 别名：

```ts
export type Env<Sh extends Store.Shape<any, any>, R = never> =
  Store.Runtime<Store.StateOf<Sh>, Store.ActionOf<Sh>> & R;

export type Fx<Sh extends Store.Shape<any, any>, R = never, A = void, E = never> =
  Effect.Effect<A, E, Env<Sh, R>>;
```

约定：

- 所有依赖具体 Store 的长逻辑（包括 Namespace Pattern）都应使用 `Logic.Fx<Sh,R>` 表达其上下文依赖；  
- 这样可以在“跨 Store 复用 Pattern”时由类型系统兜底，避免把错误的 Store Runtime 注入给 Pattern。

### 2.3 Logic.forShape：Bound API 工厂

`Logic.forShape` 用于在类型层面绑定 Shape + Env，并在运行时通过 `Logic.RuntimeTag` / `Store.Tag` 获取对应的 `Store.Runtime`：

```ts
// 绑定当前 Shape 与服务环境 R，返回预绑定的访问器
const $ = Logic.forShape<MyShape, MyServices>();
```

在类型上，它大致等价于：

```ts
namespace Logic {
  export const RuntimeTag: Context.Tag<Store.Runtime<any, any>, Store.Runtime<any, any>>;

  export function forShape<Sh extends Store.Shape<any, any>, R = never>(
    tag?: Store.Tag<Sh>, // 默认使用 RuntimeTag（当前 Logic 的 Store）
  ): {
    state: {
      read: Fx<Sh, R, Store.StateOf<Sh>, never>;
      update: (f: (prev: Store.StateOf<Sh>) => Store.StateOf<Sh>) => Fx<Sh, R, void, never>;
      mutate: (f: (draft: Store.StateOf<Sh>) => void) => Fx<Sh, R, void, never>;
      ref: {
        (): SubscriptionRef.SubscriptionRef<Store.StateOf<Sh>>;
        <V>(selector: (s: Store.StateOf<Sh>) => V): SubscriptionRef.SubscriptionRef<V>;
      };
    };
    actions: {
      dispatch: (action: Store.ActionOf<Sh>) => Fx<Sh, R, void, never>;
      actions$: Stream.Stream<Store.ActionOf<Sh>>; // 运行时会在 Env 中实例化
    };
    flow: Flow.Api<Sh, R>;
    control: Control.Api<Sh, R>;
    services: <Svc>(tag: Context.Tag<Svc, Svc>) => Effect.Effect<Svc, never, R>;
  };
}
```

要点：

- Bound API 的所有方法都在类型上显式依赖 `Logic.Env<Sh,R>`，不会“偷偷”通过 Tag 获取 Runtime；  
- `$.flow` 的接口**严格对齐** `Flow.Api<Sh,R>`（见下一节），只是预先绑定了当前 Env；  
- 跨 Store 协作场景中，可以通过显式传入 `Store.Tag<OtherShape>` 创建其他 Store 的访问器，但业务层推荐仍通过 `Intent.Coordinate` 表达。

## 3. Flow (The Time & Concurrency Layer)

Flow 负责围绕 `Store.Runtime` 构造时间轴与并发语义，其职责是回答：  
**“什么时候触发？以何种并发语义执行？”**

在 v3 中：

- 业务代码优先使用 **`$.flow`**（Bound API 实例）；  
- 底层库 / Pattern 内部可以使用 `Flow.*` 命名空间级 DSL；  
- `$.flow` 的接口与 `Flow.Api` 完全一致，只是预绑定了 Env。

### 3.1 触发源 (Triggers)

```ts
// 从 Action 流中筛选某一类 Action（通常使用类型守卫）
$.flow.fromAction((a): a is SubmitAction => a._tag === "submit");

// 从 State 的某个 selector 构造变化流
$.flow.fromChanges(s => s.form.keyword);
```

### 3.2 变换与过滤 (Transformers)

```ts
$.flow.debounce(300);                     // 防抖
$.flow.throttle(500);                     // 节流
$.flow.filter(keyword => keyword !== ""); // 过滤
```

这些算子都是 `Stream -> Stream` 的变换，平台可以将它们渲染为中间处理节点（计时器、漏斗等）。

### 3.3 运行策略 (Runners)

```ts
// 并行：来一个跑一个，互不干扰
$.flow.run(effect);

// 最新：新事件来了，取消旧逻辑（搜索 / Tab 切换）
$.flow.runLatest(effect);

// 阻塞：当前逻辑没跑完，忽略新事件（防重复提交）
$.flow.runExhaust(effect);

// 串行：排队依次执行（消息队列消费）
$.flow.runSequence(effect);
```

所有 `run*` 的类型形态统一为：

```ts
run*<A, E, R2>(
  eff: Effect.Effect<A, E, R2>,
): (stream: Stream.Stream<any>) => Effect.Effect<void, E, R2>;
```

即保留 Effect 的错误通道与环境类型，只改变其为“挂在某个流上的执行器”。

## 4. Intent (L1/L2 Business Semantics)

在 Flow / Control 之上，Logix 提供少量语义化的 Intent 原语，用于承载高频业务联动模式。  
它们在 PoC 中通过 `Intent` 命名空间暴露，同时在 Flow / Coordinator 中保留底层实现。

> 使用优先级  
> - **首选**：`Intent.*`（L1/L2 业务语义，平台最容易解析）；  
> - 日常 Flow 编排：`$.flow` / `$.state`（L2 Context）；  
> - 库 / Pattern：`Flow.*` / `Control.*`（L3 Library）；  
> - 旧有写法：`api.flow` / `api.state`（仅在迁移中使用）。

### 4.1 L1：单 Store 内联动

`Intent.andUpdateOnChanges` / `Intent.andUpdateOnAction` 负责表达单 Store 内部的同步联动：

```ts
// 字段联动：State -> State
Intent.andUpdateOnChanges<MyShape>(
  s => s.country,
  (country, prev) => ({ ...prev, province: "" }),
);

// 事件驱动的状态重排：Action -> State
Intent.andUpdateOnAction<MyShape>(
  (a): a is { _tag: "reset" } => a._tag === "reset",
  () => initialState,
);
```

它们的抽象语义是：

- `andUpdateOnChanges`：“监听某个 State 视图的变化，并在每次变化时更新当前 Store 的 State”；  
- `andUpdateOnAction`：“监听某一类 Action，并在每次触发时更新当前 Store 的 State”。  

类型层面都提供纯 reducer / Effect reducer 两种 overload，内部实现则基于 `Store.Runtime.changes$ / actions$ + state.update` 构造对应的 Flow，返回值类型统一为 `Logic.Fx<Sh,R>`。

### 4.2 L2：跨 Store 协作（Intent.Coordinate）

`Intent.Coordinate` 用于表达跨 Store 的标准协作模式，例如 Search → Detail：

```ts
Intent.Coordinate.onChangesDispatch<SearchShape, DetailShape>(
  SearchStoreTag, // Source Tag（Store.Tag<SearchShape>）
  DetailStoreTag, // Target Tag（Store.Tag<DetailShape>）
  s => s.results,
  results =>
    results.length === 0
      ? []
      : [{ _tag: "detail/initialize", payload: results[0] }],
);
```

抽象语义是：“当 Source Store 的某个 State 视图发生变化时，向 Target Store 派发一个或多个 Action”。  

类似地，`Intent.Coordinate.onActionDispatch` 负责表达“Source Store 的某类 Action 触发 Target Store 的 Action”。

> 约定  
> - 业务代码中的跨 Store 协作应当**优先通过 `Intent.Coordinate`** 表达，以便平台在静态分析时识别清晰的 `Source -> Target` 关系；  
> - 只有在极端复杂、无法用 Intent 表达的场景下，才允许直接通过多个 `Store.Tag` + Bound API 进行跨 Store 操作，这类代码在平台中被视为 Custom Effect Block，不参与标准 IntentRule 分析。

## 5. Control (The Structure Layer)

`Control` 命名空间围绕 Effect 提供结构化的控制流算子，其职责是回答：  
**“触发之后怎么执行？有哪些分支 / 错误域 / 并发结构？”**

在 Bound API 模式下，通过 `$.control` 访问：

```ts
$.control.branch({
  if: $.state.read.pipe(Effect.map(s => s.isValid)),
  then: someSubmitEffect,
  else: someToastEffect,
});
```

对应类型大致为：

```ts
branch<A, E, R2>({
  if: boolean | Effect.Effect<boolean, E, R2>;
  then: Effect.Effect<A, E, R2>;
  else?: Effect.Effect<A, E, R2>;
}): Effect.Effect<A, E, R2>;
```

平台可以将其渲染为菱形判定节点。

典型的错误边界与并行结构在 v3 中保持不变：

```ts
// 错误域
$.control.tryCatch({
  try: runApprovalFlowEffect(),
  catch: (err: ApprovalServiceError) =>
    $.state.update(prev => ({ ...prev, status: "error", errorMessage: err.reason })),
});

// 并行执行
$.control.parallel([
  recordAuditEffect,
  logMetricEffect,
]);
```

平台可以将 `tryCatch` 标记为错误域节点，将 `parallel` 渲染为“并行分叉 / 汇合”节点。

## 6. 长逻辑与 Scope（简要约定）

在 `Logic` 中启动长逻辑时，推荐显式考虑它应当与哪一层生命周期绑定：

- `forkScoped(longTask)`：  
  - 适合与当前 Store / 页面同生命周期的 UI 逻辑（例如轮询当前视图、监听当前页面状态变化）；  
  - 依赖 `Store` / 页面 Scope，被视为“前台任务”，Store Scope 关闭时自动终止。

- `fork(longTask)` 或交给上层 Runtime：  
  - 适合与具体页面解耦的后台任务（例如全局 Job 轮询、缓存刷新）；  
  - 依赖更高层的 Runtime Scope，不随单个 Store / 页面销毁自动结束。

实践上建议：

- 页面 / 组件级 Store：Logic 内长逻辑默认使用 `forkScoped`，避免“页面关闭但任务仍然持有过期状态”；  
- 全局 Store 或专门的后台 Runtime：需要长期运行的任务显式使用 `fork` 或在单独的后台 Scope 中管理。

## 7. 与原生 Effect 的关系

- 对开发者而言，`$.flow.* / $.control.*` 只是围绕 Effect / Stream 封装的一组“语义化标准算子”，用来承载：  
  - Trigger / 时间 / 并发策略（Flow）；  
  - 分支 / 错误边界 / 并行结构（Control）。  
- 任何细节性的逻辑（`map / flatMap / zip / forEach / race` 等）仍然鼓励直接使用 `Effect.* / Stream.*`，平台在静态分析时会将这部分视为 Gray/Black Box。  
- 对平台而言，这些算子提供了稳定的 AST 锚点，可以在不执行代码的前提下构建 Logic Graph。
