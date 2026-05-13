import { describe, expect, it } from '@effect/vitest'
import { Deferred, Duration, Effect, Fiber, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as Form from '../../src/index.js'
import { materializeExtendedHandle } from '../support/form-harness.js'

describe('Form effectful root rule submit lowering', () => {
  it.effect('awaits root-level Effect rule during submit and lowers failure into root error truth', () =>
    Effect.gen(function* () {
      const ValuesSchema = Schema.Struct({
        password: Schema.String,
        confirmPassword: Schema.String,
      })

      const form = Form.make(
        'Form.EffectfulRootRule.Submit',
        {
          values: ValuesSchema,
          validateOn: ['onSubmit'],
          initialValues: {
            password: 'abc',
            confirmPassword: 'xyz',
          },
        },
        (form) => {
          form.root({
            deps: ['password', 'confirmPassword'],
            validate: (values: { readonly password: string; readonly confirmPassword: string }) =>
              Effect.sleep(Duration.millis(10)).pipe(
                Effect.as(values.password === values.confirmPassword ? undefined : 'password-mismatch'),
              ),
          })
          form.submit()
        },
      )

      const runtime = Logix.Runtime.make(form, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* Effect.service(form.tag).pipe(Effect.orDie)
        const handle = materializeExtendedHandle(form.tag, rt) as any

        let validCount = 0
        let invalidCount = 0

        yield* handle.submit({
          onValid: () =>
            Effect.sync(() => {
              validCount += 1
            }),
          onInvalid: () =>
            Effect.sync(() => {
              invalidCount += 1
            }),
        })

        const invalidState: any = yield* handle.getState
        expect(validCount).toBe(0)
        expect(invalidCount).toBe(1)
        expect(invalidState.errors?.$root?.origin).toBe('rule')
        expect(invalidState.errors?.$root?.message?._tag).toBe('i18n')
        expect(invalidState.$form.submitAttempt.blockingBasis).toBe('error')
        expect(invalidState.$form.submitAttempt.errorCount).toBe(1)

        yield* handle.field('confirmPassword').set('abc')
        yield* handle.submit({
          onValid: () =>
            Effect.sync(() => {
              validCount += 1
            }),
          onInvalid: () =>
            Effect.sync(() => {
              invalidCount += 1
            }),
        })

        const validState: any = yield* handle.getState
        expect(validCount).toBe(1)
        expect(invalidCount).toBe(1)
        expect(validState.errors?.$root).toBeUndefined()
        expect(validState.$form.submitAttempt.blockingBasis).toBe('none')
        expect(validState.$form.submitAttempt.errorCount).toBe(0)
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )

  it.effect('drops stale root-level Effect rule completion after root value changes', () =>
    Effect.gen(function* () {
      const ValuesSchema = Schema.Struct({
        password: Schema.String,
        confirmPassword: Schema.String,
      })

      const slowStarted = yield* Deferred.make<void>()
      const releaseSlow = yield* Deferred.make<void>()

      const form = Form.make(
        'Form.EffectfulRootRule.Submit.StaleDrop',
        {
          values: ValuesSchema,
          validateOn: ['onSubmit'],
          initialValues: {
            password: 'abc',
            confirmPassword: 'xyz',
          },
        },
        (form) => {
          form.root({
            deps: ['password', 'confirmPassword'],
            validate: (values: { readonly password: string; readonly confirmPassword: string }) =>
              values.password === values.confirmPassword
                ? Effect.succeed(undefined)
                : Effect.gen(function* () {
                    yield* Deferred.succeed(slowStarted, undefined)
                    yield* Deferred.await(releaseSlow)
                    return 'password-mismatch'
                  }),
          })
          form.submit()
        },
      )

      const runtime = Logix.Runtime.make(form, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* Effect.service(form.tag).pipe(Effect.orDie)
        const handle = materializeExtendedHandle(form.tag, rt) as any

        const firstSubmit = yield* Effect.forkChild(handle.submit())
        yield* Deferred.await(slowStarted)
        yield* handle.field('confirmPassword').set('abc')
        const secondVerdict = yield* handle.submit()
        expect(secondVerdict.ok).toBe(true)

        yield* Deferred.succeed(releaseSlow, undefined)
        yield* Fiber.join(firstSubmit)

        const state: any = yield* handle.getState
        expect(state.errors?.$root).toBeUndefined()
        expect(state.$form.submitCount).toBe(2)
        expect(state.$form.submitAttempt.seq).toBe(2)
        expect(state.$form.submitAttempt.blockingBasis).toBe('none')
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
