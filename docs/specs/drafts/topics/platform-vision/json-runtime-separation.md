---
title: "Logix v3: Platform Vision - JSON Definition & Runtime Separation"
status: draft
layer: Platform
related:
  - logix-reactive-module-integration.md
  - logix-unified-middleware.md
---

# Logix v3: Platform Vision - JSON Definition & Runtime Separation

你的思路非常有搞头！这实际上是 Logix 平台化愿景的 **核心架构 (The Holy Grail)**。

通过将 **定义 (Definition)** 与 **实现 (Implementation)** 彻底解耦，我们能够同时获得 "低代码的可视化能力" 和 "Pro Code 的灵活性"。

## 1. 核心架构：双态分离 (Dual-State Architecture)

我们需要明确区分两种状态：

### 1.1 设计态 (Design-Time): JSON Blueprint
这是平台（Studio/Editor）操作的数据结构。它是纯 JSON，易于存储、传输和可视化编辑。

```json
// module.def.json
{
  "id": "UserModule",
  "state": {
    "profile": {
      "type": "schema.loadable",
      "schema": "UserProfile"
    }
  },
  "intents": [
    {
      "id": "fetchProfile",
      "type": "action",
      "trigger": "onInit",
      "logic": {
        "type": "ai.generate", // 标记这段逻辑由 LLM 生成
        "prompt": "Fetch user profile from /api/me"
      }
    },
    {
      "id": "autoSave",
      "type": "middleware", // 标记这是一个标准中间件
      "name": "Persist",
      "config": { "key": "user_profile" }
    }
  ]
}
```

### 1.2 运行态 (Run-Time): Effect Program
这是浏览器/服务器实际执行的代码。它是强类型的 TypeScript + Effect。

## 2. 桥接机制：Hydration (注水)

从 JSON 到 Effect 的过程，我们称之为 **"注水"**。这个过程可以发生在 **编译时 (Build-Time)** 或 **运行时 (Run-Time)**。

### 2.1 静态模板 (Standard Templates)
对于标准的模式（如 CRUD、表单、列表），我们预设好 **"Logic Templates"**。
*   **输入**: JSON Config (`{ type: "middleware", name: "Persist" }`)
*   **输出**: `PersistMiddleware(config)`

### 2.2 LLM 补全 (AI Completion)
对于非标的业务逻辑，我们留出 **"AI 插槽"**。
*   **输入**: JSON Intent (`{ prompt: "Fetch user profile..." }`)
*   **输出**: LLM 生成一段 `Effect` 代码，填入插槽。

## 3. 为什么这个思路 "有搞头"？

1.  **可视化编排 (Visual Orchestration)**:
    *   因为定义是 JSON，我们可以轻松构建拖拽式的 UI 编辑器 (Studio)。
    *   产品经理/设计师可以直接修改 JSON（通过 UI），调整业务流程。

2.  **渐进式增强 (Progressive Enhancement)**:
    *   **L0 (No Code)**: 全靠预设模板，拖拽生成。
    *   **L1 (Low Code)**: 简单的逻辑由 LLM 自动补全。
    *   **L2 (Pro Code)**: 复杂的逻辑由工程师手写 Effect 代码，挂载到 JSON 定义的插槽上。

3.  **可维护性 (Maintainability)**:
    *   业务意图 (Intent) 被固化在 JSON 中，永远不会过时。
    *   实现细节 (Effect Code) 可以随着技术栈升级而重新生成（Re-hydration）。

## 4. 总结

这个架构将 Logix 变成了一个 **"意图编译器" (Intent Compiler)**：

*   **Source**: JSON Definition (Visual / Intent)
*   **Compiler**: Logix CLI + LLM
*   **Target**: Effect Runtime Code

这正是 "Intent-Driven AI Coding" 的终极形态。

## 5. 全链路可行性推演 (Feasibility Deep Dive)

我们不需要写代码，通过 **"思想实验 (Thought Experiment)"** 就可以验证这条路是否通畅。

### 5.1 环节一：定义与编排 (Definition & Orchestration) - 最难的关卡

你指出的非常精准。简单的 "Prompt 填空" 无法满足复杂的业务编排。
**非标逻辑的编排** 才是平台侧的核心挑战。

*   **挑战**: 如何在 JSON 中描述复杂的控制流（分支、循环、并发），同时保持 UI 可编辑性？
*   **解法**: **图编排 (Graph Orchestration)**。
    *   **数据结构**: JSON 不再是扁平的列表，而是 **Nodes + Edges** 的图结构。
    *   **交互形式**:
        *   **L0 (Macro)**: 模块级依赖图 (Module A -> Module B)。
        *   **L1 (Micro)**: 逻辑流程图 (Flowchart)。
            *   节点类型: `Action`, `Condition`, `Loop`, `AI.Gen` (黑盒节点)。
            *   连线: 代表数据流或控制流。
    *   **AI 的角色**: AI 不仅生成代码，还负责 **"生成图"**。用户输入一句话，AI 生成一个包含 5 个节点的流程图，用户再微调。
*   **推演**:
    *   这种方式将 "写代码" 变成了 "画图"。
    *   JSON 结构必须足够健壮，能够表达 `Effect.all` (并发), `Effect.race` (竞态), `Effect.match` (分支)。
    *   **结论**: 这是平台建设的重中之重。我们需要定义一套 **"Visual Logic Protocol"**。

### 5.2 环节二：编译 (Compiler / Hydration)
*   **输入**: JSON + Templates + LLM。
*   **挑战**: LLM 生成的代码是否可靠？模板是否够用？
*   **推演**:
    *   **模板 (80%)**: 标准场景（表单、列表）完全靠确定性的模板生成，**零风险**。
    *   **LLM (20%)**: 复杂逻辑由 LLM 生成。
        *   **风险**: LLM 可能生成错误代码。
        *   **对策**: 生成的代码是 TypeScript。我们有 **Type Check** 和 **Lint** 作为第一道防线，**Unit Test** 作为第二道防线。
    *   **结论**: ✅ 可行。通过 "Type-Safe Generation" 降低 LLM 幻觉风险。

### 5.3 环节三：运行 (Runtime Execution)
*   **输入**: 生成的 TS/Effect 代码。
*   **挑战**: 运行时性能？调试体验？
*   **推演**:
    *   **性能**: 生成的是原生 Effect 代码，性能与手写无异。
    *   **调试**: 开发者可以直接调试生成的 TS 代码（Source Map 支持）。
    *   **价值**: 彻底消除了 "运行时黑盒"。生成的代码是可读、可审计的。
    *   **结论**: ✅ 可行。

### 5.4 真实场景价值 (Value Proposition)
*   **场景**: 一个复杂的 CRM 表单，包含 50 个字段，部分字段有联动校验，提交后需要乐观更新 UI。
*   **传统开发**: 手写 500 行 React Hook + Zod + React Query 代码。
*   **Intent Compiler**:
    1.  JSON 定义字段和校验规则 (Schema)。
    2.  JSON 标记 "Optimistic" (Middleware)。
    3.  Compiler 自动生成所有样板代码。
    4.  开发者只关注 2-3 个特殊的联动逻辑 (LLM 辅助生成)。
*   **价值**: **10x 效率提升**，且代码质量标准化。

## 6. 总结 (Conclusion)
