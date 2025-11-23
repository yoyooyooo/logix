import { NavLink, Navigate, Route, Routes } from "react-router-dom"
import { BasicFormPage } from "./demos/BasicFormPage"
import { NestedFormPage } from "./demos/NestedFormPage"
import { ArrayFormPage } from "./demos/ArrayFormPage"
import { AsyncValidationPage } from "./demos/AsyncValidationPage"
import { WatchersFormPage } from "./demos/WatchersFormPage"
import { PerformanceFormPage } from "./demos/PerformanceFormPage"
import { ViewModeFormPage } from "./demos/ViewModeFormPage"
import { ModalFormPage } from "./demos/ModalFormPage"

interface DemoRoute {
  path: string
  title: string
  description: string
  element: React.ReactElement
}

const demoRoutes: DemoRoute[] = [
  {
    path: "basic",
    title: "基础与校验策略",
    description: "模式切换 + register/Field 双写法",
    element: <BasicFormPage />
  },
  {
    path: "nested",
    title: "嵌套对象",
    description: "嵌套 Struct + 局部更新",
    element: <NestedFormPage />
  },
  {
    path: "arrays",
    title: "数组字段",
    description: "push/remove 动态行",
    element: <ArrayFormPage />
  },
  {
    path: "async",
    title: "异步校验",
    description: "onBlur 触发远端校验",
    element: <AsyncValidationPage />
  },
  {
    path: "watchers",
    title: "跨字段 Watch",
    description: "派生状态/一致性检查",
    element: <WatchersFormPage />
  },
  {
    path: "perf",
    title: "性能粒度",
    description: "渲染计数与 useField",
    element: <PerformanceFormPage />
  },
  {
    path: "view-mode",
    title: "查看/禁用模式",
    description: "query/disabled 场景",
    element: <ViewModeFormPage />
  },
  {
    path: "modal",
    title: "弹窗表单",
    description: "挂载/卸载 Scope",
    element: <ModalFormPage />
  }
]

export function FormRoutes() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Effect Form 场景集合</h1>
        <p className="text-sm text-gray-600">按照 TanStack Form 研究维度划分，覆盖嵌套、数组、异步、性能等典型场景。</p>
      </div>

      <div className="grid grid-cols-[220px,1fr] gap-6 items-start">
        <nav className="space-y-1">
          {demoRoutes.map((route) => (
            <NavLink
              key={route.path}
              to={`/forms/${route.path}`}
              className={({ isActive }) =>
                `block border rounded px-3 py-2 text-sm hover:bg-gray-50 ${isActive ? "border-blue-500 text-blue-700 bg-blue-50" : "border-gray-200"}`
              }
            >
              <div className="font-medium">{route.title}</div>
              <div className="text-xs text-gray-500 mt-1">{route.description}</div>
            </NavLink>
          ))}
        </nav>

        <div className="border rounded-lg p-4 bg-gray-50">
          <Routes>
            <Route index element={<Navigate to="/forms/basic" replace />} />
            {demoRoutes.map((route) => (
              <Route key={route.path} path={`${route.path}`} element={route.element} />
            ))}
            <Route path="*" element={<Navigate to="/forms/basic" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}
