import React from 'react'
import { useModule } from '@logix/react'
import { CounterDef } from '../modules/counter'
import { CounterAllDef } from '../modules/counterAll'
import { CounterMultiDef, CounterMultiImpl } from '../modules/counterMulti'

export function CounterRunFork() {
  const counter = useModule(CounterDef)
  const value = useModule(CounterDef, (s) => s.value)

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">runFork 模式</h3>
        <span className="text-[10px] font-mono bg-gray-100 dark:bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded">
          CounterModule
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center py-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg mb-4 border border-gray-100 dark:border-gray-800">
        <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider font-medium">
          当前值
        </span>
        <span className="text-4xl font-bold text-gray-900 dark:text-white tabular-nums tracking-tight">{value}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          className="flex items-center justify-center px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all active:scale-95 text-sm font-medium shadow-sm"
          onClick={() => counter.actions.dec()}
        >
          -1
        </button>
        <button
          className="flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-all active:scale-95 text-sm font-medium shadow-sm shadow-blue-600/20"
          onClick={() => counter.actions.inc()}
        >
          +1
        </button>
      </div>
    </div>
  )
}

export function CounterAllDemo() {
  const counter = useModule(CounterAllDef)
  const value = useModule(CounterAllDef, (s) => s.value)

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Effect.all + run 模式</h3>
        <span className="text-[10px] font-mono bg-gray-100 dark:bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded">
          CounterAllModule
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center py-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg mb-4 border border-gray-100 dark:border-gray-800">
        <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider font-medium">
          当前值
        </span>
        <span className="text-4xl font-bold text-gray-900 dark:text-white tabular-nums tracking-tight">{value}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          className="flex items-center justify-center px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all active:scale-95 text-sm font-medium shadow-sm"
          onClick={() => counter.actions.dec()}
        >
          -1
        </button>
        <button
          className="flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-all active:scale-95 text-sm font-medium shadow-sm shadow-blue-600/20"
          onClick={() => counter.actions.inc()}
        >
          +1
        </button>
      </div>
    </div>
  )
}

export function TagSharedCounter() {
  const counter = useModule(CounterMultiDef)
  const count = useModule(CounterMultiDef, (s) => s.count)

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 flex flex-col items-center shadow-sm">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">共享 Counter（Tag 模式）</span>
      <span className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums tracking-tight mb-3">{count}</span>
      <button
        type="button"
        className="w-full flex items-center justify-center px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 active:bg-green-800 transition-all active:scale-95 text-sm font-medium shadow-sm shadow-green-600/20"
        onClick={() => counter.actions.increment()}
      >
        +1
      </button>
    </div>
  )
}

export function ImplLocalCounter() {
  const counter = useModule(CounterMultiImpl)
  const count = useModule(counter, (s) => s.count)

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 flex flex-col items-center shadow-sm">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">局部 Counter（ModuleImpl 模式）</span>
      <span className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums tracking-tight mb-3">{count}</span>
      <button
        type="button"
        className="w-full flex items-center justify-center px-3 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 active:bg-purple-800 transition-all active:scale-95 text-sm font-medium shadow-sm shadow-purple-600/20"
        onClick={() => counter.actions.increment()}
      >
        +1
      </button>
    </div>
  )
}
