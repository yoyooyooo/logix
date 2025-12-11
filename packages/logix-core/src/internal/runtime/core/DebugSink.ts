import { Cause, Effect, FiberRef, Layer, Logger } from "effect"

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
      readonly runtimeLabel?: string
    }
  | {
      readonly type: "state:update"
      readonly moduleId?: string
      readonly state: unknown
      readonly runtimeId?: string
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
export const currentDebugSinks = FiberRef.unsafeMake<ReadonlyArray<Sink>>([])
export const currentRuntimeLabel = FiberRef.unsafeMake<string | undefined>(undefined)

// 浏览器环境下，为了减少 React StrictMode 等导致的重复日志噪音，
// 对 lifecycle:error 与 diagnostic 事件做一次简单去重：同一 moduleId+payload 只打印一次。
const browserLifecycleSeen = new Set<string>()
const browserDiagnosticSeen = new Set<string>()

const lifecycleErrorLog = (event: Extract<Event, { readonly type: "lifecycle:error" }>) => {
  const moduleId = event.moduleId ?? "unknown"
  const causePretty = (() => {
    try {
      return Cause.pretty(event.cause as Cause.Cause<unknown>, {
        renderErrorCause: true,
      })
    } catch {
      try {
        return JSON.stringify(event.cause, null, 2)
      } catch {
        return String(event.cause)
      }
    }
  })()

  const message = `[Logix][module=${moduleId}] lifecycle:error\n${causePretty}`

  return Effect.logError(message).pipe(
    Effect.annotateLogs({
      "logix.moduleId": moduleId,
      "logix.event": "lifecycle:error",
      "logix.cause": causePretty,
    }),
  )
}

const diagnosticLog = (event: Extract<Event, { readonly type: "diagnostic" }>) => {
  const moduleId = event.moduleId ?? "unknown"
  const header = `[Logix][module=${moduleId}] diagnostic(${event.severity})`
  const detail = `code=${event.code} message=${event.message}${
    event.actionTag ? ` action=${event.actionTag}` : ""
  }${event.hint ? `\nhint: ${event.hint}` : ""}`
  const msg = `${header}\n${detail}`

  const base =
    event.severity === "warning"
      ? Effect.logWarning(msg)
      : event.severity === "info"
        ? Effect.logInfo(msg)
        : Effect.logError(msg)

  const annotations: Record<string, unknown> = {
    "logix.moduleId": moduleId,
    "logix.event": `diagnostic(${event.severity})`,
    "logix.diagnostic.code": event.code,
    "logix.diagnostic.message": event.message,
  }
  if (event.hint) {
    annotations["logix.diagnostic.hint"] = event.hint
  }
  if (event.actionTag) {
    annotations["logix.diagnostic.actionTag"] = event.actionTag
  }

  return base.pipe(Effect.annotateLogs(annotations))
}

/**
 * 基于 FiberRef.currentDebugSinks 的默认 Layer 组合：
 * - 使用 Layer.locallyScoped 确保 Debug sinks 作为 FiberRef 状态注入，
 * - 不再将 FiberRef 误用为 Context.Tag。
 */
export const noopLayer = Layer.locallyScoped(currentDebugSinks, [])

/**
 * errorOnlyLayer：
 * - 默认的 DebugSink 实现，仅关心 lifecycle:error 事件；
 * - 适合作为 Runtime 的“最低限度观测”层，保证致命错误不会悄然消失；
 * - 其他事件（module:init/destroy、action:dispatch、state:update）默认不记录。
 */
const errorOnlySink: Sink = {
  record: (event: Event) =>
    event.type === "lifecycle:error"
      ? lifecycleErrorLog(event)
      : event.type === "diagnostic" && event.severity !== "info"
        ? diagnosticLog(event)
        : Effect.void,
}

export const errorOnlyLayer = Layer.locallyScoped(currentDebugSinks, [errorOnlySink])

/**
 * consoleLayer：
 * - 全量调试层，将所有 Debug 事件以 Effect 日志形式输出（logfmt / structured），
 * - 适合作为通用环境（Node / 测试环境）的观测层。
 */
const consoleSink: Sink = {
  record: (event: Event) =>
    event.type === "lifecycle:error"
      ? lifecycleErrorLog(event)
      : event.type === "diagnostic"
        ? diagnosticLog(event)
        : Effect.logDebug({ debugEvent: event }),
}

export const consoleLayer = Layer.locallyScoped(currentDebugSinks, [consoleSink])

const isBrowser = typeof window !== "undefined" && typeof document !== "undefined"

// 浏览器环境下统一的 Console 渲染逻辑，用于 DebugSink 缺省实现与 browserConsoleLayer。
const renderBrowserConsoleEvent = (event: Event): Effect.Effect<void> => {
  // trace:* 事件：在浏览器中以独立分组展示，便于 Playground / DevTools 观测。
  if (typeof (event as any).type === "string" && (event as any).type.startsWith("trace:")) {
    const moduleId = (event as any).moduleId ?? "unknown"
    const type = (event as any).type

    return Effect.sync(() => {
      // eslint-disable-next-line no-console
      console.groupCollapsed(
        "%c[Logix]%c trace %c" + moduleId + "%c " + String(type),
        "color:#6b7280;font-weight:bold", // tag
        "color:#3b82f6", // label
        "color:#9ca3af", // module id
        "color:#6b7280", // type
      )
      // eslint-disable-next-line no-console
      console.log(event)
      // eslint-disable-next-line no-console
      console.groupEnd()
    })
  }

  if (event.type === "lifecycle:error") {
    const moduleId = event.moduleId ?? "unknown"
    const causePretty = (() => {
      try {
        return Cause.pretty(event.cause as Cause.Cause<unknown>, { renderErrorCause: true })
      } catch {
        try {
          return JSON.stringify(event.cause, null, 2)
        } catch {
        return String(event.cause)
      }
    }
  })()

    const key = `${moduleId}|${causePretty}`
    if (browserLifecycleSeen.has(key)) {
      return Effect.void
    }
    browserLifecycleSeen.add(key)

    return Effect.sync(() => {
      // eslint-disable-next-line no-console
      console.groupCollapsed(
        "%c[Logix]%c lifecycle:error %c" + moduleId,
        "color:#ef4444;font-weight:bold", // tag
        "color:#ef4444", // label
        "color:#9ca3af", // module id
      )
      // eslint-disable-next-line no-console
      console.error(causePretty)
      // eslint-disable-next-line no-console
      console.groupEnd()
    })
  }

  if (event.type === "diagnostic") {
    const moduleId = event.moduleId ?? "unknown"
    const detail = `code=${event.code} message=${event.message}${
      event.actionTag ? ` action=${event.actionTag}` : ""
    }${event.hint ? `\nhint: ${event.hint}` : ""}`

    const color =
      event.severity === "warning"
        ? "color:#d97706"
        : event.severity === "info"
          ? "color:#3b82f6"
          : "color:#ef4444"

    const label =
      event.severity === "warning"
        ? "diagnostic(warning)"
        : event.severity === "info"
          ? "diagnostic(info)"
          : "diagnostic(error)"

    const key = `${moduleId}|${event.code}|${event.message}`
    if (browserDiagnosticSeen.has(key)) {
      return Effect.void
    }
    browserDiagnosticSeen.add(key)

    return Effect.sync(() => {
      // eslint-disable-next-line no-console
      console.groupCollapsed(
        "%c[Logix]%c " + label + "%c module=" + moduleId,
        "color:#6b7280;font-weight:bold",
        color,
        "color:#9ca3af",
      )
      // eslint-disable-next-line no-console
      console.log(detail)
      // eslint-disable-next-line no-console
      console.groupEnd()
    })
  }

  // 其他事件：默认不在浏览器控制台输出，以免在业务开发场景中过于吵闹；
  // 如需查看内部调试事件，可通过自定义 Debug Sink 或在 Node 环境下使用 consoleLayer。
  return Effect.void
}

/**
 * 浏览器 Console 调试层：
 * - 在浏览器环境下使用 console.groupCollapsed + 彩色 label 模拟 pretty logger 的分组效果；
 * - 在非浏览器环境下回退到 consoleLayer 的 Effect 日志实现。
 */
const browserConsoleSink: Sink = {
  record: (event: Event) => {
    if (!isBrowser) {
      // 非浏览器环境：退回到 Effect.log* 的 consoleLayer 行为
      return event.type === "lifecycle:error"
        ? lifecycleErrorLog(event)
        : event.type === "diagnostic"
          ? diagnosticLog(event)
          : Effect.logDebug({ debugEvent: event })
    }

    return renderBrowserConsoleEvent(event)
  },
}

export const browserConsoleLayer = Layer.locallyScoped(currentDebugSinks, [browserConsoleSink])

/**
 * 浏览器友好的 Logger 层：使用 Effect 官方的 pretty logger（browser 模式）替换默认 logger。
 * - 不再手写 console 样式，直接复用 Effect 的彩色/分组格式；
 * - 在服务端环境下也能安全退化为默认 logger。
 */
export const browserPrettyLoggerLayer = Logger.replace(
  Logger.defaultLogger,
  Logger.prettyLogger({ mode: "browser", colors: true })
)

/**
 * defaultLayer：
 * - 公共默认层，当前等同于 errorOnlyLayer；
 * - 仅记录 lifecycle:error，避免在默认情况下对 action/state 打印大量日志。
 */
export const defaultLayer = errorOnlyLayer

export const record = (event: Event) =>
  Effect.gen(function* () {
    const sinks = yield* FiberRef.get(currentDebugSinks)
    const runtimeLabel = yield* FiberRef.get(currentRuntimeLabel)

    const enriched: Event =
      runtimeLabel && event.runtimeLabel === undefined
        ? ({ ...event, runtimeLabel } as Event)
        : event

    if (sinks.length > 0) {
      yield* Effect.forEach(
        sinks,
        (sink) => sink.record(enriched),
        {
          discard: true,
        },
      )
      return
    }

    if (isBrowser) {
      yield* renderBrowserConsoleEvent(enriched)
      return
    }
    if (enriched.type === "lifecycle:error") {
      yield* lifecycleErrorLog(enriched)
      return
    }
    if (enriched.type === "diagnostic") {
      yield* diagnosticLog(enriched)
      return
    }
    yield* Effect.void
  })
