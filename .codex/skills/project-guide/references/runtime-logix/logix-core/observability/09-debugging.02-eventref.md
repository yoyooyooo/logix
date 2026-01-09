# 1.1 RuntimeDebugEventRef（统一事件视图）

为方便 Devtools / Playground / EvidencePackage 在不依赖内部实现细节的前提下消费调试事件，Runtime 会将宿主内 `Debug.Event` 归一化为一个轻量的 `RuntimeDebugEventRef`：

- `RuntimeDebugEventRef` **必须可 JSON 序列化**（`meta` 必须是 `JsonValue`）
- `moduleId + instanceId` **必填**

```ts
export type JsonValue =
  | null
  | boolean
  | number
  | string
  | ReadonlyArray<JsonValue>
  | { readonly [key: string]: JsonValue }

export interface SerializableErrorSummary {
  readonly message: string
  readonly name?: string
  readonly code?: string
  readonly hint?: string
}

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
  /** instance 内单调递增序号（用于排序/去重；跨宿主不依赖时间戳）。 */
  readonly eventSeq: number
  readonly moduleId: string
  readonly instanceId: string
  readonly runtimeLabel?: string
  /**
   * instance 内事务序号（0 保留给非事务事件）。
   * - 用于跨宿主聚合与回放对齐（不依赖时间戳）。
   */
  readonly txnSeq: number
  /** 可选：确定性派生；建议 `${instanceId}::t${txnSeq}`。 */
  readonly txnId?: string
  /**
   * linkId：
   * - 当前操作链路 id（同一链路下的边界操作共享）；
   * - Runtime 在边界起点创建，并通过 FiberRef 在嵌套/跨模块链路中传递；
   * - 用于将 action/state/trace:* 等事件串成可解释的因果链（Graph UI 的前置骨架）。
   */
  readonly linkId?: string
  readonly timestamp: number
  readonly kind: RuntimeDebugEventKind
  readonly label: string
  readonly meta?: JsonValue
  readonly errorSummary?: SerializableErrorSummary
  readonly downgrade?: {
    readonly reason?: "non_serializable" | "oversized" | "unknown"
  }
}

export const toRuntimeDebugEventRef: (
  event: Event,
  options?: { readonly diagnosticsLevel?: "off" | "light" | "full" },
) => RuntimeDebugEventRef | undefined
```

核心映射规则（实现层面细节见 `@logixjs/core` 的 `DebugSink.ts`）：

- `module:init` / `module:destroy` → `kind = "lifecycle"`，label 分别为 `"module:init"` / `"module:destroy"`。
- 生命周期阶段事件（init/start/destroy/platform）→ `kind = "lifecycle"`，`meta` 中携带对齐 `specs/011-upgrade-lifecycle/contracts/schemas/lifecycle-event.schema.json` 的最小证据（必须可序列化且遵守事件预算）。
- `action:dispatch` → `kind = "action"`，label 取 `action._tag` / `action.type` / `"action:dispatch"`。
- `state:update` → `kind = "state"`，`meta` 中只保留 **JsonValue 投影后的摘要**（不得透传原始 `state` 对象图），例如：
  - `dirtySet`：本次提交聚合的影响域（字段级 dirty-set，见 `specs/019-txn-perf-controls/contracts/schemas/dirty-set-v2.schema.json`）；当无法追踪字段级信息时应显式 `dirtyAll=true` 并给出 `reason`（用于解释退化）。
  - `patchCount`：本次事务聚合的 Patch 数量（若启用 StateTransaction）；
  - `commitMode` / `priority`：本次提交的合并/调度模式（`normal|batch|lowPriority`）与可见性优先级（`normal|low`，主要用于 React 外部订阅调度），见 `specs/019-txn-perf-controls/contracts/schemas/txn-commit-evidence.schema.json`；
  - `originKind` / `originName`：触发该事务的来源（事务入口的 origin.kind / origin.name）；
  - `traitSummary`：本窗口 Trait 收敛摘要（必须为 `JsonValue`，且受体积预算约束）。当启用 StateTrait converge 且 `DiagnosticsLevel=full` 时，形态为 `{ converge: ConvergeDecisionSummary }`（同 `kind="trait:converge"` 的 `meta` 口径）；`light|off` 不导出该字段；
  - `replayEvent`：预留的回放事件引用（Phase 2 仅固化字段位）。
- `lifecycle:error` → `kind = "lifecycle"`，不得透传原始 `cause`；必须产出 `errorSummary`，必要时附带 `downgrade.reason`。
- `diagnostic` → `kind = "diagnostic"`，`meta` 必须为 `JsonValue` 且 Slim（禁止把闭包/Effect/大对象图塞入）。
  - `code` 以 `concurrency::` 开头时，`trigger.details` 必须对齐 `specs/021-limit-unbounded-concurrency/contracts/concurrency-diagnostic-details.schema.json`（`additionalProperties=false`，禁止塞额外字段），并满足最小字段：`configScope`（并发上限的配置来源）与 `limit`（并发上限值）。
  - 约定的并发诊断 code（021）：
    - `concurrency::pressure`（warning）：背压/饱和预警；`trigger.details` 可包含 `backlogCount/saturatedDurationMs/threshold/cooldownMs`，并通过 `degradeStrategy="cooldown"` + `suppressedCount` 表示冷却窗口内合并情况。
    - `concurrency::unbounded_enabled`（error）：effective 并发为 `"unbounded"` 且显式允许时发射一次（实例作用域只提示一次），用于审计提示。
    - `concurrency::unbounded_requires_opt_in`（error）：请求 `"unbounded"` 但未显式允许时发射一次（实例作用域只提示一次），用于解释“为何回退到 bounded”。
- `trace:react-render` → `kind = "react-render"`，组件级渲染 commit；
- `trace:react-selector` → `kind = "react-selector"`，selector 级诊断（不应计入 renderCount），`meta` 中可包含 `componentLabel` / `selectorKey` / `fieldPaths` / `strictModePhase` 等；
  - 若该事件缺少 `txnId`：**不得补造/补全稳定键**。Devtools 可以基于 `instanceId + eventId` 的时间邻近关系做 UI 辅助关联（例如“最近一次事务”提示），但该关联不作为协议保证与回放依据。
- `trace:trait:converge` → `kind = "trait:converge"`，StateTrait 收敛证据事件；`meta` 固化为 `ConvergeDecisionSummary`（见 `specs/013-auto-converge-planner/contracts/schemas/trait-converge-data.schema.json`），必须为 `JsonValue`：
  - `DiagnosticsLevel=off`：不产出任何可导出的 converge 事件/摘要；
  - `DiagnosticsLevel=light`：裁剪重字段（`dirty` 仅保留 `dirtyAll`；不导出 `top3` 等 hotspots）；同时 `state:update.meta` 不包含 `traitSummary`；
  - `DiagnosticsLevel=full`：允许输出受控 roots 摘要（`rootCount` + `rootIds` TopK=3，硬上界 16）与可选 hotspots；`staticIrDigest = instanceId + ":" + generation` 用于引用 EvidencePackage 内去重导出的 `ConvergeStaticIR`。
- `trace:effectop` → 根据 EffectOp 的 `kind` 映射为 `"service"` / `"trait-computed"` / `"trait-link"` / `"trait-source"` 等；导出形态只允许保留 **Slim**、可解释且可序列化的元信息（例如 `opId/kind/name/timing`），不得透传完整 payload 对象图。
- `linkId`：当事件发生在某条 EffectOp 链路内时，Runtime 会将当前链路 id 提拔为一等字段；Devtools 聚合/归因应优先使用 `linkId`，而不是从 `meta.meta.linkId` 深挖兜底。
- 其他 `trace:*` → 统一归类为 `kind = "devtools"`；导出形态只允许保留可序列化的 Slim 元信息（必要时省略并标注 `downgrade.reason`）。原始 `data: unknown` 只允许存在于宿主内 `Debug.Event`，不得进入可导出事件的 `meta`。

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

Runtime 公共入口（`@logixjs/core/Debug`）实际暴露：

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
import * as Logix from "@logixjs/core"
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
