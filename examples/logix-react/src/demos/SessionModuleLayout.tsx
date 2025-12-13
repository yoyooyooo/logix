import React, { Suspense } from 'react'
import { Effect, Layer, ManagedRuntime, Schema, Option, Logger } from 'effect'
import * as Logix from '@logix/core'
import { RuntimeProvider, useModule, useSelector, useDispatch, useRuntime, ReactPlatformLayer } from '@logix/react'

// Session 级 ModuleImpl 示例：演示 useModule(Impl, { key, gcTime }) 的会话保活语义。

const SessionCounterModule = Logix.Module.make('SessionCounter', {
  state: Schema.Struct({
    count: Schema.Number,
    instanceId: Schema.String,
  }),
  actions: {
    increment: Schema.Void,
    reset: Schema.Void,
  },
})

const SessionCounterLogic = SessionCounterModule.logic(($) => ({
  setup: Effect.gen(function* () {}),
  run: Effect.gen(function* () {
    yield* $.lifecycle.onInit(
      Effect.gen(function* () {
        // 模拟一次较重的初始化过程（例如远程配置拉取），仅影响
        // instanceId，不阻塞后续 Watcher 的注册与 Action 处理。
        yield* Effect.sleep('2 seconds')
        yield* $.state.update((s) => ({
          ...s,
          instanceId: Math.random().toString(36).slice(2, 8),
        }))
      }),
    )

    yield* Effect.log('SessionCounterLogic setup')

    // 平台级生命周期示例：当页面被挂起/恢复时记录日志（由 ReactPlatformLayer + 宿主桥接触发）。
    yield* $.lifecycle.onSuspend(
      Effect.gen(function* () {
        console.log(123)
        yield* Effect.log('[SessionCounter] suspended')
      }),
    )
    yield* $.lifecycle.onResume(Effect.log('[SessionCounter] resumed'))

    // 简单计数逻辑：点击「加一 / 重置」时立即更新状态。
    yield* $.onAction('increment').runParallelFork(
      $.state.mutate((s) => {
        s.count += 1
      }),
    )

    yield* $.onAction('reset').runParallelFork(
      $.state.update((s) => ({
        ...s,
        count: 0,
      })),
    )
  }),
}))

const SessionCounterImpl = SessionCounterModule.implement({
  initial: { count: 0, instanceId: '' },
  logics: [SessionCounterLogic],
})

// 简单的应用级 Runtime：提供基础 Env + ReactPlatformLayer，
// ModuleRuntime 由 useModule(Impl) 构造并交给 ModuleCache 管理。
const sessionRuntime = ManagedRuntime.make(
  Layer.mergeAll(
    Logix.Debug.runtimeLabel('SessionModuleDemo'),
    Logix.Debug.devtoolsHubLayer(),
    Layer.empty,
    ReactPlatformLayer,
    Logger.pretty,
  ),
)

interface SessionTabProps {
  readonly tabId: string
  readonly gcTimeMs: number
}

const SessionTab: React.FC<SessionTabProps> = ({ tabId, gcTimeMs }) => {
  const runtime = useModule(SessionCounterImpl, {
    key: `session:${tabId}`,
    label: `Session ${tabId}`,
    gcTime: gcTimeMs,
  })

  const state = useSelector(runtime)
  const dispatch = useDispatch(runtime)

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">会话 Tab · {tabId}</h3>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-300 mt-1">
            key=&quot;session:{tabId}&quot; · gcTime={gcTimeMs / 1000}s
          </p>
        </div>
        <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-[11px] font-medium">
          Session Module
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
        <span className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider font-medium">
          当前计数
        </span>
        <span className="text-4xl font-bold text-gray-900 dark:text-white tabular-nums tracking-tight mb-1">
          {state.count}
        </span>
        <span className="text-[11px] text-gray-500 dark:text-gray-400">
          instanceId:{' '}
          <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[11px] font-mono text-pink-600 dark:text-pink-400">
            {state.instanceId || '(初始化中)'}
          </code>
        </span>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          className="flex-1 flex items-center justify-center px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all active:scale-95 text-sm font-medium shadow-sm"
          onClick={() => dispatch({ _tag: 'reset', payload: undefined })}
        >
          重置
        </button>
        <button
          type="button"
          className="flex-1 flex items-center justify-center px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 active:bg-indigo-800 transition-all active:scale-95 text-sm font-medium shadow-sm shadow-indigo-600/20"
          onClick={() => dispatch({ _tag: 'increment', payload: undefined })}
        >
          加一
        </button>
      </div>
    </div>
  )
}

// PlatformVisibilityBridge：示例性的“宿主桥接层”，
// 将浏览器的 Page Visibility 事件映射为 Platform lifecycle 信号。
const SessionPlatformVisibilityBridge: React.FC = () => {
  const runtime = useRuntime()

  React.useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    const handler = () => {
      const visibility = document.visibilityState

      const eff = Effect.serviceOption(Logix.Platform.tag).pipe(
        Effect.flatMap((maybe) =>
          Option.match(maybe, {
            onNone: () => Effect.void,
            onSome: (platform: any) => {
              if (visibility === 'hidden' && typeof platform.emitSuspend === 'function') {
                return platform.emitSuspend()
              }
              if (visibility === 'visible' && typeof platform.emitResume === 'function') {
                return platform.emitResume()
              }
              return Effect.void
            },
          }),
        ),
      )

      runtime.runFork(eff as Effect.Effect<void, never, any>)
    }

    document.addEventListener('visibilitychange', handler)
    return () => {
      document.removeEventListener('visibilitychange', handler)
    }
  }, [runtime])

  return null
}

export const SessionModuleLayout: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<'A' | 'B'>('A')
  const gcTimeMs = 10_000

  return (
    <RuntimeProvider runtime={sessionRuntime}>
      <SessionPlatformVisibilityBridge />
      <div className="space-y-6">
        <div className="border-b border-gray-200 dark:border-gray-800 pb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">会话级 Module 示例（key + gcTime）</h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed text-sm">
            本示例通过{' '}
            <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono text-pink-600 dark:text-pink-400">
              useModule(Impl, &#123; key, gcTime &#125;)
            </code>{' '}
            演示 <span className="font-medium text-gray-900 dark:text-gray-100">Session Pattern</span>
            ：每个 Tab 使用一个稳定的{' '}
            <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono text-pink-600 dark:text-pink-400">
              key
            </code>{' '}
            标识会话，并通过{' '}
            <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono text-pink-600 dark:text-pink-400">
              gcTime = {gcTimeMs / 1000}s
            </code>{' '}
            控制在无人持有后的保活时间。
          </p>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed text-xs mt-3">
            切换 Tab 时，对应组件会卸载；只要在 <span className="font-semibold">{gcTimeMs / 1000}</span>
            秒内切回，instanceId 将保持不变（同一个 ModuleRuntime）， 超过该时间后则会看到新的 instanceId（Runtime 被 GC
            并重建）。
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 px-2 py-1 w-fit">
            <span className="text-[11px] text-gray-500 dark:text-gray-400 px-2">当前会话</span>
            <button
              type="button"
              className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                activeTab === 'A'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              onClick={() => setActiveTab('A')}
            >
              Tab A
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                activeTab === 'B'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              onClick={() => setActiveTab('B')}
            >
              Tab B
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <div className="space-y-3">
              <SessionTab tabId={activeTab} gcTimeMs={gcTimeMs} />
            </div>

            <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed space-y-2">
              <p className="font-semibold text-gray-700 dark:text-gray-200">如何理解这个示例：</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>
                  每个 Tab 的 ModuleRuntime 由{' '}
                  <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded font-mono text-[11px] text-pink-600 dark:text-pink-400">
                    key = &quot;session:A|B&quot;
                  </code>{' '}
                  锁定；
                </li>
                <li>
                  组件卸载时，ModuleCache 中对应 key 的引用计数变为 0，并开始按{' '}
                  <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded font-mono text-[11px] text-pink-600 dark:text-pink-400">
                    gcTime
                  </code>{' '}
                  计时；
                </li>
                <li>
                  在 gcTime 内切回 Tab → 复用同一个 ModuleRuntime（instanceId 不变）；超过 gcTime → Runtime 被
                  GC，重新创建（instanceId 变化）。
                </li>
              </ul>
              <p>
                这就是文档中 Session Pattern 所说的：通过「key + gcTime」在一个统一的 ModuleCache
                上同时覆盖组件级与会话级生命周期，而不需要额外的 SessionManager。
              </p>
            </div>
          </div>
        </div>
      </div>
    </RuntimeProvider>
  )
}
