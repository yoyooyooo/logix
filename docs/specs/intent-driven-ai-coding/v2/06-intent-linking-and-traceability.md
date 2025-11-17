---
title: 意图关联与可追踪性（Linking & Traceability）
status: draft
version: 2
---

> 本文回答一个问题：当 Intent Studio 按意图层（Layout/View/Interaction/Behavior/Data/Code）分屏时，如何在界面上把同一个业务意图（Use Case）串起来，让产品/架构/前端都能围绕同一条线稿协作，而不是在多个孤立表单里迷路。

## 1. 业务锚点：Use Case 作为一切的中心

平台中的所有意图层视图都围绕“业务用例（Use Case）”展开，而不是围绕某个单独字段。

- 每个 Intent 下可以有一个或多个 Use Case：
  - 例如 `order-management` Intent 下：
    - `view-orders`：浏览列表；
    - `export-orders`：按条件导出；
    - `quick-edit-remark`：快速编辑备注；
    - `approve-order`：审批通过。
- Use Case 是一个轻量实体，包含：

```ts
interface UseCase {
  id: string
  intentId: string
  title: string
  description: string
  // 指向各意图层中的锚点
  layoutRegionIds?: string[]
  viewComponentIds?: string[]
  interactionEventIds?: string[]
  flowIds?: string[]
  entityIds?: string[]
  apiIds?: string[]
  moduleFileIds?: string[]
}
```

### 1.1 侧边栏：Use Case 列表 + 层级进度指示

在 Intent Studio 中，左侧固定一个 Use Case 列表：

- 每条 Use Case 一行，显示：
  - 标题（如“导出订单”）；
  - 六个小圆点：Layout/View/Interaction/Flow/Data/Code 的完成度（灰色=无定义，半填=草稿，实心=已确认）。
- 点击某个 Use Case 后，中间主视图切换到当前选中的意图层（例如 View Tab），并过滤出与该 Use Case 相关的内容。

这样，无论当前正看哪个视图，用户始终知道“自己在处理哪条业务线稿”。

## 2. 统一的交叉引用模型（ID）

为了让“点任何东西都能找到其它层的信息”，需要在 Schema 层约定一套统一标识符：

- Layout：`regionId`（filters/table/toolbar/metrics/...）；
- View：`componentId`（FilterBar/Table/Toolbar/...）；
- Interaction：`eventId` + `source`（toolbar.exportButton 等）；
- Behavior & Flow：`flowId`（exportOrders、updateRemark 等）；
- Data & State：`entityId`、`apiId`、`stateSourceId`；
- Code Structure：`fileId` 或 `path`（features/order-management/components/order-table.tsx 等）。

每一层的 Schema 都应包含对其它层的引用，例如：

- InteractionIntent.events[].source = `toolbar.exportButton`（指向 View/Layout）；
- FlowIntent.trigger.source = `toolbar.exportButton`，flowId 与 UseCase.flowIds 关联；
- FlowStepIntent.serviceId = `ExportService`，Data & State 里有 `apiId = exportOrders`；
- PlanActionV2 里携带 flowId/patternId/fileId 等元信息。

平台 UI 不展示这些 ID 本身，而是用它们来驱动“关联卡片”和跳转逻辑。

## 3. 关联在界面上的呈现方式

### 3.1 上下文卡片（Context Card）

在每个意图层视图右侧的 Detail 面板顶部，统一使用一个上下文卡片展示关联：

示例：在 Interaction 视图中选中 `triggerExport` 事件。

- 上下文卡片内容：
  - Use Case：chip `导出订单`（点击可折叠显示其描述）；
  - Trigger Source：chip `toolbar.exportButton`（点击跳到 View 视图并高亮对应按钮）；
  - Flow：chip `exportOrders`（点击跳到 Behavior & Flow 视图，并选中该 Flow）；
  - Entities/APIs：chips `Order`、`exportOrders`（点击到 Data 视图的对应行）；
  - Files：chips `flows/export-orders.flow.ts`、`services/order-export.service.ts`（点击到 Code Structure 视图）。

视觉上，这些是可点击的标签/徽章，而不是裸露 ID。它们背后使用统一模型查询其它意图层的相关实体。

### 3.2 高亮与联动

当用户在某一视图选中一个实体时：

- 当前 Tab 内：
  - 高亮列表或表格中的相关行；
  - Detail 面板展示更多字段与关联。
- 其它 Tab：
  - 在 Tab 标签上显示小红点或高亮，提示“有与当前 Use Case 相关的内容”；
  - 切换过去时自动选中最相关的实体（例如该 Flow 对应的文件）。

例如：

- 在 Flow 视图中高亮 `exportOrders`；
- 切换到 Interaction Tab 时自动高亮 `triggerExport`；
- 切换到 Code Structure Tab 时自动选中 `export-orders.flow.ts` 文件。

### 3.3 关联摘要视图

在 Use Case 层提供一个“关联摘要”视图：

- 用简约的表/树显示：

```text
Use Case: 导出订单

- Layout: toolbar (role=toolbar)
- View: toolbar-with-quick-edit (slot=toolbar)
- Interaction:
  - triggerExport (source=toolbar.exportButton)
- Behavior & Flow:
  - exportOrders (trigger=triggerExport)
- Data & State:
  - Entity: Order
  - API: exportOrders
- Code Structure:
  - flows/export-orders.flow.ts
  - services/order-export.service.ts
```

这样在做需求评审或设计回顾时，团队可以快速浏览某个 Use Case 的完整意图和实现覆盖面。

## 4. 表单 vs 画布：分工明确

界面上的主视图应以“列表/表格 + Detail 面板”为主，画布仅在关系表达更直观的地方出现：

- 表格/树：
  - 适合表达事件列表、字段/接口列表、文件/模块树等；
  - 便于筛选、排序、批量编辑。
- Detail 面板：
  - 容纳少量表单控件，对单个实体做精细编辑；
  - 避免整个页面被表单撑满。
- 局部画布：
  - Layout：网格线稿，只处理区域关系；
  - Flow：简化 DAG，表达服务调用/条件分支的流程关系；
  - 不承载全部配置，只用于帮助理解关系。

所有这些视图通过上下文卡片和关联 chips 串起来，让人感觉是在“透视同一个业务意图”，而不是在不同功能页面之间跳来跳去。

## 5. 角色视角下的关联导航

### 5.1 产品（或前端兼任）

- 从 Use Case 列表进入某个用例：
  - 先在 Layout/View/Data 视图里表达线稿；
  - 在 Interaction 视图中声明关键事件;
  - 通过上下文卡片看到有哪些 Flow/文件/模式会受到影响。
- 不必进入 Pattern/Flow/Code Studio 的编辑态，只需要能从当前视图跳到预览/摘要。

### 5.2 架构

- 在 Pattern/Flow/Code Studio 中打开相同 Use Case 的关联视图：
  - 看到来自 Intent Studio 的 Layout/View/Interaction/Data 线稿；
  - 对应地在 Pattern Studio 补模式、在 Flow Studio 补 Flow DSL/Effect、在 Code Studio 调整结构；
  - 通过关联摘要确认“这个用例的所有层面都已经覆盖”。

### 5.3 前端

- 在 Code Studio 或本地 IDE 中：
  - 从某个文件的“来源卡片”跳回对应的 Use Case 和意图层视图；
  - 例如：在 `export-orders.flow.ts` 的头部看到注释或链接：属于 Use Case=导出订单，FlowId=exportOrders；
  - 点击可在平台上打开 Behavior & Flow 视图，理解原始业务意图。

前端不需要手写 Intent/Pattern/Plan 的全部内容，但可以通过这些关联轻松找到“这段代码是为了满足哪个业务意图”。

---

通过以上机制，按意图层分屏并不会把东西拆散，反而让每一层都有自己的“编辑焦点”，同时可以在任何一层随时看到同一业务用例在其它层的映射和实现，真正做到“从意图到出码”的可追踪与可协作。

