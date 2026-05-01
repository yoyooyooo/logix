import { describe, it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Form from '../../src/index.js'
import { runWithFormHandle } from '../support/form-harness.js'

describe('Form authoring exact surface', () => {
  it.effect('supports Form.make(id, config, define) as the surviving authoring act', () =>
    Effect.gen(function* () {
      const Values = Schema.Struct({
        name: Schema.String,
        items: Schema.Array(
          Schema.Struct({
            id: Schema.String,
            value: Schema.String,
          }),
        ),
      })

      const form = (Form.make as any)(
        'Form.Authoring.ExactSurface',
        {
          values: Values,
          initialValues: {
            name: '',
            items: [],
          },
          validateOn: ['onSubmit'],
          reValidateOn: ['onChange'],
        },
        (define: any) => {
          expect(typeof define.field('name').companion).toBe('function')

          define.field('name').rule(
            Form.Rule.make({
              validate: (value: unknown) => (String(value ?? '').trim() ? undefined : 'name-required'),
            }),
          )

          define.rules(
            Form.Rule.list('items', {
              identity: { mode: 'trackBy', trackBy: 'id' },
              list: {
                validate: (rows: ReadonlyArray<unknown>) => (rows.length > 0 ? undefined : { $list: 'at-least-one-row' }),
              },
            }),
          )

          define.submit()
        },
      )

      yield* runWithFormHandle(form, (handle) =>
        Effect.gen(function* () {
          yield* (handle.validate as (paths?: unknown) => Effect.Effect<void>)()
          let state = yield* (handle.read as (selector: (state: any) => any) => Effect.Effect<any>)((s) => s)

          expect(state.errors?.name).toBe('name-required')
          expect(state.errors?.items).toBeDefined()

          yield* (handle.field as (path: string) => { set: (value: unknown) => Effect.Effect<void> })('name').set('Ada')
          yield* (
            handle.fieldArray as (path: string) => {
              append: (value: unknown) => Effect.Effect<void>
            }
          )('items').append({
            id: 'row-1',
            value: 'ok',
          })
          yield* (handle.validate as () => Effect.Effect<void>)()

          state = yield* (handle.read as (selector: (state: any) => any) => Effect.Effect<any>)((s) => s)
          expect(state.name).toBe('Ada')
          expect(Array.isArray(state.items)).toBe(true)
          expect(state.items).toHaveLength(1)
          expect(state.errors?.name).toBeUndefined()
        }),
      )
    }),
  )
})
