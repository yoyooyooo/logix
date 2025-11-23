# Intent-Driven AI Coding Specifications

> **Current Status**: Active Development (v3)
> **Focus**: Intent Development Engine, Trinity Model, Dev-Centric Workflow

本目录包含 **Intent-Driven AI Coding** 平台的核心规范文档。我们致力于构建一个**意图显影引擎**，利用 AI 将模糊的业务需求平滑转化为精确的代码实现。

## 📂 版本索引 (Version Index)

### [v3: 三位一体模型 (Active)](./v3/01-overview.md)
*   **核心理念**：**意图显影 (Intent Development)**。软件开发是意图从 Spec（需求态）到 Impl（实现态）的分辨率提升过程。
*   **模型架构**：收敛为 **UI (表现) / Logic (逻辑) / Domain (领域)** 三大核心维度。
*   **适用场景**：优先服务于**前端开发者**的个人提效 (Solo Mode)，并支持向团队协作 (Team Mode) 演进。
*   **关键文档**：[平台宣言](./v3/00-platform-manifesto.md) | [模型详解](./v3/02-intent-layers.md) | [资产定义](./v3/03-assets-and-schemas.md)

### [v2: 六层模型 (Archived)](./v2/README.md)
*   **核心理念**：**全切面解构**。试图穷尽前端工程的所有细节。
*   **模型架构**：Layout, View, Interaction, Behavior, Data, Code Structure。
*   **状态**：已归档。作为架构演进中的一次重要探索，为 v3 的收敛提供了理论基础。

## 🧠 决策与蓝图 (Decisions & Blueprint)

*   **[Architecture Decision Records (ADR)](./adr.md)**: 记录了我们“为什么走到今天”的历史决策。
*   **[Long-term Blueprint](./blueprint.md)**: 描绘了我们“未来要去哪里”的终局愿景（自愈架构、全双工编排）。

## 🗺️ 总体进展 (Progress)

1.  **概念验证期 (v1)**：验证 Intent/Pattern/Plan 分离的可行性。 ✅
2.  **深度分析期 (v2)**：对前端工程进行全切面解构，探索边界。 ✅
3.  **架构定义期 (v3)**：基于奥卡姆剃刀收敛模型，确立“意图显影”定位。 📍 **(Current)**
4.  **POC 验证期**：基于 v3 规范进行 Schema 验证与运行时开发。 🔄
