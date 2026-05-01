import { describe, it, expect } from 'vitest'
import { Effect, Layer, Stream } from 'effect'
import { SandboxClientLayer, SandboxClientTag } from '@logixjs/sandbox'
import type { SandboxClientService } from '../../src/Service.js'
import type { SandboxStatus, LogEntry, TraceSpan, SandboxErrorInfo, RunResult, UiIntentPacket } from '../../src/Types.js'

describe('SandboxClientLayer', () => {
  it('exposes events stream and basic methods', async () => {
    const fakeEvents: Array<{
      status: SandboxStatus
      logs: ReadonlyArray<LogEntry>
      traces: ReadonlyArray<TraceSpan>
      error: SandboxErrorInfo | null
      uiIntents: ReadonlyArray<UiIntentPacket>
    }> = [
      { status: 'initializing', logs: [], traces: [], error: null, uiIntents: [] },
      { status: 'ready', logs: [], traces: [], error: null, uiIntents: [] },
    ]

    const fakeService: SandboxClientService = {
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
      trial: () =>
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
    }

    const FakeLayer = Layer.succeed(SandboxClientTag, fakeService)

    const program = Effect.gen(function* () {
      const svc = yield* Effect.service(SandboxClientTag)

      yield* svc.init()
      const compileResult = yield* svc.compile('code')
      const runResult = yield* svc.run()
      const trialResult = yield* svc.trial({
        moduleCode: 'export const AppRoot = {}',
      })

      const collected: typeof fakeEvents = []
      yield* Stream.runForEach(svc.events, (e) =>
        Effect.sync(() => {
          collected.push(e)
        }),
      )

      expect(compileResult.success).toBe(true)
      expect(runResult.runId).toBe('test-run')
      expect(trialResult.runId).toBe('test-trial-run')
      expect(collected.length).toBe(2)
      expect(collected[1]!.status).toBe('ready')
    })

    await Effect.runPromise(program.pipe(Effect.provide(FakeLayer)))
  })
})
