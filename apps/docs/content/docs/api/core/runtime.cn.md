---
title: Runtime 与 ManagedRuntime
description: 介绍 Logix Runtime 的基本概念，以及在不同宿主环境中构造和使用 Runtime 的方式。
---

Logix 的核心执行单元是 **Runtime**：它负责承载模块的状态、逻辑和长生命周期流程（如 Link、后台 watcher）。本页从“使用者”视角解释 Runtime 是什么、如何构造，以及如何在 React/Node/测试环境中使用它。

> 面向读者：业务工程师、前端架构师、希望在项目中落地和扩展 Logix Runtime 的开发者。

## 1. 什么是 Runtime？

在代码层面，Runtime 主要有两种形态：

- `ManagedRuntime`（来自 `effect`）：一个可以运行 Effect 程序的执行环境，负责创建 Scope、管理资源；
- `Logix.Runtime`（来自 `@logixjs/core`）：在 `ManagedRuntime` 之上包了一层，用 Root 模块（或 Root `ModuleImpl`）+ Layer 组合出一颗应用级运行树。

最常见的模式是：

```ts
import * as Logix from "@logixjs/core"
import { Effect, Layer } from "effect"

const RootDef = Logix.Module.make("Root", { state: RootState, actions: RootActions })

// 示例：Root Logic 依赖一个外部 Service
class UserService extends Effect.Service<UserService>()("UserService", {
  effect: Effect.succeed({
    loadUser: (id: string) => Effect.succeed({ id, name: "Demo" }),
  }),
}) {}

const RootLogic = RootDef.logic<UserService>(($) =>
  Effect.gen(function* () {
    const svc = yield* $.use(UserService)
    // ...
  }),
)

const RootModule = RootDef.implement<UserService>({
  initial: { /* ... */ },
  logics: [RootLogic],
  imports: [/* 子模块 module.impl / Service Layer */],
  processes: [/* 长生命周期流程（Process，例如 Process.link(...)） */],
})
const RootImpl = RootModule.impl

// 应用级 Runtime：承载 Root + 子模块 + 长驻流程
// 通过 Layer.mergeAll(...) 显式闭合 RootImpl.layer 的 Env（R），最终交给 Runtime.make。
export const AppRuntime = Logix.Runtime.make(RootImpl, {
  layer: Layer.mergeAll(
    Layer.provide(UserService.Live, AppInfraLayer), // 提供 RootLogic 所需的 UserService
    ReactPlatformLayer,                             // React 平台相关信号
  ),
})
```

此时：

- `RootImpl` 描述了“应用有哪些模块、初始状态是什么、有哪些长驻流程（Process，例如 Process.link）”；
- `AppRuntime` 是一个可运行的 Runtime 实例，可以在 React / Node / 测试环境中通过 `run*` 方法执行 Effect。

## 2. 在 React 中挂载 Runtime：RuntimeProvider

在 React 中，我们使用 `@logixjs/react` 提供的 `RuntimeProvider` 把 Runtime 挂到组件树上：

```tsx
import { RuntimeProvider } from "@logixjs/react"
import { AppRuntime } from "./runtime"
import { Router } from "./Router"

export function App() {
  return (
    <RuntimeProvider runtime={AppRuntime}>
      <Router />
    </RuntimeProvider>
  )
}
```

在这个例子里：

- `RuntimeProvider runtime={AppRuntime}` 会：
  - 通过 React Context 把 Runtime 传递给子树中的 Hook（`useModule` / `useSelector` / `useDispatch` 等）；
  - 当你使用 `RuntimeProvider.layer` 时，为每个 `layer` 创建一个 Scope，并在 Provider 卸载/变更时关闭它，避免资源泄漏；
- 子组件只需要关心“用哪个 Module”，不需要自己 new Runtime 或管理释放时机。

如果你的项目已经在别处创建了 `ManagedRuntime`，也可以直接把它传给 `RuntimeProvider`，效果类似。

> 注意：`RuntimeProvider` 不会自动调用 `runtime.dispose()`（runtime 可能被多处共享）。如果你的宿主需要“卸载即释放”（微前端/多次 mount/unmount/测试），请在“创建 runtime 的宿主边界”显式调用 `runtime.dispose()`；在 Node/CLI 场景里推荐直接使用 `Runtime.runProgram/openProgram`，它会在结束时关闭 Scope 并执行 finalizer。

例如（微前端 / 需要显式卸载的宿主）：由同一个边界负责创建与释放 runtime。

```tsx
export function mount(el: HTMLElement) {
  const runtime = makeRuntime()
  const root = createRoot(el)
  root.render(<RuntimeProvider runtime={runtime}><App /></RuntimeProvider>)
  return () => { root.unmount(); void runtime.dispose() }
}
```

> 当某个模块通过 `imports` 组合了子模块（例如 Host imports 了一个 Query），组件侧若要在“父实例 scope”下读取/派发该子模块，使用 `useImportedModule(parent, childModule)` 或 `parent.imports.get(childModule)`：
>
> - API：[`useImportedModule`](../react/use-imported-module)
> - Guide：[`在 React 中使用 Logix`](../../guide/recipes/react-integration)

## 3. 局部增强：RuntimeProvider.layer

有时你希望在某个子树下增加一点“局部配置”或 Service，而不影响全局 Runtime。可以使用 `RuntimeProvider` 的 `layer` 属性：

```tsx
import { RuntimeProvider } from "@logixjs/react"
import { Layer, Context } from "effect"

// 一个简单的 Service 示例
interface StepConfigService {
  readonly step: number
}

class StepConfig extends Context.Tag("StepConfig")<StepConfig, StepConfigService>() {}

// 根节点：step = 1
const BaseStepLayer = Layer.succeed(StepConfig, { step: 1 })
// 某个子树：step = 5（覆盖根配置）
const BigStepLayer = Layer.succeed(StepConfig, { step: 5 })

export function Page() {
  return (
    <RuntimeProvider runtime={AppRuntime} layer={BaseStepLayer}>
      {/* 这里的子树默认看到 step = 1 */}
      <Section label="根区域 · step=1" />

      {/* 在某个子树下叠加另一层 Env，并覆盖同名 Service */}
      <RuntimeProvider layer={BigStepLayer}>
        <Section label="局部区域 · step=5" />
      </RuntimeProvider>
    </RuntimeProvider>
  )
}
```

语义总结：

- `runtime`：
  - 如果内层 Provider 也传入了 `runtime`，则**完全切换到新的 Runtime**，不再继承外层；
  - 如果内层没有传 `runtime`，则继承最近一层 Provider 的 Runtime（形成“分形 Runtime Tree”）。
- `layer`：
  - 在同一条 Runtime 链上，多个 Provider 的 `layer` 会叠加；
  - 当多个 `layer` 提供了同一个 Service Tag 时，**内层 Provider 的 `layer` 会覆盖外层的值**，适合做“几乎一样但略有差异”的局部配置（如不同步长、不同主题、不同 Feature Flag）。

内部实现上，`RuntimeProvider` 会为每个 `layer` 创建一个 Scope，并在组件卸载时关闭它，避免资源泄漏。

如果你需要“固定读取当前 Runtime Tree 的根（root provider）”提供的单例（例如全局模块/服务），使用 `Logix.Root.resolve(Tag)`：

```ts
import * as Logix from "@logixjs/core"
import { useRuntime } from "@logixjs/react"

const runtime = useRuntime()
const auth = runtime.runSync(Logix.Root.resolve(GlobalAuth.tag))
```

在 Logic 内，如果你希望显式读取 root provider 单例，使用 `yield* $.root.resolve(Tag)`：

```ts
import * as Logix from "@logixjs/core"
import { Effect } from "effect"

const MyLogic = MyModule.logic(($) =>
  Effect.gen(function* () {
    const auth = yield* $.root.resolve(GlobalAuth.tag)
    // ...
  }),
)
```

两者语义一致：都会忽略局部 `RuntimeProvider.layer` 的覆盖；区别是 `$.root.resolve` 是 Bound API 语法糖，方便在 Logic 中使用。

## 4. Runtime 与 Module / ModuleImpl / Process 的关系

可以把 Runtime 理解为“运行一组模块和流程的容器”，而模块对象（Module）/ ModuleImpl / Process 是这个容器里的内容：

- **Module（模块对象 / program module）**：
  - 先用 `const RootDef = Logix.Module.make("Root", { state, actions })` 定义模块，再通过 `RootDef.implement({ initial, logics, imports, processes })` 得到 `RootModule`；
  - 可直接交给 `Logix.Runtime.make(...)` 或 React `useModule(...)` 消费（内部会使用其 `.impl` 蓝图）。
- **ModuleImpl（蓝图）**：
  - 模块对象的底层蓝图（`module.impl`），包含 `layer` / imports / processes 等装配信息；
  - 主要用于更底层的装配/组合场景（例如 `imports: [Child.impl]`）。
- **Process（长生命周期流程）**：
  - 使用 `Logix.Process.make({ ... }, effect)` 定义一个长驻流程；或使用 `Logix.Process.link({ modules: [...] }, ($) => Effect)` 定义跨模块协作流程；
  - Process 通过触发源（moduleAction/moduleStateChange/platformEvent/timer）+ 并发策略 + 错误策略来驱动长期行为；
  - 通常会作为 Root 或某个 ModuleImpl 的 `processes` 成员被挂入 Runtime，由 Runtime 在启动时统一安装与监督；在 React 中也可用 `useProcesses(...)` 把 Process 安装到某个 UI 子树作用域内。

Runtime 的职责，就是把这些模块与流程组合成一棵可运行的树，并提供统一的执行入口。

## 5. 我该怎么选用这些能力？

可以按下面的经验规则来选：

- **小型场景 / 局部状态**：
  - 直接在组件中使用 `useLocalModule` 或 `useModule(Impl)`，不必显式创建 Runtime。
- **页面级 / 应用级状态**：
  - 使用 Root Module + `Logix.Runtime.make` 构造一个 Runtime；
  - 在 React 根或路由级别用 `RuntimeProvider runtime={...}` 包裹；
  - 在组件里只使用 `useModule` / `useSelector` / `useDispatch`。
- **需要局部差异配置的场景**（例如不同区域不同步长、不同主题、实验开关）：
  - 仍然复用同一 Runtime；
  - 在需要的子树下使用嵌套的 `RuntimeProvider layer={...}` 提供局部 Env，让内层覆盖外层。

如果你想看完整例子，可以打开仓库中的 `examples/logix-react` 项目，其中包含：

- 基于 `Logix.Runtime.make` 的全局 Runtime；
- 使用 `RuntimeProvider.layer` 做局部 Env 差异化的示例；
- 使用 `Process.link`（或等价的 Link 入口）做多模块协作的 React 集成示例。

## 6. 异步 Layer 与延迟

最后补充一点：`RuntimeProvider.layer` 支持异步 Layer，这会把 **Layer 初始化的真实耗时** 体现到界面行为中。

在实现上：

- 当 `layer` 存在时，`RuntimeProvider` 会异步执行 `Layer.buildWithScope(layer, scope)` 构建 Context；
- 在 Layer 构建完成前，只渲染 `fallback`（默认为 `null`），不会让子组件在 Env 尚未就绪时先运行；
- 构建成功后，新的 Context 会覆盖到当前子树，旧的 Scope 会被安全关闭。

这带来的影响与推荐用法：

- 如果 `layer` 内做了重 I/O 初始化（例如远程配置、数据库连接），那么对应子树的首屏/切换会被这段初始化时间拉长，这是对成本的“真实暴露”，不是额外开销；
- 建议将「慢初始化」的 Layer 放在 **Runtime 启动阶段** 完成（例如在调用 `Logix.Runtime.make` 时合并进去），React 里的 `RuntimeProvider.layer` 更适合作「轻量、纯内存」的局部差异化配置（如步长、主题、实验开关）；
- 当频繁切换 `layer` 时，每次都会触发一次新的 Layer 构建，旧 Layer 会在新 Layer 就绪后关闭，期间不会出现“半构建状态”的 Env，但仍需关注初始化成本是否可接受。

简单记忆：**重依赖放 Runtime，轻配置放 RuntimeProvider.layer**，这样既能用好异步 Layer 的能力，也不会给用户造成不必要的延迟感知。

## 7. 在 Node/脚本里一键运行程序：`Runtime.runProgram` / `Runtime.openProgram`

在脚本、demo 或命令行工具里，你通常希望用“一个入口”完成：

- 启动 Root 模块（包括其 `imports` / `processes` / `logics`）；
- 执行主流程；
- 主流程结束后释放资源（关闭 Scope / 执行 finalizer）。

这类场景推荐使用 `@logixjs/core` 的 program runner：

- `Runtime.runProgram(root, main, options?)`：一次性入口（启动 → main → 释放）
- `Runtime.openProgram(root, options?)`：资源化入口（返回 `ctx`，适合交互式脚本/多段运行）

### 7.1 `runProgram`：一次性入口（显式退出策略）

Runner **不会自动推断“何时退出”**：很多模块逻辑会注册长期监听（watchers / subscriptions / Link），它们不会自然结束。你需要在 `main` 中显式表达退出条件（例如：等待某个状态达成、等待某个信号、或由 Ctrl+C 触发关闭）。

```ts
import * as Logix from "@logixjs/core"
import { Effect, Stream } from "effect"
import { AppRoot } from "./app-root"

await Logix.Runtime.runProgram(AppRoot, ({ $ }) =>
  Effect.gen(function* () {
    const counter = yield* $.use(CounterModule)
    yield* counter.dispatch({ _tag: "inc", payload: undefined })

    // 显式退出条件：等到 value >= 1 就结束主流程
    yield* counter
      .changes((s) => s.value)
      .pipe(Stream.filter((n) => n >= 1), Stream.take(1), Stream.runDrain)
  }),
)
```

### 7.2 `openProgram`：资源化入口（复用同一棵 Runtime）

当你需要在同一棵 Runtime 上分段执行多个任务时，使用 `openProgram`：

- `openProgram` 返回的 `ctx` 已完成启动，可立即交互；
- 关闭 `ctx.scope` 会触发资源释放（适用于交互式脚本、平台 Runner 等）。

> 小提示：在 Node/CLI 场景里，`runProgram/openProgram` 默认会处理 SIGINT/SIGTERM，触发关闭 `ctx.scope` 以便优雅释放；如不需要可通过 `handleSignals: false` 关闭。
