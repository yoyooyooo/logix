import { describe, it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import * as Debug from '../../src/Debug.js'

describe('Runtime batch window semantics', () => {
  it.scoped('dispatchBatch merges multiple dispatches into a single commit (commitMode=batch)', () =>
    Effect.gen(function* () {
      const State = Schema.Struct({ value: Schema.Number })
      const Actions = { inc: Schema.Void }

      const M = Logix.Module.make('RuntimeBatchWindow', {
        state: State,
        actions: Actions,
        reducers: {
          inc: Logix.Module.Reducer.mutate((draft: any) => {
            draft.value += 1
          }),
        },
      })

      const impl = M.implement({
        initial: { value: 0 },
        logics: [],
      })

      const ring = Debug.makeRingBufferSink(128)
      const layer = Layer.mergeAll(Debug.replace([ring.sink]), Debug.diagnosticsLevel('light')) as Layer.Layer<
        any,
        never,
        never
      >

      const runtime = Logix.Runtime.make(impl, { layer })

      const program = Effect.gen(function* () {
        const rt: any = yield* M.tag

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

      yield* Effect.promise(() => runtime.runPromise(program))
    }),
  )
})
