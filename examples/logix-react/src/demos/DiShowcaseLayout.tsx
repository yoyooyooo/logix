import React from 'react'
import { Context, Effect, Layer, Schema } from 'effect'
import * as Logix from '@logix/core'
import { RuntimeProvider, useImportedModule, useModule, useRuntime, useSelector } from '@logix/react'
import { CounterDef, CounterImpl } from '../modules/counter'
import { CounterMultiDef, CounterMultiImpl } from '../modules/counterMulti'

// -----------------------------------------------------------------------------
// DI Showcase：演示 “root provider / imports-scope / local multi-instance”
// -----------------------------------------------------------------------------

interface EnvService {
  readonly name: string
}

const EnvTag = Context.GenericTag<EnvService>('@examples/di-showcase/env')
const RootEnvLayer = Layer.succeed(EnvTag, { name: 'RootEnv' })
const FeatureEnvLayer = Layer.succeed(EnvTag, { name: 'FeatureEnv' })

const counterRuntime = Logix.Runtime.make(CounterImpl, {
  label: 'DI · CounterRuntime',
  devtools: true,
  layer: RootEnvLayer,
})

const ImportedHostDef = Logix.Module.make('DiShowcaseImportedHost', {
  state: Schema.Void,
  actions: { noop: Schema.Void },
})

const ImportedHostModule = ImportedHostDef.implement({
  initial: undefined,
  imports: [CounterMultiImpl],
})

const importsRuntime = Logix.Runtime.make(ImportedHostModule, {
  label: 'DI · ImportsRuntime',
  devtools: true,
})

let warmupPromise: Promise<void> | null = null
const warmupRuntimes = (): Promise<void> => {
  if (warmupPromise) return warmupPromise
  warmupPromise = Promise.all([counterRuntime.runPromise(Effect.void), importsRuntime.runPromise(Effect.void)]).then(
    () => undefined,
  )
  return warmupPromise
}

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
  const ref =
    kind === 'global' ? useModule(CounterDef) : options ? useModule(CounterImpl, options) : useModule(CounterImpl)

  const value = useSelector(ref, (s) => s.value)

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
          {kind === 'global' ? 'useModule(ModuleTag)' : 'useModule(ModuleImpl)'}
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

const RootResolveProbe: React.FC = () => {
  const runtime = useRuntime()
  const [currentEnv, setCurrentEnv] = React.useState<string>('(loading)')
  const [rootEnv, setRootEnv] = React.useState<string>('(loading)')

  React.useEffect(() => {
    void runtime
      .runPromise(
        Effect.gen(function* () {
          const env = yield* EnvTag
          return env.name
        }),
      )
      .then(setCurrentEnv)

    void runtime.runPromise(Logix.Root.resolve(EnvTag).pipe(Effect.map((env) => env.name))).then(setRootEnv)
  }, [runtime])

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-900 dark:text-white">Root.resolve vs 当前 Env</div>
        <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium">
          root provider
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 p-3">
          <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-1">当前 Provider（受 layer 覆盖）</div>
          <div className="font-mono text-xs text-gray-900 dark:text-gray-100 break-all">{currentEnv}</div>
        </div>
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 p-3">
          <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-1">Root.resolve（固定 root provider）</div>
          <div className="font-mono text-xs text-gray-900 dark:text-gray-100 break-all">{rootEnv}</div>
        </div>
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
        <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[11px] font-mono">
          RuntimeProvider.layer
        </code>{' '}
        只影响“当前子树”的 Env；当你需要显式拿到 root provider 的单例（类似 Angular 的 root provider），使用{' '}
        <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[11px] font-mono">
          Logix.Root.resolve(Tag)
        </code>
        。
      </div>
    </div>
  )
}

const ImportsPanel: React.FC = () => {
  const host = useModule(ImportedHostDef)
  const childByGet = host.imports.get(CounterMultiDef.tag)
  const childByHook = useImportedModule(host, CounterMultiDef.tag)

  const count = useSelector(childByHook, (s) => s.count)

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

export const DiShowcaseLayout: React.FC = () => {
  const [isReady, setIsReady] = React.useState(false)
  const [warmupError, setWarmupError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false

    warmupRuntimes()
      .then(() => {
        if (cancelled) return
        setIsReady(true)
      })
      .catch((e) => {
        if (cancelled) return
        setWarmupError(e instanceof Error ? e.message : String(e))
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (!isReady) {
    return (
      <div className="space-y-10">
        <div className="border-b border-gray-200 dark:border-gray-800 pb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            DI Showcase（Root / Imports / Instances）
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed">
            这页把 React + Logix 的 DI 用法放到同一个视图里对照：全局单例（ModuleTag）、局部多实例（ModuleImpl +
            key）、imports-scope（Host.imports / useImportedModule），以及 Root.resolve 的 root provider 语义。
          </p>
        </div>

        {warmupError ? (
          <div className="rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/30 p-4 space-y-2">
            <div className="text-sm font-semibold text-red-700 dark:text-red-300">DI Showcase 初始化失败</div>
            <div className="font-mono text-xs text-red-700 dark:text-red-200 break-all">{warmupError}</div>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 p-4">
            <div className="text-sm text-gray-700 dark:text-gray-300">正在预热 Runtime…</div>
            <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
              这页会同时启动两个 Runtime（root provider + imports-scope），避免切路由时卡顿。
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-10">
      <div className="border-b border-gray-200 dark:border-gray-800 pb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          DI Showcase（Root / Imports / Instances）
        </h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed">
          这页把 React + Logix 的 DI 用法放到同一个视图里对照：全局单例（ModuleTag）、局部多实例（ModuleImpl +
          key）、imports-scope（Host.imports / useImportedModule），以及 Root.resolve 的 root provider 语义。
        </p>
      </div>

      <RuntimeProvider
        runtime={counterRuntime}
        fallback={<p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>}
      >
        <div className="space-y-6">
          <Card
            title="1) 全局单例 vs 局部多实例"
            subtitle="同一个 Module 蓝图：useModule(ModuleTag) 取 root 单例；useModule(ModuleImpl) 创建组件级多实例（key 相同则复用）。"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <CounterPanel title="全局单例（root provider）" kind="global" />
              <CounterPanel title="局部实例（缺省 key：组件级独立）" kind="local" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <CounterPanel title='多实例 A（key="A"）' kind="local" options={{ key: 'A', label: 'A' }} />
              <CounterPanel title='多实例 B（key="B"）' kind="local" options={{ key: 'B', label: 'B' }} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <CounterPanel
                title='同 key 复用（key="shared" · 视图 1）'
                kind="local"
                options={{ key: 'shared', label: 'Shared' }}
              />
              <CounterPanel
                title='同 key 复用（key="shared" · 视图 2）'
                kind="local"
                options={{ key: 'shared', label: 'Shared' }}
              />
            </div>
          </Card>

          <Card
            title="2) Root.resolve（固定 root provider）"
            subtitle="Root.resolve 用于显式拿到 root provider 的单例，不受嵌套 RuntimeProvider.layer 覆盖影响。"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  根 Provider：提供 <code className="font-mono">EnvTag=RootEnv</code>
                </div>
                <RootResolveProbe />
              </div>

              <RuntimeProvider
                layer={FeatureEnvLayer}
                fallback={<p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>}
              >
                <div className="space-y-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    子树 Provider：覆盖 <code className="font-mono">EnvTag=FeatureEnv</code>
                  </div>
                  <RootResolveProbe />
                </div>
              </RuntimeProvider>
            </div>
          </Card>
        </div>
      </RuntimeProvider>

      <RuntimeProvider
        runtime={importsRuntime}
        fallback={<p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>}
      >
        <Card
          title="3) imports-scope：host.imports.get / useImportedModule"
          subtitle="子模块实例属于 Host 的 scope：组件内通过 host.imports 或 useImportedModule 解析；Logic 内则通过 $.use(Child.module)。"
        >
          <ImportsPanel />
        </Card>
      </RuntimeProvider>
    </div>
  )
}
