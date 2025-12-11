---
title: 调试与 DevTools
description: 使用 Logix 的调试事件管道观察模块行为，并为未来 DevTools 做好准备。
---

# 调试与 DevTools

Logix 在运行时会为「模块生命周期、Action 派发、状态更新、逻辑错误」产生结构化的调试事件。
通过注入调试层（Debug layer），你可以：

- 在本地开发时快速看到哪些模块在运行、哪些 Action 被触发；
- 将这些事件发送到日志系统 / 监控平台；
- 为未来的 DevTools 面板提供统一的数据来源。

本文介绍如何开启基础调试输出，以及如何自定义调试行为。

### 适合谁

- 需要在开发/测试环境里“看见” Logix Runtime 内部发生了什么（哪些 Action/State 变化、哪些模块在运行）；
- 计划接入团队现有的日志/监控系统，或为后续 DevTools 留好接入点的架构师/中高级工程师。

### 前置知识

- 熟悉 `Logix.Runtime.make`、Layer 的基本用法；
- 了解 Module / Logic 的基本概念。

### 读完你将获得

- 能够在项目中启用/关闭基础调试输出；
- 知道如何把 Debug 事件流接到自己的日志/监控系统；
- 为未来的 DevTools/可视化工具预留干净的接入点。

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

## 4. 为 DevTools 做好准备

后续版本的 Logix 将提供官方 DevTools，用于：

- 时间轴查看：按时间顺序浏览模块的 Action / State 变化；
- 模块视图：查看当前有哪些模块实例在运行、各自的状态；
- 错误追踪：快速定位 `lifecycle:error` 对应的模块与上下文。

这些能力都会复用本文介绍的同一条 Debug 事件管道：

- 如果你已经在应用中启用了 `Logix.Debug.layer()` 或自己的 DebugLayer，后续接入 DevTools 只需要在 Runtime 层额外提供 DevTools 所需的桥接 Layer；
- 如果你暂时不需要 DevTools，也可以只保留简单的 Console / 日志输出，日后再无缝升级。

在设计新项目时，建议提前预留一个「调试层组合点」——也就是在 `Logix.Runtime.make` 或 AppRuntime 构建处统一挂载 Debug 相关 Layer，这样后续接入 DevTools 时就不需要在各个调用点逐一修改。

## 下一步

- 学习如何测试你的模块：[测试](./testing)
- 查看 React 集成的完整指南：[React 集成](../recipes/react-integration)
- 了解更多常用模式：[常用模式](../recipes/common-patterns)
