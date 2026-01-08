import React from 'react'
import { Effect, Layer, ManagedRuntime, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { RuntimeProvider, useModule } from '@logixjs/react'

// 局部 ModuleImpl 示例：模块不注册到应用级 Runtime 的全局 modules 中，状态随组件生命周期销毁

const LocalCounterDef = Logix.Module.make('LocalCounter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    increment: Schema.Void,
    decrement: Schema.Void,
  },
})

const LocalCounterLogic = LocalCounterDef.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction('increment').runFork(
      $.state.mutate((s) => {
        s.count += 1
      }),
    )
    yield* $.onAction('decrement').runFork(
      $.state.mutate((s) => {
        s.count -= 1
      }),
    )
  }),
)

const LocalCounterModule = LocalCounterDef.implement({
  initial: { count: 0 },
  logics: [LocalCounterLogic],
})

const LocalCounterImpl = LocalCounterModule.impl

// 用一个简单的 Runtime 承载 Effect 环境；模块实例本身由 useModule(LocalCounterImpl) 局部创建
const localRuntime = ManagedRuntime.make(
  Layer.mergeAll(Logix.Debug.runtimeLabel('LocalModuleDemo'), Logix.Debug.devtoolsHubLayer(), Layer.empty),
)
const LocalCounterView: React.FC = () => {
  // 每个组件调用都会创建一棵独立的 ModuleRuntime 实例，随组件卸载销毁
  const runtime = useModule(LocalCounterImpl)
  const count = useModule(runtime, (s) => s.count)

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 max-w-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">局部 Counter</h3>
        <div className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-medium">
          ModuleImpl · Local
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg mb-6 border border-gray-100 dark:border-gray-800">
        <span className="text-sm text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider font-medium">
          当前值
        </span>
        <span className="text-5xl font-bold text-gray-900 dark:text-white tabular-nums tracking-tight">{count}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          className="flex items-center justify-center px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all active:scale-95 font-medium shadow-sm"
          onClick={() => runtime.actions.decrement()}
        >
          减一
        </button>
        <button
          type="button"
          className="flex items-center justify-center px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 active:bg-emerald-800 transition-all active:scale-95 font-medium shadow-sm shadow-emerald-600/20"
          onClick={() => runtime.actions.increment()}
        >
          加一
        </button>
      </div>
    </div>
  )
}

export const LocalModuleLayout: React.FC = () => {
  return (
    <RuntimeProvider runtime={localRuntime}>
      <React.Suspense fallback={null}>
        <div className="space-y-6">
          <div className="border-b border-gray-200 dark:border-gray-800 pb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">局部 ModuleImpl 示例</h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed">
              本示例展示了如何直接使用{' '}
              <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono text-pink-600 dark:text-pink-400">
                ModuleImpl
              </code>{' '}
              作为局部 Store：每个组件拥有自己的{' '}
              <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono text-pink-600 dark:text-pink-400">
                ModuleRuntime
              </code>{' '}
              实例，并在组件卸载时自动销毁对应状态。
            </p>
          </div>

          <div className="pt-2 flex gap-4">
            <LocalCounterView />
            <LocalCounterView />
          </div>
        </div>
      </React.Suspense>
    </RuntimeProvider>
  )
}
