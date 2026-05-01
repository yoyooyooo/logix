import { describe, it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import * as Debug from '../../src/internal/debug-api.js'

describe('Runtime batch window semantics', () => {
  it.effect('dispatchBatch merges multiple dispatches into a single commit (commitMode=batch)', () =>
    Effect.gen(function* () {
      const State = Schema.Struct({ value: Schema.Number })
      const Actions = { inc: Schema.Void }

      const M = Logix.Module.make('RuntimeBatchWindow', {
        state: State,
        actions: Actions,
        reducers: {
          inc: Logix.Module.Reducer.mutate((draft) => {
            draft.value += 1
          }),
        },
      })

      const program = Logix.Program.make(M, {
        initial: { value: 0 },
        logics: [],
      })

      const ring = Debug.makeRingBufferSink(128)
      const layer = Layer.mergeAll(Debug.replace([ring.sink]), Debug.diagnosticsLevel('light')) as Layer.Layer<
        any,
        never,
        never
      >

      const runtime = Logix.Runtime.make(program, { layer })

      const run = Effect.gen(function* () {
        const rt: any = yield* Effect.service(M.tag).pipe(Effect.orDie)

        yield* rt.dispatchBatch([
          { _tag: 'inc', payload: undefined },
          { _tag: 'inc', payload: undefined },
        ] as any)

        const state: any = yield* rt.getState
        expect(state.value).toBe(2)

        const commits = ring
          .getSnapshot()
          .filter((e) => e.type === 'state:update' && (e as any).txnId) as ReadonlyArray<any>

        expect(commits.length).toBe(1)
        expect(commits[0]?.commitMode).toBe('batch')
      })

      yield* Effect.promise(() => runtime.runPromise(run))
    }),
  )
})
