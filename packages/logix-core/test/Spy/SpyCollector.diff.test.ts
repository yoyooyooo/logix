import { describe, it, expect } from '@effect/vitest'
import { Context, Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('SpyCollector (084) - declared vs used diff', () => {
  it.effect('should report declared-but-not-used and used-but-not-declared', () =>
    Effect.gen(function* () {
      class ServiceA extends Context.Tag('svc/a')<ServiceA, { readonly a: string }>() {}
      class ServiceB extends Context.Tag('svc/b')<ServiceB, { readonly b: string }>() {}

      const M = Logix.Module.make('Spy.Diff', {
        state: Schema.Void,
        actions: {},
        services: {
          a: ServiceA,
          b: ServiceB,
        },
      })

      const Use = M.logic(
        ($) => ({
          setup: Effect.sync(() => {
            $.lifecycle.onStart(
              Effect.gen(function* () {
                yield* $.use(ServiceA)
              }),
            )
          }),
          run: Effect.void,
        }),
        { id: 'Use' },
      )

      const program = M.implement({ initial: undefined, logics: [Use] })

      const report = yield* Logix.Observability.runLoaderSpy(program, {
        runId: 'run:test:spy-diff',
        trialRun: {
          diagnosticsLevel: 'off',
          trialRunTimeoutMs: 1000,
          layer: Layer.mergeAll(Layer.succeed(ServiceA, { a: 'ok' }), Layer.succeed(ServiceB, { b: 'ok' })),
        },
      })

      expect(report.diff?.usedButNotDeclared).toEqual([])
      expect(report.diff?.declaredButNotUsed).toEqual(['svc/b'])
    }),
  )
})

