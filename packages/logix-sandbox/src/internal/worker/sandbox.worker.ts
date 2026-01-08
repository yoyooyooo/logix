/**
 * Sandbox Worker entry (internal use).
 *
 * Responsibilities:
 * - Receives Host commands (INIT/COMPILE/RUN/TERMINATE)
 * - Initializes esbuild-wasm and rewrites dependencies based on kernelUrl
 * - Compiles user code (optional)
 * - Runs the compiled bundle and collects LOG/TRACE/ERROR/COMPLETE events
 */

import { compile, initCompiler, isInitialized, setKernelPath, setLogixCoreSubpaths } from '../compiler/index.js'
import type {
  SandboxCommand,
  SandboxEvent,
  LogEvent,
  TraceEvent,
  CompleteEvent,
  ErrorEvent,
  ReadyEvent,
  CompileResultEvent,
} from '../../Protocol.js'
import type { LogEntry, TraceSpan, MockManifest, HttpMockRule, UiIntentPacket } from '../../Types.js'

const VERSION = '0.2.0'
const DEFAULT_WASM_URL = '/esbuild.wasm'
const DEFAULT_KERNEL_URL = '/sandbox/logix-core.js'
const DEFAULT_EFFECT_URL = '/sandbox/effect.js'

let compiledBundle: string | null = null
let currentRunId: string | null = null
let runStartTime = 0
let currentMockManifest: MockManifest | undefined
let uiIntents: Array<UiIntentPacket> = []
let currentKernelUrl = DEFAULT_KERNEL_URL
let currentEffectUrl = DEFAULT_EFFECT_URL

const toAbsoluteUrl = (value: string): string => {
  try {
    return new URL(value).toString()
  } catch {
    // fallthrough
  }

  try {
    // eslint-disable-next-line no-restricted-globals
    const baseHref = self.location?.href
    if (typeof baseHref === 'string' && baseHref.length > 0) {
      const base = new URL(baseHref)
      const origin = base.origin !== 'null' ? base.origin : undefined
      if (origin) {
        return new URL(value, origin).toString()
      }
      if (base.protocol === 'http:' || base.protocol === 'https:') {
        return new URL(value, base.href).toString()
      }
    }
  } catch {
    // fallthrough
  }

  return value
}

const toSiblingUrl = (baseUrl: string, fileName: string): string => {
  const absoluteBaseUrl = toAbsoluteUrl(baseUrl)
  try {
    if (absoluteBaseUrl.startsWith('http://') || absoluteBaseUrl.startsWith('https://')) {
      return new URL(`./${fileName}`, absoluteBaseUrl).toString()
    }
  } catch {
    // fallthrough
  }

  const trimmed = absoluteBaseUrl.split('?')[0].split('#')[0]
  const lastSlash = trimmed.lastIndexOf('/')
  if (lastSlash >= 0) {
    return `${trimmed.slice(0, lastSlash)}/${fileName}`
  }
  return `/${fileName}`
}

// ============================================================================ //
// Event reporting
// ============================================================================ //

const postEvent = (event: SandboxEvent): void => {
  // eslint-disable-next-line no-restricted-globals
  self.postMessage(event)
}

const postReady = (compilerReady: boolean): void =>
  postEvent({
    type: 'READY',
    payload: { version: VERSION, compilerReady },
  } satisfies ReadyEvent)

const postCompileResult = (success: boolean, bundle?: string, errors?: string[]): void =>
  postEvent({
    type: 'COMPILE_RESULT',
    payload: { success, bundle, errors },
  } satisfies CompileResultEvent)

const postLog = (entry: LogEntry): void =>
  postEvent({
    type: 'LOG',
    payload: entry,
  } satisfies LogEvent)

const postTrace = (span: TraceSpan): void =>
  postEvent({
    type: 'TRACE',
    payload: span,
  } satisfies TraceEvent)

const postUiIntent = (packet: UiIntentPacket): void => {
  uiIntents.push(packet)
  postEvent({
    type: 'UI_INTENT',
    payload: packet,
  })
}

const postError = (
  code: 'INIT_FAILED' | 'RUNTIME_ERROR' | 'TIMEOUT' | 'WORKER_TERMINATED',
  message: string,
  stack?: string,
): void =>
  postEvent({
    type: 'ERROR',
    payload: { code, message, stack },
  } satisfies ErrorEvent)

const postComplete = (runId: string, duration: number, stateSnapshot?: unknown): void =>
  postEvent({
    type: 'COMPLETE',
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
  if (typeof arg === 'string' || typeof arg === 'number' || typeof arg === 'boolean') return arg
  if (arg instanceof Error) {
    return { __type: 'Error', name: arg.name, message: arg.message, stack: arg.stack }
  }
  try {
    return JSON.parse(JSON.stringify(arg))
  } catch {
    return String(arg)
  }
}

const setupConsoleProxy = (): void => {
  const createProxy =
    (level: LogEntry['level']) =>
    (...args: unknown[]) => {
      originalConsole[level](...args)
      postLog({
        level,
        args: args.map(serializeArg),
        timestamp: Date.now(),
        source: 'console',
      })
    }

  console.log = createProxy('info')
  console.info = createProxy('info')
  console.warn = createProxy('warn')
  console.error = createProxy('error')
  console.debug = createProxy('debug')
}

// ============================================================================ //
// Effect Logger -> LOG event
// ============================================================================ //

const logLevelToString = (LogLevel: any, level: any): LogEntry['level'] => {
  if (LogLevel.greaterThanEqual(level, LogLevel.Error)) return 'error'
  if (LogLevel.greaterThanEqual(level, LogLevel.Warning)) return 'warn'
  if (LogLevel.greaterThanEqual(level, LogLevel.Info)) return 'info'
  return 'debug'
}

// ============================================================================ //
// Trace collection (simplified)
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
    status: 'running',
  })
  return spanId
}

const endSpan = (spanId: string, status: 'success' | 'error' | 'cancelled' = 'success'): void => {
  postTrace({
    spanId,
    name: '',
    startTime: 0,
    endTime: Date.now(),
    status,
  })
}

const recordHttpTrace = (attrs: {
  url: string
  method: string
  mode: 'mock' | 'real'
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
    status: 'success',
    attributes: {
      kind: 'http',
      url: attrs.url,
      method: attrs.method,
      mode: attrs.mode,
      status: attrs.status,
      delayMs: attrs.delayMs,
    },
  })
}

const recordDebugTrace = (event: unknown): void => {
  postLog({ level: 'debug', source: 'logix', args: [event], timestamp: Date.now() })
  const eventType = (event as any)?.type
  if (typeof eventType === 'string' && eventType.startsWith('trace:')) {
    postTrace({
      spanId: generateSpanId(),
      name: eventType,
      startTime: Date.now(),
      status: 'success',
      attributes: { ...(typeof event === 'object' && event ? event : {}), kind: 'logix-debug' },
    })
  }
}

const recordSpyTrace = (payload: Record<string, unknown>): void => {
  const now = Date.now()
  postTrace({
    spanId: generateSpanId(),
    name: typeof payload?.name === 'string' ? payload.name : 'spy',
    startTime: now,
    endTime: now,
    status: 'success',
    attributes: { kind: 'spy', ...payload },
  })
}

const recordUiIntentTrace = (packet: UiIntentPacket): void => {
  const now = Date.now()
  postTrace({
    spanId: generateSpanId(),
    name: `ui:${packet.component}:${packet.intent}`,
    startTime: now,
    endTime: now,
    status: 'success',
    intentId: packet.id,
    stepId: packet.meta?.stepId,
    attributes: {
      kind: 'ui-intent',
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

let logixDebugSinkInstalled = false
let logixDebugSink: { readonly record: (event: unknown) => any } | undefined

const resolveLogixDebugSink = async (
  EffectRuntime: (typeof import('effect'))['Effect'],
): Promise<{ applyDebug: <A, E, R>(effect: any) => any } | null> => {
  try {
    const logix = await import(/* @vite-ignore */ currentKernelUrl)
    if (!logix?.Debug?.internal?.currentDebugSinks) {
      return null
    }

    // NOTE: Logix Runtime inside Sandbox may create a new root fiber via Effect.runPromise;
    // FiberRef.locally does not affect those fibers, so we need to patch FiberRef.initial here.
    if (!logixDebugSink) {
      logixDebugSink = {
        record: (event: unknown) => EffectRuntime.sync(() => recordDebugTrace(event)),
      }
    }

    if (!logixDebugSinkInstalled) {
      const sinksRef = logix.Debug.internal.currentDebugSinks as any
      const initialSinks: unknown = sinksRef.initial
      const base = Array.isArray(initialSinks) ? (initialSinks as ReadonlyArray<unknown>) : []
      if (!base.includes(logixDebugSink)) {
        sinksRef.initial = [...base, logixDebugSink]
      }

      const diagnosticsRef = logix.Debug.internal.currentDiagnosticsLevel as any
      if (diagnosticsRef.initial === 'off') {
        diagnosticsRef.initial = 'light'
      }

      logixDebugSinkInstalled = true
    }

    return {
      applyDebug: <A, E, R>(effect: any) => effect,
    }
  } catch {
    return null
  }
}

type LogixSandboxBridge = {
  readonly emitUiIntent: (packet: UiIntentPacket) => void
  readonly emitSpy: (payload: Record<string, unknown>) => void
}

const LOGIX_SANDBOX_BRIDGE = Symbol.for('@logixjs/sandbox/bridge')

const defineHidden = (target: object, key: PropertyKey, value: unknown): void => {
  Object.defineProperty(target, key, {
    value,
    enumerable: false,
    configurable: true,
    writable: false,
  })
}

// Sandbox Worker Bridge (a future bidirectional protocol entry):
// - Worker exposes a stable global bridge object for user code / Semantic UI Mock / Universal Spy.
// - Avoid `__*` magic fields to prevent confusion with the internal contract system from 020.
// - Entry points:
//   - `globalThis.logixSandboxBridge.emitUiIntent(packet)`
//   - `globalThis.logixSandboxBridge.emitSpy(payload)`
const installSandboxBridge = (): void => {
  const bridge: LogixSandboxBridge = Object.freeze({
    emitUiIntent: (packet: UiIntentPacket) => {
      try {
        postUiIntent(packet)
        recordUiIntentTrace(packet)
      } catch {
        // ignore malformed packets
      }
    },
    emitSpy: (payload: Record<string, unknown>) => {
      try {
        recordSpyTrace(payload ?? {})
      } catch {
        // ignore malformed packets
      }
    },
  })

  defineHidden(globalThis as any, LOGIX_SANDBOX_BRIDGE, bridge)
  defineHidden(globalThis as any, 'logixSandboxBridge', bridge)
}

installSandboxBridge()

// ============================================================================ //
// HTTP Mock (minimal): intercept fetch based on MockManifest.http
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
      const url = typeof input === 'string' || input instanceof URL ? String(input) : input.url
      const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase()

      const rule = findRule(url, method)
      if (!rule) {
        const start = Date.now()
        const resp = await globalFetch(input as any, init as any)
        recordHttpTrace({
          url,
          method,
          mode: 'real',
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
        mode: 'mock',
        status: rule.status ?? 200,
        delayMs: rule.delayMs,
      })
      return new Response(body, {
        status: rule.status ?? 200,
        headers: body === null ? undefined : { 'Content-Type': 'application/json' },
      })
    } catch {
      return globalFetch(input as any, init as any)
    }
  }
}

// ============================================================================ //
// Command handling
// ============================================================================ //

async function handleInit(wasmUrl?: string, kernelUrl?: string): Promise<void> {
  setupConsoleProxy()
  try {
    await initCompiler(wasmUrl ?? DEFAULT_WASM_URL)
    currentKernelUrl = toAbsoluteUrl(kernelUrl ?? DEFAULT_KERNEL_URL)
    currentEffectUrl = toSiblingUrl(currentKernelUrl, 'effect.js')
    setKernelPath(currentKernelUrl)
    const manifestUrl = toSiblingUrl(currentKernelUrl, 'logix-core.manifest.json')
    const res = await fetch(manifestUrl)
    if (!res.ok) {
      throw new Error(
        `加载 @logixjs/core 子路径清单失败: ${String(res.status)} ${String(res.statusText)} (${manifestUrl})`,
      )
    }
    const json: any = await res.json()
    if (!json || !Array.isArray(json.specifiers)) {
      throw new Error(`@logixjs/core 子路径清单格式非法: ${manifestUrl}`)
    }
    setLogixCoreSubpaths(json.specifiers)
    postReady(true)
  } catch (error) {
    postError('INIT_FAILED', error instanceof Error ? error.message : String(error))
  }
}

async function handleCompile(code: string, filename?: string, mockManifest?: MockManifest): Promise<void> {
  if (!isInitialized()) {
    postCompileResult(false, undefined, ['编译器未初始化'])
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
      throw new Error('无可用的编译产物，请先执行 COMPILE')
    }

    // Configure HTTP mock based on the MockManifest provided by the most recent COMPILE.
    setupHttpProxy(currentMockManifest)

    const blob = new Blob([compiledBundle], { type: 'application/javascript' })
    const blobUrl = URL.createObjectURL(blob)
    const module = await import(/* @vite-ignore */ blobUrl)
    URL.revokeObjectURL(blobUrl)

    if (!module.default) {
      throw new Error('编译产物缺少 default 导出')
    }

    const program = module.default
    const {
      Effect: EffectRuntime,
      Logger,
      LogLevel,
    } = (await import(/* @vite-ignore */ currentEffectUrl)) as unknown as typeof import('effect')
    const SandboxLogger = Logger.make<unknown, void>(({ logLevel, message }: any) => {
      const level = logLevelToString(LogLevel, logLevel)
      postLog({ level, args: [message], timestamp: Date.now(), source: 'effect' })
    })
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

    const result = await EffectRuntime.runPromise(effectToRun as any)

    const duration = Date.now() - runStartTime
    endSpan(rootSpanId, 'success')
    postComplete(runId, duration, result)
  } catch (error) {
    const duration = Date.now() - runStartTime
    endSpan(rootSpanId, 'error')
    postError(
      'RUNTIME_ERROR',
      error instanceof Error ? error.message : String(error),
      error instanceof Error ? error.stack : undefined,
    )
    postComplete(runId, duration)
  }
}

function handleTerminate(): void {
  if (currentRunId) {
    currentRunId = null
  }
}

async function handleUiCallback(payload: {
  runId: string
  intentId: string
  callback: string
  data?: unknown
}): Promise<void> {
  try {
    // For now we only record callbacks as TRACE+LOG; later we can standardize callback names and integrate with user code.
    postLog({
      level: 'info',
      args: [{ uiCallback: payload }],
      timestamp: Date.now(),
      source: 'logix',
    })
    postTrace({
      spanId: generateSpanId(),
      name: `ui:callback:${payload.callback}`,
      startTime: Date.now(),
      endTime: Date.now(),
      status: 'success',
      intentId: payload.intentId,
      attributes: {
        kind: 'ui-callback',
        callback: payload.callback,
        data: payload.data,
        runId: payload.runId,
      },
    })
    postEvent({
      type: 'UI_CALLBACK_ACK',
      payload: {
        runId: payload.runId,
        intentId: payload.intentId,
        callback: payload.callback,
        accepted: true,
      },
    } as any)
  } catch (err) {
    postEvent({
      type: 'UI_CALLBACK_ACK',
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
// Message listener
// ============================================================================ //

// eslint-disable-next-line no-restricted-globals
self.onmessage = async (e: MessageEvent<SandboxCommand>) => {
  const command = e.data
  switch (command.type) {
    case 'INIT':
      await handleInit(command.payload?.wasmUrl, command.payload?.kernelUrl)
      break
    case 'COMPILE':
      await handleCompile(command.payload.code, command.payload.filename, command.payload.mockManifest)
      break
    case 'RUN':
      await handleRun(command.payload.runId, command.payload.useCompiledCode)
      break
    case 'UI_CALLBACK':
      await handleUiCallback(command.payload)
      break
    case 'TERMINATE':
      handleTerminate()
      break
  }
}

console.log('[Sandbox] Worker 脚本已加载')
