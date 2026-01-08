---
title: 生命周期与 Watcher 模式
description: 了解模块的启动/销毁、长逻辑 Watcher，以及它们与 React/平台生命周期的配合方式。
---

在 Logix 中，一段业务逻辑不再只是“被调用一次就结束”的函数，而是运行在 **模块生命周期 (Module Lifecycle)** 内的一组长期流程（Watcher）。
这一节从产品开发者的视角，拆解三个层次：

1. 模块本身的生命周期：何时初始化、何时清理；
2. 长逻辑 Watcher：如何挂载、何时自动停止；
3. 平台生命周期：页面前后台、会话保持等场景如何与模块协同。

### 适合谁

- 已经会写 `$.onAction / $.onState`，但不太确定这些 Watcher 何时开始、何时结束；
- 正在把 Logix 接入 React / 多端应用，希望梳理“模块实例 vs 组件 vs 会话”的关系。

### 前置知识

- 已阅读 [Lifecycle](../essentials/lifecycle) 与 [Flows & Effects](../essentials/flows-and-effects)；
- 对 React 的组件挂载/卸载概念有基本了解。

### 读完你将获得

- 清晰理解“模块生命周期”和“平台生命周期”分别负责什么；
- 能在复杂页面中判断某段逻辑应该挂在哪个 Module、以何种 Watcher 形式运行；
- 在做架构设计时，有一套可以用于评审的“生命周期与 Watcher”检查表。

先给出一个快速对照表，帮助你在评审代码时判断“应该用哪一层”：

| 关注点          | 推荐工具                                            | 典型场景                         |
| --------------- | --------------------------------------------------- | -------------------------------- |
| 模块何时存在    | `$.lifecycle.onInit/onDestroy`                      | 页面打开时加载一次配置 / 数据    |
| 长期监听+响应   | `$.onAction/$.onState + .run*` Watcher              | 表单提交、轮询、字段联动         |
| 宿主前后台/重置 | `$.lifecycle.onSuspend/onResume/onReset` + Platform | Tab 前后台切换、Logout、会话重置 |

## 1. 模块生命周期：onInit / onDestroy

每个 Module 实例（ModuleRuntime）都有一条清晰的生命周期：

- 创建时：模块被挂载到某个 Effect Scope 中；
- 运行中：Logic 里的 Flow/Watcher 持续监听 State / Action；
- 销毁时：Scope 关闭，所有相关资源一并被清理。

在 Logic 里，你可以通过 `$.lifecycle` 显式声明“启动/销毁”时机：

```ts
const Profile = Logix.Module.make('Profile', {
  state: Schema.Struct({
    status: Schema.Literal('idle', 'loading', 'ready', 'error'),
    detail: Schema.optional(Schema.Any),
  }),
  actions: {
    reload: Schema.Void,
  },
})

const ProfileLogic = Profile.logic(($) => {
  // onInit：模块第一次启动时加载用户资料（setup-only 注册，Runtime 统一调度执行）
  $.lifecycle.onInit(
    Effect.gen(function* () {
      yield* $.state.mutate((draft) => {
        draft.status = 'loading'
      })
      const detail = yield* UserService.getProfile()
      yield* $.state.mutate((draft) => {
        draft.status = 'ready'
        draft.detail = detail
      })
    }),
  )

  // onDestroy：模块实例销毁前做清理（可选）
  $.lifecycle.onDestroy(Effect.log('[Profile] module destroyed'))

  return Effect.void
})
```

使用要点：

- `onInit` 中的逻辑在模块实例首次启动时执行一次，适合加载配置、初始化缓存等“一次性工作”；
- `onDestroy` 用于释放资源（关闭连接、取消订阅等），不适合做业务写入（因为此时模块即将消失）；
- 具体何时“启动/销毁”，由 Runtime 决定：
  - 全局 Module（通过应用级 Runtime 提供）通常在应用启动/关闭时对应一次生命周期；
  - 局部 ModuleImpl（例如通过 `useModule(Impl)` 创建）通常在组件挂载/卸载之间对应一次生命周期。

> 提示：在 React 18 严格模式下，开发环境会有额外的挂载/卸载重试；Logix 在运行时层已经对 Scope 做了防抖和幂等处理，你只需要保证 `onInit` 内的逻辑对“重复调用”是安全的（比如不写入外部不可逆系统）。

## 2. Watcher：长逻辑的运行方式

大多数业务逻辑属于“持续监听并响应事件”的长流程，例如：

- 监听某个 Action 流，处理表单提交；
- 监听状态变化，触发接口调用或级联更新；
- 循环轮询某个服务状态。

在 Logix 中，这类逻辑通常写成 **Watcher**，背后是 `$.onAction/$.onState` + `$.flow.run/runFork` 等组合。
在 `examples/logix-react` 中，你可以看到两种常见 Watcher 模式：

```ts
// runFork：每条事件以独立 Fiber 方式执行，Watcher 本身作为一个长期挂载的“订阅者”
const CounterRunForkLogic = Counter.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction('inc').runFork(
      $.state.mutate((draft) => {
        draft.value += 1
      }),
    )

    yield* $.onAction('dec').runFork(
      $.state.mutate((draft) => {
        draft.value -= 1
      }),
    )
  }),
)

// Effect.all + run：一次性挂载多条 Watcher，每条用 run 串行处理事件
const CounterAllLogic = Counter.logic(($) =>
  Effect.all(
    [
      $.onAction('inc').run(
        $.state.mutate((draft) => {
          draft.value += 1
        }),
      ),
      $.onAction('dec').run(
        $.state.mutate((draft) => {
          draft.value -= 1
        }),
      ),
    ],
    { concurrency: 'unbounded' },
  ),
)
```

无论选择哪种写法，有两个不变量：

- **挂载位置**：Watcher 只在对应 Module 实例存在期间运行；当 ModuleRuntime 的 Scope 被关闭时，这些 Watcher 会自动中断并清理资源，无需手动 unsubscribe；
- **运行环境**：Watcher 运行在 Module 的 Logic Env 中，可以安全地使用 `$.state`、`$.actions` 和 `$.use` 等能力。

> 对 React 开发者而言，可以把 Watcher 理解成“挂在 Module 上的 useEffect”：
> 区别在于它完全脱离组件树、不会造成 UI re-render，由 Runtime 管理生命周期。

## 3. 平台生命周期：onSuspend / onResume / onReset

除了模块本身的生命周期，很多场景还需要感知“宿主环境”的生命周期，例如：

- 浏览器 Tab 从前台切到后台（页面不可见）；
- App 进入后台/恢复前台；
- 用户登出、清空会话等“软重置”行为。

对于这类需求，你可以在 Logic 中使用平台级生命周期钩子：

```ts
const PollingModule = Logix.Module.make('Polling', {
  state: Schema.Struct({
    lastUpdatedAt: Schema.optional(Schema.Number),
    paused: Schema.Boolean,
  }),
  actions: {
    tick: Schema.Void,
  },
})

const PollingLogic = PollingModule.logic(($) => {
  // 平台挂起/恢复：setup-only 注册（由宿主 Platform 信号触发）
  $.lifecycle.onSuspend(
    $.state.mutate((draft) => {
      draft.paused = true
    }),
  )
  $.lifecycle.onResume(
    $.state.mutate((draft) => {
      draft.paused = false
    }),
  )

  return Effect.gen(function* () {
    // 示例：简单定时触发 tick（实际项目中可通过 Link / 外部定时器驱动）
    yield* $.onAction('tick').run(
      $.state.mutate((draft) => {
        draft.lastUpdatedAt = Date.now()
      }),
    )
  })
})
```

这些钩子的含义是：

- `onSuspend`：宿主环境进入“后台/不可见”时触发（例如 Tab 隐藏、App 切后台）；
- `onResume`：宿主环境重新变为“前台/可见”时触发；
- `onReset`：用于表达业务上的“软重置”，如 Logout / Clear；通常由应用显式触发。

### 3.1 在 React 中启用平台生命周期

要让 `onSuspend/onResume/onReset` 生效，需要在应用的 Runtime 环境中提供一个 Platform 实现。
`@logixjs/react` 提供了一个开箱可用的 Layer：

```ts
import * as Logix from "@logixjs/core"
import { ReactPlatformLayer, RuntimeProvider } from "@logixjs/react"
import { Layer } from "effect"

const RootModule = Logix.Module.make("Root", { state: RootState, actions: RootActions })
const RootImpl = RootModule.make({ initial: { /* ... */ }, logics: [RootLogic] })

const appRuntime = Logix.Runtime.make(RootImpl, {
  layer: Layer.mergeAll(AppInfraLayer, ReactPlatformLayer),
})

export function App() {
  return (
    <RuntimeProvider runtime={appRuntime}>
      {/* 你的路由 / 页面 */}
    </RuntimeProvider>
  )
}
```

`ReactPlatformLayer` 会在 Runtime 环境中提供一个 `Logic.Platform` 服务，使 `$.lifecycle.onSuspend/onResume/onReset` 可以被宿主触发。
具体使用哪些浏览器/应用事件来触发这些钩子，由宿主应用或上层桥接组件决定。

在 `examples/logix-react` 中，`SessionModuleLayout` 演示了一个简化的桥接方式：

- 在 Runtime 中合并 `ReactPlatformLayer`；
- 在一个轻量的 React 组件中监听 `document.visibilitychange`，并在 Tab 前后台切换时，通过 `Logic.Platform` 调用 Platform 实现上的 `emitSuspend/emitResume`；
- 模块内部使用 `$.lifecycle.onSuspend/onResume` 记录日志或切换状态。

> 实际项目中，你可以根据需要选择接 Page Visibility、路由事件或移动端前后台事件，并在统一位置将它们映射到 Platform lifecycle。

## 4. 小结与推荐实践

- 用 `$.lifecycle.onInit/onDestroy` 表达“模块实例”的启动与销毁：加载配置、初始化资源、清理连接等；
- 用 Watcher（`$.onAction/$.onState` + `$.flow.run/runFork`）表达“长期监听并响应事件”的逻辑，它们的生命周期自动绑定到 ModuleRuntime 的 Scope 上；
- 用 `$.lifecycle.onSuspend/onResume/onReset` 表达“宿主环境”层面的生命周期，与宿主通过 Platform 实现（如 `ReactPlatformLayer`）协同处理页面前后台、会话重置等场景；
- 在 React 中：
  - 全局状态 → 应用级 Runtime + Module；
  - 页面/组件级状态 → 局部 ModuleImpl + `useModule(Impl)`；
  - 会话级状态保持 → 在 `useModule(Impl, { key, gcTime })` 中为会话选择合适的 `key` 与保活时间，再配合 Platform lifecycle 处理前后台行为。

结合本章与「逻辑流」「管理状态」等章节，你可以逐步从“组件思维”切换到“模块 + 生命周期 + Watcher”思维，让复杂业务流程在 Logix 中保持可读、可调试、可回放。

## 下一步

- 掌握跨模块通信：[跨模块通信](./cross-module-communication)
- 深入了解运行时架构：[深度解析](./deep-dive)
- 进入高级主题：[Suspense & Async](../advanced/suspense-and-async)
