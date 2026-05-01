import { describe, expect } from 'vitest'
import { it } from '@effect/vitest'
import { Effect, Exit, Layer, Scope, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Runtime.openProgram multi-root isolation (US1)', () => {
  it.effect('multiple roots are isolated and $.use does not fallback to process-global registry', () =>
    Effect.gen(function* () {
      const Shared = Logix.Module.make('Runtime.openProgram.multiRoot.Shared', {
        state: Schema.Struct({ value: Schema.Number }),
        actions: { noop: Schema.Void },
      })

      const SharedProgramA = Logix.Program.make(Shared, { initial: { value: 1 }, logics: [] })
      const SharedProgramB = Logix.Program.make(Shared, { initial: { value: 2 }, logics: [] })

      const OnlyInA = Logix.Module.make('Runtime.openProgram.multiRoot.OnlyInA', {
        state: Schema.Struct({ value: Schema.Number }),
        actions: {},
      })
      const OnlyInAProgram = Logix.Program.make(OnlyInA, { initial: { value: 100 }, logics: [] })

      const RootA = Logix.Module.make('Runtime.openProgram.multiRoot.RootA', {
        state: Schema.Void,
        actions: {},
      })
      const RootB = Logix.Module.make('Runtime.openProgram.multiRoot.RootB', {
        state: Schema.Void,
        actions: {},
      })

      const RootAProgram = Logix.Program.make(RootA, {
        initial: undefined,
        logics: [],
        capabilities: {
          imports: [SharedProgramA, OnlyInAProgram],
        },
      })

      const RootBProgram = Logix.Program.make(RootB, {
        initial: undefined,
        logics: [],
        capabilities: {
          imports: [SharedProgramB],
        },
      })

      const scope = yield* Scope.make()

      const [ctxA, ctxB] = yield* Effect.all([
        Scope.provide(scope)(
          Logix.Runtime.openProgram(RootAProgram, {
            layer: Layer.empty as Layer.Layer<any, never, never>,
            handleSignals: false,
          }),
        ),
        Scope.provide(scope)(
          Logix.Runtime.openProgram(RootBProgram, {
            layer: Layer.empty as Layer.Layer<any, never, never>,
            handleSignals: false,
          }),
        ),
      ])

      const aSharedValue = yield* Effect.promise(() =>
        ctxA.runtime.runPromise(
          Effect.gen(function* () {
            const h = yield* ctxA.$.use(Shared)
            return yield* h.read((s: any) => s.value)
          }) as any,
        ),
      )

      const bSharedValue = yield* Effect.promise(() =>
        ctxB.runtime.runPromise(
          Effect.gen(function* () {
            const h = yield* ctxB.$.use(Shared)
            return yield* h.read((s: any) => s.value)
          }) as any,
        ),
      )

      expect(aSharedValue).toBe(1)
      expect(bSharedValue).toBe(2)

      // OnlyInA exists in process-global registry after ctxA boot, but ctxB must NOT resolve it without imports.
      const exit = (yield* Effect.promise(() =>
        ctxB.runtime.runPromise(
          Effect.exit(
            Effect.gen(function* () {
              yield* ctxB.$.use(OnlyInA)
            }) as any,
          ) as any,
        ),
      )) as any

      expect(exit._tag).toBe('Failure')
      if (exit._tag === 'Failure') {
        const pretty = String(((exit as any).cause as any)?.pretty ?? (exit as any).cause)
        expect(pretty).toContain('MissingModuleRuntimeError')
        expect(pretty).toContain('mode: strict')
      }

      yield* Effect.promise(() => ctxA.runtime.dispose())
      yield* Effect.promise(() => ctxB.runtime.dispose())
    }),
  )
})
