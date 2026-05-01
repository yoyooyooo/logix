import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as Form from '../../src/index.js'
import { materializeExtendedHandle } from '../support/form-harness.js'

describe('Form fieldArray exact surface', () => {
  it.effect('exposes insert/update/replace/byRowId on the runtime handle', () =>
    Effect.gen(function* () {
      const ValuesSchema = Schema.Struct({
        items: Schema.Array(Schema.String),
      })

      const form = Form.make('Form.FieldArray.ExactSurface', {
        values: ValuesSchema,
        initialValues: { items: ['a', 'b'] },
      })

      const runtime = Logix.Runtime.make(form, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* Effect.service(form.tag).pipe(Effect.orDie)
        const handle = materializeExtendedHandle(form.tag, rt) as any
        const api: any = handle.fieldArray('items')

        expect(typeof api.insert).toBe('function')
        expect(typeof api.update).toBe('function')
        expect(typeof api.replace).toBe('function')
        expect(typeof api.byRowId).toBe('function')
        expect(typeof api.byRowId('row-0').update).toBe('function')
        expect(typeof api.byRowId('row-0').remove).toBe('function')
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
