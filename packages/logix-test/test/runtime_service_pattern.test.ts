import { describe, expect } from "vitest"
import { it } from "@effect/vitest"
import { Effect, Schema, Layer, TestClock } from "effect"
import * as Logix from "@logix/core"
import * as LogixTest from "../src/index.js"

const Counter = Logix.Module.make("Counter", {
  state: Schema.Struct({ count: Schema.Number }),
  actions: { inc: Schema.Void },
})

const CounterLogic = Counter.logic(($) =>
  Effect.gen(function* () {
    // Check time inside logic
    const t1 = yield* TestClock.currentTimeMillis
    yield* Effect.log(`LOGIC TIME 1: ${t1}`)

    // Subscribe
    yield* $.onAction("inc").runParallel(
      Effect.gen(function* () {
        yield* Effect.log("LOGIC HANDLING INC")
        const t2 = yield* TestClock.currentTimeMillis
        yield* Effect.log(`LOGIC TIME 2: ${t2}`)
        yield* $.state.update((s) => ({ ...s, count: s.count + 1 }))
      }),
    )
  }),
)

const CounterTestLayer: Layer.Layer<any, any, any> = Counter.live(
  { count: 0 },
  CounterLogic,
) as unknown as Layer.Layer<any, any, any>

describe("Runtime as Service Prototype", () => {
  it.scoped("should share TestClock and handle concurrency", () =>
    Effect.gen(function* () {
      const testRuntime = yield* LogixTest.TestRuntime.make(
        Counter,
        CounterTestLayer,
      )

      yield* Effect.log("TEST START")
      const t1 = yield* TestClock.currentTimeMillis
      yield* Effect.log(`TEST TIME 1: ${t1}`)

      // Wait to ensure logic is ready
      yield* TestClock.adjust(10)

      const t2 = yield* TestClock.currentTimeMillis
      yield* Effect.log(`TEST TIME 2: ${t2}`)

      // Verify dispatch
      yield* Effect.log("DISPATCHING")
      yield* testRuntime.dispatch({ _tag: "inc", payload: undefined })

      // Let logic process
      yield* TestClock.adjust(10)

      const state = yield* testRuntime.state
      expect(state.count).toBe(1)

      const actions = yield* testRuntime.actions
      expect(actions).toEqual([{ _tag: "inc", payload: undefined }])

      yield* testRuntime.dispose
    }),
  )
})
