import React from "react"
import {
  NavLink as RouterNavLink,
  Navigate as RouterNavigate,
  Route as RouterRoute,
  Routes as RouterRoutes,
} from "react-router-dom"
import { formCases } from "./cases/index"
import { SectionTitle } from "./cases/shared"

// Cast router components to any to avoid version-mismatch JSX typing issues in this example project.
const NavLink: any = RouterNavLink
const Route: any = RouterRoute
const Routes: any = RouterRoutes
const Navigate: any = RouterNavigate

const basePath = "/form-cases"

const CaseNav: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    {formCases.map((c) => (
      <NavLink
        key={c.id}
        to={`${basePath}/${c.to}`}
        className={({ isActive }: { isActive: boolean }) =>
          [
            "block rounded-xl border p-4 transition-colors",
            isActive
              ? "border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20"
              : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/60",
          ].join(" ")
        }
      >
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {c.id}. {c.title}
          </div>
          <div className="text-[11px] font-mono text-gray-400">{c.to}</div>
        </div>
        <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">{c.desc}</div>
      </NavLink>
    ))}
  </div>
)

export const FormCasesDemoLayout: React.FC = () => {
  return (
    <div className="space-y-6">
      <SectionTitle
        title="ToB 表单案例集（Form + Trait + Query）"
        desc="这组案例用于“压力测试式”验证 007 的表单/查询链路：动态数组、联动、异步资源、错误树与交互态。"
      />

      <CaseNav />

      <div className="pt-2">
        <Routes>
          <Route index element={<Navigate to={`${basePath}/${formCases[0]!.to}`} replace />} />
          {formCases.map((c) => (
            <Route key={c.id} path={c.to} element={c.element} />
          ))}
        </Routes>
      </div>
    </div>
  )
}

