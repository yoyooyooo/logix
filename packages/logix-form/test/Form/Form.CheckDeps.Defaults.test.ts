import { describe, it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as Form from '../../src/index.js'
import { materializeExtendedHandle } from '../support/form-harness.js'

const waitForAsync = Effect.promise(
  () =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, 20)
    }),
)

describe('Form field check deps defaults', () => {
  it.effect('deps is optional; self validate still runs when deps excludes self', () =>
    Effect.gen(function* () {
      const ValuesSchema = Schema.Struct({
        a: Schema.String,
        b: Schema.Boolean,
      })

      type Values = Schema.Schema.Type<typeof ValuesSchema>
      const module = Form.make(
        'Form.CheckDeps.Defaults',
        {
          values: ValuesSchema,
          initialValues: { a: '', b: false } satisfies Values,
          validateOn: ['onChange'],
          reValidateOn: ['onChange'],
        },
        (form) => {
          form.field('a').rule({
            deps: ['b'],
            validate: (value, ctx: any) => {
              if ((ctx.state as any).b !== true) return undefined
              return String(value ?? '').trim() ? undefined : 'a_required'
            },
          })
          form.field('b').rule({
            validate: () => undefined,
          })
        },
      )

      const runtime = Logix.Runtime.make(module, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* Effect.service(module.tag).pipe(Effect.orDie)
        const form = materializeExtendedHandle(module.tag, rt) as any
        yield* waitForAsync

        // b change => validates b, and should pull in a check via deps:["b"]
        yield* form.field('b').set(true)
        yield* waitForAsync

        const s1: any = yield* form.getState
        expect(s1.errors?.a).toBe('a_required')

        // a change => validates a even though deps excludes self
        yield* form.field('a').set('ok')
        yield* waitForAsync

        const s2: any = yield* form.getState
        expect(s2.errors?.a).toBeUndefined()
      })

      yield* Effect.promise(() => runtime.runPromise(program))
    }),
  )
})
