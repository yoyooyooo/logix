import React from 'react'
import { Effect, Layer, ServiceMap } from 'effect'
import * as Logix from '@logixjs/core'
import { RuntimeProvider, fieldValue, useModule, useRuntime, useSelector } from '@logixjs/react'
import { Counter, CounterProgram } from '../modules/counter'

// 演示 host projection：同一 Runtime 上叠加不同 subtree layer。

// 简单的 Theme 服务，用于观察 Layer 注入前后的差异。
interface ThemeService {
  readonly name: string
}

const ThemeTag = ServiceMap.Service<ThemeService>('@examples/ThemeService')

const GlobalThemeLayer = Layer.succeed(ThemeTag, { name: 'GlobalTheme' })
const FeatureThemeLayer = Layer.succeed(ThemeTag, { name: 'FeatureTheme' })

// 应用级 Runtime：承载 Debug / Devtools 与业务模块，Theme 通过 subtree layer 注入，
// 便于在不同 Provider 子树中组合不同 Env（例如 ThemeService）而共用同一 Runtime。
const appRuntime = Logix.Runtime.make(CounterProgram, {
  label: 'FractalRuntimeDemo',
  devtools: true,
})

const ThemeScopePanel: React.FC<{ label: string }> = ({ label }) => {
  const runtime = useRuntime()
  const [themeName, setThemeName] = React.useState<string>('(unknown)')

  React.useEffect(() => {
    void runtime.runPromise(
      Effect.gen(function* () {
        const theme = yield* Effect.service(ThemeTag).pipe(Effect.orDie)
        setThemeName(theme.name)
      }),
    )
  }, [runtime])

  const counter = useModule(Counter.tag)
  const value = useSelector(Counter.tag, fieldValue('value'))

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {label}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            主题：<code className="font-mono">{themeName}</code>
          </span>
        </div>
        <span className="px-2 py-0.5 text-[10px] rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-medium">
          CounterProgram
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500 dark:text-gray-400">当前值</span>
        <span className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{value}</span>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95"
          onClick={() => counter.actions.dec()}
        >
          -1
        </button>
        <button
          type="button"
          className="flex-1 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 active:bg-indigo-800 transition-all active:scale-95 shadow-sm shadow-indigo-600/20"
          onClick={() => counter.actions.inc()}
        >
          +1
        </button>
      </div>
    </div>
  )
}

export const FractalRuntimeLayout: React.FC = () => {
  return (
    <RuntimeProvider runtime={appRuntime} layer={GlobalThemeLayer}>
      <div className="space-y-8">
        <div className="border-b border-gray-200 dark:border-gray-800 pb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Host Projection · Nested Providers</h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed">
            本示例展示 React 宿主如何在同一 Runtime 上叠加 subtree layer。两个区域共享同一个{' '}
            <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono text-pink-600 dark:text-pink-400">
              CounterProgram
            </code>
            ，但读取到的{' '}
            <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono text-pink-600 dark:text-pink-400">
              ThemeService
            </code>{' '}
            值不同。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ThemeScopePanel label="根 Provider 子树" />

          <RuntimeProvider layer={FeatureThemeLayer}>
            <ThemeScopePanel label="嵌套 Provider 子树" />
          </RuntimeProvider>
        </div>
      </div>
    </RuntimeProvider>
  )
}
