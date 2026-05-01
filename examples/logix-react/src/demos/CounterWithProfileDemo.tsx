import React from 'react'
import * as Logix from '@logixjs/core'
import { Effect } from 'effect'
import { RuntimeProvider, fieldValue, useModule, useSelector } from '@logixjs/react'
import { CounterWithProfile } from '../modules/counter-with-profile.js'

// 为 Devtools 提供一个带 field graph 图纸的示例 Program（CounterWithProfile），
// 并通过独立的 Runtime + devtools 选项将其纳入 Debug 观测范围。
const CounterWithProfileProgram = Logix.Program.make(CounterWithProfile, {
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

const counterWithProfileRuntime = Logix.Runtime.make(CounterWithProfileProgram, {
  label: 'CounterWithProfileDemo',
  devtools: true,
})

// 应用启动时预热一次 Runtime，确保 Devtools 能看到该 Module 的初始状态与事件。
counterWithProfileRuntime.runFork(
  Effect.gen(function* () {
    const runtime = yield* Effect.service(CounterWithProfile.tag).pipe(Effect.orDie)
    const state = yield* runtime.getState
    // 简单变更一次状态，触发 state:update + field 计算链路。
    yield* runtime.setState({
      ...state,
      a: state.a + 1,
      b: state.b + 1,
    })
  }),
)

// 供本地调试面板消费的 FieldProgram 提供函数。
const CounterWithProfilePanel: React.FC = () => {
  const runtime = useModule(CounterWithProfile.tag)
  const a = useSelector(runtime, fieldValue('a'))
  const b = useSelector(runtime, fieldValue('b'))
  const sum = useSelector(runtime, fieldValue('sum'))
  const profileName = useSelector(runtime, fieldValue('profile.name'))
  const profileResourceStatus = useSelector(runtime, fieldValue('profileResource.status'))
  const profileResourceDataName = useSelector(runtime, fieldValue('profileResource.data.name'))

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 max-w-xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">CounterWithProfile（Field Demo）</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            来自 examples/logix-react/src/modules/counter-with-profile.ts 的图纸：state + actions + field declarations
          </p>
        </div>
        <span className="px-2 py-1 rounded-full text-[10px] font-mono bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
          Field
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="space-y-2">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Base Fields</div>
            <div className="font-mono text-xs bg-gray-50 dark:bg-gray-800 rounded p-2 space-y-1">
              <div>
                <span className="text-gray-500 dark:text-gray-400 mr-1">a:</span>
                <span className="text-gray-900 dark:text-gray-100">{a}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400 mr-1">b:</span>
                <span className="text-gray-900 dark:text-gray-100">{b}</span>
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
                <span className="text-gray-900 dark:text-gray-100">{profileResourceStatus}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-gray-500 dark:text-gray-400 mr-1">profileResource.data.name:</span>
                <span className="text-gray-900 dark:text-gray-100">{profileResourceDataName ?? '-'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Derived Fields</div>
            <div className="font-mono text-xs bg-gray-50 dark:bg-gray-800 rounded p-2 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400 mr-1">sum (computed a + b):</span>
                <span className="text-blue-600 dark:text-blue-300">{sum}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400 mr-1">profile.name (from profileResource.data.name):</span>
                <span className="text-blue-600 dark:text-blue-300">{profileName}</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            该视图本身不直接修改状态，只展示 FieldProgram 推导出来的字段关系。
            <br />
            更多动态行为可以通过 Devtools Timeline + Graph 联动观察：在 Devtools 中选择 CounterWithProfileDemo
            runtime，然后点击右侧 FieldGraph 里的字段节点。
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
