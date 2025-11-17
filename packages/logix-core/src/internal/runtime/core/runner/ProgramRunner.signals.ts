import { Effect, Exit, Scope } from 'effect'

const getProcess = (): any => (globalThis as any).process

const isNodeProcess = (
  value: unknown,
): value is {
  on: (event: string, handler: () => void) => void
  off?: (event: string, handler: () => void) => void
  removeListener?: (event: string, handler: () => void) => void
} => typeof value === 'object' && value !== null && typeof (value as any).on === 'function'

const removeListener = (proc: any, event: string, handler: () => void): void => {
  if (typeof proc.off === 'function') {
    proc.off(event, handler)
    return
  }
  if (typeof proc.removeListener === 'function') {
    proc.removeListener(event, handler)
  }
}

export const installGracefulShutdownHandlers = (params: {
  readonly scope: Scope.CloseableScope
  readonly enabled: boolean
}): Effect.Effect<void> => {
  if (!params.enabled) {
    return Effect.void
  }

  const proc = getProcess()
  if (!isNodeProcess(proc)) {
    return Effect.void
  }

  const handler = (): void => {
    void Effect.runPromise(Scope.close(params.scope, Exit.void))
  }

  return Effect.gen(function* () {
    yield* Scope.addFinalizer(
      params.scope,
      Effect.sync(() => {
        removeListener(proc, 'SIGINT', handler)
        removeListener(proc, 'SIGTERM', handler)
      }),
    )

    yield* Effect.sync(() => {
      proc.on('SIGINT', handler)
      proc.on('SIGTERM', handler)
    })
  })
}
