---
title: SCD Pattern & Platform Alignment Enabling Full-Duplex Architecture
related: []
status: draft
version: 1.0
value: architecture
priority: next
---

# SCD Pattern & Platform Alignment: Enabling Full-Duplex Architecture

> 本文探讨 Schema‑Capability Dual Pattern (SCD) 如何作为关键基础设施，支撑 Logix 平台的 **全双工 (Full-Duplex)**、**可视化 (Studio)** 和 **AI 驱动 (Copilot)** 目标。  
> 最新的 SCD 能力插件视角定义见 `../capability-plugin-system/02-schema-capability-dual-pattern.md`。

## 1. 核心论点

**SCD Pattern 是连接 "Code-First" 与 "Design-First" 的桥梁。**

在 Logix 平台愿景中，我们追求代码与可视化的双向同步（全双工）。SCD 模式通过规范化插件的“表”（Schema）与“里”（Capability），为这种同步提供了结构化的锚点。

## 2. 对 Parser 与反向工程的意义

传统的 AST 解析面临“通用代码难以理解”的挑战。SCD 模式将无限的代码空间收敛为有限的模式：

### 2.1 静态识别 (Schema Side)

Parser 不需要分析复杂的初始化逻辑，只需识别 `Schema.Annotated`：

- **代码**: `profile: Query.field({ key: ... })`
- **解析**: 识别为 `QueryNode`，提取配置元数据。
- **可视化**: 在 Studio 中渲染为“配置面板”或“数据源卡片”。

### 2.2 动态识别 (Capability Side)

Parser 不需要理解 Effect 的控制流，只需识别 `$` 上的 Capability 调用：

- **代码**: `yield* $.query.invalidate(...)`
- **解析**: 识别为 `ActionNode` (Type: QueryInvalidate)。
- **可视化**: 在 Studio 流程图中渲染为“操作节点”。

**结论**：SCD 模式让 Parser 的工作从“理解任意代码”简化为“提取结构化元数据”，极大提升了反向工程的准确率。

## 3. 对 Studio 交互设计的意义

SCD 模式天然映射到 Studio 的两种核心交互视图：

| SCD 层面               | Studio 视图                 | 交互形态                                                                                               |
| :--------------------- | :-------------------------- | :----------------------------------------------------------------------------------------------------- |
| **Schema (Face)**      | **Form / Property Panel**   | **声明式配置**。<br>用户勾选 "Enable Auto Refresh"，底层生成 `Query.field` 参数。                      |
| **Capability (Core)**  | **Flow Editor / Blueprint** | **编排式连线**。<br>用户拖拽 "Refresh Query" 节点到 "On Click" 事件后，底层生成 `$.query.invalidate`。 |
| **Expansion (Bridge)** | **Preview / Simulation**    | **逻辑预览**。<br>用户点击“查看生成逻辑”，Studio 展示由 Schema 展开后的 Logic 流程图。                 |

这种映射关系使得 Studio 的设计有章可循，不再是空中楼阁。

## 4. 对 AI Copilot 的意义

SCD 模式为 AI 提供了结构化的思维框架（Chain of Thought）：

1.  **Step 1: Define Data (Schema)**
    - Prompt: "为 User 模块添加一个获取 Profile 的查询。"
    - AI Action: 生成 `Query.field` Schema。
    - 优势: 避免了手写复杂的 Effect 样板代码，减少幻觉。

2.  **Step 2: Orchestrate Behavior (Capability)**
    - Prompt: "点击刷新按钮时重新加载 Profile。"
    - AI Action: 生成 `$.onAction(..., () => $.query.invalidate(...))`。
    - 优势: `$.query` 提供了高层次的语义 API，AI 调用更准确。

3.  **Step 3: Verify (Expansion)**
    - 平台可以自动运行 Expansion 逻辑，检查生成的代码是否符合类型约束，形成 Feedback Loop。

## 5. 平台架构演进路线

基于 SCD 模式，平台架构可以按以下阶段演进：

1.  **Phase 1: Standardization (当前阶段)**
    - 推广 SCD 模式，将 Query, Socket, Form 等核心能力重构为符合 SCD 规范的插件。
    - 确立 `logix-env.d.ts` 为 Capability 的注册中心。

2.  **Phase 2: Parser Support**
    - 开发针对 SCD 结构的专用 Parser，能够提取 Schema Annotation 和 Capability Call Graph。
    - 实现简单的“代码 -> JSON”双向转换。

3.  **Phase 3: Studio Integration**
    - 基于 Parser 输出的 JSON，构建 Studio 的 Form 和 Flow 视图。
    - 实现“修改视图 -> 更新代码”的全双工编辑。

## 6. 总结

SCD Pattern 不仅仅是一个代码组织模式，它是 **Logix 平台化的基石**。它通过标准化的元协议，让代码变得“可读、可写、可画”，从而实现了从 Coding 到 Building 的范式升级。
