import { describe, expect } from 'vitest'
import { it } from '@effect/vitest'
import { Effect, Either, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Runtime.runProgram dispose timeout (US1)', () => {
  it.scoped('closeScopeTimeout produces DisposeTimeout and triggers onError warning', () =>
    Effect.gen(function* () {
      let onErrorCalls = 0

      const Root = Logix.Module.make('Runtime.runProgram.disposeTimeout', {
        state: Schema.Void,
        actions: {},
      })
      const impl = Root.implement({ initial: undefined, logics: [] })

      const hangingFinalizerLayer = Layer.scopedDiscard(
        // 模拟“finalizer 卡住但最终会结束”，避免测试进程永久悬挂。
        Effect.addFinalizer(() => Effect.sleep('50 millis')),
      ) as unknown as Layer.Layer<any, never, never>

      const outcome = yield* Effect.tryPromise({
        try: () =>
          Logix.Runtime.runProgram(impl, () => Effect.void, {
            layer: hangingFinalizerLayer,
            closeScopeTimeout: 10,
            handleSignals: false,
            onError: () =>
              Effect.sync(() => {
                onErrorCalls += 1
              }),
          }),
        catch: (e) => e,
      }).pipe(Effect.either)

      expect(Either.isLeft(outcome)).toBe(true)
      if (Either.isLeft(outcome)) {
        const e: any = outcome.left
        expect(e?._tag).toBe('DisposeTimeout')
      }

      expect(onErrorCalls).toBeGreaterThan(0)

      // 等待实际 finalizer 自然结束，避免 vitest 的 open handles 影响后续用例。
      yield* Effect.promise(() => new Promise((r) => setTimeout(r, 80)))
    }),
  )
})
