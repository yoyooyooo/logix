import { Effect, Layer, PubSub, ServiceMap, Stream } from 'effect'
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
  readonly trial: (options: {
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

export class SandboxClientTag extends ServiceMap.Service<SandboxClientTag, SandboxClientService>()('SandboxClientTag') {}

export const SandboxClientLayer = (config?: SandboxClientConfig) =>
  Layer.effect(
    SandboxClientTag,
    Effect.gen(function* () {
      let client: SandboxClient | null = null
      const pubsub = yield* PubSub.unbounded<{
        status: SandboxStatus
        logs: ReadonlyArray<LogEntry>
        traces: ReadonlyArray<TraceSpan>
        error: SandboxErrorInfo | null
        uiIntents: ReadonlyArray<UiIntentPacket>
      }>()

      const getClient = () => {
        if (!client) {
          client = createSandboxClient(config)
        }
        return client
      }

      const sandboxClient = getClient()
      const unsubscribe = sandboxClient.subscribe((state) => {
        PubSub.publishUnsafe(pubsub, state)
      })

      const events = Stream.fromPubSub(pubsub)

      return {
        init: () =>
          Effect.tryPromise({
            try: () => sandboxClient.init(),
            catch: (error) => error,
          }),
        listKernels: () => Effect.sync(() => sandboxClient.listKernels()),
        compile: (code, filename, mockManifest, options) =>
          Effect.tryPromise({
            try: () => sandboxClient.compile(code, filename, mockManifest, options),
            catch: (error) => error,
          }),
        run: (options) =>
          Effect.tryPromise({
            try: () => sandboxClient.run(options),
            catch: (error) => error,
          }),
        trial: (options) =>
          Effect.tryPromise({
            try: () => sandboxClient.trial(options),
            catch: (error) => error,
          }),
        uiCallback: (payload) =>
          Effect.tryPromise({
            try: () => sandboxClient.uiCallback(payload),
            catch: (error) => error,
          }),
        terminate: () =>
          Effect.sync(() => {
            unsubscribe()
            sandboxClient.terminate()
          }),
        events,
      }
    }),
  )
