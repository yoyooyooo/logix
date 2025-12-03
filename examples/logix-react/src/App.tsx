import React from "react"
import {
  NavLink as RouterNavLink,
  Route as RouterRoute,
  Routes as RouterRoutes,
} from "react-router-dom"
import { GlobalRuntimeLayout } from "./demos/GlobalRuntimeLayout"
import { AppDemoLayout } from "./demos/AppDemoLayout"
import { LocalModuleLayout } from "./demos/LocalModuleLayout"
import { FractalRuntimeLayout } from "./demos/FractalRuntimeLayout"
import { FormDemoLayout } from "./demos/FormDemoLayout"
import { LinkDemoLayout } from "./demos/LinkDemoLayout"
import { LayerOverrideDemoLayout } from "./demos/LayerOverrideDemoLayout"
import "./style.css"

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
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                  }`
                }
              >
                全局 Runtime
                <span className="block text-[10px] opacity-80 font-normal mt-0.5">
                  ManagedRuntime & Tag 共享
                </span>
              </NavLink>
              <NavLink
                to="/app-counter"
                className={({ isActive }: { isActive: boolean }) =>
                  `w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 block ${
                    isActive
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                  }`
                }
              >
                LogixRuntime 计数器
                <span className="block text-[10px] opacity-80 font-normal mt-0.5">
                  单模块 Runtime 定义
                </span>
              </NavLink>
              <NavLink
                to="/link-demo"
                className={({ isActive }: { isActive: boolean }) =>
                  `w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 block ${
                    isActive
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                  }`
                }
              >
                Link 多模块协作
                <span className="block text-[10px] opacity-80 font-normal mt-0.5">
                  Link.make + Module.id 访问句柄
                </span>
              </NavLink>
              <NavLink
                to="/local-module"
                className={({ isActive }: { isActive: boolean }) =>
                  `w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 block ${
                    isActive
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                  }`
                }
              >
                局部 ModuleImpl
                <span className="block text-[10px] opacity-80 font-normal mt-0.5">
                  组件级状态
                </span>
              </NavLink>
              <NavLink
                to="/fractal-runtime"
                className={({ isActive }: { isActive: boolean }) =>
                  `w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 block ${
                    isActive
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                  }`
                }
              >
                分形 Runtime 树
                <span className="block text-[10px] opacity-80 font-normal mt-0.5">
                  嵌套 RuntimeProvider + Layer
                </span>
              </NavLink>
              <NavLink
                to="/layer-override"
                className={({ isActive }: { isActive: boolean }) =>
                  `w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 block ${
                    isActive
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                  }`
                }
              >
                Env 差异化示例
                <span className="block text-[10px] opacity-80 font-normal mt-0.5">
                  RuntimeProvider.layer 控制步长
                </span>
              </NavLink>
              <NavLink
                to="/form-demo"
                className={({ isActive }: { isActive: boolean }) =>
                  `w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 block ${
                    isActive
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                  }`
                }
              >
                表单 Demo
                <span className="block text-[10px] opacity-80 font-normal mt-0.5">
                  脏标记与校验
                </span>
              </NavLink>
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
            <Route path="/fractal-runtime" element={<FractalRuntimeLayout />} />
            <Route path="/form-demo" element={<FormDemoLayout />} />
            <Route path="/link-demo" element={<LinkDemoLayout />} />
            <Route path="/layer-override" element={<LayerOverrideDemoLayout />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}
