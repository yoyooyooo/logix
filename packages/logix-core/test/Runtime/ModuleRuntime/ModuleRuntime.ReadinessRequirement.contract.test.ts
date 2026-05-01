import { describe, expect, it } from '@effect/vitest'
import { Effect, Ref, Schema } from 'effect'
import * as Logix from '../../../src/index.js'

describe('ModuleRuntime readiness requirement', () => {
  it.effect('runs $.readyAfter requirements in declaration order before returned run effect', () =>
    Effect.gen(function* () {
      const events = yield* Ref.make<Array<string>>([])

      const Module = Logix.Module.make('ModuleRuntime.ReadinessRequirement.Order', {
        state: Schema.Struct({ value: Schema.Number }),
        actions: {},
      })

      const logic = Module.logic('readiness-order', ($) => {
        $.readyAfter(Ref.update(events, (items) => [...items, 'ready:one']), { id: 'one' })
        $.readyAfter(Ref.update(events, (items) => [...items, 'ready:two']), { id: 'two' })

        return Ref.update(events, (items) => [...items, 'run'])
      })

      const program = Logix.Program.make(Module, {
        initial: { value: 0 },
        logics: [logic],
      })

      const runtime = Logix.Runtime.make(program)

      try {
        yield* Effect.promise(() => runtime.runPromise(Effect.service(Module.tag).pipe(Effect.asVoid, Effect.orDie)))
        yield* Effect.yieldNow
        const result = yield* Ref.get(events)

        expect(result).toEqual(['ready:one', 'ready:two', 'run'])
      } finally {
        yield* runtime.disposeEffect
      }
    }),
  )
})
