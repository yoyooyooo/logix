import { describe, it, expect } from '@effect/vitest'
import { Context, Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('SpyCollector (084) - capture basic', () => {
  it.effect('should capture usedServices deterministically with occurrences', () =>
    Effect.gen(function* () {
      class ServiceA extends Context.Tag('svc/a')<ServiceA, { readonly a: string }>() {}
      class ServiceB extends Context.Tag('svc/b')<ServiceB, { readonly b: string }>() {}

      const M = Logix.Module.make('Spy.Capture.Basic', {
        state: Schema.Void,
        actions: {},
      })

      const Use = M.logic(
        ($) => ({
          setup: Effect.sync(() => {
            $.lifecycle.onStart(
              Effect.gen(function* () {
                yield* $.use(ServiceA)
                yield* $.use(ServiceA)
                yield* $.use(ServiceB)
              }),
            )
          }),
          run: Effect.void,
        }),
        { id: 'Use' },
      )

      const program = M.implement({ initial: undefined, logics: [Use] })

      const report = yield* Logix.Observability.runLoaderSpy(program, {
        runId: 'run:test:spy-basic',
        trialRun: {
          diagnosticsLevel: 'off',
          trialRunTimeoutMs: 1000,
          layer: Layer.mergeAll(Layer.succeed(ServiceA, { a: 'ok' }), Layer.succeed(ServiceB, { b: 'ok' })),
        },
      })

      const byId = new Map(report.usedServices.map((x) => [x.serviceId, x]))
      expect(byId.get('svc/a')?.occurrences).toBe(2)
      expect(byId.get('svc/b')?.occurrences).toBe(1)
      expect(report.rawMode).toEqual([])
    }),
  )
})

