import { Cause, Effect, Exit, Scope } from 'effect'
import { DisposeError, DisposeTimeoutError, type ProgramIdentity } from './ProgramRunner.errors.js'

export const closeProgramScope = (params: {
  readonly scope: Scope.Closeable
  readonly timeoutMs: number
  readonly identity: ProgramIdentity
  readonly onError?: (cause: Cause.Cause<unknown>) => Effect.Effect<void, never, never>
}): Effect.Effect<void, never, never> => {
  return Effect.gen(function* () {
    const start = Date.now()

    const result = yield* Effect.promise<Exit.Exit<void, never> | { readonly _tag: 'Timeout' }>(() =>
      new Promise((resolve) => {
        const timer = setTimeout(() => resolve({ _tag: 'Timeout' as const }), params.timeoutMs)
        void Effect.runPromiseExit(Scope.close(params.scope, Exit.void)).then((exit) => {
          clearTimeout(timer)
          resolve(exit)
        })
      }),
    )

    if ((result as any)._tag === 'Timeout') {
      const error = new DisposeTimeoutError(params.identity, {
        timeoutMs: params.timeoutMs,
        elapsedMs: Date.now() - start,
      })

      if (typeof params.onError === 'function') {
        yield* params.onError(Cause.die(error)).pipe(Effect.catchCause(() => Effect.void))
      }

      return yield* Effect.die(error)
    }

    const exit = result as Exit.Exit<void, never>
    if (Exit.isSuccess(exit)) {
      return
    }

    return yield* Effect.die(new DisposeError(params.identity, exit.cause))
  })
}
