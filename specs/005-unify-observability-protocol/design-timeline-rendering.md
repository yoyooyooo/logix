---
title: Reference Design - Timeline Rendering Engine
type: design
status: active
input: specs/005-unify-observability-protocol/spec.md
---

# Reference Design: Timeline Rendering Engine (L9 Redesign)

> 注：本文核心内容已整合进 `specs/005-unify-observability-protocol/spec.md` 的「Timeline Rendering Engine」章节；后续以 spec 为单一事实源。本文保留作为原始设计记录与展开细节的备忘。

## 1. 背景与动机

### 现状：Density Histogram

目前的 `OverviewStrip` 实现采用了类似“均衡器”的密度直方图（Density Histogram）设计：

- 将时间轴切分为固定时间窗口（Bucket，如 100ms）。
- 统计每个窗口内的事件数量（Txn Count / Render Count）。
- 用柱状高度表示密度。

**问题：**

- **丢失时序细节**：无法区分均匀分布的小任务与单个长耗时任务。
- **并发关系模糊**：无法直观看出 Flow 之间的并行与串行关系。
- **因果链路缺失**：难以通过视觉位置判断“A 触发了 B”。
- **交互受限**：不支持精细的滑动窗口（Sliding Window）与缩放。

### 目标：Time-Span Timeline

对标 Chrome DevTools Network/Performance 面板，转向基于时序跨度（Time-Span）的 Timeline 设计：

- **精确时序**：在连续时间轴上绘制任务的 `[start, end]`。
- **甘特图隐喻**：直观展示长耗时任务与并发情况。
- **高级交互**：支持 Brush（框选）、Zoom（缩放）、Pan（平移）。

## 2. 核心设计提议

### 2.1 渲染架构 (Canvas-First)

为了应对潜在的高频事件流（10k+ events/s），Overview 层应放弃 DOM 堆叠，改用 **Canvas** 或 **WebGL** 绘制。

- **Layering**:
  - `Background Layer`: 时间刻度、网格。
  - `Content Lane Layer`: 绘制具体的 Flow/Event 条目。
  - `Interaction Layer`: 处理鼠标 Hover、Brush 选区、游标。

### 2.2 泳道模型 (Lane Model)

在有限的 Overview 高度内（如 40px - 60px），采用极简的泳道布局：

1.  **Main Flow Lane (Top / Dominant)**
    - 绘制核心 Flow / Effect 的执行跨度。
    - 策略：仅展示 Top-Level 或高耗时任务，类似 Flamegraph 的顶层。
    - 视觉：长条（Span），颜色区分状态（Running/Suspended/Error）。

2.  **Event Signal Lane (Bottom / Auxiliary)**
    - 绘制瞬时事件（Action, React Render）。
    - 视觉：散点（Dots）或竖线（Ticks）。
    - 密度过高时自动退化为热力图（Heatmap）颜色。

### 2.3 交互模型 (Brush & Navigation)

- **Miniature View**: 整个 Overview 是 Timeline 的缩略图。
- **Brush**: 双向滑块，定义当前 Main View（下方详细面板）的视口范围 `[viewportStart, viewportEnd]`。
- **Sync**: 拖动 Brush 实时更新 Main View；在 Main View 缩放/平移反向更新 Brush 位置。

## 3. 架构融合：本设计与 Spec 005 的关系

本设计文档旨在作为 **`specs/005-unify-observability-protocol`** 的 **标准参考实现 (Standard Reference Implementation)**。

- **Spec 005** 定义了协议与部署约束（必须支持独立窗口、必须有聚合引擎）。
- **本设计** 提供了满足 FR-012/FR-013 性能要求的 **渲染引擎实现方案**。

**核心融合点：**

1.  **Worker 即 Bridge 终点**：
    本设计的 `Worker-Based Aggregation` 直接作为 Spec 005 的消费者。
    - 在 **内嵌模式**：主线程 `postMessage` -> Worker。
    - 在 **扩展模式**：ContentScript `port.postMessage` -> Background -> DevTools Page (Worker)。
2.  **协议复用**：
    Overview 所需的 Density 数据和 Timeline 布局数据，即为 Spec 005 定义的“聚合引擎”输出。

## 4. 性能与架构 (关键！)

这是一个非常合理的担忧：DevTools 与宿主应用（Host App）共享主线程，如果 DevTools 渲染过于繁重，会直接导致业务卡顿，甚至反向造成观测失真（Observer Effect）。

为了实现“零侵入”或“低侵入”，建议采用以下架构策略：

### 3.1 核心原则：Off-Main-Thread

绝大部分 DevTools 逻辑应当移出主线程。

1.  **Trace Stream 旁路**:
    - 业务运行时产生的 Trace Event 不要在主线程做任何聚合或计算。
    - 仅做 RingBuffer 写入或直接 postMessage 到 **Web Worker**。

2.  **Worker-Based Processing**:
    - **聚合 (Aggregation)**: 在 Worker 中计算 Overview 的直方图/密度数据。
    - **布局 (Layout)**: 在 Worker 中计算 Flamegraph 的 Span 位置 (x, y, width)。

3.  **OffscreenCanvas (可选)**:
    - 如果浏览器支持，直接在 Worker 中使用 `OffscreenCanvas` 进行绘制，将 Bitmap 传回主线程展示。
    - 这将把渲染开销完全从主线程剥离。

### 3.2 降级策略 (Throttling)

- **UI 帧率解耦**: 业务可能跑在 60fps，但 DevTools 没必要实时刷新。
- **RAF Throttling**: Overview 的刷新率可以限制在 10fps 或 20fps，或者仅在 IdleCallback 中更新。
- **Snapshot 模式**: 在高负载下，自动暂停实时更新，仅记录数据；用户点击 "Pause" 后再进行一次性渲染。

## 4. 实现路径建议

1.  **Prototype**: 使用 Canvas 2D API 验证 Span + Dots 混合渲染性能。
2.  **Data Structure**: 设计适合快速 Range Query 的数据结构（如 Interval Tree 或简单的 Sorted Array + Binary Search）。
3.  **Component**: 封装为 `<TimelineOverview canvasRef={...} data={...} onChange={...} />`。

## 4. 待决问题 (Open Questions)

- **Canvas vs SVG?**: 在 Overview 这种小尺寸下，SVG 是否足够？（考虑到事件量级，Canvas 更稳妥）。
- **Web Worker**: 已决：采用 Worker-first（聚合/索引/布局/culling），主线程只做渲染/交互；OffscreenCanvas 可选。
- **与 Logix Trace 集成**: 如何高效从 `TraceStream` 聚合出 Overview 所需的精简数据？

## 5. 视觉设计预览 (Visual Mockups)

### 5.1 整体布局 (Layout)

![DevTools Redesign Layout](./assets/devtools-layout.png)
_图注：上部为 Timeline Overview，展示 Spans 与 Events；下部为详细列表。_

### 5.2 交互演示 (Interaction)

![DevTools Redesign Interaction](./assets/devtools-interaction.png)
_图注：Brush 交互演示，支持双向拖拽选区与 Tooltip 详情查看。_

### 5.3 深度详情 (Flamegraph Detail)

![DevTools Redesign Flamegraph](./assets/devtools-flamegraph.png)
_图注：支持对局部时间窗口进行深度缩放，以 Flamegraph 形式展示 Flow/Service/Effect 的调用栈与依赖关系。_
