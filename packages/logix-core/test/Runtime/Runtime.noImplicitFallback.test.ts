import * as CoreKernel from '@logixjs/core/repo-internal/kernel-api'
import { describe, it, expect } from 'vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import { EXPERIMENTAL_KERNEL_IMPL_ID } from '../../src/internal/runtime/core/RuntimeServices.impls.experimental.js'

describe('Runtime (048): no implicit fallback', () => {
  it('should fail by default (fullCutover) when experimental overrides fall back implicitly', async () => {
    const Root = Logix.Module.make('Runtime.048.NoImplicitFallback', {
      state: Schema.Struct({ count: Schema.Number }),
      actions: { noop: Schema.Void },
      reducers: { noop: (s: any) => s },
    })

    const program = Logix.Program.make(Root, {
      initial: { count: 0 },
      logics: [],
    })

    const runtime = Logix.Runtime.make(program, {
      layer: Layer.mergeAll(
        CoreKernel.kernelLayer({
          kernelId: 'core',
          packageName: '@logixjs/core',
          capabilities: ['experimental'],
        }),
        CoreKernel.runtimeServicesRegistryLayer({ implsByServiceId: {} }),
        CoreKernel.runtimeDefaultServicesOverridesLayer(
          Object.fromEntries(
            CoreKernel.CutoverCoverageMatrix.requiredServiceIds.map((serviceId) => [
              serviceId,
              { implId: EXPERIMENTAL_KERNEL_IMPL_ID },
            ]),
          ),
        ),
      ) as Layer.Layer<any, never, never>,
    })

    const boot = Effect.gen(function* () {
      // Force module assembly (and thus fullCutover gate evaluation).
      yield* Effect.service(Root.tag).pipe(Effect.orDie)
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
      expect(text).toContain(
        `requiredServiceCount: ${CoreKernel.CutoverCoverageMatrix.requiredServiceIds.length.toString()}`,
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

    const program = Logix.Program.make(Root, {
      initial: { count: 0 },
      logics: [],
    })

    const runtime = Logix.Runtime.make(program, {
      layer: Layer.mergeAll(
        CoreKernel.kernelLayer({ kernelId: 'core', packageName: '@logixjs/core' }),
        CoreKernel.runtimeDefaultServicesOverridesLayer({
          txnQueue: { implId: '__missing__', notes: 'test: force fallback on core' },
        }),
      ) as Layer.Layer<any, never, never>,
    })

    const boot = Effect.gen(function* () {
      yield* Effect.service(Root.tag).pipe(Effect.orDie)
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

    const program = Logix.Program.make(Root, {
      initial: { count: 0 },
      logics: [],
    })

    const runtime = Logix.Runtime.make(program, {
      layer: Layer.mergeAll(
        CoreKernel.fullCutoverGateModeLayer('trial'),
        CoreKernel.kernelLayer({ kernelId: 'core', packageName: '@logixjs/core' }),
        CoreKernel.runtimeDefaultServicesOverridesLayer({
          txnQueue: { implId: '__missing__', notes: 'test: trial fallback allowed' },
        }),
      ) as Layer.Layer<any, never, never>,
    })

    const boot = Effect.gen(function* () {
      const moduleRuntime = yield* Effect.service(Root.tag).pipe(Effect.orDie)
      const runtimeServicesEvidence = CoreKernel.getRuntimeServicesEvidence(moduleRuntime)
      const gate = CoreKernel.evaluateFullCutoverGate({
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

    const program = Logix.Program.make(Root, {
      initial: { count: 0 },
      logics: [],
    })

    const runtime = Logix.Runtime.make(program, {
      layer: Layer.mergeAll(
        CoreKernel.kernelLayer({ kernelId: 'core', packageName: '@logixjs/core' }),
        CoreKernel.runtimeDefaultServicesOverridesLayer({
          txnQueue: { implId: 'trace', notes: 'test: explicit non-builtin core binding' },
        }),
      ) as Layer.Layer<any, never, never>,
    })

    const boot = Effect.gen(function* () {
      const moduleRuntime = yield* Effect.service(Root.tag).pipe(Effect.orDie)
      const runtimeServicesEvidence = CoreKernel.getRuntimeServicesEvidence(moduleRuntime)
      const gate = CoreKernel.evaluateFullCutoverGate({
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
