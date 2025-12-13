import React from 'react'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logix/core'
import { RuntimeProvider, useModule, useSelector, useDispatch } from '@logix/react'
import * as Middleware from '@logix/core/middleware'

// ---------------------------------------------------------------------------
// 1. Module：最小计数器模块
// ---------------------------------------------------------------------------

const CounterState = Schema.Struct({
  count: Schema.Number,
})

const CounterActions = {
  inc: Schema.Void,
  dec: Schema.Void,
}

const MiddlewareCounterModule = Logix.Module.make('MiddlewareCounter', {
  state: CounterState,
  actions: CounterActions,
})

const MiddlewareCounterLogic = MiddlewareCounterModule.logic(($) =>
  Effect.gen(function* () {
    // Watcher 需要作为长期运行的 Effect 并行挂载，否则第一个 onAction 会阻塞后续逻辑。
    yield* Effect.all(
      [
        $.onAction('inc').update((s) => ({ ...s, count: s.count + 1 })),
        $.onAction('dec').update((s) => ({ ...s, count: s.count - 1 })),
      ],
      { concurrency: 'unbounded' },
    )
  }),
)

const MiddlewareCounterImpl = MiddlewareCounterModule.implement({
  initial: { count: 0 },
  logics: [MiddlewareCounterLogic],
})

// ---------------------------------------------------------------------------
// 2. EffectOp MiddlewareStack：DebugLogger + DebugObserver 预设
// ---------------------------------------------------------------------------

const effectOpStack = Middleware.withDebug([], {
  logger: (op) => {
    // 这里故意用 console 打印，方便在 DevTools 之外观察 EffectOp 流；
    // 真正的 DevTools 时间线会通过 DebugObserver -> DebugSink -> LogixDevtools 统一展示。
    // eslint-disable-next-line no-console
    console.log(
      '[EffectOp]',
      `kind=${op.kind}`,
      `name=${op.name}`,
      `module=${op.meta?.moduleId ?? '-'}`,
    )
  },
  // observer 由 Runtime.make(..., { devtools: true }) 自动追加，避免重复采集。
  observer: false,
})

// 应用级 Runtime：挂载 EffectOp 中间件总线 + Devtools Layer
const middlewareRuntime = Logix.Runtime.make(MiddlewareCounterImpl, {
  label: 'MiddlewareEffectOpDemo',
  devtools: true,
  middleware: effectOpStack,
})

// ---------------------------------------------------------------------------
// 3. React 视图：一个带中间件说明的计数器
// ---------------------------------------------------------------------------

const CounterView: React.FC = () => {
  const runtimeHandle = useModule(MiddlewareCounterModule)
  const count = useSelector(runtimeHandle, (s) => s.count)
  const dispatch = useDispatch(runtimeHandle)

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 max-w-md space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">EffectOp 中间件计数器</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            所有 lifecycle / action / state 事件都会以 EffectOp 形式经过中间件总线。
          </p>
        </div>
        <span className="px-2 py-1 rounded-full text-[10px] font-mono bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
          EffectOp · Middleware
        </span>
      </div>

      <div className="flex items-baseline justify-between py-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-4 border border-gray-100 dark:border-gray-800">
        <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">当前计数</span>
        <span className="text-4xl font-bold text-gray-900 dark:text-white tabular-nums">{count}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          className="px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors active:scale-95"
          onClick={() => dispatch({ _tag: 'dec', payload: undefined })}
        >
          减一
        </button>
        <button
          type="button"
          className="px-4 py-2.5 rounded-lg bg-indigo-600 text-sm text-white hover:bg-indigo-700 active:bg-indigo-800 transition-colors active:scale-95 shadow-sm shadow-indigo-600/20"
          onClick={() => dispatch({ _tag: 'inc', payload: undefined })}
        >
          加一
        </button>
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <p>
          点击按钮时，你可以在控制台看到
          <code className="px-1 bg-gray-100 dark:bg-gray-800 rounded mx-1">[EffectOp]</code>
          日志，记录每一次
          <code className="px-1 bg-gray-100 dark:bg-gray-800 rounded mx-1">action:dispatch</code>与
          <code className="px-1 bg-gray-100 dark:bg-gray-800 rounded mx-1">state:update</code>
          事件。
        </p>
        <p>
          同时，由于使用了
          <code className="px-1 bg-gray-100 dark:bg-gray-800 rounded mx-1">Middleware.withDebug</code>
          ，这些 EffectOp 也会以
          <code className="px-1 bg-gray-100 dark:bg-gray-800 rounded mx-1">trace:effectop</code>
          事件写入 DebugSink，Logix Devtools 会在时间线视图中统一展示。
        </p>
      </div>
    </div>
  )
}

export const MiddlewareDemoLayout: React.FC = () => {
  return (
    <RuntimeProvider runtime={middlewareRuntime}>
      <div className="space-y-8">
        <div className="border-b border-gray-200 dark:border-gray-800 pb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            EffectOp Middleware · 运行时中间件总线
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed">
            本示例展示了如何通过
            <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono text-pink-600 dark:text-pink-400 mx-1">
              Runtime.make(..., &#123; middleware &#125;)
            </code>
            为应用级 Runtime 配置一条统一的 EffectOp 中间件总线，将所有 Action / State / Lifecycle
            事件汇入同一条观察/调试链路。
          </p>
        </div>

        <CounterView />
      </div>
    </RuntimeProvider>
  )
}
