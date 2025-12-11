/**
 * @scenario EffectOp Middleware · 基本用法
 *
 * 演示如何直接使用 EffectOp + MiddlewareStack：
 * - 通过 EffectOp.make 包装一段 Effect；
 * - 组合 TimingMiddleware + DebugLogger 中间件；
 * - 使用 EffectOp.run 按组合顺序执行，并在控制台观察日志。
 */

import { Effect } from "effect"
import { fileURLToPath } from "node:url"
import * as EffectOp from "@logix/core/effectop"
import * as Middleware from "@logix/core/middleware"

// 一个简单的计时中间件：在 Effect 执行前后打印耗时
const timingMiddleware: Middleware.Middleware = (op) =>
  Effect.gen(function* () {
    const start = Date.now()
    // eslint-disable-next-line no-console
    console.log(
      "[Timing] start",
      `kind=${op.kind}`,
      `name=${op.name}`,
    )

    const result = yield* op.effect

    const duration = Date.now() - start
    // eslint-disable-next-line no-console
    console.log(
      "[Timing] done",
      `kind=${op.kind}`,
      `name=${op.name}`,
      `(${duration}ms)`,
    )

    return result
  })

// 使用内置 DebugLogger 追加一条简单日志
const stack: Middleware.MiddlewareStack = Middleware.applyDebug(
  [timingMiddleware],
  {
    logger: (op) => {
      // eslint-disable-next-line no-console
      console.log(
        "[DebugLogger]",
        `kind=${op.kind}`,
        `name=${op.name}`,
        `module=${op.meta?.moduleId ?? "-"}`,
      )
    },
  },
)

export const main = Effect.gen(function* () {
  const baseEffect = Effect.gen(function* () {
    // eslint-disable-next-line no-console
    console.log("[Effect] running body...")
    yield* Effect.sleep("20 millis")
    return "OK"
  })

  const op = EffectOp.make<string, never, never>({
    kind: "service",
    name: "demo/op",
    effect: baseEffect,
    meta: {
      moduleId: "MiddlewareDemo",
      resourceId: "demo/service",
      key: { id: "u1" },
    },
  })

  const result = yield* EffectOp.run(op, stack)

  // eslint-disable-next-line no-console
  console.log("[Result]", result)
})

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void Effect.runPromise(main)
}

