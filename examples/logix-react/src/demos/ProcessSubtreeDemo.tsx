import React from 'react'
import { Effect } from 'effect'
import * as Logix from '@logix/core'
import { RuntimeProvider, useModule, useProcesses } from '@logix/react'
import { CounterDef, CounterImpl } from '../modules/counter'

const SubtreeTicker = Logix.Process.link({ modules: [CounterDef] as const }, ($) =>
  Effect.gen(function* () {
    const counter = $[CounterDef.id]
    yield* Effect.forever(counter.actions.inc().pipe(Effect.zipRight(Effect.sleep('200 millis'))))
  }),
)

const runtime = Logix.Runtime.make(CounterImpl, {
  label: 'ProcessSubtreeDemo',
  devtools: true,
})

const TickerSubtree: React.FC = () => {
  useProcesses([SubtreeTicker], { subtreeId: 'demo:subtree:ticker' })
  return null
}

const ProcessSubtreeDemoInner: React.FC = () => {
  const [enabled, setEnabled] = React.useState(true)
  const count = useModule(CounterDef, (s) => s.value)

  return (
    <div className="space-y-8">
      <div className="border-b border-gray-200 dark:border-gray-800 pb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">useProcesses · UI 子树安装点</h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed">
          打开开关后，子树内安装的 Process 会按固定间隔驱动 Counter 递增； 关闭开关则卸载子树并停止该
          Process（StrictMode 下也不重复副作用）。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Counter
            </span>
            <span className="px-2 py-0.5 text-[10px] rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium">
              value
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-sm text-gray-500 dark:text-gray-400">当前计数</span>
            <span className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums">{count}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Subtree Process
            </span>
            <span
              className={`px-2 py-0.5 text-[10px] rounded-full font-medium ${
                enabled
                  ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
              }`}
            >
              {enabled ? 'running' : 'stopped'}
            </span>
          </div>
          <button
            type="button"
            className={`w-full px-3 py-2 rounded-lg text-sm transition-all active:scale-95 shadow-sm ${
              enabled
                ? 'bg-gray-900 text-white hover:bg-gray-800 active:bg-gray-950 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-emerald-600/20'
            }`}
            onClick={() => setEnabled((v) => !v)}
          >
            {enabled ? '停止 Subtree Process' : '启动 Subtree Process'}
          </button>
        </div>
      </div>

      {enabled ? <TickerSubtree /> : null}
    </div>
  )
}

export const ProcessSubtreeDemo: React.FC = () => (
  <RuntimeProvider runtime={runtime} fallback={<p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>}>
    <ProcessSubtreeDemoInner />
  </RuntimeProvider>
)
