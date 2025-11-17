---
title: 示例：从意图到出码的完整链路
status: draft
version: 2
---

> 本文用一个具体例子串起六类意图 —— 以“订单管理列表（含导出与快速编辑）”为例，从需求文字 → 意图线稿 → IntentSpecV2 → Pattern/Plan/Flow → 最终代码骨架。

## 1. 需求文字（用户视角）

> 我需要一个订单管理页面：左边是筛选，右边是列表，上面一条工具栏。运营可以按状态、时间筛选订单，查看列表，点击行上的编辑按钮弹出备注编辑弹窗。工具栏要有“导出”按钮，导出时带上当前筛选条件和可见列。提交表单要做校验，成功后关闭弹窗并刷新列表。

## 2. 意图分解（线稿级）

根据 v2 的六类意图，我们将这段话拆成：

- Layout：左筛选右列表，上方工具栏；
- View：列表用可排序表格、顶部有筛选/工具栏、弹框中是表单；
- Interaction：
  - 点击行上“编辑” → 打开备注弹框；
  - 点击工具栏“导出” → 打开导出确认弹框或直接触发导出。
- Behavior & Flow：
  - 导出流程：读取筛选+列 → 调 ExportService → 成功提示；
  - 快速编辑流程：校验备注 → 调 updateOrder → 成功关闭弹框+刷新列表。
- Data & State：
  - Order 实体字段、listOrders/exportOrders 接口；
  - 列表数据走 React Query，筛选状态走 store。
- Code Structure：
  - `features/order-management/` 下的 page/components/store/service/queries/flows 结构。

## 3. IntentSpecV2 片段

### 3.1 LayoutIntent

```yaml
id: order-management
title: 订单管理列表
description: 管理订单的列表 / 搜索 / 快速编辑 / 导出功能

layout:
  layoutType: list-page
  regions:
    - id: filters
      label: 筛选区
      role: filters
    - id: toolbar
      label: 工具栏
      role: toolbar
    - id: table
      label: 列表
      role: table
```

### 3.2 ViewIntent

```yaml
view:
  components:
    - slot: filters
      patternId: filter-bar
      propsIntent:
        entity: Order
        fields: [status, createdAt]
        inlineSearch: true
    - slot: toolbar
      patternId: toolbar-with-quick-edit
      propsIntent:
        supportQuickEdit: true
        supportExport: true
        entity: Order
        editableFields: [remark]
    - slot: table
      patternId: table-with-server-filter
      propsIntent:
        entity: Order
        columns:
          - { key: id, title: 订单号, sortable: true }
          - { key: status, title: 状态 }
          - { key: createdAt, title: 下单时间, sortable: true }
          - { key: totalAmount, title: 金额 }
        pagination: true
        batchActions: [export]
        pageSize: 20
```

### 3.3 InteractionIntent

```yaml
interaction:
  events:
    - id: openQuickEdit
      source: table.row.action.edit
      event: click
      uiEffect:
        type: openModal
        target: quickEditModal
    - id: submitQuickEdit
      source: quickEditModal.confirmButton
      event: click
      uiEffect:
        type: none
    - id: triggerExport
      source: toolbar.exportButton
      event: click
      uiEffect:
        type: none
```

### 3.4 BehaviorIntent（FlowIntent）

```yaml
behavior:
  flows:
    - id: exportOrders
      trigger:
        source: toolbar.exportButton
        event: click
      pipeline:
        - kind: callService
          serviceId: FilterService
          method: getCurrentFilters
          outputAlias: filters
        - kind: callService
          serviceId: TableUiStateService
          method: getCurrentState
          outputAlias: tableState
        - kind: callService
          serviceId: ExportService
          method: submitExportTask
          input:
            filters: "{{filters}}"
            columns: "{{tableState.visibleColumns}}"

    - id: updateRemark
      trigger:
        source: quickEditModal.confirmButton
        event: click
      pipeline:
        - kind: callService
          serviceId: FormValidationService
          method: validateRemarkForm
          outputAlias: form
        - kind: branch
          when: "!form.valid"
          // 交给 InteractionIntent 的 uiEffect: 显示错误
        - kind: callService
          serviceId: OrderService
          method: updateOrder
          input:
            id: "{{form.values.id}}"
            remark: "{{form.values.remark}}"
        - kind: callService
          serviceId: UiService
          method: closeModal
          input:
            modalId: quickEditModal
        - kind: callService
          serviceId: ListQueryService
          method: refetch
```

### 3.5 DataStateIntent（简化版）

```yaml
data:
  entities:
    - name: Order
      fields:
        - { name: id, type: string, required: true }
        - { name: status, type: enum, enumValues: [PENDING, PAID, SHIPPED, COMPLETED, CANCELED] }
        - { name: createdAt, type: date }
        - { name: totalAmount, type: number }
        - { name: remark, type: string }
  apis:
    - name: listOrders
      path: /api/orders
      method: GET
      params:
        status: string?
        createdAtFrom: string?
        createdAtTo: string?
        page: number
        pageSize: number
    - name: updateOrder
      path: /api/orders/{id}
      method: PATCH
      params:
        remark: string?
    - name: exportOrders
      path: /api/orders/export
      method: POST
      params:
        filters: object
```

### 3.6 CodeStructureIntent（概念）

```yaml
codeStructureRef:
  planId: order-management.plan.v1
```

在 PlanSpecV2 中会给出具体文件：

```yaml
id: order-management.plan.v1
intentId: order-management
version: v1
actions:
  - id: page
    type: create-file
    path: src/features/order-management/order-management.page.tsx
    templateId: list-page-shell
    patternId: list-page
    intentLayers: [layout, view, code-structure]

  - id: filters
    type: create-file
    path: src/features/order-management/components/order-filters.tsx
    templateId: filters-basic
    patternId: filter-bar
    intentLayers: [view, data]

  - id: table
    type: create-file
    path: src/features/order-management/components/order-table.tsx
    templateId: react-table-shell
    patternId: table-with-server-filter

  - id: toolbar
    type: create-file
    path: src/features/order-management/components/order-toolbar.tsx
    templateId: toolbar-basic
    patternId: toolbar-with-quick-edit

  - id: quickEditFlow
    type: create-file
    path: src/features/order-management/flows/update-remark.flow.ts
    templateId: flow-effect-ts
    patternId: approval-flow
    intentLayers: [behavior, code-structure]
```

## 4. Flow DSL 与 Effect-ts（行为层出码）

以 `exportOrders` 为例，从 FlowIntent 到 Effect 程序：

```ts
// FlowAst 由 FlowIntent 解析而来
export interface ExportOrdersEnv {
  FilterService: {
    getCurrentFilters: () => Promise<Record<string, unknown>>
  }
  TableUiStateService: {
    getCurrentState: () => Promise<{ visibleColumns: string[]; [k: string]: unknown }>
  }
  ExportService: {
    submitExportTask: (input: { filters: Record<string, unknown>; columns: string[] }) => Promise<void>
  }
}

export async function exportOrdersFlow(env: ExportOrdersEnv) {
  const filters = await env.FilterService.getCurrentFilters()
  const tableState = await env.TableUiStateService.getCurrentState()
  await env.ExportService.submitExportTask({
    filters,
    columns: tableState.visibleColumns,
  })
}
```

在 v2 中，Effect-ts（或等价 Effect runtime）就是 Behavior & Flow Intent 的“运行时润色层”：

- FlowIntent → FlowAst → Effect 程序骨架；
- Constraints（重试/超时/审计）通过 Effect 组合实现；
- Plan 在 Code Structure 层负责将 `.flow.ts` 文件放到合适目录。

## 5. 最终代码骨架（示意）

根据 Intent + Pattern + Template + Plan，平台可以生成：

- 布局壳组件：`order-management.page.tsx`；
- 视图组件：`order-filters.tsx`、`order-table.tsx`、`order-toolbar.tsx`；
- 状态模块：`filter.slice.ts`、`table.slice.ts`、`useOrdersList.hook.ts`；
- 行为 Flow：`export-orders.flow.ts`、`update-remark.flow.ts`；
- 模式/模板与 best-practice 的映射（目录和命名）。

在这个过程中：

- 用户的“线稿意图”只需要覆盖布局/视图/交互/行为/数据/工程结构的骨架；
- 平台与 LLM 根据 v2 的意图分层模型，将这些线稿映射到具体资产和代码结构；
- Effect-ts 等运行时技术只在 Behavior & Flow + Constraints 层出现，对用户透明但对平台可控。
