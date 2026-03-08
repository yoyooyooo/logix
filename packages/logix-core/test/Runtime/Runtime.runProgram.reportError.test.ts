import { describe, it, expect } from '@effect/vitest'
import { vi } from 'vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Runtime.runProgram reportError (US1)', () => {
  it.effect('reportError=false disables default console.error output in CLI mode', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('Runtime.runProgram.reportError', {
        state: Schema.Void,
        actions: {},
      })
      const impl = Root.implement({ initial: undefined, logics: [] })

      const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

      yield* Effect.tryPromise({
        try: () =>
          Logix.Runtime.runProgram(impl, () => Effect.die(new Error('boom')), {
            layer: Layer.empty as Layer.Layer<any, never, never>,
            handleSignals: false,
            exitCode: true,
            reportError: false,
          }),
        catch: () => undefined,
      }).pipe(Effect.catch(() => Effect.void))

      expect(spy).not.toHaveBeenCalled()

      spy.mockRestore()
    }),
  )

  it.effect('reportError=true outputs error via console.error in CLI mode', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('Runtime.runProgram.reportError.enabled', {
        state: Schema.Void,
        actions: {},
      })
      const impl = Root.implement({ initial: undefined, logics: [] })

      const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

      yield* Effect.tryPromise({
        try: () =>
          Logix.Runtime.runProgram(impl, () => Effect.die(new Error('boom')), {
            layer: Layer.empty as Layer.Layer<any, never, never>,
            handleSignals: false,
            exitCode: true,
            reportError: true,
          }),
        catch: () => undefined,
      }).pipe(Effect.catch(() => Effect.void))

      expect(spy).toHaveBeenCalled()

      spy.mockRestore()
    }),
  )
})
