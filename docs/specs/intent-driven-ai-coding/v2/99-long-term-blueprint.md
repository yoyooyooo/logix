---
title: 99 · 长期蓝图：画布 · LLM · 运行时
status: draft
version: 0
---

> 本文**只描述长期愿景与方向性设计**，不构成 v2/MVP 的交付范围。当前 M0–M3 仍以「Intent→Plan→代码」核心引擎为主，详见 `01-overview.md` 与相关设计文档。

## 0. 范围说明

- 本文汇总自：深度蓝图（画布/LLM/运行时）、实施建议报告以及 v2 设计文档中尚未纳入 MVP 的构想；
- 目标：给团队一个中长期「北极星」，在设计当前引擎时避免做出与这些方向冲突的决策；
- 原则：**不在当前迭代内承诺实现**，仅作为后续规划与优先级排序的输入。

---

## 1. 画布：从「画板」到「意图乐高底板」

### 1.1 Pattern-First 画布

- 工具箱以 **UI Pattern 为最小颗粒度**：
  - 如 `filter-bar`、`table-with-server-filter`、`workbench-layout` 等，而非 `<div>`/Row/Col 等原始元素；
  - 每个画布节点都绑定 `patternId` 与 `propsIntent`。
- 价值：
  - 把布局/视图编辑直接约束在团队认可的模式集合内；
  - 降低 LLM/用户在「组件选型」上的自由度，换来更高的一致性与可维护性。

### 1.2 Grid-Snapping 布局

- 画布基于响应式网格系统：
  - 用户只能调整「列数/区域占比」，而不是像素级坐标；
  - 所有区域映射到 `LayoutIntent.layoutType + regions + tree`。
- 价值：
  - 与设计系统一一对应，保证布局天然响应式；
  - LayoutIntent 可以长期稳定演进，不依赖具体 UI 实现。

### 1.3 Context-Aware 操作与可视化意图

- 上下文感知菜单：
  - 选中某个 Node/Container，出现有限的高价值操作（添加列、切换变体、绑定 Flow 等）；
  - 禁止全局「万能属性面板」，减少心智负担。
- 意图具象化：
  - 使用标记/图标将不可见意图可视化：
    - Interaction：节点之间的闪电/箭头线；
    - Data & State：字段/实体徽章；
    - Constraint：性能/安全标记；
    - Code Structure：面包屑路径。
  - 画布不仅是 UI 草图，也是 Intent 关系图。

### 1.4 Canvas 元素与六层意图映射

长期目标是 Canvas 与 Intent 模型一一对应：

| Canvas 元素 | 主映射意图 | 说明 |
| --- | --- | --- |
| Node | ViewIntent | 可见 UI 区块，对应一个 Pattern 及其 propsIntent |
| Container/Frame | LayoutIntent | 区域容器，对应 regions/tree 中的节点 |
| Connection/Wire | InteractionIntent | 事件连线：从 source 触发到 target 反馈 |
| Data Badge | DataStateIntent | 展示数据绑定（实体/字段/状态来源） |
| Behavior Node | BehaviorIntent / Flow | 在 Flow 视图中，每个节点是一个 Effect/步骤 |
| Breadcrumb | CodeStructureIntent | 显示当前画布内容映射到的模块/文件路径 |

实现 Canvas 时，应尽量遵守上述映射，以便：

- 从 Intent 生成画布视图；
- 从画布操作反向更新 Intent；
- 让 LLM 可以在「可视化 + Schema」双通道下工作。

---

## 2. 高阶交互：指令、连线与用例透视

本节描述的交互模式均为 **M4+ 之后的扩展能力**，需要在 Intent/UseCase/Flow schema 稳定后再逐步尝试。

### 2.1 指令行起局（0→1 魔法输入）

- 交互：在 Studio 顶部提供自然语言指令输入：
  - 例如：「创建一个用户管理列表，需要搜索和分页」；
  - LLM 生成 Layout/View/Data/Behavior 的草稿 Intent，以及初始 Canvas 布局。
- 效果：
  - 预览区渲染基础页面；
  - 左侧自动生成 UseCase 列表（查看/搜索/翻页等）；
  - 右侧以「AI 执行摘要」展示 LLM 做了什么。

### 2.2 Select & Command（框选 + 指令）

- 交互：
  - 在预览或 Canvas 区，对列/组件进行框选；
  - 弹出上下文命令栏，列出高频操作（如：合并列、开启排序、调整宽度等）；
  - 支持输入自然语言指令，如「给邮箱列加复制按钮」；
  - 平台/LLM 将操作映射为 ViewIntent/InteractionIntent 的修改。
- 价值：
  - 让常见视图变更变成「所见即所得」的直接操作；
  - 避免在复杂表单里寻找某个 props。

### 2.3 Intent Connector（意图连接线）

- 交互：
  - 激活连接模式（例如按住 Ctrl），从「搜索按钮」拖线到「用户列表」；
  - 弹出对话框询问「按钮被点击时要对列表做什么」；
  - 用户选择「刷新数据」/「滚动到顶部」/「自定义流程」；
  - 系统自动关联 InteractionIntent 与 BehaviorIntent/Flow。
- 前置条件：
  - InteractionIntent.events 作为事件事实源；
  - FlowIntent.trigger 使用 eventId 引用事件；
  - View/Layout 为元素提供稳定的 source 标识。

### 2.4 用例透视与渐进披露

- 默认视图：UseCase 透视
  - 左侧列表是业务用例（如「管理员搜索用户」「导出订单」）；
  - 中间/右侧聚合展示该 UseCase 相关的 Layout/View/Interaction/Flow/Data 片段。
- 高级视图：意图层级视图
  - 切换后按 Layout/View/Interaction/Behavior/Data/Code 维度展示全局；
  - 面向架构师和高级前端，方便做全局优化。
- 目标：
  - 日常开发以 UseCase 为中心，减少一次性面对 6+1 层意图的压力；
  - 向下兼容现有 `06-intent-linking-and-traceability.md` 的关联模型。

### 2.5 Escape Hatch：一键穿透 VS Code

- 交互：
  - 在任何 UI 元素/UseCase/Intent 详情旁提供 `<>` 图标；
  - 点击后打开本地 IDE，并定位到 Plan/Template 生成的核心代码文件与行号；
  - 长期目标是在 IDE 变更后，平台可感知 diff，甚至尝试反向更新 Intent。
- 依赖：
  - 稳定的 CodeStructureIntent/fileId/path；
  - PlanActionV2 中携带意图/UseCase/Flow 的来源信息。

---

## 3. LLM 与运行时：从草稿生成到动态守护

### 3.1 LLM 任务矩阵（长期）

在现有「LLM 协作原则」基础上，长期希望收敛出一套稳定的任务 API：

- `generate_intent_from_brief`：从自然语言/文档生成 Intent 草稿；
- `suggest_view_change_for_selection`：基于选中组件/区域生成视图修改建议；
- `draft_flow_from_story`：从用户故事生成 FlowIntent/FlowDsl 草稿；
- `reverse_engineer_intent_from_code`：从现有代码推导 IntentSpec 草稿；
- `explain_code_and_flow`：在 Escape Hatch 时，对代码与 Flow 执行路径给出解释；
- `propose_refactor_from_pattern_change`：当 Pattern/best-practice 进化时，给出自动重构建议。

这些任务都应：

- 产出结构化结果（Intent/Flow AST/diff 等），而非直接改文件；
- 通过 schema 校验、Plan 幂等与 AST merge 落盘；
- 记录命中率/回退率/冲突率，用于模型评估与 Prompt 调整。

### 3.2 Constraint Runtime：从静态约束到运行时守护

长期目标是让 Constraint Intent 不止影响出码，还能驱动运行时行为：

- 性能/重试/超时/熔断/审计等配置被编译为 effect-ts Layer 配置；
- Flow 执行时从 Layer 动态读取这些约束，并应用相应中间件；
- 可与 OpenTelemetry 等可观测性方案集成，让告警直接指向 UseCase/Flow/Intent。

这要求：

- ConstraintIntent schema 与 Flow/Layer 之间有清晰映射；
- 运行时配置与代码解耦，可热更新或干预，而无需重生成/部署代码。

### 3.3 意图驱动的自动重构与存量接入

- 当 Pattern/best-practice 进化时：
  - 平台扫描代码库，识别「旧模式」使用点；
  - 根据新 Pattern/Template 生成重构建议或直接发起 MR；
  - 重构操作走 Plan/AST merge，保证安全可回滚。
- 对存量项目：
  - 使用 LLM 分析已有页面/模块，生成 IntentSpec 草稿；
  - 支持「先只做视图/布局/数据投影」的部分接入路径，逐步引入 Behavior/CodeStructure 层。

---

## 4. 团队知识图谱与测试生成

### 4.1 意图依赖图与影响分析

- 构建跨层的「意图依赖图」：
  - 节点：Intent/UseCase/Pattern/Template/Plan/Flow/实体/API 等；
  - 边：引用关系、依赖关系、实现关系。
- 能力：
  - 当某个实体/API/Pattern 变更时，自动评估影响到哪些 UseCase/UI；
  - 在评审阶段可视化展示影响面，帮助决策是否接受变更。

### 4.2 基于 Behavior Flow 的测试生成

- 利用 BehaviorIntent/FlowDsl 生成端到端/集成测试骨架（Playwright/Cypress 等）：
  - Flow 中的步骤和断言转化为测试动作与期望；
  - 与 Interaction 录制/回放打通，复用场景数据。
- 目标：
  - 让测试用例对齐业务意图，而不是只针对控件级行为；
  - 提升测试覆盖率与可维护性。

---

## 5. 与当前 v2/MVP 的关系

- 本文所有内容**不进入**当前 M0–M3 的交付 checklist，只作为后续路线规划与设计约束参考；
- 现阶段进行的任何 schema/引擎设计，若与本蓝图冲突，应在评审时显式指出并权衡；
- 当 M0–M3 与首个端到端试点完成后，可从本蓝图中挑选少量高价值能力（例如 Escape Hatch、UseCase 透视）作为下一阶段目标。

