import React from 'react'
import { Link } from 'react-router-dom'

const IndexLink: React.FC<{
  readonly to: string
  readonly title: string
  readonly description: string
}> = ({ to, title, description }) => (
  <Link
    to={to}
    className="block rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
  >
    <div className="font-semibold text-gray-900 dark:text-white">{title}</div>
    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</div>
  </Link>
)

export const PlatformVizIndex: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Platform Visualization Lab</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
          这里是“消费者回归面 / 解释粒度试验场”：把 `@logixjs/core` 的 IR 与证据输出拆成独立页面，验证信息架构与
          diff 口径，并为后续平台/画布化组合提供可复用能力块。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <IndexLink
          to="/platform-viz/manifest"
          title="Manifest Inspector"
          description="选择一个预置模块并调用 Reflection.extractManifest，查看摘要 + Raw JSON（支持 includeStaticIr / maxBytes）。"
        />
        <IndexLink
          to="/platform-viz/manifest-diff"
          title="Manifest Diff Viewer"
          description="before/after 支持模块选择或 JSON 粘贴，调用 Reflection.diffManifest，查看 verdict/summary/changes。"
        />
        <IndexLink
          to="/trial-run-evidence"
          title="TrialRun Evidence（既有页面）"
          description="运行一次浏览器侧受控 TrialRun，查看 EvidencePackage.summary（动态证据回归面）。"
        />
      </div>

      <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
        <div className="text-sm font-semibold text-gray-900 dark:text-white">Pending / 对齐提示</div>
        <ul className="mt-2 text-xs text-gray-600 dark:text-gray-300 space-y-1 list-disc list-inside">
          <li>本 Lab 只消费 JSON-safe 输出；不引入 Node-only 依赖（ts-morph/fs 等）。</li>
          <li>ModuleManifest 目前已包含 `servicePorts`（078）与 `slots/slotFills`（083）；缺失通常表示“未声明/未开启”。</li>
          <li>更大范围的 Root IR / workflowSurface / AnchorIndex / PatchPlan 等在本页面仅做入口与解释占位。</li>
        </ul>
      </div>
    </div>
  )
}

