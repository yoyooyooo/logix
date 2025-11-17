import React from 'react'
import { Effect, Schema } from 'effect'
import * as Module from '@logix/core/Module'
import * as Runtime from '@logix/core/Runtime'
import * as Debug from '@logix/core/Debug'
import { RuntimeProvider, useModule, useSelector, useDispatch } from '@logix/react'

// 一个基于 Logix Runtime 的简单示例：单模块计数器应用

const AppCounterDef = Module.make('AppCounter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    increment: Schema.Void,
    decrement: Schema.Void,
  },
  reducers: {
    increment: Module.Reducer.mutate((draft, _action) => {
      draft.count += 1
    }),
    decrement(s) {
      return { ...s, count: s.count - 1 }
    },
  },
})

const AppCounterLogic = AppCounterDef.logic(($) => {
  return Effect.gen(function* () {
    yield* Effect.log('AppCounterLogic setup')
    yield* $.onAction('increment').run(() =>
      Effect.gen(function* () {
        yield* Effect.log('increment dispatched from AppCounterLogic')
        yield* Debug.record({
          type: 'trace:increment',
          moduleId: AppCounterDef.id,
          data: { source: 'AppDemoLayout', at: 'onAction(increment)' },
        })
      }),
    )
  })
})

const AppCounterModule = AppCounterDef.implement({
  initial: { count: 0 },
  logics: [AppCounterLogic],
})

const appRuntime = Runtime.make(AppCounterModule, {
  // 应用级 Runtime：以 AppCounterModule 作为 Root Module 构建一颗 Runtime，
  // 并通过 devtools 选项一键启用 DevTools 观测。
  label: 'AppDemoRuntime',
  devtools: true,
})

const AppCounterView: React.FC = () => {
  // 使用 suspend:true 让 ModuleRuntime 构建走异步路径，避免在 StrictMode / 异步初始化下触发 runSync 的 AsyncFiberException。
  const runtime = useModule(AppCounterDef.tag)
  const count = useSelector(runtime, (s) => s.count)
  const dispatch = useDispatch(runtime)

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 max-w-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">计数器</h3>
        <div className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
          Runtime
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
          onClick={() => dispatch({ _tag: 'decrement', payload: undefined })}
        >
          减一
        </button>
        <button
          type="button"
          className="flex items-center justify-center px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-all active:scale-95 font-medium shadow-sm shadow-blue-600/20"
          onClick={() => dispatch({ _tag: 'increment', payload: undefined })}
        >
          加一
        </button>
      </div>
    </div>
  )
}

export const AppDemoLayout: React.FC = () => {
  return (
    <RuntimeProvider runtime={appRuntime}>
      <div className="space-y-6">
        <div className="border-b border-gray-200 dark:border-gray-800 pb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Runtime 计数器示例</h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed">
            本示例展示了如何使用{' '}
            <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono text-pink-600 dark:text-pink-400">
              Logix.Runtime.make
            </code>{' '}
            定义应用级 Runtime，并通过{' '}
            <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono text-pink-600 dark:text-pink-400">
              RuntimeProvider
            </code>{' '}
            将该 Runtime 挂载到 React 组件树中。
          </p>
        </div>

        <div className="pt-2">
          <React.Suspense fallback={<div>模块初始化中…</div>}>
            <AppCounterView />
          </React.Suspense>
        </div>
      </div>
    </RuntimeProvider>
  )
}
