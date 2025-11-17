import { describe, it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../../src/index.js'
import * as ModuleRuntimeImpl from '../../../src/internal/runtime/ModuleRuntime.js'
import * as BoundApiRuntime from '../../../src/internal/runtime/BoundApiRuntime.js'
import * as EffectOp from '../../../src/EffectOp.js'
import * as EffectOpCore from '../../../src/internal/runtime/core/EffectOpCore.js'

describe('StateTrait.install + EffectOp middleware', () => {
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

  it('should emit EffectOp events for computed and link steps via middleware', async () => {
    const traits = Logix.StateTrait.from(StateSchema)({
      sum: Logix.StateTrait.computed({
        deps: ['a', 'b'],
        get: (a, b) => a + b,
      }),
      // target follows source.name
      target: Logix.StateTrait.link({
        from: 'source.name',
      }),
    })

    const program = Logix.StateTrait.build(StateSchema, traits)

    const events: Array<EffectOp.EffectOp<any, any, any>> = []

    const middleware: EffectOp.Middleware = (op) =>
      Effect.gen(function* () {
        events.push(op)
        return yield* op.effect
      })

    const stack: EffectOp.MiddlewareStack = [middleware]

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
        moduleId: 'StateTraitEffectOpIntegrationTest',
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
          moduleId: 'StateTraitEffectOpIntegrationTest',
        },
      )

      // Install the StateTrait program behavior (forks watchers within the current Scope).
      yield* Logix.StateTrait.install(bound as any, program)

      // Update base fields a/b to trigger sum recomputation (computed:update).
      let state = (yield* runtime.getState) as State
      state = {
        ...state,
        a: 10,
        b: 5,
      }
      yield* runtime.setState(state)

      // Update source.name to trigger target propagation (link:propagate).
      let after = (yield* runtime.getState) as State
      after = {
        ...after,
        source: { name: 'Bob' },
        target: '',
      }
      yield* runtime.setState(after)

      // Wait for watchers to process the two state changes.
      yield* Effect.sleep('10 millis')

      const finalState = (yield* runtime.getState) as State
      expect(finalState.sum).toBe(15)
      expect(finalState.target).toBe('Bob')
    })

    const programEffect = Effect.scoped(
      Effect.provideService(testEffect, EffectOpCore.EffectOpMiddlewareTag, { stack }),
    ) as Effect.Effect<void, never, never>

    await Effect.runPromise(programEffect)

    const computedOps = events.filter((e) => e.name === 'computed:update')
    const linkOps = events.filter((e) => e.name === 'link:propagate')

    expect(computedOps.length).toBeGreaterThanOrEqual(1)
    expect(linkOps.length).toBeGreaterThanOrEqual(1)

    const computedOp = computedOps[computedOps.length - 1]
    const linkOp = linkOps[linkOps.length - 1]

    expect(computedOp.kind).toBe('trait-computed')
    expect(computedOp.meta?.fieldPath).toBe('sum')
    expect(computedOp.meta?.moduleId).toBe('StateTraitEffectOpIntegrationTest')

    expect(linkOp.kind).toBe('trait-link')
    expect(linkOp.meta?.from).toBe('source.name')
    expect(linkOp.meta?.to).toBe('target')
    expect(linkOp.meta?.moduleId).toBe('StateTraitEffectOpIntegrationTest')
  })
})
