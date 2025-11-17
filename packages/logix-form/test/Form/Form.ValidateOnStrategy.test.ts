import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logix/core'
import * as Form from '../../src/index.js'

describe('Form validateOn/reValidateOn strategy', () => {
  it.scoped('validateOn/reValidateOn + rule.validateOn override/disable', () =>
    Effect.gen(function* () {
      const ValuesSchema = Schema.Struct({
        name: Schema.String,
        code: Schema.String,
        secret: Schema.String,
      })

      type Values = Schema.Schema.Type<typeof ValuesSchema>

      const module = Form.make('Form.ValidateOnStrategy', {
        values: ValuesSchema,
        initialValues: { name: '', code: '', secret: '' } satisfies Values,
        validateOn: ['onSubmit'],
        reValidateOn: ['onChange'],
        traits: Logix.StateTrait.from(ValuesSchema)({
          name: Logix.StateTrait.node<string>({
            check: {
              required: {
                deps: ['name'],
                validate: (value: string) => (String(value ?? '').trim() ? undefined : 'required'),
              },
            },
          }),
          code: Logix.StateTrait.node<string>({
            check: {
              blurOnly: {
                deps: ['code'],
                validateOn: ['onBlur'],
                validate: (value: string) => (String(value ?? '').trim() ? undefined : 'code-required'),
              },
            },
          }),
          secret: Logix.StateTrait.node<string>({
            check: {
              noAuto: {
                deps: ['secret'],
                validateOn: [],
                validate: (value: string) => (String(value ?? '').trim() ? undefined : 'secret-required'),
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

        // Pre-submit: with validateOn=["onSubmit"], name/secret should not auto-validate on change/blur.
        yield* form.field('code').blur()
        yield* Effect.sleep('20 millis')

        const s1: any = yield* form.getState
        expect(s1.errors?.code).toBe('code-required')
        expect(s1.errors?.name).toBeUndefined()
        expect(s1.errors?.secret).toBeUndefined()

        // Fix code (onChange should not trigger the blurOnly rule).
        yield* form.field('code').set('X')
        yield* Effect.sleep('20 millis')

        const s2: any = yield* form.getState
        expect(s2.errors?.code).toBe('code-required')

        // submit: must run full validation (including validateOn=[] and validateOn=["onBlur"] rules).
        let invalid = 0
        yield* form.controller.handleSubmit({
          onValid: () => Effect.void,
          onInvalid: () =>
            Effect.sync(() => {
              invalid += 1
            }),
        })

        const s3: any = yield* form.getState
        expect(invalid).toBe(1)
        expect(s3.$form.submitCount).toBe(1)
        expect(s3.errors?.name).toBe('required')
        expect(s3.errors?.secret).toBe('secret-required')
        // submit reruns blurOnly: since code is valid, its error should be cleared.
        expect(s3.errors?.code).toBeUndefined()

        // Post-submit: with reValidateOn=["onChange"], name should revalidate and clear automatically.
        yield* form.field('name').set('Alice')
        yield* Effect.sleep('20 millis')

        const s4: any = yield* form.getState
        expect(s4.errors?.name).toBeUndefined()

        // validateOn=[]: does not participate in onChange auto-validation (error should not clear automatically).
        yield* form.field('secret').set('OK')
        yield* Effect.sleep('20 millis')

        const s5: any = yield* form.getState
        expect(s5.errors?.secret).toBe('secret-required')

        // validateOn=["onBlur"]: does not participate in onChange (error should not appear automatically), but blur triggers it.
        yield* form.field('code').set('')
        yield* Effect.sleep('20 millis')

        const s6: any = yield* form.getState
        expect(s6.errors?.code).toBeUndefined()

        yield* form.field('code').blur()
        yield* Effect.sleep('20 millis')

        const s7: any = yield* form.getState
        expect(s7.errors?.code).toBe('code-required')
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
