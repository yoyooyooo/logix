# 1. 总体链路：从 dispatch 到 watcher handler

## 1.1 ModuleRuntime 源流

实现位置：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.ts`

- 状态存储：
  - `stateRef: SubscriptionRef<S>` 持有当前 State；
  - `stateRef.changes` 暴露 State 变化流。
- Action 通道：
  - `actionHub: PubSub<A>`；
  - `actions$: Stream.fromPubSub(actionHub)`。
- 对外接口（含 primary reducer）：
  - `dispatch(action)`：
    1. 若配置了 primary reducer（`options.reducers` 或运行时通过 `$.reducer` 注册），则根据 `_tag` 查找对应 `(state, action) => nextState` 函数，并同步更新 `stateRef`；
    2. 写一条 DebugSink 事件（`action:dispatch`，当前实现中 `state:update` 事件在 `setState` 内部单独记录）；
    3. 通过 `PubSub.publish(actionHub, action)` 将 Action 广播给所有 watcher（Logic / Flow）。
  - `changes(selector)`: `stateRef.changes |> Stream.map(selector) |> Stream.changes`。

> 关键点：`actions$` / `changes(selector)` 是所有 Flow / watcher 的统一源头。任何 watcher 数量的扩张，本质上都是在这两条源流上增加订阅和下游管道。

## 1.2 Flow.Api：fromAction / fromState / run\*

实现位置：`packages/logix-core/src/internal/runtime/core/FlowRuntime.ts`（对外入口：`packages/logix-core/src/Flow.ts`）

- `fromAction(predicate)`：
  - 实现：`runtime.actions$.pipe(Stream.filter(predicate))`；
  - 对同一条 `actions$` 流可以挂任意多条不同 predicate 的 watcher。
- `fromState(selector)`：
  - 实现：`runtime.changes(selector)`；
  - 内部已经包含 `Stream.map + Stream.changes`，只对“值有变化”的事件向下游传播。
- `run / runParallel / runLatest / runExhaust`：
  - 统一形态：`(eff) => (stream) => Effect`；
  - 核心实现基于 `Stream.runForEach` / `Stream.runDrain`，在源流上为每个事件调度一个 Effect。

> 心智模型：Flow.Api 本身不持有“watcher 实例列表”，它只是为给定 ModuleRuntime 构造 “Stream → Effect” 的工具集。

## 1.3 Logic.IntentBuilder：run/update/mutate/runFork

实现位置：`packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`（IntentBuilder / Fluent DSL）

`makeIntentBuilderFactory(runtime)` 为某个 ModuleRuntime 预绑定 Flow.Api，并为每条源流构造 Fluent IntentBuilder：

- `.debounce/throttle/filter/map`：
  - 只是对当前 Stream 做二次变换，然后递归调用 `makeIntentBuilderFactory`；
  - 不会额外存储全局状态。
- `.run(effect)`：
  - 实现：`Stream.runForEach(stream, payload => resolveEffect(effect, payload))`；
  - 整个 watcher 作为一个 Effect 返回，由 Logic 负责在 Scope 内启动。
- `.update(reducer)` / `.mutate(reducer)`：
  - 对每个事件：
    - `runtime.getState` → `reducer(prev, payload)` → `runtime.setState(next)`；
    - `mutate` 使用 `mutative.create` 生成新 State；
    - 包一层 `Effect.catchAllCause` 统一打日志。
- `.runFork(effect)` / `.runParallelFork(effect)`：
  - 语义：在当前 Logic.Env + Scope 上非阻塞地启动一条 watcher Fiber；
  - 实现：`Effect.forkScoped(flowApi.run*(effect, options)(stream))`，其中 `options` 会被提升到 EffectOp.meta，用于全局 MiddlewareStack 处理。

> 关键点：**每条 watcher = 一段长期运行的 Flow/Effect 程序**。`runFork` 是典型写法，会在 ModuleRuntime Scope 下挂出长期存在的 Fiber。

## 1.4 BoundApi：`$.onAction / $.onState / $.on`

实现位置：`packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts` + `packages/logix-core/src/Bound.ts`

- 对当前 Module：
  - `BoundApiRuntime.make(shape, runtime)`：
    - 先构造 `flowApi = DSL.Flow.make(runtime)`；
    - 再构造 `makeIntentBuilder = LogicBuilder.makeIntentBuilderFactory(runtime)`。
  - `$.onAction(...)`：
    - 基于 `runtime.actions$` 做 filter（支持谓词、`_tag` 字面量、Schema 等），得到一个 Stream；
    - 将 Stream 交给 `makeIntentBuilder`，得到 IntentBuilder。
  - `$.onState(selector)`：
    - 调用 `runtime.changes(selector)` 得到视图变化流；
    - 同样交给 `makeIntentBuilder`。
  - `$.on(source)`：
    - 对任意 Stream 直接调用 `makeIntentBuilder(source)`。
- 跨 Module 的 `$Other`：
  - 使用 `ModuleHandle.actions$ / changes(selector)` 作为源流构造远程 Bound 风格 API；
  - 语义与当前 Module 上的 on\* 一致，只是 Runtime 来源不同。

> 关键点：BoundApi 不管理 watcher 列表，只负责把 “ModuleRuntime 源流 + Flow.Api + LogicBuilder” 组合为 Fluent 的 `$.on*`。

## 1.5 Logic 与 ModuleRuntime Scope

实现位置：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.ts` + `impl/03-module-lifecycle-and-scope.md`

- Logic 注入与启动：
  - `ModuleTag.live`（或上层 `module.impl.layer`）会调用 `ModuleRuntime.make(initial, { tag, logics, moduleId })`；
  - 在 `ModuleRuntime.make` 内，对每个 Logic：
    - 注入当前 ModuleRuntime Tag 与 LifecycleManager；
    - 在构造 ModuleRuntime 的 Scope 内 `Effect.forkScoped(logicWithServices)`。
- watcher Fiber：
  - 对于 `runFork` / 业务代码手写的 `Effect.forkScoped($.onAction(...).run(...))`：
    - watcher Fiber 的生命周期同样挂在 ModuleRuntime Scope 下；
    - Scope 关闭时，所有 Logic Fiber + watcher Fiber 会被一起中断。

> 关键点：没有任何“全局静态 watcher 列表”，所有 watcher 都严格跟随 ModuleRuntime/Scope 生命周期。
