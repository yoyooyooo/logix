---
title: Forward-Only AI Coding - The "Intent-to-Code" Skill Pack
status: draft
version: 1
value: vision
priority: 200
related: []
---

# Forward-Only AI Coding: The "Intent-to-Code" Skill Pack

> 本文是对 [Beyond State & Action](./beyond-state-and-action.md) 的一次**反向思考**。
> 核心假设：**如果我们暂时放弃“反向工程”（代码回读到平台），只追求极致的“正向生成”（AI 一口气出码），架构会变成什么样？**

## 1. 核心洞察：映射矩阵即 Prompt

在 `beyond-state-and-action.md` 中，我们总结了一个映射矩阵：

- `slots` -> `Context`
- `services` -> `Layer`
- `events` -> `PubSub`

如果我们的目标只是让 AI 写出高质量的代码，那么**我们不需要把这些映射固化为 TypeScript Schema**。
我们只需要把这个矩阵变成一份 **System Prompt (Skill Pack)**。

### 1.1 The "Skill Pack" Concept

Skill Pack 是一组注入给 AI 的知识胶囊，告诉它：

> "当用户表达【依赖注入】意图时，请使用 `Module.implement({ imports })` 模式。"
> "当用户表达【模块通信】意图时，请使用 `$.emit` 和 `$.on` 模式。"

这样，AI 就能直接生成符合 Logix 最佳实践的 Effect 代码，而不需要我们在运行时引入复杂的 Schema 校验逻辑。

## 2. 极致正向架构：Schema-Less, Pattern-Rich

在“极致正向”的视角下，Logix 架构可以进一步简化：

### 2.1 Schema 退化为 Type Hint

我们不需要 `services: { logger: LoggerSchema }` 这种运行时对象。
我们只需要 TypeScript 类型定义：

```ts
// AI 直接生成的代码
interface Dependencies {
  readonly logger: Logger
}

// AI 知道在 Logic 里怎么用
const logic = Module.logic(($) =>
  Effect.gen(function* () {
    const { logger } = yield* ServiceContext<Dependencies>()
    logger.info('...')
  }),
)
```

### 2.2 Pattern 替代 Framework

我们不需要开发复杂的 `@logix/plugin-slots` 框架。
我们只需要教会 AI 一种 **"Slot Pattern"** 的写法：

```ts
// AI 熟练掌握的 Pattern
const Dashboard = Module.implement({
  // AI 自动生成这个 imports 结构，因为它学过 Slot Pattern
  imports: [Layer.succeed(SidebarSlot, MySidebar), Layer.succeed(ContentSlot, MyContent)],
})
```

## 3. 这种模式的优势

1.  **零运行时负担**：没有额外的 Schema 解析、校验、转换开销。代码就是纯粹的 Effect。
2.  **无限灵活性**：AI 可以根据具体场景微调代码结构，不受限于 Schema 的表达能力。
3.  **快速迭代**：更新 Prompt 比更新 npm 包快得多。发现新模式，改一下 Prompt 就能立即应用。

## 4. 潜在风险与应对

**风险**：如果 AI 生成的代码太灵活，人类维护者看不懂怎么办？或者代码风格逐渐发散？

**应对：Linter as Guardrail**。
虽然我们放弃了 Schema 约束，但我们可以引入 **Structural Linter**：

- 编写 ESLint 规则或简单的 AST 扫描器。
- 检查 AI 生成的代码是否符合 "Slot Pattern" 的结构特征。
- 如果 AI "自由发挥" 过了头，Linter 报错，强制它回归标准模式。

## 5. 结论：AI 时代的 "Convention over Configuration"

在 AI 辅助编程时代，**"Convention" (约定/模式)** 的价值可能高于 **"Configuration" (配置/Schema)**。

- **Schema** 是给机器（Parser/Studio）看的硬约束。
- **Pattern** 是给智能体（AI/Human）看的软约束。

如果我们暂时不考虑 Studio 的回读需求，那么 **"Pattern-Rich, Schema-Less"** 确实是一条通往极致开发效率的捷径。我们将精力集中在**提炼最佳实践**和**编写高质量 Prompt**上，让 AI 成为那个熟练掌握 Logix 剑法的宗师。
