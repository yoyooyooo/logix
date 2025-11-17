---
title: 视图/组件意图（View & Component Intent）
status: draft
version: 2
---

> 本文扩展“视图/组件意图”的含义与 Schema 草图，并说明与 Pattern、UI 设计系统的关系。

## 1. 定义

视图/组件意图回答：

1. 每个布局区域里用什么 UI 模式/组件？
2. 它们有哪些变体（密度、风格、是否带操作列等）？
3. 这些组件需要哪些“业务级”配置（例如列配置、筛选字段、是否支持导出）。

它不负责：

- 具体布局位置（交给 LayoutIntent）；
- 行为流程（调用哪个 service、业务步骤链）；
- 状态来源（react-query 还是 zustand）——这些属于 Data/State 与 Behavior 层。

## 2. ViewIntent Schema 草图

```ts
interface ViewComponentIntent {
  slot: string // 对应 LayoutIntent.regions[].id
  patternId: string // e.g. table-with-server-filter, filter-bar
  variant?: string // e.g. dense / card / compact
  propsIntent?: Record<string, unknown> // 视图层的参数化意图（列配置、按钮集合等）
}

interface ViewIntent {
  components: ViewComponentIntent[]
}
```

在 IntentSpec v2 中：

```ts
interface IntentSpecV2 {
  layout: LayoutIntent
  view?: ViewIntent
  // ... interaction/behavior/data/codeStructure/constraints
}
```

## 3. Pattern 在视图层的角色

UI/Pro Pattern（如 `table-with-server-filter`、`filter-bar`、`toolbar-with-quick-edit`）本质上是“视图意图 + 部分行为/数据意图”的模板：

- 在 PatternSpec v2 中，它们应声明：

```yaml
intentLayers:
  - view
  - behavior
  - data
```

- 并通过以下字段提供视图层配置：
  - `composition.roles`：视图组件和子组件的角色（TableComponent/ToolbarComponent/...）；
  - `paramsSchema`：视图层参数（列配置、是否显示重置按钮等）；
  - `uiSchema`：在“Pattern Studio / Intent Studio”中编辑这些参数时的表单控件配置。

## 4. 与 LayoutIntent 的配合

- LayoutIntent 定义了有哪些 slot，例如 `filters/toolbar/table/metrics`；
- ViewIntent 将 slot 绑定到具体 Pattern：

```yaml
layout:
  layoutType: list-page
  regions:
    - id: filters
      role: filters
    - id: toolbar
      role: toolbar
    - id: table
      role: table

view:
  components:
    - slot: filters
      patternId: filter-bar
      propsIntent:
        fields: [status, createdAt]
    - slot: toolbar
      patternId: toolbar-with-quick-edit
      propsIntent:
        supportExport: true
    - slot: table
      patternId: table-with-server-filter
      propsIntent:
        entity: Order
        columns: [...]
```

平台据此可：

- 渲染出对应的 UI 结构（在 Preview/Docs 中）；
- 为 Code Structure/Template 生成组件骨架文件；
- 为 LLM 提供完整上下文，生成合理的 JSX/TSX 代码。

## 5. 交互形态示例

在平台 UI 上，视图/组件意图可以通过以下方式表达：

- Pattern 选择器：
  - 按 Layout slot 展示候选 Pattern 卡片；
  - 用户选择某个 Pattern，右侧出现参数表单（由 uiSchema 驱动）。
- 组件树视图：
  - 展示 `Layout` + `View` 的组合成树状结构；
  - 支持为每个节点添加/删除子组件（如按钮、操作列）并更新 propsIntent。

## 6. 边界与示例：业务视图 vs 实现细节

View & Component Intent 关注“每个区域想要什么 UI 能力”，而不是具体实现方式。

### 6.1 本层允许/不允许的内容

- 允许（What）：
  - 每个 slot 使用哪种 Pattern（表格/筛选栏/工具栏/指标卡等）；
  - 业务级配置：显示哪些列、哪些字段可筛选、支持哪些操作按钮等；
  - 变体/密度/模式（dense/card/compact 等）。
- 不允许（How）：
  - 具体组件实现名（某个内部组件的 import 名称）；
  - props 微调细节（CSS 类、具体 gutter/spacing、像素级宽度）；
  - 复杂渲染逻辑（自定义 cell renderer 的代码）。

示意对比：

```yaml
# ✅ Good：Intent 层 View 配置
view:
  components:
    - slot: table
      patternId: table-with-server-filter
      propsIntent:
        entity: Order
        columns:
          - { key: id, title: 订单号, sortable: true }
          - { key: status, title: 状态 }
          - { key: createdAt, title: 下单时间, sortable: true }
        pagination: true

# ❌ Bad：把实现细节写进 View Intent
view:
  components:
    - slot: table
      patternId: table-with-server-filter
      component: OrderTableImpl        # ← 具体组件实现
      propsIntent:
        columns:
          - key: id
            title: 订单号
            width: 120                 # ← 像素级宽度
            cellRenderer: customRender # ← 自定义渲染函数名
```

这些实现细节应由 Pattern 实现、Template/Plan 或代码层负责。

### 6.2 Minimal ViewIntent 建议

一个可用的 ViewIntent 通常至少包含：

- 目标布局区域的 slot；
- 对应 Pattern 的 patternId；
- 该 Pattern 所需的最小业务配置（如主实体、核心字段/列、关键按钮）。

LLM 的角色：

- 读 Layout + 当前 ViewIntent，推荐合适的 Pattern / 变体；
- 根据数据意图（entities/apis）自动建议列配置、筛选字段等视图参数。
