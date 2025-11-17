import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Observability.trialRunModule (trialRunTimeout)', () => {
  it.effect('should classify trial run window timeout as TrialRunTimeout', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('TrialRunModule.TrialRunTimeout', {
        state: Schema.Void,
        actions: {},
      })

      const program = Root.implement({ initial: undefined, logics: [] })

      const hangingLayer = Layer.scopedDiscard(Effect.never) as unknown as Layer.Layer<any, never, never>

      const report = yield* Logix.Observability.trialRunModule(program, {
        runId: 'run:test:trial-run-timeout',
        layer: hangingLayer,
        trialRunTimeoutMs: 10,
        closeScopeTimeout: 50,
        buildEnv: { hostKind: 'node', config: {} },
        diagnosticsLevel: 'off',
      })

      expect(report.ok).toBe(false)
      expect(report.error?.code).toBe('TrialRunTimeout')
    }),
  )
})
