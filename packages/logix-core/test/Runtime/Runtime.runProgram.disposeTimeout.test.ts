import { describe, expect } from 'vitest'
import { it } from '@effect/vitest'
import { Effect, Either, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Runtime.runProgram dispose timeout (US1)', () => {
  it.scoped('closeScopeTimeout produces DisposeTimeout and triggers onError warning', () =>
    Effect.gen(function* () {
      let onErrorCalls = 0

      const Root = Logix.Module.make('Runtime.runProgram.disposeTimeout', {
        state: Schema.Void,
        actions: {},
      })
      const impl = Root.implement({ initial: undefined, logics: [] })

      const hangingFinalizerLayer = Layer.scopedDiscard(
        // Simulate a "finalizer hangs but eventually ends" to avoid permanently hanging the test process.
        Effect.addFinalizer(() => Effect.sleep('50 millis')),
      ) as unknown as Layer.Layer<any, never, never>

      const outcome = yield* Effect.tryPromise({
        try: () =>
          Logix.Runtime.runProgram(impl, () => Effect.void, {
            layer: hangingFinalizerLayer,
            closeScopeTimeout: 10,
            handleSignals: false,
            onError: () =>
              Effect.sync(() => {
                onErrorCalls += 1
              }),
          }),
        catch: (e) => e,
      }).pipe(Effect.either)

      expect(Either.isLeft(outcome)).toBe(true)
      if (Either.isLeft(outcome)) {
        const e: any = outcome.left
        expect(e?._tag).toBe('DisposeTimeout')
      }

      expect(onErrorCalls).toBeGreaterThan(0)

      // Wait for the finalizer to finish naturally to avoid vitest open handles affecting subsequent tests.
      yield* Effect.promise(() => new Promise((r) => setTimeout(r, 80)))
    }),
  )
})
