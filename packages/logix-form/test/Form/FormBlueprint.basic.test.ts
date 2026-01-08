import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as Form from '../../src/index.js'

describe('FormBlueprint.basic', () => {
  it.scoped('Blueprint → Module → Runtime can run', () =>
    Effect.gen(function* () {
      const Values = Schema.Struct({
        name: Schema.String,
        count: Schema.Number,
        items: Schema.Array(Schema.String),
      })

      type Values = Schema.Schema.Type<typeof Values>

      const form = Form.make('FormBlueprintBasic', {
        values: Values,
        initialValues: {
          name: 'init',
          count: 0,
          items: [],
        } satisfies Values,
      })

      const runtime = Logix.Runtime.make(form, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* form.tag
        const controller = form.controller.make(rt)

        yield* controller.field('name').set('Alice')
        yield* controller.field('count').set(5)
        yield* controller.fieldArray('items').append('x')

        const state = yield* controller.getState
        expect(state.name).toBe('Alice')
        expect(state.count).toBe(5)
        expect(state.items).toEqual(['x'])
        expect(state.errors).toEqual({ items: { rows: [undefined] } })
        expect(state.ui).toEqual({
          name: { dirty: true },
          count: { dirty: true },
          items: [undefined],
        })
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
