import { Context, Effect, Layer, Stream } from "effect"
import { createSandboxClient, type SandboxClient, type SandboxClientConfig } from "./client.js"
import type {
  SandboxStatus,
  LogEntry,
  TraceSpan,
  SandboxErrorInfo,
  MockManifest,
  UiIntentPacket,
  RunResult,
} from "./types.js"

export interface SandboxClientService {
  readonly init: () => Effect.Effect<void, unknown>
  readonly compile: (
    code: string,
    filename?: string,
    mockManifest?: MockManifest
  ) => Effect.Effect<{ success: boolean; bundle?: string; errors?: string[] }, unknown>
  readonly run: (options?: { useCompiledCode?: boolean }) => Effect.Effect<RunResult, unknown>
  readonly uiCallback: (payload: { runId: string; intentId: string; callback: string; data?: unknown }) => Effect.Effect<void, unknown>
  readonly terminate: () => Effect.Effect<void, unknown>
  readonly events: Stream.Stream<{
    status: SandboxStatus
    logs: ReadonlyArray<LogEntry>
    traces: ReadonlyArray<TraceSpan>
    error: SandboxErrorInfo | null
    uiIntents: ReadonlyArray<UiIntentPacket>
  }>
}

export class SandboxClientTag extends Context.Tag("SandboxClientTag")<SandboxClientTag, SandboxClientService>() {}

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
        compile: (code, filename, mockManifest) =>
          Effect.tryPromise(() => getClient().compile(code, filename, mockManifest)),
        run: (options) => Effect.tryPromise(() => getClient().run(options)),
        uiCallback: (payload) => Effect.tryPromise(() => getClient().uiCallback(payload)),
        terminate: () => Effect.sync(() => getClient().terminate()),
        events,
      }
    })
  )
