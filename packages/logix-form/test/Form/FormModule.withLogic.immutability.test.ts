import { describe, it, expect } from '@effect/vitest'
import { Deferred, Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as Form from '../../src/index.js'

describe('FormModule.withLogic immutability', () => {
  it.effect('withLogic returns a new module and does not mutate the original', () =>
    Effect.gen(function* () {
      const ValuesSchema = Schema.Struct({
        name: Schema.String,
      })

      type Values = Schema.Schema.Type<typeof ValuesSchema>

      const form = Form.make('FormModule.withLogic.immutability', {
        values: ValuesSchema,
        initialValues: { name: '' } satisfies Values,
      })

      const done = yield* Deferred.make<void>()

      const SetName = form.logic(
        ($) =>
          Effect.gen(function* () {
            yield* $.dispatchers.setValue({ path: 'name', value: 'Alice' } as any)
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
        const rt = yield* Effect.service(form.tag).pipe(Effect.orDie)
        yield* Effect.sleep('30 millis')
        const state: any = yield* rt.getState
        expect(state.name).toBe('')
      })

      const liveProgram = Effect.gen(function* () {
        const rt = yield* Effect.service(live.tag).pipe(Effect.orDie)
        yield* Deferred.await(done)
        const state: any = yield* rt.getState
        expect(state.name).toBe('Alice')
      })

      yield* Effect.promise(() => runtimeBase.runPromise(baseProgram as Effect.Effect<void, never, any>))
      yield* Effect.promise(() => runtimeLive.runPromise(liveProgram as Effect.Effect<void, never, any>))
    }),
  )
})
