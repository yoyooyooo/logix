---
title: 交互意图（Interaction Intent）
status: draft
version: 2
---

> 本文定义交互意图：用户操作与即时 UI 反馈，并说明其与行为/流程意图的边界。

## 1. 定义

交互意图只描述：

> “**用户做了什么动作，界面如何立即响应？**”

典型例子：

- 点击“新增”按钮 → 打开表单弹窗；
- 点击行右侧“编辑”图标 → 打开右侧详情抽屉并高亮该行；
- 悬停在状态标签上 → 显示 Tooltip；
- 切换 Tab → 切换内容区域。

不负责：

- 是否需要调用接口（Behavior & Flow）；
- 是否需要写入 store/刷新列表（Behavior & Data/State）。

## 2. InteractionIntent Schema 草图

```ts
interface UiEffectIntent {
  type:
    | 'openModal'
    | 'openDrawer'
    | 'closeModal'
    | 'toggle'
    | 'scrollIntoView'
    | 'selectRow'
    | 'none'
  target?: string // modalId/drawerId/elementId/rowId 路径等
}

interface InteractionEventIntent {
  id: string
  source: string // e.g. toolbar.addButton, table.row[0].editIcon
  event: 'click' | 'change' | 'hover' | 'keydown' | string
  uiEffect: UiEffectIntent
}

interface InteractionIntent {
  events: InteractionEventIntent[]
}
```

在 IntentSpec v2 中：

```ts
interface IntentSpecV2 {
  // ...
  interaction?: InteractionIntent
}
```

## 3. 与 Behavior & Flow 的关系

交互意图通常是 Behavior & Flow 的“触发源”：

- Interaction 描述 UI 层：点击按钮 → 打开弹框；
- Behavior & Flow 描述业务层：点击确认按钮 → 校验 → 调用 API → 成功后关闭弹框并刷新列表。

因此：

- `InteractionIntent.events[].source/event` 应与 FlowIntent.trigger.source/event 对齐；
- Flow DSL 不需要重复描述 UI 反馈（例如 openModal），只描述业务流程部分；
- UI 组件在实现时，可以直接根据 InteractionIntent 绑定事件与 UI Effect。

## 4. 交互形态示例（平台 UI）

在平台上，交互意图可通过以下视图表达：

- 事件列表：
  - 按组件/区域列出所有“可交互元素”；
  - 对每个元素声明事件类型与 UI 效果（openModal/close/scroll 等）。
- 小型“交互画布”：
  - 节点为 UI 元素（按钮/行/标签），连线表示交互关系；
  - 适合表达复杂页面上的显式交互链路。

LLM 可以：

- 根据 Layout/View 推断常见交互意图（例如列表上的行点击打开详情）；
- 根据已有 Flow 意图，提示“你是否需要在这里加一个 ‘loading’ 或 ‘禁用按钮’ 的交互”。
