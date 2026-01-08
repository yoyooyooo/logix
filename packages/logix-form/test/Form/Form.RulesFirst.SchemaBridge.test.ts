import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as Form from '../../src/index.js'

describe('Form rules-first schema bridge (T046)', () => {
  it.scoped('z.field(schema) validates and participates in reValidateOn', () =>
    Effect.gen(function* () {
      const Email = Schema.String.pipe(
        Schema.minLength(1, { message: () => '请填写邮箱' }),
        Schema.pattern(/.+@.+\..+/, { message: () => '邮箱格式不正确' }),
      )

      const ValuesSchema = Schema.Struct({
        contact: Schema.Struct({
          email: Email,
        }),
      })

      type Values = Schema.Schema.Type<typeof ValuesSchema>

      const $ = Form.from(ValuesSchema)
      const z = $.rules

      const rules = z.schema(
        z.object({
          contact: z.object({
            email: z.field(Email),
          }),
        }),
      )

      const module = Form.make('Form.RulesFirst.SchemaBridge', {
        values: ValuesSchema,
        initialValues: { contact: { email: '' } } satisfies Values,
        validateOn: ['onSubmit'],
        reValidateOn: ['onChange'],
        rules,
      })

      const runtime = Logix.Runtime.make(module, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* module.tag
        const controller = module.controller.make(rt)

        yield* controller.controller.handleSubmit({
          onValid: () => Effect.void,
          onInvalid: () => Effect.void,
        })

        const s1: any = yield* controller.getState
        expect(s1.errors?.contact?.email).toBe('请填写邮箱')

        yield* controller.field('contact.email').set('abc')
        yield* Effect.sleep('20 millis')

        const s2: any = yield* controller.getState
        expect(s2.errors?.contact?.email).toBe('邮箱格式不正确')

        yield* controller.field('contact.email').set('a@b.com')
        yield* Effect.sleep('20 millis')

        const s3: any = yield* controller.getState
        expect(s3.errors?.contact?.email).toBeUndefined()
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
