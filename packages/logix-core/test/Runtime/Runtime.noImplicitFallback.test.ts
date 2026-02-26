import { describe, it, expect } from 'vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Runtime (048): no implicit fallback', () => {
  it('should fail by default (fullCutover) when requested impl registry is missing (no silent fallback)', async () => {
    const Root = Logix.Module.make('Runtime.048.NoImplicitFallback', {
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
        Logix.Kernel.kernelLayer({ kernelId: 'core-ng', packageName: '@logixjs/core-ng' }),
        Logix.Kernel.runtimeServicesRegistryLayer({ implsByServiceId: {} }),
        Logix.Kernel.runtimeDefaultServicesOverridesLayer(
          Object.fromEntries(
            Logix.Kernel.CutoverCoverageMatrix.requiredServiceIds.map((serviceId) => [serviceId, { implId: 'core-ng' }]),
          ),
        ),
      ) as Layer.Layer<any, never, never>,
    })

    const boot = Effect.gen(function* () {
      // Force module assembly (and thus fullCutover gate evaluation).
      yield* Root.tag
    })

    try {
      let failure: unknown
      try {
        await runtime.runPromise(boot)
      } catch (error) {
        failure = error
      }
      expect(failure).toBeDefined()
      const text = String(failure)
      expect(text).toContain('FullCutoverGateFailed')
      expect(text).toContain('reason: missing_and_fallback')
      expect(text).toContain(
        `requiredServiceCount: ${Logix.Kernel.CutoverCoverageMatrix.requiredServiceIds.length.toString()}`,
      )
    } finally {
      await runtime.dispose()
    }
  })

  it('should fail under fullCutover for core kernel when override impl is missing (fallback requires explicit trial)', async () => {
    const Root = Logix.Module.make('Runtime.048.NoImplicitFallback.Core', {
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
        Logix.Kernel.kernelLayer({ kernelId: 'core', packageName: '@logixjs/core' }),
        Logix.Kernel.runtimeDefaultServicesOverridesLayer({
          txnQueue: { implId: '__missing__', notes: 'test: force fallback on core' },
        }),
      ) as Layer.Layer<any, never, never>,
    })

    const boot = Effect.gen(function* () {
      yield* Root.tag
    })

    try {
      let failure: unknown
      try {
        await runtime.runPromise(boot)
      } catch (error) {
        failure = error
      }
      expect(failure).toBeDefined()
      const text = String(failure)
      expect(text).toContain('FullCutoverGateFailed')
      expect(text).toContain('reason: fallback_bindings_detected')
    } finally {
      await runtime.dispose()
    }
  })

  it('should allow fallback only when trial mode is explicitly enabled', async () => {
    const Root = Logix.Module.make('Runtime.048.NoImplicitFallback.Trial', {
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
        Logix.Kernel.fullCutoverGateModeLayer('trial'),
        Logix.Kernel.kernelLayer({ kernelId: 'core', packageName: '@logixjs/core' }),
        Logix.Kernel.runtimeDefaultServicesOverridesLayer({
          txnQueue: { implId: '__missing__', notes: 'test: trial fallback allowed' },
        }),
      ) as Layer.Layer<any, never, never>,
    })

    const boot = Effect.gen(function* () {
      const moduleRuntime = yield* Root.tag
      const runtimeServicesEvidence = Logix.Kernel.getRuntimeServicesEvidence(moduleRuntime)
      const gate = Logix.Kernel.evaluateFullCutoverGate({
        mode: 'trial',
        requestedKernelId: 'core',
        runtimeServicesEvidence,
        diagnosticsLevel: 'off',
      })
      expect(gate.verdict).toBe('PASS')
      expect(gate.reason).toBe('trial_mode_with_fallback')
      expect(gate.fallbackServiceIds).toContain('txnQueue')
    })

    try {
      await runtime.runPromise(boot)
    } finally {
      await runtime.dispose()
    }
  })

  it('should allow explicit core override without fallback under fullCutover', async () => {
    const Root = Logix.Module.make('Runtime.048.NoImplicitFallback.CoreExplicitOverride', {
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
        Logix.Kernel.kernelLayer({ kernelId: 'core', packageName: '@logixjs/core' }),
        Logix.Kernel.runtimeDefaultServicesOverridesLayer({
          txnQueue: { implId: 'trace', notes: 'test: explicit non-builtin core binding' },
        }),
      ) as Layer.Layer<any, never, never>,
    })

    const boot = Effect.gen(function* () {
      const moduleRuntime = yield* Root.tag
      const runtimeServicesEvidence = Logix.Kernel.getRuntimeServicesEvidence(moduleRuntime)
      const gate = Logix.Kernel.evaluateFullCutoverGate({
        mode: 'fullCutover',
        requestedKernelId: 'core',
        runtimeServicesEvidence,
        diagnosticsLevel: 'off',
      })
      expect(gate.verdict).toBe('PASS')
      expect(gate.fullyActivated).toBe(true)
      expect(gate.missingServiceIds).toEqual([])
      expect(gate.fallbackServiceIds).toEqual([])
    })

    try {
      await runtime.runPromise(boot)
    } finally {
      await runtime.dispose()
    }
  })
})
