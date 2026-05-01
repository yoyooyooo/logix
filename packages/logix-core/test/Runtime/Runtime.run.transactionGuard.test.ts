import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Runtime.run (sync transaction guard)', () => {
  it.effect('rejects when called inside a synchronous StateTransaction body', () =>
    Effect.gen(function* () {
      let inner: Promise<unknown> | undefined

      const Inner = Logix.Module.make('Runtime.run.txnGuard.inner', {
        state: Schema.Void,
        actions: { noop: Schema.Void },
      })

      const InnerProgram = Logix.Program.make(Inner, { initial: undefined })

      const Root = Logix.Module.make('Runtime.run.txnGuard.root', {
        state: Schema.Struct({ value: Schema.Number }),
        actions: { trigger: Schema.Void },
        reducers: {
          trigger: Logix.Module.Reducer.mutate((draft) => {
            const p = Logix.Runtime.run(InnerProgram, () => Effect.void, {
              layer: Layer.empty as Layer.Layer<any, never, never>,
              handleSignals: false,
            })
            void p.catch(() => {})
            inner = p

            draft.value += 1
          }),
        },
      })

      const RootProgram = Logix.Program.make(Root, { initial: { value: 0 } })

      yield* Effect.promise(() =>
        Logix.Runtime.run(
          RootProgram,
          ({ module }) =>
            Effect.gen(function* () {
              yield* module.dispatch({ _tag: 'trigger', payload: undefined } as any)
              yield* Effect.sleep('10 millis')
            }),
          { layer: Layer.empty as Layer.Layer<any, never, never>, handleSignals: false },
        ),
      )

      if (!inner) {
        throw new Error('missing inner Runtime.run promise')
      }

      yield* Effect.promise(() =>
        expect(inner).rejects.toThrow(
          /Runtime\.openProgram\/run is not allowed inside a synchronous StateTransaction body/,
        ),
      )
    }),
  )
})
