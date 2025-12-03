import { describe, it, expect } from "vitest"
import { Effect, Layer, Schema, Context } from "effect"
import * as Logix from "../src/api/Logix.js"
import * as Logic from "../src/api/Logic.js"
import * as Debug from "../src/debug/DebugSink.js"
import * as Root from "../src/index.js"

describe("Module", () => {
  it("should define a module with state and actions", async () => {
    const CounterState = Schema.Struct({ count: Schema.Number })
    const CounterActions = {
      increment: Schema.Void,
      decrement: Schema.Void,
    }

    const Counter = Logix.Module("Counter", {
      state: CounterState,
      actions: CounterActions,
    })

    const logic = Counter.logic((api) =>
      Effect.gen(function* (_) {
        yield* Effect.all([
          api.onAction.increment.run(() => Logic.secure(api.state.update(s => ({ ...s, count: s.count + 1 })), { name: "increment" })),
          api.onAction.decrement.run(() => Logic.secure(api.state.update(s => ({ ...s, count: s.count - 1 })), { name: "decrement" }))
        ], { concurrency: "unbounded" })
      })
    )

    const originalLive = Counter.live
    const module = Object.assign(Object.create(Counter), {
      live: (initial: any) => Counter.live(initial, logic),
    })

    const program = Effect.gen(function* (_) {
      const context = yield* module.live({ count: 0 }).pipe(Layer.build)
      const runtime = Context.get(context, Counter)
      const api = {
        state: runtime.getState,
        dispatch: runtime.dispatch
      }

      // Wait for logic to subscribe
      yield* Effect.sleep(50)

      // Initial state
      expect(yield* api.state).toEqual({ count: 0 })

      // Increment
      yield* api.dispatch({ _tag: "increment", payload: undefined })
      yield* Effect.sleep(10) // Wait for async update
      expect(yield* api.state).toEqual({ count: 1 })

      // Decrement
      yield* api.dispatch({ _tag: "decrement", payload: undefined })
      yield* Effect.sleep(10) // Wait for async update
      expect(yield* api.state).toEqual({ count: 0 })
    })

    await Effect.runPromise(
      Effect.scoped(program) as Effect.Effect<void, unknown, never>
    )
  })

  it("should emit debug events", async () => {
    const TestModule = Logix.Module("DebugCounter", {
      state: Schema.Struct({ count: Schema.Number, value: Schema.String }),
      actions: {
        setValue: Schema.String,
      },
    })

    const events: Debug.DebugEvent[] = []
    const sinkLayer = Layer.succeed(Debug.DebugSinkTag, {
      record: (event: Debug.DebugEvent) =>
        Effect.sync(() => {
          events.push(event)
        }),
    })

    const program = Effect.gen(function* () {
      const runtime = yield* Root.ModuleRuntime.make(
        { count: 0, value: "initial" },
        { moduleId: TestModule.id }
      )

      yield* runtime.dispatch({ _tag: "setValue", payload: "next" })
      yield* runtime.setState({ count: 1, value: "final" })
    }).pipe(Effect.provide(sinkLayer))

    await Effect.runPromise(
      Effect.scoped(program) as Effect.Effect<void, unknown, never>
    )

    const eventTypes = events.map((event) => event.type)
    expect(eventTypes).toContain("module:init")
    expect(eventTypes).toContain("action:dispatch")
    expect(eventTypes).toContain("state:update")
    expect(eventTypes).toContain("module:destroy")
  })
})
