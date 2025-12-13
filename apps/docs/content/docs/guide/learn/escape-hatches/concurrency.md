---
title: Watcher 模式与生命周期
---

本节从“业务写法”的角度，说明在 Logix 中几种常见 watcher 写法的差异，以及它们与 Scope / 生命周期的关系。

## 1. 先想清楚两个维度

在看具体 API 之前，可以先把 watcher 行为拆成两个问题：

1. 这一段 Logic 里，这条 watcher **要不要阻塞**当前 Fiber？
2. 对同一条 watcher 来说，多次事件进来时，对应的 Effect 是**串行执行**，还是“只保留最新/首个”或者“显式并行”？

Logix 的 DSL 是围绕这两条轴来设计的：

- “阻塞 vs 不阻塞”——通过是否使用 `run*` / `run*Fork` 区分；
- “并发模型”——通过 `run` / `runLatest` / `runExhaust` / `runParallel` 等后缀表达。

在多数业务场景里，你只需要记住一条经验法则：

- **挂长期 watcher**：用 `yield* $.onAction(...).runFork(...)` 或其它 `run*Fork` 变体；
- **一次性的 Flow / 流水线**：直接用 `run` / `runLatest` 等作为这一段 Logic 的主体。

下面的所有示例都可以在 React 集成场景下照搬，细节见《React 集成指南》。

## 2. 三种常见 watcher 写法

在 Module.logic 内，通常会看到三种挂 watcher 的方式（在 React 集成场景下同样适用）：

- `Effect.all([...], { concurrency: "unbounded" })`
- `Effect.fork($.onAction(...).run(...))`
- `yield* $.onAction(...).runFork(...)`

可以按下面的表来理解它们的区别（假设都写在同一个 Logic 里）：

| 写法 | 典型代码 | 适用场景 | 生命周期 / Scope | 错误处理 |
| --- | --- | --- | --- | --- |
| `Effect.all` + `run` | `Effect.all([ $.onAction("inc").run(...), $.onAction("dec").run(... ) ], { concurrency: "unbounded" })` | 同一 Logic 里挂多条 watcher，结构简单、一次性启动 | 和当前 Logic 同进退；由 Logic 启动的 Scope 托管 | 通过全局 EffectOp 中间件栈统一收集（IntentBuilder.run 内部会将每次执行提升为 EffectOp） |
| `Effect.forkScoped($.onAction().run(...))` | `yield* Effect.forkScoped($.onAction("inc").run(...))` | 需要手动拿到 Fiber、做更细粒度控制时（比如手工中断） | 显式挂在当前 ModuleRuntime 的 Scope 上；模块销毁时会被中断 | 如果配置了全局 MiddlewareStack，则错误与观测会通过 EffectOp 总线走统一管线；否则是普通 Effect.forkScoped 行为 |
| `runFork`（推荐） | `yield* $.onAction("inc").runFork(... )` | 希望“写起来像 fork watcher”，又不想关心 Fiber 与安全包装的日常业务 | 与 `Effect.fork($.onAction().run(...))` 等价，但内部已经通过 EffectOp 总线与 Scope 做好封装 | 统一走 EffectOp 中间件总线，配合 Debug / Middleware 更容易观测和约束 |

建议：

- 如果一个 Logic 里只挂一条 watcher，可以统一用“安全默认写法”：
  - `const Logic = Module.logic(($) => Effect.gen(function* () { yield* $.onAction("...").runFork(...) }))`；
  - 这样可以把所有 `yield* $.onAction/$.onState/$.use` 都写在 generator 体内，避免在 setup 阶段误用 run-only 能力；
- 当一个 Logic 里要挂多条 watcher 时，推荐模式是：
  - 用 `Effect.gen` + 多个 `yield* $.onAction(...).runFork(...)`；
  - 或在 `Effect.gen` 里 `yield* Effect.all([...], { concurrency: "unbounded" })` 一次性挂上多条 watcher；
- 日常 watcher 推荐使用 `$.onAction(...).run(...)` / `runLatest` / `runExhaust`，结构直观且并发语义明确；
- 只有在确实需要手动管理 Fiber 时，再用裸的 `Effect.forkScoped`。

## 3. IntentBuilder.run* 与并发语义

从 DSL 的角度看，`run*` 系列可以按照“同一条 watcher 内的并发模型”来理解：

- `run`：**串行**。同一条 watcher 内，一个事件对应的 Effect 完成之后，下一个事件才会被处理。
- `runLatest`：**始终只保留最新一次触发**。新事件到来时，会取消之前尚未完成的 Effect，只让最后那一次真正跑完；
- `runExhaust`：**首个执行完成前，后续触发一律忽略**。适合“防重复提交”场景；
- `runParallel`：**显式无界并发**。同一条 watcher 内，多个事件可以并行触发 Effect；
- 带 `Fork` 的版本（`runFork` / `runParallelFork` 等），只是在上述语义的基础上，再加一层“挂在 ModuleRuntime Scope 上的长期 watcher”：
  - `runFork` ≈ `Effect.forkScoped($.onAction(...).run(...))`；
  - `runParallelFork` ≈ `Effect.forkScoped($.onAction(...).runParallel(...))`。

需要特别说明的是：

- 当前实现中，`Flow.run` / `IntentBuilder.run` 已经改为 **默认串行**，不再是“隐式无界并发”；
- 真正需要高吞吐时，应该显式使用 `runParallel` / `runParallelFork`，并在文档/代码层写清楚意图。

## 4. IntentBuilder.run 与 EffectOp 总线

在实现层面，所有 `run*` 系列 API 都会被统一提升为 EffectOp，并通过 MiddlewareStack 执行：

- `run` / `runLatest` / `runExhaust` / `runParallel`：
  - 语义上是“把 Action/State 流通过某种策略交给 Effect Flow 执行”；
  - 当前实现中，它们最终都走 `flowApi.run*`，并在外层构造 `kind = "flow"` 的 EffectOp，附带必要的 meta；
- `runFork` / `runParallelFork`：
  - 内部近似于 `Effect.forkScoped(flowApi.run*(...))`，但会通过 EffectOp 总线与 Scope 一并封装；
  - 这样可以保证用这些 API 挂出来的 watcher 也在统一的 Middleware / Debug 管道下。

对业务来说，这意味着：

- 你可以放心在 Logic 内部使用这些高层 API，而不用每次手动加 try/catch 或埋点；
- 如果需要统一的日志、埋点、告警，只需要在 Engine 层或 ModuleImpl 上挂 MiddlewareStack，而不是在每个 watcher 里重复写；
- 复杂逻辑推荐始终写在 `Effect.gen` 里，通过 `$.use` 获取 Service、通过 `$.state.update/mutate` 更新状态，再通过合适的 `run*`/`run*Fork` 组合选择并发模型。

### 4.1 `Effect.all` vs `Effect.gen`：多条 `runFork` watcher 的等价写法

以下两种写法在 **watcher 语义上是一致的**，都会在当前 ModuleRuntime Scope 下挂两条长期 watcher：

```ts
// 写法 A：Effect.gen + Effect.all 一次性启动多个 runFork
const AppCounterLogic = AppCounterModule.logic(($) =>
  Effect.gen(function* () {
    yield* Effect.all(
      [
        $.onAction("increment").runFork(
          $.state.mutate((s) => {
            s.count += 1
          }),
        ),
        $.onAction("decrement").runFork(
          $.state.mutate((s) => {
            s.count -= 1
          }),
        ),
      ],
      { concurrency: "unbounded" }, // 这里只是“并行启动”这两个 runFork
    )
  }),
)

// 写法 B：Effect.gen 里顺序 yield* 多个 runFork
const AppCounterLogic = AppCounterModule.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction("increment").runFork(
      $.state.mutate((s) => {
        s.count += 1
      }),
    )
    yield* $.onAction("decrement").runFork(
      $.state.mutate((s) => {
        s.count -= 1
      }),
    )
  }),
)
```

原因是：

- `runFork` 本身就会在当前 Scope 下 fork 出 watcher Fiber，并很快返回 `void`；
- 对“启动多个 watcher”这件事来说，`Effect.all([...], { concurrency: "unbounded" })` 和在 `Effect.gen` 里依次 `yield* runFork(...)` 的区别，只在于“启动动作本身是否并行”，而不会改变每条 watcher 的触发源、并发模型或生命周期。

实践上推荐：

- 当 watcher 数量少、逻辑简单时，用 `Effect.gen + 多个 yield* runFork` 可读性更高，也更方便在中间插入其它初始化逻辑；
- 当确实只是想“一次性挂上一组 watcher”，且没有额外初始化步骤时，使用 `Effect.all([...])` 也是等价且合法的写法。

## 5. Watcher 与 ModuleRuntime 生命周期

结合《ModuleRuntime 实例与生命周期》里关于实例 Scope 的说明，可以这样理解 watcher 的生命周期：

- **Module 级 Scope**：
  - 每一棵 `ModuleRuntime` 实例都有自己的 Scope；
  - 不论是通过应用级 Runtime（`Logix.Runtime.make`）、`ModuleImpl.layer` 还是 React `useModule` 构建，这个 Scope 都会在“模块销毁”时统一关闭；
  - 通过 `Flow.run*` / `runFork` 启动的 watcher，都挂在这棵 Scope 上。
- **Effect.fork vs runFork**：
  - 如果在 Logic 里写 `yield* Effect.fork($.onAction("...").run(...))`，fork 出来的 Fiber 会附着在当前 Logic 所在的 Scope 上；
  - 使用 `runFork` 则在语义上更明确：它就是“模块级 watcher”，由引擎统一负责安全包装与生命周期托管。
- **React 场景**：
  - Tag 模式（`useModule(Module)`）下，所有 watcher 挂在 App 级 Runtime 的 Scope 上，随着 Runtime 的生命周期一起存在；
  - Impl 模式（`useModule(Impl)`）下，每个组件的局部 Module 实例都有自己的 Scope，组件卸载时：
    - React 适配层会关闭该 Scope；
    - 所有挂在其上的 watcher（包括 runFork）都会被中断。

换句话说：

- 你只要遵循“在 Logic 内使用 run* / runFork”这一层 API，就可以把“watcher 到底挂在哪个 Scope 上”的问题交给引擎；
+- 只有在跨模块、跨 Runtime 需要自定义 Scope 时（例如特殊的调度中心），才需要直接与 `Effect.forkScoped` / Scope API 打交道。
