import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logix/core'
import * as Form from '../../src/index.js'

describe('FormBlueprint.fieldArray', () => {
  it.scoped('append/prepend/remove/swap/move keep errors/ui aligned', () =>
    Effect.gen(function* () {
      const ValuesSchema = Schema.Struct({
        items: Schema.Array(Schema.String),
      })

      type Values = Schema.Schema.Type<typeof ValuesSchema>

      const form = Form.make('FormBlueprintArray', {
        values: ValuesSchema,
        initialValues: {
          items: ['a', 'b', 'c'],
        } satisfies Values,
      })

      const runtime = Logix.Runtime.make(form, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* form.tag
        const controller = form.controller.make(rt)

        yield* controller.field('errors.items.rows').set(['e0', undefined, 'e2'])
        yield* controller.field('ui.items').set(['u0', 'u1', 'u2'])

        yield* controller.fieldArray('items').append('d')
        yield* controller.fieldArray('items').prepend('z')
        yield* controller.fieldArray('items').remove(2)
        yield* controller.fieldArray('items').swap(1, 2)
        yield* controller.fieldArray('items').move(1, 3)

        type Meta = { readonly items: ReadonlyArray<string | undefined> }
        type Errors = { readonly items: { readonly rows: ReadonlyArray<string | undefined> } }
        type State = Values & { readonly errors: Errors; readonly ui: Meta }

        const state = (yield* controller.getState) as State
        expect(state.items).toEqual(['z', 'a', 'd', 'c'])
        expect(state.errors.items.rows).toEqual([undefined, 'e0', undefined, 'e2'])
        expect(state.ui.items).toEqual([undefined, 'u0', undefined, 'u2'])
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
