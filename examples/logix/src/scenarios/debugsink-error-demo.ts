/**
 * @scenario DebugSink · Logic 错误观测示例
 * @description
 *   演示如何通过 DebugSink 观测 Module 逻辑中的错误：
 *     - 自定义 DebugSink，将事件打印到控制台；
 *     - 构造一个会失败的 Logic，触发 lifecycle:error 事件；
 *     - 使用 ModuleImpl.layer + Effect.provide 将 DebugSink 注入运行时。
 */

import { Effect, Schema } from 'effect'
import { fileURLToPath } from 'node:url'
import * as Logix from '@logixjs/core'

// ---------------------------------------------------------------------------
// Module：简单计数模块，带一个会触发错误的 Action
// ---------------------------------------------------------------------------

const ErrorStateSchema = Schema.Struct({
  count: Schema.Number,
})

const ErrorActionMap = {
  triggerError: Schema.Void,
}

export const ErrorDef = Logix.Module.make('DebugDemoModule', {
  state: ErrorStateSchema,
  actions: ErrorActionMap,
})

// Logic：监听 triggerError，并返回一个失败的 Effect
export const ErrorLogic = ErrorDef.logic(($) =>
  Effect.gen(function* () {
    // 在 run 段监听 triggerError，避免 setup 阶段触发 Phase Guard
    yield* $.onAction('triggerError').run(() =>
      // 使用 dieMessage 将错误作为 defect 抛出，错误通道仍为 never，
      // 由 ModuleRuntime 捕获后通过 DebugSink 以 lifecycle:error 上报。
      Effect.dieMessage('Boom from DebugDemoModule'),
    )
  }),
)

export const ErrorModule = ErrorDef.implement({
  initial: { count: 0 },
  logics: [ErrorLogic],
})
export const ErrorImpl = ErrorModule.impl

// ---------------------------------------------------------------------------
// DebugSink 实现：把所有 Debug.Event 打印到控制台
// ---------------------------------------------------------------------------

const consoleDebugSink: Logix.Debug.Sink = {
  record: (event: Logix.Debug.Event) =>
    Effect.sync(() => {
      // 这里只做简单打印，真实应用可以写入文件或上报到监控系统。
      // eslint-disable-next-line no-console
      console.log('[DebugSink]', JSON.stringify(event))
    }),
}

// ---------------------------------------------------------------------------
// Demo：运行逻辑并触发错误，观察 DebugSink 输出
// ---------------------------------------------------------------------------

export const main = Effect.gen(function* () {
  const program = Effect.locally(Logix.Debug.internal.currentDebugSinks as any, [consoleDebugSink])(
    Effect.gen(function* () {
      const runtime = yield* ErrorDef.tag

      // 派发一个会失败的 Action（在 DebugSink 中观测 lifecycle:error）
      yield* runtime.dispatch({ _tag: 'triggerError', payload: undefined })

      // 等待后台 watcher 执行并上报错误
      yield* Effect.sleep(50)
    }).pipe(Effect.provide(ErrorImpl.layer)),
  ) as Effect.Effect<void, never, never>

  yield* program
})

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void Effect.runPromise(main)
}
