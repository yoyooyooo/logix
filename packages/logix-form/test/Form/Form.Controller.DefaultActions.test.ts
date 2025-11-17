import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logix/core'
import * as Form from '../../src/index.js'

describe('Form controller default actions', () => {
  it.scoped('validatePaths/reset/setError/clearErrors/handleSubmit', () =>
    Effect.gen(function* () {
      const ValuesSchema = Schema.Struct({
        name: Schema.String,
      })

      type Values = Schema.Schema.Type<typeof ValuesSchema>

      const module = Form.make('Form.Controller.DefaultActions', {
        values: ValuesSchema,
        validateOn: ['onSubmit'],
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

      const runtime = Logix.Runtime.make(module, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* module.tag
        const form = module.controller.make(rt)

        // scoped validate: hit the `name` rule.
        yield* form.controller.validatePaths(['name'])
        const s1: any = yield* form.getState
        expect(s1.errors?.name).toBe('required')
        expect(s1.$form.submitCount).toBe(0)

        // After fixing the value, scoped validate clears the error.
        yield* form.field('name').set('Alice')
        yield* form.controller.validatePaths(['name'])
        const s2: any = yield* form.getState
        expect(s2.errors?.name).toBeUndefined()
        expect(s2.ui?.name?.dirty).toBe(true)
        expect(s2.$form.isDirty).toBe(true)

        // setError writes into the manual overlay; setValue on the same path clears it automatically.
        yield* form.controller.setError('name', 'manual')
        const manualPath = Form.Path.toManualErrorsPath('name')
        const manualError = yield* form.field(manualPath).get
        expect(manualError).toBe('manual')

        yield* form.field('name').set('Bob')
        const manualAfterSet = yield* form.field(manualPath).get
        expect(manualAfterSet).toBeUndefined()

        // handleSubmit: invalid (rule) -> onInvalid; valid -> onValid.
        let validCount = 0
        let invalidCount = 0

        yield* form.controller.reset()
        yield* form.controller.handleSubmit({
          onValid: () =>
            Effect.sync(() => {
              validCount += 1
            }),
          onInvalid: () =>
            Effect.sync(() => {
              invalidCount += 1
            }),
        })

        const s5: any = yield* form.getState
        expect(invalidCount).toBe(1)
        expect(validCount).toBe(0)
        expect(s5.$form.submitCount).toBe(1)
        expect(s5.$form.isSubmitting).toBe(false)

        // Manual errors must also block onValid.
        yield* form.field('name').set('OK')
        yield* form.controller.setError('name', 'manual')
        expect(yield* form.field(manualPath).get).toBe('manual')
        yield* form.controller.handleSubmit({
          onValid: () =>
            Effect.sync(() => {
              validCount += 1
            }),
          onInvalid: () =>
            Effect.sync(() => {
              invalidCount += 1
            }),
        })
        expect(yield* form.field(manualPath).get).toBe('manual')

        const s6: any = yield* form.getState
        expect(invalidCount).toBe(2)
        expect(validCount).toBe(0)
        expect(s6.$form.submitCount).toBe(2)

        // Once the value changes on the same path and clears the manual error, onValid can run.
        yield* form.field('name').set('OK2')
        yield* form.controller.handleSubmit({
          onValid: () =>
            Effect.sync(() => {
              validCount += 1
            }),
          onInvalid: () =>
            Effect.sync(() => {
              invalidCount += 1
            }),
        })

        const s7: any = yield* form.getState
        expect(invalidCount).toBe(2)
        expect(validCount).toBe(1)
        expect(s7.$form.submitCount).toBe(3)
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
