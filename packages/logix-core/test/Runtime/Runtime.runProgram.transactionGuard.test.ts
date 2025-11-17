import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Runtime.runProgram (sync transaction guard)', () => {
  it.scoped('rejects when called inside a synchronous StateTransaction body', () =>
    Effect.gen(function* () {
      let inner: Promise<unknown> | undefined

      const Inner = Logix.Module.make('Runtime.runProgram.txnGuard.inner', {
        state: Schema.Void,
        actions: { noop: Schema.Void },
      })

      const InnerImpl = Inner.implement({ initial: undefined })

      const Root = Logix.Module.make('Runtime.runProgram.txnGuard.root', {
        state: Schema.Struct({ value: Schema.Number }),
        actions: { trigger: Schema.Void },
        reducers: {
          trigger: Logix.Module.Reducer.mutate((draft: any) => {
            const p = Logix.Runtime.runProgram(InnerImpl, () => Effect.void, {
              layer: Layer.empty as Layer.Layer<any, never, never>,
              handleSignals: false,
            })
            void p.catch(() => {})
            inner = p

            draft.value += 1
          }),
        },
      })

      const RootImpl = Root.implement({ initial: { value: 0 } })

      yield* Effect.promise(() =>
        Logix.Runtime.runProgram(
          RootImpl,
          ({ module }) =>
            Effect.gen(function* () {
              yield* module.dispatch({ _tag: 'trigger', payload: undefined } as any)
              yield* Effect.sleep('10 millis')
            }),
          { layer: Layer.empty as Layer.Layer<any, never, never>, handleSignals: false },
        ),
      )

      if (!inner) {
        throw new Error('missing inner Runtime.runProgram promise')
      }

      yield* Effect.promise(() =>
        expect(inner).rejects.toThrow(
          /Runtime\.openProgram\/runProgram is not allowed inside a synchronous StateTransaction body/,
        ),
      )
    }),
  )
})
