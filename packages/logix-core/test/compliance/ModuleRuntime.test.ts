
import { describe, it, expect } from "vitest"
import { Effect, Stream, SubscriptionRef, Context, Layer, Scope, Fiber, Chunk } from "effect"
import * as ModuleRuntime from "../../src/runtime/ModuleRuntime.js"

describe("ModuleRuntime Compliance", () => {
  it("should maintain state consistency", async () => {
    const program = Effect.gen(function* (_) {
      const runtime = yield* ModuleRuntime.make({ count: 0 })

      // Initial state
      expect(yield* runtime.getState).toEqual({ count: 0 })

      // Update state
      yield* runtime.setState({ count: 1 })
      expect(yield* runtime.getState).toEqual({ count: 1 })

      // SubscriptionRef consistency
      const ref = runtime.ref()
      expect(yield* ref).toEqual({ count: 1 })
    })

    await Effect.runPromise(
      Effect.scoped(program) as Effect.Effect<void, unknown, never>
    )
  })

  it("should support ref(selector) for read-only view", async () => {
    const program = Effect.gen(function* (_) {
      const runtime = yield* ModuleRuntime.make({ count: 0, name: "test" })

      // Create derived ref
      const countRef = runtime.ref((s) => s.count)

      // Initial value
      expect(yield* countRef.get).toBe(0)

      // Update main state
      yield* runtime.setState({ count: 1, name: "test" })
      expect(yield* countRef.get).toBe(1)

      // Verify stream
      const changes = yield* Stream.runCollect(Stream.take(countRef.changes, 1))
      expect(Chunk.toReadonlyArray(changes)[0]).toBe(1)

      // Verify write protection: subscription refs from `ref(selector)` are read-only,
      // so attempting to write via SubscriptionRef API should fail.
      const exit = yield* Effect.exit(
        SubscriptionRef.set(countRef, 2)
      )
      expect(exit._tag).toBe("Failure")
    })

    await Effect.runPromise(
      Effect.scoped(program) as Effect.Effect<void, unknown, never>
    )
  })

  it("should dispatch actions correctly", async () => {
    const program = Effect.gen(function* (_) {
      const runtime = yield* ModuleRuntime.make({ count: 0 })

      const actionsFiber = yield* Stream.runCollect(Stream.take(runtime.actions$, 2)).pipe(
        Effect.fork
      )

      // Wait for subscription to be active
      yield* Effect.sleep(10)

      yield* runtime.dispatch({ type: "INC" })
      yield* runtime.dispatch({ type: "DEC" })

      const actions = yield* Fiber.join(actionsFiber)
      expect(Chunk.toReadonlyArray(actions)).toEqual([
        { type: "INC" },
        { type: "DEC" }
      ])
    })

    await Effect.runPromise(
      Effect.scoped(program) as Effect.Effect<void, unknown, never>
    )
  })
})
