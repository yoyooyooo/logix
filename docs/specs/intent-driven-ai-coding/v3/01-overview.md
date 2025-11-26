--- 
title: 01 · 意图驱动开发平台 (v3) (Intent-Driven Development Platform)
status: draft
version: 9 (Unified-API-Aligned)
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

## 7. 单一事实源与优先级（SSOT & Priority）

v3 规范仍在演进中，难免存在历史写法与新规划并存的情况。为避免歧义，出现冲突时应按以下优先级判断“谁说了算”：

1. **平台与意图模型（概念层）**  
   - 以本目录下的 v3 文档为最高优先级，特别是：  
     - `00-platform-manifesto.md`：平台价值观与长期方向；  
     - `02-intent-layers.md` / `03-assets-and-schemas.md`：三位一体模型与资产结构的定义；  
     - `blueprint.md`：长期演进路线与终局形态。  
   - v1/v2 文档仅作为历史参考，不再作为事实源。

2. **Runtime 与 Intent API（类型与行为层）**  
   - 以 `runtime-logix/core/*.md` 中标记为 `Status: Definitive` 的文档为准，例如：  
     - `02-store.md`：Store / Scope / 生命周期语义；  
     - `03-logic-and-flow.md`：Logic / Flow / Intent L1/L2 API 形态；  
     - `06-platform-integration.md`：IntentRule IR 及平台集成规范。  
   - 当文档与代码存在不一致时，以 `v3/effect-poc/shared/logix-v3-core.ts` 中的类型定义为最终裁决，并随后回写修正文档。

3. **平台交互与资产体系（产品/UX 层）**  
   - 以以下文档为平台侧 SSOT：  
     - `06-platform-ui-and-interactions.md`：Universe/Galaxy/Studio 等视图与交互原则；  
     - `platform/README.md`：平台 Intent & UX 规划、L0–L3 资产链路（业务需求 → 需求意图 → 开发意图 → 实现）的定义。  
   - 若平台交互设计与 Runtime/API 细节有冲突，优先保证 v3 Intent 模型与 Runtime 语义一致，然后再调整交互方案。

4. **实现细节与 PoC**  
   - `v3/effect-poc` 下的代码示例（如 `shared/logix-v3-core.ts`、各 `scenarios/*.ts`）是当前实现的参考样例，但不等同于长期 API 设计承诺；  
   - 在演进过程中，PoC 可以先行试验新写法，再根据验证结果回写/调整上述规范文档。

简言之，当遇到“多处不一致”的情况时，优先级排序为：  

> **平台宣言 & 意图模型 ≥ Runtime 规范 & 类型定义 ≥ 平台交互规范 ≥ PoC 实现细节。**

任何对 Intent 模型、Runtime API 或平台交互有破坏性影响的改动，都应先在对应的 v3 规范文档中达成共识，再回写到 PoC 代码与后续实现中。***
