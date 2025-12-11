import { describe, it, expect } from "@effect/vitest"
import { Effect } from "effect"
import * as EffectOp from "../src/effectop.js"
import * as Middleware from "../src/middleware/index.js"

describe("Middleware.DebugLogger", () => {
  it("applyDebug should append a debug middleware and log EffectOp", async () => {
    const seen: Array<EffectOp.EffectOp<any, any, any>> = []

    const stack = Middleware.applyDebug([], {
      logger: (op) => {
        seen.push(op)
      },
    })

    const op = EffectOp.make({
      kind: "state",
      name: "debug-test",
      effect: Effect.succeed(42),
    })

    const result = await Effect.runPromise(
      EffectOp.run(op, stack) as Effect.Effect<number, never, never>,
    )

    expect(result).toBe(42)
    expect(seen).toHaveLength(1)
    expect(seen[0]?.name).toBe("debug-test")
    expect(seen[0]?.kind).toBe("state")
  })
})

