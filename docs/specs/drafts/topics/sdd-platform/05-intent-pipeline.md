---
title: 05 · Intent Pipeline：From Requirement to Schema
status: draft
version: 2025-12-12
value: vision
priority: next
related:
  - ./00-overview.md
---

# Intent Pipeline：From Requirement to Schema

> 本文在 `sdd-platform` 视角下重述“从需求到 Schema/Module”的流水线，把它并入统一的 SDD 叙事。

## 1. 四阶段 SDD 下的 Intent Pipeline

结合 `00-overview.md` 的 SDD 生命周期，可以把 “From Requirement to Schema” 收缩为一条跨阶段流水线：

- **Stage 0: Raw Requirement（SPECIFY 阶段的输入）**  
  - 载体：Spec Studio 画布（富文本 + Intent Widgets）。  
  - 行为：用户粘贴 PRD / 描述场景 / 上传截图，Spec Agent 提取关键名词（实体）和动词（交互）。
- **Stage 1: Domain Modeling（PLAN 阶段 L1 / Domain Intent）**  
  - 产物：Entity-Relationship Graph / DomainIntentNode。  
  - 行为：Architect Agent 把 “User / Order / Payment”等抽出来，形成领域概念与关系。
- **Stage 2: Schema Crystallization（PLAN 阶段 L2 / Module Intent）**  
  - 产物：Unified Module Schema / ModuleIntentNode（state/actions/services/slots...）。  
  - 行为：将领域对象映射为 Logix Module 图纸骨架，为后续 state/actions/traits 准备容器。
- **Stage 3: Logic Generation（TASKS + IMPLEMENT 阶段 L2/L3 / Logic Intent）**  
  - 产物：Effect Logic Code / IntentRule 集合。  
  - 行为：在已有 Schema 容器上，用 Pattern + Skill Pack + LLM 补全具体逻辑。

Intent Pipeline 的价值在于：**每个阶段都有明确的 Artifact 与 Agent 角色，可以在平台侧做可视化与溯源，而不是让“需求→代码”变成黑盒。**

## 2. 平台交互：可视化流水线视图

在 Studio 的产品形态上，这条流水线应该是“从左到右”的一条生产线：

- 左侧：Requirement Pool（需求池）—— PRD/对话高亮出驱动 Schema 的关键信息（例如“分页”、“点击行进入详情”）；  
- 中间：Crystallization Chamber（结晶室）—— AI 基于需求提出 Module / Service / Slot 的半透明建议框，由人类确认后固化为 Schema / Module 图纸；  
- 右侧：Code Preview / Intent Graph—— 实时预览 Schema + Logic/IntentRule 的代码投影或图视图。

这一视图直接对应 SDD 的 Phase1/2/3，平台可以为每一格附加状态灯（未分析 / 已建模 / 已生成 Code / 已通过 Sandbox 验证），为 PM/架构师提供“流水线进度”的统一视角。

## 3. Traceability：Requirement ↔ Schema ↔ Logic

Intent Pipeline 必须保持强溯源：

- Requirement → Schema：  
  - Schema 字段和 Trait 上挂 `@source(PRD-Section-x.y)` 或类似元数据，Studio 悬浮时能回跳到原始需求片段。  
- Schema → Logic：  
  - Logic 代码上的注释/元数据标明 `@generated-from(Schema.pagination)`，便于在 Studio/Devtools 中回到某个字段的逻辑实现。  
- Logic → Runtime：  
  - Runtime 事件（EffectOp）携带 moduleId/logicId/correlationId，与 IntentRule/LogicGraph 节点建立关联。

这条链路在 `02-full-duplex-architecture.md` 中展开的是 “Code ↔ Runtime” 部分，本节补的是 “Requirement ↔ Schema ↔ Logic” 这一侧。

## 4. 与现有主题的关系

- 上游：L0/L1 的捕获与可视化，依赖 `03-spec-studio-l0.md` 中定义的 Spec Studio 画布与 Intent Widgets。  
- 中层：Module Schema / Module 图纸的形态与字段能力，依赖 `01-module-traits-integration.md` 与 `04-module-traits-sdd-roadmap.md`。  
- 下游：代码生成与运行时验证，对应 `02-full-duplex-architecture.md` 与 Sandbox/Alignment Lab 相关草案。
