# 调试功能 (Debugging Features)

> **Status**: Draft (v3 Effect-Native)
> **Date**: 2025-11-24
> **Layer**: Tooling Layer

Logix 提供了强大的调试能力，旨在让逻辑执行过程透明化、可视化。核心是基于 **Action Trace** 的全链路追踪系统。

## 1. DevTools 架构

Logix DevTools 是一个独立的 Chrome 扩展或 React 组件，通过 `DevToolsBridge` 与 Logix 引擎通信。

### 1.1 通信协议

引擎会广播以下事件：

*   `INIT`: Store 创建。
*   `ACTION`: Action 被派发。
*   `STATE_CHANGE`: State 发生变化。
*   `FLOW_TRIGGER`: Flow 被触发。
*   `EFFECT_START` / `EFFECT_END`: 副作用执行起止。

## 2. 核心视图

### 2.1 Timeline (时间轴)

展示应用运行的时间线。每个节点代表一个 Action 或 State Change。

### 2.2 State Tree (状态树)

实时展示当前的 State 结构。

### 2.3 Logic Flow (逻辑流)

这是 Logix 特有的视图。它展示了 Action 是如何一步步触发 Flow，进而产生 Effect 的。

## 3. 追踪系统 (Tracing System)

### 3.1 Trace ID

每个外部触发（用户点击、WebSocket 消息）都会生成一个唯一的 `TraceID`。这个 ID 会随着逻辑链路传递。

```text
[Trace: abc-123] User Clicked Button
  -> Dispatch Action: SUBMIT
  -> Trigger Flow: SubmitForm
  -> Effect: Set Loading = true
  -> Effect: Call API
  -> Effect: Dispatch Action: SUBMIT_SUCCESS
    -> Trigger Flow: ShowToast
```

### 3.2 因果图 (Causality Graph)

基于 Trace ID，DevTools 可以构建出“因果图”，清晰地展示“谁触发了谁”。
