import { describe, it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import * as Debug from '../../src/Debug.js'
import type { ResourceRegistry } from '../../src/Resource.js'

describe('ReplayEvent ↔ state:update bridge', () => {
  it.scoped('records last ResourceSnapshot as state:update.replayEvent', () =>
    Effect.gen(function* () {
      const SnapshotSchema = Schema.Any

      const State = Schema.Struct({
        profile: Schema.Struct({ id: Schema.String }),
        profileResource: SnapshotSchema,
      })

      type S = Schema.Schema.Type<typeof State>

      const KeySchema = Schema.Struct({ userId: Schema.String })

      const spec = Logix.Resource.make<Schema.Schema.Type<typeof KeySchema>, { readonly name: string }, never, never>({
        id: 'user/profile',
        keySchema: KeySchema,
        load: (key) => Effect.succeed({ name: `res:${key.userId}` }),
      })

      const Actions = { refresh: Schema.Void }

      const M = Logix.Module.make('StateTraitReplayEventBridge', {
        state: State,
        actions: Actions,
        reducers: {
          refresh: (s: any) => s,
        },
        traits: Logix.StateTrait.from(State)({
          profileResource: Logix.StateTrait.source({
            deps: ['profile.id'],
            resource: 'user/profile',
            key: (s: Readonly<S>) => ({ userId: s.profile.id }),
          }),
        }),
      })

      const RefreshLogic = M.logic(($) =>
        Effect.gen(function* () {
          yield* $.onAction('refresh').run(() => $.traits.source.refresh('profileResource'))
        }),
      )

      const impl = M.implement({
        initial: {
          profile: { id: 'u1' },
          profileResource: Logix.Resource.Snapshot.idle(),
        },
        logics: [RefreshLogic],
      })

      const ring = Debug.makeRingBufferSink(64)

      const runtime = Logix.Runtime.make(impl, {
        layer: Layer.mergeAll(
          Debug.replace([ring.sink]) as Layer.Layer<any, never, never>,
          Logix.Resource.layer([spec]) as Layer.Layer<never, never, ResourceRegistry>,
        ) as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* M.tag
        yield* rt.dispatch({ _tag: 'refresh', payload: undefined } as any)

        // 等待 watcher + source IO 纤程完成至少一轮写回。
        yield* Effect.sleep('10 millis')

        const updates = ring
          .getSnapshot()
          .filter((e) => e.type === 'state:update' && (e as any).replayEvent) as ReadonlyArray<any>

        expect(updates.length).toBeGreaterThan(0)

        const hit = updates[updates.length - 1]
        expect(hit?.replayEvent?._tag).toBe('ResourceSnapshot')
        expect(hit?.replayEvent?.resourceId).toBe('user/profile')
        expect(typeof hit?.replayEvent?.keyHash).toBe('string')
        expect(hit?.replayEvent?.txnId).toBe(hit?.txnId)
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
