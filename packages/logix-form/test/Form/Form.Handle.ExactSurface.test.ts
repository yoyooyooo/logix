import { describe, it, expect } from '@effect/vitest'
import { token } from '@logixjs/i18n'
import { Effect, Schema } from 'effect'
import * as Form from '../../src/index.js'
import { runWithFormHandle } from '../support/form-harness.js'

describe('Form handle exact surface', () => {
  it('does not expose value-level settlement, reason, or submit attempt nouns from the root barrel', () => {
    expect((Form as any).Settlement).toBeUndefined()
    expect((Form as any).Reason).toBeUndefined()
    expect((Form as any).SubmitAttempt).toBeUndefined()
  })

  it.effect('materializes direct form methods and no longer exposes commands bridge', () =>
    Effect.gen(function* () {
      const Values = Schema.Struct({
        name: Schema.String,
        items: Schema.Array(Schema.String),
      })

      const form = (Form.make as any)(
        'Form.Handle.ExactSurface',
        {
          values: Values,
          initialValues: {
            name: '',
            items: [],
          },
        },
        (define: any) => {
          define.field('name').rule(
            Form.Rule.make({
              required: token('form.handle.nameRequired'),
            }),
          )
          define.submit()
        },
      )

      yield* runWithFormHandle(form, (handle) =>
        Effect.sync(() => {
          expect(typeof handle.validate).toBe('function')
          expect(typeof handle.validatePaths).toBe('function')
          expect(typeof handle.submit).toBe('function')
          expect(typeof handle.reset).toBe('function')
          expect(typeof handle.setError).toBe('function')
          expect(typeof handle.clearErrors).toBe('function')
          expect(typeof handle.field).toBe('function')
          expect(typeof handle.fieldArray).toBe('function')
          expect((handle as any).getState).toBeUndefined()
          expect(typeof (handle.field as any)('name').set).toBe('function')
          expect(typeof (handle.field as any)('name').blur).toBe('function')
          expect((handle.field as any)('name').get).toBeUndefined()
          expect(typeof (handle.fieldArray as any)('items').append).toBe('function')
          expect((handle.fieldArray as any)('items').get).toBeUndefined()
          expect(typeof (handle.fieldArray as any)('items').byRowId('row-1').update).toBe('function')
          expect(typeof (handle.fieldArray as any)('items').byRowId('row-1').remove).toBe('function')
          expect((handle as any).commands).toBeUndefined()
        }),
      )
    }),
  )
})
