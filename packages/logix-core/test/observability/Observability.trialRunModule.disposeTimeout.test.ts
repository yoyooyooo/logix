import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Observability.trialRunModule (disposeTimeout)', () => {
  it.effect('should classify closeScopeTimeout as DisposeTimeout', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('TrialRunModule.DisposeTimeout', {
        state: Schema.Void,
        actions: {},
      })

      const program = Root.implement({ initial: undefined, logics: [] })

      const neverFinalizeLayer = Layer.scopedDiscard(Effect.addFinalizer(() => Effect.never)) as unknown as Layer.Layer<
        any,
        never,
        never
      >

      const report = yield* Logix.Observability.trialRunModule(program, {
        runId: 'run:test:dispose-timeout',
        layer: neverFinalizeLayer,
        closeScopeTimeout: 10,
        trialRunTimeoutMs: 100,
        buildEnv: { hostKind: 'node', config: {} },
        diagnosticsLevel: 'off',
      })

      expect(report.ok).toBe(false)
      expect(report.error?.code).toBe('DisposeTimeout')
    }),
  )
})
