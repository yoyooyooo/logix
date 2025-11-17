---
title: 03 · L0 Spec Studio & Specify 阶段
status: draft
version: 2025-12-12
value: vision
priority: next
related:
  - docs/specs/intent-driven-ai-coding/06-platform-ui-and-interactions.md
---

# L0 Spec Studio：SDD 平台的需求入口

> 本文作为 `topics/sdd-platform` 的子篇，吸收旧「spec-studio」草案中与 **平台形态** 相关的内容，只保留 Spec Studio 在 **L0 / SPECIFY 阶段** 的角色与边界。  
> 具体的 UI 组件与交互细节建议以 `docs/specs/intent-driven-ai-coding/06-platform-ui-and-interactions.md` 为准。

## 1. 在 SDD 生命周期中的角色

- 上游：用户/PM 在 Spec Studio 中以自然语言 + Intent Widgets 方式，逐步结晶出 `FeatureSpec` / `ScenarioSpec` / `Step`；  
- 下游：一旦用户在 Studio 中点击 “Approve Spec”，平台根据 `sdd-platform/00-overview.md` 中的约定，将 Spec 交给 Architect/Task/Coder Agents，进入 PLAN/TASKS/IMPLEMENT 阶段。  
- 约束：Spec Studio 不直接关心 ModuleRuntime / Logix 细节，也不定义 Agent 分工，只负责产出高质量的 L0 Intent 资产。

## 2. 画布结构与 Intent Widgets（来自原 spec-studio 草案）

在 L0 阶段，画布由“富文本 + 意图原语节点”组成，关键 Widget 如下：

- `Epic / Feature Group`：组织多个 User Story 的容器，用于规划范围与胃口；  
- `User Story Widget`：`As a <Role>, I want <Feature>, So that <Benefit>`，生成 Logic Intent L1 的种子；  
- `Logic Flow (Gherkin)`：`Given/When/Then` 步骤，编译为 `IntentRule` 草稿；  
- `Domain Concept`：`Entity { Field: Type }`，生成 Module Intent 节点与 Schema 草稿；  
- `UI Sketch`：Screen + Component 列表，映射为 UI Intent 节点与组件树占位。

这些 Widget 的运行时映射与交互形式（Mad Libs、Smart Spreadsheet、Whiteboard + Vision 等）沿用原 `spec-studio` 草案，只是在这里被明确标注为：**它们的产物都是 L0/L1 Intent 资产**，不会直接操作代码。

## 3. 产品定义与核心隐喻（Logix Spec Studio v0.1）

站在产品视角，Spec Studio 可以被定义为一个 **“Live Specification”（活体规格说明书）编辑器**：

- **对 PM**：像写 PRD 一样自然（大段文本 + 少量结构化块），但每个嵌入块都是“可以生成/验证代码”的意图单元；  
- **对 AI**：文本提供上下文（Context），嵌入块提供结构化约束（Constraints），极大提高生成/分析质量；  
- **对 Dev**：文档里的块直接映射为代码骨架/测试入口，而不是仅供参考的 prose。

在实现上，编辑器内核可以看作 “文本流 + 意图块”：

- **文本流（Text Stream）**：普通 Markdown 段落，承载背景/目标/风险等；  
- **意图块（Intent Blocks）**：嵌入在文本中的结构化节点，至少包括：  
  - **实体块（Entity/Module Block）**：蓝色卡片，对应 `Logix.Module` / Domain Intent，定义实体名称与字段列表，可从 TS interface 反向生成；  
  - **逻辑块（Logic/Rule Block）**：紫色卡片，对应 `IntentRule` / Logic Intent，包含 Trigger/Action/描述，支持自然语言 → 结构化解析；  
  - **场景块（Scenario Block）**：Given/When/Then 形式的用例块，作为对 Alignment Lab/Sandbox 的直接输入。  

编辑器内核推荐基于 Tiptap/ProseMirror 一类可扩展富文本引擎，通过 Slash 命令插入这些 Block，并在右侧 Outline 中自动生成“本文档定义的实体/规则/场景索引”，方便 Dev/AI 快速定位。

## 4. 与平台总图的接口

- 输入：原始需求（对话、文本、草图）；  
- 输出：  
  - `FeatureSpec`（Feature/Epic + Appetite + Risk/No-Gos）；  
  - `ScenarioSpec`（Given/When/Then 步骤与示例数据）；  
  - 初步的 `LogicIntentNode` / `ModuleIntentNode` / `UIIntentNode` 草稿，与文字保持双向锚点。
- 交接点：当 Spec Studio 触发 “Approve Spec” 时，平台根据 `sdd-platform/00-overview.md` 中的 Context Pack 规范，将上述资产打包为 **Spec Context Pack**，交给 Architect Agent。

从“动态文档”视角，可以粗略对应三阶段：

- **Define（PM 视角）**：在文本中插入 Entity/Logic/Scenario 块，结合 AI 辅助完成建模；  
- **Implement（Dev 视角）**：在 Dev Studio/CLI 中基于这些 Block 生成 Module/Logic/Test 骨架（单向流 v0，可以只标记“Doc→Code 版本锚点”）；  
- **Verify（Runtime 视角）**：在 Playground/Alignment Lab 中以 Scenario Block 为入口运行场景，RunResult/AlignmentReport 回写到文档（例如在某个 Scenario Block 上显示“已通过/未通过”的状态）。

## 5. 迁移说明

- 原 `topics/spec-studio/00-design.md` 中关于 “四阶段 SPEC (S/P/E/C)” 与 “全双工平台架构” 的内容，已被统一收束到 `topics/sdd-platform/00-overview.md` 与 `02-full-duplex-architecture.md`；  
- Spec Studio 主题后续仅负责：  
  - 具体组件设计（Tiptap Node、画布交互、Traceability Matrix UI）；  
  - 与 Runtime/Devtools 的前端集成细节（例如如何从 Runtime 回放结果到画布）。  
- 平台级流程、Agent 职责与 Context Supply Chain 的定义，一律以 `sdd-platform` 主题为准。
