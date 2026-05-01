import { describe, it, expect } from '@effect/vitest'
import { token } from '@logixjs/i18n'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as Form from '../../src/index.js'
import * as Path from '../../src/Path.js'
import { materializeExtendedHandle } from '../support/form-harness.js'

const expectSubmitAttempt = (
  state: any,
  expected: {
    readonly seq: number
    readonly verdict: 'ok' | 'blocked'
    readonly decodedVerdict: 'valid' | 'invalid'
    readonly blockingBasis: 'none' | 'error' | 'decode' | 'pending'
    readonly errorCount: number
    readonly pendingCount: number
  },
): void => {
  const evidence = {
    reasonSlotId: `submit:${expected.seq}`,
    sourceRef: '$form.submitAttempt',
    family: expected.blockingBasis,
    scope: 'submit',
    blockingBasis: expected.blockingBasis,
    errorCount: expected.errorCount,
    pendingCount: expected.pendingCount,
  }
  expect(state?.$form?.submitAttempt).toEqual({
    seq: expected.seq,
    reasonSlotId: `submit:${expected.seq}`,
    verdict: expected.verdict,
    decodedVerdict: expected.decodedVerdict,
    blockingBasis: expected.blockingBasis,
    errorCount: expected.errorCount,
    pendingCount: expected.pendingCount,
    summary: {
      verdict: expected.verdict,
      decodedVerdict: expected.decodedVerdict,
      blockingBasis: expected.blockingBasis,
      errorCount: expected.errorCount,
      pendingCount: expected.pendingCount,
      evidence,
    },
    compareFeed: {
      reasonSlotId: `submit:${expected.seq}`,
      verdict: expected.verdict,
      decodedVerdict: expected.decodedVerdict,
      blockingBasis: expected.blockingBasis,
      errorCount: expected.errorCount,
      pendingCount: expected.pendingCount,
      evidence,
    },
  })
}

describe('Form commands default actions', () => {
  it.effect('validatePaths/reset/setError/clearErrors/handleSubmit', () =>
    Effect.gen(function* () {
      const manualToken = token('form.manual')
      const ValuesSchema = Schema.Struct({
        name: Schema.String,
      })

      type Values = Schema.Schema.Type<typeof ValuesSchema>

      const module = Form.make(
        'Form.Commands.DefaultActions',
        {
          values: ValuesSchema,
          validateOn: ['onSubmit'],
          initialValues: { name: '' } satisfies Values,
        },
        (form) => {
          form.field('name').rule({
            deps: ['name'],
            validate: (value: unknown) => (String(value ?? '').trim() ? undefined : 'required'),
          })
          form.submit()
        },
      )

      const runtime = Logix.Runtime.make(module, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* Effect.service(module.tag).pipe(Effect.orDie)
        const form = materializeExtendedHandle(module.tag, rt) as any

        // scoped validate: hit the `name` rule.
        yield* form.validatePaths(['name'])
        const s1: any = yield* form.getState
        expect(s1.errors?.name).toBe('required')
        expect(s1.$form.submitCount).toBe(0)
        expect(s1.errors?.$schema).toBeUndefined()

        yield* form.validate()
        const s1b: any = yield* form.getState
        expect(s1b.errors?.$schema).toBeUndefined()

        // After fixing the value, scoped validate clears the error.
        yield* form.field('name').set('Alice')
        yield* form.validatePaths(['name'])
        const s2: any = yield* form.getState
        expect(s2.errors?.name).toBeUndefined()
        expect(s2.ui?.name?.dirty).toBe(true)
        expect(s2.$form.isDirty).toBe(true)

        // setError writes into the manual overlay; setValue on the same path clears it automatically.
        yield* form.setError('name', {
          origin: 'manual',
          severity: 'error',
          message: manualToken,
        })
        const manualPath = Path.toManualErrorsPath('name')
        const manualError = yield* form.field(manualPath).get
        expect(manualError).toEqual({
          origin: 'manual',
          severity: 'error',
          message: manualToken,
        })

        yield* form.field('name').set('Bob')
        const manualAfterSet = yield* form.field(manualPath).get
        expect(manualAfterSet).toBeUndefined()

        // handleSubmit: invalid (rule) -> onInvalid; valid -> onValid.
        let validCount = 0
        let invalidCount = 0

        yield* form.reset()
        yield* form.submit({
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
        expect(s5.errors?.$schema).toBeDefined()
        expectSubmitAttempt(s5, {
          seq: 1,
          verdict: 'blocked',
          decodedVerdict: 'valid',
          blockingBasis: 'error',
          errorCount: 1,
          pendingCount: 0,
        })

        // Manual errors must also block onValid.
        yield* form.field('name').set('OK')
        yield* form.setError('name', {
          origin: 'manual',
          severity: 'error',
          message: manualToken,
        })
        expect(yield* form.field(manualPath).get).toEqual({
          origin: 'manual',
          severity: 'error',
          message: manualToken,
        })
        yield* form.submit({
          onValid: () =>
            Effect.sync(() => {
              validCount += 1
            }),
          onInvalid: () =>
            Effect.sync(() => {
              invalidCount += 1
            }),
        })
        expect(yield* form.field(manualPath).get).toEqual({
          origin: 'manual',
          severity: 'error',
          message: manualToken,
        })

        const s6: any = yield* form.getState
        expect(invalidCount).toBe(2)
        expect(validCount).toBe(0)
        expect(s6.$form.submitCount).toBe(2)
        expectSubmitAttempt(s6, {
          seq: 2,
          verdict: 'blocked',
          decodedVerdict: 'valid',
          blockingBasis: 'error',
          errorCount: 1,
          pendingCount: 0,
        })

        // Once the value changes on the same path and clears the manual error, onValid can run.
        yield* form.field('name').set('OK2')
        yield* form.submit({
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
        expectSubmitAttempt(s7, {
          seq: 3,
          verdict: 'ok',
          decodedVerdict: 'valid',
          blockingBasis: 'none',
          errorCount: 0,
          pendingCount: 0,
        })
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )

  it.effect('handleSubmit blocks on decode residue even when canonical errorCount is zero', () =>
    Effect.gen(function* () {
      const DecodeSchema = Schema.Struct({
        name: Schema.String.pipe(
          Schema.refine((value): value is string => value.startsWith('A'), {
            message: 'must-start-with-a',
          }),
        ),
      })

      const ValuesSchema = Schema.Struct({
        name: Schema.String,
      })

      const module = Form.make(
        'Form.Commands.DecodeResidueBlocksSubmit',
        {
          values: ValuesSchema,
          validateOn: ['onSubmit'],
          initialValues: { name: 'Bob' },
        },
        (form) => {
          form.submit({
            decode: DecodeSchema,
          })
        },
      )

      const runtime = Logix.Runtime.make(module, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* Effect.service(module.tag).pipe(Effect.orDie)
        const form = materializeExtendedHandle(module.tag, rt) as any

        let validCount = 0
        let invalidCount = 0

        yield* form.submit({
          onValid: () =>
            Effect.sync(() => {
              validCount += 1
            }),
          onInvalid: () =>
            Effect.sync(() => {
              invalidCount += 1
            }),
        })

        const state: any = yield* form.getState
        expect(validCount).toBe(0)
        expect(invalidCount).toBe(1)
        expect(state.$form.submitCount).toBe(1)
        expect(state.$form.isSubmitting).toBe(false)
        expect(state.errors?.$schema).toBeDefined()
        expect(Object.keys(state.errors?.$schema ?? {}).length).toBeGreaterThan(0)
        expectSubmitAttempt(state, {
          seq: 1,
          verdict: 'blocked',
          decodedVerdict: 'invalid',
          blockingBasis: 'decode',
          errorCount: 0,
          pendingCount: 0,
        })
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
