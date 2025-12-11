import { describe } from "vitest"
import { it, expect } from "@effect/vitest"
import { Effect, Layer, Schema } from "effect"
import * as Logix from "../src/index.js"

describe("Debug trace events", () => {
  it("should route trace:* Debug events to a DebugSink provided via FiberRef", async () => {
    const events: Logix.Debug.Event[] = []

    const sink: Logix.Debug.Sink = {
      record: (event: Logix.Debug.Event) =>
        Effect.sync(() => {
          events.push(event)
        }),
    }

    await Effect.runPromise(
      Effect.locally(
        Logix.Debug.internal.currentDebugSinks as any,
        [sink],
      )(
        Logix.Debug.record({
          type: "trace:inc",
          moduleId: "DebugTraceCounter",
          data: { source: "DebugTraceRuntime.test" },
        }),
      ),
    )

    // 验证 trace:* 事件确实通过 DebugSink 传递到了调用方
    const traceEvents = events.filter(
      (e) => typeof e.type === "string" && e.type.startsWith("trace:"),
    )
    expect(traceEvents.length).toBeGreaterThanOrEqual(1)
    expect(
      traceEvents.some(
        (e) => e.type === "trace:inc" && (e as any).moduleId === "DebugTraceCounter",
      ),
    ).toBe(true)
  })
})
