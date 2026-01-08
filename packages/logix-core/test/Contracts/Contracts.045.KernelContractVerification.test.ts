import { describe, it, expect } from '@effect/vitest'
import { Context, Effect, Exit, Layer, Schema, TestClock } from 'effect'
import * as Logix from '../../src/index.js'
import { coreNgRuntimeServicesRegistry } from '../../src/internal/runtime/core/RuntimeServices.impls.coreNg.js'

describe('contracts (045): Kernel contract verification harness', () => {
  it.effect(
    'core vs core should PASS and remain stable',
    () =>
      Effect.gen(function* () {
        const Root = Logix.Module.make('Contracts.045.KernelContractVerification', {
          state: Schema.Struct({ count: Schema.Number }),
          actions: { inc: Schema.Void },
          reducers: {
            inc: (s: any) => ({ ...s, count: (s?.count ?? 0) + 1 }),
          },
        })

        const program = Root.implement({
          initial: { count: 0 },
          logics: [],
        })

        const result = yield* Logix.Reflection.verifyKernelContract(program, {
          diagnosticsLevel: 'light',
          maxEvents: 200,
          before: {
            runId: 'run:test:kernel-contract:before',
            interaction: (rt) => rt.dispatch({ _tag: 'inc', payload: undefined } as any),
          },
          after: {
            runId: 'run:test:kernel-contract:after',
            interaction: (rt) => rt.dispatch({ _tag: 'inc', payload: undefined } as any),
          },
        })

        expect(result.verdict).toBe('PASS')
        expect(result.summary).toEqual({ added: 0, removed: 0, changed: 0 })
        expect(result.changes).toEqual([])
        expect(result.before.trace.digest).toBe(result.after.trace.digest)
        expect(JSON.stringify(result)).toBeTruthy()
      }),
    20_000,
  )

  it.effect(
    'core vs core-ng should keep converge static IR digest/mapping stable (050 integer bridge guard)',
    () =>
      Effect.gen(function* () {
        const State = Schema.Struct({
          a: Schema.Number,
          derivedA: Schema.Number,
        })

        const Root = Logix.Module.make('Contracts.045.KernelContractVerification.IntegerBridge', {
          state: State,
          actions: { inc: Schema.Void },
          reducers: {
            inc: (s: any) => ({ ...s, a: (s?.a ?? 0) + 1 }),
          },
          traits: Logix.StateTrait.from(State)({
            derivedA: Logix.StateTrait.computed({
              deps: ['a'],
              get: (a) => a + 1,
            }),
          }),
        })

        const program = Root.implement({
          initial: { a: 0, derivedA: 1 },
          logics: [],
        })

        const coreNgLayer = Layer.mergeAll(
          Logix.Kernel.kernelLayer({ kernelId: 'core-ng', packageName: '@logixjs/core' }),
          Logix.Kernel.fullCutoverGateModeLayer('fullCutover'),
          Logix.Kernel.runtimeServicesRegistryLayer(coreNgRuntimeServicesRegistry),
          Logix.Kernel.runtimeDefaultServicesOverridesLayer(
            Object.fromEntries(
              Logix.Kernel.CutoverCoverageMatrix.requiredServiceIds.map((serviceId) => [
                serviceId,
                { implId: 'core-ng' },
              ]),
            ),
          ),
        )

        const contract = yield* Logix.Reflection.verifyKernelContract(program, {
          diagnosticsLevel: 'light',
          maxEvents: 200,
          before: {
            runId: 'run:test:kernel-contract:before:core',
            interaction: (rt) => rt.dispatch({ _tag: 'inc', payload: undefined } as any),
          },
          after: {
            runId: 'run:test:kernel-contract:after:core-ng',
            layer: coreNgLayer,
            interaction: (rt) => rt.dispatch({ _tag: 'inc', payload: undefined } as any),
          },
        })

        expect(contract.verdict).toBe('PASS')
        expect(contract.before.kernelImplementationRef.kernelId).toBe('core')
        expect(contract.after.kernelImplementationRef.kernelId).toBe('core-ng')

        const runTrial = (options: { readonly runId: string; readonly layer?: Layer.Layer<any, any, any> }) =>
          Logix.Observability.trialRun(
            Effect.gen(function* () {
              const ctx = yield* program.impl.layer.pipe(Layer.build)
              const runtime = Context.get(ctx, Root.tag) as any

              yield* TestClock.adjust('1 millis')
              yield* runtime.dispatch({ _tag: 'inc', payload: undefined } as any)

              return runtime.instanceId as string
            }),
            {
              runId: options.runId,
              source: { host: 'vitest', label: options.runId },
              diagnosticsLevel: 'full',
              maxEvents: 200,
              layer: options.layer,
            },
          )

        const core = yield* runTrial({ runId: 'run:test:integer-bridge:core' })
        const coreNg = yield* runTrial({ runId: 'run:test:integer-bridge:core-ng', layer: coreNgLayer })

        expect(Exit.isSuccess(core.exit)).toBe(true)
        expect(Exit.isSuccess(coreNg.exit)).toBe(true)

        const coreInstanceId = Exit.isSuccess(core.exit) ? core.exit.value : 'unknown'
        const coreNgInstanceId = Exit.isSuccess(coreNg.exit) ? coreNg.exit.value : 'unknown'

        const coreSummary: any = core.evidence.summary
        const coreNgSummary: any = coreNg.evidence.summary

        const coreIrByDigest: any = coreSummary?.converge?.staticIrByDigest
        const coreNgIrByDigest: any = coreNgSummary?.converge?.staticIrByDigest

        expect(coreIrByDigest && typeof coreIrByDigest === 'object').toBe(true)
        expect(coreNgIrByDigest && typeof coreNgIrByDigest === 'object').toBe(true)

        const coreDigests = Object.keys(coreIrByDigest ?? {})
        const coreNgDigests = Object.keys(coreNgIrByDigest ?? {})
        expect(coreDigests.length).toBe(1)
        expect(coreNgDigests.length).toBe(1)
        expect(coreDigests[0]).toBe(coreNgDigests[0])

        const digest = coreDigests[0]!
        expect(digest.startsWith('converge_ir_v2:')).toBe(true)

        const coreIr: any = coreIrByDigest[digest]
        const coreNgIr: any = coreNgIrByDigest[digest]
        expect(coreIr?.instanceId).toBe(coreInstanceId)
        expect(coreNgIr?.instanceId).toBe(coreNgInstanceId)

        const canonical = (ir: any) => ({
          staticIrDigest: ir?.staticIrDigest,
          generation: ir?.generation,
          fieldPaths: ir?.fieldPaths,
          stepOutFieldPathIdByStepId: ir?.stepOutFieldPathIdByStepId,
          stepSchedulingByStepId: ir?.stepSchedulingByStepId,
          topoOrder: ir?.topoOrder,
        })

        expect(canonical(coreIr)).toEqual(canonical(coreNgIr))
        expect(JSON.stringify({ contract, core: core.evidence.summary, coreNg: coreNg.evidence.summary })).toBeTruthy()
      }),
    20_000,
  )
})
