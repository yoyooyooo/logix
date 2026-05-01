import * as CoreKernel from '@logixjs/core/repo-internal/kernel-api'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import * as CoreReflection from '@logixjs/core/repo-internal/reflection-api'
import { describe, it, expect } from '@effect/vitest'
import { Effect, Exit, Layer, Schema, ServiceMap } from 'effect'
import { TestClock } from 'effect/testing'
import * as Logix from '../../src/index.js'
import * as RuntimeContracts from '../../src/internal/runtime-contracts.js'
import { trialRun } from '../../src/internal/verification/trialRun.js'

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

        const program = Logix.Program.make(Root, {
          initial: { count: 0 },
          logics: [],
        })

        const result = yield* CoreReflection.verifyKernelContract(program, {
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
    'core vs experimental full-cutover should keep converge static IR digest/mapping stable (050 integer bridge guard)',
    () =>
      Effect.gen(function* () {
        const State = Schema.Struct({
          a: Schema.Number,
          derivedA: Schema.Number,
        })

        const Root = FieldContracts.withModuleFieldDeclarations(Logix.Module.make('Contracts.045.KernelContractVerification.IntegerBridge', {
  state: State,
  actions: { inc: Schema.Void },
  reducers: {
            inc: (s: any) => ({ ...s, a: (s?.a ?? 0) + 1 }),
          }
}), FieldContracts.fieldFrom(State)({
            derivedA: FieldContracts.fieldComputed({
              deps: ['a'],
              get: (a) => a + 1,
            }),
          }))

        const program = Logix.Program.make(Root, {
          initial: { a: 0, derivedA: 1 },
          logics: [],
        })

        const experimentalLayer = CoreKernel.fullCutoverLayer({
          capabilities: ['contract:experimental'],
        })

        const contract = yield* CoreReflection.verifyKernelContract(program, {
          diagnosticsLevel: 'light',
          maxEvents: 200,
          before: {
            runId: 'run:test:kernel-contract:before:core',
            interaction: (rt) => rt.dispatch({ _tag: 'inc', payload: undefined } as any),
          },
          after: {
            runId: 'run:test:kernel-contract:after:experimental',
            layer: experimentalLayer,
            interaction: (rt) => rt.dispatch({ _tag: 'inc', payload: undefined } as any),
          },
        })

        expect(contract.verdict).toBe('PASS')
        expect(contract.before.kernelImplementationRef.kernelId).toBe('core')
        expect(contract.after.kernelImplementationRef.kernelId).toBe('core')
        expect(contract.after.kernelImplementationRef.capabilities).toContain('contract:experimental')

        const runTrial = (options: { readonly runId: string; readonly layer?: Layer.Layer<any, any, any> }) =>
          trialRun(
            Effect.gen(function* () {
              const ctx = yield* RuntimeContracts.getProgramRuntimeBlueprint(program).layer.pipe(Layer.build)
              const runtime = ServiceMap.get(ctx, Root.tag) as any

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
        const experimental = yield* runTrial({
          runId: 'run:test:integer-bridge:experimental',
          layer: experimentalLayer,
        })

        expect(Exit.isSuccess(core.exit)).toBe(true)
        expect(Exit.isSuccess(experimental.exit)).toBe(true)

        const coreInstanceId = Exit.isSuccess(core.exit) ? core.exit.value : 'unknown'
        const experimentalInstanceId = Exit.isSuccess(experimental.exit) ? experimental.exit.value : 'unknown'

        const coreSummary: any = core.evidence.summary
        const experimentalSummary: any = experimental.evidence.summary

        const coreIrByDigest: any = coreSummary?.converge?.staticIrByDigest
        const experimentalIrByDigest: any = experimentalSummary?.converge?.staticIrByDigest

        expect(coreIrByDigest && typeof coreIrByDigest === 'object').toBe(true)
        expect(experimentalIrByDigest && typeof experimentalIrByDigest === 'object').toBe(true)

        const coreDigests = Object.keys(coreIrByDigest ?? {})
        const experimentalDigests = Object.keys(experimentalIrByDigest ?? {})
        expect(coreDigests.length).toBe(1)
        expect(experimentalDigests.length).toBe(1)
        expect(coreDigests[0]).toBe(experimentalDigests[0])

        const digest = coreDigests[0]!
        expect(digest.startsWith('converge_ir_v2:')).toBe(true)

        const coreIr: any = coreIrByDigest[digest]
        const experimentalIr: any = experimentalIrByDigest[digest]
        expect(coreIr?.instanceId).toBe(coreInstanceId)
        expect(experimentalIr?.instanceId).toBe(experimentalInstanceId)

        const canonical = (ir: any) => ({
          staticIrDigest: ir?.staticIrDigest,
          generation: ir?.generation,
          fieldPaths: ir?.fieldPaths,
          stepOutFieldPathIdByStepId: ir?.stepOutFieldPathIdByStepId,
          stepSchedulingByStepId: ir?.stepSchedulingByStepId,
          topoOrder: ir?.topoOrder,
        })

        expect(canonical(coreIr)).toEqual(canonical(experimentalIr))
        expect(JSON.stringify({ contract, core: core.evidence.summary, experimental: experimental.evidence.summary })).toBeTruthy()
      }),
    20_000,
  )
})
