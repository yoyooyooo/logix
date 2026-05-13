import React from 'react'
import { Effect, Layer, Schema, ServiceMap } from 'effect'
import * as Logix from '@logixjs/core'
import { RuntimeProvider, fieldValue, useImportedModule, useModule, useRuntime, useSelector } from '@logixjs/react'
import { Counter, CounterProgram } from '../modules/counter'
import { CounterMulti, CounterMultiProgram } from '../modules/counterMulti'

// -----------------------------------------------------------------------------
// Host projection showcase：演示 root provider / imports-scope / local multi-instance
// -----------------------------------------------------------------------------

export type DiShowcaseView = 'combined' | 'root-provider' | 'imports-scope'

interface EnvService {
  readonly name: string
}

const EnvTag = ServiceMap.Service<EnvService>('@examples/host-root-imports/env')
const RootEnvLayer = Layer.succeed(EnvTag, { name: 'RootEnv' })
const FeatureEnvLayer = Layer.succeed(EnvTag, { name: 'FeatureEnv' })

const counterRuntime = Logix.Runtime.make(CounterProgram, {
  label: 'DI · CounterRuntime',
  devtools: true,
  layer: RootEnvLayer,
})

const ImportedHost = Logix.Module.make('DiShowcaseImportedHost', {
  state: Schema.Void,
  actions: { noop: Schema.Void },
})

const ImportedHostProgram = Logix.Program.make(ImportedHost, {
  initial: undefined,
  capabilities: {
    imports: [CounterMultiProgram],
  },
})

const importsRuntime = Logix.Runtime.make(ImportedHostProgram, {
  label: 'DI · ImportsRuntime',
  devtools: true,
})

const Card: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({
  title,
  subtitle,
  children,
}) => {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 space-y-4">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        {subtitle ? <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  )
}

const CounterPanel: React.FC<{
  title: string
  kind: 'global' | 'local'
  options?: { key?: string; label?: string }
}> = ({ title, kind, options }) => {
  const ref = kind === 'global' ? useModule(Counter.tag) : options ? useModule(CounterProgram, options) : useModule(CounterProgram)

  const value = useSelector(ref, fieldValue('value'))

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-gray-900 dark:text-white">{title}</div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 font-mono break-all">
            instanceId: {String(ref.runtime.instanceId)}
          </div>
        </div>
        <span className="px-2 py-0.5 text-[10px] rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-medium">
          {kind === 'global' ? 'useModule(ModuleTag)' : 'useModule(Program)'}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500 dark:text-gray-400">value</span>
        <span className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{value}</span>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95"
          onClick={() => ref.actions.dec()}
        >
          -1
        </button>
        <button
          type="button"
          className="flex-1 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 active:bg-indigo-800 transition-all active:scale-95 shadow-sm shadow-indigo-600/20"
          onClick={() => ref.actions.inc()}
        >
          +1
        </button>
      </div>
    </div>
  )
}

const RuntimeEnvPanel: React.FC = () => {
  const runtime = useRuntime()
  const [currentEnv, setCurrentEnv] = React.useState<string>('(loading)')

  React.useEffect(() => {
    let cancelled = false

    void runtime
      .runPromise(
        Effect.gen(function* () {
          const env = yield* Effect.service(EnvTag).pipe(Effect.orDie)
          return env.name
        }),
      )
      .then((envName) => {
        if (!cancelled) setCurrentEnv(envName)
      })
      .catch((error) => {
        if (!cancelled) setCurrentEnv(error instanceof Error ? error.message : String(error))
      })

    return () => {
      cancelled = true
    }
  }, [runtime])

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-900 dark:text-white">Runtime scope Env</div>
        <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium">
          runtime scope
        </span>
      </div>

      <div className="rounded-lg bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 p-3 text-sm">
        <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-1">当前 Provider（受 layer 覆盖）</div>
        <div className="font-mono text-xs text-gray-900 dark:text-gray-100 break-all">{currentEnv}</div>
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
        <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[11px] font-mono">
          subtree layer
        </code>{' '}
        只影响“当前子树”的 Env。当前推荐写法里，service 读取统一以当前 runtime scope 为准，不再保留额外的 fixed-root expert route。
      </div>
    </div>
  )
}

const ImportsPanel: React.FC = () => {
  const host = useModule(ImportedHost.tag)
  const childByGet = host.imports.get(CounterMulti.tag)
  const childByHook = useImportedModule(host, CounterMulti.tag)

  const count = useSelector(childByHook, fieldValue('count'))

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-2">
        <div className="text-sm font-semibold text-gray-900 dark:text-white">Host（root module）</div>
        <div className="text-[11px] text-gray-500 dark:text-gray-400 font-mono break-all">
          instanceId: {String(host.runtime.instanceId)}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          子模块只在 Host 的 imports-scope 内可见：在 React 里优先通过{' '}
          <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[11px] font-mono">
            host.imports.get(Child.tag)
          </code>{' '}
          或{' '}
          <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[11px] font-mono">
            useImportedModule(host, Child.tag)
          </code>{' '}
          解析（避免串实例）。
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="text-sm font-semibold text-gray-900 dark:text-white">Child（来自 imports）</div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 font-mono break-all">
              instanceId(get): {String(childByGet.runtime.instanceId)}
              <br />
              instanceId(hook): {String(childByHook.runtime.instanceId)}
            </div>
          </div>
          <span className="px-2 py-0.5 text-[10px] rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 font-medium">
            imports-scope
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">count</span>
          <span className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{count}</span>
        </div>

        <button
          type="button"
          className="w-full px-3 py-2 rounded-lg bg-violet-600 text-white text-sm hover:bg-violet-700 active:bg-violet-800 transition-all active:scale-95 shadow-sm shadow-violet-600/20"
          onClick={() => childByHook.actions.increment()}
        >
          increment
        </button>
      </div>
    </div>
  )
}

const getViewCopy = (view: DiShowcaseView): { readonly title: string; readonly summary: string; readonly loadingHint: string } => {
  if (view === 'root-provider') {
    return {
      title: 'Host Projection · Root Provider',
      summary: '这页直达 root provider 单例与 runtime scope Env 语义。',
      loadingHint: '这页会启动 root provider Runtime 视图。',
    }
  }
  if (view === 'imports-scope') {
    return {
      title: 'Host Projection · Imports Scope',
      summary: '这页直达 root module imports 与 child module resolution 语义。',
      loadingHint: '这页会启动 imports scope Runtime 视图。',
    }
  }
  return {
    title: 'Host Projection · Root / Imports / Env',
    summary: '这页把 React 宿主上的 provider 读取方式放到同一个视图里对照：全局单例、runtime scope Env、imports scope，以及 `Root.resolve` 的 root provider 语义。',
    loadingHint: '这页会同时启动两个 Runtime 视图（root provider + imports scope），避免切路由时卡顿。',
  }
}

export const DiShowcaseLayout: React.FC<{ readonly view?: DiShowcaseView }> = ({ view = 'combined' }) => {
  const copy = getViewCopy(view)
  const showRootProviderDemo = view !== 'imports-scope'
  const showImportsDemo = view !== 'root-provider'

  return (
    <div className="space-y-10">
      <div className="border-b border-gray-200 dark:border-gray-800 pb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{copy.title}</h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed">
          {copy.summary}
        </p>
      </div>

      {showRootProviderDemo && (
        <RuntimeProvider
          runtime={counterRuntime}
          fallback={<p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>}
        >
          <div className="space-y-6">
            <Card
              title="1) Root provider singleton"
              subtitle="Root Provider 提供 CounterProgram，组件通过 useModule(ModuleTag) 直达 root 单例。局部多实例行为由 /local-program 与 /session-program 单独承载。"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <CounterPanel title="全局单例（root provider）" kind="global" />
              </div>
            </Card>

            <Card
              title="2) Runtime scope Env"
              subtitle="当前示例展示 subtree layer 如何覆盖当前 runtime scope 内的 Env 读取。"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    根 Provider：提供 <code className="font-mono">EnvTag=RootEnv</code>
                  </div>
                  <RuntimeEnvPanel />
                </div>

                <RuntimeProvider
                  runtime={counterRuntime}
                  layer={FeatureEnvLayer}
                  fallback={<p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>}
                >
                  <div className="space-y-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      子树 Provider：覆盖 <code className="font-mono">EnvTag=FeatureEnv</code>
                    </div>
                    <RuntimeEnvPanel />
                  </div>
                </RuntimeProvider>
              </div>
            </Card>
          </div>
        </RuntimeProvider>
      )}

      {showImportsDemo && (
        <RuntimeProvider
          runtime={importsRuntime}
          fallback={<p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>}
        >
          <Card
            title="3) imports scope：host.imports.get / useImportedModule"
            subtitle="子模块实例属于 Host 的 scope：组件内通过 host.imports 或 useImportedModule 解析；Logic 内固定走 $.imports.get(Child.tag) 再配 child.read(selector)。"
          >
            <ImportsPanel />
          </Card>
        </RuntimeProvider>
      )}
    </div>
  )
}
