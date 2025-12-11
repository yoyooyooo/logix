import React, { Suspense } from 'react'
import { Context, Effect, Layer, ManagedRuntime, Schema } from 'effect'
import * as Logix from '@logix/core'
import { RuntimeProvider, useModule, useSelector, useDispatch } from '@logix/react'
import { devtoolsLayer } from '@logix/devtools-react'

// 1. 定义一个需要“重型初始化”的服务
interface HeavyService {
  readonly perform: () => Effect.Effect<void>
}
const HeavyService = Context.GenericTag<HeavyService>('HeavyService')

// 2. 模拟一个耗时 2 秒才能就绪的 Layer
// 注意：Effect.sleep 在 Layer 构建阶段执行，这会阻塞依赖它的 ModuleRuntime 创建
const HeavyServiceLive = Layer.effect(
  HeavyService,
  Effect.gen(function* () {
    // 模拟耗时初始化（例如连接数据库、加载 WASM、读取配置）
    yield* Effect.sleep(2000)

    return {
      perform: () => Effect.log('Heavy work done'),
    }
  }),
)

// 3. 定义一个依赖该服务的 Module
const SuspenseModule = Logix.Module.make('SuspenseModule', {
  state: Schema.Struct({
    count: Schema.Number,
  }),
  actions: {
    increment: Schema.Void,
  },
})

const SuspenseLogic = SuspenseModule.logic<HeavyService>(($) =>
  Effect.gen(function* () {
    // 注入依赖：虽然 Logic 内部没用到，但 ModuleImpl 声明了依赖，
    // 所以 Runtime 构建时必须等待 Layer 就绪。
    yield* HeavyService

    yield* $.onAction('increment').runParallelFork(
      $.state.mutate((s) => {
        s.count += 1
      }),
    )
  }),
)

// 4. 构造 ModuleImpl：将 HeavyServiceLive 注入
// 关键点：withLayer(HeavyServiceLive) 使得这个 Impl 的 Layer 变成了异步 Layer
const SuspenseImpl = SuspenseModule.implement({
  initial: { count: 0 },
  logics: [SuspenseLogic],
}).withLayer(HeavyServiceLive)

// 5. 演示组件
const SuspenseCounter: React.FC = () => {
  // 使用 suspend: true
  // 由于 SuspenseImpl 依赖了异步 Layer，useModule 会抛出 Promise，
  // 直到 HeavyServiceLive 初始化完成（2秒后）。
  const runtime = useModule(SuspenseImpl, {
    key: 'suspense-demo',
    suspend: true,
    gcTime: 5000, // 必须 > 初始化耗时 (2000ms)，否则会在 pending 期间被 GC
  })

  const count = useSelector(runtime, (s) => s.count)
  const dispatch = useDispatch(runtime)

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Suspense Counter</h3>
        <div className="px-3 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-[11px] font-medium">
          Async Dependency
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
        <span className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider font-medium">
          当前计数
        </span>
        <span className="text-4xl font-bold text-gray-900 dark:text-white tabular-nums tracking-tight">{count}</span>
      </div>

      <button
        type="button"
        className="w-full flex items-center justify-center px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 active:bg-indigo-800 transition-all active:scale-95 text-sm font-medium shadow-sm shadow-indigo-600/20"
        onClick={() => dispatch({ _tag: 'increment', payload: undefined })}
      >
        加一
      </button>
    </div>
  )
}

// 6. 页面布局
const suspenseRuntime = ManagedRuntime.make(
  Layer.mergeAll(
    Logix.Debug.runtimeLabel('SuspenseModuleDemo'),
    devtoolsLayer,
    Layer.empty,
  ),
)

export const SuspenseModuleLayout: React.FC = () => {
  const [show, setShow] = React.useState(false)

  return (
    <RuntimeProvider runtime={suspenseRuntime}>
      <div className="space-y-6">
        <div className="border-b border-gray-200 dark:border-gray-800 pb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">真实 Suspense Fallback 演示</h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed text-sm">
            本示例演示了如何通过引入{' '}
            <span className="font-semibold text-amber-600 dark:text-amber-400">异步 Layer 依赖</span> 来触发真正的
            Suspense Fallback。
          </p>
          <ul className="list-disc pl-4 mt-3 space-y-1 text-xs text-gray-600 dark:text-gray-400">
            <li>
              定义了一个 <code>HeavyServiceLive</code>，在 Layer 构建阶段 <code>Effect.sleep(2000)</code>；
            </li>
            <li>
              ModuleImpl 通过 <code>withLayer</code> 注入该服务，导致 ModuleRuntime 的构建被阻塞；
            </li>
            <li>点击下方按钮挂载组件时，你会看到 2 秒钟的 Loading 状态。</li>
          </ul>
        </div>

        <div className="flex flex-col gap-4">
          <button
            type="button"
            className={`w-fit px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              show
                ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-600/20'
            }`}
            onClick={() => setShow(!show)}
          >
            {show ? '卸载组件' : '挂载组件 (触发 Suspense)'}
          </button>

          {show && (
            <div className="relative min-h-[200px]">
              <Suspense
                fallback={
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-800 border-dashed">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 animate-pulse">
                        正在初始化 HeavyService (2s)...
                      </span>
                    </div>
                  </div>
                }
              >
                <SuspenseCounter />
              </Suspense>
            </div>
          )}
        </div>
      </div>
    </RuntimeProvider>
  )
}
