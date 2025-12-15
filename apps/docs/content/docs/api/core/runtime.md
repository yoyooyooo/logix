---
title: Runtime 与 ManagedRuntime
description: 介绍 Logix Runtime 的基本概念，以及在不同宿主环境中构造和使用 Runtime 的方式。
---

Logix 的核心执行单元是 **Runtime**：它负责承载模块的状态、逻辑和长生命周期流程（如 Link、后台 watcher）。本页从“使用者”视角解释 Runtime 是什么、如何构造，以及如何在 React/Node/测试环境中使用它。

> 面向读者：业务工程师、前端架构师、希望在项目中落地和扩展 Logix Runtime 的开发者。

## 1. 什么是 Runtime？

在代码层面，Runtime 主要有两种形态：

- `ManagedRuntime`（来自 `effect`）：一个可以运行 Effect 程序的执行环境，负责创建 Scope、管理资源；
- `Logix.Runtime`（来自 `@logix/core`）：在 `ManagedRuntime` 之上包了一层，用 Root ModuleImpl + Layer 组合出一颗应用级运行树。

最常见的模式是：

```ts
import * as Logix from "@logix/core"
import { Effect, Layer } from "effect"

const RootModule = Logix.Module.make("Root", { state: RootState, actions: RootActions })

// 示例：Root Logic 依赖一个外部 Service
class UserService extends Effect.Service<UserService>()("UserService", {
  effect: Effect.succeed({
    loadUser: (id: string) => Effect.succeed({ id, name: "Demo" }),
  }),
}) {}

const RootLogic = RootModule.logic<UserService>(($) =>
  Effect.gen(function* () {
    const svc = yield* $.use(UserService)
    // ...
  }),
)

const RootImpl = RootModule.implement<UserService>({
  initial: { /* ... */ },
  logics: [RootLogic],
  imports: [/* 子模块 ModuleImpl / Service Layer */],
  processes: [/* 长生命周期流程（含 Link.make(...)） */],
})

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

- `RootImpl` 描述了“应用有哪些模块、初始状态是什么、有哪些长驻流程（包括 Link.make）”；
- `AppRuntime` 是一个可运行的 Runtime 实例，可以在 React / Node / 测试环境中通过 `run*` 方法执行 Effect。

## 2. 在 React 中挂载 Runtime：RuntimeProvider

在 React 中，我们使用 `@logix/react` 提供的 `RuntimeProvider` 把 Runtime 挂到组件树上：

```tsx
import { RuntimeProvider } from "@logix/react"
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
  - 持有 `AppRuntime` 的 Scope，并在 React 应用卸载时清理资源；
  - 通过 React Context 把 Runtime 传递给子树中的 Hook（`useModule` / `useSelector` / `useDispatch` 等）；
- 子组件只需要关心“用哪个 Module”，不需要自己 new Runtime 或管理释放时机。

如果你的项目已经在别处创建了 `ManagedRuntime`，也可以直接把它传给 `RuntimeProvider`，效果类似。

> 当某个模块通过 `imports` 组合了子模块（例如 Host imports 了一个 Query），组件侧若要在“父实例 scope”下读取/派发该子模块，使用 `useImportedModule(parent, childModule)` 或 `parent.imports.get(childModule)`：
> - API：[`useImportedModule`](../react/use-imported-module)
> - Guide：[`在 React 中使用 Logix`](../../guide/recipes/react-integration)

## 3. 局部增强：RuntimeProvider.layer

有时你希望在某个子树下增加一点“局部配置”或 Service，而不影响全局 Runtime。可以使用 `RuntimeProvider` 的 `layer` 属性：

```tsx
import { RuntimeProvider } from "@logix/react"
import { Layer, Context } from "effect"

// 一个简单的 Service 示例
interface StepConfig {
  readonly step: number
}

const StepConfigTag = Context.GenericTag<StepConfig>("@examples/StepConfig")

// 根节点：step = 1
const BaseStepLayer = Layer.succeed(StepConfigTag, { step: 1 })
// 某个子树：step = 5（覆盖根配置）
const BigStepLayer = Layer.succeed(StepConfigTag, { step: 5 })

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
import * as Logix from "@logix/core"
import { useRuntime } from "@logix/react"

const runtime = useRuntime()
const auth = runtime.runSync(Logix.Root.resolve(GlobalAuth.module))
```

## 4. Runtime 与 ModuleImpl / Link 的关系

可以把 Runtime 理解为“运行一组模块和流程的容器”，而 ModuleImpl / Link 是这个容器里的内容：

- **ModuleImpl**：
  - 先用 `const RootModule = Logix.Module.make("Root", { state, actions })` 定义模块，再通过 `RootModule.implement({ initial, logics, imports, processes })` 得到；
  - 描述某个模块在特定 Env 下如何挂载（State 结构、逻辑函数、依赖的 Service 等）。
- **Link（Link.make）**：
  - 使用 `Link.make({ modules: [...], id? }, ($) => Effect)` 定义；
  - 负责跨模块编排（例如监听一个模块的 actions$，驱动另一个模块的 actions / state 更新）；
  - 通常会作为 Root 或某个 ModuleImpl 的 `processes` 成员被挂入 Runtime，由 Runtime 在应用启动时统一 fork。

Runtime 的职责，就是把这些 ModuleImpl + Link 组合成一棵可运行的树，并提供统一的执行入口。

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
- 使用 `Link.make` 做多模块协作的 React 集成示例。

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
