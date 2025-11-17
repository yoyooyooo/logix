import { describe, it, expect } from '@effect/vitest'
import { Effect, Layer, Schema, TestClock } from 'effect'
import * as Logix from '../../../src/index.js'
import * as ModuleRuntimeImpl from '../../../src/internal/runtime/ModuleRuntime.js'
import * as BoundApiRuntime from '../../../src/internal/runtime/BoundApiRuntime.js'
import * as RowId from '../../../src/internal/state-trait/rowid.js'
import type { ResourceRegistry } from '../../../src/Resource.js'

describe('RowIdStore deterministic ids', () => {
  it('uses a monotonic per-instance sequence (no time/random)', () => {
    const store = new RowId.RowIdStore('i-rowid-matrix')

    const items1 = [{ id: 'a' }, { id: 'b' }]
    const ids1 = store.ensureList('items', items1, 'id')
    expect(ids1).toEqual(['i-rowid-matrix::r1', 'i-rowid-matrix::r2'])

    const items2 = [{ id: 'x' }, ...items1]
    const ids2 = store.ensureList('items', items2, 'id')
    expect(ids2).toEqual(['i-rowid-matrix::r3', 'i-rowid-matrix::r1', 'i-rowid-matrix::r2'])

    const items3 = items2.map((it) => ({ ...it }))
    const ids3 = store.ensureList('items', items3, 'id')
    expect(ids3).toEqual(ids2)

    const items4 = items3.filter((it) => it.id !== 'a')
    const ids4 = store.ensureList('items', items4, 'id')
    expect(ids4).toEqual(['i-rowid-matrix::r3', 'i-rowid-matrix::r2'])
  })
})

describe('StateTrait RowID matrix (list.item source)', () => {
  const SnapshotSchema = Schema.Struct({
    status: Schema.String,
    keyHash: Schema.optional(Schema.String),
    data: Schema.optional(
      Schema.Struct({
        name: Schema.String,
      }),
    ),
    error: Schema.optional(Schema.Any),
  })

  const ItemSchema = Schema.Struct({
    id: Schema.String,
    meta: Schema.Number,
    profileResource: SnapshotSchema,
  })

  const StateSchema = Schema.Struct({
    items: Schema.Array(ItemSchema),
  })

  type State = Schema.Schema.Type<typeof StateSchema>

  const KeySchema = Schema.Struct({
    userId: Schema.String,
  })

  type Key = Schema.Schema.Type<typeof KeySchema>

  const makeProgram = (options?: { readonly trackBy?: string }) => {
    const traits = Logix.StateTrait.from(StateSchema)({
      items: Logix.StateTrait.list({
        identityHint: options?.trackBy ? { trackBy: options.trackBy } : undefined,
        item: Logix.StateTrait.node({
          source: {
            profileResource: Logix.StateTrait.source({
              deps: ['id'] as any,
              resource: 'user/profile',
              key: (item: any) => ({ userId: item.id }),
              concurrency: 'switch',
            }) as any,
          },
        }),
      }),
    })

    return Logix.StateTrait.build(StateSchema, traits)
  }

  const makeResource = (calls: Array<Key>) =>
    Logix.Resource.make<Key, { readonly name: string }, never, never>({
      id: 'user/profile',
      keySchema: KeySchema,
      load: (key) =>
        Effect.sleep('30 millis').pipe(
          Effect.zipRight(Effect.succeed({ name: `res:${key.userId}` })),
          Effect.tap(() => Effect.sync(() => calls.push(key))),
        ),
    })

  const makeInitial = (ids: ReadonlyArray<string>): State => ({
    items: ids.map((id) => ({
      id,
      meta: 0,
      profileResource: Logix.Resource.Snapshot.idle(),
    })),
  })

  const makeRuntimeAndBound = (initial: State, program: Logix.StateTrait.StateTraitProgram<State> = makeProgram()) =>
    Effect.gen(function* () {
      type Shape = Logix.Module.Shape<typeof StateSchema, any>
      type Action = Logix.Module.ActionOf<Shape>

      const runtime = yield* ModuleRuntimeImpl.make<State, Action>(initial, {
        moduleId: 'StateTraitRowIdMatrix',
        reducers: {
          bumpMeta0: (s: any) => {
            const items = s.items.slice()
            if (items[0]) {
              items[0] = { ...items[0], meta: (items[0].meta ?? 0) + 1 }
            }
            return { ...s, items }
          },
          cloneSwap01: (s: any) => {
            const items = s.items.map((i: any) => ({ ...i }))
            if (items.length >= 2) {
              const tmp = items[0]
              items[0] = items[1]
              items[1] = tmp
            }
            return { ...s, items }
          },
          prepend: (s: any, a: any) => {
            const id = a.payload.id as string
            const next = {
              id,
              meta: 0,
              profileResource: Logix.Resource.Snapshot.idle(),
            }
            return { ...s, items: [next, ...s.items] }
          },
          removeAt: (s: any, a: any) => {
            const index = a.payload.index as number
            return {
              ...s,
              items: s.items.filter((_: any, i: number) => i !== index),
            }
          },
          swap01: (s: any) => {
            const items = s.items.slice()
            if (items.length >= 2) {
              const tmp = items[0]
              items[0] = items[1]
              items[1] = tmp
            }
            return { ...s, items }
          },
        },
      })

      const bound = BoundApiRuntime.make<Shape, never>(
        {
          stateSchema: StateSchema,
          actionSchema: Schema.Never as any,
          actionMap: {
            bumpMeta0: Schema.Void,
            cloneSwap01: Schema.Void,
            prepend: Schema.Struct({ id: Schema.String }),
            removeAt: Schema.Struct({ index: Schema.Number }),
            swap01: Schema.Void,
          } as any,
        } as any,
        runtime as any,
        {
          getPhase: () => 'run',
          moduleId: 'StateTraitRowIdMatrix',
        },
      )

      yield* Logix.StateTrait.install(bound as any, program)

      return { runtime, bound }
    })

  it.scoped('keeps in-flight writeback after item object cloning', () => {
    const calls: Array<Key> = []
    const spec = makeResource(calls)

    return Effect.gen(function* () {
      const { runtime, bound } = yield* makeRuntimeAndBound(makeInitial(['a', 'b']))

      yield* bound.traits.source.refresh('items[].profileResource')
      yield* runtime.dispatch({ _tag: 'bumpMeta0', payload: undefined } as any)

      yield* TestClock.adjust('200 millis')

      const state = (yield* runtime.getState) as any
      expect(state.items[0].id).toBe('a')
      expect(state.items[0].profileResource.status).toBe('success')
      expect(state.items[0].profileResource.data?.name).toBe('res:a')
      expect(state.items[1].id).toBe('b')
      expect(state.items[1].profileResource.status).toBe('success')
      expect(state.items[1].profileResource.data?.name).toBe('res:b')

      expect(calls.map((c) => c.userId).sort()).toEqual(['a', 'b'])
    }).pipe(Effect.provide(Logix.Resource.layer([spec]) as Layer.Layer<never, never, ResourceRegistry>))
  })

  it.scoped('routes in-flight writeback to the correct row after prepend', () => {
    const calls: Array<Key> = []
    const spec = makeResource(calls)

    return Effect.gen(function* () {
      const { runtime, bound } = yield* makeRuntimeAndBound(makeInitial(['a', 'b']))

      yield* bound.traits.source.refresh('items[].profileResource')
      yield* runtime.dispatch({ _tag: 'prepend', payload: { id: 'x' } } as any)

      yield* TestClock.adjust('200 millis')

      const state = (yield* runtime.getState) as any
      expect(state.items.map((i: any) => i.id)).toEqual(['x', 'a', 'b'])
      expect(state.items[0].profileResource.status).toBe('idle')
      expect(state.items[1].profileResource.status).toBe('success')
      expect(state.items[1].profileResource.data?.name).toBe('res:a')
      expect(state.items[2].profileResource.status).toBe('success')
      expect(state.items[2].profileResource.data?.name).toBe('res:b')

      expect(calls.map((c) => c.userId).sort()).toEqual(['a', 'b'])
    }).pipe(Effect.provide(Logix.Resource.layer([spec]) as Layer.Layer<never, never, ResourceRegistry>))
  })

  it.scoped('does not write back to a removed row (no ghost write)', () => {
    const calls: Array<Key> = []
    const spec = makeResource(calls)

    return Effect.gen(function* () {
      const { runtime, bound } = yield* makeRuntimeAndBound(makeInitial(['a', 'b']))

      yield* bound.traits.source.refresh('items[].profileResource')
      yield* runtime.dispatch({ _tag: 'removeAt', payload: { index: 0 } } as any)

      yield* TestClock.adjust('200 millis')

      const state = (yield* runtime.getState) as any
      expect(state.items.map((i: any) => i.id)).toEqual(['b'])
      expect(state.items[0].profileResource.status).toBe('success')
      expect(state.items[0].profileResource.data?.name).toBe('res:b')

      expect(calls.map((c) => c.userId).sort()).toEqual(['a', 'b'])
    }).pipe(Effect.provide(Logix.Resource.layer([spec]) as Layer.Layer<never, never, ResourceRegistry>))
  })

  it.scoped('keeps writeback correct after reorder (swap)', () => {
    const calls: Array<Key> = []
    const spec = makeResource(calls)

    return Effect.gen(function* () {
      const { runtime, bound } = yield* makeRuntimeAndBound(makeInitial(['a', 'b']))

      yield* bound.traits.source.refresh('items[].profileResource')
      yield* runtime.dispatch({ _tag: 'swap01', payload: undefined } as any)

      yield* TestClock.adjust('200 millis')

      const state = (yield* runtime.getState) as any
      expect(state.items.map((i: any) => i.id)).toEqual(['b', 'a'])
      expect(state.items[0].profileResource.status).toBe('success')
      expect(state.items[0].profileResource.data?.name).toBe('res:b')
      expect(state.items[1].profileResource.status).toBe('success')
      expect(state.items[1].profileResource.data?.name).toBe('res:a')

      expect(calls.map((c) => c.userId).sort()).toEqual(['a', 'b'])
    }).pipe(Effect.provide(Logix.Resource.layer([spec]) as Layer.Layer<never, never, ResourceRegistry>))
  })

  it.scoped('keeps writeback correct after clone + reorder when trackBy is configured', () => {
    const calls: Array<Key> = []
    const spec = makeResource(calls)

    return Effect.gen(function* () {
      const program = makeProgram({ trackBy: 'id' })
      const { runtime, bound } = yield* makeRuntimeAndBound(makeInitial(['a', 'b']), program)

      yield* bound.traits.source.refresh('items[].profileResource')
      yield* runtime.dispatch({ _tag: 'cloneSwap01', payload: undefined } as any)

      yield* TestClock.adjust('200 millis')

      const state = (yield* runtime.getState) as any
      expect(state.items.map((i: any) => i.id)).toEqual(['b', 'a'])
      expect(state.items[0].profileResource.status).toBe('success')
      expect(state.items[0].profileResource.data?.name).toBe('res:b')
      expect(state.items[1].profileResource.status).toBe('success')
      expect(state.items[1].profileResource.data?.name).toBe('res:a')
    }).pipe(Effect.provide(Logix.Resource.layer([spec]) as Layer.Layer<never, never, ResourceRegistry>))
  })
})
