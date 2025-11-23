---
title: 布局意图（Layout Intent）
status: draft
version: 2
---

> 本文定义布局意图的含义、边界与 Schema 草图，并给出示例。

## 1. 定义与边界

**布局意图（Layout Intent）只回答三个问题：**

1. 页面有多少个“语义区域”？
2. 这些区域如何排列、占比如何？（上/下/左/右、多列/单列）
3. 每个区域在业务上扮演什么角色？（filters/table/toolbar/metrics/detail 等）

不负责：

- 组件内部布局（表单项对齐方式、按钮间距）；
- 视觉风格（颜色、阴影、圆角）；
- 行为/数据/工程结构等其它意图层。

## 2. LayoutIntent v2 Schema 草图

```ts
interface LayoutRegionIntent {
  id: string
  label: string
  role:
    | 'filters'
    | 'toolbar'
    | 'table'
    | 'metrics'
    | 'detail'
    | 'sidebar'
    | 'footer'
    | string
}

interface LayoutIntent {
  layoutType: 'list-page' | 'workbench' | 'dashboard' | 'custom'
  regions: LayoutRegionIntent[]
  // 可选：用于 layout 引擎的结构树（由网格线稿或其它交互生成）
  tree?: LayoutNode
}
```

在 IntentSpec v2 中：

```ts
interface IntentSpecV2 {
  // ...
  layout: LayoutIntent
  // 其它意图层：view/interaction/behavior/data/codeStructure/constraints
}
```

## 3. 与 Pattern/Template 的关系

- layout Pattern（如 `workbench-layout`、`list-page-shell`）主要作用于 Layout + View 两层：
  - LayoutIntent 决定有哪些区域、如何排列；
  - Pattern 负责把这些区域映射为容器组件/Slot 结构；
  - Template 则生成实际的布局 Shell 代码（React 组件、Tailwind 类等）。
- 在 PatternSpec v2 中，layout 型模式应声明：

```yaml
intentLayers:
  - layout
  - view
```

## 4. 交互形态建议（不限定实现）

布局意图的表达形态可以有多种：

- 网格线稿（详见 v1 `design/layout.md`）：n×m 网格 + 区域上色 + 语义标签；
- 区域列表 + 预设布局模板：
  - 先选模板（如“列表页三段式”、“工作台三栏式”）；
  - 再为每个区域填 id/label/role；
- 直接在 Intent Studio 的 Layout 面板中编辑结构树（适合高级用户）。

平台应当：

- 为“线稿级”布局表达提供低门槛交互（画格子/选模板即可）；
- 为 LLM 提供结构化 LayoutIntent，避免模型从 Figma/截图中硬猜布局；
- 在 Plan/Template 层统一把 LayoutIntent 映射为布局组件骨架，而不是每次临时写布局代码。
