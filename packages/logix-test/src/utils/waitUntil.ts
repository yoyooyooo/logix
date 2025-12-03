import { Effect, TestClock, Duration } from "effect"

export interface WaitUntilOptions {
  readonly maxAttempts?: number
  readonly step?: Duration.DurationInput
}

/**
 * 在 TestContext 下通过推进 TestClock + 让出调度来反复执行断言，
 * 直到通过或达到最大重试次数。
 */
export const waitUntil = <A, E, R>(
  check: Effect.Effect<A, E, R>,
  options: WaitUntilOptions = {}
): Effect.Effect<A, E, R | TestClock.TestClock> =>
  Effect.gen(function* () {
    const maxAttempts = options.maxAttempts ?? 20
    const step = options.step ?? ("10 millis" as Duration.DurationInput)

    let lastError: unknown

    for (let i = 0; i < maxAttempts; i++) {
      const result = yield* check.pipe(Effect.exit)
      if (result._tag === "Success") {
        return result.value
      }

      lastError = result.cause
      // 推进测试时钟并让出一次调度，给订阅 / 异步逻辑机会完成
      yield* TestClock.adjust(step)
      yield* Effect.yieldNow()
    }

    // 如果一直失败，则抛出最后一次的错误原因
    // 这里保持与调用方原本 `Effect.fail(lastError)` 的语义一致
    // (lastError 实际上是 Cause<E>，交由上层处理)
    return yield* Effect.fail(lastError as any)
  })

