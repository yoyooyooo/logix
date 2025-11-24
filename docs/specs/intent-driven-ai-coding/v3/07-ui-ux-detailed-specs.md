---
title: 07 · UI 意图与组件资产 (UI Intent & Component Assets)
status: draft
version: 1
---

> **核心目标**：构建一个开放的、基于 Manifest 的组件资产体系，支持从 Headless 到 Pro Components 的全层级接入，并实现与 Logix 逻辑的声明式绑定。

## 1. 组件资产体系 (Component Asset System)

Logix 不绑定特定 UI 库，而是通过 **Manifest Protocol** 接入任意 React 组件。

### 1.1 Component Manifest (组件清单)

Manifest 是组件的“说明书”，描述了组件的能力和接口。

```json
{
  "id": "@my-org/pro-table",
  "version": "1.0.0",
  "kind": "pro", // pro | atom | layout
  
  // 属性定义 (用于属性面板)
  "props": {
    "columns": { "type": "json", "editor": "column-builder" },
    "request": { "type": "function", "bindable": true },
    "rowKey": { "type": "string", "default": "id" }
  },

  // 事件定义 (用于逻辑触发)
  "events": {
    "onRowClick": { "payload": "{ record: any }" }
  },

  // 插槽定义 (用于子组件拖拽)
  "slots": {
    "toolBarRender": { "description": "表格上方工具栏" },
    "expandedRowRender": { "description": "展开行内容" }
  },

  // 样式能力 (Tailwind)
  "styling": {
    "allowClassMerge": true,
    "presets": ["default", "compact", "bordered"]
  }
}
```

### 1.2 接入模式 (Integration Modes)

1.  **NPM Package (Standard)**: 
    *   直接引用 `node_modules` 中的组件。
    *   Manifest 由 CLI 工具扫描类型定义自动生成，或手动维护。
    *   **适用**: 基础组件库、Pro 组件库。

2.  **Local Source (Project)**:
    *   引用项目内的 `src/components`。
    *   支持热更新和源码跳转。
    *   **适用**: 业务专用组件。

## 2. UI Intent 结构 (The Graph)

UI Intent 是一棵逻辑增强的组件树。

```typescript
interface UIIntentNode {
  id: string;
  component: string; // Ref to Manifest ID
  
  // 静态属性 (直接值)
  props: Record<string, any>;

  // 动态绑定 (绑定到 Logix State)
  bindings: {
    // propName: statePath
    "loading": "ui.isLoading",
    "dataSource": "domain.userList"
  };

  // 事件映射 (映射到 Logix Signal/Action)
  events: {
    // eventName: signalId
    "onRowClick": "signal:previewUser"
  };
  
  // 插槽内容
  slots: {
    [slotName: string]: UIIntentNode[];
  };

  // 样式 (Tailwind)
  className: string;
  classBindings: {
    [className: string]: string; // condition expression
  };
}
```

## 3. 运行时桥接 (Runtime Bridge)

Logix Renderer 负责将 Intent 实例化为 React 组件树。

### 3.1 渲染流程

1.  **Resolve**: 根据 `node.component` ID 从 `ComponentRegistry` 中获取 React 组件函数。
2.  **Bind State**: 订阅 `bindings` 中指定的 Logix State，实时注入 Props。
3.  **Bind Events**: 创建 Dispatcher 函数，绑定到 `events` 指定的 Props。
4.  **Render Slots**: 递归渲染 `slots` 中的子节点，并将结果作为 `ReactNode` 传递给对应 Prop。
5.  **Merge Styles**: 计算动态 `classBindings`，与静态 `className` 合并。

### 3.2 混合画布交互

*   **Pro 组件 (Black Box)**: 默认作为整体渲染。插槽显示为 DropZone。
*   **原子组件 (White Box)**: 完全展开，支持精细化布局调整。
*   **钻取 (Drill-down)**: 允许用户“解组”某些复合组件（如果 Manifest 允许），查看内部结构。
