---
title: intent-driven · 意图驱动开发平台 (v3)
status: draft
version: 8 (Full-Duplex)
---

## 1. 核心理念：意图显影与资产复用

本平台致力于构建一个**意图显影引擎**与**资产共建平台**。它不仅帮助个人开发者提效，更帮助团队沉淀知识资产。

## 2. 三位一体模型 (The Trinity Model)

1.  **UI (Presentation)**：**躯壳**。界面结构与视觉表现。
2.  **Logic (Behavior)**：**灵魂**。业务规则与流程编排。
3.  **Domain (Data)**：**记忆**。业务概念与数据模型。

## 3. 技术基座 (The Tech Stack)

*   **Runtime**: 基于 `Effect-TS` 构建可组合、可测试、并发安全的业务流程。
*   **Engine**: **全双工锚点引擎 (Full-Duplex Anchor Engine)**。
    *   支持 **Intent -> Code** 的高质量生成。
    *   支持 **Code -> Intent** 的无损回流（即使代码被人工修改）。
    *   支持 **Type Projection**，在 Web 端提供 IDE 级的类型安全。

## 4. 渐进式采用策略 (Progressive Adoption)

### Phase 1: 前端开发者的超级 IDE (Solo Mode)
*   **场景**：个人提效。
*   **价值**：利用 AI 和内置 Pattern 快速生成高质量代码。
*   **出口**：支持 **Clean Mode** 导出。生成纯净、无依赖的代码，随时脱离平台，零厂商锁定。

### Phase 2: 产研协作平台 (Team Mode)
*   **场景**：PM/Designer 介入。
*   **价值**：消除文档与代码的鸿沟，实现 DevOps 闭环。

### Phase 3: 资产运营平台 (Asset Mode)
*   **场景**：团队资产沉淀。
*   **用法**：
    *   **提炼**：资深开发将本地最佳实践（Hooks, Flows）提炼为 Pattern 上传。
    *   **复用**：团队成员消费 Pattern，实现技术标准的统一。
*   **价值**：抵消人员流动带来的熵增，通过资产复用实现数倍提效。

## 5. 平台视图体系

*   **Doc View**：需求录入。
*   **Canvas View**：架构编排（支持黑盒/白盒混合视图）。
*   **Studio View**：代码生成与精修（支持 Monaco Editor 类型增强）。

## 6. 文档索引

*   `00-platform-manifesto.md`：平台宣言与资产共建策略。
*   `02-intent-layers.md`：详解三位一体模型。
*   `03-assets-and-schemas.md`：核心资产结构定义。
*   `04-intent-to-code-example.md`：v3 演练示例（含锚点代码）。
*   `06-codegen-and-parser.md`：全双工引擎与锚点规范。
*   `97-effect-runtime-and-flow-execution.md`：Logic 意图的运行时实现。
