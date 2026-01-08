import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('contracts (047): Full Cutover Gate (fallback)', () => {
  it.scoped('fullCutover: any fallback MUST FAIL and include serviceId in missingServiceIds', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('Contracts.047.FullCutoverGate.Fallback', {
        state: Schema.Struct({ count: Schema.Number }),
        actions: { noop: Schema.Void },
        reducers: { noop: (s: any) => s },
      })

      const program = Root.implement({
        initial: { count: 0 },
        logics: [],
      })

      const layer = Layer.mergeAll(
        Logix.Kernel.fullCutoverGateModeLayer('trial'),
        Logix.Kernel.kernelLayer({ kernelId: 'core-ng', packageName: '@logixjs/core-ng' }),
        Logix.Kernel.runtimeDefaultServicesOverridesLayer({
          txnQueue: { implId: '__missing__', notes: 'test: trigger fallback' },
        }),
      ) as Layer.Layer<any, never, never>

      const ctx = yield* Logix.Runtime.openProgram(program, { layer, handleSignals: false })

      const runtimeServicesEvidence = Logix.Kernel.getRuntimeServicesEvidence(ctx.module)
      const gate = Logix.Kernel.evaluateFullCutoverGate({
        mode: 'fullCutover',
        requestedKernelId: 'core-ng',
        runtimeServicesEvidence,
        diagnosticsLevel: 'off',
      })

      expect(gate.verdict).toBe('FAIL')
      expect(gate.fallbackServiceIds).toContain('txnQueue')
      expect(gate.missingServiceIds).toContain('txnQueue')
      expect(gate.anchor.txnSeq).toBe(0)
    }),
  )
})
