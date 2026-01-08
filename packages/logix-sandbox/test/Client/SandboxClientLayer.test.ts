import { describe, it, expect } from 'vitest'
import { Effect, Layer, Stream } from 'effect'
import {
  SandboxClientLayer,
  SandboxClientTag,
  type SandboxClientService,
  type SandboxStatus,
  type LogEntry,
  type TraceSpan,
  type SandboxErrorInfo,
  type RunResult,
} from '@logixjs/sandbox'

describe('SandboxClientLayer', () => {
  it('exposes events stream and basic methods', async () => {
    const fakeEvents: Array<{
      status: SandboxStatus
      logs: ReadonlyArray<LogEntry>
      traces: ReadonlyArray<TraceSpan>
      error: SandboxErrorInfo | null
      uiIntents: ReadonlyArray<any>
    }> = [
      { status: 'initializing', logs: [], traces: [], error: null, uiIntents: [] },
      { status: 'ready', logs: [], traces: [], error: null, uiIntents: [] },
    ]

    const FakeLayer = Layer.succeed<SandboxClientTag, SandboxClientService>(SandboxClientTag, {
      init: () => Effect.void,
      listKernels: () => Effect.succeed({ kernels: [], defaultKernelId: undefined }),
      compile: () => Effect.succeed({ success: true }),
      run: () =>
        Effect.succeed<RunResult>({
          runId: 'test-run',
          duration: 0,
          stateSnapshot: undefined,
          traces: [],
          logs: [],
          uiIntents: [],
        }),
      trialRunModule: () =>
        Effect.succeed<RunResult>({
          runId: 'test-trial-run',
          duration: 0,
          stateSnapshot: undefined,
          traces: [],
          logs: [],
          uiIntents: [],
        }),
      uiCallback: () => Effect.void,
      terminate: () => Effect.void,
      events: Stream.fromIterable(fakeEvents),
    })

    const program = Effect.gen(function* () {
      const svc = yield* SandboxClientTag

      yield* svc.init()
      const compileResult = yield* svc.compile('code')
      const runResult = yield* svc.run()

      const collected: typeof fakeEvents = []
      yield* Stream.runForEach(svc.events, (e) =>
        Effect.sync(() => {
          collected.push(e)
        }),
      )

      expect(compileResult.success).toBe(true)
      expect(runResult.runId).toBe('test-run')
      expect(collected.length).toBe(2)
      expect(collected[1]!.status).toBe('ready')
    })

    await Effect.runPromise(program.pipe(Effect.provide(FakeLayer)))
  })
})
