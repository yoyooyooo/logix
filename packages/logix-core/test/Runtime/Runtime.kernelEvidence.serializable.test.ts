import { describe, it, expect } from 'vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import { coreNgRuntimeServicesRegistry } from '../../src/internal/runtime/core/RuntimeServices.impls.coreNg.js'

describe('Runtime (048): kernel evidence serializable (diagnostics=off)', () => {
  it('default(core) and core-ng(fullCutover) should export JSON-serializable evidence + gate result', async () => {
    const Root = Logix.Module.make('Runtime.048.KernelEvidence.Serializable', {
      state: Schema.Struct({ count: Schema.Number }),
      actions: { noop: Schema.Void },
      reducers: { noop: (s: any) => s },
    })

    const program = Root.implement({
      initial: { count: 0 },
      logics: [],
    })

    const readEvidence = Effect.gen(function* () {
      const moduleRuntime = yield* Root.tag
      const kernel = Logix.Kernel.getKernelImplementationRef(moduleRuntime)
      const evidence = Logix.Kernel.getRuntimeServicesEvidence(moduleRuntime)
      const gate = Logix.Kernel.evaluateFullCutoverGate({
        mode: 'fullCutover',
        requestedKernelId: kernel.kernelId,
        runtimeServicesEvidence: evidence,
        diagnosticsLevel: 'off',
      })
      return { kernel, evidence, gate } as const
    })

    const defaultRuntime = Logix.Runtime.make(program)
    try {
      const payload = await defaultRuntime.runPromise(readEvidence)
      expect(payload.kernel.kernelId).toBe('core')
      expect(payload.gate.verdict).toBe('PASS')
      expect(() => JSON.stringify(payload)).not.toThrow()
    } finally {
      await defaultRuntime.dispose()
    }

    const coreNgFullCutoverLayer = Layer.mergeAll(
      Logix.Kernel.kernelLayer({ kernelId: 'core-ng', packageName: '@logix/core' }),
      Logix.Kernel.fullCutoverGateModeLayer('fullCutover'),
      Logix.Kernel.runtimeServicesRegistryLayer(coreNgRuntimeServicesRegistry),
      Logix.Kernel.runtimeDefaultServicesOverridesLayer(
        Object.fromEntries(
          Logix.Kernel.CutoverCoverageMatrix.requiredServiceIds.map((serviceId) => [serviceId, { implId: 'core-ng' }]),
        ),
      ),
    )

    const coreNgRuntime = Logix.Runtime.make(program, {
      layer: coreNgFullCutoverLayer as Layer.Layer<any, never, never>,
    })
    try {
      const payload = await coreNgRuntime.runPromise(readEvidence)
      expect(payload.kernel.kernelId).toBe('core-ng')
      expect(payload.gate.verdict).toBe('PASS')
      expect(() => JSON.stringify(payload)).not.toThrow()
    } finally {
      await coreNgRuntime.dispose()
    }
  })
})
