import { describe, it, expect } from "vitest"
import { Effect, Layer, Schema } from "effect"
import * as Logix from "../src/index.js"

describe("LogixRuntime.make", () => {
  const CounterState = Schema.Struct({ count: Schema.Number })
  const CounterActions = {
    inc: Schema.Void,
  }

  const CounterModule = Logix.Logix.Module("Counter", {
    state: CounterState,
    actions: CounterActions,
  })

  it("should build a runtime from Root ModuleImpl and run processes", async () => {
    const CounterImpl = CounterModule.make({
      initial: { count: 0 },
    })

    const RootModule = Logix.Logix.Module("Root", {
      state: Schema.Void,
      actions: {},
    })

    let processRan = false

    const RootImpl = RootModule.make({
      initial: undefined,
      imports: [CounterImpl],
      processes: [
        Effect.sync(() => {
          processRan = true
        }),
      ],
    })

    const runtime = Logix.LogixRuntime.make(RootImpl, {
      layer: Layer.empty as Layer.Layer<any, never, never>,
    })

    const program: Effect.Effect<void, never, any> = Effect.gen(
      function* () {
        const counterRuntime = yield* CounterModule
        const state = yield* counterRuntime.getState
        expect(state).toEqual({ count: 0 })
      },
    )

    await runtime.runPromise(program)

    expect(processRan).toBe(true)
  })
})

