import { describe, it, expect } from '@effect/vitest'
import { Context, Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('SpyCollector (084) - capture branch', () => {
  it.effect('should not report dependencies from an un-taken branch', () =>
    Effect.gen(function* () {
      class ServiceA extends Context.Tag('svc/a')<ServiceA, { readonly a: string }>() {}
      class ServiceB extends Context.Tag('svc/b')<ServiceB, { readonly b: string }>() {}

      const M = Logix.Module.make('Spy.Capture.Branch', {
        state: Schema.Void,
        actions: {},
      })

      const Use = M.logic(
        ($) => ({
          setup: Effect.sync(() => {
            $.lifecycle.onStart(
              Effect.gen(function* () {
                if (false) {
                  yield* $.use(ServiceB)
                }
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
        runId: 'run:test:spy-branch',
        trialRun: {
          diagnosticsLevel: 'off',
          trialRunTimeoutMs: 1000,
          layer: Layer.mergeAll(Layer.succeed(ServiceA, { a: 'ok' }), Layer.succeed(ServiceB, { b: 'ok' })),
        },
      })

      expect(report.usedServices.map((x) => x.serviceId)).toEqual(['svc/a'])
    }),
  )
})

