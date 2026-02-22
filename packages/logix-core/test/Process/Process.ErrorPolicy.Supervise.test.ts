import { describe, it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import { withProcessRuntime, withProcessRuntimeScope } from './test-helpers.js'

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

      const layer = withProcessRuntime(HostImpl.impl.layer)
      const events = yield* withProcessRuntimeScope({
        layer,
        run: ({ runtime }) =>
          Effect.gen(function* () {
            let currentEvents: ReadonlyArray<Logix.Process.ProcessEvent> = []
            // wait for runSeq=3 failure
            for (let i = 0; i < 200; i++) {
              currentEvents = (yield* runtime.getEventsSnapshot()) as ReadonlyArray<Logix.Process.ProcessEvent>
              const errorRunSeqs = currentEvents
                .filter((event) => event.type === 'process:error')
                .map((event) => event.identity.runSeq)
              if (errorRunSeqs.includes(3)) {
                break
              }
              yield* Effect.yieldNow()
            }
            return currentEvents
          }),
      })

      const starts = events.filter((e) => e.type === 'process:start')
      const errors = events.filter((e) => e.type === 'process:error')
      const restarts = events.filter((e) => e.type === 'process:restart')

      expect(starts.map((e) => e.identity.runSeq)).toEqual([1, 2, 3])
      expect(errors.map((e) => e.identity.runSeq)).toEqual([1, 2, 3])
      expect(restarts.map((e) => e.identity.runSeq)).toEqual([1, 2])
    }),
  )
})
