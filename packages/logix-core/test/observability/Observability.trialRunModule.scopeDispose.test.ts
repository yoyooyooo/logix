import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer, Schema, ServiceMap } from 'effect'
import * as Logix from '../../src/index.js'

describe('Observability.trialRunModule (scope dispose)', () => {
  it.effect('should close scope and run finalizers', () =>
    Effect.gen(function* () {
      let disposed = false

      const Root = Logix.Module.make('TrialRunModule.ScopeDispose', {
        state: Schema.Void,
        actions: {},
      })

      const program = Root.implement({ initial: undefined, logics: [] })

      const DummyTag = ServiceMap.Service<{}>('@test/TrialRunModule.ScopeDispose/Dummy')
      const layer = Layer.effect(
        DummyTag,
        Effect.acquireRelease(
          Effect.succeed({}),
          () =>
            Effect.sync(() => {
              disposed = true
            }),
        ),
      ) as unknown as Layer.Layer<any, never, never>

      const report = yield* Logix.Observability.trialRunModule(program, {
        runId: 'run:test:dispose',
        layer,
        buildEnv: { hostKind: 'node', config: {} },
        diagnosticsLevel: 'off',
      })

      expect(report.ok).toBe(true)
      expect(disposed).toBe(true)
    }),
  )
})
