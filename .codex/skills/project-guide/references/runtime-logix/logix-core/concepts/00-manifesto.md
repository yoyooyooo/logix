# Logix Engine: 指导思想与宣言

> **Status**: Definitive
> **Date**: 2025-11-27

## 1. 背景与长期判断 (The Long View)

我们正处于软件工程范式转移的关键节点。基于对未来的长期判断，我们确立以下基本假设：

1.  **AI 智能的指数级增长**: 大模型（LLM）理解复杂意图和生成代码的能力将持续增强，这不再是瓶颈。
2.  **瓶颈在于“目标代码”的非标准化**: 目前 AI 辅助编程的痛点在于，业务逻辑的实现方式千人千面（Hooks 乱飞、状态分散、副作用隐晦）。这种“非标准化”导致 AI 只能模仿表象，难以生成健壮、可维护的复杂业务逻辑。
3.  **工具化与平台化的必然**: 未来的开发模式必然是“意图 -> AI/平台 -> 标准化运行时”。我们需要尽可能将业务规范固化，交给模型和平台去自动化执行。

## 2. 核心愿景 (Core Vision)

**构建一套“AI-Ready”的标准化业务逻辑引擎 (Logix Engine)。**

这套内核不仅仅是一个状态管理库，更是一套**业务逻辑的标准原语 (Standard Primitives)**。它的目标是让任何难度的业务需求，都有一套**唯一的、标准的、声明式的**写法。

### 2.1 消除决策模糊点 (Eliminating Ambiguity)

在传统开发中，开发者面临无数微小的决策：

- “这个联动是写在 `onChange` 里还是 `useEffect` 里？”
- “这个 API 请求怎么防抖？”
- “这个状态是放在 Context 里还是组件 State 里？”

Logix 将消除这些模糊点。通过提供标准化的 `logic` 编排机制，所有的副作用、联动、状态变更都只有一种写法。**当写法被标准化，AI 就能精准地“填空”，而不是“猜测”。**

### 2.2 AI 友好的双向映射 (AI-Friendly Bi-directional Mapping)

因为运行时是高度结构化和声明式的（基于 Schema 和 Effect Stream），代码本身就变成了意图的直接投影：

- **Intent -> Code**: AI 可以轻松地将自然语言需求转化为 Logix 配置（Schema + Logic Rules）。
- **Code -> Intent**: 平台工具可以轻松地解析 Logix 代码，反向还原出业务流程图或意图线稿。

这使得 `Intent-Driven AI Coding` 平台成为可能。

## 3. 战略定位 (Strategic Positioning)

这个 Logix 引擎是整个生态系统的**基石 (Foundation)**：

- **向下**: 封装 Effect-TS 的强大能力（并发、资源管理、错误处理），屏蔽底层复杂性。
- **向上**: 支撑 `Form`、`Global State` 等具体领域的应用，以及未来的 `AI Coding Platform`。
- **在平台视角下**: 作为 `SDD Platform` 体系中的一个前端 Runtime Target（`logix-engine`），与 Effect Flow Runtime 一同承接 Logic Intent / Flow 编排的执行职责。Intent/Flow/Runtime 的概念模型与 Schema 以 `docs/specs/sdd-platform/ssot` 为事实源（尤其是 `docs/specs/sdd-platform/ssot/foundation/03-trinity-and-layers.md`、`docs/specs/sdd-platform/ssot/assets/00-assets-and-schemas.md` 与 `docs/specs/sdd-platform/ssot/contracts/00-execution-model.md`），Logix 文档只说明“如何在前端运行时实现这些契约”。

## 4. 当前承诺与约束 (Commitments)

> 这些是后续所有技术决策的“硬约束”，优先级高于历史代码和短期成本。

1.  **早期 Form 实验可直接废弃**  
    现有 `packages/react/src/features/form` 仅作为早期验证，不再继续演进，也不需要兼容或迁移；新一代 Form 必须建立在 Logix Engine 之上。
2.  **从 Logix 起步，不计重构成本**
    未来工作默认从当前主线开始设计，不再以"现有实现"为约束条件；优先保证模型清晰、可推理、可演进，而不是节省实现成本。
3.  **禁止在 UI 中编排业务副作用**  
    业务级联动、异步调用、防抖/竞态处理等，一律通过 Logix 的 `Logic` 声明，不允许再在 React/Vue 组件里用 `useEffect/useMemo` 编排业务逻辑；UI 层只读 Store，只派发标准化 Action。
4.  **唯一的状态机来源**  
    Logix 是唯一的状态与逻辑运行时，后续不得在 Form 或 React 适配层再发明第二套状态机或副作用系统（例如直接依赖 Zustand/自写 Hooks 维护核心业务状态）。
5.  **表单只是第一个领域验证**
    新 Form 库（`@logix/form`）明确被视为 Logix 的一个 Domain 实例，用来反向验证 Logix API 的合理性，而不是与 Logix 并行演进的另一套方案。

## 5. 核心原则 (Core Principles)

1.  **Effect-First**: 所有的业务逻辑本质上都是副作用（Effect）。我们使用 Effect-TS 作为底层的执行引擎，确保逻辑的纯粹性和可测试性。
2.  **Declarative Over Imperative**: 业务逻辑应该是被“声明”出来的（配置规则），而不是被“编写”出来的（过程式代码）。
3.  **Runtime Agnostic**: 内核必须与 UI 框架（React/Vue）解耦，它只关注数据流和逻辑编排。这保证了它能适应未来的任何技术栈变化。

---

**总结**: 我们不是在造又一个轮子，我们是在为 AI 时代的软件工程制定**标准**。一旦这个内核建成，业务开发将不再是堆砌代码，而是编排意图。

## 6. 关键决策（定稿） (Final Design Decisions)

为明确引擎边界与取舍，本节固定三条运行时层面的设计决策；后续演进默认不再回到“运行时语义重写”的路线。

### 6.1 运行时环境：扁平合并，不做强隔离

- **决策**：  
  运行时采用 **Env 扁平合并 (Flat Environment)** 策略：  
  所有 Module 的 `infra` / `providers` 所产生的 Tag 最终汇聚在一个统一的 Effect Context 中。

- **不做的特性**：  
  不提供基于 `exports` 的运行时 Env 裁剪机制。  
  `ModuleDef.exports` 仅用于类型系统、Lint 与平台静态检查，不影响 Runtime 行为。

- **理由**：
  - Effect Context 的设计本质是“可扩展的服务池”，在其上强行构造多级隔离会显著增加 Scope / Layer 投影的复杂度；
  - 强隔离让调试变得困难（开发者难以区分“Tag 未提供”与“被隔离遮蔽”）；
  - 真正的封装与治理更适合通过 **Module 拓扑 + exports + 平台检查** 来完成，而不是 Runtime 魔法。

### 6.2 中间件与 AOP：显式组合，不做自动注入

- **决策**：  
  所有 AOP 能力（日志、鉴权、审计等）一律通过 **显式代码** 表达：
  - 使用 `Logic.compose(...)` / `secure(effect, meta)` 等模式在 Logic 内部组合中间件；
  - `ModuleDef.meta.aop.middlewares` 仅作为平台/出码器的配置来源，Runtime 不读取更不会自动注入。

- **不做的特性**：  
  不在 Runtime 内维护全局 Middleware Registry，也不在 Logic 构造过程中根据 Module 配置“自动套上”中间件。

- **理由**：
  - 保留“代码即事实”：任何拦截/横切行为都能在源码中被看见与 grep 到；
  - StackTrace 清晰，调试时可以直接在中间件函数内部打断点；
  - 将复杂度留在 Codegen / VSCode 插件等工具链侧，而不是污染 Runtime 内核。

### 6.3 模块加载：静态 Module 树，Lazy 归属集成/部署层

- **决策**：  
  Module 体系仅支持 **静态 ModuleDef 树**：
  - `imports` 只接受静态的 `ModuleDef` 引用；
  - 不引入 `() => Promise<ModuleDef>` 或 `Effect<ModuleDef>` 形式的 Runtime 级 Lazy 模块。

- **不做的特性**：  
  不在 Runtime 层实现“异步 Module 加载 / 按需构建 Layer”的机制。

- **理由**：
  - 模块懒加载更适合作为 **路由/子应用/打包工具** 的职责（例如按路由分包、多 AppRuntime）；
  - 在 ModuleDef 内混入异步加载，会引入复杂的“半初始化”状态机（加载中、失败、重试），破坏 Runtime 简洁性；
  - 核心架构的主要任务是定义清晰的 App / Module / Store 拓扑与执行契约，而不是承接 bundler 级别的优化。

---

上述三条决策共同定义了当前引擎边界：  
后续演进（无论是平台 UI、工具链，还是多 Runtime 组合）都应在保持这些根本取舍不变的前提下展开，而不是回到“运行时语义重写”的路线。\*\*\*
