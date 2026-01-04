import { Context, Effect, Layer, Stream } from 'effect'
import { createSandboxClient, type SandboxClient, type SandboxClientConfig } from './Client.js'
import type {
  SandboxStatus,
  LogEntry,
  TraceSpan,
  SandboxErrorInfo,
  MockManifest,
  UiIntentPacket,
  RunResult,
  KernelId,
  KernelVariant,
  DiagnosticsLevel,
} from './Types.js'

export interface SandboxClientService {
  readonly init: () => Effect.Effect<void, unknown>
  readonly listKernels: () => Effect.Effect<
    { readonly kernels: ReadonlyArray<KernelVariant>; readonly defaultKernelId?: KernelId },
    never
  >
  readonly compile: (
    code: string,
    filename?: string,
    mockManifest?: MockManifest,
    options?: { readonly kernelId?: KernelId; readonly strict?: boolean; readonly allowFallback?: boolean },
  ) => Effect.Effect<{ success: boolean; bundle?: string; errors?: string[] }, unknown>
  readonly run: (options?: {
    readonly runId?: string
    readonly actions?: ReadonlyArray<{ _tag: string; payload?: unknown }>
    readonly useCompiledCode?: boolean
    readonly kernelId?: KernelId
    readonly strict?: boolean
    readonly allowFallback?: boolean
  }) => Effect.Effect<RunResult, unknown>
  readonly trialRunModule: (options: {
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
  }) => Effect.Effect<RunResult, unknown>
  readonly uiCallback: (payload: {
    runId: string
    intentId: string
    callback: string
    data?: unknown
  }) => Effect.Effect<void, unknown>
  readonly terminate: () => Effect.Effect<void, unknown>
  readonly events: Stream.Stream<{
    status: SandboxStatus
    logs: ReadonlyArray<LogEntry>
    traces: ReadonlyArray<TraceSpan>
    error: SandboxErrorInfo | null
    uiIntents: ReadonlyArray<UiIntentPacket>
  }>
}

export class SandboxClientTag extends Context.Tag('SandboxClientTag')<SandboxClientTag, SandboxClientService>() {}

export const SandboxClientLayer = (config?: SandboxClientConfig) =>
  Layer.effect(
    SandboxClientTag,
    Effect.sync(() => {
      let client: SandboxClient | null = null
      const getClient = () => {
        if (!client) {
          client = createSandboxClient(config)
        }
        return client
      }

      const events = Stream.async<{
        status: SandboxStatus
        logs: ReadonlyArray<LogEntry>
        traces: ReadonlyArray<TraceSpan>
        error: SandboxErrorInfo | null
        uiIntents: ReadonlyArray<UiIntentPacket>
      }>((emit) => {
        const c = getClient()
        const unsubscribe = c.subscribe((state) => emit.single(state))
        return Effect.sync(() => unsubscribe())
      })

      return {
        init: () => Effect.tryPromise(() => getClient().init()),
        listKernels: () => Effect.sync(() => getClient().listKernels()),
        compile: (code, filename, mockManifest, options) =>
          Effect.tryPromise(() => getClient().compile(code, filename, mockManifest, options)),
        run: (options) => Effect.tryPromise(() => getClient().run(options)),
        trialRunModule: (options) => Effect.tryPromise(() => getClient().trialRunModule(options)),
        uiCallback: (payload) => Effect.tryPromise(() => getClient().uiCallback(payload)),
        terminate: () => Effect.sync(() => getClient().terminate()),
        events,
      }
    }),
  )
