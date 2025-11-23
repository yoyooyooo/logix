---
title: 交互意图 (Interaction Intent)
status: draft
version: 3
---

> 本文定义了 v2 架构下的交互模型：作为物理世界与数字世界的转换器，负责将用户的原始操作转化为 UI 反馈或业务信号 (Signal)。

## 1. 核心定义

Interaction Intent 回答：**“用户做了什么，系统如何立即响应？”**

它是连接 UI 组件（View）与业务逻辑（Behavior）的桥梁。它的核心职责是**“翻译”**：
- 将物理事件（点击、输入）翻译为 **UI Effect**（弹窗、高亮）。
- 将物理事件翻译为 **Business Signal**（提交订单、刷新列表）。

### 1.1 关键特性

1.  **Input -> Signal 转化**：这是 Logix 架构的核心输入源。Interaction 负责将底层的 DOM 事件（Input）映射为语义化的业务信号（Signal）。
2.  **纯 UI 反馈**：处理不涉及业务逻辑的视觉变化（如打开弹窗、切换 Tab），这部分通常直接由 UI 框架（React/Logix Store）处理，不经过 Flow Runtime。
3.  **解耦**：Interaction 层的变化（如从按钮点击改为快捷键触发）不影响 Behavior 层的逻辑。

## 2. 模型详解

```typescript
interface InteractionIntent {
  events: InteractionEventIntent[]
}

interface InteractionEventIntent {
  id: string
  // 触发源：哪个组件的哪个事件
  source: string // e.g. "toolbar.addButton"
  event: 'click' | 'change' | 'hover' | 'keydown' | string
  
  // 响应动作 (Action)
  action: 
    | { type: 'uiEffect', effect: UiEffectIntent } // 纯 UI 反馈
    | { type: 'emitSignal', signalId: string, payload?: any } // 触发业务信号
    | { type: 'composite', actions: Action[] } // 组合动作
}

interface UiEffectIntent {
  type:
    | 'openModal'
    | 'openDrawer'
    | 'closeModal'
    | 'toggle'
    | 'scrollIntoView'
    | 'selectRow'
    | 'none'
  target?: string // modalId/drawerId/elementId/rowId
}
```

## 3. 与 Behavior & Flow 的连接

在 v2 架构中，Interaction 不再直接触发 Flow，而是通过 **Signal** 进行间接连接：

1.  **Interaction 层**：`Button.onClick` -> `Emit Signal("submitOrder")`
2.  **Behavior 层**：`Flow("OrderProcess")` 监听 `Signal("submitOrder")`

这种设计实现了彻底的解耦：
- **多对一**：多个 Interaction（按钮点击、快捷键、语音指令）可以触发同一个 Signal。
- **一对多**：一个 Signal（如“登录成功”）可以触发多个 Flow（跳转页面、拉取用户信息、建立 WebSocket）。

## 4. UI 映射策略

在平台的“自由画布”视图中，Interaction Intent 表现为**逻辑连线**：

1.  **UI -> UI 连线**：
    - 从“按钮”连向“弹窗”。
    - 含义：点击按钮打开弹窗 (UI Effect)。
    - 视觉：通常用虚线或特定颜色的线表示。

2.  **UI -> Logic 连线**：
    - 从“按钮”连向“逻辑卡片/Flow 节点”。
    - 含义：点击按钮触发该逻辑 (Emit Signal)。
    - 视觉：通常用实线表示，线上可标注 Signal 名称。

## 5. Logix 运行时落地

当 `runtimeTarget = 'logix-engine'` 时，Interaction Intent 会被编译为 Logix 的 Input 监听规则：

```typescript
// 编译前 (Intent)
{
  source: 'submitBtn',
  event: 'click',
  action: { type: 'emitSignal', signalId: 'submit' }
}

// 编译后 (Logix Logic)
store.onInput('submitBtn_click', (event, ops) => {
  ops.emit('submit', extractPayload(event));
})
```
