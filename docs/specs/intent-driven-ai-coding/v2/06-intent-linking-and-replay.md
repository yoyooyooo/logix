---
title: 意图关联与交互回放（Linking & Replay）
status: draft
version: 2
---

> 本文回答两个问题：
> 1. 按意图层分屏之后，如何在平台中方便地把 Layout/View/Interaction/Behavior/Data/Code Structure 关联起来，围绕同一个业务需求协作？
> 2. Interaction 层的录制与回放如何与 Flow/Effect 运行时结合，成为真实的集成测试与压测手段？

## 1. 业务锚点：Intent + Use Case

平台中的一切视图，都应围绕“业务锚点”展开：

- **Intent（场景级）**：例如 `order-management`、`ops-workbench`；
- **Use Case（用例级）**：Intent 下的具体业务意图，如 `exportOrders`、`updateRemark`、`completeTask`。

在 UI 上，这表现为：

- Intent Studio 左侧有一个用例 Outline：
  - 每一行代表一个 Use Case；
  - 每行旁边有 6 个点/进度条，对应六类意图层（Layout/View/Interaction/Behavior/Data/Code）。
- 选中某个 Use Case，所有中间视图（Layout/View/Interaction/Behavior/Data/Code Structure）都跳到该 Use Case 的投影。

## 2. 统一标识：跨层关联的 ID 体系

为了在不同意图层之间自由跳转，需要一套统一的 ID 体系，让平台知道“这是同一个东西在不同层的映射”：

- `regionId`：布局区域（filters/toolbar/table/metrics 等）；
- `componentId`：视图组件/模式实例（FilterBar/Table/Toolbar/...）；
- `source`：交互源（toolbar.exportButton、table.row[orderId].edit 等）；
- `flowId`：Flow/行为流水线（exportOrders、updateRemark）；
- `entityId` / `apiId` / `stateSourceId`：数据与状态源；
- `fileId` / `path`：代码结构层的文件（page/components/store/service/flow）。

这些 ID 在各层 Schema 中都会出现，例如：

- InteractionIntent.events[].source 与 FlowIntent.trigger.source 对齐；
- FlowStepIntent.serviceId 与 DataStateIntent.apis[].name / Pattern.dataContract.apis[] 对齐；
- PlanAction.path 与 CodeStructureIntent.files[].path 对齐，并附带 patternId/templateId/flowId。

这样，平台可以实现：

- 从 Interaction 事件跳转到对应 Flow、Service 和代码文件；
- 从 Flow 跳回它的 Trigger 组件与相关数据源；
- 从任意文件跳回它实现的 Intent/UseCase/Pattern/Flow。

## 3. 跨层关联在 UI 上的体现

以“导出订单”用例为例，在不同视图中应该看到：

- **Layout 视图**：
  - 选中 `toolbar` 区域时，右侧上下文卡片显示：
    - 绑定的 View 组件（ToolbarComponent）；
    - 来自该区域的 Interaction 事件（如 triggerExport）；
    - 以此为 trigger 的 Flow（exportOrders）；
    - 相关文件（`order-toolbar.tsx`、`export-orders.flow.ts`）。

- **View 视图**：
  - 选中 `toolbar-with-quick-edit` 模式实例时：
    - 显示该模式提供的交互源（exportButton/quickEditButton）；
    - 显示当前 Intent 中哪些 Interaction 事件/Flow 使用了这些源；
    - 显示其依赖的数据契约（涉及 Order 实体、哪些字段）。

- **Interaction 视图**：
  - 选中 `triggerExport` 事件时：
    - 显示其 source（toolbar.exportButton）、target Flow（exportOrders）；
    - 显示会受影响的组件（Table/Filters）和数据源（FilterStore/TableUiState）；
    - 提供跳转到 Flow Studio、Data & State 视图的入口。

- **Behavior & Flow 视图**：
  - 选中 `exportOrders` Flow 时：
    - 显示其 trigger（toolbar.exportButton）；
    - 列出它调用的 services/apis（FilterService/TableUiStateService/ExportService）；
    - 显示对应的 `.flow.ts` 文件与 Plan 中的文件生成记录。

- **Data & State 视图**：
  - 打开 `Order` 实体时：
    - 显示哪些视图组件使用了哪些字段（Table 的列、Filter 的字段）；
    - 显示哪些 Flow 会读取/写入这些字段；
    - 显示这些字段的质量约束（例如精度、枚举、敏感性）。

- **Code Structure 视图**：
  - 选中 `export-orders.flow.ts` 文件时：
    - 显示其 FlowIntent（exportOrders）；
    - 显示对应的 Interaction 事件、数据源、Pattern/Template；
    - 支持一键跳转回 Intent Studio 的 Behavior 视图。

## 4. Interaction 录制：采集语义事件 + 状态快照

录制的目标不是“记住 DOM 点击”，而是：

> 在某个 Intent/UseCase 下，记录一条业务路径上发生的所有语义事件、相关状态快照和 Flow 执行轨迹。

### 4.1 RecordedEvent 与 StateSnapshot

```ts
interface RecordedEvent {
  id: string
  intentId: string
  useCaseId: string
  flowId?: string
  source: string   // toolbar.exportButton
  event: string    // 'click'
  at: number       // timestamp
  payload?: any    // 当时的表单值/选中行 id 等
  stateSnapshotId?: string
}

interface StateSnapshot {
  id: string
  intentId: string
  dataSources: {
    type: 'query' | 'store' | 'local'
    key: string
    value: unknown
  }[]
}
```

录制时，Interaction Runtime 会：

- 拦截所有经过 `useInteractionSource(sourceId)` 声明的事件；
- 对重要节点（例如点击导出前、提交表单前后）调用 `captureSnapshot()`；
- 如果有 FlowExecutionLog，也一并记录行为层的步骤执行情况。

### 4.2 代码组织

- 所有交互源通过一个统一 hook 声明：

```ts
const { fire } = useInteractionSource('toolbar.exportButton')

return <Button onClick={() => fire('click')}>导出</Button>
```

- 数据/状态通过适配器提供快照功能：
  - React Query：封装 QueryClient 的 get/set，用于导出/导入某些 queryKey；
  - Zustand：在 root store 上提供 `getSnapshot(id)` / `restoreSnapshot(id)`。

录制逻辑只依赖这些统一 API，而不直接耦合业务组件。

## 5. 回放：用同一套组件 + 数据 + Flow 重跑路径

回放的目标有两个：

1. 帮开发/产品“看”某条业务路径在新代码下是否还正常；
2. 对 Flow/Effect 运行时进行真实的集成测试与压力测试。

### 5.1 回放环境

平台会为每个 Intent/UseCase 提供一个专用的 Replay Shell：

- 挂载同一套布局与组件树（LayoutShell + 组件）；
- 使用专用的 QueryClient、Zustand store 实例；
- 使用 `<InteractionProvider mode="replay">` 包裹整个应用。

回放前：

- 使用对应的 StateSnapshot 初始化 state/data；
- 如果需要“离线回放”，可以使用 snapshot 数据 stub 掉真实 HTTP 请求。

### 5.2 驱动脚本

`InteractionReplayer` 读取某个 `UseCaseScenario`：

```ts
interface UseCaseScenario {
  intentId: string
  useCaseId: string
  events: RecordedEvent[]
  snapshots: StateSnapshot[]
}
```

然后按时间顺序：

- 将 event dispatch 回对应的 `useInteractionSource` 源；
- 在每个事件后对比当前 state 与记录中的 snapshot（可选）；
- 如有 FlowExecutionLog，可同时对比 Flow 步骤执行情况。

### 5.3 与 Effect 运行时的关系

在行为层，Flow DSL + `.flow.ts` 的 Effect 程序不需要为回放做特殊改动：

- Effect 只依赖 Env（services/state adapters）；
- 回放环境提供相同的 Env（或 stub）；
- FlowExecutionLog 作为“黄金记录”，可以在回放时比较新老 Effect 行为差异。

这样，一次回放本质上就是对 Behavior & Flow 意图 + Effect runtime 的完整集成测试。

## 6. 为什么这是意图驱动的核心能力之一？

当 Layout/View/Interaction/Behavior/Data/Code Structure 都被意图层结构化之后：

- Interaction 录制不只是“前端事件重放”，而是对整个 Intent/UseCase 的一次运行快照；
- 回放不只是“看 UI 动画”，而是测试：
  - 视图/组件是否按预期组合和更新；
  - 服务调用和状态更新是否符合 FlowIntent；
  - 代码结构是否仍然满足 Code Structure Intent 和 Constraint 意图（例如 never break userspace）。

做到这一点，平台就不仅仅是“帮你出码”的工具，而是：

> 一个能把“意图 → 模式 → Flow → 代码 → 运行行为”串成闭环，并用真实路径不断自证的系统。

