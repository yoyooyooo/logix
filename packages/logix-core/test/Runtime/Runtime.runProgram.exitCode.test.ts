import { describe, expect } from 'vitest'
import { it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Runtime.runProgram exitCode (US1)', () => {
  it.scoped('maps success void|number to process.exitCode and failure to non-zero', () =>
    Effect.gen(function* () {
      const proc: any = (globalThis as any).process
      const prev = proc?.exitCode

      const Root = Logix.Module.make('Runtime.runProgram.exitCode', {
        state: Schema.Void,
        actions: {},
      })
      const impl = Root.implement({ initial: undefined, logics: [] })

      yield* Effect.promise(() =>
        Logix.Runtime.runProgram(impl, () => Effect.void, {
          layer: Layer.empty as Layer.Layer<any, never, never>,
          handleSignals: false,
          exitCode: true,
        }),
      )

      expect(proc.exitCode).toBe(0)

      yield* Effect.promise(() =>
        Logix.Runtime.runProgram(impl, () => Effect.succeed(7), {
          layer: Layer.empty as Layer.Layer<any, never, never>,
          handleSignals: false,
          exitCode: true,
        }),
      )

      expect(proc.exitCode).toBe(7)

      yield* Effect.tryPromise({
        try: () =>
          Logix.Runtime.runProgram(impl, () => Effect.dieMessage('fail'), {
            layer: Layer.empty as Layer.Layer<any, never, never>,
            handleSignals: false,
            exitCode: true,
            reportError: false,
          }),
        catch: () => undefined,
      }).pipe(Effect.catchAll(() => Effect.void))

      expect(proc.exitCode).toBe(1)

      proc.exitCode = prev
    }),
  )
})
