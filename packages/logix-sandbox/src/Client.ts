import type {
  SandboxCommand,
  SandboxEvent,
  InitCommand,
  CompileCommand,
  RunCommand,
  UiCallbackCommand,
} from './Protocol.js'
import {
  SANDBOX_PROTOCOL_VERSION,
  decodeSandboxEvent,
  isReadyEvent,
  isCompileResultEvent,
  isLogEvent,
  isTraceEvent,
  isUiIntentEvent,
  isUiCallbackAckEvent,
  isErrorEvent,
  isCompleteEvent,
} from './Protocol.js'
import type {
  KernelId,
  KernelRegistry,
  KernelSelection,
  KernelVariant,
  DiagnosticsLevel,
  LogEntry,
  TraceSpan,
  RunResult,
  SandboxErrorInfo,
  SandboxStatus,
  MockManifest,
  UiIntentPacket,
} from './Types.js'

type KernelRunOptions = {
  readonly kernelId?: KernelId
  readonly strict?: boolean
  readonly allowFallback?: boolean
}

type KernelMode =
  | {
      readonly _tag: 'single'
      readonly kernel: KernelVariant
    }
  | {
      readonly _tag: 'registry'
      readonly kernels: ReadonlyArray<KernelVariant>
      readonly kernelsById: ReadonlyMap<KernelId, KernelVariant>
      readonly defaultKernelId: KernelId
      readonly allowCrossOrigin: boolean
    }

export interface SandboxClientConfig {
  readonly workerUrl?: string
  readonly timeout?: number
  readonly wasmUrl?: string
  readonly kernelUrl?: string
  readonly kernelRegistry?: KernelRegistry
  /**
   * Bounded caches for logs/traces/uiIntents collected from the Worker.
   *
   * Defaults are chosen to be safe for docs/playground usage (avoid unbounded growth),
   * while still retaining enough context for debugging.
   */
  readonly maxLogs?: number
  readonly maxTraces?: number
  readonly maxUiIntents?: number
}

export interface SandboxClientState {
  readonly status: SandboxStatus
  readonly logs: ReadonlyArray<LogEntry>
  readonly traces: ReadonlyArray<TraceSpan>
  readonly error: SandboxErrorInfo | null
  readonly uiIntents: ReadonlyArray<UiIntentPacket>
}

type StateListener = (state: SandboxClientState) => void

const makeSandboxError = (info: SandboxErrorInfo): Error => Object.assign(new Error(info.message), { sandboxError: info })

const toSiblingUrl = (baseUrl: string, fileName: string): string => {
  try {
    if (baseUrl.startsWith('http://') || baseUrl.startsWith('https://')) {
      return new URL(`./${fileName}`, baseUrl).toString()
    }
  } catch {
    // fallthrough
  }

  const trimmed = baseUrl.split('?')[0].split('#')[0]
  const lastSlash = trimmed.lastIndexOf('/')
  if (lastSlash >= 0) {
    return `${trimmed.slice(0, lastSlash)}/${fileName}`
  }
  return `/${fileName}`
}

const isKernelId = (kernelId: string): boolean => /^[a-z0-9-]+$/.test(kernelId)

const isHttpUrl = (url: string): boolean => url.startsWith('http://') || url.startsWith('https://')

const isSameOriginHttp = (url: string): boolean => {
  if (!isHttpUrl(url)) return true
  if (typeof window === 'undefined' || !window.location?.origin) return true
  try {
    return new URL(url).origin === window.location.origin
  } catch {
    return false
  }
}

const extractKernelImplementationRef = (stateSnapshot: unknown): unknown => {
  if (typeof stateSnapshot !== 'object' || stateSnapshot === null || Array.isArray(stateSnapshot)) return undefined
  const env = (stateSnapshot as any).environment
  if (typeof env !== 'object' || env === null || Array.isArray(env)) return undefined
  const ref = (env as any).kernelImplementationRef
  if (typeof ref !== 'object' || ref === null || Array.isArray(ref)) return undefined
  return ref
}

export class SandboxClient {
  private worker: Worker | null = null
  private readonly workerUrlOverride: string | undefined
  private readonly timeout: number
  private readonly wasmUrl: string
  private readonly kernelMode: KernelMode
  private readonly maxLogs: number
  private readonly maxTraces: number
  private readonly maxUiIntents: number
  private notifyScheduled = false
  private runSeq = 0
  private activeKernelUrl: string | null = null
  private compiledKernelUrl: string | null = null
  private compiledKernelSelection: KernelSelection | null = null
  private readonly runKernelSelections = new Map<string, KernelSelection>()
  private initInFlight: Promise<void> | null = null
  private state: SandboxClientState = {
    status: 'idle',
    logs: [],
    traces: [],
    error: null,
    uiIntents: [],
  }
  private readonly listeners: Set<StateListener> = new Set()
  private readonly runResolvers = new Map<
    string,
    { resolve: (result: RunResult) => void; reject: (error: Error) => void }
  >()
  private compileResolver: {
    resolve: (result: { success: boolean; bundle?: string; errors?: string[] }) => void
    reject: (error: Error) => void
  } | null = null

  constructor(config: SandboxClientConfig = {}) {
    const normalizeLimit = (value: number | undefined, fallback: number): number => {
      if (value === undefined) return fallback
      if (!Number.isFinite(value)) return fallback
      return Math.max(0, Math.floor(value))
    }

    const defaultKernelUrl =
      typeof window !== 'undefined' && window.location
        ? `${window.location.origin}/sandbox/logix-core.js`
        : '/sandbox/logix-core.js'

    this.workerUrlOverride = config.workerUrl
    this.timeout = config.timeout ?? 10000
    this.wasmUrl = config.wasmUrl ?? '/esbuild.wasm'
    this.maxLogs = normalizeLimit(config.maxLogs, 500)
    this.maxTraces = normalizeLimit(config.maxTraces, 500)
    this.maxUiIntents = normalizeLimit(config.maxUiIntents, 200)

    if (config.kernelRegistry) {
      const allowCrossOrigin = config.kernelRegistry.allowCrossOrigin ?? false
      const kernels = Array.from(config.kernelRegistry.kernels ?? [])
      if (kernels.length === 0) {
        throw new Error('kernelRegistry.kernels must be a non-empty array')
      }

      const byId = new Map<KernelId, KernelVariant>()
      for (const k of kernels) {
        if (typeof k.kernelId !== 'string' || !isKernelId(k.kernelId)) {
          throw new Error(`invalid kernelId: ${String(k.kernelId)}`)
        }
        if (typeof k.kernelUrl !== 'string' || k.kernelUrl.length === 0) {
          throw new Error(`invalid kernelUrl for kernelId=${k.kernelId}`)
        }
        if (!allowCrossOrigin && !isSameOriginHttp(k.kernelUrl)) {
          throw new Error(`cross-origin kernelUrl is not allowed by default: ${k.kernelUrl}`)
        }
        if (byId.has(k.kernelId)) {
          throw new Error(`duplicate kernelId: ${k.kernelId}`)
        }
        byId.set(k.kernelId, k)
      }

      const defaultKernelId =
        config.kernelRegistry.defaultKernelId ?? (kernels.length === 1 ? kernels[0]!.kernelId : undefined)
      if (!defaultKernelId) {
        throw new Error('kernelRegistry.defaultKernelId is required when multiple kernels exist')
      }
      if (!isKernelId(defaultKernelId) || !byId.has(defaultKernelId)) {
        throw new Error(`invalid defaultKernelId: ${String(defaultKernelId)}`)
      }

      this.kernelMode = {
        _tag: 'registry',
        kernels,
        kernelsById: byId,
        defaultKernelId,
        allowCrossOrigin,
      }
    } else {
      const kernelUrl = config.kernelUrl ?? defaultKernelUrl
      this.kernelMode = {
        _tag: 'single',
        kernel: { kernelId: 'default', kernelUrl, label: 'default' },
      }
    }
  }

  private appendLog(entry: LogEntry): ReadonlyArray<LogEntry> {
    if (this.maxLogs <= 0) return this.state.logs.length === 0 ? this.state.logs : []
    const next = [...this.state.logs, entry]
    return next.length > this.maxLogs ? next.slice(next.length - this.maxLogs) : next
  }

  private appendUiIntent(packet: UiIntentPacket): ReadonlyArray<UiIntentPacket> {
    if (this.maxUiIntents <= 0) return this.state.uiIntents.length === 0 ? this.state.uiIntents : []
    const next = [...this.state.uiIntents, packet]
    return next.length > this.maxUiIntents ? next.slice(next.length - this.maxUiIntents) : next
  }

  private upsertTrace(span: TraceSpan): ReadonlyArray<TraceSpan> {
    if (this.maxTraces <= 0) return this.state.traces.length === 0 ? this.state.traces : []

    const existingIndex = this.state.traces.findIndex((t) => t.spanId === span.spanId)
    if (existingIndex >= 0) {
      const next = [...this.state.traces]
      next[existingIndex] = span
      return next
    }

    const next = [...this.state.traces, span]
    return next.length > this.maxTraces ? next.slice(next.length - this.maxTraces) : next
  }

  private flushListeners = (): void => {
    this.notifyScheduled = false
    this.listeners.forEach((listener) => listener(this.state))
  }

  private scheduleNotify = (): void => {
    if (this.listeners.size === 0) return
    if (this.notifyScheduled) return
    this.notifyScheduled = true

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(this.flushListeners)
      return
    }

    // Fallback for non-browser environments (or older runtimes)
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(this.flushListeners)
      return
    }

    setTimeout(this.flushListeners, 0)
  }

  private setState(updates: Partial<SandboxClientState>): void {
    this.state = { ...this.state, ...updates }
    this.scheduleNotify()
  }

  getState(): SandboxClientState {
    return this.state
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  listKernels(): { readonly kernels: ReadonlyArray<KernelVariant>; readonly defaultKernelId?: KernelId } {
    if (this.kernelMode._tag === 'registry') {
      return {
        kernels: this.kernelMode.kernels,
        defaultKernelId: this.kernelMode.defaultKernelId,
      }
    }

    return {
      kernels: [this.kernelMode.kernel],
      defaultKernelId: this.kernelMode.kernel.kernelId,
    }
  }

  private resolveKernelRun = (options?: KernelRunOptions): { kernelUrl: string; selection: KernelSelection } => {
    const strict = options?.strict ?? true
    const allowFallback = options?.allowFallback ?? false
    const requestedKernelId = options?.kernelId

    const { kernels, defaultKernelId } = this.listKernels()
    const availableKernelIds = kernels.map((k) => k.kernelId)
    const defaultId = defaultKernelId ?? availableKernelIds[0]!

    const resolveById = (kernelId: KernelId): KernelVariant | undefined => {
      if (this.kernelMode._tag === 'registry') return this.kernelMode.kernelsById.get(kernelId)
      return kernelId === this.kernelMode.kernel.kernelId ? this.kernelMode.kernel : undefined
    }

    if (!requestedKernelId) {
      const effectiveKernelId = defaultId
      const kernel = resolveById(effectiveKernelId)
      if (!kernel) {
        throw new Error(`defaultKernelId not found: ${String(effectiveKernelId)}`)
      }
      return {
        kernelUrl: kernel.kernelUrl,
        selection: { strict, effectiveKernelId },
      }
    }

    const requested = resolveById(requestedKernelId)
    if (requested) {
      return {
        kernelUrl: requested.kernelUrl,
        selection: { strict, requestedKernelId, effectiveKernelId: requestedKernelId },
      }
    }

    if (strict || !allowFallback) {
      const err: SandboxErrorInfo = {
        code: 'INIT_FAILED',
        message: `Kernel not available: requested=${requestedKernelId}, available=${availableKernelIds.join(',')}`,
        requestedKernelId,
        availableKernelIds,
      }
      throw Object.assign(new Error(err.message), { sandboxError: err })
    }

    const kernel = resolveById(defaultId)
    if (!kernel) {
      const err: SandboxErrorInfo = {
        code: 'INIT_FAILED',
        message: `Kernel fallback failed: defaultKernelId not found (${String(defaultId)})`,
        requestedKernelId,
        availableKernelIds,
      }
      throw Object.assign(new Error(err.message), { sandboxError: err })
    }

    return {
      kernelUrl: kernel.kernelUrl,
      selection: {
        strict: false,
        requestedKernelId,
        effectiveKernelId: defaultId,
        fallbackReason: `missingKernelId:${requestedKernelId}`,
      },
    }
  }

  private postCommand(command: SandboxCommand): void {
    if (!this.worker) {
      throw new Error('Worker 未初始化')
    }
    this.worker.postMessage(command)
  }

  private handleEvent = (event: MessageEvent<unknown>): void => {
    const decoded = decodeSandboxEvent(event.data)
    if (!decoded.ok) {
      const messageType =
        event.data && typeof event.data === 'object' && 'type' in (event.data as any) && typeof (event.data as any).type === 'string'
          ? ((event.data as any).type as string)
          : undefined
      const error: SandboxErrorInfo = {
        code: 'PROTOCOL_ERROR',
        message: '[Sandbox] 无法解析 Worker 事件',
        protocol: {
          direction: 'WorkerToHost',
          ...(messageType ? { messageType } : null),
          issues: decoded.issues,
        },
      }
      this.setState({ status: 'error', error })
      this.disposeWorker(Object.assign(new Error(error.message), { sandboxError: error }))
      return
    }

    const e = decoded.value

    if (isReadyEvent(e)) {
      this.setState({ status: 'ready' })
    } else if (isLogEvent(e)) {
      this.setState({ logs: this.appendLog(e.payload) })
    } else if (isTraceEvent(e)) {
      this.setState({ traces: this.upsertTrace(e.payload) })
    } else if (isUiIntentEvent(e)) {
      this.setState({ uiIntents: this.appendUiIntent(e.payload) })
    } else if (isUiCallbackAckEvent(e)) {
      // For now we only log; later this can be used to round-trip interaction state.
      this.setState({
        logs: this.appendLog({ level: 'info', args: [e.payload], timestamp: Date.now(), source: 'logix' }),
      })
    } else if (isErrorEvent(e)) {
      this.setState({ status: 'error', error: e.payload })
    } else if (isCompileResultEvent(e)) {
      if (this.compileResolver) {
        this.compileResolver.resolve(e.payload)
        this.compileResolver = null
      }
    } else if (isCompleteEvent(e)) {
      const payload = e.payload
      const runId = payload.runId

      const finalize = () => {
        this.setState({ status: 'completed' })

        const resolver = this.runResolvers.get(runId)
        if (!resolver) {
          return
        }

        const selection = this.runKernelSelections.get(runId)
        const kernelImplementationRef = extractKernelImplementationRef(payload.stateSnapshot)
        const effectiveKernelId = selection?.effectiveKernelId
        const derivedKernelImplementationRef =
          effectiveKernelId === 'core' || effectiveKernelId === 'core-ng'
            ? { kernelId: effectiveKernelId, packageName: '@logixjs/core' }
            : undefined
        this.runKernelSelections.delete(runId)
        resolver.resolve({
          runId: payload.runId,
          duration: payload.duration,
          requestedKernelId: selection?.requestedKernelId,
          effectiveKernelId: selection?.effectiveKernelId,
          fallbackReason: selection?.fallbackReason,
          kernelImplementationRef: kernelImplementationRef ?? derivedKernelImplementationRef,
          stateSnapshot: payload.stateSnapshot,
          traces: this.state.traces,
          logs: this.state.logs,
          uiIntents: this.state.uiIntents,
        })
        this.runResolvers.delete(runId)
      }

      finalize()
    }
  }

  private disposeWorker = (error?: Error): void => {
    if (!this.worker) return

    try {
      this.worker.terminate()
    } catch {
      // ignore
    }
    this.worker = null
    this.activeKernelUrl = null
    this.compiledKernelUrl = null
    this.compiledKernelSelection = null
    this.runKernelSelections.clear()

    if (this.compileResolver) {
      this.compileResolver.reject(error ?? new Error('WORKER_TERMINATED'))
      this.compileResolver = null
    }

    for (const [runId, resolver] of this.runResolvers) {
      resolver.reject(error ?? new Error('WORKER_TERMINATED'))
      this.runResolvers.delete(runId)
    }
  }

  private ensureInitialized = async (kernelUrl: string): Promise<void> => {
    if (this.worker && this.activeKernelUrl === kernelUrl && this.state.status !== 'error') return
    if (this.initInFlight) return this.initInFlight

    if (this.worker) {
      this.disposeWorker(new Error('WORKER_TERMINATED'))
    }

    this.setState({ status: 'initializing', logs: [], traces: [], error: null, uiIntents: [] })

    const initPromise = new Promise<void>((resolve, reject) => {
      try {
        const workerUrl = this.workerUrlOverride ?? toSiblingUrl(kernelUrl, 'worker.js')
        const worker = new Worker(workerUrl, { type: 'module' })
        this.worker = worker
        this.activeKernelUrl = kernelUrl

        worker.onmessage = this.handleEvent
        worker.onerror = (error) => {
          const info: SandboxErrorInfo = { code: 'INIT_FAILED', message: error.message }
          this.setState({ status: 'error', error: info })
          this.disposeWorker(makeSandboxError(info))
          reject(makeSandboxError(info))
        }

        const initCommand: InitCommand = {
          protocolVersion: SANDBOX_PROTOCOL_VERSION,
          type: 'INIT',
          payload: { wasmUrl: this.wasmUrl, kernelUrl },
        }
        this.postCommand(initCommand)

        const timeoutId = setTimeout(() => {
          if (this.state.status !== 'ready') {
            const info: SandboxErrorInfo = { code: 'TIMEOUT', message: '初始化超时' }
            this.setState({ status: 'error', error: info })
            this.disposeWorker(makeSandboxError(info))
            reject(makeSandboxError(info))
          }
        }, this.timeout)

        const checkReady = () => {
          if (this.state.status === 'ready') {
            clearTimeout(timeoutId)
            resolve()
          } else if (this.state.status === 'error') {
            clearTimeout(timeoutId)
            const error = makeSandboxError(this.state.error ?? { code: 'INIT_FAILED', message: 'Init failed' })
            this.disposeWorker(error)
            reject(error)
          } else {
            setTimeout(checkReady, 50)
          }
        }

        checkReady()
      } catch (error) {
        this.setState({
          status: 'error',
          error: { code: 'INIT_FAILED', message: error instanceof Error ? error.message : String(error) },
        })
        reject(error as Error)
      }
    })

    this.initInFlight = initPromise.finally(() => {
      this.initInFlight = null
    })

    return this.initInFlight
  }

  async init(): Promise<void> {
    const { kernelUrl } = this.resolveKernelRun()
    await this.ensureInitialized(kernelUrl)
  }

  compile(
    code: string,
    filename?: string,
    mockManifest?: MockManifest,
    options?: KernelRunOptions,
  ): Promise<{ success: boolean; bundle?: string; errors?: string[] }> {
    const resolved = this.resolveKernelRun(options)

    return this.ensureInitialized(resolved.kernelUrl).then(
      () =>
        new Promise((resolve, reject) => {
          this.compileResolver = { resolve, reject }

          const timeout = setTimeout(() => {
            if (this.compileResolver) {
              const info: SandboxErrorInfo = { code: 'TIMEOUT', message: '编译超时' }
              this.setState({ status: 'error', error: info })
              this.disposeWorker(makeSandboxError(info))
            }
          }, this.timeout)

          const originalResolve = resolve
          this.compileResolver.resolve = (result) => {
            clearTimeout(timeout)
            originalResolve(result)
            if (result.success) {
              this.compiledKernelUrl = resolved.kernelUrl
              this.compiledKernelSelection = resolved.selection
            }
          }

          const compileCommand: CompileCommand = {
            protocolVersion: SANDBOX_PROTOCOL_VERSION,
            type: 'COMPILE',
            payload: { code, filename, mockManifest },
          }
          this.postCommand(compileCommand)
        }),
    )
  }

  run(options?: {
    runId?: string
    actions?: ReadonlyArray<{ _tag: string; payload?: unknown }>
    useCompiledCode?: boolean
    kernelId?: KernelId
    strict?: boolean
    allowFallback?: boolean
  }): Promise<RunResult> {
    if (!this.worker) {
      return Promise.reject(new Error('Worker 未初始化'))
    }
    const runId = options?.runId ?? `run-${++this.runSeq}`

    const hasKernelOptions =
      options?.kernelId !== undefined || options?.strict !== undefined || options?.allowFallback !== undefined

    const resolved = hasKernelOptions
      ? this.resolveKernelRun({
          kernelId: options?.kernelId,
          strict: options?.strict,
          allowFallback: options?.allowFallback,
        })
      : this.compiledKernelUrl && this.compiledKernelSelection
        ? { kernelUrl: this.compiledKernelUrl, selection: this.compiledKernelSelection }
        : this.resolveKernelRun()

    if (!this.activeKernelUrl || this.activeKernelUrl !== resolved.kernelUrl) {
      return Promise.reject(new Error('Kernel 不匹配：请先在相同 kernel 下 compile，再 run'))
    }

    const payload: RunCommand['payload'] = {
      runId,
      actions: options?.actions as Array<{ _tag: string; payload?: unknown }> | undefined,
      useCompiledCode: options?.useCompiledCode ?? true,
    }

    this.setState({ status: 'running', logs: [], traces: [], error: null, uiIntents: [] })

    return new Promise<RunResult>((resolve, reject) => {
      this.runKernelSelections.set(runId, resolved.selection)
      this.runResolvers.set(runId, { resolve, reject })
      const timeout = setTimeout(() => {
        if (this.runResolvers.has(runId)) {
          const selection = resolved.selection
          const info: SandboxErrorInfo = {
            code: 'TIMEOUT',
            message: '运行超时',
            ...(selection.requestedKernelId ? { requestedKernelId: selection.requestedKernelId } : null),
            ...(selection.effectiveKernelId ? { effectiveKernelId: selection.effectiveKernelId } : null),
            ...(selection.fallbackReason ? { fallbackReason: selection.fallbackReason } : null),
          }
          this.setState({ status: 'error', error: info })
          this.disposeWorker(makeSandboxError(info))
        }
      }, this.timeout)

      const originalResolve = resolve
      this.runResolvers.set(runId, {
        resolve: (result) => {
          clearTimeout(timeout)
          originalResolve(result)
        },
        reject,
      })

      const runCommand: RunCommand = { protocolVersion: SANDBOX_PROTOCOL_VERSION, type: 'RUN', payload }
      this.postCommand(runCommand)
    })
  }

  async trialRunModule(options: {
    readonly moduleCode: string
    readonly moduleExport?: string
    readonly runId?: string
    readonly buildEnvConfig?: Record<string, string | number | boolean>
    readonly diagnosticsLevel?: DiagnosticsLevel
    readonly maxEvents?: number
    readonly trialRunTimeoutMs?: number
    readonly closeScopeTimeout?: number
    readonly reportMaxBytes?: number
    readonly filename?: string
    readonly mockManifest?: MockManifest
    readonly kernelId?: KernelId
    readonly strict?: boolean
    readonly allowFallback?: boolean
  }): Promise<RunResult> {
    const runId = options.runId ?? `run-${++this.runSeq}`
    const moduleExport = options.moduleExport ?? 'AppRoot'

    const selection = this.resolveKernelRun({
      kernelId: options.kernelId,
      strict: options.strict,
      allowFallback: options.allowFallback,
    }).selection

    const effectiveKernelId = selection.effectiveKernelId

    const trialRunOptions = {
      runId,
      source: { host: 'browser', label: 'sandbox:trialRunModule' },
      buildEnv: {
        hostKind: 'browser',
        config: options.buildEnvConfig,
      },
      diagnosticsLevel: options.diagnosticsLevel,
      maxEvents: options.maxEvents,
      trialRunTimeoutMs: options.trialRunTimeoutMs,
      closeScopeTimeout: options.closeScopeTimeout,
      budgets: options.reportMaxBytes ? { maxBytes: options.reportMaxBytes } : undefined,
    }

    const wrapper = [
      `import { Effect } from "effect"`,
      `import * as Logix from "@logixjs/core"`,
      ``,
      options.moduleCode,
      ``,
      `const __programModule = ${moduleExport}`,
      `const __kernelId = ${JSON.stringify(effectiveKernelId)}`,
      `const __kernelLayer = (__kernelId === "core" || __kernelId === "core-ng") ? Logix.Kernel.kernelLayer({ kernelId: __kernelId, packageName: "@logixjs/core" }) : undefined`,
      ``,
      `export default Effect.gen(function* () {`,
      `  const options = ${JSON.stringify(trialRunOptions, null, 2)}`,
      `  const report = yield* Logix.Observability.trialRunModule(__programModule as any, __kernelLayer ? { ...options, layer: __kernelLayer } : options)`,
      `  return report`,
      `})`,
      ``,
    ].join('\n')

    const compiled = await this.compile(wrapper, options.filename ?? 'trialRunModule.ts', options.mockManifest, {
      kernelId: options.kernelId,
      strict: options.strict,
      allowFallback: options.allowFallback,
    })
    if (!compiled.success) {
      const errors = compiled.errors?.length ? `\\n${compiled.errors.join('\\n')}` : ''
      throw new Error(`编译失败: trialRunModule wrapper${errors}`)
    }

    return this.run({
      runId,
      useCompiledCode: true,
      kernelId: options.kernelId,
      strict: options.strict,
      allowFallback: options.allowFallback,
    })
  }

  uiCallback(payload: { runId: string; intentId: string; callback: string; data?: unknown }): Promise<void> {
    if (!this.worker) {
      return Promise.reject(new Error('Worker 未初始化'))
    }
    const command: UiCallbackCommand = { protocolVersion: SANDBOX_PROTOCOL_VERSION, type: 'UI_CALLBACK', payload }
    this.postCommand(command)
    return Promise.resolve()
  }

  terminate(): void {
    const info: SandboxErrorInfo = { code: 'WORKER_TERMINATED', message: 'Worker 已终止' }
    this.disposeWorker(makeSandboxError(info))
    this.setState({ status: 'idle', logs: [], traces: [], error: null, uiIntents: [] })
  }
}

export const createSandboxClient = (config?: SandboxClientConfig): SandboxClient => new SandboxClient(config)
