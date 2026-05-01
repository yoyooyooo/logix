import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
/**
 * @scenario Runtime readiness · gate + run effect + Scope cleanup + Runtime.onError
 * @description
 *   这个场景用于验证 public authoring 的 readiness / run / cleanup / error owner lanes：
 *   - readyAfter 会阻塞实例可用性
 *   - returned run effect 在 ready 后执行，不阻塞可用性
 *   - Effect Scope finalizer 在 runtime dispose 时释放资源
 *   - Runtime.onError 观察未处理失败
 *
 * 运行：
 *   pnpm -C examples/logix exec tsx src/scenarios/lifecycle-gate.ts
 */

import { Cause, Console, Effect, Schema } from 'effect'
import { fileURLToPath } from 'node:url'
import * as Logix from '@logixjs/core'

const DemoState = Schema.Struct({
  ready: Schema.Boolean,
  booted: Schema.Boolean,
})

const DemoActions = {
  boot: Schema.Void,
}

const Demo = Logix.Module.make('LifecycleGateDemo', {
  state: DemoState,
  actions: DemoActions,
})

const DemoLogic = Demo.logic('demo-logic', ($) => {
  $.readyAfter(
    Console.log('[Demo] initRequired:start').pipe(
      Effect.flatMap(() => Effect.sleep('120 millis')),
      Effect.flatMap(() => Console.log('[Demo] initRequired:done')),
      Effect.flatMap(() => $.state.update((s) => ({ ...s, ready: true }))),
    ),
    { id: 'init-required' },
  )

  return Effect.scoped(
    Effect.gen(function* () {
      yield* Effect.acquireRelease(
        Console.log('[Demo] acquire scoped resource'),
        () => Console.log('[Demo] release scoped resource'),
      )
      yield* $.onAction('boot').run($.state.update((s) => ({ ...s, booted: true })))
      yield* Effect.never
    }),
  )
})

const DemoFailureLogic = Demo.logic('demo-failure-logic', () => {
  return Console.log('[Demo] run:begin').pipe(
    Effect.flatMap(() => Effect.sleep('50 millis')),
    Effect.flatMap(() => Effect.die(new Error('Boom in returned run effect'))),
  )
})

const DemoProgram = Logix.Program.make(Demo, {
  initial: { ready: false, booted: false },
  logics: [DemoLogic, DemoFailureLogic],
})

const silentDebugSink: CoreDebug.Sink = { record: () => Effect.void }
const runtime = Logix.Runtime.make(DemoProgram, {
  onError: (cause) => Console.error('[Demo Runtime.onError]', Cause.pretty(cause)),
})

export const main = Effect.scoped(
  Effect.provideService(
    Effect.gen(function* () {
      const startedAt = Date.now()
      yield* Console.log('[App] building module runtime (initRequired will block)...')

      const demo = yield* Effect.service(Demo.tag).pipe(Effect.orDie)

      yield* Console.log(`[App] built after ${Date.now() - startedAt}ms`, {
        moduleId: demo.moduleId,
        instanceId: demo.instanceId,
      })

      yield* demo.dispatch({ _tag: 'boot', payload: undefined } as any)
      // 给 watcher 一次调度机会，确保 state 变更已落地（避免读到旧快照）
      yield* Effect.yieldNow
      const state = yield* demo.getState
      yield* Console.log('[App] state after boot', state)

      // 给 returned run effect / Runtime.onError 留时间输出日志
      yield* Effect.sleep('200 millis')
    }),
    CoreDebug.internal.currentDebugSinks,
    [silentDebugSink],
  ),
)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void runtime.runPromise(main as any).finally(() => runtime.dispose())
}
