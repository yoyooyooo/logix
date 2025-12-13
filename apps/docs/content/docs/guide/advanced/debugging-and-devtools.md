---
title: 调试与 DevTools
description: 使用 Logix 的调试事件管道和 DevTools 面板观察模块行为。
---

# 调试与 DevTools

Logix 在运行时会为「模块生命周期、Action 派发、状态更新、逻辑错误」产生结构化的调试事件。
这些事件可以：

- 通过 DevTools 面板，渲染成时间线、模块视图等 UI；
- 通过 Debug layer 写入控制台或日志/监控系统。

本文先帮你建立一个简单心智模型，再分别介绍 Debug layer 和运行时中间件总线。

### 适合谁

- 需要在开发/测试环境里“看见” Logix Runtime 内部发生了什么（哪些 Action/State 变化、哪些模块在运行）；
- 计划接入团队现有的日志/监控系统，或为后续 DevTools 留好接入点的架构师/中高级工程师。

### 前置知识

- 熟悉 `Logix.Runtime.make`、Layer 的基本用法；
- 了解 Module / Logic 的基本概念。

### 读完你将获得

- 能够在项目中启用/关闭基础调试输出；
- 知道如何把 Debug 事件流接到自己的日志/监控系统；
- 为 DevTools/可视化工具预留干净的接入点。

### 先说结论：什么时候用什么？

可以先记住这两个场景：

- **前端开发 + DevTools 调试**（大部分日常开发场景）  
  - 在 React 应用里挂上 `<LogixDevtools />`（见 DevTools 文档）；  
  - 在 Runtime 上配置 `devtools: true`，一键启用 DevTools 所需的观测能力（Hub + `trace:effectop` + `trace:react-render`）；  
  - 在这种场景下，**可以不直接碰 `Debug.layer`**，主要通过 DevTools 面板看行为。

- **日志/监控/非浏览器环境（Node 脚本、测试、后端服务）**  
  - 使用 `Logix.Debug.layer` / `Logix.Debug.replace` 控制 Debug 事件要不要启用、输出到哪里；  
  - 适合把运行轨迹接入团队现有的日志/监控平台，或者在没有 DevTools 的环境里观察引擎行为。

后面的章节会细分这两条通道：

- 第 1～3 节：以日志/监控视角介绍 Debug layer；  
- 第 4 节：介绍 EffectOp 运行时中间件总线以及 `Middleware.withDebug` 的用法；  
- 配合 DevTools 文档，可以拼出“DevTools + Debug layer + Middleware”的完整组合方式。

## 1. 开启基础调试输出（Console）

在默认情况下，Logix 不会主动往控制台打印调试信息。
要在开发/测试环境中查看运行轨迹，可以在构建 Runtime 时加入内置的 `Debug.layer`：

```ts
import * as Logix from '@logix/core'
import { Layer } from 'effect'

// RootImpl 为你的 Root ModuleImpl
const runtime = Logix.Runtime.make(RootImpl, {
  layer: Layer.mergeAll(
    AppInfraLayer,          // 你的应用基础设施（HTTP、Config 等）
    Logix.Debug.layer(),    // 根据 NODE_ENV 自动选择 dev / prod 调试组合
  ),
})
```

- 在这种配置下，Logix 至少会通过 Effect 的日志系统输出 lifecycle 错误与关键诊断事件，避免致命错误被静默吞掉。
- 在非生产环境下（`NODE_ENV !== 'production'`），`Debug.layer()` 默认会启用适合本地开发的调试组合（含彩色日志与诊断输出）；在生产环境下，则退化为“错误优先”的精简模式。

> 提示：
> - 如果你想显式控制模式，可以使用 `Logix.Debug.layer({ mode: 'dev' | 'prod' | 'off' })`；
> - 如果你已经在其他地方替换了 Effect 的 logger（例如使用自定义 structured logger），`Debug.layer()` 仍然只负责调试事件的处理，不会强行覆盖你的 logger 配置。

## 2. Debug 事件模型（概览）

调试事件是一个统一的结构化流，核心类型可以理解为：

- `module:init` / `module:destroy`：模块实例创建与销毁；
- `action:dispatch`：某个模块收到了一次 Action；
- `state:update`：模块状态发生了变化；
- `lifecycle:error`：模块逻辑在执行过程中出现错误（包括 fail / die）；
- `diagnostic`：运行时给出的结构化提示（例如 reducer 注册时序错误、缺少 `$.lifecycle.onError` 等）。

你的自定义调试层会收到形如：

```ts
type Event =
  | { type: 'module:init'; moduleId?: string }
  | { type: 'module:destroy'; moduleId?: string }
  | { type: 'action:dispatch'; moduleId?: string; action: unknown }
  | { type: 'state:update'; moduleId?: string; state: unknown }
  | { type: 'lifecycle:error'; moduleId?: string; cause: unknown }
  | {
      type: 'diagnostic'
      moduleId?: string
      code: string // 例如 "reducer::late_registration"
      severity: 'error' | 'warning' | 'info'
      message: string // 人类可读的错误/提示信息
      hint?: string // 建议的修复方式
      actionTag?: string // 如与某个 Action Tag 相关
    }
```

然后决定如何处理这些事件（打印、上报、存储等）。

### 2.1 Debug vs Effect.Logger：两条互补的通道

在实际项目里，通常会同时存在两条“与日志相关”的通道：

- **Effect.Logger 通道**  
  - 入口：`Effect.log / Effect.logInfo / Effect.logError / Effect.annotateLogs / Effect.withLogSpan`；  
  - 控制方式：通过 `Logger.replace / Logger.add`，或者本章提供的 `Logix.Debug.withPrettyLogger` 等 Layer 调整输出样式（logfmt / pretty / JSON / 远端收集等）；  
  - 典型用途：业务 Flow / Service 自己打出来的日志，例如 Logic 里的  
    `yield* Effect.log('AppCounterLogic setup')`。

- **DebugSink 事件通道**  
  - 入口：Logix Runtime 内部在模块初始化 / Action 派发 / 状态更新 / 诊断时调用 `Logix.Debug.record(event)`；  
  - 控制方式：通过 `Logix.Debug.layer` / `Logix.Debug.replace` 提供或替换 `Debug.Sink` 实现；  
  - 典型用途：模块生命周期、Action/State 变化、phase guard / Reducer 冲突等运行时诊断。

这两条通道是互补而独立的：

- 一个 `Logix.Debug.replace(CustomDebugLayer)` 只会影响 Debug 事件（`record(event)`），不会拦截你在 Logic 中写的 `Effect.log(...)`；  
- 反过来，替换 Logger（例如使用 `Logix.Debug.withPrettyLogger` 或自定义 Logger Layer）只会改变 Effect 日志的输出样式，不会改变 Debug 事件本身的结构和派发。

实务上可以用一句心智模型来记：

- “我想看业务日志” → 关注 `Effect.log*` + Logger（配合 `logix.moduleId` 等注解）；  
- “我想看 Logix 引擎内部在干什么” → 关注 Debug 事件（`Logix.Debug.layer` 或自定义 Sink）。

## 3. 自定义调试层（接入日志 / 监控）

如果你希望将调试事件发送到自定义日志系统或监控平台，可以通过 `Logix.Debug.replace` 或直接操作 FiberRef 来提供自己的 Sink 集合。

### 3.1 基于 Layer 的自定义 DebugLayer

```ts
import * as Logix from '@logix/core'
import { Effect, Layer } from 'effect'

const CustomDebugLayer = Logix.Debug.replace([
  {
    record: (event: Logix.Debug.Event) =>
      Effect.sync(() => {
        // 这里可以接入你的日志/监控系统
        myLogger.debug({
          type: event.type,
          moduleId: 'moduleId' in event ? event.moduleId : undefined,
          payload: event,
        })
      }),
  },
])

const runtime = Logix.Runtime.make(RootImpl, {
  layer: Layer.mergeAll(
    AppInfraLayer,
    CustomDebugLayer, // 完全由自定义 sinks 接管调试事件
  ),
})
```

### 3.2 常见用法建议

- 本地开发：使用 `Logix.Debug.layer({ mode: 'dev' })` 获得彩色日志与基础诊断；
- 测试环境：结合自定义 DebugLayer，将事件写入内存 / 文件，配合测试断言；
- 生产环境：使用 `Logix.Debug.layer({ mode: 'prod' })` 保留关键错误与诊断，并按需采样或筛选后上报到日志/监控平台；
- 完全静音 DebugSink（仅保留普通日志）：在极少数基准测试 / 特殊测试场景，可以使用 `Logix.Debug.noopLayer` 显式关闭 Debug 事件：

```ts
const runtime = Logix.Runtime.make(RootImpl, {
  layer: Layer.mergeAll(
    AppInfraLayer,
    Logix.Debug.noopLayer, // 覆盖默认兜底行为，完全关闭 Debug 事件输出
  ),
})
```

## 4. 运行时中间件总线（EffectOp）

前面的内容都在讲 DebugSink 这条“调试事件管道”。在 v3 的实现里，Logix 还提供了一条更底层的 **运行时中间件总线**，基于 EffectOp 模型统一承载 Action / State / Service 等边界事件。

- EffectOp 可以理解为“带元信息的 Effect 包裹”：
  - `kind`：事件类型（如 `"action"` / `"state"` / `"service"` 等）；
  - `name`：逻辑名称（Action tag、资源 ID 等）；
  - `meta`：模块 ID、字段路径、链路 ID（linkId）等结构化信息；
  - `effect`：真正要执行的 Effect 程序。
- Runtime 在执行这些边界事件前，会先把它们包装成 EffectOp，并交给一条 `MiddlewareStack`（运行时中间件链）统一处理。

在应用入口处，你可以通过 `Runtime.make(..., { middleware })` 配置这条总线，并使用 `@logix/core/middleware` 提供的预设函数快速挂载调试能力：

```ts
import * as Logix from '@logix/core'
import * as Middleware from '@logix/core/middleware'
import { Effect, Layer } from 'effect'

const timingMiddleware: Middleware.Middleware = (op) =>
  Effect.gen(function* () {
    const start = Date.now()
    const result = yield* op.effect
    const duration = Date.now() - start
    console.log('[Timing]', op.kind, op.name, `${duration}ms`)
    return result
  })

// 基于已有通用中间件 stack，一次性追加 DebugLogger + DebugObserver 预设。
const stack: Middleware.MiddlewareStack = Middleware.withDebug(
  [timingMiddleware],
  {
    logger: (op) => {
      console.log('[EffectOp]', op.kind, op.name)
    },
    // 可选：通过 observer 配置过滤规则，未显式设置时使用默认行为。
    observer: {},
  },
)

const runtime = Logix.Runtime.make(RootImpl, {
  layer: AppInfraLayer,
  middleware: stack,
})
```

这里有几个实践建议：

  - **通用中间件**：像上面的 `timingMiddleware` 一样，你可以实现用于日志、监控、限流、熔断、审计等的通用中间件——它们只关心 `EffectOp` 和 `op.effect`，不会直接操作 DebugSink。
  - **调试中间件**：
    - 推荐使用 `Middleware.withDebug(stack, options?)`，在现有 stack 上一次性追加 DebugLogger（日志）与 DebugObserver（`trace:effectop`）；
    - 只有在需要精细控制顺序或选择性启用 logger/observer 时，再使用 `Middleware.applyDebug` / `Middleware.applyDebugObserver` 直接操作 stack。
- **组合方式**：推荐把所有运行时中间件统一挂在 `Runtime.make(..., { middleware })` 这一层，由应用来决定“什么时候启用哪些中间件组合”（例如只在开发环境挂载调试中间件）。
- **事件串联（linkId）**：DevTools 会利用 EffectOp.meta.linkId 自动把同一条操作链路上的多个事件（比如一次 dispatch 引发的 action/state/trait/service 事件）串在一起展示，便于从时间轴上重构完整故事。

### 4.1 Guard：如何显式拒绝某次操作

当你需要做鉴权/风控/配额等“能不能跑”的决策时，可以在 Middleware 中实现 Guard，并在拒绝时返回一个标准化的 `OperationRejected` 失败：

```ts
import { Effect, Layer } from 'effect'
import * as Logix from '@logix/core'
import * as Middleware from '@logix/core/middleware'
import * as EffectOp from '@logix/core/effectop'

const guard: Middleware.Middleware = (op) => {
  if (op.kind === 'action' && op.name === 'action:dispatch') {
    return Effect.fail(
      EffectOp.makeOperationRejected({
        message: 'blocked by guard',
        kind: op.kind,
        name: op.name,
        linkId: op.meta?.linkId,
      }),
    )
  }
  return op.effect
}

const runtime = Logix.Runtime.make(RootImpl, {
  layer: Layer.mergeAll(AppInfraLayer, Logix.Debug.layer()),
  middleware: Middleware.withDebug([guard]),
})
```

## 5. DevTools 集成：推荐组合

Logix 已经提供了官方 DevTools（通过 `@logix/devtools-react` 等包集成），它会复用本文介绍的同一条 Debug 事件管道，并在浏览器里渲染：

- 时间轴（Timeline）：按时间顺序浏览 Action / State / EffectOp 事件；
- 模块视图：查看当前有哪些模块实例在运行、各自的状态；
- 错误追踪：快速定位 `lifecycle:error` 对应的模块与上下文。

对于大多数「前端 + React」项目，可以按下面的组合来使用：

1. **在 React 根节点挂上 DevTools 组件**

   ```tsx
   import { LogixDevtools } from '@logix/devtools-react'

   export function App() {
     return (
       <>
         <YourAppRoutes />
         <LogixDevtools position="bottom-left" />
       </>
     )
   }
   ```

2. **在 Runtime 上一键启用 DevTools**

   ```ts
   import * as Logix from '@logix/core'

   const runtime = Logix.Runtime.make(RootImpl, {
     label: 'AppRuntime',
     devtools: true,
   })
   ```

   - `devtools: true` 会自动打开 DevTools 观测所需的能力（事件聚合、EffectOp 观测、React 渲染事件等），你不需要再手动拼装 `Middleware.withDebug(...)`。
   - 如果你已经有自己的运行时中间件（例如 timing/metrics），仍然可以继续通过 `middleware` 传入；DevTools 相关能力会在此基础上自动接线。

   > 环境提示：
   > - 默认情况下，许多调试/观测会按运行环境做精简；
   > - 但当你显式传入 `devtools: true` 时，Logix 会将其视为“明确启用 DevTools”的信号：即使在生产环境也会启用对应观测。
   > - 是否在生产环境开启由你自行决定；建议仅在排障场景短期开启，并评估事件量与潜在开销。

3. **是否还需要 `Debug.layer`？**

   - 纯前端开发场景：  
     - 有 DevTools + `withDebug` 的情况下，**可以不强制启用 `Debug.layer({ mode: 'dev' })`**；  
     - DevTools 已经可以满足绝大部分「看行为」的需求。
   - 日志 / 监控 / 非浏览器环境（Node 脚本、测试、后端服务）：  
     - **推荐继续使用 `Logix.Debug.layer` / `Logix.Debug.replace`** 将 Debug 事件接入日志/监控系统；  
     - 例如在测试环境写入内存，在生产环境写入集中式日志平台。

在设计新项目时，建议提前预留两个组合点：

- 一个 Runtime 级组合点：`Logix.Runtime.make(..., { middleware })`，统一挂载通用中间件和 `Middleware.withDebug`；
- 一个 Debug 级组合点：在应用根部组合 `Debug.layer` / 自定义 DebugLayer（如有需要），以及 DevTools 相关的桥接 Layer。这样既方便 DevTools 使用，也方便后续接入日志/监控系统。

## 6. 事务边界与逻辑入口（心智模型）

DevTools 的时间线会按“事务”聚合事件：你可以把一次事务理解为“从一个明确入口开始，到状态提交为止的一段连续运行轨迹”。

### 6.1 什么时候会开启一笔新事务？

你可以先记住这条规则：

- **每一个“逻辑入口”都会开启一笔新的事务**，并且一次入口最终只会提交一次状态（对外表现为一次更新与一次订阅通知）。

常见入口包括：

- `dispatch(action)`：任意一次 Action 派发；
- source 刷新：例如你显式触发某个字段的 source refresh；
- 异步回写：例如服务请求完成后的回写更新（成功/失败都算一次入口）；
- DevTools 操作：例如时间旅行、回放等调试操作。

### 6.2 典型例子

1) **简单点击（单事务）**  
点击按钮 → `dispatch(increment)` → 事务 #1：action → state 提交

2) **带 loading 的请求（多事务）**  
点击“加载资料” → `dispatch(load)` → 事务 #1：把 `loading=true` 提交出去  
请求完成 → 回写更新 → 事务 #2：把 `profile`/`error` 等结果提交出去

3) **常见误区：把长链路塞进一个入口里**  
如果你在一次入口内部跨越了较长的异步边界，并在等待后继续更新状态，你会得到“一个被拉长的事务”。  
更推荐的做法是把长链路拆成多个明确入口（例如：一个入口负责开启 loading，另一个入口负责接收结果并回写），这样事务边界更清晰、DevTools 时间线也更好读。

## 下一步

- 学习如何测试你的模块：[测试](./testing)
- 查看 React 集成的完整指南：[React 集成](../recipes/react-integration)
- 了解更多常用模式：[常用模式](../recipes/common-patterns)
