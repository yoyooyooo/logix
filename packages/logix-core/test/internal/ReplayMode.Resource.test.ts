import { describe, it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import * as ModuleRuntimeImpl from '../../src/internal/runtime/ModuleRuntime.js'
import * as BoundApiRuntime from '../../src/internal/runtime/BoundApiRuntime.js'
import * as ReplayLog from '../../src/internal/runtime/core/ReplayLog.js'
import { replayModeLayer } from '../../src/internal/runtime/core/env.js'
import type { ResourceRegistry } from '../../src/Resource.js'

describe('ReplayMode · Resource', () => {
  const StateSchema = Schema.Struct({
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
      profileResource: Logix.StateTrait.source({
        deps: ['profile.id'],
        resource: 'user/profile',
        key: (s: Readonly<State>) => ({
          userId: s.profile.id,
        }),
      }),
      'profile.name': Logix.StateTrait.link({
        from: 'profileResource.data.name',
      }),
    })

    return Logix.StateTrait.build(StateSchema, traits)
  }

  it('does not call ResourceSpec.load in replay mode', async () => {
    const program = makeProgram()

    const recordCalls: Array<Key> = []
    const replayCalls: Array<Key> = []

    const recordSpec = Logix.Resource.make<Key, { readonly name: string }, never, never>({
      id: 'user/profile',
      keySchema: KeySchema,
      load: (key) =>
        Effect.succeed({ name: `record:${key.userId}` }).pipe(
          Effect.tap(() => Effect.sync(() => recordCalls.push(key))),
        ),
    })

    const replaySpec = Logix.Resource.make<Key, { readonly name: string }, never, never>({
      id: 'user/profile',
      keySchema: KeySchema,
      load: (key) =>
        Effect.succeed({ name: `replay-should-not-run:${key.userId}` }).pipe(
          Effect.tap(() => Effect.sync(() => replayCalls.push(key))),
        ),
    })

    const recordEffect = Effect.scoped(
      Effect.gen(function* () {
        type Shape = Logix.Module.Shape<typeof StateSchema, { load: typeof Schema.Void }>
        type Action = Logix.Module.ActionOf<Shape>

        const initial: State = {
          profile: { id: 'u1', name: 'Alice' },
          profileResource: Logix.Resource.Snapshot.idle(),
        }

        const runtime = yield* ModuleRuntimeImpl.make<State, Action>(initial, {
          moduleId: 'ReplayMode-Record',
        })

        const bound = BoundApiRuntime.make<Shape, never>(
          {
            stateSchema: StateSchema,
            actionSchema: Schema.Never as any,
            actionMap: { load: Schema.Void } as any,
          } as any,
          runtime as any,
          {
            getPhase: () => 'run',
            moduleId: 'ReplayMode-Record',
          },
        )

        yield* Logix.StateTrait.install(bound as any, program)

        yield* bound.traits.source.refresh('profileResource')
        yield* Effect.sleep('30 millis')

        const finalState = (yield* runtime.getState) as State
        expect(finalState.profileResource.status).toBe('success')
        expect(finalState.profileResource.data?.name).toBe('record:u1')
        expect(finalState.profile.name).toBe('record:u1')

        return yield* ReplayLog.snapshot
      }).pipe(
        Effect.provide(ReplayLog.layer()),
        Effect.provide(Logix.Resource.layer([recordSpec]) as Layer.Layer<never, never, ResourceRegistry>),
      ),
    ) as Effect.Effect<ReadonlyArray<ReplayLog.ReplayLogEvent>, never, never>

    const recordedEvents = await Effect.runPromise(recordEffect)
    expect(recordCalls).toHaveLength(1)

    const replayEffect = Effect.scoped(
      Effect.gen(function* () {
        type Shape = Logix.Module.Shape<typeof StateSchema, { load: typeof Schema.Void }>
        type Action = Logix.Module.ActionOf<Shape>

        const initial: State = {
          profile: { id: 'u1', name: 'Alice' },
          profileResource: Logix.Resource.Snapshot.idle(),
        }

        const runtime = yield* ModuleRuntimeImpl.make<State, Action>(initial, {
          moduleId: 'ReplayMode-Replay',
        })

        const bound = BoundApiRuntime.make<Shape, never>(
          {
            stateSchema: StateSchema,
            actionSchema: Schema.Never as any,
            actionMap: { load: Schema.Void } as any,
          } as any,
          runtime as any,
          {
            getPhase: () => 'run',
            moduleId: 'ReplayMode-Replay',
          },
        )

        yield* Logix.StateTrait.install(bound as any, program)

        yield* bound.traits.source.refresh('profileResource')
        yield* Effect.sleep('30 millis')

        const finalState = (yield* runtime.getState) as State
        expect(finalState.profileResource.status).toBe('success')
        expect(finalState.profileResource.data?.name).toBe('record:u1')
        expect(finalState.profile.name).toBe('record:u1')
      }).pipe(
        Effect.provide(replayModeLayer('replay')),
        Effect.provide(ReplayLog.layer(recordedEvents)),
        Effect.provide(Logix.Resource.layer([replaySpec]) as Layer.Layer<never, never, ResourceRegistry>),
      ),
    ) as Effect.Effect<void, never, never>

    await Effect.runPromise(replayEffect)

    expect(replayCalls).toHaveLength(0)
  })
})
