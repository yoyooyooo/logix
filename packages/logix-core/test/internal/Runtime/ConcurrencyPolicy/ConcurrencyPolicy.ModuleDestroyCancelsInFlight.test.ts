import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Deferred, Effect, Exit, PubSub, Queue, Scope } from 'effect'
import * as ModuleRuntime from '../../../../src/internal/runtime/ModuleRuntime.js'

describe('ConcurrencyPolicy (US1): ModuleRuntime.destroy should cancel in-flight fibers', () => {
  it('closing the runtime scope should interrupt in-flight action handlers', async () => {
    const program = Effect.gen(function* () {
      const scope = yield* Scope.make()

      const started = yield* Deferred.make<void>()
      const interrupted = yield* Deferred.make<void>()

      const actionHub = yield* PubSub.unbounded<any>()
      const runtime = yield* Scope.extend(
        ModuleRuntime.make(
          { count: 0 } as any,
          {
            moduleId: 'DestroyCancelsInFlight',
            createActionHub: Effect.succeed(actionHub),
          } as any,
        ),
        scope,
      )

      // 在 scope 内启动一个“长任务”处理器：确保 destroy 时会被 interrupt。
      yield* Scope.extend(
        Effect.forkScoped(
          Effect.gen(function* () {
            const subscription = yield* PubSub.subscribe(actionHub)
            const action = yield* Queue.take(subscription)
            expect((action as any)?._tag).toBe('inc')

            yield* Deferred.succeed(started, undefined)

            // 长耗时：依赖 interrupt 收敛
            yield* Effect.sleep('30 seconds')
          }).pipe(Effect.onInterrupt(() => Deferred.succeed(interrupted, undefined).pipe(Effect.asVoid))),
        ),
        scope,
      )

      // 触发一次 handler 开始执行
      yield* runtime.dispatch({ _tag: 'inc', payload: undefined } as any)
      yield* Deferred.await(started)

      // destroy：关闭 scope 并等待 handler 收到 interrupt
      yield* Scope.close(scope, Exit.succeed(undefined))
      yield* Deferred.await(interrupted)
    })

    await Effect.runPromise(program as any)
  })
})
