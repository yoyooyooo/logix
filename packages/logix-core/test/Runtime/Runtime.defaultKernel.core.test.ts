import { describe, it, expect } from 'vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Runtime (048): default kernel', () => {
  it('should default to core and be fully activated (no fallback)', async () => {
    const Root = Logix.Module.make('Runtime.048.DefaultKernel.core', {
      state: Schema.Struct({ count: Schema.Number }),
      actions: { noop: Schema.Void },
      reducers: { noop: (s: any) => s },
    })

    const program = Root.implement({
      initial: { count: 0 },
      logics: [],
    })

    const runtime = Logix.Runtime.make(program)

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
