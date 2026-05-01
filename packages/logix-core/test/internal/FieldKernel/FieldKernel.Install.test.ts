import { describe, it, expect } from '@effect/vitest'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { Effect, Schema } from 'effect'
import * as Logix from '../../../src/index.js'
import * as ModuleRuntimeImpl from '../../../src/internal/runtime/core/ModuleRuntime.js'
import * as BoundApiRuntime from '../../../src/internal/runtime/core/BoundApiRuntime.js'

describe('FieldKernel.install (with ModuleRuntime)', () => {
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
    const fieldSpec = FieldContracts.fieldFrom(StateSchema)({
      sum: FieldContracts.fieldComputed({
        deps: ['a', 'b'],
        get: (a, b) => a + b,
      }),
    })

    const program = FieldContracts.buildFieldProgram(StateSchema, fieldSpec)

    const testEffect = Effect.gen(function* () {
      // Build a minimal ModuleRuntime (in-memory state only), without using Module-based field auto-wiring.
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
        moduleId: 'FieldKernelInstallTest',
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
          moduleId: 'FieldKernelInstallTest',
        },
      )

      // Install the FieldKernel program behavior.
      yield* FieldContracts.installFieldProgram(bound as any, program)

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
