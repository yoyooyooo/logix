# 调试功能 (Debugging Features)

> **Status**: Draft (v3 Effect-Native)
> **Date**: 2025-11-24
> **Layer**: Tooling Layer

Logix 提供了强大的调试能力，旨在让逻辑执行过程透明化、可视化。核心是基于 **Action Trace + EffectOp Timeline** 的全链路追踪系统。

## 1. DevTools 架构

Logix DevTools 是一个独立的 Chrome 扩展或 React 组件，通过 `DevToolsBridge` 与 Logix 引擎通信。v3.1 起，核心运行时内置基于 **FiberRef 的 DebugSink 管线**，可由任意 Layer 提供实现以消费调试事件（内置 Noop / Error-Only / Console 等多种实现）。

### 1.0 DebugSink 接口（FiberRef 模型）

```ts
export type Event =
  | { readonly type: "module:init"; readonly moduleId?: string }
  | { readonly type: "module:destroy"; readonly moduleId?: string }
  | { readonly type: "action:dispatch"; readonly moduleId?: string; readonly action: unknown }
  | { readonly type: "state:update"; readonly moduleId?: string; readonly state: unknown }
  | { readonly type: "lifecycle:error"; readonly moduleId?: string; readonly cause: unknown }
  | {
      readonly type: "diagnostic"
      readonly moduleId?: string
      readonly code: string
      readonly severity: "error" | "warning" | "info"
      readonly message: string
      readonly hint?: string
      readonly actionTag?: string
      readonly kind?: string
    }
  // trace:* 事件预留给 Runtime Trace / Playground / Alignment Lab 使用
  | {
      readonly type: `trace:${string}`
      readonly moduleId?: string
      readonly data?: unknown
    }

export interface Sink {
  readonly record: (event: Event) => Effect.Effect<void>
}

// internal：唯一“真相”是 FiberRef.currentDebugSinks
export const currentDebugSinks: FiberRef.FiberRef<ReadonlyArray<Sink>>
```

内部提供的默认 Layer（简化版语义）：

```ts
// 显式关闭 DebugSink，用于测试 / 性能场景
export const noopLayer: Layer.Layer<never> // FiberRef.currentDebugSinks = []

// 仅记录 lifecycle:error + 严重诊断（diagnostic: error/warning）
export const errorOnlyLayer: Layer.Layer<never>

// 全量调试层：输出所有 Debug 事件（Node 环境使用 Effect.log*）
export const consoleLayer: Layer.Layer<never>

// 浏览器环境下的彩色 Console 层（基于 console.groupCollapsed）
export const browserConsoleLayer: Layer.Layer<never>
```

Runtime 公共入口（`@logix/core/Debug`）实际暴露：

```ts
export type Event = Internal.Event
export interface Sink extends Internal.Sink {}

export const internal = {
  currentDebugSinks: Internal.currentDebugSinks,
}

export const record: (event: Event) => Effect.Effect<void>

export type DebugMode = "auto" | "dev" | "prod" | "off"

export const layer: (options?: { mode?: DebugMode }) => Layer.Layer<any, never, never>
export const withPrettyLogger: (
  base: Layer.Layer<any, any, any>,
  options?: PrettyLoggerOptions,
) => Layer.Layer<any, any, any>
export const replace: <R, E>(
  sinksLayer: Layer.Layer<ReadonlyArray<Sink>, E, R>,
) => Layer.Layer<any, E, R>
export function traceLayer(
  onTrace?: (event: Event) => Effect.Effect<void>,
): Layer.Layer<any, never, never>
export function traceLayer(
  base: Layer.Layer<any, any, any>,
  onTrace?: (event: Event) => Effect.Effect<void>,
): Layer.Layer<any, never, any>
export const noopLayer: Layer.Layer<any, never, never>
```

业务侧推荐用法：

```ts
import * as Logix from "@logix/core"
import { Logger } from "effect"

// 1) 在 Runtime.make 中按环境挂载 Debug + Logger.pretty：
const runtime = Logix.Runtime.make(RootImpl, {
  layer: Layer.mergeAll(
    AppInfraLayer,
    Logger.pretty as Layer.Layer<any, never, never>,
    Logix.Debug.layer(), // 自动按 NODE_ENV 选择 dev/prod/off
  ),
})

// 2) 自定义 Debug 管道（例如接入公司内日志/监控）：
const CustomDebugLayer = Logix.Debug.replace([
  {
    record: (event) => Effect.sync(() => sendToMyBackend(event)),
  },
])

const runtime2 = Logix.Runtime.make(RootImpl, {
  layer: Layer.mergeAll(
    AppInfraLayer,
    CustomDebugLayer, // 由自定义 sinks 接管调试事件
  ),
})

// 3) 显式关闭 DebugSink（仅保留 Effect.log 之类的普通日志）：
const runtime3 = Logix.Runtime.make(RootImpl, {
  layer: Layer.mergeAll(
    AppInfraLayer,
    Logix.Debug.noopLayer, // 覆盖默认兜底行为，完全静音 Debug 事件
  ),
})
```

引擎默认提供 `noopLayer`、`errorOnlyLayer`、`consoleLayer` 与 `browserConsoleLayer` 作为内部实现，
在公共 API 中通过 `Debug.layer` / `Debug.replace` / `Debug.traceLayer` 等高层函数对业务侧暴露一致的组合入口。

### 1.1.1 与 EffectOp 的对接（trace:effectop 事件）

> 详见 `core/05-runtime-implementation.md#14-effectop-middlewareenv-与统一中间件总线（补充）` 与 `specs/001-module-traits-runtime/references/effectop-and-middleware.md`。

- Runtime 在内部使用 EffectOp 作为 Action / Flow / State / Service / Lifecycle 等边界事件的统一模型；  
- 中间件模块（`@logix/core/middleware`）提供了一个标准的 DebugObserver 实现：  
  - 作为 EffectOp MiddlewareStack 中的一员，观察所有 EffectOp；  
  - 将每条 EffectOp 以 `type = "trace:effectop"` 的事件写入 DebugSink：  
    ```ts
    Debug.record({
      type: "trace:effectop",
      moduleId: op.meta?.moduleId,
      data: op,
    })
    ```  
- DevTools 可以基于 `trace:effectop` 事件直接重建 EffectOp Timeline（包括字段更新与资源调用），并与 StateTraitGraph / IntentRule Graph 结合，呈现更完整的“结构 + 时间线”视图。

### 1.1 通信协议

引擎会广播以下事件：

*   `INIT`: Store 创建。
*   `ACTION`: Action 被派发。
*   `STATE_CHANGE`: State 发生变化。
*   `FLOW_TRIGGER`: Flow 被触发。
*   `EFFECT_START` / `EFFECT_END`: 副作用执行起止。

### 1.2 诊断代码与触发条件（v3 稳定不变量）

- `logic::invalid_phase`（error）：在 setup 段调用 run-only 能力（`$.use / $.onAction* / $.onState* / IntentBuilder.run* / runWithContext` 等）或 builder 顶层执行 IO 时触发；源错误为 `LogicPhaseError(kind/api/phase/moduleId)`。  
- `logic::env_service_not_found`（warning/error，视实现）：Env 未完全就绪时访问 Service 触发，用于提示将 Env 访问移到 run 段；Env 铺满后再次出现则视为硬错误。  
- `reducer::duplicate`（error）：同一 Action tag 注册多个 primary reducer。  
- `reducer::late_registration`（error）：在该 tag 已派发过后才注册 primary reducer。  
- `lifecycle::missing_on_error`（warning）：Module 发生 lifecycle 错误时缺少 `$.lifecycle.onError` 处理器。

## 2. 核心视图

### 2.1 Timeline (时间轴)

展示应用运行的时间线。每个节点代表一个 Action 或 State Change。

### 2.2 State Tree (状态树)

实时展示当前的 State 结构。

### 2.3 Logic Flow (逻辑流)

这是 Logix 特有的视图。它展示了 Action 是如何一步步触发 Flow，进而产生 Effect 的。

## 3. 追踪系统 (Tracing System)

### 3.1 Trace ID

每个外部触发（用户点击、WebSocket 消息）都会生成一个唯一的 `TraceID`。这个 ID 会随着逻辑链路传递。

```text
[Trace: abc-123] User Clicked Button
  -> Dispatch Action: SUBMIT
  -> Trigger Flow: SubmitForm
  -> Effect: Set Loading = true
  -> Effect: Call API
  -> Effect: Dispatch Action: SUBMIT_SUCCESS
    -> Trigger Flow: ShowToast
```

### 3.2 因果图 (Causality Graph)

基于 Trace ID，DevTools 可以构建出“因果图”，清晰地展示“谁触发了谁”。
