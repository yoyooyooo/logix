import { describe, it, expect, vi } from "vitest"
import { Effect, Layer, Schema, Cause, ManagedRuntime } from "effect"
import { Logix } from "../src/index.js"

describe("Lifecycle Error Handling", () => {
  const TestModule = Logix.Module("TestModule", {
    state: Schema.Struct({ count: Schema.Number }),
    actions: {
      triggerError: Schema.Void,
      triggerFlowError: Schema.Void,
    },
  })

  it("should capture onInit error with context", async () => {
    const errorSpy = vi.fn()

    const TestLogic = TestModule.logic((api) =>
      Effect.gen(function* () {
        yield* api.lifecycle.onError((cause, context) =>
          Effect.sync(() => {
            errorSpy(Cause.pretty(cause), context)
          })
        )

        yield* api.lifecycle.onInit(
          Effect.die(new Error("Init Failed"))
        )
      })
    )

    const layer = TestModule.live({ count: 0 }, TestLogic) as Layer.Layer<
      Logix.ModuleRuntime<any, any>,
      never,
      never
    >
    const runtime = ManagedRuntime.make(layer)
    await runtime.runPromise(Effect.void)

    expect(errorSpy).toHaveBeenCalled()
    const [causeStr, context] = errorSpy.mock.calls[0]
    expect(causeStr).toContain("Init Failed")
    expect(context).toMatchObject({
      phase: "lifecycle.onInit",
    })
  })

  it("should capture Flow error with context", async () => {
    const errorSpy = vi.fn()

    const TestLogic = TestModule.logic((api) =>
      Effect.gen(function* () {
        yield* api.lifecycle.onError((cause, context) =>
          Effect.sync(() => {
            errorSpy(Cause.pretty(cause), context)
          })
        )

        yield* api.onAction(
          (a): a is Logix.ActionOf<typeof TestModule["shape"]> =>
            a._tag === "triggerFlowError",
        ).run(() =>
          Effect.die(new Error("Flow Failed")),
        )
      })
    )

    const layer = TestModule.live({ count: 0 }, TestLogic) as Layer.Layer<
      Logix.ModuleRuntime<any, any>,
      never,
      never
    >
    const runtime = ManagedRuntime.make(layer)

    await runtime.runPromise(
      Effect.gen(function* () {
        const module = yield* TestModule
        // Wait for logic to subscribe
        yield* Effect.sleep(10)
        yield* module.dispatch({ _tag: "triggerFlowError", payload: undefined })
        // Wait a bit for async flow to process
        yield* Effect.sleep(50)
      })
    )

    expect(errorSpy).toHaveBeenCalled()
    const [causeStr, context] = errorSpy.mock.calls[0]
    expect(causeStr).toContain("Flow Failed")
    expect(context.phase).toContain("logic.fork")
  })
})
