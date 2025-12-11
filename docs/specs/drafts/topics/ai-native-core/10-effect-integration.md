---
title: Effect AI Integration Strategy
status: draft
version: 2025-11-28
related: []
---

# Effect AI 集成策略 (Integration Strategy)

本文档分析 `@effect/ai` (Effect 官方 AI 库) 的核心特性，并制定其在 Logix 平台中的集成策略。

## 1. Effect AI 核心特性分析

根据官方文档，`@effect/ai` 提供了以下关键能力，与 Logix 的 "AI Native" 愿景高度契合：

1.  **Provider-Agnostic (供应商无关)**
    *   **特性**: 业务逻辑只需依赖 `AiInput` / `Completions` 抽象接口，运行时通过 Layer 注入具体实现 (OpenAI, Anthropic, Ollama)。
    *   **Logix 价值**: 完美契合 Logix 的 `Service Tag` 架构。Logix 不再需要手写 `OpenAIService`，而是直接暴露 Effect AI 的标准接口。

2.  **Schema-Driven Inputs (Schema 驱动输入)**
    *   **特性**: 使用 `Effect.Schema` 定义 AI 输入/输出结构，确保类型安全。
    *   **Logix 价值**: 解决了 "Prompt as Schema" 的实现问题。我们可以直接用 `Schema` 定义 Prompt 模板的变量插槽。

3.  **Structured Concurrency & Observability**
    *   **特性**: 内置流式处理 (Streaming)、重试 (Retries)、超时 (Timeouts) 和追踪 (Tracing)。
    *   **Logix 价值**: 提供了现成的 Agent Runtime 底座。ReAct 循环中的每一步都可以是受控的 Effect。

## 2. 集成方案 (The "How")

### 2.1 替换底层 AI Service

目前 Logix PoC 中的 `OrderService` 等是手写的。未来应引入 `@effect/ai` 作为标准库。

```typescript
// Before: 手写 Service
interface MyAIService {
  chat(msg: string): Effect<string>;
}

// After: 使用 Logix AI Abstraction
import { AiServiceTag, Prompt } from "@logix/ai";

const program = Effect.gen(function* () {
  // 1. Render Prompt Intent to abstract Input
  const input = yield* Prompt.render(MyPrompt, { role: "user", content: "Hello" });

  // 2. Call Abstract Service
  const response = yield* AiServiceTag.complete(input);
  return response;
});

// 运行时注入 Provider (底层使用 Effect AI)
program.pipe(Effect.provide(LogixAiRuntime.Live));
```

### 2.2 定义 "AI Intent" 原语

基于 Effect AI，我们可以定义更高层的 Logix AI Intent：

1.  **Prompt Intent**:
    ```typescript
    const SummarizePrompt = Schema.Struct({ text: Schema.String }).pipe(
      Schema.annotations({
        ai: { template: "Summarize: {{text}}" } // 扩展 Schema Annotation
      })
    );
    ```

2.  **Agent Intent**:
    利用 Effect AI 的 `Function Call` 支持，将 Logix 的 `Service Tag` 映射为 **Tool**，由 Agent Pattern 进行调度。

### 2.3 解决 Gap Analysis 中的缺失

回顾 `logix-platform-gap-analysis.md`，Effect AI 填补了以下空白：

*   **AI Native Runtime**: ✅ 直接复用 `@effect/ai`，无需自研。
*   **Observability**: ✅ Effect AI 自带 Trace，只需接入 Logix DevTools。
*   **Provider Switching**: ✅ 天然支持 Layer 切换，实现 "Model Routing" (例如：简单任务用 GPT-3.5，复杂任务用 GPT-4)。

## 3. 结论

**`@effect/ai` 是 Logix 实现 "AI Native" 的捷径。**

我们不需要从头构建 AI Runtime，而是应该成为 **Effect AI 的编排层 (Orchestrator)**。Logix 的价值在于管理 Prompt 资产、编排 Agent 流程 (Flow) 以及提供可视化工具，而底层的 LLM 交互完全交给 Effect AI。
