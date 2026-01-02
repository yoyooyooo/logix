import { describe, it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../../src/index.js'
import * as ModuleRuntimeImpl from '../../../src/internal/runtime/ModuleRuntime.js'
import * as BoundApiRuntime from '../../../src/internal/runtime/BoundApiRuntime.js'

describe('StateTrait.install (with ModuleRuntime)', () => {
  const StateSchema = Schema.Struct({
    a: Schema.Number,
    b: Schema.Number,
    sum: Schema.Number,
    source: Schema.Struct({
      name: Schema.String,
    }),
    target: Schema.String,
  })

  type State = Schema.Schema.Type<typeof StateSchema>

  it('should recompute computed fields when state changes', async () => {
    const traits = Logix.StateTrait.from(StateSchema)({
      sum: Logix.StateTrait.computed({
        deps: ['a', 'b'],
        get: (a, b) => a + b,
      }),
    })

    const program = Logix.StateTrait.build(StateSchema, traits)

    const testEffect = Effect.gen(function* () {
      // Build a minimal ModuleRuntime (in-memory state only), without using Module-based trait auto-wiring.
      type Shape = Logix.Module.Shape<typeof StateSchema, { noop: typeof Schema.Void }>
      type Action = Logix.Module.ActionOf<Shape>

      const initial: State = {
        a: 1,
        b: 2,
        sum: 0,
        source: { name: 'Alice' },
        target: '',
      }

      const runtime = yield* ModuleRuntimeImpl.make<State, Action>(initial, {
        moduleId: 'StateTraitInstallTest',
      })

      const bound = BoundApiRuntime.make<Shape, never>(
        {
          stateSchema: StateSchema,
          // ActionSchema is not used in this test; use a placeholder Schema to satisfy typing.
          actionSchema: Schema.Never as any,
          actionMap: { noop: Schema.Void } as any,
        } as any,
        runtime as any,
        {
          // Ensure onState is usable in the current phase.
          getPhase: () => 'run',
          moduleId: 'StateTraitInstallTest',
        },
      )

      // Install the StateTrait program behavior.
      yield* Logix.StateTrait.install(bound as any, program)

      // Update base fields a/b to trigger sum recomputation.
      let state = (yield* runtime.getState) as State
      state = {
        ...state,
        a: 10,
        b: 5,
      }
      yield* runtime.setState(state)

      // Wait for watchers to process the state change.
      yield* Effect.sleep('10 millis')

      const after = (yield* runtime.getState) as State
      expect(after.sum).toBe(15)
    })

    await Effect.runPromise(Effect.scoped(testEffect) as Effect.Effect<void, never, never>)
  })
})
