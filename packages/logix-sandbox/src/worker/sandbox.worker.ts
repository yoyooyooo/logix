/**
 * Sandbox Worker 入口（库内部使用）
 *
 * 职责：
 * - 接收 Host 命令（INIT/COMPILE/RUN/TERMINATE）
 * - 初始化 esbuild-wasm，并根据 kernelUrl 重写依赖
 * - 编译用户代码（可选）
 * - 运行已编译的 bundle，收集 LOG/TRACE/ERROR/COMPLETE 事件
 */

import { Effect, Logger, LogLevel } from "effect"
import { compile, initCompiler, isInitialized, setKernelPath } from "../compiler.js"
import type {
  SandboxCommand,
  SandboxEvent,
  LogEvent,
  TraceEvent,
  CompleteEvent,
  ErrorEvent,
  ReadyEvent,
  CompileResultEvent,
} from "../protocol.js"
import type { LogEntry, TraceSpan, MockManifest, HttpMockRule, UiIntentPacket } from "../types.js"

const VERSION = "0.2.0"
const DEFAULT_WASM_URL = "/esbuild.wasm"
const DEFAULT_KERNEL_URL = "/sandbox/logix-core.js"

let compiledBundle: string | null = null
let currentRunId: string | null = null
let runStartTime = 0
let currentMockManifest: MockManifest | undefined
let uiIntents: Array<UiIntentPacket> = []
let currentKernelUrl = DEFAULT_KERNEL_URL

// ============================================================================ //
// 事件上报
// ============================================================================ //

const postEvent = (event: SandboxEvent): void => {
  // eslint-disable-next-line no-restricted-globals
  self.postMessage(event)
}

const postReady = (compilerReady: boolean): void =>
  postEvent({
    type: "READY",
    payload: { version: VERSION, compilerReady },
  } satisfies ReadyEvent)

const postCompileResult = (success: boolean, bundle?: string, errors?: string[]): void =>
  postEvent({
    type: "COMPILE_RESULT",
    payload: { success, bundle, errors },
  } satisfies CompileResultEvent)

const postLog = (entry: LogEntry): void =>
  postEvent({
    type: "LOG",
    payload: entry,
  } satisfies LogEvent)

const postTrace = (span: TraceSpan): void =>
  postEvent({
    type: "TRACE",
    payload: span,
  } satisfies TraceEvent)

const postUiIntent = (packet: UiIntentPacket): void => {
  uiIntents.push(packet)
  postEvent({
    type: "UI_INTENT",
    payload: packet,
  })
}

const postError = (code: "INIT_FAILED" | "RUNTIME_ERROR" | "TIMEOUT" | "WORKER_TERMINATED", message: string, stack?: string): void =>
  postEvent({
    type: "ERROR",
    payload: { code, message, stack },
  } satisfies ErrorEvent)

const postComplete = (runId: string, duration: number, stateSnapshot?: unknown): void =>
  postEvent({
    type: "COMPLETE",
    payload: { runId, duration, stateSnapshot },
  } satisfies CompleteEvent)

// ============================================================================ //
// Console Proxy
// ============================================================================ //

const originalConsole = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  debug: console.debug.bind(console),
}

const serializeArg = (arg: unknown): unknown => {
  if (arg === null || arg === undefined) return arg
  if (typeof arg === "string" || typeof arg === "number" || typeof arg === "boolean") return arg
  if (arg instanceof Error) {
    return { __type: "Error", name: arg.name, message: arg.message, stack: arg.stack }
  }
  try {
    return JSON.parse(JSON.stringify(arg))
  } catch {
    return String(arg)
  }
}

const setupConsoleProxy = (): void => {
  const createProxy =
    (level: LogEntry["level"]) =>
    (...args: unknown[]) => {
      originalConsole[level](...args)
      postLog({
        level,
        args: args.map(serializeArg),
        timestamp: Date.now(),
        source: "console",
      })
    }

  console.log = createProxy("info")
  console.info = createProxy("info")
  console.warn = createProxy("warn")
  console.error = createProxy("error")
  console.debug = createProxy("debug")
}

// ============================================================================ //
// Effect Logger → LOG 事件
// ============================================================================ //

const SandboxLogger = Logger.make<unknown, void>(({ logLevel, message }) => {
  const level = logLevelToString(logLevel)
  postLog({ level, args: [message], timestamp: Date.now(), source: "effect" })
})

const logLevelToString = (level: LogLevel.LogLevel): LogEntry["level"] => {
  if (LogLevel.greaterThanEqual(level, LogLevel.Error)) return "error"
  if (LogLevel.greaterThanEqual(level, LogLevel.Warning)) return "warn"
  if (LogLevel.greaterThanEqual(level, LogLevel.Info)) return "info"
  return "debug"
}

// ============================================================================ //
// Trace 收集（简化版）
// ============================================================================ //

let traceIdCounter = 0
const generateSpanId = (): string => `span-${++traceIdCounter}-${Date.now()}`

const startSpan = (name: string, parentSpanId?: string): string => {
  const spanId = generateSpanId()
  postTrace({
    spanId,
    parentSpanId,
    name,
    startTime: Date.now(),
    status: "running",
  })
  return spanId
}

const endSpan = (spanId: string, status: "success" | "error" | "cancelled" = "success"): void => {
  postTrace({
    spanId,
    name: "",
    startTime: 0,
    endTime: Date.now(),
    status,
  })
}

const recordHttpTrace = (attrs: {
  url: string
  method: string
  mode: "mock" | "real"
  status?: number
  delayMs?: number
  duration?: number
}): void => {
  const now = Date.now()
  postTrace({
    spanId: generateSpanId(),
    name: `http ${attrs.method}`,
    startTime: now - (attrs.duration ?? 0),
    endTime: now,
    status: "success",
    attributes: {
      kind: "http",
      url: attrs.url,
      method: attrs.method,
      mode: attrs.mode,
      status: attrs.status,
      delayMs: attrs.delayMs,
    },
  })
}

const recordDebugTrace = (event: unknown): void => {
  postLog({ level: "debug", source: "logix", args: [event], timestamp: Date.now() })
  const eventType = (event as any)?.type
  if (typeof eventType === "string" && eventType.startsWith("trace:")) {
    postTrace({
      spanId: generateSpanId(),
      name: eventType,
      startTime: Date.now(),
      status: "success",
      attributes: { ...(typeof event === "object" && event ? event : {}), kind: "logix-debug" },
    })
  }
}

const recordSpyTrace = (payload: Record<string, unknown>): void => {
  const now = Date.now()
  postTrace({
    spanId: generateSpanId(),
    name: typeof payload?.name === "string" ? payload.name : "spy",
    startTime: now,
    endTime: now,
    status: "success",
    attributes: { kind: "spy", ...payload },
  })
}

const recordUiIntentTrace = (packet: UiIntentPacket): void => {
  const now = Date.now()
  postTrace({
    spanId: generateSpanId(),
    name: `ui:${packet.component}:${packet.intent}`,
    startTime: now,
    endTime: now,
    status: "success",
    intentId: packet.id,
    stepId: packet.meta?.stepId,
    attributes: {
      kind: "ui-intent",
      id: packet.id,
      component: packet.component,
      intent: packet.intent,
      storyId: packet.meta?.storyId,
      label: packet.meta?.label,
      severity: packet.meta?.severity,
      tags: packet.meta?.tags,
    },
  })
}

const resolveLogixDebugSink = async (
  EffectRuntime: typeof import("effect")["Effect"],
): Promise<{ applyDebug: <A, E, R>(effect: any) => any } | null> => {
  try {
    const logix = await import(/* @vite-ignore */ currentKernelUrl)
    if (!logix?.Debug?.internal?.currentDebugSinks) {
      return null
    }
    const applyDebug = <A, E, R>(effect: any) =>
      EffectRuntime.locally(
        logix.Debug.internal.currentDebugSinks as any,
        [
          {
            record: (event: unknown) =>
              EffectRuntime.sync(() => recordDebugTrace(event)),
          },
        ],
      )(effect)
    return { applyDebug }
  } catch {
    return null
  }
}

// 为未来的 Semantic UI Mock 在 Worker 环境中提供一个全局桥接函数：
// 业务/Mock 代码可以调用 self.__logixSandboxUiIntent(packet) 来发出 UI_INTENT。
;(self as any).__logixSandboxUiIntent =
  (packet: UiIntentPacket) => {
    try {
      postUiIntent(packet)
      recordUiIntentTrace(packet)
    } catch {
      // ignore malformed packets
    }
  }

// Spy 桥接：便于在用户代码或未来的 Universal Spy 插桩中上报观测事件。
;(self as any).__logixSandboxSpy =
  (payload: Record<string, unknown>) => {
    try {
      recordSpyTrace(payload ?? {})
    } catch {
      // ignore malformed packets
    }
  }

// ============================================================================ //
// HTTP Mock（最小版）：基于 MockManifest.http 拦截 fetch
// ============================================================================ //

const setupHttpProxy = (manifest?: MockManifest): void => {
  // eslint-disable-next-line no-restricted-globals
  const globalFetch: typeof fetch | undefined = (self as any).fetch
  if (!globalFetch) {
    return
  }

  const rules = manifest?.http
  if (!rules || rules.length === 0) {
    ;(self as any).fetch = globalFetch
    return
  }

  const findRule = (url: string, method: string): HttpMockRule | undefined => {
    const upper = method.toUpperCase()
    return rules.find((rule) => {
      const ruleMethod = rule.method ? rule.method.toUpperCase() : undefined
      const methodOk = !ruleMethod || ruleMethod === upper
      return methodOk && rule.url === url
    })
  }

  ;(self as any).fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    try {
      const url =
        typeof input === "string" || input instanceof URL
          ? String(input)
          : input.url
      const method =
        (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase()

      const rule = findRule(url, method)
      if (!rule) {
        const start = Date.now()
        const resp = await globalFetch(input as any, init as any)
        recordHttpTrace({
          url,
          method,
          mode: "real",
          status: resp.status,
          duration: Date.now() - start,
        })
        return resp
      }

      if (rule.delayMs && rule.delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, rule.delayMs))
      }

      const body = rule.json === undefined ? null : JSON.stringify(rule.json)
      recordHttpTrace({
        url,
        method,
        mode: "mock",
        status: rule.status ?? 200,
        delayMs: rule.delayMs,
      })
      return new Response(body, {
        status: rule.status ?? 200,
        headers: body === null ? undefined : { "Content-Type": "application/json" },
      })
    } catch {
      return globalFetch(input as any, init as any)
    }
  }
}

// ============================================================================ //
// 命令处理
// ============================================================================ //

async function handleInit(wasmUrl?: string, kernelUrl?: string): Promise<void> {
  setupConsoleProxy()
  try {
    await initCompiler(wasmUrl ?? DEFAULT_WASM_URL)
    currentKernelUrl = kernelUrl ?? DEFAULT_KERNEL_URL
    setKernelPath(currentKernelUrl)
    postReady(true)
  } catch (error) {
    postError("INIT_FAILED", error instanceof Error ? error.message : String(error))
  }
}

async function handleCompile(code: string, filename?: string, mockManifest?: MockManifest): Promise<void> {
  if (!isInitialized()) {
    postCompileResult(false, undefined, ["编译器未初始化"])
    return
  }
  currentMockManifest = mockManifest
  const result = await compile(code, filename)
  if (result.success) {
    compiledBundle = result.bundle
    postCompileResult(true, result.bundle)
  } else {
    postCompileResult(false, undefined, result.errors)
  }
}

async function handleRun(runId: string, useCompiledCode?: boolean): Promise<void> {
  currentRunId = runId
  runStartTime = Date.now()
  const rootSpanId = startSpan(`run:${runId}`)
  uiIntents = []

  try {
    if (!useCompiledCode || !compiledBundle) {
      throw new Error("无可用的编译产物，请先执行 COMPILE")
    }

    // 基于最近一次 COMPILE 提供的 MockManifest 设置 HTTP Mock
    setupHttpProxy(currentMockManifest)

    const blob = new Blob([compiledBundle], { type: "application/javascript" })
    const blobUrl = URL.createObjectURL(blob)
    const module = await import(/* @vite-ignore */ blobUrl)
    URL.revokeObjectURL(blobUrl)

    if (!module.default) {
      throw new Error("编译产物缺少 default 导出")
    }

    const program = module.default
    const { Effect: EffectRuntime } = await import("https://esm.sh/effect@3.19.8")
    const debugIntegration = await resolveLogixDebugSink(EffectRuntime)

    let effectToRun = EffectRuntime.gen(function* () {
      const res = yield* program
      return res
    }).pipe(
      EffectRuntime.provide(Logger.replace(Logger.defaultLogger, SandboxLogger)),
      EffectRuntime.withSpan(`sandbox:${runId}`),
    )

    if (debugIntegration) {
      effectToRun = debugIntegration.applyDebug(effectToRun)
    }

    const result = await EffectRuntime.runPromise(effectToRun)

    const duration = Date.now() - runStartTime
    endSpan(rootSpanId, "success")
    postComplete(runId, duration, result)
  } catch (error) {
    const duration = Date.now() - runStartTime
    endSpan(rootSpanId, "error")
    postError("RUNTIME_ERROR", error instanceof Error ? error.message : String(error), error instanceof Error ? error.stack : undefined)
    postComplete(runId, duration)
  }
}

function handleTerminate(): void {
  if (currentRunId) {
    currentRunId = null
  }
}

async function handleUiCallback(payload: { runId: string; intentId: string; callback: string; data?: unknown }): Promise<void> {
  try {
    // 目前仅将回调作为 TRACE+LOG 记录，后续可约定回调函数名与用户代码对接
    postLog({
      level: "info",
      args: [{ uiCallback: payload }],
      timestamp: Date.now(),
      source: "logix",
    })
    postTrace({
      spanId: generateSpanId(),
      name: `ui:callback:${payload.callback}`,
      startTime: Date.now(),
      endTime: Date.now(),
      status: "success",
      intentId: payload.intentId,
      attributes: {
        kind: "ui-callback",
        callback: payload.callback,
        data: payload.data,
        runId: payload.runId,
      },
    })
    postEvent({
      type: "UI_CALLBACK_ACK",
      payload: {
        runId: payload.runId,
        intentId: payload.intentId,
        callback: payload.callback,
        accepted: true,
      },
    } as any)
  } catch (err) {
    postEvent({
      type: "UI_CALLBACK_ACK",
      payload: {
        runId: payload.runId,
        intentId: payload.intentId,
        callback: payload.callback,
        accepted: false,
        message: err instanceof Error ? err.message : String(err),
      },
    } as any)
  }
}

// ============================================================================ //
// 消息监听
// ============================================================================ //

// eslint-disable-next-line no-restricted-globals
self.onmessage = async (e: MessageEvent<SandboxCommand>) => {
  const command = e.data
  switch (command.type) {
    case "INIT":
      await handleInit(command.payload?.wasmUrl, command.payload?.kernelUrl)
      break
    case "COMPILE":
      await handleCompile(command.payload.code, command.payload.filename, command.payload.mockManifest)
      break
    case "RUN":
      await handleRun(command.payload.runId, command.payload.useCompiledCode)
      break
    case "UI_CALLBACK":
      await handleUiCallback(command.payload)
      break
    case "TERMINATE":
      handleTerminate()
      break
  }
}

console.log("[Sandbox] Worker 脚本已加载")
