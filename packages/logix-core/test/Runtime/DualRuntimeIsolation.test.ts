import { describe, expect } from 'vitest'
import { it } from '@effect/vitest'
import { Effect, Exit, Layer, Scope, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Dual runtime isolation (core vs core-ng)', () => {
  it.scoped('two runtimes can coexist without state/dispatch interference', () =>
    Effect.gen(function* () {
      const Counter = Logix.Module.make('DualRuntimeIsolation.Counter', {
        state: Schema.Struct({ value: Schema.Number }),
        actions: { inc: Schema.Void },
        reducers: {
          inc: Logix.Module.Reducer.mutate((draft) => {
            draft.value += 1
          }),
        },
      })

      const ProgramCore = Counter.implement({ initial: { value: 1 }, logics: [] })
      const ProgramCoreNg = Counter.implement({ initial: { value: 10 }, logics: [] })

      const scope = yield* Scope.make()

      const [ctxCore, ctxCoreNg] = yield* Effect.all([
        Logix.Runtime.openProgram(ProgramCore, {
          layer: Layer.empty as Layer.Layer<any, never, never>,
          handleSignals: false,
        }).pipe(Scope.extend(scope)),
        Logix.Runtime.openProgram(ProgramCoreNg, {
          layer: Logix.Kernel.kernelLayer({ kernelId: 'core-ng', packageName: '@logixjs/core-ng' }),
          handleSignals: false,
        }).pipe(Scope.extend(scope)),
      ])

      expect(Logix.Kernel.getKernelImplementationRef(ctxCore.module).kernelId).toBe('core')
      expect(Logix.Kernel.getKernelImplementationRef(ctxCoreNg.module).kernelId).toBe('core-ng')

      const core0 = yield* ctxCore.module.getState
      const ng0 = yield* ctxCoreNg.module.getState
      expect((core0 as any).value).toBe(1)
      expect((ng0 as any).value).toBe(10)

      yield* ctxCore.module.dispatch({ _tag: 'inc', payload: undefined } as any)

      const core1 = yield* ctxCore.module.getState
      const ng1 = yield* ctxCoreNg.module.getState
      expect((core1 as any).value).toBe(2)
      expect((ng1 as any).value).toBe(10)

      yield* ctxCoreNg.module.dispatch({ _tag: 'inc', payload: undefined } as any)

      const core2 = yield* ctxCore.module.getState
      const ng2 = yield* ctxCoreNg.module.getState
      expect((core2 as any).value).toBe(2)
      expect((ng2 as any).value).toBe(11)

      yield* Scope.close(scope, Exit.void)
    }),
  )
})
