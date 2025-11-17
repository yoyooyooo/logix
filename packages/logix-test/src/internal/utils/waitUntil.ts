import { Effect, TestClock, Duration } from 'effect'

export interface WaitUntilOptions {
  readonly maxAttempts?: number
  readonly step?: Duration.DurationInput
}

/**
 * Repeatedly runs an assertion under TestContext by advancing TestClock and yielding the scheduler,
 * until it passes or reaches the max attempt count.
 */
export const waitUntil = <A, E, R>(
  check: Effect.Effect<A, E, R>,
  options: WaitUntilOptions = {},
): Effect.Effect<A, E, R | TestClock.TestClock> =>
  Effect.gen(function* () {
    const maxAttempts = options.maxAttempts ?? 20
    const step = options.step ?? ('10 millis' as Duration.DurationInput)

    let lastError: unknown

    for (let i = 0; i < maxAttempts; i++) {
      const result = yield* check.pipe(Effect.exit)
      if (result._tag === 'Success') {
        return result.value
      }

      lastError = result.cause
      // Advance the test clock and yield once to let subscriptions/async logic make progress.
      yield* TestClock.adjust(step)
      yield* Effect.yieldNow()
    }

    // If it keeps failing, throw the last error cause.
    // Keep semantics aligned with `Effect.fail(lastError)`.
    // (lastError is actually Cause<E>; it is handled by the caller.)
    return yield* Effect.fail(lastError as any)
  })
