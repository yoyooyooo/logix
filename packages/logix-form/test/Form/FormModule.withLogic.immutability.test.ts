import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Deferred, Effect, FiberId, Layer, Schema } from 'effect'
import * as Logix from '@logix/core'
import * as Form from '../../src/index.js'

describe('FormModule.withLogic immutability', () => {
  it.scoped('withLogic returns a new module and does not mutate the original', () =>
    Effect.gen(function* () {
      const ValuesSchema = Schema.Struct({
        name: Schema.String,
      })

      type Values = Schema.Schema.Type<typeof ValuesSchema>

      const form = Form.make('FormModule.withLogic.immutability', {
        values: ValuesSchema,
        initialValues: { name: '' } satisfies Values,
      })

      const done = Deferred.unsafeMake<void>(FiberId.none)

      const SetName = form.logic(
        ($) =>
          Effect.gen(function* () {
            yield* $.actions.setValue({ path: 'name', value: 'Alice' } as any)
            yield* Deferred.succeed(done, undefined)
          }),
        { id: 'SetName' },
      )

      const live = form.withLogic(SetName)

      const runtimeBase = Logix.Runtime.make(form, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })
      const runtimeLive = Logix.Runtime.make(live, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const baseProgram = Effect.gen(function* () {
        const rt = yield* form.tag
        yield* Effect.sleep('30 millis')
        const state: any = yield* rt.getState
        expect(state.name).toBe('')
      })

      const liveProgram = Effect.gen(function* () {
        const rt = yield* live.tag
        yield* Deferred.await(done)
        const state: any = yield* rt.getState
        expect(state.name).toBe('Alice')
      })

      yield* Effect.promise(() => runtimeBase.runPromise(baseProgram as Effect.Effect<void, never, any>))
      yield* Effect.promise(() => runtimeLive.runPromise(liveProgram as Effect.Effect<void, never, any>))
    }),
  )
})
