import { describe, it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../../src/index.js'
import * as ModuleRuntimeImpl from '../../../src/internal/runtime/ModuleRuntime.js'
import * as BoundApiRuntime from '../../../src/internal/runtime/BoundApiRuntime.js'
import * as EffectOp from '../../../src/EffectOp.js'
import * as EffectOpCore from '../../../src/internal/runtime/core/EffectOpCore.js'
import type { ResourceRegistry } from '../../../src/Resource.js'

describe('StateTrait.source runtime integration', () => {
  const StateSchema = Schema.Struct({
    a: Schema.Number,
    b: Schema.Number,
    sum: Schema.Number,
    profile: Schema.Struct({
      id: Schema.String,
      name: Schema.String,
    }),
    profileResource: Schema.Struct({
      status: Schema.String,
      keyHash: Schema.optional(Schema.String),
      data: Schema.optional(
        Schema.Struct({
          name: Schema.String,
        }),
      ),
      error: Schema.optional(Schema.Any),
    }),
  })

  type State = Schema.Schema.Type<typeof StateSchema>

  const KeySchema = Schema.Struct({
    userId: Schema.String,
  })

  type Key = Schema.Schema.Type<typeof KeySchema>

  const makeProgram = () => {
    const traits = Logix.StateTrait.from(StateSchema)({
      sum: Logix.StateTrait.computed({
        deps: ['a', 'b'],
        get: (a, b) => a + b,
      }),
      profileResource: Logix.StateTrait.source({
        deps: ['profile.id'],
        resource: 'user/profile',
        key: (profileId) => ({ userId: profileId }),
      }),
      'profile.name': Logix.StateTrait.link({
        from: 'profileResource.data.name',
      }),
    })

    return Logix.StateTrait.build(StateSchema, traits)
  }

  it('uses ResourceSpec.load when QueryClient is not provided', async () => {
    const program = makeProgram()

    const calls: Array<Key> = []

    const spec = Logix.Resource.make<Key, { readonly name: string }, never, never>({
      id: 'user/profile',
      keySchema: KeySchema,
      load: (key) =>
        Effect.succeed({ name: `resource:${key.userId}` }).pipe(Effect.tap(() => Effect.sync(() => calls.push(key)))),
    })

    const testEffect = Effect.gen(function* () {
      type Shape = Logix.Module.Shape<typeof StateSchema, { load: typeof Schema.Void }>
      type Action = Logix.Module.ActionOf<Shape>

      const initial: State = {
        a: 1,
        b: 2,
        sum: 0,
        profile: { id: 'u1', name: 'Alice' },
        profileResource: Logix.Resource.Snapshot.idle(),
      }

      const runtime = yield* ModuleRuntimeImpl.make<State, Action>(initial, {
        moduleId: 'StateTraitSourceRuntimeTest-Resource',
      })

      const bound = BoundApiRuntime.make<Shape, never>(
        {
          stateSchema: StateSchema,
          // ActionSchema is not used in this test; use a placeholder Schema to satisfy typing.
          actionSchema: Schema.Never as any,
          actionMap: { load: Schema.Void } as any,
        } as any,
        runtime as any,
        {
          // Ensure onState / traits are usable in the current phase.
          getPhase: () => 'run',
          moduleId: 'StateTraitSourceRuntimeTest-Resource',
        },
      )

      // Install the StateTrait program behavior (includes source-refresh entrypoint registration).
      yield* Logix.StateTrait.install(bound as any, program)

      // Explicitly trigger a source refresh once.
      yield* bound.traits.source.refresh('profileResource')

      // Wait for refresh and writeback (loading -> success).
      yield* Effect.sleep('30 millis')

      const finalState = (yield* runtime.getState) as State
      expect(finalState.profileResource.status).toBe('success')
      expect(finalState.profileResource.data?.name).toBe('resource:u1')
      // link: profile.name follows profileResource.data.name.
      expect(finalState.profile.name).toBe('resource:u1')
    })

    const stack: EffectOp.MiddlewareStack = []

    const programEffect = Effect.scoped(
      Effect.provide(
        Effect.provideService(testEffect, EffectOpCore.EffectOpMiddlewareTag, { stack }),
        Logix.Resource.layer([spec]) as Layer.Layer<never, never, ResourceRegistry>,
      ),
    ) as Effect.Effect<void, never, never>

    await Effect.runPromise(programEffect)

    expect(calls).toHaveLength(1)
    expect(calls[0]).toEqual({ userId: 'u1' })
  })
})
