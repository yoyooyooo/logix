/**
 * @scenario EffectOp Middleware · Runtime 集成
 *
 * 演示如何在 Runtime.make 中配置 EffectOp MiddlewareStack：
 * - 为 ModuleRuntime 的 lifecycle / action / state 事件挂上统一的 EffectOp 日志中间件；
 * - 通过 dispatch / getState 观察 EffectOp 流经中间件时的输出。
 */

import { Effect, Layer, Schema } from 'effect'
import { fileURLToPath } from 'node:url'
import * as Logix from '@logixjs/core'
import * as Middleware from '@logixjs/core/Middleware'

const CounterState = Schema.Struct({
  count: Schema.Number,
})

const CounterActions = {
  inc: Schema.Void,
}

const CounterDef = Logix.Module.make('MiddlewareCounter', {
  state: CounterState,
  actions: CounterActions,
})

const CounterLogic = CounterDef.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction('inc').update((s) => ({
      ...s,
      count: s.count + 1,
    }))
  }),
)

const CounterModule = CounterDef.implement({
  initial: { count: 0 },
  logics: [CounterLogic],
})

// 使用 withDebug 组合 DebugLogger + DebugObserver，观察生命周期 / Action / State 事件。
const effectOpStack: Middleware.MiddlewareStack = Middleware.withDebug([], {
  logger: (op) => {
    // eslint-disable-next-line no-console
    console.log('[EffectOp]', `kind=${op.kind}`, `name=${op.name}`, `module=${op.meta?.moduleId ?? '-'}`)
  },
  observer: {}, // 使用默认观察配置，将 EffectOp 流桥接到 DebugSink（如有配置）
})

const runtime = Logix.Runtime.make(CounterModule, {
  layer: Layer.empty as Layer.Layer<any, never, never>,
  middleware: effectOpStack,
})

export const main = Effect.gen(function* () {
  const program = Effect.gen(function* () {
    const rt = yield* CounterDef.tag

    // 初始状态
    // eslint-disable-next-line no-console
    console.log('Initial state:', yield* rt.getState)

    // 触发一次 inc，会经过：
    // - Action 派发 EffectOp（kind="action"）；
    // - Reducer 更新 State 后的 state:update EffectOp（kind="state"）。
    yield* rt.dispatch({ _tag: 'inc', payload: undefined })
    yield* Effect.sleep('10 millis')

    // eslint-disable-next-line no-console
    console.log('After inc:', yield* rt.getState)
  }) as Effect.Effect<void, never, any>

  // 通过 ManagedRuntime 运行程序并在结束后释放资源
  yield* Effect.promise(() => runtime.runPromise(program))
  yield* Effect.promise(() => runtime.dispose())
})

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void Effect.runPromise(main)
}
