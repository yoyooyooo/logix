import type {
  SandboxCommand,
  SandboxEvent,
  InitCommand,
  CompileCommand,
  RunCommand,
  TerminateCommand,
  UiCallbackCommand,
} from "./protocol.js"
import {
  isReadyEvent,
  isCompileResultEvent,
  isLogEvent,
  isTraceEvent,
  isUiIntentEvent,
  isUiCallbackAckEvent,
  isErrorEvent,
  isCompleteEvent,
} from "./protocol.js"
import type {
  LogEntry,
  TraceSpan,
  RunResult,
  SandboxErrorInfo,
  SandboxStatus,
  MockManifest,
  UiIntentPacket,
} from "./types.js"

export interface SandboxClientConfig {
  readonly workerUrl?: string
  readonly timeout?: number
  readonly wasmUrl?: string
  readonly kernelUrl?: string
}

export interface SandboxClientState {
  readonly status: SandboxStatus
  readonly logs: ReadonlyArray<LogEntry>
  readonly traces: ReadonlyArray<TraceSpan>
  readonly error: SandboxErrorInfo | null
  readonly uiIntents: ReadonlyArray<UiIntentPacket>
}

type StateListener = (state: SandboxClientState) => void

export class SandboxClient {
  private worker: Worker | null = null
  private readonly config: Required<SandboxClientConfig>
  private state: SandboxClientState = {
    status: "idle",
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
  private compileResolver:
    | { resolve: (result: { success: boolean; bundle?: string; errors?: string[] }) => void; reject: (error: Error) => void }
    | null = null

  constructor(config: SandboxClientConfig = {}) {
    const defaultKernelUrl =
      typeof window !== "undefined" && window.location
        ? `${window.location.origin}/sandbox/logix-core.js`
        : "/sandbox/logix-core.js"

    this.config = {
      workerUrl: config.workerUrl ?? "",
      timeout: config.timeout ?? 10000,
      wasmUrl: config.wasmUrl ?? "/esbuild.wasm",
      kernelUrl: config.kernelUrl ?? defaultKernelUrl,
    }
  }

  private setState(updates: Partial<SandboxClientState>): void {
    this.state = { ...this.state, ...updates }
    this.listeners.forEach((listener) => listener(this.state))
  }

  getState(): SandboxClientState {
    return this.state
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private postCommand(command: SandboxCommand): void {
    if (!this.worker) {
      throw new Error("Worker 未初始化")
    }
    this.worker.postMessage(command)
  }

  private handleEvent = (event: MessageEvent<SandboxEvent>): void => {
    const e = event.data

    if (isReadyEvent(e)) {
      this.setState({ status: "ready" })
    } else if (isLogEvent(e)) {
      this.setState({ logs: [...this.state.logs, e.payload] })
    } else if (isTraceEvent(e)) {
      const existingIndex = this.state.traces.findIndex((t) => t.spanId === e.payload.spanId)
      if (existingIndex >= 0) {
        const newTraces = [...this.state.traces]
        newTraces[existingIndex] = e.payload
        this.setState({ traces: newTraces })
      } else {
        this.setState({ traces: [...this.state.traces, e.payload] })
      }
    } else if (isUiIntentEvent(e)) {
      this.setState({ uiIntents: [...this.state.uiIntents, e.payload] })
    } else if (isUiCallbackAckEvent(e)) {
      // 暂时只记录日志，后续可用于交互回传状态
      this.setState({ logs: [...this.state.logs, { level: "info", args: [e.payload], timestamp: Date.now(), source: "logix" }] })
    } else if (isErrorEvent(e)) {
      this.setState({ status: "error", error: e.payload })
    } else if (isCompileResultEvent(e)) {
      if (this.compileResolver) {
        this.compileResolver.resolve(e.payload)
        this.compileResolver = null
      }
    } else if (isCompleteEvent(e)) {
      this.setState({ status: "completed" })
      const resolver = this.runResolvers.get(e.payload.runId)
      if (resolver) {
        resolver.resolve({
          runId: e.payload.runId,
          duration: e.payload.duration,
          stateSnapshot: e.payload.stateSnapshot,
          traces: this.state.traces,
          logs: this.state.logs,
          uiIntents: this.state.uiIntents,
        })
        this.runResolvers.delete(e.payload.runId)
      }
    }
  }

  async init(): Promise<void> {
    if (this.worker) {
      return
    }
    this.setState({ status: "initializing", logs: [], traces: [], error: null })

    return new Promise((resolve, reject) => {
      try {
        const worker = this.config.workerUrl
          ? new Worker(this.config.workerUrl, { type: "module" })
          : new Worker(new URL("./worker/sandbox.worker.ts", import.meta.url), { type: "module" })

        this.worker = worker
        worker.onmessage = this.handleEvent
        worker.onerror = (error) => {
          this.setState({ status: "error", error: { code: "INIT_FAILED", message: error.message } })
          reject(error)
        }

        const initCommand: InitCommand = { type: "INIT", payload: { wasmUrl: this.config.wasmUrl, kernelUrl: this.config.kernelUrl } }
        this.postCommand(initCommand)

        const timeoutId = setTimeout(() => {
          if (this.state.status !== "ready") {
            this.setState({ status: "error", error: { code: "TIMEOUT", message: "初始化超时" } })
            reject(new Error("初始化超时"))
          }
        }, this.config.timeout)

        const checkReady = () => {
          if (this.state.status === "ready") {
            clearTimeout(timeoutId)
            resolve()
          } else if (this.state.status === "error") {
            clearTimeout(timeoutId)
            reject(new Error(this.state.error?.message ?? "Init failed"))
          } else {
            setTimeout(checkReady, 50)
          }
        }

        checkReady()
      } catch (error) {
        this.setState({
          status: "error",
          error: { code: "INIT_FAILED", message: error instanceof Error ? error.message : String(error) },
        })
        reject(error as Error)
      }
    })
  }

  compile(
    code: string,
    filename?: string,
    mockManifest?: MockManifest
  ): Promise<{ success: boolean; bundle?: string; errors?: string[] }> {
    if (!this.worker) {
      return Promise.reject(new Error("Worker 未初始化"))
    }
    return new Promise((resolve, reject) => {
      this.compileResolver = { resolve, reject }

      const timeout = setTimeout(() => {
        if (this.compileResolver) {
          this.compileResolver.reject(new Error("编译超时"))
          this.compileResolver = null
        }
      }, this.config.timeout)

      const originalResolve = resolve
      this.compileResolver.resolve = (result) => {
        clearTimeout(timeout)
        originalResolve(result)
      }

      const compileCommand: CompileCommand = { type: "COMPILE", payload: { code, filename, mockManifest } }
      this.postCommand(compileCommand)
    })
  }

  run(options?: { runId?: string; actions?: ReadonlyArray<{ _tag: string; payload?: unknown }>; useCompiledCode?: boolean }): Promise<RunResult> {
    if (!this.worker) {
      return Promise.reject(new Error("Worker 未初始化"))
    }
    const runId = options?.runId ?? `run-${Date.now()}`
    const payload: RunCommand["payload"] = {
      runId,
      actions: options?.actions as Array<{ _tag: string; payload?: unknown }> | undefined,
      useCompiledCode: options?.useCompiledCode ?? true,
    }

    this.setState({ status: "running", logs: [], traces: [], error: null, uiIntents: [] })

    return new Promise<RunResult>((resolve, reject) => {
      this.runResolvers.set(runId, { resolve, reject })
      const timeout = setTimeout(() => {
        if (this.runResolvers.has(runId)) {
          this.runResolvers.delete(runId)
          reject(new Error("运行超时"))
        }
      }, this.config.timeout)

      const originalResolve = resolve
      this.runResolvers.set(runId, {
        resolve: (result) => {
          clearTimeout(timeout)
          originalResolve(result)
        },
        reject,
      })

      const runCommand: RunCommand = { type: "RUN", payload }
      this.postCommand(runCommand)
    })
  }

  uiCallback(payload: { runId: string; intentId: string; callback: string; data?: unknown }): Promise<void> {
    if (!this.worker) {
      return Promise.reject(new Error("Worker 未初始化"))
    }
    const command: UiCallbackCommand = { type: "UI_CALLBACK", payload }
    this.postCommand(command)
    return Promise.resolve()
  }

  terminate(): void {
    if (this.worker) {
      const command: TerminateCommand = { type: "TERMINATE" }
      this.postCommand(command)
    }
  }
}

export const createSandboxClient = (config?: SandboxClientConfig): SandboxClient => new SandboxClient(config)
