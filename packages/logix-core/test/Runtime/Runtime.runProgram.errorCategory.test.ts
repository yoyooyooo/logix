import { describe, expect } from 'vitest'
import { it } from '@effect/vitest'
import { Effect, Either, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Runtime.runProgram error taxonomy (US1)', () => {
  it.scoped('BootError is distinguishable and includes stable identity fields', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('Runtime.runProgram.errorCategory.Boot', {
        state: Schema.Void,
        actions: {},
      })
      const impl = Root.implement({ initial: undefined, logics: [] })

      const failingLayer = Layer.scopedDiscard(Effect.die(new Error('layer build failed'))) as any

      const bootOutcome = yield* Effect.tryPromise({
        try: () =>
          Logix.Runtime.runProgram(impl, () => Effect.void, {
            layer: failingLayer as any,
            handleSignals: false,
          }),
        catch: (e) => e,
      }).pipe(Effect.either)

      expect(Either.isLeft(bootOutcome)).toBe(true)
      if (Either.isLeft(bootOutcome)) {
        const e: any = bootOutcome.left
        expect(e?._tag).toBe('BootError')
        expect(e?.entrypoint).toBe('boot')
        expect(typeof e?.moduleId).toBe('string')
        expect(typeof e?.instanceId).toBe('string')
      }
    }),
  )

  it.scoped('MainError is distinguishable and includes stable identity fields', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('Runtime.runProgram.errorCategory.Main', {
        state: Schema.Void,
        actions: {},
      })
      const impl = Root.implement({ initial: undefined, logics: [] })

      const mainOutcome = yield* Effect.tryPromise({
        try: () =>
          Logix.Runtime.runProgram(impl, () => Effect.dieMessage('main fail'), {
            layer: Layer.empty as Layer.Layer<any, never, never>,
            handleSignals: false,
          }),
        catch: (e) => e,
      }).pipe(Effect.either)

      expect(Either.isLeft(mainOutcome)).toBe(true)
      if (Either.isLeft(mainOutcome)) {
        const e: any = mainOutcome.left
        expect(e?._tag).toBe('MainError')
        expect(e?.entrypoint).toBe('main')
        expect(typeof e?.moduleId).toBe('string')
        expect(typeof e?.instanceId).toBe('string')
      }
    }),
  )

  it.scoped('DisposeTimeout is distinguishable and includes actionable suggestions', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('Runtime.runProgram.errorCategory.DisposeTimeout', {
        state: Schema.Void,
        actions: {},
      })
      const impl = Root.implement({ initial: undefined, logics: [] })

      const hangingFinalizerLayer = Layer.scopedDiscard(
        // Simulate a "finalizer that stalls but eventually finishes" to avoid the test process hanging forever.
        Effect.addFinalizer(() => Effect.sleep('50 millis')),
      ) as unknown as Layer.Layer<any, never, never>

      const disposeOutcome = yield* Effect.tryPromise({
        try: () =>
          Logix.Runtime.runProgram(impl, () => Effect.void, {
            layer: hangingFinalizerLayer,
            closeScopeTimeout: 10,
            handleSignals: false,
          }),
        catch: (e) => e,
      }).pipe(Effect.either)

      expect(Either.isLeft(disposeOutcome)).toBe(true)
      if (Either.isLeft(disposeOutcome)) {
        const e: any = disposeOutcome.left
        expect(e?._tag).toBe('DisposeTimeout')
        expect(e?.entrypoint).toBe('dispose')
        expect(Array.isArray(e?.suggestions)).toBe(true)
        expect(e.suggestions.length).toBeGreaterThan(0)
      }
    }),
  )
})
