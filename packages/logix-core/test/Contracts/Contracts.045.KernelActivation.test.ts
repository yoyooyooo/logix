import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('contracts (045): Kernel activation判定', () => {
  it.effect('should return false when runtime service selection fallback happened', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('Contracts.045.KernelActivation.Fallback', {
        state: Schema.Void,
        actions: {},
      })

      const program = Root.implement({ initial: undefined, logics: [] })

      const layer = Layer.mergeAll(
        Logix.Kernel.kernelLayer({ kernelId: 'core-ng', packageName: '@logix/core-ng' }),
        Logix.Kernel.runtimeDefaultServicesOverridesLayer({
          txnQueue: { implId: '__missing__' },
        }),
      )

      const report = yield* Logix.Observability.trialRunModule(program, {
        runId: 'run:test:kernel-activation:fallback',
        buildEnv: { hostKind: 'node', config: {} },
        diagnosticsLevel: 'light',
        layer,
      })

      const evidence = report.environment?.runtimeServicesEvidence as any
      expect(evidence).toBeDefined()
      expect(Logix.Kernel.isKernelFullyActivated(evidence)).toBe(false)
      expect(
        Array.isArray(evidence?.overridesApplied) &&
          evidence.overridesApplied.some((s: unknown) => String(s).includes('fallback=')),
      ).toBe(true)
    }),
  )

  it.effect('should return true when overrides are applied without fallback', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('Contracts.045.KernelActivation.NoFallback', {
        state: Schema.Void,
        actions: {},
      })

      const program = Root.implement({ initial: undefined, logics: [] })

      const layer = Layer.mergeAll(
        Logix.Kernel.kernelLayer({ kernelId: 'core-ng', packageName: '@logix/core-ng' }),
        Logix.Kernel.runtimeDefaultServicesOverridesLayer({
          txnQueue: { implId: 'trace' },
        }),
      )

      const report = yield* Logix.Observability.trialRunModule(program, {
        runId: 'run:test:kernel-activation:no-fallback',
        buildEnv: { hostKind: 'node', config: {} },
        diagnosticsLevel: 'light',
        layer,
      })

      const evidence = report.environment?.runtimeServicesEvidence as any
      expect(evidence).toBeDefined()
      expect(Logix.Kernel.isKernelFullyActivated(evidence)).toBe(true)
      expect(
        Array.isArray(evidence?.overridesApplied) &&
          evidence.overridesApplied.some((s: unknown) => String(s).includes('fallback=')),
      ).toBe(false)
    }),
  )

  it.scoped('default runtime (core) should be fully activated', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('Contracts.045.KernelActivation.DefaultRuntime.core', {
        state: Schema.Void,
        actions: {},
      })

      const program = Root.implement({ initial: undefined, logics: [] })

      const runtime = yield* Effect.acquireRelease(
        Effect.sync(() => Logix.Runtime.make(program)),
        (rt) => Effect.promise(() => rt.dispose()),
      )

      const read = Effect.gen(function* () {
        const moduleRuntime = yield* Root.tag
        return {
          kernel: Logix.Kernel.getKernelImplementationRef(moduleRuntime),
          evidence: Logix.Kernel.getRuntimeServicesEvidence(moduleRuntime),
        } as const
      })

      const { kernel, evidence } = yield* Effect.promise(() => runtime.runPromise(read))
      expect(kernel.kernelId).toBe('core')
      expect(Logix.Kernel.isKernelFullyActivated(evidence)).toBe(true)
    }),
  )

  it.scoped('explicit core runtime (layer) should be fully activated', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('Contracts.045.KernelActivation.RollbackRuntime.core', {
        state: Schema.Void,
        actions: {},
      })

      const program = Root.implement({ initial: undefined, logics: [] })

      const runtime = yield* Effect.acquireRelease(
        Effect.sync(() =>
          Logix.Runtime.make(program, {
            layer: Layer.mergeAll(
              Logix.Kernel.kernelLayer(Logix.Kernel.defaultKernelImplementationRef),
              Logix.Kernel.runtimeDefaultServicesOverridesLayer({}),
            ) as Layer.Layer<any, never, never>,
          }),
        ),
        (rt) => Effect.promise(() => rt.dispose()),
      )

      const read = Effect.gen(function* () {
        const moduleRuntime = yield* Root.tag
        return {
          kernel: Logix.Kernel.getKernelImplementationRef(moduleRuntime),
          evidence: Logix.Kernel.getRuntimeServicesEvidence(moduleRuntime),
        } as const
      })

      const { kernel, evidence } = yield* Effect.promise(() => runtime.runPromise(read))
      expect(kernel.kernelId).toBe('core')
      expect(Logix.Kernel.isKernelFullyActivated(evidence)).toBe(true)
    }),
  )
})
