import React from 'react'
import { FieldFormDemoLayout } from './form/FieldFormDemoLayout'
import { ConvergeControlPlanePanel, type ConvergeControlPlaneChange } from '../sections/ConvergeControlPlanePanel'

/**
 * 字段行为 + StateTransaction + Devtools 综合演示页
 *
 * 目标：
 * - 在同一页面串联字段行为示例与 Devtools 观测面；
 * - 引导你打开 Devtools，观察 StateTransaction、时间线、时间旅行与渲染事件；
 * - 作为性能体验入口，对比不同字段行为密度下的一次交互成本。
 *
 * 浏览器侧检查面由应用根部的本地 wiring 统一挂载，
 * 本页面只负责提供合适的示例模块与说明文字。
 */
export const FieldTxnDevtoolsDemoLayout: React.FC = () => {
  const [controlPlane, setControlPlane] = React.useState<ConvergeControlPlaneChange>({})

  return (
    <div className="space-y-8">
      <section className="border-b border-gray-200 dark:border-gray-800 pb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          字段行为 + StateTransaction + Devtools · 综合演示
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed">
          这个页面把表单字段行为与 StateTransaction / Devtools 组合在一起，方便你按照文档中的 「事务视图 → 时间旅行 →
          渲染事件 → 时间轴总览条」路径做端到端验证。 建议在浏览器右下角打开本地调试面板
          面板，然后依次体验下方示例。
        </p>
        <ul className="mt-3 text-xs text-gray-500 dark:text-gray-400 space-y-1 list-disc list-inside">
          <li>在简单表单示例中，观察“一次输入 = 一次事务 = 一次状态提交”的时间线。</li>
          <li>使用 Devtools 的时间旅行按钮（事务前 / 事务后 / 返回最新状态）体验状态回放行为。</li>
          <li>在开启/关闭渲染事件与不同观测模式下，对比 Overview Strip 中的事务密度与渲染密度。</li>
        </ul>
      </section>

      <ConvergeControlPlanePanel onChange={setControlPlane} knownModuleIds={['FieldFormModule']} />

      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          场景一：FieldForm · 脏标记字段行为与事务基础
        </h3>
        <p className="text-xs text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed">
          先在「表单脏标记字段行为」区域中缓慢输入几次文本，然后在 Devtools 中选中对应的事务： 你应该只看到一条{' '}
          <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">state:update</code>{' '}
          事件，以及与该事务共享同一 <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">txnId</code> 的
          字段行为 / 渲染事件。
        </p>
        <FieldFormDemoLayout layer={controlPlane.layer} />
      </section>

    </div>
  )
}
