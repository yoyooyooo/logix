---
title: Generative Patterns & AI Slots (Refined)
status: draft
version: 2025-11-28
---

# Generative Patterns & AI Slots (Refined)

本文档基于 `L3/api-evolution/generative-patterns.md` 的初稿，结合最新的架构思考，进一步细化 **"架构师定义骨架，AI 智能填充血肉"** 的实现机制。

## 1. 核心理念 (Core Concept)

我们将 Pattern 从单纯的 Effect 函数，升级为一个 **包含“待填充区域”描述的富资产包**。

*   **Pattern = Flow Skeleton + AI Slots**
*   **Slot = Interface Contract + AI Prompt**

这使得 Logix 平台不仅是一个代码库，更是一个 **“智能逻辑装配工厂”**。

## 2. API 设计 (API Design)

我们引入 `Pattern.make` 和 `Slot.make` (遵循 `*.make` 命名规范)。

### 2.1 定义时 (Definition Time) —— 架构师视角

架构师在定义 Pattern 时，显式声明哪些部分是留给 AI 填充的。

```typescript
// patterns/JobProcessor.ts
import { Pattern, Slot } from '@logix/core';
import { Schema } from 'effect';

// 1. 定义 Slot (空洞)
const ProcessItemSlot = Slot.make({
  id: "process-item",
  description: "处理单个任务项的具体逻辑",
  // 强类型契约
  input: Schema.Struct({ item: Schema.Any, context: Schema.Record(Schema.String, Schema.Any) }),
  output: Schema.Void,
  // 选项配置
  optional: false, // 是否可选
  default?: (ctx) => Effect.void, // 默认实现
  // AI 提示词配置 (关键！)
  ai: {
    instruction: "编写处理单个任务项的逻辑。通常包括调用外部 API 或转换数据。",
    contextKeys: ["availableServices", "currentStoreSchema"] // 告诉 Agent 需要哪些上下文
  }
});

// 2. 定义 Pattern (骨架)
export const JobProcessor = Pattern.make("std/job-processor", {
  version: "1.0.0", // 显式版本号
  slots: {
    processor: ProcessItemSlot // 注册插槽
  },
  config: Schema.Struct({
    concurrency: Schema.Number.pipe(Schema.default(5))
  })
}, ($, { slots, config }) =>
  Effect.gen(function* () {
    // 架构师编写通用的调度、重试、错误处理逻辑
    const queue = yield* $.use(JobQueueService);

    yield* queue.poll().pipe(
      Effect.flatMap(item =>
        // 在这里调用插槽
        slots.processor({ item, context: {} }).pipe(
            Effect.retry({ times: 3 }) // 架构师赋予的能力：自动重试
        )
      )
    );
  })
);
```

### 2.2 出码时 (Codegen Time) —— 平台与 Agent 视角

当业务开发者使用此 Pattern 时，平台识别出 `processor` Slot 需要填充。

1.  **Intent 注入**: 开发者输入 "把数据转换成 XML 格式并上传到 S3"。
2.  **Agent 生成**: Agent 根据 Slot 的 Prompt 和 Schema，生成一段内联的 Effect 代码。
3.  **代码合成**:

```typescript
// features/import/logic.ts
import { JobProcessor } from "@/patterns/JobProcessor";

export const ImportLogic = SomeImportDomain.logic(($) =>
  Effect.gen(function*() {
    // 调用 Pattern
    yield* JobProcessor.use({
      // 1. Config (静态配置)
      config: { concurrency: 10 },

      // 2. Slots (AI 生成的差异化逻辑)
      slots: {
        processor: (ctx) => Effect.gen(function*() {
           // --- Agent Generated Start ---
           const s3 = yield* $.use(S3Service);
           const xml = yield* convertToXml(ctx.item);
           yield* s3.upload({ body: xml });
           // --- Agent Generated End ---
        })
      }
    });
  })
);
```

## 3. 平台与运行时的配合 (The Handshake)

| 阶段 | 行为 | 负责角色 | 产物 |
| :--- | :--- | :--- | :--- |
| **定义时** | 使用 `Slot.make` 声明接口契约与 AI 提示词。 | **架构师** | Pattern Asset (含 Metadata) |
| **编排时** | 在画布上实例化 Pattern，填写自然语言意图。 | **业务开发** | Intent Description |
| **出码时** | 读取 Slot Metadata + 用户意图 -> 生成 TS 代码。 | **AI Agent** | Slot Implementation (Code) |
| **运行时** | 执行 Pattern 骨架 + 注入的 Slot 代码。 | **Logix Engine** | Running Fiber |

## 4. 价值总结

1.  **Pattern as Prompt Template**: 架构师在写 Pattern 时，实际上是在为未来的 AI 编写 "System Prompt"。
2.  **Slot as Micro-Sandbox**: 每个 Slot 都定义了明确的输入输出 Schema，极大降低了 AI 幻觉概率。
3.  **Zero Runtime Overhead**: 运行时只是普通的函数调用，享有完整的 TS 类型安全和 Effect 并发特性。
