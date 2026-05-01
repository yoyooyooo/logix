import { describe, it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Runtime.run exitCode (US1)', () => {
  it.effect('maps success void|number to process.exitCode and failure to non-zero', () =>
    Effect.gen(function* () {
      const proc: any = (globalThis as any).process
      const prev = proc?.exitCode

      const Root = Logix.Module.make('Runtime.run.exitCode', {
        state: Schema.Void,
        actions: {},
      })
      const program = Logix.Program.make(Root, { initial: undefined, logics: [] })

      yield* Effect.promise(() =>
        Logix.Runtime.run(program, () => Effect.void, {
          layer: Layer.empty as Layer.Layer<any, never, never>,
          handleSignals: false,
          exitCode: true,
        }),
      )

      expect(proc.exitCode).toBe(0)

      yield* Effect.promise(() =>
        Logix.Runtime.run(program, () => Effect.succeed(7), {
          layer: Layer.empty as Layer.Layer<any, never, never>,
          handleSignals: false,
          exitCode: true,
        }),
      )

      expect(proc.exitCode).toBe(7)

      yield* Effect.tryPromise({
        try: () =>
          Logix.Runtime.run(program, () => Effect.die(new Error('fail')), {
            layer: Layer.empty as Layer.Layer<any, never, never>,
            handleSignals: false,
            exitCode: true,
            reportError: false,
          }),
        catch: () => undefined,
      }).pipe(Effect.catch(() => Effect.void))

      expect(proc.exitCode).toBe(1)

      proc.exitCode = prev
    }),
  )
})
