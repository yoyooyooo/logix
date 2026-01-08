import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as Form from '../../src/index.js'

describe('Form traits check deps defaults', () => {
  it.scoped('deps is optional; self validate still runs when deps excludes self', () =>
    Effect.gen(function* () {
      const ValuesSchema = Schema.Struct({
        a: Schema.String,
        b: Schema.Boolean,
      })

      type Values = Schema.Schema.Type<typeof ValuesSchema>

      const module = Form.make('Form.CheckDeps.Defaults', {
        values: ValuesSchema,
        initialValues: { a: '', b: false } satisfies Values,
        validateOn: ['onChange'],
        reValidateOn: ['onChange'],
        traits: Form.traits(ValuesSchema)({
          a: {
            check: {
              requiredWhenB: {
                deps: ['b'],
                validate: (value, ctx) => {
                  if (ctx.state.b !== true) return undefined
                  return value.trim() ? undefined : 'a_required'
                },
              },
            },
          },
          b: {
            check: {
              noop: {
                validate: () => undefined,
              },
            },
          },
        }),
      })

      const runtime = Logix.Runtime.make(module, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* module.tag
        const form = module.controller.make(rt)

        // b change => validates b, and should pull in a check via deps:["b"]
        yield* form.field('b').set(true)
        yield* Effect.sleep('20 millis')

        const s1: any = yield* form.getState
        expect(s1.errors?.a).toBe('a_required')

        // a change => validates a even though deps excludes self
        yield* form.field('a').set('ok')
        yield* Effect.sleep('20 millis')

        const s2: any = yield* form.getState
        expect(s2.errors?.a).toBeUndefined()
      })

      yield* Effect.promise(() => runtime.runPromise(program))
    }),
  )
})
