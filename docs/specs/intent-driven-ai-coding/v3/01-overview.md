---
title: intent-driven · 意图驱动开发平台 (v3)
status: draft
version: 4 (Dev-Centric)
---

## 1. 核心理念：意图显影 (Intent Development)

软件开发不应是“翻译文档”，而应是**意图的显影**。

本平台致力于构建一个**意图显影引擎 (Intent Development Engine)**，让软件从模糊的“需求意图”平滑过渡到精确的“代码实现”。

## 2. 三位一体模型 (The Trinity Model)

我们摒弃了繁琐的工程分层，将意图收敛为三个核心维度：

1.  **UI (Presentation)**：**躯壳**。界面长什么样，如何响应视觉操作。
2.  **Logic (Behavior)**：**灵魂**。业务规则是什么，流程如何流转。
3.  **Domain (Data)**：**记忆**。业务概念有哪些，数据如何存储。

## 3. 双模态意图 (Dual-Modality)

每一个意图节点都同时包含两面：

*   **Spec (需求态)**：描述“User Story”、“Wireframe”、“Concept”。
*   **Impl (实现态)**：描述“Component Tree”、“Flow DSL”、“Schema”。

平台负责维护 Spec 与 Impl 的**实时同步与一致性检查**。

## 4. 渐进式采用策略 (Progressive Adoption)

我们认识到，组织架构的变革往往滞后于工具的革新。因此，平台设计了平滑的演进路线：

### Phase 1: 前端开发者的超级 IDE (Solo Mode)
*   **场景**：前端开发者独自使用。
*   **用法**：开发者自行录入 Spec（替代脑内设计或草稿纸），利用 LLM 生成 Impl，最后导出代码。
*   **价值**：个人效能提升，代码质量标准化，逻辑思考显性化。

### Phase 2: 产研协作平台 (Team Mode)
*   **场景**：PM、设计师加入平台。
*   **用法**：PM 直接在 Spec 层撰写需求，设计师在 Canvas 层调整 UI Spec。前端专注于 Impl 层的实现与审核。
*   **价值**：消除文档与代码的鸿沟，实现真正的 DevOps 闭环。

## 5. 平台视图体系

为了支持不同阶段的显影，平台提供三种视图：

*   **文档视图 (Doc View)**：以自然语言编写需求，自动提取意图结构。
*   **画布视图 (Canvas View)**：可视化编排 UI 线框与逻辑流程。
*   **工坊视图 (Studio View)**：IDE 级的深度编辑，生成精确代码。

## 6. 文档索引

*   `00-platform-manifesto.md`：平台宣言与核心哲学。
*   `02-intent-layers.md`：详解三位一体模型。
*   `03-assets-and-schemas.md`：核心资产结构定义。
*   `04-intent-to-code-example.md`：v3 演练示例。
*   `97-effect-runtime-and-flow-execution.md`：Logic 意图的运行时实现。
