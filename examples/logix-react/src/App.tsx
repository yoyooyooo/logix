import React from 'react'
import { NavLink as RouterNavLink, Route as RouterRoute, Routes as RouterRoutes } from 'react-router-dom'
import { GlobalRuntimeLayout } from './demos/GlobalRuntimeLayout'
import { AppDemoLayout } from './demos/AppDemoLayout'
import { LocalModuleLayout } from './demos/LocalModuleLayout'
import { AsyncLocalModuleLayout } from './demos/AsyncLocalModuleLayout'
import { FractalRuntimeLayout } from './demos/FractalRuntimeLayout'
import { FormDemoLayout } from './demos/form/FormDemoLayout'
import { LinkDemoLayout } from './demos/LinkDemoLayout'
import { ProcessSubtreeDemo } from './demos/ProcessSubtreeDemo'
import { LayerOverrideDemoLayout } from './demos/LayerOverrideDemoLayout'
import { SessionModuleLayout } from './demos/SessionModuleLayout'
import { SuspenseModuleLayout } from './demos/SuspenseModuleLayout'
import { CounterWithProfileDemo } from './demos/CounterWithProfileDemo'
import { TraitFormDemoLayout } from './demos/form/TraitFormDemoLayout'
import { ComplexFormDemoLayout } from './demos/form/ComplexFormDemoLayout'
import { ComplexTraitFormDemoLayout } from './demos/form/ComplexTraitFormDemoLayout'
import { QuerySearchDemoLayout } from './demos/form/QuerySearchDemoLayout'
import { FormCasesDemoLayout } from './demos/form/FormCasesDemoLayout'
import { MiddlewareDemoLayout } from './demos/MiddlewareDemoLayout'
import { TraitTxnDevtoolsDemoLayout } from './demos/trait-txn-devtools-demo'
import { TaskRunnerDemoLayout } from './demos/TaskRunnerDemoLayout'
import { DiShowcaseLayout } from './demos/DiShowcaseLayout'
import { I18nDemoLayout } from './demos/I18nDemoLayout'
import { PerfTuningLabLayout } from './demos/PerfTuningLabLayout'
import { TrialRunEvidenceDemo } from './demos/TrialRunEvidenceDemo'
import { LogixDevtools } from '@logixjs/devtools-react'
import './style.css'

// Cast router components to any to avoid version-mismatch JSX typing issues in this example project.
// This does not affect runtime behavior and keeps focus on Logix integration.
const NavLink: any = RouterNavLink
const Route: any = RouterRoute
const Routes: any = RouterRoutes

export function App() {
  return (
    <div className="flex h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans">
      <aside className="w-72 border-r border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-xl flex flex-col">
        <div className="p-6 border-b border-gray-200/50 dark:border-gray-800/50">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Logix + React
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium tracking-wide uppercase">
            示例与演示
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="px-3 py-2">
            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              场景列表
            </h2>
            <div className="space-y-1">
              <NavLink
                to="/"
                end
                className={({ isActive }: { isActive: boolean }) =>
                  `w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 block ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`
                }
              >
                全局 Runtime
                <span className="block text-[10px] opacity-80 font-normal mt-0.5">ManagedRuntime & Tag 共享</span>
              </NavLink>
              <NavLink
                to="/app-counter"
                className={({ isActive }: { isActive: boolean }) =>
                  `w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 block ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`
                }
              >
                Runtime 计数器
                <span className="block text-[10px] opacity-80 font-normal mt-0.5">单模块 Runtime 定义</span>
              </NavLink>
              <NavLink
                to="/link-demo"
                className={({ isActive }: { isActive: boolean }) =>
                  `w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 block ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`
                }
              >
                Link 多模块协作
                <span className="block text-[10px] opacity-80 font-normal mt-0.5">Link.make + Module.id 访问句柄</span>
              </NavLink>
              <NavLink
                to="/process-subtree"
                className={({ isActive }: { isActive: boolean }) =>
                  `w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 block ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`
                }
              >
                Process 子树安装点
                <span className="block text-[10px] opacity-80 font-normal mt-0.5">
                  useProcesses · mount/unmount 生命周期
                </span>
              </NavLink>
              <NavLink
                to="/local-module"
                className={({ isActive }: { isActive: boolean }) =>
                  `w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 block ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`
                }
              >
                局部 ModuleImpl
                <span className="block text-[10px] opacity-80 font-normal mt-0.5">组件级状态</span>
              </NavLink>
              <NavLink
                to="/async-local-module"
                className={({ isActive }: { isActive: boolean }) =>
                  `w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 block ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`
                }
              >
                异步局部 ModuleImpl
                <span className="block text-[10px] opacity-80 font-normal mt-0.5">suspend:true + ModuleCache</span>
              </NavLink>
              <NavLink
                to="/session-module"
                className={({ isActive }: { isActive: boolean }) =>
                  `w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 block ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`
                }
              >
                会话级 Module
                <span className="block text-[10px] opacity-80 font-normal mt-0.5">key + gcTime Session Pattern</span>
              </NavLink>
              <NavLink
                to="/fractal-runtime"
                className={({ isActive }: { isActive: boolean }) =>
                  `w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 block ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`
                }
              >
                分形 Runtime 树
                <span className="block text-[10px] opacity-80 font-normal mt-0.5">嵌套 RuntimeProvider + Layer</span>
              </NavLink>
              <NavLink
                to="/di-showcase"
                className={({ isActive }: { isActive: boolean }) =>
                  `w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 block ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`
                }
              >
                DI Showcase
                <span className="block text-[10px] opacity-80 font-normal mt-0.5">Root / Imports / Instances</span>
              </NavLink>
              <NavLink
                to="/i18n-demo"
                className={({ isActive }: { isActive: boolean }) =>
                  `w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 block ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`
                }
              >
                i18n Demo
                <span className="block text-[10px] opacity-80 font-normal mt-0.5">root 单例 + message token</span>
              </NavLink>
              <NavLink
                to="/layer-override"
                className={({ isActive }: { isActive: boolean }) =>
                  `w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 block ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`
                }
              >
                Env 差异化示例
                <span className="block text-[10px] opacity-80 font-normal mt-0.5">RuntimeProvider.layer 控制步长</span>
              </NavLink>
              <NavLink
                to="/middleware-demo"
                className={({ isActive }: { isActive: boolean }) =>
                  `w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 block ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`
                }
              >
                中间件总线示例
                <span className="block text-[10px] opacity-80 font-normal mt-0.5">EffectOp MiddlewareStack</span>
              </NavLink>
              <NavLink
                to="/task-runner-demo"
                className={({ isActive }: { isActive: boolean }) =>
                  `w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 block ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`
                }
              >
                Task Runner 长链路
                <span className="block text-[10px] opacity-80 font-normal mt-0.5">runLatestTask / runExhaustTask</span>
              </NavLink>
              <NavLink
                to="/suspense-module"
                className={({ isActive }: { isActive: boolean }) =>
                  `w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 block ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`
                }
              >
                真实 Suspense 演示
                <span className="block text-[10px] opacity-80 font-normal mt-0.5">Async Layer 依赖</span>
              </NavLink>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-800">
              <h3 className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                表单 / Query 场景
              </h3>
              <div className="space-y-1">
                <NavLink
                  to="/form-demo"
                  className={({ isActive }: { isActive: boolean }) =>
                    `w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 block ${
                      isActive
                        ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                    }`
                  }
                >
                  表单 Demo
                  <span className="block text-[10px] opacity-80 font-normal mt-0.5">脏标记与校验</span>
                </NavLink>
                <NavLink
                  to="/trait-form-demo"
                  className={({ isActive }: { isActive: boolean }) =>
                    `w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 block ${
                      isActive
                        ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                    }`
                  }
                >
                  （高级）表单脏标记 Traits
                  <span className="block text-[10px] opacity-80 font-normal mt-0.5">对照：dirtyCount / isDirty</span>
                </NavLink>
                <NavLink
                  to="/complex-form-demo"
                  className={({ isActive }: { isActive: boolean }) =>
                    `w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 block ${
                      isActive
                        ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                    }`
                  }
                >
                  复杂表单 Rules
                  <span className="block text-[10px] opacity-80 font-normal mt-0.5">推荐：rules + derived</span>
                </NavLink>
                <NavLink
                  to="/complex-trait-form-demo"
                  className={({ isActive }: { isActive: boolean }) =>
                    `w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 block ${
                      isActive
                        ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                    }`
                  }
                >
                  （对照）复杂表单 Traits
                  <span className="block text-[10px] opacity-80 font-normal mt-0.5">
                    高级入口：linkage + summary + validation
                  </span>
                </NavLink>
                <NavLink
                  to="/query-search-demo"
                  className={({ isActive }: { isActive: boolean }) =>
                    `w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 block ${
                      isActive
                        ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                    }`
                  }
                >
                  Query 搜索联动
                  <span className="block text-[10px] opacity-80 font-normal mt-0.5">params → source snapshot</span>
                </NavLink>
                <NavLink
                  to="/form-cases"
                  className={({ isActive }: { isActive: boolean }) =>
                    `w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 block ${
                      isActive
                        ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                    }`
                  }
                >
                  ToB 表单案例集
                  <span className="block text-[10px] opacity-80 font-normal mt-0.5">form + query + trait 压测样本</span>
                </NavLink>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-800">
              <h3 className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                StateTrait 场景
              </h3>
              <div className="space-y-1">
                <NavLink
                  to="/counter-with-profile-demo"
                  className={({ isActive }: { isActive: boolean }) =>
                    `w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 block ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                    }`
                  }
                >
                  Counter + Profile Traits
                  <span className="block text-[10px] opacity-80 font-normal mt-0.5">computed + source + link</span>
                </NavLink>
                <NavLink
                  to="/perf-tuning-lab"
                  className={({ isActive }: { isActive: boolean }) =>
                    `w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 block ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                    }`
                  }
                >
                  Perf Tuning Lab
                  <span className="block text-[10px] opacity-80 font-normal mt-0.5">013 控制面 · 调参 + 压测</span>
                </NavLink>
                <NavLink
                  to="/trial-run-evidence"
                  className={({ isActive }: { isActive: boolean }) =>
                    `w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 block ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                    }`
                  }
                >
                  TrialRun Evidence
                  <span className="block text-[10px] opacity-80 font-normal mt-0.5">
                    RunSession + EvidencePackage 导出
                  </span>
                </NavLink>
                <NavLink
                  to="/trait-txn-devtools-demo"
                  className={({ isActive }: { isActive: boolean }) =>
                    `w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 block ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                    }`
                  }
                >
                  Traits + Txn + Devtools
                  <span className="block text-[10px] opacity-80 font-normal mt-0.5">
                    事务视图 / 时间旅行 / 性能体验
                  </span>
                </NavLink>
              </div>
            </div>
          </div>
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
              在左侧选择一个场景，可以查看对应的 React + Logix 集成示例。
            </p>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-white dark:bg-gray-950">
        <div className="max-w-5xl mx-auto p-8">
          <Routes>
            <Route path="/" element={<GlobalRuntimeLayout />} />
            <Route path="/global-runtime" element={<GlobalRuntimeLayout />} />
            <Route path="/app-counter" element={<AppDemoLayout />} />
            <Route path="/local-module" element={<LocalModuleLayout />} />
            <Route path="/async-local-module" element={<AsyncLocalModuleLayout />} />
            <Route path="/session-module" element={<SessionModuleLayout />} />
            <Route path="/fractal-runtime" element={<FractalRuntimeLayout />} />
            <Route path="/di-showcase" element={<DiShowcaseLayout />} />
            <Route path="/i18n-demo" element={<I18nDemoLayout />} />
            <Route path="/form-demo" element={<FormDemoLayout />} />
            <Route path="/link-demo" element={<LinkDemoLayout />} />
            <Route path="/process-subtree" element={<ProcessSubtreeDemo />} />
            <Route path="/layer-override" element={<LayerOverrideDemoLayout />} />
            <Route path="/middleware-demo" element={<MiddlewareDemoLayout />} />
            <Route path="/task-runner-demo" element={<TaskRunnerDemoLayout />} />
            <Route path="/suspense-module" element={<SuspenseModuleLayout />} />
            {/* 内部 Demo：CounterWithProfile（StateTrait Quickstart 示例） */}
            <Route path="/counter-with-profile-demo" element={<CounterWithProfileDemo />} />
            {/* TrialRun：导出 EvidencePackage 与静态 IR 摘要 */}
            <Route path="/trial-run-evidence" element={<TrialRunEvidenceDemo />} />
            {/* ToB 表单场景：利用 StateTrait 管理脏标记与合法性 */}
            <Route path="/trait-form-demo" element={<TraitFormDemoLayout />} />
            {/* 复杂表单（推荐路径）：rules + derived */}
            <Route path="/complex-form-demo" element={<ComplexFormDemoLayout />} />
            {/* 复杂表单场景：多段信息 + 动态列表 + 联动与汇总 */}
            <Route path="/complex-trait-form-demo" element={<ComplexTraitFormDemoLayout />} />
            {/* Query 对照场景：自动触发 + 竞态门控 + 失效与复用 */}
            <Route path="/query-search-demo" element={<QuerySearchDemoLayout />} />
            {/* ToB 表单案例集：覆盖动态数组/联动/异步资源/错误树等 */}
            <Route path="/form-cases/*" element={<FormCasesDemoLayout />} />
            {/* Trait + Txn + Devtools · 综合演示页 */}
            <Route path="/trait-txn-devtools-demo" element={<TraitTxnDevtoolsDemoLayout />} />
            {/* Perf Tuning Lab：013 控制面调参 + 合成/真实压力体验 */}
            <Route path="/perf-tuning-lab" element={<PerfTuningLabLayout />} />
          </Routes>
        </div>
      </main>

      <LogixDevtools position="bottom-left" />
    </div>
  )
}
