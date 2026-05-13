import * as CoreKernel from '@logixjs/core/repo-internal/kernel-api'
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

      const program = Logix.Program.make(Root, { initial: undefined, logics: [] })

      const layer = Layer.mergeAll(
        CoreKernel.experimentalLayer(),
        CoreKernel.fullCutoverGateModeLayer('trial'),
        CoreKernel.runtimeDefaultServicesOverridesLayer({
          txnQueue: { implId: '__missing__' },
        }),
      )

      const report = yield* Logix.Runtime.trial(program, {
        runId: 'run:test:kernel-activation:fallback',
        buildEnv: { hostKind: 'node', config: {} },
        diagnosticsLevel: 'light',
        layer,
      })

      const evidence = report.environment?.runtimeServicesEvidence as any
      expect(evidence).toBeDefined()
      expect(CoreKernel.isKernelFullyActivated(evidence)).toBe(false)
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

      const program = Logix.Program.make(Root, { initial: undefined, logics: [] })

      const layer = Layer.mergeAll(
        CoreKernel.experimentalLayer(),
        CoreKernel.fullCutoverGateModeLayer('trial'),
        CoreKernel.runtimeDefaultServicesOverridesLayer({
          txnQueue: { implId: 'trace' },
        }),
      )

      const report = yield* Logix.Runtime.trial(program, {
        runId: 'run:test:kernel-activation:no-fallback',
        buildEnv: { hostKind: 'node', config: {} },
        diagnosticsLevel: 'light',
        layer,
      })

      const evidence = report.environment?.runtimeServicesEvidence as any
      expect(evidence).toBeDefined()
      expect(CoreKernel.isKernelFullyActivated(evidence)).toBe(true)
      expect(
        Array.isArray(evidence?.overridesApplied) &&
          evidence.overridesApplied.some((s: unknown) => String(s).includes('fallback=')),
      ).toBe(false)
    }),
  )

  it.effect('default runtime (core) should be fully activated', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('Contracts.045.KernelActivation.DefaultRuntime.core', {
        state: Schema.Void,
        actions: {},
      })

      const program = Logix.Program.make(Root, { initial: undefined, logics: [] })

      const runtime = yield* Effect.acquireRelease(
        Effect.sync(() => Logix.Runtime.make(program)),
        (rt) => Effect.promise(() => rt.dispose()),
      )

      const read = Effect.gen(function* () {
        const moduleRuntime = yield* Effect.service(Root.tag).pipe(Effect.orDie)
        return {
          kernel: CoreKernel.getKernelImplementationRef(moduleRuntime),
          evidence: CoreKernel.getRuntimeServicesEvidence(moduleRuntime),
        } as const
      })

      const { kernel, evidence } = yield* Effect.promise(() => runtime.runPromise(read))
      expect(kernel.kernelId).toBe('core')
      expect(CoreKernel.isKernelFullyActivated(evidence)).toBe(true)
    }),
  )

  it.effect('explicit core runtime (layer) should be fully activated', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('Contracts.045.KernelActivation.RollbackRuntime.core', {
        state: Schema.Void,
        actions: {},
      })

      const program = Logix.Program.make(Root, { initial: undefined, logics: [] })

      const runtime = yield* Effect.acquireRelease(
        Effect.sync(() =>
          Logix.Runtime.make(program, {
            layer: Layer.mergeAll(
              CoreKernel.kernelLayer(CoreKernel.defaultKernelImplementationRef),
              CoreKernel.runtimeDefaultServicesOverridesLayer({}),
            ) as Layer.Layer<any, never, never>,
          }),
        ),
        (rt) => Effect.promise(() => rt.dispose()),
      )

      const read = Effect.gen(function* () {
        const moduleRuntime = yield* Effect.service(Root.tag).pipe(Effect.orDie)
        return {
          kernel: CoreKernel.getKernelImplementationRef(moduleRuntime),
          evidence: CoreKernel.getRuntimeServicesEvidence(moduleRuntime),
        } as const
      })

      const { kernel, evidence } = yield* Effect.promise(() => runtime.runPromise(read))
      expect(kernel.kernelId).toBe('core')
      expect(CoreKernel.isKernelFullyActivated(evidence)).toBe(true)
    }),
  )
})
