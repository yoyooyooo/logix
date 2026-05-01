import { Cause, Effect, Exit, Fiber } from 'effect'
import type { SerializableErrorSummary } from '../runtime/core/errorSummary.js'
import { toSerializableErrorSummary } from '../runtime/core/errorSummary.js'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const toErrorSummaryWithCode = (cause: unknown, code: string, hint?: string): SerializableErrorSummary => {
  const base = toSerializableErrorSummary(cause).errorSummary
  return {
    name: base.name,
    message: base.message,
    code,
    hint: hint ?? base.hint,
  }
}

export const makeTrialRunTimeoutError = (): Error =>
  Object.assign(new Error('[Logix] trialRunModule timed out'), {
    name: 'TrialRunTimeoutError',
  })

export const awaitFiberExitWithTimeout = <A, E>(
  fiber: Fiber.Fiber<A, E>,
  timeoutMs: number | undefined,
): Effect.Effect<Exit.Exit<A, E | Error>, never, never> =>
  Effect.gen(function* () {
    const hasTimeout = typeof timeoutMs === 'number' && Number.isFinite(timeoutMs) && timeoutMs > 0
    if (!hasTimeout) {
      return (yield* Fiber.await(fiber)) as Exit.Exit<A, E | Error>
    }

    const raced = yield* Effect.promise<Exit.Exit<A, E | Error> | { readonly _tag: 'Timeout' }>(() =>
      new Promise((resolve) => {
        const timer = setTimeout(() => resolve({ _tag: 'Timeout' as const }), timeoutMs)
        void Effect.runPromise(Fiber.await(fiber)).then((exit) => {
          clearTimeout(timer)
          resolve(exit as Exit.Exit<A, E | Error>)
        })
      }),
    )

    if ((raced as any)._tag !== 'Timeout') {
      return raced as Exit.Exit<A, E | Error>
    }

    yield* Fiber.interrupt(fiber).pipe(Effect.asVoid, Effect.forkDetach({ startImmediately: true }))
    return Exit.fail(makeTrialRunTimeoutError())
  })

export const isTimeoutLikeError = (value: unknown): boolean =>
  isRecord(value) && ((value as any).name === 'TrialRunTimeoutError' || (value as any)._tag === 'TrialRunTimeout')

export const toCloseErrorSummary = (base: unknown): SerializableErrorSummary => {
  const tag = isRecord(base) ? (base as any)._tag : undefined
  if (tag === 'DisposeTimeout') {
    return toErrorSummaryWithCode(
      base,
      'DisposeTimeout',
      'Dispose timed out: check for unclosed resource handles, fibers not interrupted, or event listeners not unregistered.',
    )
  }
  return toErrorSummaryWithCode(base, 'RuntimeFailure')
}
