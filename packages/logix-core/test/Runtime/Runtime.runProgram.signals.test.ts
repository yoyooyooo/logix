import { describe, it, expect } from '@effect/vitest'
import { Duration, Effect, Layer, Option, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Runtime.runProgram signals (US1)', () => {
  it.effect('handleSignals triggers graceful shutdown and removes listeners', () =>
    Effect.gen(function* () {
      const proc: any = (globalThis as any).process
      if (!proc || typeof proc.emit !== 'function') {
        return
      }

      const beforeSigint = typeof proc.listenerCount === 'function' ? proc.listenerCount('SIGINT') : 0
      const beforeSigterm = typeof proc.listenerCount === 'function' ? proc.listenerCount('SIGTERM') : 0

      const Root = Logix.Module.make('Runtime.runProgram.signals', {
        state: Schema.Void,
        actions: {},
      })

      const impl = Root.implement({ initial: undefined, logics: [] })

      // Make boot take a little time so the signal can arrive before boot completes.
      const slowBootLayer = Layer.effectDiscard(Effect.sleep('30 millis')) as unknown as Layer.Layer<any, never, never>

      const p = Logix.Runtime.runProgram(impl, () => Effect.never, {
        layer: slowBootLayer,
        handleSignals: true,
        closeScopeTimeout: 100,
      })

      yield* Effect.sync(() => {
        setTimeout(() => {
          void proc.emit('SIGINT')
        }, 1)
      })

      const timeoutError = new Error('runProgram did not settle in time')

      yield* Effect.tryPromise({ try: () => p, catch: (e) => e }).pipe(
        Effect.timeoutOption(Duration.millis(2_000)),
        Effect.flatMap((maybe) => (Option.isSome(maybe) ? Effect.void : Effect.fail(timeoutError))),
        Effect.catch((e) => (e === timeoutError ? Effect.fail(e) : Effect.void)),
      )

      const afterSigint = typeof proc.listenerCount === 'function' ? proc.listenerCount('SIGINT') : 0
      const afterSigterm = typeof proc.listenerCount === 'function' ? proc.listenerCount('SIGTERM') : 0

      expect(afterSigint).toBe(beforeSigint)
      expect(afterSigterm).toBe(beforeSigterm)
    }),
  )
})
