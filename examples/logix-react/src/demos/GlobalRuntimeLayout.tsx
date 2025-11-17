import React from 'react'
import { RuntimeProvider } from '@logix/react'
import { Layer, ManagedRuntime } from 'effect'
import * as Logix from '@logix/core'
import { CounterImpl } from '../modules/counter'
import { CounterAllImpl } from '../modules/counterAll'
import { CounterMultiImpl } from '../modules/counterMulti'
import { CounterRunFork, CounterAllDemo, TagSharedCounter, ImplLocalCounter } from '../sections/GlobalRuntimeSections'

// 应用级 Runtime：基于多个 ModuleImpl 的 Layer 构建，所有使用 Tag 的组件共享这棵 Runtime。
const globalRuntime = ManagedRuntime.make(
  Layer.mergeAll(
    Logix.Debug.runtimeLabel('GlobalRuntime'),
    Logix.Debug.devtoolsHubLayer(),
    CounterImpl.layer,
    CounterAllImpl.layer,
    CounterMultiImpl.layer,
  ),
)

export const GlobalRuntimeLayout: React.FC = () => {
  return (
    <RuntimeProvider runtime={globalRuntime}>
      <div className="space-y-10">
        <div className="border-b border-gray-200 dark:border-gray-800 pb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">全局 Runtime · 多种 Counter Watcher</h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed">
            该示例展示了在应用级 Runtime 中，通过模块 Tag 访问模块实例的典型模式。 使用同一 Tag 的组件会共享同一个
            ModuleRuntime 实例。
          </p>
        </div>

        {/* Watcher 模式对比：runFork vs Effect.all + run */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800"></div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Watcher 模式</span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex-1">
              <CounterRunFork />
            </div>
            <div className="flex-1">
              <CounterAllDemo />
            </div>
          </div>
        </section>

        {/* 实例维度：Tag（全局实例共享） vs ModuleImpl（组件局部实例） */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800"></div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Instance Scope</span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="mb-2">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  Tag 模式
                  <span className="text-xs font-normal text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                    全局共享实例
                  </span>
                </h4>
                <p className="text-sm text-gray-500 mt-1">
                  下方两个区域都通过 <code>useModule(CounterMultiDef)</code> 访问同一个 Counter 实例，
                  在其中一个区域进行的修改会在另一个区域中同步体现。
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <TagSharedCounter />
                <TagSharedCounter />
              </div>
            </div>

            <div className="space-y-4">
              <div className="mb-2">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  ModuleImpl 模式
                  <span className="text-xs font-normal text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                    组件局部实例
                  </span>
                </h4>
                <p className="text-sm text-gray-500 mt-1">
                  下方两个区域通过 <code>useModule(CounterMultiImpl)</code> 在组件内部构造局部实例，
                  各自维护独立的计数状态。
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <ImplLocalCounter />
                <ImplLocalCounter />
              </div>
            </div>
          </div>
        </section>
      </div>
    </RuntimeProvider>
  )
}
