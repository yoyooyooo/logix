import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Runtime.runProgram/openProgram onError passthrough (US1)', () => {
  it.scoped('calls RuntimeOptions.onError for process failures (does not change exit strategy)', () =>
    Effect.gen(function* () {
      let calls = 0
      let last: unknown | null = null

      const Root = Logix.Module.make('Runtime.runProgram.onError', {
        state: Schema.Void,
        actions: {},
      })

      const impl = Root.implement({
        initial: undefined,
        logics: [],
        processes: [Effect.dieMessage('process failed')],
      })

      yield* Effect.promise(() =>
        Logix.Runtime.runProgram(impl, () => Effect.sleep('10 millis'), {
          layer: Layer.empty as Layer.Layer<any, never, never>,
          handleSignals: false,
          onError: (cause) =>
            Effect.sync(() => {
              calls += 1
              last = cause
            }),
        }),
      )

      expect(calls).toBeGreaterThan(0)
      expect(last).not.toBeNull()
    }),
  )
})
