import { describe, expect, it } from '@effect/vitest'
import { Deferred, Duration, Effect, Fiber, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as Form from '../../src/index.js'
import { token } from '@logixjs/i18n'
import { materializeExtendedHandle } from '../support/form-harness.js'

describe('Form effectful rule submit lowering', () => {
  it.effect('awaits field-level Effect rule during submit and lowers failure into submit truth', () =>
    Effect.gen(function* () {
      const ValuesSchema = Schema.Struct({
        username: Schema.String,
      })

      const form = Form.make(
        'Form.EffectfulRule.Submit',
        {
          values: ValuesSchema,
          validateOn: ['onSubmit'],
          initialValues: {
            username: 'taken',
          },
        },
        (form) => {
          form.field('username').rule({
            deps: ['username'],
            validate: (username: unknown) =>
              Effect.sleep(Duration.millis(10)).pipe(
                Effect.as(String(username) === 'taken' ? 'username-taken' : undefined),
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
        expect(invalidState.errors?.username?.origin).toBe('rule')
        expect(invalidState.errors?.username?.message?._tag).toBe('i18n')
        expect(invalidState.$form.submitAttempt.blockingBasis).toBe('error')
        expect(invalidState.$form.submitAttempt.errorCount).toBe(1)

        yield* handle.field('username').set('available')
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
        expect(validState.errors?.username).toBeUndefined()
        expect(validState.$form.submitAttempt.blockingBasis).toBe('none')
        expect(validState.$form.submitAttempt.errorCount).toBe(0)
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )

  it.effect('drops stale field-level Effect rule completion from an older submit attempt', () =>
    Effect.gen(function* () {
      const ValuesSchema = Schema.Struct({
        username: Schema.String,
      })

      const slowStarted = yield* Deferred.make<void>()
      const releaseSlow = yield* Deferred.make<void>()

      const form = Form.make(
        'Form.EffectfulRule.Submit.StaleDrop',
        {
          values: ValuesSchema,
          validateOn: ['onSubmit'],
          initialValues: {
            username: 'taken',
          },
        },
        (form) => {
          form.field('username').rule({
            deps: ['username'],
            validate: (username: unknown) =>
              String(username) === 'taken'
                ? Effect.gen(function* () {
                    yield* Deferred.succeed(slowStarted, undefined)
                    yield* Deferred.await(releaseSlow)
                    return 'username-taken'
                  })
                : Effect.succeed(undefined),
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

        const firstSubmit = yield* Effect.forkChild(
          handle.submit({
            onValid: () =>
              Effect.sync(() => {
                validCount += 1
              }),
            onInvalid: () =>
              Effect.sync(() => {
                invalidCount += 1
              }),
          }),
        )

        yield* Deferred.await(slowStarted)
        yield* handle.field('username').set('available')

        const secondVerdict = yield* handle.submit({
          onValid: () =>
            Effect.sync(() => {
              validCount += 1
            }),
          onInvalid: () =>
            Effect.sync(() => {
              invalidCount += 1
            }),
        })

        expect(secondVerdict.ok).toBe(true)

        yield* Deferred.succeed(releaseSlow, undefined)
        yield* Fiber.join(firstSubmit)

        const state: any = yield* handle.getState
        expect(state.username).toBe('available')
        expect(state.errors?.username).toBeUndefined()
        expect(state.$form.submitCount).toBe(2)
        expect(state.$form.submitAttempt.seq).toBe(2)
        expect(state.$form.submitAttempt.blockingBasis).toBe('none')
        expect(state.$form.submitAttempt.errorCount).toBe(0)
        expect(validCount).toBe(1)
        expect(invalidCount).toBe(0)
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )

  it.effect('keeps warning leaves advisory and non-blocking during submit', () =>
    Effect.gen(function* () {
      const ValuesSchema = Schema.Struct({
        username: Schema.String,
      })

      const form = Form.make(
        'Form.EffectfulRule.Submit.WarningAdvisory',
        {
          values: ValuesSchema,
          validateOn: ['onSubmit'],
          initialValues: {
            username: 'risky',
          },
        },
        (form) => {
          form.field('username').rule({
            deps: ['username'],
            validate: () =>
              Effect.succeed(
                Form.Error.leaf(token('form.warning.username'), {
                  origin: 'rule',
                  severity: 'warning',
                }),
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
        const verdict = yield* handle.submit({
          onValid: () =>
            Effect.sync(() => {
              validCount += 1
            }),
          onInvalid: () =>
            Effect.sync(() => {
              invalidCount += 1
            }),
        })

        const state: any = yield* handle.getState
        expect(verdict.ok).toBe(true)
        expect(validCount).toBe(1)
        expect(invalidCount).toBe(0)
        expect(state.errors?.username?.severity).toBe('warning')
        expect(state.$form.errorCount).toBe(0)
        expect(state.$form.submitAttempt.blockingBasis).toBe('none')
        expect(state.$form.submitAttempt.errorCount).toBe(0)
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )

  it.effect('keeps Effect.fail in the submit Effect channel without writing canonical rule error truth', () =>
    Effect.gen(function* () {
      const ValuesSchema = Schema.Struct({
        username: Schema.String,
      })

      const form = Form.make(
        'Form.EffectfulRule.Submit.FailChannel',
        {
          values: ValuesSchema,
          validateOn: ['onSubmit'],
          initialValues: {
            username: 'bad',
          },
        },
        (form) => {
          form.field('username').rule({
            deps: ['username'],
            validate: () => Effect.fail('rule-service-unavailable'),
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

        const exit = yield* Effect.exit(handle.submit())
        expect(exit._tag).toBe('Failure')

        const state: any = yield* handle.getState
        expect(state.errors?.username).toBeUndefined()
        expect(state.$form.submitCount).toBe(1)
        expect(state.$form.isSubmitting).toBe(false)
        expect(state.$form.submitAttempt.seq).toBe(0)
        expect(state.$form.submitAttempt.blockingBasis).toBe('none')
        expect(state.$form.submitAttempt.errorCount).toBe(0)
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
