import React from 'react'
import { Effect, Layer, ManagedRuntime, Schema, Logger } from 'effect'
import * as Logix from '@logix/core'
import { RuntimeProvider, useModule, ReactPlatformLayer } from '@logix/react'

// 异步局部 ModuleImpl 示例：演示 suspend:true + ModuleImpl.layer 内部存在异步初始化逻辑

const AsyncCounterModule = Logix.Module.make('AsyncLocalCounter', {
  state: Schema.Struct({ count: Schema.Number, ready: Schema.Boolean }),
  actions: {
    increment: Schema.Void,
    decrement: Schema.Void,
  },
})

// 模拟异步初始化：先 sleep 一小段时间，再挂载真正的业务逻辑
const AsyncCounterLogic = AsyncCounterModule.logic(($) =>
  Effect.gen(function* () {
    yield* $.lifecycle.onInit(Effect.log('AsyncCounterLogic init'))

    yield* $.lifecycle.onSuspend(Effect.log('[SessionCounter] suspended'))
    yield* $.lifecycle.onResume(Effect.log('[SessionCounter] resumed'))

    // 这里可以替换成真实的 IO 初始化（如远程配置 / IndexedDB 等）
    yield* Effect.sleep('1200 millis')

    yield* $.state.update((s) => ({
      ...s,
      ready: true,
    }))

    yield* $.onAction('increment').runParallelFork(
      $.state.mutate((s) => {
        s.count += 1
      }),
    )

    yield* $.onAction('decrement').runParallelFork(
      $.state.mutate((s) => {
        s.count -= 1
      }),
    )
  }),
)

const AsyncCounterImpl = AsyncCounterModule.implement({
  initial: { count: 0, ready: false },
  logics: [AsyncCounterLogic],
})

// Root 级 Runtime：只负责提供 Effect Env，真正的 ModuleRuntime 由 useModule(Impl) 在组件内构造
const asyncLocalRuntime = ManagedRuntime.make(
  Layer.mergeAll(
    Logix.Debug.runtimeLabel('AsyncLocalModuleDemo'),
    Logix.Debug.devtoolsHubLayer(),
    Logger.pretty,
    ReactPlatformLayer,
  ),
)

interface AsyncLocalCounterViewProps {
  readonly title: string
  /**
   * 用于 ModuleCache 的显式稳定 key。
   * 不依赖 useId，避免在 StrictMode + Suspense 下出现 key 抖动。
   */
  readonly cacheKey: string
}

const AsyncLocalCounterView: React.FC<AsyncLocalCounterViewProps> = ({ title, cacheKey }) => {
  const moduleRuntime = useModule(AsyncCounterImpl, {
    suspend: true,
    // 显式提供稳定 key：一个 layout 内多实例时，用 cacheKey 区分。
    key: `AsyncLocalCounter:${cacheKey}`,
  })

  const state = useModule(moduleRuntime, (s) => s as { count: number; ready: boolean })

  if (!state.ready) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 max-w-sm flex flex-col gap-4 items-center justify-center">
        <div className="h-6 w-24 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
        <div className="h-10 w-32 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
        <p className="text-xs text-gray-500 dark:text-gray-400">正在初始化局部模块…</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 max-w-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <p className="text-xs text-emerald-600 dark:text-emerald-300 mt-1">suspend:true · 异步初始化完成</p>
        </div>
        <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-medium">
          Async ModuleImpl
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg mb-6 border border-gray-100 dark:border-gray-800">
        <span className="text-sm text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider font-medium">
          当前值
        </span>
        <span className="text-5xl font-bold text-gray-900 dark:text-white tabular-nums tracking-tight">
          {state.count}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          className="flex items-center justify-center px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all active:scale-95 font-medium shadow-sm"
          onClick={() => moduleRuntime.actions.decrement()}
        >
          减一
        </button>
        <button
          type="button"
          className="flex items-center justify-center px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 active:bg-indigo-800 transition-all active:scale-95 font-medium shadow-sm shadow-indigo-600/20"
          onClick={() => moduleRuntime.actions.increment()}
        >
          加一
        </button>
      </div>
    </div>
  )
}

export const AsyncLocalModuleLayout: React.FC = () => {
  return (
    <RuntimeProvider runtime={asyncLocalRuntime}>
      <React.Suspense
        fallback={
          <div className="space-y-6">
            <div className="border-b border-gray-200 dark:border-gray-800 pb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">异步局部 ModuleImpl 示例</h2>
              <p className="text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed">
                本示例展示如何在{' '}
                <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono text-pink-600 dark:text-pink-400">
                  ModuleImpl.layer
                </code>{' '}
                中执行异步初始化，并通过{' '}
                <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono text-pink-600 dark:text-pink-400">
                  useModule(Impl, &#123; suspend: true &#125;)
                </code>{' '}
                让 React Suspense 负责加载状态。
              </p>
            </div>
            <div className="flex gap-4">
              <div className="flex-1 h-48 rounded-xl bg-gray-50 dark:bg-gray-900/40 border border-dashed border-gray-200 dark:border-gray-700 animate-pulse" />
              <div className="flex-1 h-48 rounded-xl bg-gray-50 dark:bg-gray-900/40 border border-dashed border-gray-200 dark:border-gray-700 animate-pulse" />
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="border-b border-gray-200 dark:border-gray-800 pb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">异步局部 ModuleImpl 示例</h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed">
              这里的 ModuleImpl 在挂载时会先执行一段异步初始化逻辑（模拟 IO）， 完成后才对外暴露可用的{' '}
              <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono text-pink-600 dark:text-pink-400">
                ModuleRuntime
              </code>
              。这依赖于 @logix/react 内部的{' '}
              <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono text-pink-600 dark:text-pink-400">
                ModuleCache
              </code>{' '}
              与 Suspense 集成。
            </p>
          </div>

          <div className="pt-2 flex gap-4">
            <AsyncLocalCounterView title="异步局部 Counter · A" cacheKey="A" />
            <AsyncLocalCounterView title="异步局部 Counter · B" cacheKey="B" />
          </div>
        </div>
      </React.Suspense>
    </RuntimeProvider>
  )
}
