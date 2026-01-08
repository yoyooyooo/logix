import { describe, it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as CoreNg from '../src/index.js'

describe('core-ng: Reflection.verifyKernelContract', () => {
  it.effect(
    'core vs core-ng(requested) should PASS for a basic interaction',
    () =>
      Effect.gen(function* () {
        const Root = Logix.Module.make('CoreNg.KernelContract.verifyKernelContract', {
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

        const afterLayer = Layer.mergeAll(
          CoreNg.coreNgKernelLayer(),
          // Use the built-in `trace` implementation so the core-ng PoC doesn't affect contract verification.
          Logix.Kernel.runtimeDefaultServicesOverridesLayer({
            txnQueue: { implId: 'trace' },
          }),
        )

        const result = yield* Logix.Reflection.verifyKernelContract(program, {
          diagnosticsLevel: 'light',
          maxEvents: 200,
          before: {
            runId: 'run:test:core-ng:kernel-contract:before',
            interaction: (rt) => rt.dispatch({ _tag: 'inc', payload: undefined } as any),
          },
          after: {
            runId: 'run:test:core-ng:kernel-contract:after',
            layer: afterLayer,
            interaction: (rt) => rt.dispatch({ _tag: 'inc', payload: undefined } as any),
          },
        })

        expect(result.verdict).toBe('PASS')
        expect(result.before.kernelImplementationRef.kernelId).toBe('core')
        expect(result.after.kernelImplementationRef.kernelId).toBe('core-ng')
        expect(JSON.stringify(result)).toBeTruthy()
      }),
    20_000,
  )
})
