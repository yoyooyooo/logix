import React from "react"
import { Effect, Layer, Schema } from "effect"
import { Logix, LogixRuntime } from "@logix/core"
import { RuntimeProvider, useModule, useSelector, useDispatch } from "@logix/react"

// 一个基于 LogixRuntime 的简单示例：单模块计数器应用

const AppCounterModule = Logix.Module("AppCounter", {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    increment: Schema.Void,
    decrement: Schema.Void,
  },
})

const AppCounterLogic = AppCounterModule.logic(($) =>
  Effect.gen(function* () {
    yield* Effect.all([
      $.onAction("increment").mutate(s => { s.count++ }),
      $.onAction("decrement").mutate(s => { s.count-- }),
    ], {
      concurrency: "unbounded"
    })
  }),
)

const AppCounterImpl = AppCounterModule.make({
  initial: { count: 0 },
  logics: [AppCounterLogic],
})

// 应用级 Runtime：以 AppCounterImpl 作为 Root ModuleImpl 构建一颗 Runtime。
const appRuntime = LogixRuntime.make(AppCounterImpl)

const AppCounterView: React.FC = () => {
  const runtime = useModule(AppCounterImpl.module)
  const count = useSelector(
    AppCounterImpl.module,
    (s) => s.count,
  )
  const dispatch = useDispatch(runtime)

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 max-w-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">计数器</h3>
        <div className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
          LogixRuntime
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg mb-6 border border-gray-100 dark:border-gray-800">
        <span className="text-sm text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider font-medium">当前值</span>
        <span className="text-5xl font-bold text-gray-900 dark:text-white tabular-nums tracking-tight">{count}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          className="flex items-center justify-center px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all active:scale-95 font-medium shadow-sm"
          onClick={() =>
            dispatch({ _tag: "decrement", payload: undefined })
          }
        >
          减一
        </button>
        <button
          type="button"
          className="flex items-center justify-center px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-all active:scale-95 font-medium shadow-sm shadow-blue-600/20"
          onClick={() =>
            dispatch({ _tag: "increment", payload: undefined })
          }
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">LogixRuntime 计数器示例</h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed">
            本示例展示了如何使用 <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono text-pink-600 dark:text-pink-400">LogixRuntime.make</code>{" "}
            定义应用级 Runtime，并通过 <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono text-pink-600 dark:text-pink-400">RuntimeProvider</code>{" "}
            将该 Runtime 挂载到 React 组件树中。
          </p>
        </div>

        <div className="pt-2">
          <AppCounterView />
        </div>
      </div>
    </RuntimeProvider>
  )
}
