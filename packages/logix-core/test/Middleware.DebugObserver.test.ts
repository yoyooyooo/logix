import { describe, it, expect } from "@effect/vitest"
import { Effect } from "effect"
import * as Logix from "../src/index.js"
import * as EffectOp from "../src/effectop.js"
import * as Middleware from "../src/middleware/index.js"

describe("Middleware.DebugObserver", () => {
  it("should emit trace:effectop Debug events with original EffectOp data for all core kinds", async () => {
    const events: Array<Logix.Debug.Event> = []

    const sink: Logix.Debug.Sink = {
      record: (event: Logix.Debug.Event) =>
        Effect.sync(() => {
          events.push(event)
        }),
    }

    const stack: Middleware.MiddlewareStack = [
      Middleware.makeDebugObserver(),
    ]

    const kinds: Array<EffectOp.EffectOp["kind"]> = [
      "action",
      "flow",
      "state",
      "service",
      "lifecycle",
    ]

    const ops = kinds.map((kind) =>
      EffectOp.make<number, never, never>({
        kind,
        name: `debug-observer-${kind}`,
        effect: Effect.succeed(42),
        meta: {
          moduleId: "DebugObserverModule",
        },
      }),
    )

    const program = Effect.locally(
      Logix.Debug.internal.currentDebugSinks as any,
      [sink],
    )(
      Effect.forEach(
        ops,
        (op) => EffectOp.run(op, stack) as Effect.Effect<number, never, never>,
        { discard: true },
      ),
    )

    await Effect.runPromise(program)

    const traceEvents = events.filter(
      (e) => typeof e.type === "string" && e.type.startsWith("trace:effectop"),
    )

    expect(traceEvents.length).toBeGreaterThanOrEqual(kinds.length)
    const last = traceEvents[traceEvents.length - 1] as any
    expect(last.moduleId).toBe("DebugObserverModule")
    expect(last.data).toBeDefined()
    expect(last.data.kind).toBeDefined()
    // 确认所有核心 kind 均被 DebugObserver 观测并透传到 Debug 事件中。
    const seenKinds = traceEvents
      .map((e) => (e as any).data?.kind)
      .filter((k: unknown): k is string => typeof k === "string")
    kinds.forEach((k) => {
      expect(seenKinds).toContain(k)
    })
  })
})
