---
title: Killer Feature Proposal $.whenAI API
status: proposal
version: 1
related: []
---

# Killer Feature 提案: `$.whenAI`

本文档提出一个全新的 Bound API 成员 `$.whenAI`，旨在将 AI 调用从一个命令式的 `Effect` 提升为一个声明式的、流式的一等公民，深度融入 Logix 的响应式体系。

## 1. 问题：命令式的 AI 调用

当前，在 Logix 中调用 AI 服务（即使基于 `@effect/ai`）仍然是一个命令式的过程：

```typescript
yield* $.onState(s => s.userInput)
  .debounce(500)
  .then(Effect.gen(function* () {
    // 手动管理 loading 状态
    yield* $.state.mutate(draft => draft.isLoading = true);
    const input = yield* Prompt.render(...);
    const result = yield* AiService.complete(input);
    // 手动处理成功/失败
    yield* $.state.mutate(draft => {
      draft.isLoading = false;
      draft.summary = result;
    });
  }));
```

这个过程充满了样板代码：手动状态管理、竞态处理（通过 `.then` 的 `mode`）、流式响应处理等，未能充分发挥 Logix 响应式模型的威力。

## 2. 方案: `$.whenAI`

`$.whenAI` 是一个高级的流操作符，它将 AI 交互的完整生命周期封装成一个声明式的 API。

### 2.1 API 设计

```typescript
// logic.ts
const $ = Logic.forShape<MyShape>();

export const MyLogic: Logic.Of<MyShape> = ($) =>
  Effect.gen(function* () {

    // 当用户输入变化时，流式调用 AI
    yield* $.onState(s => s.userInput)
      .debounce(500)
      .whenAI(
        // 1. Prompt Intent 作为输入
        SummarizePrompt,

        // 2. 动态构造 Prompt 的变量
        (userInput) => ({ text: userInput, style: 'concise' }),

        // 3. 定义如何处理 AI 的输出流
        {
          onData: (chunk) => $.state.mutate(draft => draft.summaryStream += chunk),
          onSuccess: (fullText) => $.actions.dispatch({ _tag: 'summary/done' }),
          onError: (error) => $.state.mutate(draft => draft.error = error.message),
          // 可选：自动管理 loading 状态
          setLoading: (isLoading) => $.state.mutate(draft => draft.isLoading = isLoading)
        },
        { mode: 'latest' } // 自动处理竞态
      );
  })
);
```

### 2.2 核心特性

1.  **AI 成为响应式公民**：AI 不再是一个被动调用的函数，而是一个响应流变化的、自身也是流的、可被并发管理的逻辑节点。
2.  **声明式封装**：它将防抖、竞态处理 (`mode: 'latest'` 自动映射为 `switchMap`)、流式响应 (`onData`)、成功/失败回调 (`onSuccess`/`onError`) 以及加载状态管理 (`setLoading`) 等所有与 AI 交互相关的复杂样板代码，全部封装在一个高度声明式的 API 中。
3.  **平台友好**：Parser 可以轻易识别 `$.whenAI`，并在画布上将其渲染为一个特殊的“AI 节点”。这个节点可以清晰地展示其输入（`SummarizePrompt` 资产）、输出（状态更新/Action派发）和并发策略，极大地增强了 AI 逻辑的可视化和可维护性。

## 3. 价值：简化 AI 应用开发

`$.whenAI` 将会成为开发 AI Agentic 应用的核心 API 之一。

### 3.1 架构定位 (Architecture Positioning)

虽然 `$.whenAI` 在产品层面被宣传为核心能力，但在架构实现上，建议将其作为 **Bound API 的扩展 (Extension)**。

*   **Core Bound**: 提供通用的 `$.whenStream` / `$.whenEffect` 能力。
*   **AI Extension**: 基于 Core 实现 `$.whenAI`，注入 AI Provider 和 Prompt 资产解析能力。

这种设计既保证了核心框架的轻量与稳定，又允许 AI 能力随着模型和协议的快速演进而独立迭代。
