# Logix.Module / Logic / Live / `$` API 总览

> **Status**: v3.1 Canonical (Module-First)
> **Scope**: Logix Engine — Public API Surface (Concept & Type Level)
> **Audience**: 以应用/业务开发者为主，库作者与架构师在此基础上进行二次封装。

本篇作为 v3.1 之后的 **Module-First 编程模型总览与单一事实源**，集中说明：

- 如何使用 `Logix.Module` 定义领域模块（Module，纯定义，不含实例状态）；
- 如何在 Module 上通过 `Module.logic(($)=>Effect)` 编写逻辑程序；
- 如何用 `Module.live(initial, ...logics)` 生成可注入的运行时 Layer；
- 如何用 `Module.make({ initial, logics, imports?, processes? })` 生成可复用的 **ModuleImpl 蓝图**，再通过 `withLayer/withLayers` 与 `LogixRuntime.make(...)` 拼装到 Runtime 中；
- Bound API `$` 在业务代码中的推荐用法（特别是 `$.on*` 事件订阅）。

详细行为语义仍以：

- `core/03-logic-and-flow.md`（Logic / Flow / Control / Bound API `$`）
- `core/05-runtime-implementation.md` 与 `impl/*`（运行时/Scope 实现细节，仅架构师/引擎实现者关注）

为准，本文件只做 **业务向 API 视角的总览与汇总**。

### 0.0 API 分层速览

| 层级 | 面向角色 | 主要入口 | 说明 |
| :--- | :--- | :--- | :--- |
| 应用/业务开发者 | Feature/业务工程师 | `Logix.Module` / `Module.logic(($)=>...)` / `Module.live(...)` / Bound API `$`（`$.state / $.actions / $.on* / $.use`） | 日常开发只需这些入口即可完成绝大部分工作 |
| 组件 / 页面作者 | UI & 交互工程师 | `Module.make({ initial, logics, imports?, processes? })` / `ModuleImpl.withLayer` / `LogixRuntime.make(...)` / React `useModule(impl)` | 把“模块 + 初始状态 + 逻辑 + 依赖注入 + 进程”打包成可复用蓝图，在 Runtime / React 中复用 |
| 库作者 / Pattern 作者 | 复用逻辑、领域库作者 | `Flow.Api` / `Control.Api` / `Logic.of` / `$.flow.*` / Pattern 约定 | 用于封装可复用长逻辑、领域 Pattern 与 L3 Helper |
| 架构师 / 引擎实现者 | 平台/Runtime 实现 | 运行时容器实现、Module/Runtime 组合、Scope 管理（见 `core/05-runtime-implementation.md`、`impl/*`） | 负责内部运行时实现，业务代码不直接依赖 |

---

## 0. 快速总览（Trinity + `$`）

- `Logix.Module(id, { state, actions })`
  - 定义「领域模块」，只负责 **身份 + 形状**；
  - 自身是一个 Tag，可被 `$.use(Module)` 消费；
  - 不包含任何运行时实例或状态。
- `Module.logic(($) => Effect.gen(...))`
  - 在该 Module 上编写一段 Logic 程序；
  - 返回值是一个可组合的 Logic 单元（Logic.Of），可以像普通值一样传递与复用。
- `Module.live(initialState, ...logics)`
  - 将 Module 定义 + 初始 State + 一组 Logic 程序组合成一个 Live Layer；
  - 每次调用都会生成一个新的 Layer，可在不同 Runtime/Scope 下多次注入；
  - 适合“一次性拼装 + 立即注入”的场景（如 CLI 脚本、单模块 PoC）。
- `Module.make({ initial, logics, imports?, processes? })`
  - 在 `Module.live` 之上，进一步封装出一个 **ModuleImpl 蓝图**：
    - 记录该 Module 的初始 State 与 Logic 集合；
    - 暴露 `impl.layer`（`Layer<ModuleRuntime, never, any>`）、`impl.module` 以及可选的 `impl.processes`；
    - 支持通过 `impl.withLayer(...)` / `impl.withLayers(...)` 注入额外 Env（Service / 平台能力等）；
  - 典型使用场景：
    - React 中通过 `useModule(impl)` 直接消费配置好的模块实现；
    - 应用级 Runtime 中通过 `LogixRuntime.make(rootImpl, { layer, onError })` 把某个 Root ModuleImpl 作为入口；
    - 平台/调试场景下可将这些 ModuleImpl 交给内部 AppRuntime 工具函数组装成可视化/调试用 Runtime（仅面向引擎实现与平台工具，不作为对外 API）。
- `$`（Bound API）
  - 业务开发几乎只需要记住的唯一入口；
  - 提供 `$.state / $.actions / $.flow / $.on* / $.use / $.lifecycle` 等能力；
  - 同时是 IntentRule Parser 的静态锚点。

---

## 1. `Logix.Module`：领域模块定义

在代码层，一个领域模块统一由 `Logix.Module` 表示：

```ts
import { Schema } from 'effect';
import { Logix } from '@logix/core';

export const CounterModule = Logix.Module('Counter', {
  state: Schema.Struct({
    count: Schema.Number,
  }),
  actions: {
    inc: Schema.Void,
    dec: Schema.Void,
  },
});
```

语义：

- `id: string`：领域模块的全局 Id，用于 Universe/Galaxy 拓扑和平台识别；
- `state` / `actions`：Effect.Schema 形式的 State / Action 形状；
- `CounterModule` 本身同时是：
  - Module 定义（Intent 视角：领域资产）；
  - Runtime Tag（可被 `$.use(CounterModule)` 消费）；
  - Logic 入口（`CounterModule.logic` 的宿主）；
  - Live 工厂（`CounterModule.live` 的宿主）。

对应类型可以在 `logix-v3-core.ts / Logix.Module` 中查看。

---

## 2. `ModuleLogic` 与 `Logic.Of`

为了在类型上表达“在某一类 Module 上运行的一段逻辑程序”，v3.1 约定（以 `Logic.Of` 为主）：

```ts
import { Logic, Store, Logix } from '@logix/core';

export type ModuleLogic<Sh extends Logix.ModuleShape<any, any>, R = unknown, E = never> =
  Logic.Of<Sh, R, unknown, E>
```

含义：

- `Sh`：通过 Module 定义推导出的 `Logix.ModuleShape<stateSchema, actionSchema>`；
- `R`：Logic 依赖的额外环境（Services）；
- `E`：Logic 可能抛出的错误（通常为 never，内部消化）。

> 注：早期草案中曾设想过“基于 `Logic.Env<Sh,R>` + `Logic.RuntimeTag` 的 Bound API 工厂”，用于从环境中“隐式”获取 Runtime 并构造 `$`。该设想目前仅保留在 drafts 中，用于探索 Env-First 形态的可能性。  
> 当前 PoC 中，Pattern / Namespace 场景请直接使用 `Logix.BoundApi.make(shape, runtime)` 在实现层构造 `$`，业务代码推荐统一通过 `Module.logic(($)=>Effect.gen(...))` 返回 Logic 值。

---

## 3. `Module.logic(($)=>Effect)`：逻辑程序入口

### 3.1 基本形态

`Module.logic` 是“在该领域上挂载一段 Logic 程序”的入口：

```ts
export const CounterLogic = CounterModule.logic(($) =>
  Effect.gen(function* () {
    // Action → State
    yield* $.onAction(
      (a): a is { _tag: 'inc' } => a._tag === 'inc',
    ).update((prev) => ({ ...prev, count: prev.count + 1 }));

    // State → State
    yield* $.onState((s) => s.count).run(Effect.logInfo('Count changed'));
  }),
);
```

特征：

- 由 Module 注入一个 Bound API `$`（见第 4 节），Env 类型自动推导为 `Logic.Env<Sh,R>`；
- 返回值就是一段 Logic 程序（`Logic.Of<Sh,R>`），可以在 `Module.live` 中挂载，或作为 Pattern/模板返回值复用；
- 一个 Module 可以有多段 Logic（多次 `.logic` 调用），但通常约定在 Module 定义文件导出一个“主逻辑”，其余作为 Pattern/插件逻辑组合到 `.live` 中。

### 3.2 组合多个 Logic 程序

Module 本身不限制 Logic 的个数，`Module.live` 会将它们统一挂在该 Module 对应的 `Logix.ModuleRuntime` 上：

```ts
export const AuditLogic = CounterModule.logic($ => /* ... */);
export const MetricsLogic = CounterModule.logic($ => /* ... */);

export const CounterLive = CounterModule.live(
  { count: 0 },
  CounterLogic,   // 主逻辑
  AuditLogic,     // 审计插件
  MetricsLogic,   // 监控插件
);
```

---

## 4. `Module.live(initial, ...logics)`：生成 Live Layer

`Module.live` 负责把 Module 定义 + 初始 State + 一组 Logic 程序组合成可注入的 Layer：

```ts
export const CounterLive = CounterModule.live(
  { count: 0 },
  CounterLogic,
);
```

语义：

- 内部会基于 Module 的 `stateSchema` / `actionSchema` 构造状态容器与 Action 流，并启动所有挂载的 Logic 程序；
- 在一个运行时 Scope 中启动所有传入的 Logic 程序（通过 `Effect.forkScoped` 等），并将相应的运行时实例注入 `Logic.RuntimeTag`；
- 对 React/应用 Shell 而言，只需把 `CounterLive` 提供给 Runtime（如 `RuntimeProvider` / 统一的模块 Hook），无需关心底层实现细节。
- `ModuleRuntime` 的具体实现与替换策略属于引擎实现层能力，如需自定义 Runtime，请参考 `core/05-runtime-implementation.md` 中的「1.3 扩展点：自定义 ModuleRuntime 的边界」约定。

---

## 5. Bound API `$`：业务作者的唯一入口

Bound API `$` 的完整说明见 `core/03-logic-and-flow.md`，这里只做概览。

在 Logic 程序内部，业务作者只需记住一个符号 `$`。当前 PoC 中，`$` 的**唯一正式入口**是 `Module.logic(($)=>Effect)`：

```ts
export const SomeLogic = SomeModule.logic(($) =>
  Effect.gen(function* () {
    // ...
  }),
);
```

> 说明：文档与示例中若提到“针对某个 Shape/Env 预绑定的 `$`”，均表示在 `Logic.Env<Sh,R>` 上预绑定同一类 `BoundApi<Sh,R>` 的 `$`。在当前实现中，请始终通过 `Module.logic(($)=>...)` 获取 `$`。

从心智模型上，可以把 `$` 理解为一个“宿主对象”，内部再按「感知 / 策略 / 行动 / 协作 / 结构 / 生命周期」六个子域划分：

- 感知（Perception）：`$.onState / $.onAction / $.on` —— Fluent Intent DSL，用于监听当前 Module 的 State / Action 或任意 Stream；
- 策略（Strategy）：`$.flow.*` —— Flow API，包含 `fromAction / fromState / debounce / throttle / filter / run / runLatest / runExhaust` 等算子，用来描述时间轴与并发语义；
- 行动（Actuation）：`$.state` / `$.actions` —— 读写当前 Store 状态（`read / update / mutate / ref`）与派发当前 Store 的 Action（`dispatch / actions$`）；selector 级 Ref 仍需结合 `$.onState` / Flow 或自定义封装；
- 协作（Collaboration）：`$.use` —— 依赖注入入口（`$.use(ModuleOrService)`），用于访问其他 Module 的只读句柄或外部 Service；
- 结构（Structure）：`$.match` —— 结构化分支与模式匹配（`match / matchTag` 等），配合 Effect 原语表达控制结构；
- 生命周期（Lifecycle）：`$.lifecycle` —— 生命周期钩子（`onInit / onDestroy` 等），与 Module Runtime 的 Scope 绑定。

### 5.1 生命周期 `$.lifecycle`

用于定义 Module 启动与销毁时的钩子逻辑。

- **`onInit` (Blocking)**: 模块初始化时执行。**默认阻塞**，即 `yield* onInit` 完成后，Runtime 才会被标记为 Ready。适用于加载配置、连接数据库等必须的前置操作。
- **`onDestroy`**: 模块销毁（Scope 关闭）时执行。用于清理资源。
- **`onError`**: 模块内任意 Logic Fiber 发生未捕获错误（Defect）时触发。
  - **时机**：错误传播到 Module Scope 时，在 Scope 关闭前触发。
  - **用途**：仅用于**最后的错误上报与日志记录**（Last-breath reporting），不用于错误恢复（恢复应在 Logic 内部处理）。
  - **注意**：触发 `onError` 意味着 Module 即将崩溃（Scope 关闭）。

```ts
// 示例：灵活组合多个生命周期与后台任务
const MyLogic = MyModule.logic(($) => Effect.gen(function*() {
  // 1. 第一步初始化 (阻塞)
  yield* $.lifecycle.onInit(Effect.log("Init Step 1: Config"))

  // 2. 启动第一个后台任务 (非阻塞)
  yield* Effect.fork(
    Stream.tick("1 second").pipe(
      Stream.tap(() => Effect.log("Heartbeat 1")),
      Stream.runDrain
    )
  )

  // 3. 第二步初始化 (阻塞)
  // 只有等 Step 1 完成后，才会执行到这里（如果 Step 1 失败，这里不会执行）
  yield* $.lifecycle.onInit(Effect.log("Init Step 2: DB"))

  // 4. 启动第二个后台任务
  yield* Effect.fork(
    Stream.make(1, 2, 3).pipe(
      Stream.runForEach(n => Effect.log(`Processing ${n}`))
    )
  )
}))
```

> **机制说明**：
> - `$.lifecycle.onInit` 只是**注册**初始化逻辑。
> - 运行时会收集所有注册的 `onInit` Effect，并在 Module 启动时按**注册顺序**依次执行（串行）。
> - `Effect.fork` 的后台任务会立即启动，不阻塞后续的 `onInit` 注册，也不阻塞 Module 的 Ready 状态。

### 5.2 未来演进 (Future Lifecycle Hooks)

以下钩子已在规划中，将在后续版本支持：

- **`onSuspend` / `onResume`**:
  - 面向 React `<Offscreen>` / KeepAlive 或移动端后台场景；
  - 用于在 UI 不可见时暂停高频任务（如 Polling），而不销毁状态。
- **`onReset`**:
  - 面向业务逻辑的“软重置”（Soft Reset）；
  - 标准化 `Logout` / `Clear` 行为，重置状态但不销毁实例。

Bound API 设计目标：

- 对业务代码：只需要记住 `$`，不直接接触 Store / Context / Layer；
- 对平台 Parser：`$` 是静态锚点，`$.on*().update/mutate/run*` 链是 IntentRule 的 IR 形态；
- 对运行时：`$` 只是 Env 的一层类型/语法封装，所有语义都可机械地翻译为 `Flow.Api` / `Control.Api` 组合。

---

## 6. 与运行时容器的关系

总结一下 Module / Logic / Live / ModuleImpl 与运行时容器之间的关系：

- 概念层：
  - Module = 领域模块定义（不含实例）；
  - Logic = 在该 Module 上运行的一段长逻辑程序；
  - Live = Module 的运行时 Layer（一次性、即可注入即可用）；
  - ModuleImpl = 带初始状态、逻辑、默认依赖（imports）与可选进程（processes）的模块实现蓝图，可在不同 Runtime / React Tree 中多次复用。
- 运行时层：
  - 每个 Module.live / ModuleImpl.layer 会构造一个与该 Module 绑定的运行时实例；
  - 所有挂在该 Module 上的 Logic 程序运行在同一个运行时实例上（共享 State / actions$ / changes$）；
  - 跨 Module 协作通过 `$.use(OtherModule)` / `$.useRemote(OtherModule)` + Fluent DSL 表达；
  - 在分形 Runtime 模型下：
    - 推荐通过 `LogixRuntime.make(rootImpl, { layer, onError })` 以某个 Root ModuleImpl 为入口构造一颗 Runtime（App / Page / Feature 均视为“Root + Runtime”）；
    - Root ModuleImpl 可以通过 `imports` 引入子模块实现，通过 `processes` 声明长期进程（含 Link）；
    - 应用级 AppRuntime（基于 `LogixAppConfig` / `makeApp`）仅作为底层实现存在（基于 Layer 合成与 processes fork），主要服务于平台/运行时内部，不再建议业务直接调用。

对日常业务开发而言，只需通过 Module / Logic / Live / ModuleImpl / `$` 五个概念进行思考与编码。
需要深入运行时生命周期、Scope、调试等能力时，再参考 `core/05-runtime-implementation.md` 与 impl 系列文档。
