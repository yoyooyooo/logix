import React from "react"
import { Effect, Fiber, Layer, ManagedRuntime } from "effect"
import { RuntimeProvider, useModule, useSelector, useDispatch, useRuntime } from "@logix/react"
import { SourceModule, TargetModule, AuditModule, SourceImpl, TargetImpl, AuditImpl, ReactMultiModuleLink } from "../modules/linkModules"

// 组合三个 ModuleImpl 的 Layer，构造应用级 Runtime
const appLayer = Layer.mergeAll(
  SourceImpl.layer,
  TargetImpl.layer,
  AuditImpl.layer,
) as Layer.Layer<any, never, never>

const appRuntime = ManagedRuntime.make(appLayer) as ManagedRuntime.ManagedRuntime<never, any>

const LinkRunner: React.FC = () => {
  const runtime = useRuntime()

  React.useEffect(() => {
    const fiber = runtime.runFork(ReactMultiModuleLink)
    return () => {
      // 简单中断 Link watcher，避免在 Provider 卸载后继续运行
      void runtime.runPromise(Fiber.interrupt(fiber))
    }
  }, [runtime])

  return null
}

const SourcePanel: React.FC = () => {
  const runtime = useModule(SourceModule)
  const dispatch = useDispatch(runtime)

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          SourceModule
        </span>
        <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-medium">
          dispatch ping
        </span>
      </div>
      <button
        type="button"
        className="w-full px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 active:bg-emerald-800 transition-all active:scale-95 shadow-sm shadow-emerald-600/20"
        onClick={() => dispatch({ _tag: "ping", payload: undefined })}
      >
        触发 ping
      </button>
    </div>
  )
}

const TargetPanel: React.FC = () => {
  const runtime = useModule(TargetModule)
  const count = useSelector(TargetModule, (s) => s.count)

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          TargetModule
        </span>
        <span className="px-2 py-0.5 text-[10px] rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium">
          统计命中次数
        </span>
      </div>
      <div className="flex items-baseline justify-between mt-1">
        <span className="text-sm text-gray-500 dark:text-gray-400">命中次数</span>
        <span className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums">
          {count}
        </span>
      </div>
    </div>
  )
}

const AuditPanel: React.FC = () => {
  const runtime = useModule(AuditModule)
  const logs = useSelector(AuditModule, (s) => s.logs)

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          AuditModule
        </span>
        <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-medium">
          记录日志
        </span>
      </div>
      <div className="mt-1 space-y-1 max-h-40 overflow-auto text-xs text-gray-600 dark:text-gray-300 font-mono">
        {logs.length === 0 ? (
          <span className="text-gray-400 dark:text-gray-500">暂无日志，点击左侧按钮触发 ping</span>
        ) : (
          logs.map((line, idx) => (
            <div key={idx} className="px-2 py-1 rounded bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/70">
              {line}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export const LinkDemoLayout: React.FC = () => {
  return (
    <RuntimeProvider runtime={appRuntime}>
      <LinkRunner />

      <div className="space-y-8">
        <div className="border-b border-gray-200 dark:border-gray-800 pb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Link.make · 多模块协作示例</h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed">
            本示例展示了如何在 React 中结合 <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono text-pink-600 dark:text-pink-400">Link.make</code>{" "}
            与 <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono text-pink-600 dark:text-pink-400">$[Module.id]</code>{" "}
            实现跨模块编排：点击 <code>ReactLinkSource</code> 的 ping，会驱动 <code>ReactLinkTarget</code> 计数并在 <code>ReactLinkAudit</code> 中记录日志。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <SourcePanel />
          <TargetPanel />
          <AuditPanel />
        </div>
      </div>
    </RuntimeProvider>
  )
}
