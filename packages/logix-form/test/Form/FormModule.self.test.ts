import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Deferred, Effect, FiberId, Layer, Schema } from 'effect'
import * as Logix from '@logix/core'
import * as Form from '../../src/index.js'

describe('FormModule $.self', () => {
  it.scoped('module.logic can yield* $.self and access controller', () =>
    Effect.gen(function* () {
      const ValuesSchema = Schema.Struct({
        name: Schema.String,
      })

      type Values = Schema.Schema.Type<typeof ValuesSchema>

      const form = Form.make('FormModule.self', {
        values: ValuesSchema,
        initialValues: { name: '' } satisfies Values,
        traits: Logix.StateTrait.from(ValuesSchema)({
          name: Logix.StateTrait.node<string>({
            check: {
              required: {
                deps: ['name'],
                validate: (value: string) => (String(value ?? '').trim() ? undefined : 'required'),
              },
            },
          }),
        }),
      })

      const done = Deferred.unsafeMake<void>(FiberId.none)

      const SelfValidate = form.logic(
        ($) =>
          Effect.gen(function* () {
            const self = yield* $.self
            yield* self.controller.validatePaths('name')
            yield* Deferred.succeed(done, undefined)
          }),
        { id: 'SelfValidate' },
      )

      const live = form.withLogic(SelfValidate)

      const runtime = Logix.Runtime.make(live, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* live.tag
        yield* Deferred.await(done)
        const state: any = yield* rt.getState
        expect(state.errors?.name).toBe('required')
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
