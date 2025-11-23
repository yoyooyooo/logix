# Intent Flow Runtime Kernel: 指导思想与宣言

> **Status**: Living Document
> **Date**: 2025-11-20

## 1. 背景与长期判断 (The Long View)

我们正处于软件工程范式转移的关键节点。基于对未来的长期判断，我们确立以下基本假设：

1.  **AI 智能的指数级增长**: 大模型（LLM）理解复杂意图和生成代码的能力将持续增强，这不再是瓶颈。
2.  **瓶颈在于“目标代码”的非标准化**: 目前 AI 辅助编程的痛点在于，业务逻辑的实现方式千人千面（Hooks 乱飞、状态分散、副作用隐晦）。这种“非标准化”导致 AI 只能模仿表象，难以生成健壮、可维护的复杂业务逻辑。
3.  **工具化与平台化的必然**: 未来的开发模式必然是“意图 -> AI/平台 -> 标准化运行时”。我们需要尽可能将业务规范固化，交给模型和平台去自动化执行。

## 2. 核心愿景 (Core Vision)

**构建一套“AI-Ready”的标准化业务运行时内核 (Runtime Kernel)。**

这套内核不仅仅是一个状态管理库，更是一套**业务逻辑的标准原语 (Standard Primitives)**。它的目标是让任何难度的业务需求，都有一套**唯一的、标准的、声明式的**写法。

### 2.1 消除决策模糊点 (Eliminating Ambiguity)

在传统开发中，开发者面临无数微小的决策：
*   “这个联动是写在 `onChange` 里还是 `useEffect` 里？”
*   “这个 API 请求怎么防抖？”
*   “这个状态是放在 Context 里还是组件 State 里？”

我们的 Kernel 将消除这些模糊点。通过提供标准化的 `logic` 编排机制，所有的副作用、联动、状态变更都只有一种写法。**当写法被标准化，AI 就能精准地“填空”，而不是“猜测”。**

### 2.2 AI 友好的双向映射 (AI-Friendly Bi-directional Mapping)

因为运行时是高度结构化和声明式的（基于 Schema 和 Effect Stream），代码本身就变成了意图的直接投影：
*   **Intent -> Code**: AI 可以轻松地将自然语言需求转化为 Kernel 的配置（Schema + Logic Rules）。
*   **Code -> Intent**: 平台工具可以轻松地解析 Kernel 代码，反向还原出业务流程图或意图线稿。

这使得 `Intent-Driven AI Coding` 平台成为可能。

## 3. 战略定位 (Strategic Positioning)

这个 Kernel 是整个生态系统的**基石 (Foundation)**：

*   **向下**: 封装 Effect-TS 的强大能力（并发、资源管理、错误处理），屏蔽底层复杂性。
*   **向上**: 支撑 `Form`、`Global State` 等具体领域的应用，以及未来的 `AI Coding Platform`。
*   **在平台视角下**: 作为 `intent-driven-ai-coding` v2 架构中的一个前端 Runtime Target（`frontend-kernel`），与 Effect Flow Runtime 一同承接 Behavior & Flow Intent 的执行职责。Behavior & Flow Intent 的概念模型与 Schema 以 `docs/specs/intent-driven-ai-coding/v2`（尤其是 `97-effect-runtime-and-flow-execution.md`）为事实源，Kernel 文档只说明“如何实现这些契约”。

## 4. 当前承诺与约束 (Commitments)

> 这些是后续所有技术决策的“硬约束”，优先级高于历史代码和短期成本。

1.  **v0 Form 视为 PoC，可以完全丢弃**  
    现有 `packages/react/src/features/form` 仅作为早期验证，不再继续演进，也不需要兼容或迁移；新一代 Form 必须建立在 Kernel 之上。
2.  **从 Kernel 起步，不计重构成本**
    未来工作默认从 `@kernel/core` v1 开始设计，不再以"现有实现"为约束条件；优先保证模型清晰、可推理、可演进，而不是节省实现成本。
3.  **禁止在 UI 中编排业务副作用**  
    业务级联动、异步调用、防抖/竞态处理等，一律通过 Kernel 的 `logic` / `watch` / `on` 声明，不允许再在 React/Vue 组件里用 `useEffect/useMemo` 编排业务逻辑；UI 层只读 Store，只派发标准化 Action。
4.  **唯一的状态机来源**  
    Kernel 是唯一的状态与逻辑运行时，后续不得在 Form 或 React 适配层再发明第二套状态机或副作用系统（例如直接依赖 Zustand/自写 Hooks 维护核心业务状态）。
5.  **表单只是第一个领域验证**
    新 Form 库（`@kernel/form`）明确被视为 Kernel 的一个 Domain 实例，用来反向验证 Kernel API 的合理性，而不是与 Kernel 并行演进的另一套方案。

## 5. 核心原则 (Core Principles)

1.  **Effect-First**: 所有的业务逻辑本质上都是副作用（Effect）。我们使用 Effect-TS 作为底层的执行引擎，确保逻辑的纯粹性和可测试性。
2.  **Declarative Over Imperative**: 业务逻辑应该是被“声明”出来的（配置规则），而不是被“编写”出来的（过程式代码）。
3.  **Runtime Agnostic**: 内核必须与 UI 框架（React/Vue）解耦，它只关注数据流和逻辑编排。这保证了它能适应未来的任何技术栈变化。

---

**总结**: 我们不是在造又一个轮子，我们是在为 AI 时代的软件工程制定**标准**。一旦这个内核建成，业务开发将不再是堆砌代码，而是编排意图。
