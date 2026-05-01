import * as CoreKernel from '@logixjs/core/repo-internal/kernel-api'
import { describe, it, expect } from 'vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Runtime (048): kernel evidence serializable (diagnostics=off)', () => {
  it('default(core) and core full-cutover should export JSON-serializable evidence + gate result', async () => {
    const Root = Logix.Module.make('Runtime.048.KernelEvidence.Serializable', {
      state: Schema.Struct({ count: Schema.Number }),
      actions: { noop: Schema.Void },
      reducers: { noop: (s: any) => s },
    })

    const program = Logix.Program.make(Root, {
      initial: { count: 0 },
      logics: [],
    })

    const readEvidence = Effect.gen(function* () {
      const moduleRuntime = yield* Effect.service(Root.tag).pipe(Effect.orDie)
      const kernel = CoreKernel.getKernelImplementationRef(moduleRuntime)
      const evidence = CoreKernel.getRuntimeServicesEvidence(moduleRuntime)
      const gate = CoreKernel.evaluateFullCutoverGate({
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
      expect(payload.gate.reason).toBe('fully_activated')
      expect(payload.gate.evidence.requiredServiceCount).toBe(CoreKernel.CutoverCoverageMatrix.requiredServiceIds.length)
      expect(() => JSON.stringify(payload)).not.toThrow()
    } finally {
      await defaultRuntime.dispose()
    }

    const experimentalFullCutoverLayer = CoreKernel.fullCutoverLayer({
      capabilities: ['runtime:evidence'],
    })

    const experimentalRuntime = Logix.Runtime.make(program, {
      layer: experimentalFullCutoverLayer as Layer.Layer<any, never, never>,
    })
    try {
      const payload = await experimentalRuntime.runPromise(readEvidence)
      expect(payload.kernel.kernelId).toBe('core')
      expect(payload.kernel.capabilities).toContain('runtime:evidence')
      expect(payload.gate.verdict).toBe('PASS')
      expect(payload.gate.reason).toBe('fully_activated')
      expect(payload.gate.evidence.requiredServiceCount).toBe(CoreKernel.CutoverCoverageMatrix.requiredServiceIds.length)
      expect(() => JSON.stringify(payload)).not.toThrow()
    } finally {
      await experimentalRuntime.dispose()
    }
  })
})
