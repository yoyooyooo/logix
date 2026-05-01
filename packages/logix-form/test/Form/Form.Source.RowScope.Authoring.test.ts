import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as Form from '../../src/index.js'
import * as Resource from '../../../logix-core/src/Resource.js'
import { materializeExtendedHandle } from '../support/form-harness.js'

const waitForAsync = Effect.promise(
  () =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, 40)
    }),
)

type ProfilePayload = {
  readonly name: string
  readonly userId: string
}

type PendingLoad = {
  readonly resolve: (value: ProfilePayload) => void
}

const makeControlledProfileResource = (id: string) => {
  const pending = new Map<string, PendingLoad>()
  const resource = Resource.make({
    id,
    keySchema: Schema.Struct({
      userId: Schema.String,
    }),
    load: ({ userId }) =>
      Effect.promise(
        () =>
          new Promise<ProfilePayload>((resolve) => {
            pending.set(userId, { resolve })
          }),
      ),
  })

  return {
    resource,
    resolve: (userId: string) => {
      const load = pending.get(userId)
      if (!load) {
        throw new Error(`missing pending load for ${userId}`)
      }
      pending.delete(userId)
      load.resolve({ name: `resource:${userId}`, userId })
    },
  }
}

describe('Form row-scoped source authoring', () => {
  it.effect('treats canonical list-item field source as row-scoped source', () =>
    Effect.gen(function* () {
      const KeySchema = Schema.Struct({
        userId: Schema.String,
      })

      const RowSchema = Schema.Struct({
        id: Schema.String,
        profileId: Schema.String,
        profileResource: Schema.Unknown,
      })

      const ValuesSchema = Schema.Struct({
        items: Schema.Array(RowSchema),
      })

      const profileResource = Resource.make({
        id: 'user/profile.row-scope',
        keySchema: KeySchema,
        load: ({ userId }) => Effect.succeed({ name: `resource:${userId}` }),
      })

      const form = Form.make(
        'Form.Source.RowScope.Authoring',
        {
          values: ValuesSchema,
          initialValues: {
            items: [
              { id: 'row-1', profileId: 'u1', profileResource: Resource.Snapshot.idle() },
              { id: 'row-2', profileId: 'u2', profileResource: Resource.Snapshot.idle() },
            ],
          },
        },
        (form) => {
          form.list('items', {
            identity: { mode: 'trackBy', trackBy: 'id' },
          })
          form.field('items.profileResource').source({
            resource: profileResource,
            deps: ['items.profileId'],
            key: (profileId) => (profileId ? { userId: profileId } : undefined),
            triggers: ['onMount', 'onKeyChange'],
          })
        },
      )

      const runtime = Logix.Runtime.make(form, {
        layer: Resource.layer([profileResource]) as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* Effect.service(form.tag).pipe(Effect.orDie)
        const handle = materializeExtendedHandle(form.tag, rt) as any

        yield* waitForAsync

        const mountedState: any = yield* handle.getState
        expect(mountedState.items?.[0]?.profileResource?.status).toBe('success')
        expect(mountedState.items?.[0]?.profileResource?.data?.name).toBe('resource:u1')
        expect(typeof mountedState.items?.[0]?.profileResource?.keyHash).toBe('string')
        expect(mountedState.items?.[1]?.profileResource?.status).toBe('success')
        expect(mountedState.items?.[1]?.profileResource?.data?.name).toBe('resource:u2')
        expect(typeof mountedState.items?.[1]?.profileResource?.keyHash).toBe('string')
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )

  it.effect('keeps in-flight row source writeback attached to the same row after reorder', () =>
    Effect.gen(function* () {
      const RowSchema = Schema.Struct({
        id: Schema.String,
        profileId: Schema.String,
        profileResource: Schema.Unknown,
      })

      const ValuesSchema = Schema.Struct({
        items: Schema.Array(RowSchema),
      })

      const controlled = makeControlledProfileResource('user/profile.row-scope-reorder')

      const form = Form.make(
        'Form.Source.RowScope.ReorderInFlight',
        {
          values: ValuesSchema,
          initialValues: {
            items: [
              { id: 'row-1', profileId: 'u1', profileResource: Resource.Snapshot.idle() },
              { id: 'row-2', profileId: 'u2', profileResource: Resource.Snapshot.idle() },
            ],
          },
        },
        (form) => {
          form.list('items', {
            identity: { mode: 'trackBy', trackBy: 'id' },
          })
          form.field('items.profileResource').source({
            resource: controlled.resource,
            deps: ['items.profileId'],
            key: (profileId) => (profileId ? { userId: profileId } : undefined),
            triggers: ['onMount'],
          })
        },
      )

      const runtime = Logix.Runtime.make(form, {
        layer: Resource.layer([controlled.resource]) as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* Effect.service(form.tag).pipe(Effect.orDie)
        const handle = materializeExtendedHandle(form.tag, rt) as any

        yield* waitForAsync

        const loadingState: any = yield* handle.getState
        expect(loadingState.items?.[0]?.id).toBe('row-1')
        expect(loadingState.items?.[0]?.profileResource?.status).toBe('loading')
        expect(loadingState.items?.[1]?.id).toBe('row-2')
        expect(loadingState.items?.[1]?.profileResource?.status).toBe('loading')

        yield* handle.fieldArray('items').swap(0, 1)
        yield* waitForAsync

        controlled.resolve('u1')
        controlled.resolve('u2')
        yield* waitForAsync

        const settledState: any = yield* handle.getState
        expect(settledState.items?.[0]?.id).toBe('row-2')
        expect(settledState.items?.[0]?.profileResource?.data?.userId).toBe('u2')
        expect(settledState.items?.[1]?.id).toBe('row-1')
        expect(settledState.items?.[1]?.profileResource?.data?.userId).toBe('u1')
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )

  it.effect('drops in-flight row source writeback after row removal', () =>
    Effect.gen(function* () {
      const RowSchema = Schema.Struct({
        id: Schema.String,
        profileId: Schema.String,
        profileResource: Schema.Unknown,
      })

      const ValuesSchema = Schema.Struct({
        items: Schema.Array(RowSchema),
      })

      const controlled = makeControlledProfileResource('user/profile.row-scope-remove')

      const form = Form.make(
        'Form.Source.RowScope.RemoveInFlight',
        {
          values: ValuesSchema,
          initialValues: {
            items: [
              { id: 'row-1', profileId: 'u1', profileResource: Resource.Snapshot.idle() },
              { id: 'row-2', profileId: 'u2', profileResource: Resource.Snapshot.idle() },
            ],
          },
        },
        (form) => {
          form.list('items', {
            identity: { mode: 'trackBy', trackBy: 'id' },
          })
          form.field('items.profileResource').source({
            resource: controlled.resource,
            deps: ['items.profileId'],
            key: (profileId) => (profileId ? { userId: profileId } : undefined),
            triggers: ['onMount'],
          })
        },
      )

      const runtime = Logix.Runtime.make(form, {
        layer: Resource.layer([controlled.resource]) as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* Effect.service(form.tag).pipe(Effect.orDie)
        const handle = materializeExtendedHandle(form.tag, rt) as any

        yield* waitForAsync

        const loadingState: any = yield* handle.getState
        expect(loadingState.items?.[0]?.profileResource?.status).toBe('loading')
        expect(loadingState.items?.[1]?.profileResource?.status).toBe('loading')

        yield* handle.fieldArray('items').remove(1)
        yield* waitForAsync

        controlled.resolve('u2')
        controlled.resolve('u1')
        yield* waitForAsync

        const settledState: any = yield* handle.getState
        expect(settledState.items).toHaveLength(1)
        expect(settledState.items?.[0]?.id).toBe('row-1')
        expect(settledState.items?.[0]?.profileResource?.data?.userId).toBe('u1')
        expect(JSON.stringify(settledState.items)).not.toContain('u2')
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
