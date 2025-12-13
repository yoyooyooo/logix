import React from "react"
import * as Logix from "@logix/core"
import { RuntimeProvider, useDispatch, useModule, useSelector } from "@logix/react"
import {
  TaskRunnerDemoImpl,
  TaskRunnerDemoModule,
  type TaskRunnerDemoState,
} from "../modules/task-runner-demo.js"

const runtime = Logix.Runtime.make(TaskRunnerDemoImpl, {
  label: "TaskRunnerDemoRuntime",
  devtools: true,
})

const TaskRunnerDemoView: React.FC = () => {
  const handle = useModule(TaskRunnerDemoModule)
  const state = useSelector(handle) as TaskRunnerDemoState
  const dispatch = useDispatch(handle)

  const [nextId, setNextId] = React.useState(1)

  const fireRefresh = () => {
    const id = nextId
    setNextId((n) => n + 1)
    dispatch({ _tag: "refresh", payload: id } as any)
  }

  const fireSubmit = () => {
    dispatch({ _tag: "submit", payload: undefined } as any)
  }

  const reset = () => {
    setNextId(1)
    dispatch({ _tag: "reset", payload: undefined } as any)
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Task Runner · 长链路 demo</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed">
          展示 <code className="font-mono text-[12px]">runLatestTask</code> /{" "}
          <code className="font-mono text-[12px]">runExhaustTask</code>：每次触发会被拆分成
          pending（立即提交）→ IO（事务外）→ writeback（再次提交）。打开右下角 Devtools 的 Timeline，
          可以看到两笔 state:update：<code className="font-mono text-[12px]">task:pending</code>{" "}
          与 <code className="font-mono text-[12px]">task:success</code>。
        </p>
      </header>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={fireRefresh}
          className="inline-flex items-center justify-center px-3 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          触发 refresh（runLatestTask）
        </button>
        <button
          type="button"
          onClick={fireSubmit}
          className="inline-flex items-center justify-center px-3 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          触发 submit（runExhaustTask）
        </button>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center justify-center px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          重置
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              runLatestTask（最新优先）
            </h3>
            <span className="px-2 py-1 rounded-full text-[10px] font-mono bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
              latest
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            连续点击 refresh，旧 task 会被取消，只会写回最后一次结果。
          </p>
          <div className="font-mono text-xs bg-gray-50 dark:bg-gray-800 rounded p-3 space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">loading</span>
              <span className={state.latest.loading ? "text-amber-600 dark:text-amber-300" : "text-gray-700 dark:text-gray-200"}>
                {String(state.latest.loading)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">lastRequestId</span>
              <span className="text-gray-900 dark:text-gray-100">{state.latest.lastRequestId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">lastResult</span>
              <span className="text-gray-900 dark:text-gray-100">{state.latest.lastResult}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              runExhaustTask（防重）
            </h3>
            <span className="px-2 py-1 rounded-full text-[10px] font-mono bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
              exhaust
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            连续点击 submit：运行中会忽略后续触发（被忽略的不会产生 pending）。
          </p>
          <div className="font-mono text-xs bg-gray-50 dark:bg-gray-800 rounded p-3 space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">loading</span>
              <span className={state.exhaust.loading ? "text-amber-600 dark:text-amber-300" : "text-gray-700 dark:text-gray-200"}>
                {String(state.exhaust.loading)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">submitted</span>
              <span className="text-gray-900 dark:text-gray-100">{state.exhaust.submitted}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">日志</h3>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
            {state.logs.length} lines
          </span>
        </div>
        <div className="font-mono text-xs bg-gray-50 dark:bg-gray-800 rounded p-3 h-56 overflow-auto">
          {state.logs.length === 0 ? (
            <div className="text-gray-500 dark:text-gray-400">（空）</div>
          ) : (
            <div className="space-y-1">
              {state.logs.slice(-200).map((line, idx) => (
                <div key={`${idx}-${line}`} className="text-gray-800 dark:text-gray-200">
                  {line}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export const TaskRunnerDemoLayout: React.FC = () => {
  return (
    <RuntimeProvider runtime={runtime}>
      <React.Suspense fallback={<div>TaskRunnerDemo 模块加载中…</div>}>
        <TaskRunnerDemoView />
      </React.Suspense>
    </RuntimeProvider>
  )
}

