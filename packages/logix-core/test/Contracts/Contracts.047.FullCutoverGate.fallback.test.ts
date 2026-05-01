import * as CoreKernel from '@logixjs/core/repo-internal/kernel-api'
import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('contracts (047): Full Cutover Gate (fallback)', () => {
  it.effect('fullCutover: any fallback MUST FAIL and expose fallback service ids', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('Contracts.047.FullCutoverGate.Fallback', {
        state: Schema.Struct({ count: Schema.Number }),
        actions: { noop: Schema.Void },
        reducers: { noop: (s: any) => s },
      })

      const program = Logix.Program.make(Root, {
        initial: { count: 0 },
        logics: [],
      })

      const layer = Layer.mergeAll(
        CoreKernel.experimentalLayer(),
        CoreKernel.fullCutoverGateModeLayer('trial'),
        CoreKernel.runtimeDefaultServicesOverridesLayer({
          txnQueue: { implId: '__missing__', notes: 'test: trigger fallback' },
        }),
      ) as Layer.Layer<any, never, never>

      const ctx = yield* Logix.Runtime.openProgram(program, { layer, handleSignals: false })

      const runtimeServicesEvidence = CoreKernel.getRuntimeServicesEvidence(ctx.module)
      const gate = CoreKernel.evaluateFullCutoverGate({
        mode: 'fullCutover',
        requestedKernelId: 'core',
        runtimeServicesEvidence,
        diagnosticsLevel: 'off',
      })

      expect(gate.verdict).toBe('FAIL')
      expect(gate.reason).toBe('fallback_bindings_detected')
      expect(gate.fallbackServiceIds).toContain('txnQueue')
      expect(gate.evidence.requiredServiceCount).toBe(CoreKernel.CutoverCoverageMatrix.requiredServiceIds.length)
      expect(gate.anchor.txnSeq).toBe(0)
    }),
  )
})
