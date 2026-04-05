---
title: Logix AI Native Architecture (Effect AI Integration)
status: draft
version: 2025-11-28
related: []
---

# Logix AI Native 架构设计 (基于 Effect AI)

本文档将 `@effect/ai` 的能力深度融合进 Logix v3 的 Intent/Runtime 体系中，定义 Logix 的 AI 原生形态。

## 1. 核心映射关系 (Core Mapping)

我们将 Effect AI 的原语映射到 Logix 的资产体系中：

| Effect AI 原语 | Logix 资产体系 (v3) | 平台侧形态 (L1/L2) |
| :--- | :--- | :--- |
| `AiInput` (Schema) | **Prompt Intent** | Prompt 模板编辑器 (支持变量插槽) |
| `Completions` (Service) | **AiServiceTag** | 内置标准服务 (无需手写) |
| `Function Call` | **Tool Registry** | Tool Registry / 插件市场 |
| `AiOutput` (Schema) | **State Schema** | 结构化输出直接绑定到 Store State |

> **Note**: Logix 引入 `LogixAiRuntime` 作为抽象层，不直接暴露 Effect AI 的 `AiInput`/`Completions` 类型，以保持架构独立性。

## 2. 详细设计

### 2.1 Prompt Intent (L2 Asset)

在 Logix 中，Prompt 不再是散落在代码里的字符串，而是 **Schema 定义的资产**。

```typescript
// 伪代码：示例性落点（本仓当前尚未落地 AI Native PoC；未来建议放到 packages/logix-ai 或 examples/ai-native）

// 1. 定义输入 Schema (Prompt 变量)
const SummarizeInput = Schema.Struct({
  text: Schema.String,
  style: Schema.Literal("concise", "detailed")
});

// 2. 定义 Prompt Intent (包含模板与元数据)
export const SummarizePrompt = Prompt.make({
  id: "prompts/summarize",
  inputSchema: SummarizeInput,
  outputSchema: Schema.String, // 可选，用于结构化输出校验
  template: `
    Please summarize the following text in a {{style}} style:
    ---
    {{text}}
    ---
  `,
  meta: {
    description: "Summarize text with style control",
    tags: ["nlp", "summary"]
  }
});
```

**Logix 平台价值**：
*   **可视化编辑**：平台读取 `SummarizeInput` Schema，自动生成 Prompt 编辑器的变量表单。
*   **版本管理**：Prompt 资产可以像代码一样进行 Git 版本控制。

### 2.2 AI Flow (L3 Runtime)

在 Logix Flow 中调用 AI 能力，就像调用普通 Service 一样，但更强类型。

```typescript
// 伪代码：示例性落点（本仓当前尚未落地 AI Native PoC；未来建议放到 packages/logix-ai 或 examples/ai-native）

// 假设 DocDef 是一个已定义的 Logix.Module
export const AnalyzeLogic = DocDef.logic(($) =>
  Effect.gen(function* () {
    // 1. 获取输入 (从 Store State)
    const docContent = (yield* $.state.read).content

    // 2. 构造 AI Input (使用 Prompt Intent)
    const input = yield* Prompt.render(SummarizePrompt, {
      text: docContent,
      style: "concise",
    })

    // 3. 调用 AI Service（通过 Tag/Layer 注入；本仓习惯用 $.use 获取服务）
    // 自动注入 Trace Span，并在 DevTools 中显示 "AI Request"
    const ai = yield* $.use(AiService)
    const summary = yield* ai.complete(input)

    // 4. 更新 State (结构化输出)
    yield* $.state.update((s) => ({ ...s, summary }))
  }),
)
```

### 2.3 Agent Pattern (L2 Asset)

Agent 是一个特殊的 **Logix Pattern**，它封装了 "ReAct Loop"。

```typescript
// 伪代码：示例性落点（本仓当前尚未落地 AI Native PoC；未来建议放到 packages/logix-ai 或 examples/ai-native）

export const ResearchAgent = Agent.make({
  id: "agents/researcher",
  role: "You are a senior researcher.",
  // 自动将 Logix Service Tag 转换为 LLM Tools
  tools: [
    Tool.fromService(GoogleSearchTag),
    Tool.fromService(WebScraperTag)
  ],
  // 定义记忆策略
  memory: Memory.Window({ k: 10 })
});

// 在 Logic/Flow 中使用
yield* Agent.run(ResearchAgent, { goal: "Analyze Logix v3 architecture" });
```

## 3. 运行时增强 (Runtime Enhancements)

为了支撑上述设计，我们需要在未来的 AI Native PoC（例如 `packages/logix-ai` 或 `examples/ai-native`）中引入以下 Layer：

### 3.1 `AiRuntimeLayer`

这是 Logix Runtime 的标准组件，负责提供 `AiService`。

```typescript
// runtime/layers.ts
import { OpenAi } from "@effect/ai-openai";

// 开发者在 logix.config.ts 中配置
export const AiRuntimeLayer = Layer.mergeAll(
  // 默认使用 OpenAI，也可以切换为 Ollama 或 Anthropic
  OpenAi.Live({ apiKey: Config.secret("OPENAI_API_KEY") }),
  // 注入 Token 计量器
  TokenCostTracker.Live
);
```

### 3.2 `TokenCostTracker` (Observability)

利用 Effect 的 `FiberRef` 或 `Context`，在 AI 调用链路中自动统计 Token 消耗。

*   **Logix DevTools**: 可以在 Timeline 上看到每个 Flow 消耗了多少 Token，折合多少费用。
*   **Quota Control**: 可以设置 "Max Cost per Flow"，防止 AI 跑飞。

## 4. 总结

通过集成 `@effect/ai`，Logix 获得了以下 **AI Native** 能力：

1.  **Prompt as Asset**: Prompt 变成强类型的、可管理的资产。
2.  **Service as Tool**: 现有的 Logix Service 生态直接转化为 Agent Tools。
3.  **Flow as Orchestrator**: Logix Flow 成为 AI Agent 的编排引擎，提供并发控制和状态管理。

这使得 Logix 不仅能开发普通 Web App，也能开发复杂的 **AI Agentic Applications** (如 Dify 及其超越者)。
