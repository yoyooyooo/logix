import * as CoreKernel from '@logixjs/core/repo-internal/kernel-api'
import { describe, expect } from 'vitest'
import { it } from '@effect/vitest'
import { Effect, Exit, Layer, Scope, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Dual runtime isolation (core baseline vs experimental)', () => {
  it.effect('two runtimes can coexist without state/dispatch interference', () =>
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

      const ProgramCore = Logix.Program.make(Counter, { initial: { value: 1 }, logics: [] })
      const ProgramExperimental = Logix.Program.make(Counter, { initial: { value: 10 }, logics: [] })

      const scope = yield* Scope.make()

      const [ctxCore, ctxExperimental] = yield* Effect.all([
        Scope.provide(scope)(
          Logix.Runtime.openProgram(ProgramCore, {
            layer: Layer.empty as Layer.Layer<any, never, never>,
            handleSignals: false,
          }),
        ),
        Scope.provide(scope)(
          Logix.Runtime.openProgram(ProgramExperimental, {
            layer: Layer.mergeAll(CoreKernel.experimentalLayer(), CoreKernel.fullCutoverGateModeLayer('trial')) as Layer.Layer<
              any,
              never,
              never
            >,
            handleSignals: false,
          }),
        ),
      ])

      expect(CoreKernel.getKernelImplementationRef(ctxCore.module).kernelId).toBe('core')
      expect(CoreKernel.getKernelImplementationRef(ctxExperimental.module).kernelId).toBe('core')

      const core0 = yield* ctxCore.module.getState
      const ng0 = yield* ctxExperimental.module.getState
      expect((core0 as any).value).toBe(1)
      expect((ng0 as any).value).toBe(10)

      yield* ctxCore.module.dispatch({ _tag: 'inc', payload: undefined } as any)

      const core1 = yield* ctxCore.module.getState
      const ng1 = yield* ctxExperimental.module.getState
      expect((core1 as any).value).toBe(2)
      expect((ng1 as any).value).toBe(10)

      yield* ctxExperimental.module.dispatch({ _tag: 'inc', payload: undefined } as any)

      const core2 = yield* ctxCore.module.getState
      const ng2 = yield* ctxExperimental.module.getState
      expect((core2 as any).value).toBe(2)
      expect((ng2 as any).value).toBe(11)

      yield* Effect.promise(() => ctxCore.runtime.dispose())
      yield* Effect.promise(() => ctxExperimental.runtime.dispose())
    }),
  )
})
