import { Effect, Context, Equal } from 'effect'
import type * as Logix from '@logix/core'

export const assertState = <Sh extends Logix.AnyModuleShape>(
  actual: Logix.StateOf<Sh>,
  predicate: (s: Logix.StateOf<Sh>) => boolean,
  message?: string,
): Effect.Effect<void, Error> => {
  return Effect.suspend(() => {
    if (predicate(actual)) {
      return Effect.void
    }
    return Effect.fail(new Error(message || `State assertion failed. Actual: ${JSON.stringify(actual)}`))
  })
}

export const assertSignal = (
  actual: unknown,
  expectedType: string,
  expectedPayload?: unknown,
): Effect.Effect<void, Error> => {
  return Effect.suspend(() => {
    const candidate = actual as { _tag?: unknown; payload?: unknown } | null
    if (
      candidate &&
      typeof candidate === 'object' &&
      typeof candidate._tag === 'string' &&
      candidate._tag === expectedType
    ) {
      if (expectedPayload !== undefined) {
        if (Equal.equals(candidate.payload, expectedPayload)) {
          return Effect.void
        }
        return Effect.fail(
          new Error(
            `Signal payload mismatch. Expected: ${JSON.stringify(expectedPayload)}, Actual: ${JSON.stringify(
              candidate.payload,
            )}`,
          ),
        )
      }
      return Effect.void
    }
    return Effect.fail(
      new Error(`Signal assertion failed. Expected type: ${expectedType}, Actual: ${JSON.stringify(actual)}`),
    )
  })
}
