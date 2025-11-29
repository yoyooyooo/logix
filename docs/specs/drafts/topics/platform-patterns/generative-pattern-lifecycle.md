---
title: Generative Pattern Lifecycle (Refined)
status: draft
version: 2025-11-28
---

# Generative Pattern Lifecycle: 从定义到运行的全生命周期

为了适应平台侧多样化的交互触发（如：拖拽初始化、点击配置、右键生成、代码补全），我们需要一套更通用的 API 和生命周期模型。

单纯的“定义时”和“出码时”二分法已经不够用了，我们需要引入 **"交互时 (Interaction Time)"** 的概念。

## 1. 生命周期模型 (The Lifecycle Model)

我们将 Pattern 的生命周期细分为四个阶段：

1.  **Definition (定义)**: 架构师声明 Pattern 的元数据（Slots, Config Schema, AI Prompts）。
2.  **Interaction (交互)**: 平台根据元数据渲染 UI，用户通过不同方式（拖拽、对话、表单）注入意图。
3.  **Synthesis (合成)**: 平台/Agent 将用户意图转换为具体的代码片段 (AST/Text)。
4.  **Runtime (运行)**: 引擎执行合成后的代码。

## 2. API 演进：`Pattern.make` 的通用化

为了支持多样化的交互，`Pattern.make` 需要暴露更多的 **"交互钩子 (Interaction Hooks)"**。

```typescript
// patterns/JobProcessor.ts
export const JobProcessor = Pattern.make("std/job-processor", {
  // 1. 基础元数据
  meta: {
    name: "Job Processor",
    description: "通用任务处理管道",
    icon: "cpu"
  },

  // 2. 插槽定义 (AI 填充位)
  slots: {
    processor: Slot.make({
      input: Schema.Struct({ item: Schema.Any }),
      // 交互提示：告诉平台这个 Slot 在 UI 上怎么展示
      ui: {
        label: "处理逻辑",
        placeholder: "描述如何处理单个任务...",
        // 触发模式：点击时弹出 AI 对话框
        trigger: "ai-dialog"
      },
      ai: { instruction: "..." }
    })
  },

  // 3. 配置定义 (静态表单)
  config: Schema.Struct({
    concurrency: Schema.Number
  }),

  // 4. (新增) 预设/模板 (Presets)
  // 允许 Pattern 携带一些“默认填法”，方便用户快速开始
  presets: [
    {
      name: "S3 Upload",
      description: "上传数据到 S3",
      config: { concurrency: 5 },
      // 预填的 Slot 意图 (Intent)，而非代码
      intent: {
        processor: "将 item 转换为 JSON 并上传到 S3 Bucket 'my-bucket'"
      }
    }
  ]
}, ...);
```

## 3. 平台侧的通用消费逻辑

平台不再硬编码“点击 Slot 弹出 AI”，而是根据 `Slot.ui.trigger` 动态决定交互方式。

### 场景 A：拖拽初始化 (Drag & Drop)
*   用户拖拽 Pattern 到画布。
*   平台检查 `presets`。如果有，弹窗让用户选择预设。
*   用户选择 "S3 Upload"。
*   平台自动将预设的 `intent` 填入 Slot，并触发后台静默生成代码。

### 场景 B：代码补全 (IntelliSense)
*   用户在 VSCode/Monaco 中手动输入 `JobProcessor.use({ ... })`。
*   当光标停在 `processor:` 后面时。
*   LSP (Language Server) 读取 `Slot.ai.instruction`。
*   Copilot/Agent 自动提示："是否根据当前上下文生成处理逻辑？"

### 场景 C：右键菜单 (Context Menu)
*   用户右键点击画布上的节点。
*   菜单显示 "Regenerate Logic (AI)"。
*   点击后，读取当前 Slot 已有的代码作为 Context，重新触发生成。

## 4. 总结

通过引入 **`ui` (交互提示)** 和 **`presets` (预设意图)**，我们将 Pattern 从一个静态的代码模板，变成了一个 **"可交互的智能组件"**。

这使得平台可以灵活地适配各种操作流（拖拽、编码、对话），而无需修改 Pattern 定义本身。
