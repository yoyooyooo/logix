# Logic & Flow (The Tools)

> **Status**: Definitive (v3 Effect-Native)  
> **Date**: 2025-11-24  
> **Scope**: Logix Core Primitives

本节描述 Logix v3 中的 `Logic` / `Flow` / `Control` 原语，它们在 `v3/effect-poc/shared/logix-v3-core.ts` 中有完整类型定义。本文件给出概念性 API 视图，实际签名以 PoC 为准。

## 1. 术语消歧 (Terminology Clarification)

在深入 API 之前，必须澄清 `Flow` 一词在不同上下文中的精确含义，以避免混淆：

- **`Logix Flow`**: 特指本文档描述的前端 Logix Engine 内部的时间轴与并发原语集合，即 `Flow.Api`（`fromAction`, `fromChanges`, `debounce`, `run*` 等）。在代码中，它通过 `flow.*` 命名空间访问。
- **`Effect Flow Runtime`**: 特指运行在 BFF 或 Server 端的、由 Effect 驱动的业务流程运行时（例如，编排跨系统长流程的 `.flow.ts` 文件）。为避免歧义，建议称其为 **Flow Runtime** 或 **ServerFlow Runtime**。
- **`Flow DSL`**: 指用于描述流程结构的、与运行时无关的声明式语言（如 YAML/JSON），主要服务于平台的可视化与代码生成环节。

本篇及 `runtime-logix` 目录下的所有文档，除非特别说明，`Flow` 一词均指代 `Logix Flow`。

## 2. Logic (The Program)

在 v3 中，Logic 不再是一个“全局 DSL 对象”，而是通过 `Logic.make` 创建的一段长生命周期 Effect 程序，它在 `Logic.Env<Sh,R>` 上运行：

```ts
type Env<Sh,R> = Store.Runtime<StateOf<Sh>, ActionOf<Sh>> & R;
type Fx<Sh,R,A,E> = Effect.Effect<A, E, Env<Sh,R>>;

const MyLogic: Fx<MyShape, MyServices, void, never> =
  Logic.make<MyShape, MyServices>(({ state, actions, flow, control }) =>
    Effect.gen(function* (_) {
      // 使用 state / actions / flow / control 编排逻辑
    })
  );
```

### 1.1 `Logic.make` (Long-running Effect)

`Logic.make` 是定义业务逻辑的标准方式：

```ts
Logic.make<Shape, R>(body: (api: Logic.Api<Shape,R>) => Effect<any,any,any>): Effect<any,any,any>;
```

其中 `Logic.Api<Shape,R>` 提供四个子域：

- `state`：`read / update / mutate / ref` 封装了 Store.Runtime 的读写能力；  
- `actions`：`dispatch / actions$` 封装 Action 流；  
- `flow`：围绕 `actions$ / changes$` 的时序与并发算子；  
- `control`：围绕 Effect 的结构化控制流算子。

## 2. Flow (The Time & Concurrency Layer)

`Flow` 命名空间围绕 `Store.Runtime` 提供一组标准化的 Stream 构建与执行算子，其职责是回答“**什么时候触发？以何种并发语义执行？**”。

在代码层面，Flow 既有：

- 注入在 `Logic.Api` 里的实例形态：`api.flow: Flow.Api<Sh,R>`，在 Logic 内部以 `flow.*` 访问；  
- 命名空间形态：`Flow.*` 静态 DSL（例如 `Flow.andUpdateOnChanges`），用于在独立模块中封装可复用的逻辑片段。  

两者在语义上保持一致，区别只是是否显式依赖 `Logic.Api` 作为入参：  

- `flow.*` 适合在单个 Logic 内内联编写控制流；  
- `Flow.*` 适合产出 `(input) => Effect` 形式的模式化长逻辑（Pattern），依赖 Effect 的 DI 注入 `Logic.Env<Sh,R>`。

### 2.1 触发源 (Triggers)

```ts
// 从 Action 流中筛选某一类 Action（通常使用类型守卫）
flow.fromAction((a): a is SubmitAction => a._tag === "submit");

// 从 State 的某个 selector 构造变化流
flow.fromChanges(s => s.form.keyword);
```

### 2.2 变换与过滤 (Transformers)

```ts
flow.debounce(300);                 // 防抖
flow.throttle(500);                 // 节流
flow.filter(keyword => keyword !== ""); // 过滤
```

这些算子都是 `Stream -> Stream` 的变换，平台可以将它们渲染为中间处理节点（计时器、漏斗等）。

### 2.3 运行策略 (Runners)

```ts
// 并行：来一个跑一个，互不干扰
flow.run(effect);

// 最新：新事件来了，取消旧逻辑（搜索/Tab 切换）
flow.runLatest(effect);

// 阻塞：当前逻辑没跑完，忽略新事件（防重复提交）
flow.runExhaust(effect);

// 串行：排队依次执行（消息队列消费）
flow.runSequence(effect);
```

所有 `run*` 的类型形态统一为：

```ts
run*<A,E,R2>(eff: Effect.Effect<A,E,R2>): (stream: Stream<any>) => Effect.Effect<void,E,R2>
```

即保留 Effect 的错误通道与环境类型，只改变其为 “挂在某个流上的执行器”。

## 3. Intent (Semantic Primitives)

在 Flow / Control 之上，Logix 提供少量语义化的 Intent 原语，用于承载高频业务联动模式。它们在 PoC 中通过 `Intent` 命名空间暴露，同时在 Flow/Coordinator 中保留底层实现。

### 3.1 L1 快捷方式：单 Store 内联动

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

类型层面都提供纯 reducer / Effect reducer 两种 overload，内部实现则基于 `Store.Runtime.changes$ / actions$ + state.update` 构造对应的 Flow。

### 3.2 L2 结构化协作：跨 Store 协调

`Intent.Coordinate` 用于表达跨 Store 的标准协作模式，例如 Search → Detail：

```ts
Intent.Coordinate.onChangesDispatch<SearchShape, DetailShape>(
  s => s.results,
  results =>
    results.length === 0
      ? []
      : [{ _tag: "detail/initialize", payload: results[0] }],
);
```

抽象语义是：“当 Source Store 的某个 State 视图发生变化时，向 Target Store 派发一个或多个 Action”。  

类似地，`Intent.Coordinate.onActionDispatch` 负责表达 “Source Store 的某类 Action 触发 Target Store 的 Action”。

平台在静态分析时会优先识别 `Intent.*` 调用，将其映射为统一的 `IntentRule`（详见 `06-platform-integration.md`），而底层 Runtime 则继续通过 Flow / Coordinator / Stream 实现具体行为。

## 4. Control (The Structure Layer)

`Control` 命名空间围绕 Effect 提供结构化的控制流算子，其职责是回答“**触发之后怎么执行？有哪些分支/错误域/并发结构？**”。

### 4.1 分支逻辑 (Branching)

```ts
control.branch({
  if: Effect.map(state.read, s => s.isValid),
  then: api.submitForm(),
  else:  api.toast("Form invalid"),
});
```

对应类型大致为：

```ts
branch<A,E,R2>({ if: boolean | Effect<boolean,E,R2>, then: Effect<A,E,R2>, else?: Effect<A,E,R2> }): Effect<A,E,R2>
```

平台可以将其渲染为菱形判定节点。

### 4.2 错误边界 (Error Boundaries)

```ts
control.tryCatch({
  try: runApprovalFlowEffect({ stateRef }),
  catch: (err: ApprovalServiceError) =>
    state.update(prev => ({ ...prev, status: "error", errorMessage: err.reason })),
});
```

类型大致为：

```ts
tryCatch<A,E,R2,A2,E2,R3>({
  try:   Effect<A, E,  R2>,
  catch: (err: E) => Effect<A2,E2,R3>,
}): Effect<A|A2, E|E2, R2|R3>;
```

平台可以将其标记为“错误域容器”，在图上画出红色错误路径。

### 4.3 并行与聚合 (Parallel)

```ts
control.parallel([
  api.recordAudit(...),
  api.logMetric(...),
]);
```

类型大致为：

```ts
parallel<R2>(effects: ReadonlyArray<Effect<any,any,R2>>): Effect<void, any, R2>
```

平台可以将其渲染为“并行分叉/汇合”节点。

## 5. 长逻辑与 Scope（简要约定）

在 `Logic` 中启动长逻辑时，推荐显式考虑它应当与哪一层生命周期绑定：

- `forkScoped(longTask)`：  
  - 适合与当前 Store / 页面同生命周期的 UI 逻辑（例如轮询当前视图、监听当前页面状态变化）；  
  - 依赖 `Store` / 页面 Scope，被视为“前台任务”，Store Scope 关闭时自动终止。

- `fork(longTask)` 或交给上层 Runtime：  
  - 适合与具体页面解耦的后台任务（例如全局 Job 轮询、缓存刷新）；  
  - 依赖更高层的 Runtime Scope，不随单个 Store / 页面销毁自动结束。

实践上建议：

- 页面/组件级 Store：Logic 内长逻辑默认使用 `forkScoped`，避免“页面关闭但任务仍然持有过期状态”；  
- 全局 Store 或专门的后台 Runtime：需要长期运行的任务显式使用 `fork` 或在单独的后台 Scope 中管理。

## 6. 与原生 Effect 的关系

- 对开发者而言，`flow.* / control.*` 只是围绕 Effect/Stream 封装的一组“语义化标准算子”，用来承载：  
  - Trigger / 时间 / 并发策略（Flow）  
  - 分支 / 错误边界 / 并行结构（Control）  
- 任何细节性的逻辑（`map/flatMap/zip/forEach/race` 等）仍然鼓励直接使用 `Effect.* / Stream.*`，平台在静态分析时会将这部分视为 Gray/Black Box。  
- 对平台而言，这些算子提供了稳定的 AST 锚点，可以在不执行代码的前提下构建 Logic Graph。
