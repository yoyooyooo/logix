import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Runtime.runProgram args injection (US1)', () => {
  it.scoped('passes typed args to main without reading process.argv', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('Runtime.runProgram.args', {
        state: Schema.Void,
        actions: {},
      })

      const impl = Root.implement({ initial: undefined, logics: [] })

      type Args = { readonly mode: 'a' | 'b' }

      const result = yield* Effect.promise(() =>
        Logix.Runtime.runProgram(
          impl,
          (_ctx, args: Args) =>
            Effect.sync(() => {
              return args.mode === 'a' ? 1 : 2
            }),
          {
            layer: Layer.empty as Layer.Layer<any, never, never>,
            handleSignals: false,
            args: { mode: 'a' } satisfies Args,
          },
        ),
      )

      expect(result).toBe(1)
    }),
  )
})
