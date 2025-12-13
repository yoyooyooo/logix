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
  | {
      readonly type: "module:init"
      readonly moduleId?: string
      readonly runtimeId?: string
      readonly runtimeLabel?: string
    }
  | {
      readonly type: "module:destroy"
      readonly moduleId?: string
      readonly runtimeId?: string
      readonly runtimeLabel?: string
    }
  | {
      readonly type: "action:dispatch"
      readonly moduleId?: string
      readonly action: unknown
      readonly runtimeId?: string
      readonly txnId?: string
      readonly runtimeLabel?: string
    }
  | {
      readonly type: "state:update"
      readonly moduleId?: string
      readonly state: unknown
      readonly runtimeId?: string
      readonly txnId?: string
      /**
       * 可选：本次提交聚合的 Patch 数量（来自 StateTransaction）；
       * - 仅在事务路径下由 Runtime 填充；
       * - Devtools 可用作事务概要信息的轻量指标。
       */
      readonly patchCount?: number
      /**
       * 可选：触发本次状态提交的事务来源种类（origin.kind）：
       * - 例如 "action" / "source-refresh" / "service-callback" / "devtools"；
       * - 仅在基于 StateTransaction 的路径下由 Runtime 填充；
       * - Devtools 可据此区分业务事务与 Devtools time-travel 操作。
       */
      readonly originKind?: string
      readonly runtimeLabel?: string
    }
  | {
      readonly type: "lifecycle:error"
      readonly moduleId?: string
      readonly cause: unknown
      readonly runtimeId?: string
      readonly runtimeLabel?: string
    }
  | {
      readonly type: "diagnostic"
      readonly moduleId?: string
      readonly code: string
      readonly severity: "error" | "warning" | "info"
      readonly message: string
      readonly hint?: string
      readonly actionTag?: string
      readonly kind?: string
      readonly runtimeId?: string
      readonly runtimeLabel?: string
    }
  /**
   * trace:* 事件：
   * - 作为运行时 trace / Playground / Alignment Lab 的扩展钩子；
   * - 当前只约定 type 前缀与 moduleId，具体 payload 结构由上层约定（例如 data 内挂 spanId/attributes 等）。
   */
  | {
      readonly type: `trace:${string}`
      readonly moduleId?: string
      readonly data?: unknown
      readonly runtimeId?: string
      readonly runtimeLabel?: string
    }

export interface Sink {
  readonly record: (event: Event) => Effect.Effect<void>
}

// internal：唯一“真相”是 FiberRef.currentDebugSinks / currentRuntimeLabel
export const currentDebugSinks: FiberRef.FiberRef<ReadonlyArray<Sink>>
export const currentRuntimeLabel: FiberRef.FiberRef<string | undefined>
```

### 1.1 RuntimeDebugEventRef（统一事件视图）

为方便 Devtools / Playground 在不依赖内部实现细节的前提下消费调试事件，Runtime 会将 `Debug.Event` 归一化为一个轻量的 `RuntimeDebugEventRef` 结构（与 `specs/003-trait-txn-lifecycle/data-model.md` 中的 `TraitRuntimeEvent / RuntimeDebugEventRef` 保持一致）：

```ts
export type RuntimeDebugEventKind =
  | "action"
  | "state"
  | "service"
  | "trait-computed"
  | "trait-link"
  | "trait-source"
  | "lifecycle"
  | "react-render"
  | "devtools"
  | "diagnostic"
  | (string & {})

export interface RuntimeDebugEventRef {
  readonly eventId: string
  readonly moduleId?: string
  readonly instanceId?: string
  readonly runtimeId?: string
  readonly runtimeLabel?: string
  readonly txnId?: string
  readonly timestamp: number
  readonly kind: RuntimeDebugEventKind
  readonly label: string
  readonly meta?: unknown
}

export const toRuntimeDebugEventRef: (
  event: Event,
) => RuntimeDebugEventRef | undefined
```

核心映射规则（实现层面细节见 `@logix/core` 的 `DebugSink.ts`）：

- `module:init` / `module:destroy` → `kind = "lifecycle"`，label 分别为 `"module:init"` / `"module:destroy"`。  
- `action:dispatch` → `kind = "action"`，label 取 `action._tag` / `action.type` / `"action:dispatch"`。  
- `state:update` → `kind = "state"`，`meta` 中包含：
  - `state`：提交后的整棵状态；
  - `patchCount`：本次事务聚合的 Patch 数量（若启用 StateTransaction）；
  - `originKind`：触发该事务的来源种类（例如 `"action"` / `"source-refresh"` / `"service-callback"` / `"devtools"`）。  
- `lifecycle:error` / `diagnostic` → `kind = "lifecycle"` / `"diagnostic"`，`meta` 中保留错误详情与诊断信息。  
- `trace:react-render` → `kind = "react-render"`，`meta` 中包含 `componentLabel` / `selectorKey` / `fieldPaths` / `strictModePhase` 等；  
  - 若该事件缺少 `txnId`，Runtime 会使用同一 `runtimeId` 最近一次带事务的 `state:update` 补全，以便 Devtools 将渲染事件与 StateTransaction 对齐。  
- `trace:effectop` → 根据 EffectOp 的 `kind` 映射为 `"service"` / `"trait-computed"` / `"trait-link"` / `"trait-source"` 等，并在 `meta` 中保留完整的 EffectOp payload（id/kind/name/payload/meta）。  
- 其他 `trace:*` → 统一归类为 `kind = "devtools"`，原始数据放入 `meta.data`。  

Devtools 只依赖 `RuntimeDebugEventRef`，不直接读取 `Debug.Event`，从而允许后续在不破坏 Devtools 协议的前提下演进运行时内部实现。

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

### 1.2 与 EffectOp 的对接（trace:effectop 事件）

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

在实际项目中推荐通过 `@logix/core/middleware` 统一组合运行时中间件：

- 推荐使用高层组合入口 `Middleware.withDebug(stack, options?)`，在现有 MiddlewareStack 上一次性追加 DebugLogger（日志）与 DebugObserver（`trace:effectop`）；  
- 当需要精细控制顺序或选择性启用 logger/observer 时，再使用底层原语 `Middleware.applyDebug` / `Middleware.applyDebugObserver` 进行组合；  
- 其他横切关注点（如监控、限流/熔断、Query 集成等）可以在应用侧实现自定义 `Middleware.Middleware` 并与上述调试中间件叠加，Runtime 内核只负责在 EffectOp 边界调用统一的 MiddlewareStack。

### 1.2.1 DevtoolsHub 与一键启用（RuntimeOptions.devtools）

为了让 Devtools 能够以“进程/页面级”视角观察多个 Runtime/模块实例，runtime 提供了一个全局单例的聚合器：**DevtoolsHub**。

- DevtoolsHub 通过 `Debug.devtoolsHubLayer({ bufferSize? })` 以“追加 sinks”的方式挂入当前 Debug sinks 集合：  
  - 不覆盖调用方已有的 `Debug.layer` / `Debug.replace` / 自定义 sinks；  
  - 将 Debug 事件聚合为 `DevtoolsSnapshot`（instances / events / latestStates），并提供订阅能力：
    - `Debug.getDevtoolsSnapshot()`  
    - `Debug.subscribeDevtoolsSnapshot(listener)`  
    - `Debug.clearDevtoolsEvents()`  
    - `Debug.setInstanceLabel(runtimeId, label)` / `Debug.getInstanceLabel(runtimeId)`

- Runtime 提供 `RuntimeOptions.devtools` 作为一键启用入口：  
  - `devtools: true` 或 `devtools: { bufferSize?, observer? }`；  
  - 自动合并 `Debug.devtoolsHubLayer({ bufferSize })` 到 appLayer；  
  - 自动对 `options.middleware ?? []` 追加 DebugObserver（`Middleware.withDebug(..., { logger: false, observer })`），确保产出 `trace:effectop` 并携带 txnId；  
  - 该选项视为**显式 override**：只要传入就生效，不受 `isDevEnv()` 裁剪。

推荐用法：

```ts
import * as Logix from "@logix/core"

const runtime = Logix.Runtime.make(RootImpl, {
  label: "AppRuntime",
  devtools: true,
})
```

### 1.3 调试事件类别（RuntimeDebugEventKind）

在 Devtools 视角下，`RuntimeDebugEventRef.kind` 主要落在以下几类，用于驱动事务视图与时间线：

- `"action"`：动作派发与逻辑入口（通常对应一次 StateTransaction 的起点）；  
- `"state"`：状态提交（通常对应一次 StateTransaction 的 commit，一次逻辑入口只应看到一次）；  
- `"service"`：资源调用 / 外部服务交互（源自 EffectOp）；  
- `"trait-computed"` / `"trait-link"` / `"trait-source"`：Trait 生命周期各阶段产生的 EffectOp 事件；  
- `"lifecycle"`：模块初始化 / 销毁等生命周期事件；  
- `"react-render"`：React 组件渲染事件，用于分析“一次事务导致了哪些渲染”；  
- `"diagnostic"`：结构化诊断（逻辑阶段错误、Env 缺失、Reducer 约束等）；  
- `"devtools"`：Devtools 自身行为（如时间旅行操作）或其他 trace:* 扩展事件。

### 1.4 诊断代码与触发条件（v3 稳定不变量）

- `logic::invalid_phase`（error）：在 setup 段调用 run-only 能力（`$.use / $.onAction* / $.onState* / IntentBuilder.run* / runWithContext` 等）或 builder 顶层执行 IO 时触发；源错误为 `LogicPhaseError(kind/api/phase/moduleId)`。  
- `logic::env_service_not_found`（warning/error，视实现）：Env 未完全就绪时访问 Service 触发，用于提示将 Env 访问移到 run 段；Env 铺满后再次出现则视为硬错误。  
- `reducer::duplicate`（error）：同一 Action tag 注册多个 primary reducer。  
- `reducer::late_registration`（error）：在该 tag 已派发过后才注册 primary reducer。  
- `lifecycle::missing_on_error`（warning）：Module 发生 lifecycle 错误时缺少 `$.lifecycle.onError` 处理器。

## 2. 核心视图

### 2.0 OverviewStrip（事务/渲染密度概览）

OverviewStrip 是 Devtools 面板顶部的密度条（默认 24 根柱子），用于在不滚动 Timeline 的情况下快速回答：

- 最近一段时间内是否出现**事务爆发（burst）**：短时间内大量事务/状态提交；
- 是否存在明显的**空窗（idle gap）**：长时间没有事务；
- 哪一段时间片需要进一步 drill-down（点击柱子设置 `timelineRange`）。

#### 2.0.1 核心概念与字段

Overview 的 debug info（OverviewDetails 面板内输出的 JSON）中，跟分析相关的字段可以按三层理解：

1) **“我在看谁？”（selection）**

- `selection.selectedRuntime` / `selectedModule` / `selectedInstance`：当前 Devtools 的选中对象，决定 Timeline/Inspector/Overview 的聚合维度。

2) **“事件缓冲区是什么？”（timeline）**

- `timeline.length`：Devtools 当前事件缓冲区长度（受 `settings.eventBufferSize` 控制；默认 500）。
- `timeline.lastTypes`：最近 12 条事件的 `event.type` 摘要，用于快速判断事件流模式（例如 `trace:effectop` 与 `state:update` 的交替）。
- `timeline.timelineRange`：当前是否处于“时间窗口聚焦”状态；为 `null` 表示未聚焦。

3) **“Overview 统计结果是什么？”（overview / buckets）**

- `overview.constants.MAX_BUCKETS`：柱子数量（默认 24）。
- `overview.constants.bucketMs`：每根柱子覆盖的时间粒度（毫秒）。
  - 当前实现会根据 Timeline 首尾事件的时间跨度选择一个离散档位（25ms ~ 10s），以避免粒度抖动导致 UI 不稳定。
- `overview.constants.windowMs = bucketMs * MAX_BUCKETS`：Overview 覆盖的总时间窗口（毫秒）。
- `buckets.count`：等于 `MAX_BUCKETS`。
- `buckets.emptyBuckets` / `nonEmptyBuckets`：空桶数量与非空桶数量；空桶对应该时间片没有观测到事务/渲染事件。
- `buckets.maxTxn` / `maxRender` / `maxValue`：用于把柱高归一化；`maxValue = max(maxTxn, maxRender, 1)`。

单个桶（`overview.buckets.items[]`）的关键字段：

- `bucketId`：时间桶编号，约等于 `floor(timestamp / bucketMs)`；绝对值是 epoch 相关索引，通常只看相对顺序。
- `txnCount`：该桶内的**事务计数**（不是事件条数）。
  - 逻辑上优先按 `RuntimeDebugEventRef.txnId` 去重；
  - 缺少 `txnId` 的事件会按事件索引或 EffectOp `linkId` 等策略兜底，使密度信号尽量不丢失。
- `renderCount`：该桶内 `kind = "react-render"` 的渲染事件数量（若启用采样，则为采样值）。
- `level`：桶的告警级别（`ok` / `warn` / `danger`），由密度阈值推导（见 `settings.overviewThresholds`）。
  - `txnPerSecond = txnCount * 1000 / bucketMs`
  - `renderPerSecond = renderCount * 1000 / bucketMs`
  - 默认阈值：`txnPerSecondWarn = 50`、`txnPerSecondDanger = 150`、`renderPerTxnWarn = 3`、`renderPerTxnDanger = 6`。
- `isTip`：是否为当前窗口内最右侧的“最新桶”（右端点），用于驱动插入/高亮策略。
- `isEmpty`：是否为空桶（`txnCount === 0 && renderCount === 0`）。
- `startIndex` / `endIndex`：该桶覆盖到的 Timeline 索引范围（闭区间）。
  - 点击该桶会设置 `DevtoolsState.timelineRange = { start, end }`，用于让 Timeline/Inspector 聚焦到这一段。
- `lastChangedAt`：桶计数最近一次“增加”时的本地时间戳（用于短暂高亮）；当桶后续变为空时该值可能仍保留，但 UI 会忽略空桶的高亮。

#### 2.0.2 如何解读一份实际样例（结合 debug info）

以你提供的样例为例：

- `bucketMs = 150`、`MAX_BUCKETS = 24` ⇒ `windowMs = 3600ms`  
  这表示 Overview 覆盖最近约 **3.6 秒**，每根柱子代表 **150ms**。
- `timeline.length = 500` 表示当前事件缓冲区已满（或接近满）；但 Overview 只展示其中落在最近 3.6 秒窗口内的密度分布。
- `emptyBuckets = 17`、`nonEmptyBuckets = 7`  
  说明在最近 3.6 秒里，约 `17 * 150ms = 2550ms` 没有事务/渲染（空窗较多），剩余约 `1050ms` 内发生了多段 burst。

再看几个桶的密度：

- `bucketId = 11770730828`：`txnCount = 67`、`bucketMs = 150`  
  `txnPerSecond ≈ 67 * 1000 / 150 ≈ 446 txns/s`，远高于默认 danger 阈值 `150 txns/s`，因此 `level = "danger"`。
- `bucketId = 11770730822`：`txnCount = 26`  
  `txnPerSecond ≈ 173 txns/s`，同样会落入 `danger`。
- `bucketId = 11770730820`：`txnCount = 3`  
  `txnPerSecond ≈ 20 txns/s`，因此 `level = "ok"`。

如何进一步定位问题：

1. 优先点击 `txnCount` 最高的桶（例如 `startIndex=213, endIndex=321` 对应的桶），让 Devtools 自动设置 `timelineRange`。  
2. 在 Timeline / EffectOpTimelineView 内只看该范围内的事件，结合 `lastTypes` 的模式（`trace:effectop` 与 `state:update` 交替）判断：  
   - 是不是一次业务输入导致“重复 dispatch / 重复事务 commit”；  
   - 或者 Trait/EffectOp 链路在短时间内被触发过多次（例如计算/联动回路）。  
3. 再用 Inspector 的 Transaction Summary / State After Event 来确认：高 `txnCount` 是否对应真实的多次状态提交，还是“同一事务内大量 trace 事件”造成的观测噪音（两者在优化策略上差别很大）。

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
