import { describe, it, expect } from '@effect/vitest'
import { Context, Effect, Exit, Layer, Scope, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import * as ProcessRuntime from '../../src/internal/runtime/core/process/ProcessRuntime.js'

describe('process: errorPolicy supervise', () => {
  it.scoped('should restart with runSeq increment until maxRestarts reached', () =>
    Effect.gen(function* () {
      const Host = Logix.Module.make('ProcessSuperviseHost', {
        state: Schema.Void,
        actions: {},
      })

      const Proc = Logix.Process.make(
        {
          processId: 'ProcessSupervise',
          // default trigger includes runtime:boot → autoStart
          concurrency: { mode: 'latest' },
          errorPolicy: { mode: 'supervise', maxRestarts: 2 },
          diagnosticsLevel: 'off',
        },
        Effect.fail(new Error('boom')),
      )

      const HostImpl = Host.implement({
        initial: undefined,
        processes: [Proc],
      })

      const layer = Layer.provideMerge(ProcessRuntime.layer())(HostImpl.impl.layer)

      let events: ReadonlyArray<Logix.Process.ProcessEvent> = []
      const scope = yield* Scope.make()
      try {
        const env = yield* Layer.buildWithScope(layer, scope)
        const rt = Context.get(
          env as Context.Context<any>,
          ProcessRuntime.ProcessRuntimeTag as any,
        ) as ProcessRuntime.ProcessRuntime

        // wait for runSeq=3 failure
        for (let i = 0; i < 200; i++) {
          events = (yield* rt.getEventsSnapshot()) as any
          const errorRunSeqs = events.filter((e) => e.type === 'process:error').map((e) => e.identity.runSeq)
          if (errorRunSeqs.includes(3)) {
            break
          }
          yield* Effect.yieldNow()
        }
      } finally {
        yield* Scope.close(scope, Exit.succeed(undefined))
      }

      const starts = events.filter((e) => e.type === 'process:start')
      const errors = events.filter((e) => e.type === 'process:error')
      const restarts = events.filter((e) => e.type === 'process:restart')

      expect(starts.map((e) => e.identity.runSeq)).toEqual([1, 2, 3])
      expect(errors.map((e) => e.identity.runSeq)).toEqual([1, 2, 3])
      expect(restarts.map((e) => e.identity.runSeq)).toEqual([1, 2])
    }),
  )
})
