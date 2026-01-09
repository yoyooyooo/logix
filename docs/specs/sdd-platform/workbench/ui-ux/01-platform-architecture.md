---
title: 01 · 平台工作台 IA（Universe/Galaxy/Studio/Lab）
status: draft
version: 1.1 (Chinese)
---

> **核心哲学**：平台不仅仅是一个绘图工具，它是一个 **原生 SDD (Spec-Driven Development) 工作台**。
> 它通过“架构即视图 (Architecture as View)”的方法，将 **意图 (Intent)** 在 L0-L3 层级之间进行转换与落地。

## 1. 功能架构 (四大核心模块)

我们定义了 **4 个核心模块**，它们直接映射到 SDD 生命周期和 Intent 分层模型。

### 模块 A：架构师宇宙 (L1: Universe View)

- **定位**：系统设计与边界定义。
- **对应意图**：**L1 (模块意图 / Module Intent)**。
- **核心对象**：
  - **Zones (业务域)**：模块的逻辑分组。
  - **Modules (模块)**：核心单元 (Store + Logic + Schema)。
  - **Services (服务)**：外部依赖 (API, DB, RPC)。
- **交互方式**：
  - **绘制拓扑 (Draw Topology)**：可视化连接模块 (生成 `$.use` 依赖)。
  - **定义 Schema (Define Schema)**：可视化编辑模块形态 (State/Action 定义)。
- **UI 隐喻**：“星系地图 (Galaxy Map)”。利用语义缩放查看宏观的业务域或微观的模块细节。
- **参考资产**：`assets/platform/platform-dashboard-galaxy.png` (虽名为 Galaxy，但展示了宏观拓扑的大图理念)。

### 模块 B：逻辑星系 (L2: Galaxy View)

- **定位**：流程编排与业务逻辑组装。
- **对应意图**：**L2 (流程意图 / Flow Intent)**。
- **核心对象**：
  - **Nodes (节点)**：Store、Pattern 实例、逻辑单元、触发器 (UI/Time)。
  - **Edges (边)**：信号/数据流 (IntentRules)。
- **交互方式**：
  - **Pattern 实例化**：从 **能力市场 (Pattern Marketplace)** 拖拽到画布 (参考 `assets/platform/logix-pattern-marketplace.png`)。
  - **向导优先配置 (Wizard-First Config)**：通过右侧面板的 **Trait Builder** 配置 Pattern 参数 (参考 `assets/platform/unified-trait-builder.png`)。
  - **可视化连线 (Visual Wiring)**：连接 Source 到 Sink，生成 `IntentRule` IR。
- **UI 隐喻**：“节点图 (Node Graph)” / “电路板”。具有清晰的方向性和高度结构化。
- **参考资产**：`assets/platform/platform-dashboard-galaxy.png` (核心编排视图)。

### 模块 C：专业工作室 (L3: Pro Studio)

- **定位**：实现精修、代码编写以及从 Pattern 中“弹出 (Ejecting)”。
- **对应意图**：**L3 (步骤意图 / Step Intent)** 与实现细节 (Implementation Details)。
- **核心对象**：
  - **Source Files**：TypeScript / Effect 代码。
  - **Tests**：单元测试与集成测试。
- **交互方式**：
  - **分屏视图 (Split View)**：左侧图 (Galaxy)，右侧代码 (Monaco Editor)。
  - **双向导航 (Bi-directional Nav)**：从图“跳转定义”到代码；从代码“在图中揭示”节点。
- **UI 隐喻**：“现代 IDE”。
- **参考资产**：`assets/platform/intent-to-code-split.png` (意图到代码实时转换)。

### 模块 D：对齐实验室 (L4: Alignment Lab)

- **定位**：运行时验证、调试与对齐分析（以 RunResult 为唯一 Grounding）。
- **对应意图**：**Verification / Alignment**（RunResult + AlignmentReport）。
- **核心对象**：
  - **RunResult**：`EvidencePackage + optional Tape + snapshots + anchors`（口径见 `docs/ssot/platform/contracts/01-runresult-trace-tape.md`）。
  - **Time Travel**：历史回溯/分叉（口径见 `docs/ssot/platform/contracts/02-time-travel.md`）。
  - **Alignment Matrix**：针对 Specs 的验证结果矩阵。
- **交互方式**：
  - **回放 (Replay)**：拖动时间轴重现状态。
  - **通用探针 (Universal Spy)**：实时展示系统状态流转 (参考 `assets/runtime/runtime-universal-spy.png`)。
- **参考资产**：`assets/runtime/replay-diff-analyzer.png` (时光机与 Diff 分析)。

---

## 2. 交互模型 (通往意图的窗口)

### 2.1 “向导优先”原则 (Wizard-First Principle)

对于标准 Pattern (L1/L2)，用户应主要通过 **配置表单 (Configuration Forms / Wizards)** 进行交互，这些表单由 Schema 驱动生成。

- **Pattern Schema**：定义 `config` 的形状 (Shape)。
- **平台 UI**：自动生成表单。
- **输出**：生成/更新 `IntentRule` 或 Pattern 调用代码。
- **逃生舱 (Escape Hatch)**：用户随时可以“弹出 (Eject)”到代码模式 (模块 C) 进行 L3 级别的定制。

### 2.2 语义缩放 (Semantic Zoom)

界面使用单一的连续空间，根据缩放级别适配展示的细节程度：

- **缩小 (Universe)**：查看业务域 (Zones) 和模块间关系。
- **放大 (Galaxy)**：查看模块的内部结构 (Stores, Patterns)。
- **进一步放大 (Code)**：直接窥视节点的 TypeScript 实现源码。

### 2.3 “IntentRule” 作为连线协议

- **可视化连线**：在模块 B (Galaxy) 中的连线操作会创建 `IntentRule` 记录。
- **代码生成**：消费这些 Rules 并产出 TypeScript 代码。
- **对齐/回放**：在模块 D (Lab) 中用 RunResult 的 `evidence.events` 与 anchors 回溯映射到这些 Rules 上。

---

## 3. UI 隐喻与美学

### 3.1 “动态工作台” 布局 (Dynamic Workbench)

单一的应用窗口，最大程度减少页面刷新或全量上下文切换。参考资产 `assets/logix-system-ui/workbench-split.png` (统一工作台) 与 `assets/logix-studio-prod/workspace-main.png` (生产环境工作区)。

| 区域                     | 组件                   | 描述                                                                                                                                                              |
| :----------------------- | :--------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **顶部栏 (Top Bar)**     | **上下文切换器**       | 在 Universe / Galaxy / Code 视图间切换。全局搜索。                                                                                                                |
| **主舞台 (Main Stage)**  | **画布 / 编辑器**      | 无限平移网格 (Graph) 或 Monaco 编辑器 (Code)。支持 **上下文逻辑气泡 (In-Context Popover)** (`assets/logix-system-ui/context-popover.png`)，原地编排，不打断心流。 |
| **右侧栏 (Right Rail)**  | **检查器 (Inspector)** | **感知上下文**。显示选中节点的向导表单 (Wizard Forms)。                                                                                                           |
| **底部栏 (Bottom Rail)** | **实验室 (The Lab)**   | 可折叠的时间轴与控制台 (模块 D)，包含 **系统状态栏** (`assets/logix-system-ui/status-footer.png`)。                                                               |

### 3.2 视觉语言

- **美学风格**：“Future of Coding”。原生深色模式。高对比度线框风格。
- **配色体系**：
  - **Data/State (数据/状态)**：蓝/青色 (Blue/Cyan)。
  - **Side Effects (副作用)**：橙/琥珀色 (Orange/Amber)。
  - **Success/Safe (成功/安全)**：绿/青色 (Green/Teal)。
  - **Error/Drift (错误/漂移)**：红/粉色 (Red/Pink)。
- **动效**：缩放层级间的流畅过渡。连线时的微交互。

---

## 4. 智能辅助 (Smart Assistance)

基于 visual assets 中的 "Excel Killer" 概念，平台将集成以下智能特性：

- **冲突熔断 (Conflict Breaker)**：
  - 可视化的逻辑重叠分析 (Venn 图形式)。
  - 参考资产：`assets/excel-killer/conflict-breaker.png`。
- **遗漏卫士 (Omission Guard)**：
  - AI 驱动的最佳实践检查 (例如“配置了隐藏却未配置重置”)。
  - 参考资产：`assets/excel-killer/omission-guard.png`。
- **智能摄入 (Smart Ingestion)**：
  - 从自然语言文本直接生成逻辑 Chips。
  - 参考资产：`assets/excel-killer/smart-ingestion.png`。

---

## 5. 工作流场景 (Walkthrough)

**场景**：添加一个“用户搜索 (User Search)”特性。

1.  **Specify (L0)**：用户提示 AI -> 平台起草 **Requirement Intent (需求意图)**。
2.  **Universe (L1)**：用户创建 `UserSearch` 模块节点。
3.  **Galaxy (L2)**：
    - 用户拖入 “Table Pattern” (表格模式) & “Query Service” (查询服务) Pattern。
    - 用户通过 **右侧栏向导** 配置 “Query Service” 的 endpoint。
    - 用户将 `Query.data` 连线至 `Table.dataSource`。
    - _后台结果_：`IntentRule` 列表被更新。
4.  **Studio (L3)**：用户点击 “Generate (生成)”。检查生成的 `.logic.ts`。添加自定义转换逻辑。
5.  **Lab (L4)**：用户点击 “Simulate (模拟)”。通过 **底部栏时间轴** 验证搜索行为。

---

## 5. 下一步计划

- **Schema 定义**：正式定义支持 L2 连线交互所需的 `IntentRule` schema。
- **Codegen 原型**：验证针对提议 Pattern 的 `IntentRule -> Code` 生成链路。
- **UI 原型**：使用 React Flow/X6 搭建 "Galaxy View" 的布局原型。
