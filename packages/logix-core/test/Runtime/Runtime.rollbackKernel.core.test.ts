import { describe, it, expect } from 'vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Runtime (048): explicit core kernel layer', () => {
  it('should keep evidence explainable', async () => {
    const Root = Logix.Module.make('Runtime.048.RollbackKernel.core', {
      state: Schema.Struct({ count: Schema.Number }),
      actions: { noop: Schema.Void },
      reducers: { noop: (s: any) => s },
    })

    const program = Root.implement({
      initial: { count: 0 },
      logics: [],
    })

    const runtime = Logix.Runtime.make(program, {
      layer: Layer.mergeAll(
        Logix.Kernel.kernelLayer(Logix.Kernel.defaultKernelImplementationRef),
        Logix.Kernel.runtimeDefaultServicesOverridesLayer({}),
      ) as Layer.Layer<any, never, never>,
    })

    const readEvidence = Effect.gen(function* () {
      const moduleRuntime = yield* Root.tag
      return {
        kernel: Logix.Kernel.getKernelImplementationRef(moduleRuntime),
        evidence: Logix.Kernel.getRuntimeServicesEvidence(moduleRuntime),
      } as const
    })

    try {
      const { kernel, evidence } = await runtime.runPromise(readEvidence)

      expect(kernel.kernelId).toBe('core')
      expect(evidence.overridesApplied).toEqual([])

      const gate = Logix.Kernel.evaluateFullCutoverGate({
        mode: 'fullCutover',
        requestedKernelId: 'core',
        runtimeServicesEvidence: evidence,
        diagnosticsLevel: 'off',
      })

      expect(gate.verdict).toBe('PASS')
      expect(gate.fullyActivated).toBe(true)
      expect(gate.missingServiceIds).toEqual([])
      expect(gate.fallbackServiceIds).toEqual([])
    } finally {
      await runtime.dispose()
    }
  })
})
