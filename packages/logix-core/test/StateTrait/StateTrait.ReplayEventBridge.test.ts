import { describe, it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import * as Debug from '../../src/Debug.js'
import type { ResourceRegistry } from '../../src/Resource.js'

const waitUntil = (label: string, condition: () => boolean): Effect.Effect<void, never> =>
  Effect.gen(function* () {
    while (!condition()) {
      yield* Effect.sleep('1 millis')
    }
  }).pipe(
    Effect.timeoutFail({
      duration: '2 seconds',
      onTimeout: () => new Error(`timeout waiting for ${label}`),
    }),
    Effect.orDie,
  )

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

      const Actions = { refresh: Schema.Void, touch: Schema.Void }

      const M = Logix.Module.make('StateTraitReplayEventBridge', {
        state: State,
        actions: Actions,
        reducers: {
          refresh: (s: any) => s,
          touch: Logix.Module.Reducer.mutate((draft) => {
            draft.profile.id = `${draft.profile.id}!`
          }),
        },
        traits: Logix.StateTrait.from(State)({
          profileResource: Logix.StateTrait.source({
            deps: ['profile.id'],
            resource: 'user/profile',
            key: (profileId) => ({ userId: profileId }),
          }),
        }),
      })

      const RefreshLogic = M.logic(($) =>
        Effect.gen(function* () {
          yield* $.onAction('refresh').run({ effect: () => $.traits.source.refresh('profileResource') })
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
          Debug.diagnosticsLevel('light') as Layer.Layer<any, never, never>,
          Logix.Resource.layer([spec]) as Layer.Layer<never, never, ResourceRegistry>,
        ) as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* M.tag
        yield* rt.dispatch({ _tag: 'refresh', payload: undefined } as any)

        yield* waitUntil('refresh replay state:update', () =>
          ring
            .getSnapshot()
            .some((e) => e.type === 'state:update' && (e as any).replayEvent?._tag === 'ResourceSnapshot'),
        )

        // A pure reducer transaction should not inherit replayEvent from a previous source transaction.
        yield* rt.dispatch({ _tag: 'touch', payload: undefined } as any)
        yield* waitUntil('touch state:update', () => {
          const snapshot = ring.getSnapshot()
          const touchDispatches = snapshot.filter(
            (e) => e.type === 'action:dispatch' && (e as any).actionTag === 'touch',
          ) as ReadonlyArray<any>
          const touchTxnId = touchDispatches[touchDispatches.length - 1]?.txnId
          if (touchTxnId === undefined || touchTxnId === null) {
            return false
          }
          return snapshot.some((e) => e.type === 'state:update' && (e as any).txnId === touchTxnId)
        })

        const updates = ring
          .getSnapshot()
          .filter((e) => e.type === 'state:update' && (e as any).replayEvent) as ReadonlyArray<any>

        expect(updates.length).toBeGreaterThan(0)

        const hit = updates[updates.length - 1]
        expect(hit?.replayEvent?._tag).toBe('ResourceSnapshot')
        expect(hit?.replayEvent?.resourceId).toBe('user/profile')
        expect(typeof hit?.replayEvent?.keyHash).toBe('string')
        expect(hit?.replayEvent?.txnId).toBe(hit?.txnId)
        expect(typeof hit?.staticIrDigest).toBe('string')
        expect(hit?.staticIrDigest.length).toBeGreaterThan(0)
        expect(hit?.replayEvent?.lookupKey?.staticIrDigest).toBe(hit?.staticIrDigest)
        expect(typeof hit?.replayEvent?.lookupKey?.nodeId).toBe('number')

        const dirtySet = hit?.dirtySet as any
        if (dirtySet && typeof dirtySet === 'object') {
          expect('rootPaths' in dirtySet).toBe(false)
        }

        const touchDispatches = ring
          .getSnapshot()
          .filter((e) => e.type === 'action:dispatch' && (e as any).actionTag === 'touch') as ReadonlyArray<any>
        expect(touchDispatches.length).toBeGreaterThan(0)
        const touchTxnId = touchDispatches[touchDispatches.length - 1]?.txnId
        const touchUpdate = ring
          .getSnapshot()
          .filter((e) => e.type === 'state:update' && (e as any).txnId === touchTxnId) as ReadonlyArray<any>
        expect(touchUpdate.length).toBeGreaterThan(0)
        const touchHit = touchUpdate[touchUpdate.length - 1]
        expect(touchHit?.replayEvent).toBeUndefined()
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
