import { describe, it, expect } from "vitest"
import { Effect, Layer, Schema, Context } from "effect"
import * as Logix from "../src/api/Logix.js"
import * as ModuleRuntime from "../src/runtime/ModuleRuntime.js"
import * as Debug from "../src/debug/DebugSink.js"
import * as Lifecycle from "../src/runtime/Lifecycle.js"

describe("ModuleRuntime", () => {
  it("should report logic errors to DebugSink", async () => {
    const events: Debug.DebugEvent[] = []
    const sinkLayer = Layer.succeed(Debug.DebugSinkTag, {
      record: (event: Debug.DebugEvent) =>
        Effect.sync(() => {
          events.push(event)
        }),
    })

    const TestModule = Logix.Module("ErrorModule", {
      state: Schema.Struct({ count: Schema.Number }),
      actions: { triggerError: Schema.Void },
    })

    // Logic that throws a defect (not just a failure, but here we test failure first)
    // Actually ModuleRuntime catches AllCause, so both fail and die are caught.
    const faultyLogic = Effect.fail("Boom")

    const program = Effect.gen(function* (_) {
      // We manually create ModuleRuntime with a faulty logic
      // We need to provide the Module Tag for the logic to be injected if it needs it.
      // But here the logic is just Effect.fail.

      // However, ModuleRuntime.make expects logics to be Effects that use the Runtime.
      // And it forks them.

      const runtime = yield* ModuleRuntime.make(
        { count: 0 },
        {
          moduleId: "test-module",
          logics: [faultyLogic],
          tag: TestModule // passing tag so it tries to provide service, though logic doesn't use it
        }
      )

      // Wait for the forked logic to fail and report
      // Since it's forked, we need to yield to let it run.
      yield* Effect.sleep(10)
    }).pipe(
      Effect.provide(sinkLayer)
    )

    // We expect the program to succeed (it just creates runtime),
    // but the background fiber fails.
    // However, ModuleRuntime.make forks the logic.
    // The error is caught in the fork and reported to Lifecycle -> DebugSink.
    // It does NOT propagate to the main fiber unless we join it (which we don't).

    await Effect.runPromise(Effect.scoped(program))

    const errorEvent = events.find(e => e.type === "lifecycle:error")
    expect(errorEvent).toBeDefined()
    expect(errorEvent?.moduleId).toBe("test-module")
    // Cause is wrapped, so we might check if it contains "Boom"
    // But for now just checking existence is enough for the path coverage.
  })
})
