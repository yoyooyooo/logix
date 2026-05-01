import * as CoreKernel from '@logixjs/core/repo-internal/kernel-api'
import * as CoreReflection from '@logixjs/core/repo-internal/reflection-api'
import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('contracts (047): Full Cutover Gate (serializable)', () => {
  it.effect(
    'Gate result is JSON-serializable and works with gateDiagnosticsLevel=off',
    () =>
      Effect.gen(function* () {
        const Root = Logix.Module.make('Contracts.047.FullCutoverGate.Serializable', {
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

        const before = {
          runId: 'run:test:047:before',
          interaction: (rt: any) => rt.dispatch({ _tag: 'inc', payload: undefined } as any),
        }

        const after = {
          runId: 'run:test:047:after',
          layer: Layer.mergeAll(
            CoreKernel.experimentalLayer(),
            CoreKernel.runtimeDefaultServicesOverridesLayer({
              txnQueue: { implId: '__missing__', notes: 'test: force fallback for serializable gate' },
            }),
          ) as Layer.Layer<any, never, never>,
          interaction: (rt: any) => rt.dispatch({ _tag: 'inc', payload: undefined } as any),
        }

        const result = yield* CoreReflection.verifyFullCutoverGate(program, {
          before,
          after,
          diagnosticsLevel: 'off',
          gateDiagnosticsLevel: 'off',
          enableContractMetaAllowlist: true,
          mode: 'fullCutover',
          maxEvents: 200,
        })

        expect(() => JSON.stringify(result)).not.toThrow()

        expect(result.gate).toBeDefined()
        expect(result.gate.requestedKernelId).toBe('core')
        expect(Array.isArray(result.gate.missingServiceIds)).toBe(true)
        expect(typeof result.gate.anchor.moduleId).toBe('string')
        expect(typeof result.gate.anchor.instanceId).toBe('string')
        expect(result.gate.anchor.txnSeq).toBe(0)

        expect(Array.isArray((result as any).allowedDiffs)).toBe(true)
      }),
    20_000,
  )
})
