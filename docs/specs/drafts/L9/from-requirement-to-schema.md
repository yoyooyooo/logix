---
title: From Requirement to Schema - The "Intent Pipeline"
status: superseded
version: 1
value: vision
priority: later
related:
  - ../topics/sdd-platform/05-intent-pipeline.md
---

# From Requirement to Schema: The "Intent Pipeline"

> 本文回应了“如何从产品经理的原始需求出发，创建后续流程”的问题，当前已在 `topics/sdd-platform/05-intent-pipeline.md` 下以平台统一叙事的形式重述。  
> 原文作为更详细的思维过程保留，新的平台入口请优先阅读 `sdd-platform` 主题。

## 1. 核心视角：Intent Pipeline (意图流水线)

我们不再把“需求”和“代码”看作两个割裂的世界，而是看作**同一条流水线上的不同阶段**。
这条流水线的核心任务是：**将非结构化的 Product Intent (L0) 逐步“结晶”为结构化的 Module Schema (L9)。**

### 1.1 The Pipeline Stages

1.  **Stage 0: Raw Requirement (L0)**
    - **输入**：PRD 文档、Figma 设计稿、聊天记录。
    - **载体**：Spec Studio (Markdown / Canvas)。
    - **AI 角色**：**Analyst (分析师)**。提取关键名词（实体）和动词（交互）。

2.  **Stage 1: Domain Modeling (L1)**
    - **输入**：L0 分析结果。
    - **输出**：**Entity-Relationship Graph (ER图)**。
    - **AI 角色**：**Architect (架构师)**。识别出 "User", "Order", "Payment" 等领域对象及其关系。

3.  **Stage 2: Schema Crystallization (L9)**
    - **输入**：L1 领域模型。
    - **输出**：**Unified Module Schema** (`state`, `actions`, `services`, `slots`...)。
    - **AI 角色**：**Engineer (工程师)**。将领域对象映射为 Logix Module 定义。

4.  **Stage 3: Logic Generation (L2/L3)**
    - **输入**：L9 Schema。
    - **输出**：**Effect Logic Code**。
    - **AI 角色**：**Coder (程序员)**。基于 SCD Pattern 和 Skill Pack 生成最终代码。

## 2. 平台交互设计：可视化流水线

在 Logix Platform 上，这个过程应该被可视化为一条**"从左到右"的生产线**。

### 2.1 左侧：需求池 (Requirement Pool)

- 用户粘贴一段 PRD 或上传一张截图。
- AI 自动高亮其中的关键信息（如："列表需要支持分页" -> 高亮 "分页"）。

### 2.2 中间：结晶室 (Crystallization Chamber)

- 这是最关键的交互区域。
- **AI 提议 (Proposal)**：AI 根据需求，在画布上生成几个半透明的 Module 框图。
  - "我建议创建一个 `OrderListModule`。"
  - "它需要 `PaginationService` (基于'分页'需求)。"
  - "它需要 `onRowClick` Action (基于'点击行'需求)。"
- **人工确认 (Approval)**：用户点击确认，半透明框图变成实线（Schema 代码生成）。

### 2.3 右侧：代码预览 (Code Preview)

- 实时展示生成的 Schema 代码。
- 用户可以随时手动微调 Schema（SCD Pattern 保证了可读性）。

## 3. 关键技术支撑：Traceability (可追溯性)

为了让这个流程"清晰地查看"，我们需要建立**全链路追踪**：

- **Requirement -> Schema Link**:
  - Schema 中的 `pagination: Query.field(...)` 会被打上标记：`@source(PRD-Section-3.1)`。
  - 在 Studio 中鼠标悬停在代码上，左侧的需求文档会自动滚动到对应段落。

- **Schema -> Logic Link**:
  - 生成的 Logic 代码也会被打上标记：`@generated-from(Schema.pagination)`。

## 4. 示例流程 (Walkthrough)

**场景**：PM 说 "做一个用户列表，要能搜索，点击进详情。"

1.  **Input**: 用户输入上述文本。
2.  **Analysis**: AI 识别出：
    - Entity: `User`
    - View: `List`, `Detail`
    - Interaction: `Search`, `Click`
3.  **Crystallization**:
    - AI 推荐创建 `UserListModule`。
    - State: `users` (Array), `searchKeyword` (String)。
    - Action: `setSearchKeyword`, `openDetail`。
    - Service: `UserService` (用于搜索)。
    - Slot: `UserDetailSlot` (用于详情展示)。
4.  **Generation**:
    - 生成 `UserListModule` 的完整 Schema 代码。
    - 生成对应的 `UserListLogic`。

## 5. 结论

通过 **Intent Pipeline**，我们将"需求转化"这个黑盒过程变成了**可视化的、可交互的、可追溯的**白盒流程。
Unified Schema Vision 提供了终点的**容器**，而 Intent Pipeline 提供了到达终点的**路径**。
