import { Effect, Layer, Logger } from "effect"
import type { AnyModuleShape, ModuleInstance } from "./internal/module.js"
import type {
  StateTraitProgram,
  StateTraitGraph,
  StateTraitPlan,
} from "./state-trait.js"
import * as Internal from "./internal/runtime/core/DebugSink.js"
import * as DevtoolsHub from "./internal/runtime/core/DevtoolsHub.js"
import * as ModuleTraitsRegistry from "./internal/debug/ModuleTraitsRegistry.js"
import { getNodeEnv } from "./internal/runtime/core/env.js"

// Public Debug API：以命名空间形式收口 Debug 能力，供业务与平台统一使用。
// 实际事件模型与 Layer 定义集中在 internal/runtime/core/DebugSink.ts 中，
// 这里在其基础上提供更易用的组合入口。

export type Event = Internal.Event
export interface Sink extends Internal.Sink {}
export interface RuntimeDebugEventRef extends Internal.RuntimeDebugEventRef {}

export const internal = {
  currentDebugSinks: Internal.currentDebugSinks,
  currentRuntimeLabel: Internal.currentRuntimeLabel,
  toRuntimeDebugEventRef: Internal.toRuntimeDebugEventRef,
}

export interface DevtoolsSnapshot extends DevtoolsHub.DevtoolsSnapshot {}
export interface DevtoolsHubOptions extends DevtoolsHub.DevtoolsHubOptions {}

export const getDevtoolsSnapshot = DevtoolsHub.getDevtoolsSnapshot
export const subscribeDevtoolsSnapshot = DevtoolsHub.subscribeDevtoolsSnapshot
export const clearDevtoolsEvents = DevtoolsHub.clearDevtoolsEvents
export const setInstanceLabel = DevtoolsHub.setInstanceLabel
export const getInstanceLabel = DevtoolsHub.getInstanceLabel

/**
 * isDevtoolsEnabled：
 * - 用于 React/Devtools UI 在非 dev 环境下判断是否应启用额外观测（如 react-render 事件）。
 * - 该标记由 devtoolsHubLayer 打开（显式 override）。
 */
export const isDevtoolsEnabled = DevtoolsHub.isDevtoolsEnabled

/**
 * ModuleInstanceCounter：
 * - 仅依赖 module:init / module:destroy 事件，按 moduleId 维度统计当前活跃实例数量；
 * - 适合作为 DevTools / Playground 的基础数据源，不关心具体 runtimeId 或 React key。
 */
export interface ModuleInstanceCounter {
  readonly sink: Sink
  readonly getSnapshot: () => ReadonlyMap<string, number>
}

/**
 * RingBufferSink：
 * - 通用 DevTools 辅助工具，用于在内存中保留最近一段 Debug 事件窗口（环形缓冲区）；
 * - 不做任何筛选/分组，调用方可以基于 snapshot 再按 moduleId / type 等维度加工。
 */
export interface RingBufferSink {
  readonly sink: Sink
  readonly getSnapshot: () => ReadonlyArray<Event>
  readonly clear: () => void
}

/**
 * makeModuleInstanceCounterSink：
 * - 构造一个 DebugSink，用于在内存中累积「每个 moduleId 当前有多少活跃实例」；
 * - Snapshot 通过 getSnapshot() 暴露给 DevTools，调用方可自行决定如何对外桥接（window/postMessage 等）。
 */
export const makeModuleInstanceCounterSink = (): ModuleInstanceCounter => {
  const counts = new Map<string, number>()

  const sink: Sink = {
    record: (event: Event) =>
      Effect.sync(() => {
        if (event.type === "module:init") {
          const moduleId = event.moduleId ?? "unknown"
          const runtimeLabel =
            "runtimeLabel" in event && event.runtimeLabel
              ? event.runtimeLabel
              : "unknown"
          const key = `${runtimeLabel}::${moduleId}`
          const prev = counts.get(key) ?? 0
          counts.set(key, prev + 1)
          return
        }
        if (event.type === "module:destroy") {
          const moduleId = event.moduleId ?? "unknown"
          const runtimeLabel =
            "runtimeLabel" in event && event.runtimeLabel
              ? event.runtimeLabel
              : "unknown"
          const key = `${runtimeLabel}::${moduleId}`
          const prev = counts.get(key) ?? 0
          const next = prev - 1
          if (next <= 0) {
            counts.delete(key)
          } else {
            counts.set(key, next)
          }
        }
      }),
  }

  const getSnapshot = (): ReadonlyMap<string, number> =>
    new Map(counts)

  return { sink, getSnapshot }
}

/**
 * makeRingBufferSink：
 * - 创建一个简单的环形缓冲区 DebugSink，按时间顺序记录最近 capacity 条事件；
 * - 适合作为 DevTools / Playground 的“事件时间线”基础实现。
 */
export const makeRingBufferSink = (capacity = 1000): RingBufferSink => {
  const buffer: Event[] = []

  const sink: Sink = {
    record: (event: Event) =>
      Effect.sync(() => {
        if (capacity <= 0) {
          return
        }
        if (buffer.length >= capacity) {
          buffer.shift()
        }
        buffer.push(event)
      }),
  }

  const getSnapshot = (): ReadonlyArray<Event> => buffer.slice()
  const clear = (): void => {
    buffer.length = 0
  }

  return { sink, getSnapshot, clear }
}

/**
 * Debug.record：
 * - 向当前 Fiber 上挂载的 Debug sinks 发出一条事件；
 * - 若当前 Fiber 上未提供任何 sink，则根据运行环境选择兜底行为
 *   （浏览器走彩色 console 分组，Node 只保证错误类事件不会完全丢失）。
 */
export const record = Internal.record

/**
 * noopLayer：
 * - 提供一个“空 DebugSink 集合”（内部无任何 Sink），直接丢弃所有 Debug 事件；
 * - 主要用于测试场景或显式关闭 Debug 能力。
 */
export const noopLayer = Internal.noopLayer as unknown as Layer.Layer<any, never, never>

/**
 * DebugMode：
 * - "auto"：根据 NODE_ENV 自动选择 dev / prod；
 * - "dev"：开发模式，输出尽量丰富的诊断信息；
 * - "prod"：生产模式，只保留关键错误与诊断；
 * - "off"：完全关闭 DebugSink（通常用于基准/特殊测试场景）。
 */
export type DebugMode = "auto" | "dev" | "prod" | "off"

export interface DebugLayerOptions {
  readonly mode?: DebugMode
  /**
   * 为未来扩展预留：在 dev 模式下是否打开高噪音的 action/state 级别日志。
   * 当前实现中尚未使用。
   */
  readonly verboseActions?: boolean
  /**
   * 为未来扩展预留：在 prod 模式下是否将关键事件打入 metrics。
   * 当前实现中尚未使用。
   */
  readonly enableMetrics?: boolean
}

const resolveMode = (mode: DebugMode | undefined): DebugMode => {
  if (mode && mode !== "auto") {
    return mode
  }

  const env = getNodeEnv()
  return env === "production" ? "prod" : "dev"
}

/**
 * Debug.layer：
 * - 对外统一入口，根据当前环境或显式传入的 mode 组合一套 Debug 能力；
 * - 默认 `mode: "auto"`：非 production 视为 dev，production 视为 prod。
 *
 * 典型用法：
 *
 *   const runtime = Runtime.make(AppImpl, {
 *     layer: Layer.mergeAll(
 *       Debug.layer(),
 *       businessLayer,
 *     ),
 *   })
 */
export const layer = (options?: DebugLayerOptions): Layer.Layer<any, never, never> => {
  const mode = resolveMode(options?.mode)

  switch (mode) {
    case "off":
      return Internal.noopLayer as unknown as Layer.Layer<any, never, never>
    case "prod":
      // 生产环境：仅保留关键错误与高价值诊断，避免高噪音日志。
      return Internal.errorOnlyLayer as unknown as Layer.Layer<any, never, never>
    case "dev":
    case "auto": {
      // 开发环境：默认仅启用 Debug Sink 的浏览器友好输出，
      // Logger.pretty 由调用方自行选择是否叠加，避免隐式改写 logger。
      return Internal.browserConsoleLayer as unknown as Layer.Layer<any, never, never>
    }
  }
}

/**
 * PrettyLoggerOptions：直接复用 Effect.Logger.prettyLogger 的参数形状。
 */
export type PrettyLoggerOptions = Parameters<typeof Logger.prettyLogger>[0]

/**
 * withPrettyLogger：
 * - 在给定 Layer 基础上，替换 Effect 默认 logger 为 pretty logger；
 * - 等价于 Logger.replace(Logger.defaultLogger, Logger.prettyLogger(options))，
 *   以 Layer 形式暴露，便于与 Debug.layer / 业务 Layer 组合。
 */
export const withPrettyLogger = (
  base: Layer.Layer<any, any, any>,
  options?: PrettyLoggerOptions
): Layer.Layer<any, any, any> =>
  Layer.merge(
    base,
    Logger.replace(
      Logger.defaultLogger,
      Logger.prettyLogger(options)
    ) as unknown as Layer.Layer<any, any, any>
  )

/**
 * replace：
 * - 高级用法：完全使用调用方提供的 Sink Layer 接管 Debug 能力；
 * - 通常配合 Debug.makeSink / 自定义 Sink 使用；
 * - 与 Debug.layer 互斥：同一作用域内建议二选一。
 */
export const replace = (sinks: ReadonlyArray<Sink>): Layer.Layer<any, never, never> =>
  Layer.locallyScoped(
    internal.currentDebugSinks,
    sinks as ReadonlyArray<Internal.Sink>,
  ) as Layer.Layer<any, never, never>

/**
 * appendSinks：
 * - 在当前 Fiber 的 Debug sinks 集合基础上“追加” sinks（不覆盖调用方已有 sinks）；
 * - 典型用于 devtoolsHubLayer / traceLayer 等装饰器场景。
 */
export const appendSinks = (sinks: ReadonlyArray<Sink>): Layer.Layer<any, never, never> =>
  Layer.fiberRefLocallyScopedWith(
    Internal.currentDebugSinks,
    (current) => [...current, ...(sinks as ReadonlyArray<Internal.Sink>)],
  ) as Layer.Layer<any, never, never>

/**
 * devtoolsHubLayer：
 * - 追加 DevtoolsHub Sink，用于在进程/页面内聚合 Debug 事件快照（DevtoolsSnapshot）；
 * - 以“追加 sinks”的方式工作，不会覆盖 Debug.layer / Debug.replace / 自定义 sinks。
 */
export function devtoolsHubLayer(options?: DevtoolsHubOptions): Layer.Layer<any, never, never>
export function devtoolsHubLayer(
  base: Layer.Layer<any, any, any>,
  options?: DevtoolsHubOptions,
): Layer.Layer<any, never, any>
export function devtoolsHubLayer(
  baseOrOptions?: Layer.Layer<any, any, any> | DevtoolsHubOptions,
  maybeOptions?: DevtoolsHubOptions,
): Layer.Layer<any, never, any> {
  // Layer 在 effect v3 运行时是一个带 `_op_layer` 标记的对象。
  const isLayerValue = (value: unknown): value is Layer.Layer<any, any, any> =>
    typeof value === "object" && value !== null && "_op_layer" in (value as Record<string, unknown>)

  const hasBase = isLayerValue(baseOrOptions)
  const base = hasBase
    ? (baseOrOptions as Layer.Layer<any, any, any>)
    : (Layer.empty as unknown as Layer.Layer<any, any, any>)
  const options = hasBase
    ? maybeOptions
    : (baseOrOptions as DevtoolsHubOptions | undefined)

  DevtoolsHub.configureDevtoolsHub(options)
  const append = appendSinks([DevtoolsHub.devtoolsHubSink])

  // FiberRef 层需要保证 base 先建立 sinks，再由 append 追加；provideMerge(append, base)
  // 会先构建 base，再应用 append 的 FiberRefs patch，避免被覆盖。
  return Layer.provideMerge(append, base) as Layer.Layer<any, never, any>
}

/**
 * runtimeLabel：
 * - 在当前 Fiber 作用域内为 Debug 事件附加一个逻辑 Runtime 标识（如 App 名称 / 场景标签）；
 * - DevTools 可以据此将 Debug 事件按 Runtime 分组展示。
 */
export const runtimeLabel = (label: string): Layer.Layer<any, never, never> =>
  Layer.fiberRefLocallyScopedWith(
    internal.currentRuntimeLabel as any,
    () => label,
  ) as Layer.Layer<any, never, never>

/**
 * ModuleTraitsDebug：
 * - Devtools / 脚本使用的 StateTrait 调试视图；
 * - program 是完整 Program，graph / plan 为其中的结构化子集。
 */
export interface ModuleTraitsDebug {
  readonly program?: StateTraitProgram<any>
  readonly graph?: StateTraitGraph
  readonly plan?: StateTraitPlan
}

/**
 * getModuleTraits：
 * - 从 Module 定义对象中读取 StateTraitProgram（若存在），并返回调试视图；
 * - 仅依赖 Module.make 在实现阶段挂载的内部字段 `__stateTraitProgram`，
 *   若模块未使用 traits 槽位，则返回空对象。
 */
export const getModuleTraits = (
  module: ModuleInstance<string, AnyModuleShape>,
): ModuleTraitsDebug => {
  const anyModule = module as any
  const program = anyModule.__stateTraitProgram as
    | StateTraitProgram<any>
    | undefined

  if (!program) {
    return {}
  }

  return {
    program,
    graph: program.graph,
    plan: program.plan,
  }
}

/**
 * getModuleTraitsById：
 * - 按 moduleId 查询 StateTraitProgram（若已在 Module.make 阶段注册），并返回调试视图；
 * - 用于 Devtools 等基于 Debug 事件（只有 moduleId 字符串）的场景。
 */
export const getModuleTraitsById = (
  moduleId: string,
): ModuleTraitsDebug | undefined => {
  const program = ModuleTraitsRegistry.getModuleProgramById(moduleId)
  if (!program) {
    return undefined
  }
  return {
    program,
    graph: program.graph,
    plan: program.plan,
  }
}

/**
 * traceLayer：
 * - 作为装饰器在当前 Fiber 的 Debug sinks 集合基础上追加一个仅处理 `trace:*` 的 Sink；
 * - 默认行为是将 trace 事件以 Debug 日志输出（logDebug），
 *   调用方可以通过传入自定义 handler 将 trace 事件写入 ring buffer / DevToolsBridge 等；
 * - 正确用法示例：
 *
 *   const layer = Debug.traceLayer(
 *     Debug.layer({ mode: "dev" }),
 *     (event) => Effect.logInfo({ traceEvent: event }),
 *   )
 */
const isLayer = (value: unknown): value is Layer.Layer<any, any, any> =>
  typeof value === "object" && value !== null && "_op_layer" in (value as Record<string, unknown>)

export function traceLayer(
  onTrace?: (event: Event) => Effect.Effect<void>,
): Layer.Layer<any, never, never>
export function traceLayer(
  base: Layer.Layer<any, any, any>,
  onTrace?: (event: Event) => Effect.Effect<void>,
): Layer.Layer<any, never, any>
export function traceLayer(
  baseOrHandler?: Layer.Layer<any, any, any> | ((event: Event) => Effect.Effect<void>),
  maybeOnTrace?: (event: Event) => Effect.Effect<void>,
): Layer.Layer<any, never, any> {
  const hasBase = isLayer(baseOrHandler)
  const base = hasBase
    ? (baseOrHandler as Layer.Layer<any, any, any>)
    : (Layer.empty as unknown as Layer.Layer<any, any, any>)
  const onTrace = hasBase ? maybeOnTrace : (baseOrHandler as ((event: Event) => Effect.Effect<void>) | undefined)

  const traceSink: Sink = {
    record: (event: Event) =>
      typeof event.type === "string" && event.type.startsWith("trace:")
        ? (onTrace ? onTrace(event) : Effect.logDebug({ traceEvent: event }))
        : Effect.void,
  }

  // 通过 FiberRef 追加 trace sink：在当前 Fiber 的 sinks 集合基础上追加，
  // 不再依赖任何 DebugHub / Tag，只使用 FiberRef.currentDebugSinks 作为单一真相。
  const appendTrace = Layer.fiberRefLocallyScopedWith(
    Internal.currentDebugSinks,
    (sinks) => [...sinks, traceSink],
  )

  // 同 devtoolsHubLayer：先构建 base，再由 appendTrace 追加 FiberRef sinks。
  return Layer.provideMerge(appendTrace, base as Layer.Layer<any, any, any>) as Layer.Layer<any, never, any>
}
