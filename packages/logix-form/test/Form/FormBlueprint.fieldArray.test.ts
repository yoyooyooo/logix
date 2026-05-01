import { describe, it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as Form from '../../src/index.js'
import { materializeExtendedHandle } from '../support/form-harness.js'

describe('FormBlueprint.fieldArray', () => {
  it.effect('append/prepend/remove/swap/move keep errors/ui aligned', () =>
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
        const rt = yield* Effect.service(form.tag).pipe(Effect.orDie)
        const handle = materializeExtendedHandle(form.tag, rt) as any

        yield* handle.field('errors.items.rows').set(['e0', undefined, 'e2'])
        yield* handle.field('ui.items').set(['u0', 'u1', 'u2'])

        yield* handle.fieldArray('items').append('d')
        yield* handle.fieldArray('items').prepend('z')
        yield* handle.fieldArray('items').remove(2)
        yield* handle.fieldArray('items').swap(1, 2)
        yield* handle.fieldArray('items').move(1, 3)

        type Meta = { readonly items: ReadonlyArray<string | undefined> }
        type Errors = { readonly items: { readonly rows: ReadonlyArray<string | undefined> } }
        type State = Values & { readonly errors: Errors; readonly ui: Meta }

        const state = (yield* handle.getState) as State
        expect(state.items).toEqual(['z', 'a', 'd', 'c'])
        expect(state.errors.items.rows).toEqual([undefined, 'e0', undefined, 'e2'])
        expect(state.ui.items).toEqual([undefined, 'u0', undefined, 'u2'])
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )

  it.effect('insert/update/replace keep values and aux trees aligned', () =>
    Effect.gen(function* () {
      const ValuesSchema = Schema.Struct({
        items: Schema.Array(Schema.String),
      })

      type Values = Schema.Schema.Type<typeof ValuesSchema>

      const form = Form.make('FormBlueprintArray.InsertUpdateReplace', {
        values: ValuesSchema,
        initialValues: {
          items: ['a', 'b', 'c'],
        } satisfies Values,
      })

      const runtime = Logix.Runtime.make(form, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* Effect.service(form.tag).pipe(Effect.orDie)
        const handle = materializeExtendedHandle(form.tag, rt) as any

        yield* handle.field('errors.items.rows').set(['e0', undefined, 'e2'])
        yield* handle.field('ui.items').set(['u0', 'u1', 'u2'])

        yield* handle.fieldArray('items').insert(1, 'x')
        yield* handle.fieldArray('items').update(2, 'y')
        yield* handle.fieldArray('items').replace(['r0', 'r1'])

        type Meta = { readonly items: ReadonlyArray<string | undefined> }
        type Errors = { readonly items: { readonly rows: ReadonlyArray<string | undefined> } }
        type State = Values & { readonly errors: Errors; readonly ui: Meta }

        const state = (yield* handle.getState) as State
        expect(state.items).toEqual(['r0', 'r1'])
        expect(state.errors.items.rows).toEqual([undefined, undefined])
        expect(state.ui.items).toEqual([undefined, undefined])
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
