import { Cause, Effect, Exit, Fiber, Option, Scope } from 'effect'
import { getGlobalHostScheduler } from '../HostScheduler.js'
import { HostSchedulerTag } from '../env.js'
import { DisposeError, DisposeTimeoutError, type ProgramIdentity } from './ProgramRunner.errors.js'

export const closeProgramScope = (params: {
  readonly scope: Scope.CloseableScope
  readonly timeoutMs: number
  readonly identity: ProgramIdentity
  readonly onError?: (cause: Cause.Cause<unknown>) => Effect.Effect<void, never, never>
}): Effect.Effect<void, never, never> => {
  return Effect.gen(function* () {
    const start = Date.now()
    const hostSchedulerOpt = yield* Effect.serviceOption(HostSchedulerTag)
    const hostScheduler = Option.isSome(hostSchedulerOpt) ? hostSchedulerOpt.value : getGlobalHostScheduler()
    const yieldMicrotask = Effect.async<void, never>((resume) => {
      hostScheduler.scheduleMicrotask(() => resume(Effect.void))
    })

    const fiber = yield* Effect.forkDaemon(Scope.close(params.scope, Exit.void))

    while (true) {
      const exitOpt = yield* Fiber.poll(fiber)
      if (Option.isSome(exitOpt)) {
        const exit = exitOpt.value
        if (exit._tag === 'Success') {
          return
        }
        return yield* Effect.die(new DisposeError(params.identity, exit.cause))
      }

      const elapsedMs = Date.now() - start
      if (elapsedMs >= params.timeoutMs) {
        const error = new DisposeTimeoutError(params.identity, {
          timeoutMs: params.timeoutMs,
          elapsedMs,
        })

        if (typeof params.onError === 'function') {
          yield* params.onError(Cause.die(error)).pipe(Effect.catchAllCause(() => Effect.void))
        }

        yield* Fiber.interruptFork(fiber)
        return yield* Effect.die(error)
      }

      // NOTE: Use a microtask yield (not TestClock-based) to avoid being blocked by TestClock,
      // while keeping the "successful close" fast path cheap (perf-critical for tight loops).
      yield* yieldMicrotask
    }
  })
}
