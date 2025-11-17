---
title: 示例 · 订单导出 Flow（runtimeFlows → FlowAst → Effect → Hook）
status: draft
version: v1
---

## 1. 场景简介

- **业务意图**：在订单列表页顶部点击“导出”按钮时，自动读取当前筛选条件与表格列信息，生成导出任务。
- **对应 Intent**：`docs/specs/intent-driven-ai-coding/v1/intents/order-management.intent.yaml`
- **定位**：这是一个纯行为层示例，不涉及 CLI/Plan，而是展示 Flow DSL 和 `.flow.ts` 在运行时如何配合。

## 2. 中间产物与文件

| 层级 | 产物 | 位置 / 说明 |
| --- | --- | --- |
| Intent 行为 DSL | `runtimeFlows` 中的 `exportOrders` | `order-management.intent.yaml` |
| FlowAst | 由 `Flow DSL` 解析到内存对象 | 示例代码见下文 |
| Effect 行为文件 | `.flow.ts` | `src/features/order-management/flows/export-orders.flow.ts`（示例路径） |
| Hook | `useExportOrders` | `src/features/order-management/hooks/use-export-orders.hook.ts` |
| 组件 | `OrdersToolbar` | `src/features/order-management/components/orders-toolbar.tsx` |

## 3. 行为定义（Intent.runtimeFlows → FlowAst）

在 Intent 中声明 Flow：

```yaml
runtimeFlows:
  - id: exportOrders
    trigger:
      element: toolbar.exportButton
      event: click
    pipeline:
      - call: FilterService.getCurrentFilters
        as: filters
      - call: TableUiStateService.getCurrentState
        as: tableState
      - call: ExportService.submitExportTask
        params:
          filters: "{{filters}}"
          columns: "{{tableState.visibleColumns}}"
```

解析为 FlowAst（示意）：

```ts
type FlowStep =
  | {
      _tag: 'Call'
      service: 'FilterService' | 'TableUiStateService' | 'ExportService'
      method: string
      as?: string
      params?: Record<string, unknown>
    }

interface FlowAst {
  id: string
  trigger: { element: string; event: string }
  pipeline: FlowStep[]
}

const exportOrdersAst: FlowAst = {
  id: 'exportOrders',
  trigger: { element: 'toolbar.exportButton', event: 'click' },
  pipeline: [
    {
      _tag: 'Call',
      service: 'FilterService',
      method: 'getCurrentFilters',
      as: 'filters',
    },
    {
      _tag: 'Call',
      service: 'TableUiStateService',
      method: 'getCurrentState',
      as: 'tableState',
    },
    {
      _tag: 'Call',
      service: 'ExportService',
      method: 'submitExportTask',
      params: {
        filters: '{{filters}}',
        columns: '{{tableState.visibleColumns}}',
      },
    },
  ],
}
```

## 4. Effect 行为文件（`.flow.ts`）

行为层将 FlowAst 映射为 Effect 程序：

`src/features/order-management/flows/export-orders.flow.ts`：

```ts
// 这里的 Effect 类型可以采用 effect-ts，也可以采用 v1/poc/effect.ts 中的简化版本。
type Effect<R, E, A> = (env: R) => Promise<A>

// Env 中包含行为层所需的 Service 接口
export interface ExportOrdersEnv {
  FilterService: {
    getCurrentFilters: Effect<unknown, never, { [key: string]: unknown }>
  }
  TableUiStateService: {
    getCurrentState: Effect<
      unknown,
      never,
      { visibleColumns: string[]; [key: string]: unknown }
    >
  }
  ExportService: {
    submitExportTask: Effect<
      { filters: unknown; columns: string[] },
      Error,
      void
    >
  }
}

export type ExportOrdersEffect = Effect<ExportOrdersEnv, Error, void>

export const exportOrdersFlow: ExportOrdersEffect = async (env) => {
  const filters = await env.FilterService.getCurrentFilters({})
  const tableState = await env.TableUiStateService.getCurrentState({})
  await env.ExportService.submitExportTask({
    filters,
    columns: tableState.visibleColumns,
  })
}
```

要点：

- `.flow.ts` 只定义 Effect 与 Env，不依赖 React；
- Flow DSL 中的 Service ID（FilterService/TableUiStateService/ExportService）对应 Env 中的接口；
- 平台或 LLM 可以直接对这个 Effect 文件做增量修改，而不必碰组件。

## 5. Hook：桥接 Flow 与 UI

在 UI 层，用一个 Hook 将 Flow 暴露为简单的事件处理函数：

`src/features/order-management/hooks/use-export-orders.hook.ts`：

```ts
import { useCallback } from 'react'
import type { ExportOrdersEffect, ExportOrdersEnv } from '../flows/export-orders.flow'

// 简化版 runEffect；真实项目中可替换为 effect-ts 的 runPromise 或定制运行器
async function runEffect<R, E, A>(eff: (env: R) => Promise<A>, env: R) {
  return eff(env)
}

function createExportOrdersEnv(): ExportOrdersEnv {
  // 这里注入具体实现，例如基于 Zustand/TanStack Query 的服务
  return {
    FilterService: {
      getCurrentFilters: async () => {
        // 从 Store 或 Hook 读取当前筛选条件
        return {}
      },
    },
    TableUiStateService: {
      getCurrentState: async () => {
        // 从 Store 或 Hook 读取表格 UI 状态
        return { visibleColumns: [] }
      },
    },
    ExportService: {
      submitExportTask: async ({ filters, columns }) => {
        // 调用后端导出接口
        void filters
        void columns
      },
    },
  }
}

export function useExportOrders(flow: ExportOrdersEffect = exportOrdersFlow) {
  const env = createExportOrdersEnv()

  const handleExport = useCallback(async () => {
    await runEffect(flow, env)
  }, [flow, env])

  return { handleExport }
}
```

## 5. 组件：只声明“意图”，不关心实现

最终在组件中，只需要这样使用：

```tsx
import { useExportOrders } from '../hooks/use-export-orders.hook'

export function OrdersToolbar() {
  const { handleExport } = useExportOrders()

  return (
    <div className="flex justify-end gap-2">
      <button type="button" onClick={handleExport}>
        导出当前筛选
      </button>
    </div>
  )
}
```

组件层：

- 只关心“点击按钮触发导出”这一意图；
- 不关心 filters/tableState 从哪里来、导出逻辑如何实现；
- 导出行为完全由 `.flow.ts` 中的 Effect 程序表达，并与 Intent.runtimeFlows 对应。

## 6. 小结：Flow + Effect 如何在行为层闭环

在“导出订单”这个例子中：

- **Intent 层**：在 `order-management.intent.yaml` 中定义 `exportOrders` Flow；
- **行为层（Effect）**：在 `.flow.ts` 中实现 `exportOrdersFlow: Effect<Env, Error, void>`；
- **调用层（Hook/组件）**：用 `useExportOrders` 将 Flow 暴露为 `handleExport`，组件只负责绑定事件。

这样：

- 意图（Flow DSL）与行为实现（Effect）之间有清晰的对应关系；
- 行为实现不被散落在多个组件/Store 中，而是集中在 `.flow.ts` 行为文件；
- 运行时是否使用 effect-ts，只影响 Effect 类型和运行器实现，不影响 Intent/Flow 的结构。

## 6. CLI 角色？

本示例聚焦运行时行为，不通过 CLI 执行。  
如果将 Flow 也纳入出码 pipeline，可以在 Plan 中加入 “生成 `.flow.ts`” 的动作，然后由 CLI 写出行为文件；当前阶段 CLI 只处理结构产物，行为层由开发者通过 `.flow.ts` + Hook 落地。
