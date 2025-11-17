import React from 'react'
import * as Logix from '@logix/core'
import { Effect } from 'effect'
import { RuntimeProvider, useModule, useSelector } from '@logix/react'
import { CounterWithProfileDef, type CounterState } from '../modules/counter-with-profile.js'

// 为 Devtools 提供一个带 StateTrait 图纸的示例模块（CounterWithProfile），
// 并通过独立的 Runtime + devtools 选项将其纳入 Debug 观测范围。
const CounterWithProfileModule = CounterWithProfileDef.implement({
  initial: {
    a: 1,
    b: 2,
    sum: 0,
    profile: { id: 'u1', name: 'Alice' },
    profileResource: {
      status: 'success',
      keyHash: 'init',
      data: { name: 'Alice2' },
    },
  },
})

const counterWithProfileRuntime = Logix.Runtime.make(CounterWithProfileModule, {
  label: 'CounterWithProfileDemo',
  devtools: true,
})

// 应用启动时预热一次 Runtime，确保 Devtools 能看到该 Module 的初始状态与事件。
counterWithProfileRuntime.runFork(
  Effect.gen(function* () {
    const runtime = yield* CounterWithProfileDef.tag
    const state = yield* runtime.getState
    // 简单变更一次状态，触发 state:update + StateTrait 计算链路。
    yield* runtime.setState({
      ...state,
      a: state.a + 1,
      b: state.b + 1,
    })
  }),
)

// 供顶层 <LogixDevtools /> 使用的 StateTraitProgram 提供函数。
const CounterWithProfilePanel: React.FC = () => {
  const runtime = useModule(CounterWithProfileDef.tag)
  const state = useSelector(runtime)

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 max-w-xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">CounterWithProfile（StateTrait Demo）</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            来自 examples/logix-react/src/modules/counter-with-profile.ts 的图纸：state + actions + traits
          </p>
        </div>
        <span className="px-2 py-1 rounded-full text-[10px] font-mono bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
          StateTrait
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="space-y-2">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Base Fields</div>
            <div className="font-mono text-xs bg-gray-50 dark:bg-gray-800 rounded p-2 space-y-1">
              <div>
                <span className="text-gray-500 dark:text-gray-400 mr-1">a:</span>
                <span className="text-gray-900 dark:text-gray-100">{state.a}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400 mr-1">b:</span>
                <span className="text-gray-900 dark:text-gray-100">{state.b}</span>
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
              Resource Snapshot
            </div>
            <div className="font-mono text-xs bg-gray-50 dark:bg-gray-800 rounded p-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400 mr-1">profileResource.status:</span>
                <span className="text-gray-900 dark:text-gray-100">{state.profileResource.status}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-gray-500 dark:text-gray-400 mr-1">profileResource.data.name:</span>
                <span className="text-gray-900 dark:text-gray-100">{state.profileResource.data?.name ?? '-'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
              Computed / Link Fields
            </div>
            <div className="font-mono text-xs bg-gray-50 dark:bg-gray-800 rounded p-2 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400 mr-1">sum (computed a + b):</span>
                <span className="text-blue-600 dark:text-blue-300">{state.sum}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400 mr-1">profile.name (link):</span>
                <span className="text-blue-600 dark:text-blue-300">{state.profile.name}</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            该视图本身不直接修改状态，只展示 StateTraitProgram 推导出来的字段关系。
            <br />
            更多动态行为可以通过 Devtools Timeline + Graph 联动观察：在 Devtools 中选择 CounterWithProfileDemo
            runtime，然后点击右侧 Traits 里的字段节点。
          </div>
        </div>
      </div>
    </div>
  )
}

export const CounterWithProfileDemo: React.FC = () => {
  return (
    <RuntimeProvider runtime={counterWithProfileRuntime}>
      <React.Suspense fallback={<div>CounterWithProfile 模块加载中…</div>}>
        <CounterWithProfilePanel />
      </React.Suspense>
    </RuntimeProvider>
  )
}
