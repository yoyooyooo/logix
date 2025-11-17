/**
 * @scenario Lifecycle · init gate + start task + destroy + onError
 * @description
 *   这个场景用于验证 011 生命周期升级的关键语义：
 *   - initRequired（必需初始化）会阻塞实例可用性（init gate）
 *   - start（启动任务）在 ready 后调度执行，不阻塞可用性；失败会进入错误兜底链路
 *   - destroy（销毁）按 LIFO best-effort 执行
 *   - onError（错误兜底）能拿到 phase/hook/taskId 等上下文
 *
 * 运行：
 *   pnpm -C examples/logix exec tsx src/scenarios/lifecycle-gate.ts
 */

import { Cause, Console, Context, Effect, Layer, Schema } from 'effect'
import { fileURLToPath } from 'node:url'
import * as Logix from '@logix/core'

const DemoState = Schema.Struct({
  ready: Schema.Boolean,
  booted: Schema.Boolean,
})

const DemoActions = {
  boot: Schema.Void,
}

const DemoDef = Logix.Module.make('LifecycleGateDemo', {
  state: DemoState,
  actions: DemoActions,
})

const DemoLogic = DemoDef.logic(($) => ({
  setup: Effect.sync(() => {
    $.lifecycle.onError((cause, ctx) =>
      Console.error('[Demo.onError]', {
        phase: ctx.phase,
        hook: ctx.hook,
        taskId: ctx.taskId,
        moduleId: ctx.moduleId,
        instanceId: ctx.instanceId,
        cause: Cause.pretty(cause),
      }),
    )

    // initRequired：blocking gate（yield* Demo 会等它完成）
    $.lifecycle.onInitRequired(
      Console.log('[Demo] initRequired:start').pipe(
        Effect.zipRight(Effect.sleep('120 millis')),
        Effect.zipRight(Console.log('[Demo] initRequired:done')),
        Effect.zipRight($.state.update((s) => ({ ...s, ready: true }))),
      ),
    )

    // start：non-blocking（ready 后 fork 执行；失败会进入同一条错误兜底链路）
    $.lifecycle.onStart(
      Console.log('[Demo] start:begin').pipe(
        Effect.zipRight(Effect.sleep('50 millis')),
        Effect.zipRight(Effect.dieMessage('Boom in start task')),
      ),
    )

    // destroy：LIFO
    $.lifecycle.onDestroy(Console.log('[Demo] destroy#1'))
    $.lifecycle.onDestroy(Console.log('[Demo] destroy#2'))
  }),
  run: Effect.gen(function* () {
    yield* $.onAction('boot').run($.state.update((s) => ({ ...s, booted: true })))
  }),
}))

const DemoModule = DemoDef.implement({
  initial: { ready: false, booted: false },
  logics: [DemoLogic],
})

const silentDebugSink: Logix.Debug.Sink = { record: () => Effect.void }
const DemoImpl = DemoModule.impl

export const main = Effect.scoped(
  Effect.locally(Logix.Debug.internal.currentDebugSinks, [silentDebugSink])(
    Effect.gen(function* () {
      const startedAt = Date.now()
      yield* Console.log('[App] building module runtime (initRequired will block)...')

      const ctx = yield* Layer.build(DemoImpl.layer)
      const demo = Context.get(ctx, DemoDef.tag)

      yield* Console.log(`[App] built after ${Date.now() - startedAt}ms`, {
        moduleId: demo.moduleId,
        instanceId: demo.instanceId,
      })

      yield* demo.dispatch({ _tag: 'boot', payload: undefined } as any)
      // 给 watcher 一次调度机会，确保 state 变更已落地（避免读到旧快照）
      yield* Effect.yieldNow()
      const state = yield* demo.getState
      yield* Console.log('[App] state after boot', state)

      // 给 start task / onError 留时间输出日志
      yield* Effect.sleep('200 millis')
    }),
  ),
)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void Effect.runPromise(main as any)
}
