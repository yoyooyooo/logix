import { describe, it, expect } from '@effect/vitest'
import { Context, Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('SpyCollector (084) - disabled by default', () => {
  it.effect('should not require SpyCollector to run $.use(Tag)', () =>
    Effect.gen(function* () {
      class FooService extends Context.Tag('svc/foo')<FooService, { readonly foo: string }>() {}

      const M = Logix.Module.make('Spy.Disabled', {
        state: Schema.Void,
        actions: {},
      })

      const UseFoo = M.logic(($) => ({
        setup: Effect.sync(() => {
          $.lifecycle.onStart(
            Effect.gen(function* () {
              const foo = yield* $.use(FooService)
              void foo.foo
            }),
          )
        }),
        run: Effect.void,
      }))

      const program = M.implement({ initial: undefined, logics: [UseFoo] })

      const report = yield* Logix.Observability.trialRunModule(program, {
        runId: 'run:test:spy-disabled',
        diagnosticsLevel: 'off',
        layer: Layer.succeed(FooService, { foo: 'ok' }),
        trialRunTimeoutMs: 1000,
      })

      expect(report.ok).toBe(true)
      expect(report.environment?.missingServices).toEqual([])
    }),
  )
})

