---
title: 'Runtime Logix · DevTools UI/UX Design (Draft)'
status: draft
version: 0.1.0
layer: L7
value: proposition
priority: 2000
related:
  - ./07-devtools-vision-rethink.md
---

# Runtime Logix · DevTools UI/UX Design (Draft)

## 1. Design Philosophy: "Focus on the Pulse"

界面设计语言应强调 **"脉冲与收敛" (Pulse & Settlement)**。
Logix 是一个心跳系统，UI 应直观展示“一次刺激（Interaction）”如何引发“一阵心跳（Runtime Cycles）”并最终“归于平静（Settled）”。

- **Main Metaphor**: ECG (心电图) for Sessions.
- **Color Coding**:
  - **Interaction**: Blue (Input).
  - **Logix Processing**: Purple (Trait/State).
  - **Commit/Render**: Orange/Red (Cost).
  - **Settled**: Green (Success).

## 2. Global Layout (Master-Detail)

采用经典的 **Master-Detail** 布局，但右侧详情页不仅是展示，而是“诊断工作台”。

```
+----------------+---------------------------------------------------------------+
|  Session List  |  Current Session: [ Click "Submit" ]                     [x]  |
|  (Sidebar)     |  Status: Settled (12ms) | Commits: 3 (Warn)                   |
+----------------+---------------------------------------------------------------+
|                |                                                               |
|  [Click]       |  +-----------------------+   +---------------------------+    |
|  10:02:01      |  |  Interaction Timeline |   |   Convergence Advisor     |    |
|  AccoutUpdate  |  |  (Visual Trace)       |   |   (Right Panel)           |    |
|  (3 Commits)   |  |                       |   |                           |    |
|                |  |  [User Action]        |   |  [ ! ] High Frequency     |    |
|  [Input]       |  |        |              |   |        Commit             |    |
|  10:02:05      |  |        v              |   |                           |    |
|  Search        |  |  ( Logix Cycle 1 )    |   |  建议: Merge Actions      |    |
|  (1 Commit)    |  |  [== Commit #1 ==]    |   |                           |    |
|                |  |        |  ^           |   |  +---------------------+  |    |
|                |  |      (Async)          |   |  | [Simulate Merge]    |  |    |
|                |  |        v  |           |   |  +---------------------+  |    |
|                |  |  ( Logix Cycle 2 )    |   |                           |    |
|                |  |  [== Commit #2 ==]    |   |                           |    |
|                +--------------------------+   +---------------------------+    |
|                                                                                |
+--------------------------------------------------------------------------------+
```

## 3. Component Deep Dive

### 3.1. Interaction Session List (The "Pulse Stream")

Sidebar 不再是密密麻麻的 Event Log，而是 **高层意图流**。

- **Item Structure**:
  - **Icon**: Action Type Icon (e.g., Star for User Action, Refresh for Lifecycle).
  - **Title**: **Action Type** (e.g., `user/updateProfile` or `cart/addItem`).
    - _Note: 之前讨论的 DOM Click 因实现成本问题已移除，现在以 Root Action 为唯一事实源。_
  - **Badges**:
    - **Commit Battery**: 一个像电池一样的图标，分段显示。1格=1次Commit。绿色=1格，黄色=2格，红色=3+格。
    - **Duration**: 总耗时 (e.g., `45ms`).
- **Interaction**:
  - **Live Mode**: 列表自动滚动，新 Session 插入时带有“高亮闪烁”动画，象征脉冲到达。
  - **Grouping**: 极短时间内的连续微操作（如 `mousemove`）自动折叠为 Stack。

### 3.2. Causal Flow Canvas (The "Map")

位于中央的主视图，不再是简单的垂直列表，而是一个 **"Causal DAG" (画布)**。

- **Design Goal**: Human-Readable Causality. 让你一眼看懂“谁触发了谁”。
- **Nodes (The Critical Signals)**:
  1.  **Trigger (Blue)**: **Root Action** (e.g., `user/submit`).
  2.  **Logix Cycle (Purple Block)**:
      - **含义**: 代表 "Action Dispatch + **Convergence (收敛计算)**"。
      - **宽度**: 也就是 Block 的长度，直接代表了 **收敛耗时**。如果 Block 很长，说明 Reducer/Trait 计算太重。
      - **折叠内容**: 具体的 50 个 Trait 计算被折叠在 Block 内部，点击可展开详情。
  3.  **Service/Resource (Yellow)**: 外部 IO。
  4.  **Control Point (Gray)**: 调度节点。
  5.  **Commit Line (Vertical Red Line)**:
      - **含义**: **Transaction Commit (事务提交)**。
      - **视觉**: 垂直贯穿所有泳道的红线。它是**里程碑**，标志着 State 在这一刻落地并通知 UI 渲染。
  6.  **Error/Suspend (Red Triangle)**: 异常。
- **Semantic Folding (噪声折叠)**:
  - **默认折叠**: 纯计算 (Reducers), 简单的 Trait 派生, Read-only Selectors.
  - **按需展开**: 只有当某个 Trait 计算导致了显著性能开销，或成为了长依赖链的枢纽时，才自动“晋升”为可见节点。
- **Layout (Horizontal Causal Gantt)**:
  - **X-axis (Time/Causality)**: 时间从左向右流动。这也符合 "ECG 脉冲" 的视觉隐喻。
  - **Y-axis (Logical Lanes)**: 纵向泳道代表 "Modules" 或 "Logical Threads"。
    - **Compactness**: 纵向相邻的节点代表在同一时间段内（或紧密接续）发生的并发/关联事件。
  - **Visual Advantage**:
    - **并行展示**: 能清晰看到 Main Thread 和 Async Effect 在时间轴上的重叠（Concurrency）。
    - **长尾检测**: 很容易发现某个 Service Call 的横条特别长（Duration 瓶颈）。

- **Source Attribution (Definitional Layer)**:
  - **Module Hints**: 每个 Node 左侧有极细的彩色竖条（或 Badge），代表所属 Module (e.g., `Auth`=Blue, `User`=Green)。
  - **Logic Edges**: 连接节点的"线条"不只是画线，Hover 时显示逻辑来源：`caused by Auth.loginLogic`.
  - **Reducer Context**: 点击 Commit Node，详情页首行显示：`Calculated by: Auth.reducers.setProfile`.

### 3.3. Convergence Advisor (The "Doctor")

右侧面板，当检测到 Pattern 时自动弹出。

- **Card UI**:
  - **Title**: 诊断结论 (e.g., "Waterfall Commits Detected").
  - **Evidence**: "在 16ms 内发生了 3 次 Commit。"
  - **Interactive Prescription**:
    - **"Try Policy" Button**:
      - 点击后，Devtools 在内存中 Fork 当前 Runtime 状态。
      - 应用建议的策略（e.g., `debounce: 50`）。
      - 重新回放刚才的 Action。
      - **Comparison View**: 展示 "Original (3 Commits)" vs "Optimized (1 Commit)" 的对比图。
      - **Apply Code**: 提供复制代码片段的功能。

### 3.4. Drill-down: State Inspector (The "Microscope")

用户依然可以查看详细的 State Diff 和快照，但它们被**按需折叠**了。

- **Access Point**:
  - 点击 **"Commit Line" (红色分割线)** -> 查看该次 Commit 的 **State Diff** (What changed?).
  - 点击 **"Processing Block" (紫色区块)** -> 查看处理过程中的 **Full Snapshot** (State Tree).
- **UI Metaphor**:
  - **Diff View**: 类似于 Git Diff，左侧 Old Value，右侧 New Value，高亮变更字段。
  - **Snapshot View**: JSON Tree Explorer，但在 Root 节点上标注了 `Revision ID`。
- **Why**: 避免一开始就淹没在巨大的 State Tree 中，只有当用户看到 "Commt 导致了 50 个组件渲染" 时，才会有动力去点开看 "到底谁变了"。

## 4. Key Interactions

1.  **Quick Scrubbing**: 在 Sidebar 快速上下切换 Session，右侧视图无缝切换，方便对比不同操作的代价。
2.  **Commit Drill-down**: 点击 "Commit #1" 红线，展开显示具体的 Dirty Selectors 和 State Diff。
3.  **Quiescence Indicator**: Session 列表项在进行中时显示 "Running..." 动画；当 Quiescence 检测通过（Active Fibers = 0）时，变为静态并打上绿勾。

## 5. Visual Language Checklist

- [ ] **Commit Lines**: 必须醒目。用颜色深浅代表 Dirty Selector 的数量（影响范围）。
- [ ] **Async Gaps**: 用虚线或波浪线表示等待。
- [ ] **Health Score**: 每个 Session 给一个 A/B/C/D 评分，显示在列表右侧。

## 6. Visual Reference

### 6.1. Concept Mockup

下图展示了 "Master-Detail" 布局、"Visual Trace" (中央流图) 以及 "Advisor" (右侧诊断卡片) 的视觉形态。

### 6.2. Interaction Flow Diagram

用户从宏观意图下钻到微观数据的路径：

```mermaid
graph TD
    User[User] -->|1. Select| SessionList[Session List (Sidebar)]
    SessionList -->|Show| VisualTrace[Visual Trace (Main View)]

    subgraph "Visual Trace: The Anatomy"
        Trigger((Trigger: Click)) --> Processing[Logix Processing Block]
        Processing -->|Result| CommitLine{Commit Divider (Red Line)}
    end

    Processing -->|Click Block| SnapshotPanel[Snapshot Inspector]
    CommitLine -->|Click Line| DiffPanel[State Diff Inspector]
    CommitLine -->|Hover| SelectorList[Dirty Selector List]

    subgraph "Advisor (Right Panel)"
        Analysis[Pattern Analysis] -->|Detect| Prescription[Recommendation Card]
        Prescription -->|Click 'Try'| Simulator[Optimization Simulator]
    end

    VisualTrace -.-> Analysis
```

## 7. Tech Stack Implementation Guide

为了实现上述高保真交互与可视化，推荐以下前端技术栈组合：

### 7.1. Visualization Engine (The Core)

- **Library**: **React Flow (v12)** / `@xyflow/react`
- **Reasoning**:
  - **DAG Layout**: 天然支持节点与连线（Edges）的拓扑渲染，内置了 Zoom/Pan/MiniMap。
  - **Custom Nodes**: 所有的 Node（Action, Commit, Service）都是标准的 React 组件，易于开发和样式定制。
  - **Performance**: v12 对大量节点有显著优化，对于 "Hundreds of Events" 级别的 Session 足够流畅。
  - **Layout Strategy**:
    - **Time Axis**: 不使用自动布局算法（如 Dagre），而是结合 **`d3-scale`** 手动计算 X 轴坐标 (`x = timeScale(timestamp)`).
    - **Lane Axis**: 手动计算 Y 轴坐标 (`y = laneIndex * LANE_HEIGHT`).

### 7.2. Layout & Interactions

- **Styling**: **Tailwind CSS** (已接入) + **`clsx`** / **`tailwind-merge`**.
- **Primitives**: **Radix UI** (Primitives).
  - 用于构建无障碍的 Popovers (Source Attribution), Dialogs (Settings), Tooltips.
- **Micro-Animations**: **Framer Motion** (已接入).
  - 用于 Session List 的“脉冲”进入动画，以及 Canvas 节点的 Layout Transition。

### 7.3. Date & Math

- **Time Scale**: **`d3-scale`**.
  - 用于将毫秒级时间戳精确映射到像素坐标，实现 "Zoomable Timeline"。
