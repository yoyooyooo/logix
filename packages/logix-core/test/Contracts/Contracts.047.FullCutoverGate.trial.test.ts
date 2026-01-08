import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('contracts (047): Full Cutover Gate (trial)', () => {
  it.scoped('trial: fallback allowed but must not be misreported as fullyActivated', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('Contracts.047.FullCutoverGate.Trial', {
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
          txnQueue: { implId: '__missing__', notes: 'test: trigger fallback in trial mode' },
        }),
      ) as Layer.Layer<any, never, never>

      const ctx = yield* Logix.Runtime.openProgram(program, { layer, handleSignals: false })

      const runtimeServicesEvidence = Logix.Kernel.getRuntimeServicesEvidence(ctx.module)
      const gate = Logix.Kernel.evaluateFullCutoverGate({
        mode: 'trial',
        requestedKernelId: 'core-ng',
        runtimeServicesEvidence,
        diagnosticsLevel: 'off',
      })

      expect(gate.verdict).toBe('PASS')
      expect(gate.fullyActivated).toBe(false)
      expect(gate.fallbackServiceIds).toContain('txnQueue')
    }),
  )
})
