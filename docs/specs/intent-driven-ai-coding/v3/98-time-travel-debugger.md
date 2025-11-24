---
title: 98 · 时间旅行调试器 (Time Travel Debugger)
status: draft
version: 1 (Initial)
---

> **核心目标**：利用 Effect-TS 的结构化并发特性，提供上帝视角的调试能力。不仅能“看到”过去，还能“回到”过去，甚至“改变”过去。

## 1. 架构原理：全息录制 (Holographic Recording)

传统的 Redux DevTools 只能记录 State 的变化。Logix Debugger 则更进一步，它记录的是 **Effect 的执行轨迹 (Execution Trace)**。

### 1.1 LogixTracer

我们利用 Effect 的 `Tracer` API，注入一个自定义的遥测层。

```typescript
// 伪代码：Trace 数据结构
interface TraceSpan {
  traceId: string;
  parentId?: string;
  name: string; // e.g., "Flow:SubmitOrder", "Node:Validate"
  status: 'pending' | 'success' | 'failure';
  startTime: number;
  duration?: number;
  
  // 上下文快照 (关键)
  attributes: {
    input: any;      // 节点的输入参数
    output?: any;    // 节点的输出结果
    stateDiff?: any; // 该操作导致的状态变更
  };
}
```

### 1.2 采样策略 (Sampling Strategy)

为了避免内存爆炸，Debugger 支持智能采样：
*   **Dev Mode**: 全量记录 (100%)。
*   **Prod Mode**: 仅记录 Error 及其前序 N 个步骤 (Ring Buffer)。

## 2. 可视化交互 (Visual Interaction)

### 2.1 多轨道时间轴 (Multi-Track Timeline)

UI 底部展示一个类似视频剪辑软件的时间轴：

*   **Action Track (主轴)**: 用户的交互事件 (Click, Input) 和外部信号 (WebSocket Msg)。
*   **Flow Tracks (子轴)**: 每个触发的 Logic Flow 占据一行。
    *   **并发可视化**: 你可以直观地看到多个 Flow 是如何并行执行、竞态取消 (Cancellation) 的。
    *   **因果连线**: 点击一个 Action，高亮它触发的所有 Flow。

### 2.2 状态透视 (State Inspection)

点击时间轴上的任意 Span，右侧面板显示：
*   **Input/Output**: 该节点的输入输出。
*   **State Before/After**: 该操作前后的 Store 状态对比 (Diff View)。
*   **Code Link**: 点击直接跳转到对应的源码位置。

## 3. 时间旅行 (Time Travel)

### 3.1 回滚 (Rollback)

拖动时间轴滑块，Logix Runtime 执行以下操作：
1.  **Suspend**: 暂停当前所有正在运行的 Fiber。
2.  **Restore**: 将 Store 的状态重置为目标时间点的快照。
3.  **Freeze**: 进入“暂停模式”，UI 变为只读，防止产生新的 Action。

### 3.2 重放 (Replay)

在暂停模式下，可以选择“重放后续操作”。Runtime 会按时间戳顺序，模拟触发后续的 Action，让你慢动作观察 Bug 是如何复现的。

## 4. 逻辑分叉 (Logic Forking) —— The Killer Feature

这是 Logix Debugger 最强大的功能。它允许你在不修改代码的情况下，**动态验证假设**。

**场景**：
你怀疑某个 API 返回错误导致了 Bug，但很难复现 API 错误。

**操作流程**：
1.  在时间轴上找到那个 API 调用节点。
2.  右键点击 -> **"Fork & Mock"**。
3.  在弹出的面板中，手动修改该节点的输出（例如：强制返回 500 Error）。
4.  点击 **"Run Fork"**。

**系统行为**：
*   Runtime 克隆当前的 Fiber 上下文（Sandbox）。
*   从该节点开始执行，使用你 Mock 的数据。
*   后续流程在新的沙箱中跑完，你可以观察 UI 会如何响应这个错误。
*   **主时间轴不受影响**。

## 5. 集成计划

*   **Phase 1**: 基础 Tracer 集成，实现 Action 日志和 State Diff。
*   **Phase 2**: 可视化时间轴，支持简单的回滚。
*   **Phase 3**: 深度集成 Effect Fiber，实现逻辑分叉 (Forking)。
