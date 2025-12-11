import { describe } from "vitest"
import { it, expect } from "@effect/vitest"
import { Cause, Effect } from "effect"
import * as LifecycleCore from "../src/internal/runtime/core/Lifecycle.js"

describe("LifecycleManager (internal core)", () => {
  it.effect("should run registered destroy effects and log failures", () =>
    Effect.gen(function* () {
      const manager = yield* LifecycleCore.makeLifecycleManager

      const executed: string[] = []

      yield* manager.registerDestroy(
        Effect.sync(() => {
          executed.push("ok")
        }),
      )

      // 失败的 destroy effect 不会中断后续执行，但会通过 safeRun 记录日志
      yield* manager.registerDestroy(
        Effect.die(new Error("destroy failed")),
      )

      yield* manager.runDestroy

      expect(executed).toEqual(["ok"])
    }),
  )

  it.effect("should notify error handlers and swallow their failures", () =>
    Effect.gen(function* () {
      const manager = yield* LifecycleCore.makeLifecycleManager

      const phases: string[] = []

      yield* manager.registerOnError((_cause, context) =>
        Effect.gen(function* () {
          phases.push(context.phase)

          // handler 中抛出的错误会被 notifyError 捕获并记录日志，而不会向上传播
          yield* Effect.die(new Error("handler failed"))

          // 防止编译器推断出 unreachable
          return yield* Effect.void
        }),
      )

      const cause = Cause.die(new Error("outer error"))
      yield* manager.notifyError(cause, { phase: "test-phase" })

      expect(phases).toEqual(["test-phase"])
    }),
  )
})
