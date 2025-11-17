import { describe, expect, vi } from 'vitest'
import { it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Runtime.runProgram reportError (US1)', () => {
  it.scoped('reportError=false disables default console.error output in CLI mode', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('Runtime.runProgram.reportError', {
        state: Schema.Void,
        actions: {},
      })
      const impl = Root.implement({ initial: undefined, logics: [] })

      const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

      yield* Effect.tryPromise({
        try: () =>
          Logix.Runtime.runProgram(impl, () => Effect.dieMessage('boom'), {
            layer: Layer.empty as Layer.Layer<any, never, never>,
            handleSignals: false,
            exitCode: true,
            reportError: false,
          }),
        catch: () => undefined,
      }).pipe(Effect.catchAll(() => Effect.void))

      expect(spy).not.toHaveBeenCalled()

      spy.mockRestore()
    }),
  )

  it.scoped('reportError=true outputs error via console.error in CLI mode', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('Runtime.runProgram.reportError.enabled', {
        state: Schema.Void,
        actions: {},
      })
      const impl = Root.implement({ initial: undefined, logics: [] })

      const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

      yield* Effect.tryPromise({
        try: () =>
          Logix.Runtime.runProgram(impl, () => Effect.dieMessage('boom'), {
            layer: Layer.empty as Layer.Layer<any, never, never>,
            handleSignals: false,
            exitCode: true,
            reportError: true,
          }),
        catch: () => undefined,
      }).pipe(Effect.catchAll(() => Effect.void))

      expect(spy).toHaveBeenCalled()

      spy.mockRestore()
    }),
  )
})
