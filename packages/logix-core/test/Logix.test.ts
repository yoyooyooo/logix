import { describe, it, expect } from "vitest"
import { Effect, Layer, Context, Schema } from "effect"
import * as Logix from "../src/index.js"

const State = Schema.Struct({
  count: Schema.Number
})
const Actions = {
  inc: Schema.Void
}
const TestModule = Logix.Logix.Module("TestModule", {
  state: State,
  actions: Actions
})

describe("Logix", () => {
  it("should construct a runtime from ModuleImpl via LogixRuntime", () =>
    Effect.gen(function* () {
      const impl = TestModule.make({
        initial: { count: 0 },
      })

      const runtime = Logix.LogixRuntime.make(impl, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const test = yield* TestModule
        expect(test).toBeDefined()
        expect(yield* test.getState).toEqual({ count: 0 })
      })

      yield* Effect.promise(() =>
        runtime.runPromise(program as Effect.Effect<void, never, any>),
      )
    }).pipe(Effect.scoped, Effect.runPromise))

  it("should handle Link", () => {
      const link = Logix.Link.make(
        { modules: [TestModule] as const },
        () => Effect.void,
      )
      expect(Effect.isEffect(link)).toBe(true)
  })
})
