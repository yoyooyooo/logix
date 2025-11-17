import { describe, it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import * as ModuleRuntimeImpl from '../../src/internal/runtime/ModuleRuntime.js'
import * as BoundApiRuntime from '../../src/internal/runtime/BoundApiRuntime.js'
import * as ReplayLog from '../../src/internal/runtime/core/ReplayLog.js'
import { replayModeLayer } from '../../src/internal/runtime/core/env.js'
import type { ResourceRegistry } from '../../src/Resource.js'

describe('ReplayMode · Sequence', () => {
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
    })

    return Logix.StateTrait.build(StateSchema, traits)
  }

  it('re-emits the same snapshot sequence and payload', async () => {
    const program = makeProgram()

    const spec = Logix.Resource.make<Key, { readonly name: string }, never, never>({
      id: 'user/profile',
      keySchema: KeySchema,
      load: (key) => Effect.sleep('10 millis').pipe(Effect.zipRight(Effect.succeed({ name: `payload:${key.userId}` }))),
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
          moduleId: 'ReplayMode-Seq-Record',
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
            moduleId: 'ReplayMode-Seq-Record',
          },
        )

        yield* Logix.StateTrait.install(bound as any, program)

        yield* bound.traits.source.refresh('profileResource')
        const afterLoading = (yield* runtime.getState) as State
        expect(afterLoading.profileResource.status).toBe('loading')

        yield* Effect.sleep('30 millis')
        const afterSuccess = (yield* runtime.getState) as State
        expect(afterSuccess.profileResource.status).toBe('success')
        expect(afterSuccess.profileResource.data?.name).toBe('payload:u1')

        const events = yield* ReplayLog.snapshot
        const resourceEvents = events.filter(
          (e): e is ReplayLog.ResourceSnapshotEvent =>
            e._tag === 'ResourceSnapshot' && e.resourceId === 'user/profile' && e.fieldPath === 'profileResource',
        )

        expect(resourceEvents.map((e) => e.phase)).toEqual(['loading', 'success'])

        return {
          events,
          loadingSnapshot: afterLoading.profileResource,
          successSnapshot: afterSuccess.profileResource,
        }
      }).pipe(
        Effect.provide(ReplayLog.layer()),
        Effect.provide(Logix.Resource.layer([spec]) as Layer.Layer<never, never, ResourceRegistry>),
      ),
    ) as Effect.Effect<
      {
        events: ReadonlyArray<ReplayLog.ReplayLogEvent>
        loadingSnapshot: State['profileResource']
        successSnapshot: State['profileResource']
      },
      never,
      never
    >

    const recorded = await Effect.runPromise(recordEffect)

    const replayEffect = Effect.scoped(
      Effect.gen(function* () {
        type Shape = Logix.Module.Shape<typeof StateSchema, { load: typeof Schema.Void }>
        type Action = Logix.Module.ActionOf<Shape>

        const initial: State = {
          profile: { id: 'u1', name: 'Alice' },
          profileResource: Logix.Resource.Snapshot.idle(),
        }

        const runtime = yield* ModuleRuntimeImpl.make<State, Action>(initial, {
          moduleId: 'ReplayMode-Seq-Replay',
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
            moduleId: 'ReplayMode-Seq-Replay',
          },
        )

        yield* Logix.StateTrait.install(bound as any, program)

        yield* bound.traits.source.refresh('profileResource')
        const afterLoading = (yield* runtime.getState) as State
        expect(afterLoading.profileResource).toEqual(recorded.loadingSnapshot)

        yield* Effect.sleep('30 millis')
        const afterSuccess = (yield* runtime.getState) as State
        expect(afterSuccess.profileResource).toEqual(recorded.successSnapshot)
      }).pipe(
        Effect.provide(replayModeLayer('replay')),
        Effect.provide(ReplayLog.layer(recorded.events)),
        Effect.provide(Logix.Resource.layer([spec]) as Layer.Layer<never, never, ResourceRegistry>),
      ),
    ) as Effect.Effect<void, never, never>

    await Effect.runPromise(replayEffect)
  })
})
