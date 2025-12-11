---
name: logix-llms
description: 在 intent-flow 仓库中编写或修改基于 @logix/* 的代码时，为 LLM 提供 Logix v3（@logix/core/@logix/react/@logix/sandbox/@logix-devtools-react）用法速查与示例入口，避免每次从源码冷启动扫一遍。
---

# logix-llms · Logix 运行时速查

## PURPOSE · skill 目标

在处理与 Logix v3 Runtime 相关的任务时，使用本 skill 明确三件事：

- 对齐 `@logix/core` / `@logix/react` / `@logix/sandbox` / `@logix/devtools-react` 的心智模型与推荐用法；
- 快速定位「写代码时应该参考的文档」与「可以直接抄写/改造的示例文件」；
- 在 examples 与 devtools 中落地新场景时沿用一致的 Module-First + Bound API `$` 编程模型。

> Logix 相关的概念与 API 契约仍以 `docs/specs/runtime-logix` 与 `docs/specs/intent-driven-ai-coding/v3` 为主事实源；本 skill 只做 LLM 视角的速查与导航，如有冲突以文档与本地类型定义为准。

## WHEN · 何时加载本 skill

- 在 examples 中实现或修改基于 Logix 的场景代码时：
  - `examples/logix/**/*`：纯 Effect + Logix 场景；
  - `examples/logix-react/**/*`：React 集成与 Devtools 示例；
  - `examples/logix-sandbox-mvp/**/*`：Sandbox / Playground / Alignment Lab。
- 在 `packages/logix-core` / `packages/logix-react` / `packages/logix-sandbox` / `packages/logix-devtools-react` 下补充或改造 API 时。
- 在新的 Devtools / Playground / Studio 功能中决定「如何挂 Runtime / Module / Debug」时。
- 对话中出现以下关键词之一时：`Logix.Module.make`、`Module.logic`、`Module.implement`、`$.onAction`、`$.onState`、`Flow.make`、`RuntimeProvider`、`devtoolsLayer`、`SandboxClient`。

## MENTAL MODEL · Logix 心智模型（LLM 内化版）

- `Module`：描述某一块领域状态与意图边界的「类型 + 契约」，只负责定义 State/Actions/Reducers，不直接持有实例。
- `Logic`：在 Module 上长期运行的一段 Effect 程序，通过 Bound API `$` 写成「监听什么 → 怎么更新 → 是否跨模块互动」。
- `ModuleImpl`：将 `initial` 状态 + 一组 `Logic` + imports/processes 组合成可运行的实现体，并暴露成一个 `Layer`。
- `Runtime`：以 Root ModuleImpl 为根，将多模块 Runtime/进程挂在一棵树上，由 `Logix.Runtime.make` 或 `ManagedRuntime.make` 构造。
- `React`：通过 `RuntimeProvider` 注入 Runtime，再用 `useModule`/`useSelector`/`useDispatch` 等 Hooks 驱动组件。
- `Sandbox`：通过 `SandboxClient` 在 Worker 中编译 + 运行 Logix/Effect 代码，用在 Playground / Alignment Lab。
- `Devtools`：依托 `Logix.Debug` 事件，用 `@logix/devtools-react` 聚合并展示 Snapshot。

默认按这条链路思考并落地代码：

> Schema → Logix.Module.make → Module.logic($) → Module.implement → Runtime / React / Sandbox / Devtools

## FLOW · Module → Logic → ModuleImpl → useModule

为了避免 LLM 在 Logic 形态（尤其是 `setup/run`）和 `useModule` 配合时写错，统一按下面这条具体链路来写：

1. 定义 Module（只负责「是什么」）
   - 在独立文件中定义：
     - `export const CounterModule = Logix.Module.make('CounterModule', { state: CounterStateSchema, actions: CounterActionMap })`。
   - 如需类型别名：`export type CounterShape = Logix.Module.Shape<typeof CounterStateSchema, typeof CounterActionMap>`。

2. 定义 Logic（描述「在这个 Module 上如何响应 Intent」）
   - 简单场景（不关心 `setup/run`）可以直接返回 Effect：
     - `export const CounterLogic = CounterModule.logic(($) => Effect.gen(function* () { ... }))`；
     - 在逻辑内部用 `yield* $.onAction('inc').run(...)`、`yield* $.onState(...).run(...)` 等声明 watcher——这些调用本身会注册监听器，而不是阻塞当前 Effect。
   - 需要显式生命周期时，使用 `{ setup, run }` 形态：
     - `export const CounterLogic = CounterModule.logic(($) => ({ setup, run }))`：
       - `setup`：只做同步初始化（例如写一条日志、注册 Debug 元信息），必须保持“快速结束”，不要在其中发起真实异步请求或长时间阻塞；
       - `run`：承载长期运行的逻辑（watcher/轮询等），在其中使用 `Effect.forkScoped(...)` 启动长期 Fiber：
         - `yield* Effect.forkScoped($.onAction('inc').runParallel(...))`；
         - 其他长任务（如 Stream / while 循环）同样放在 `run` 内，用 `forkScoped` 启动。
   - 约定：
     - 不要在 `setup` 或 `run` 里直接调用 `Effect.runPromise` / `ManagedRuntime.runSync` 之类的 run API；
     - 长期监听一律通过 `onAction/onState/... + run*/forkScoped` 抽象来做，让 Runtime 管理 Fiber 生命周期。

3. 组合 ModuleImpl（让 Module 真正“活起来”）
   - 使用 `Module.implement({ initial, logics, imports?, processes? })`：
     - `initial`：模块初始 State（必须满足 `state` Schema）；
     - `logics`：通常是一个数组，如 `[CounterLogic]`；
     - `imports`：额外的 `Layer` 或其他 `ModuleImpl`（例如注入服务 Tag，或挂载依赖 ModuleImpl）；
     - `processes`：App 级长期进程（例如心跳/全局轮询），一般只有 Root ModuleImpl 会用到。
   - 对于“根模块/根实现”（RootImpl），通常还会在外层组合多个子 ModuleImpl 的 `imports`。

4. 构造 Runtime 并在 React 中注入
   - App 级 Runtime（推荐）：
     - 定义 RootImpl：`const RootImpl = RootModule.implement({ initial, logics, imports: [CounterImpl, ...] })`；
     - 构造 Runtime：`const runtime = Logix.Runtime.make(RootImpl, { layer: Layer.mergeAll(devtoolsLayer, ...), label: 'DemoRuntime' })`；
     - 在 React 入口：
       - `<RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>`。
   - Sandbox/Playground 场景，可用 `ManagedRuntime.make(AppLayer)` + `RuntimeProvider` 的形式，模式相同。

5. 在组件中通过 `useModule` 使用 Module
   - 依赖全局 Runtime 的场景（App 级 Module）：
     - 只传 Module Tag：
       - `const counter = useModule(CounterModule)`：获取当前 Runtime 中该 Module 的 Runtime 句柄；
       - `const count = useModule(CounterModule, (s) => s.value)`：直接订阅状态；
       - `const dispatch = useDispatch(CounterModule)`：获得派发函数。
   - 需要局部/会话级实例的场景：
     - 以 `ModuleImpl` 作为 handle：
       - `const counter = useModule(CounterImpl)` 或 `useModule(CounterImpl, (s) => s.value)`；
       - 这种写法会在组件 Scope 内构建一个局部 ModuleRuntime，适合表单/向导/Session 场景；
       - 底层仍然会执行 `CounterLogic` 的 `setup` 和 `run`，但生命周期被绑定在当前组件之下。
   - 注意：
     - `Module.logic` 的 `setup`/`run` 只与 ModuleRuntime 生命周期相关，和 `useModule` 是否传 selector 无关；
     - 任何长期运行的逻辑（订阅 Action/State、轮询等）都应该通过 Logic 层完成，而不是在 React 组件里直接操作 Runtime。

## API SNAPSHOT · 高频 API 内化速查

### 1. `@logix/core`：Module / Logic / ModuleImpl / Runtime

- 引入约定：
  - `import * as Logix from '@logix/core'`
  - `import { Effect, Schema } from 'effect'`

- 定义 Module（「是什么」）：
  - 使用 `Logix.Module.make(id, { state, actions, reducers? })`：
    - `state`：`Schema.Struct({ ... })`；
    - `actions`：`{ foo: Schema.String, bar: Schema.Void, ... }`；
    - `reducers?`：可选 Reducer Map，借助 `Logix.Module.Reducer.mutate((draft, action) => { ... })` 写不可变更新。
  - 推荐模式：
    - 独立文件导出：`export const FooModule = Logix.Module.make('FooModule', { ... })`；
    - 如需类型别名：`export type FooShape = Logix.Module.Shape<typeof FooStateSchema, typeof FooActionMap>`.

- 编写 Logic（「怎么动」）：
  - 在 Module 上调用 `FooModule.logic(($) => ...)`：
    - 纯 Effect 形式：`FooModule.logic(($) => Effect.gen(function* () { ... }))`；
    - 生命周期形式：`FooModule.logic(($) => ({ setup, run }))`（适合需要长期 `forkScoped` watcher 的场景）。
  - Bound API `$` 常用能力：
    - 监听 Action：
      - `$.onAction('inc').run(effect)`：串行执行；
      - `$.onAction('inc').runParallel(effect)`：并行处理并自动管理 Fiber 生命周期。
    - 监听 State：
      - `$.onState((s) => s.field).run(effect)`：观察派生字段变化；
    - 更新 State：
      - `$.state.update((prev) => ({ ...prev, field: next }))`；
      - `$.state.mutate((draft) => { draft.field = next })`；
    - 跨模块协作：
      - `const other = $.use(OtherModule)`，再使用 `other.state` / `other.dispatch` / `other.changes` 等。

- 组合 ModuleImpl（可运行实现体）：
  - 使用 `FooModule.implement({ initial, logics, imports?, processes? })`：
    - `initial`：模块初始 State；
    - `logics`：一组前述 `FooModule.logic` 产生的 Logic；
    - `imports?`：附加的 `Layer` 或其他 `ModuleImpl`，用于注入服务或其他模块；
    - `processes?`：长期运行的进程（例如心跳轮询、同步任务）。
  - ModuleImpl 关键属性：
    - `Impl.layer`：承载该 ModuleRuntime 及其依赖的 Layer；
    - `Impl.module`：Module 定义本身；
    - `Impl.withLayer(layer)` / `Impl.withLayers([...])`：在不改变模块定义的前提下叠加额外 Env。

- 构造 Runtime：
  - 简单场景（单模块 + CLI）：
    - 在 `Effect.gen` 中：
      - `const runtime = yield* FooModule` 获取 ModuleRuntime；
      - 使用 `yield* runtime.dispatch({ _tag: 'inc', payload: ... })`、`yield* runtime.getState`、`runtime.changes(selector)`；
    - 在外层用 `Effect.provide(FooImpl.layer)` 或合并后的 Layer 提供实现。
  - 应用级 Runtime：
    - 使用 `Logix.Runtime.make(RootImpl, { layer?, onError?, label? })`：
      - `RootImpl` 通常是聚合多个 ModuleImpl 的 Root Module；
      - `layer` 用于叠加全局 Env（配置、服务、Devtools 等）；
      - `label` 用于在 Devtools 中标识 Runtime。

### 2. `@logix/react`：RuntimeProvider 与核心 Hooks

- Runtime 注入：
  - 在应用入口构造 Runtime：
    - `const runtime = Logix.Runtime.make(RootImpl, { layer: Layer.mergeAll(devtoolsLayer, ...) })`；
  - 使用 `RuntimeProvider` 注入：
    - `<RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>`；
    - 可选 `layer` prop 叠加局部 Env。

- 核心 Hooks：
  - `useModule(handle)`：
    - `handle` 可为 `ModuleImpl`、`ModuleInstance` 或现有 `ModuleRuntime`；
    - 返回稳定的 ModuleRuntime 引用，适合在组件中主动调用 `dispatch` 或自定义 Effect。
  - `useModule(handle, selector)`：
    - 直接订阅指定模块 State 的派生值，类似 `useSelector` 的便捷形态。
  - `useSelector(handle, selector, equality?)`：
    - 基于 `useSyncExternalStore` 的订阅，适用于更通用的订阅需求。
  - `useDispatch(handle)`：
    - 返回一个派发函数，可在事件处理中调用 `dispatch({ _tag, payload })`。
  - `useLocalModule(Impl, deps?)` / `useModuleList(...)`：
    - 在组件级创建局部 ModuleRuntime 或一组模块实例，符合 StrictMode/Suspense 约束。

### 3. `@logix/sandbox` 与 `@logix/devtools-react`

- Sandbox（Worker 运行 Logix）：
  - 创建客户端：`const client = createSandboxClient({ workerUrl?, wasmUrl?, kernelUrl?, timeout? })`；
  - 初始化：`await client.init()`；
  - 编译：`await client.compile(code, filename?, mockManifest?)`；
  - 运行：`await client.run({ runId?, actions?, useCompiledCode? })`；
  - 订阅：`client.subscribe(state => { state.logs / state.traces / state.uiIntents ... })`。

- Devtools：
  - 启用 Layer：在 Runtime Layer 中叠加 `devtoolsLayer`；
  - UI：在应用外层挂载 `<LogixDevtools position="bottom-left" />`；
  - Devtools 内部依赖 Debug 事件语义与 Runtime label 区分不同 Runtime/模块。

## CHECKLIST · LLM 写 Logix 代码时自检要点

- 概念与契约：
  - 遇到不确定的 API 或类型推导时，优先查 `docs/specs/runtime-logix/core/*.md` 与本地 d.ts，而不是凭记忆猜签名。
  - 确认 `Effect.Effect<A, E, R>` 泛型顺序始终为 A/E/R，Env 用 Tag 注入，不构造胖 Context。
- Module & Logic：
  - 保持「Module 定义（Schema/Actions）→ Logic（`Module.logic` + `$`）→ ModuleImpl（`Module.implement`）→ Runtime/React/Sandbox 集成」的顺序；
  - 在 Logic 中优先使用 Bound API 的 DSL（`$.onAction` / `$.onState` / `$.state.update` / `$.use` 等），避免直接操作底层 Runtime。
- 示例与一致性：
  - 在编写新示例或改造旧示例前，先扫描同目录下现有文件，复用命名与结构模式（如 `*Module` / `*Logic` / `*Impl` / `*Live` 命名）。
  - 在 React/Sandbox 场景下，优先参照 `examples/logix-react` 与 `examples/logix-sandbox-mvp` 中的布局与 Provider 写法。
- 变更后的验证：
  - 至少保证对应子包或示例可以通过 `pnpm typecheck`（或子包 `typecheck` 脚本）；
  - 对涉及 Runtime/React 行为的改动，优先更新或补充 `packages/logix-core` / `packages/logix-react` / `packages/logix-devtools-react` 下的测试用例。

## FURTHER READING · 外链（辅助）

在需要完整规范或深入实现细节时，再加载以下文档（作为补充，而不是每次都全部读完）：

- `docs/specs/runtime-logix/core/README.md`：Logix Core 概览与快速开始；
- `docs/specs/runtime-logix/core/02-module-and-logic-api.md`：Module / Logic / ModuleImpl / `$` 正式契约；
- `docs/specs/runtime-logix/core/03-logic-and-flow.md`：Bound API `$` + Flow/Control；
- `docs/specs/runtime-logix/react/README.md`：`@logix/react` Adapter 行为与配置；
- `docs/specs/runtime-logix/impl/package-structure.md`：`@logix/*` 包结构与职责。
