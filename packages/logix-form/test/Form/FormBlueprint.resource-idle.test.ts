import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logix/core'
import * as Form from '../../src/index.js'

describe('FormBlueprint.resource-idle', () => {
  it.scoped('sync idle when key becomes undefined', () =>
    Effect.gen(function* () {
      const ValuesSchema = Schema.Struct({
        userId: Schema.String,
        profileResource: Schema.Struct({
          status: Schema.String,
          keyHash: Schema.optional(Schema.String),
          data: Schema.optional(Schema.Struct({ name: Schema.String })),
          error: Schema.optional(Schema.Any),
        }),
      })

      type Values = Schema.Schema.Type<typeof ValuesSchema>

      const traits = Logix.StateTrait.from(ValuesSchema)({
        profileResource: Logix.StateTrait.source({
          deps: ['userId'],
          resource: 'user/profile',
          triggers: ['manual'],
          key: (s) => (s.userId ? { userId: s.userId } : undefined),
        }),
      })

      const form = Form.make('FormBlueprintResourceIdle', {
        values: ValuesSchema,
        initialValues: {
          userId: 'u1',
          profileResource: Logix.Resource.Snapshot.success({
            keyHash: 'init',
            data: { name: 'Alice' },
          }),
        } satisfies Values,
        traits,
      })

      const runtime = Logix.Runtime.make(form, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* form.tag
        const controller = form.controller.make(rt)

        const before = yield* controller.getState
        expect(before.profileResource.status).toBe('success')
        expect(before.profileResource.data?.name).toBe('Alice')

        yield* controller.field('userId').set('')

        const after = yield* controller.getState
        expect(after.userId).toBe('')
        expect(after.profileResource.status).toBe('idle')
        expect(after.profileResource.keyHash).toBeUndefined()
        expect(after.profileResource.data).toBeUndefined()
        expect(after.profileResource.error).toBeUndefined()
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
