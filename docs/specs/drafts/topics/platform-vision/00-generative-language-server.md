---
title: Generative Language Server · Agent & Logix v3 Long-Term Vision
status: draft
version: 0
---

> 本文作为草稿，用于沉淀「Agent + Parser + AST + 后端执行」在 Logix v3 平台中的**终局形态**设想。
> 目标是给后续的架构设计、产品规划和实现路线提供一份“最长远、最完美”的参考蓝本，再从中切出阶段性版本落地。

## 1. 总体愿景：从 Chatbot 到 Generative Language Server

在 v3 架构下，我们不再把 Agent 视为“会写代码的 Chatbot”，而是把整个平台朝着 **Generative Language Server（生成式语言服务器）** 的方向演进：

- 前端（IDE 插件 / Web 画布）变薄，只负责**表达意图**和**展示结果**；
- 后端成为真正的“脑 + 手”：
  - 脑（Brain）：Agent Orchestrator + LLM + RAG（代码/文档/Pattern 知识库）；
  - 手（Hands）：Logix Compiler Service（Parser / Validator / AST Patcher / Emitter）。

长远目标：

> 不管入口是自然语言、画布拖拽还是手写代码，
> 最终都收敛为稳定的 IntentRule / Fluent 规则 / Logix 代码，
> 且所有改动都可理解、可验证、可回放、可回滚。

## 2. 三个尺度的能力规划

从终局视角，平台围绕 Intent & Logix 可以在三个尺度上提供能力：

1. **单条规则（Rule-Level）**：任何一条 Fluent 规则都可以被精确理解、解释、改写和回滚；
2. **业务场景（Use-Case-Level）**：从 PRD 文本 → Use Case Blueprint → IntentRule 集合 → Logix 代码 → 流级测试的闭环；
3. **组织/仓库（Org-Level）**：全局 Intent 图谱、架构治理、批量迁移、Pattern 提炼与持续学习。

### 2.1 Rule-Level：单条规则的读懂 / 改写 / 回放

典型对象：形如 `yield* $.onState(...).op().then(Effect.gen(...), opts?)` / `yield* $.onAction(...).op().then(...)` / `yield* $.on(...).op().then(...)` 的 Fluent 规则。

目标能力：

1. **完整语义解构**
   - 后端通过 Parser + AST 能稳定地抽出每条规则的结构：
     - Source：监听对象（State 视图 / Action / 任意 Stream）；
     - Pipeline：防抖、节流、过滤等策略链；
     - Sink：最终作用（本 Store 状态写入、本/他 Store Action 派发、Service 调用、Control 结构）；
     - 并发语义：`run` / `latest` / `exhaust` / `sequence`。
   - 对任意一条规则，平台可以生成自然语言解释：“什么时候触发？对谁有影响？错误怎么处理？”

2. **安全局部改写（外科手术式）**
   - 用户或 Agent 想要修改规则（例如把 debounce 从 500 改成 800，把 mode 从 `latest` 改成 `exhaust`）：
     - 后端用 Parser 精确定位对应的 Fluent 链 AST 节点；
     - 只修改需要的 AST 子节点（参数、options、部分 handler），保持周围注释和格式；
     - 用 TS printer + Prettier/ESLint 重新生成源码，保证风格统一。

3. **多版本审计与回滚**
   - 每次规则改动都记录为：
     - IntentRule diff（IR 视角：source/pipeline/sink 发生了什么变化）；
     - AST diff / Git diff（源码视角：具体改了哪几行）。
   - 支持：
     - 按时间线查看单条规则的演化历史（谁在何时改过什么、为什么）；
     - 一键把某条规则回滚到历史任意版本，不影响周围代码。

4. **智能自愈与守门**
   - Parser 作为“守门人”，对不合规写法给出结构化错误码：
     - `ERR_ASYNC_HANDLER`：`then` handler 是 async 函数；
     - `ERR_SPLIT_CHAIN`：Fluent 链被拆到变量再 `flow.then(...)`；
     - `ERR_UNSUPPORTED_OP`：不在 Fluent 白盒子集 / 非 `$.onState / $.onAction / $.on` 开头。
   - Agent 使用这些错误码作为反馈，自行重写规则直到满足 Fluent + Effect 约束：
     - 不用 async/await，只用 `Effect.gen + yield*`；
     - 不拆链，始终写成单条 `yield* $.onState(...).op().then(...)` / `yield* $.onAction(...).op().then(...)` / `yield* $.on(...).op().then(...)`；
     - 越界写他库 state 等违规行为在静态层就被拦截。

### 2.2 Use-Case-Level：场景级闭环（从 PRD 到测试）

典型对象：搜索 + 详情、审批流、注册表单、导入/导出、批处理等业务场景。

目标能力：

1. **从需求文本生成 Use Case Blueprint**
   - PM 在平台中用结构化模版书写 Level 0/1 需求（“当 X 时，如果 Y，则系统应 Z”）；
   - Agent 基于 v3 模型生成 Use Case Blueprint：
     - 涉及哪些页面、Store、字段、Service；
     - 哪些联动属于 L1/L2/L3；
     - 初步 IntentRule 草稿集合 + 推荐 Pattern 组合。

2. **半自动落到代码与图**
   - Blueprint 确认后，平台可以自动生成：
    - Logix.Module 定义和 State/Action Schema 草稿；
     - Logic 文件中的 Fluent 规则骨架（`$.onState/onAction/on` + `$.state/$.match/$.use`）；
     - Galaxy 画布上的节点和连线（Store / Pattern / Service / Rule Card）。
   - 开发者主要工作变成：
     - 实现复杂 Service 和领域算法；
     - 对 Agent 生成的规则做审核与少量修改。

3. **自动生成与维护场景级用例**
   - 针对每个 Use Case，平台维持一组“意图回放用例”：
     - 输入：按时间序列定义的用户操作 / Action / State 变化；
     - 输出：期望的 State / Action / 外部调用记录。
   - 当规则变化时，后端在 headless Runtime 中执行这些用例：
     - 确认可观测行为不发生不期望的变化；
     - 提供“行为差异报告”（新增/删除/变更的状态和事件），辅助人工决策。

4. **跨场景协同与 Pattern 提炼**
   - 平台基于 IR 识别“重复模式”和“跨场景共性”：
     - 搜索 + 详情、审批贯穿、导入/校验/入库、乐观更新等高频模式；
   - 提供“提炼为 Pattern”的向导：
     - 收集若干相似规则 → 抽象出 `(input) => Effect` + Config Schema 的 Pattern 源码；
     - 自动生成 Pattern 文档与样例；
     - 用 AST 批量改写原规则为 Pattern 调用，减少重复代码。

### 2.3 Org-Level：全局 Intent 图谱与持续演进

放大到整仓库甚至组织级：

1. **Intent-aware 全局图谱与治理**
   - Parser/Compiler 持续维护一个仓库级 IntentRule 图谱：
     - Store 之间的协作关系（L2）；
     - 哪些字段/Action 驱动了多少规则；
     - 哪些 Service 成为高耦合点 / 潜在瓶颈。
   - 平台可以提供：
     - Intent 维度的搜索与分析（按字段/Action/Service 找规则）；
     - 架构风险提示（跨域联动过多、潜在循环依赖、过度依赖某个 Store 等）。

2. **架构演进与版本迁移助手**
   - 当 Logix API、Pattern 契约或 effect 版本升级时：
     - 分析全仓规则/Pattern 的使用情况；
     - 生成迁移策略（哪些规则可以自动迁，哪些需要人工介入）；
     - 由 Agent 产出迁移方案、Compiler Service 通过 AST 批量执行迁移；
     - 结合场景级回放用例做迁移后的行为确认。

3. **Pattern 与 Flow 资产库**
   - 平台持续从项目中提炼 Pattern 和 Flow 资产，并沉淀为可版本化的库：
     - 每个 Pattern 带有 Config Schema、实现、示例、测试；
     - 新项目可直接从资产库拖拽使用，Logix 代码与测试自动生成。
   - Agent 在生成时优先复用这些资产，而不是从零开始写 Effect：
     - 提高质量和一致性；
     - 让组织经验通过资产库而非口口相传得以延续。

4. **持续学习与策略优化**
   - 平台可以根据实际使用情况，统计：
     - 哪些 Agent 生成的规则被频繁回滚或重写；
     - 哪些 Pattern 在实际业务中表现稳定；
     - 哪些写法更容易触发类型/运行时错误。
   - 基于这些数据：
     - 调整 Agent Prompt / 模板（例如禁用某些容易出错的写法）；
     - 形成组织级 “Logix 写法风格指南”，由 Agent 自动执行；
     - 不断提高默认生成质量与“一次通过率”。

## 3. 后端引擎形态：Generative Language Server / Compiler Service

整体后端形态可以抽象为一个 **Generative Language Server + Logix Compiler Service**：

- Generative Language Server（Brain）
  - Agent Orchestrator：管理多轮对话、多 Agent 协作；
  - Context Engine：结合 RAG，从仓库/文档/Pattern 库中检索上下文；
  - Model Service：对接 LLM，执行 Prompt + Few-shot + Tool 调用。

- Logix Compiler Service（Hands）
  - Parser：基于 TypeScript AST（ts-morph），识别 Fluent 子集、Domain 定义、Bound API `$` 等；
  - Validator：类型检查（tsc）、Fluent 约束（ERR_*）、仓库级约束（禁止越界等）；
  - AST Patcher：根据 IR diff、Agent diff 对源码做精确改写；
  - Emitter：统一用 TypeScript printer + Prettier/ESLint 输出最终源码；
  - Runtime Harness：提供 headless Runtime 执行 Flow/Store，支持仿真和测试。

这一分层带来的长期好处：

- 前端只承载 UI & Intent 表达，不承担复杂逻辑；
- LLM 不直接碰文件系统，而是通过 Compiler Service 中介，对规则做结构化操作；
- 所有落到 Git 的变更都可解释、可验证、可回放。

## 4. Agent 的终局角色：遵法的“虚拟工程师”

在这个终局里，Agent 的角色不再模糊：

- 它不是“可以随意改代码的 AI”，而是一个完全遵守：
  - Fluent 白盒子集合约；
  - Effect 纯度约束（无 async/await）；
  - `@agent-generated` 所有权 / Eject 协议；
  - 微观沙箱最小特权原则；
  的“虚拟工程师”。

- 它的输出对象不是“整文件源码”，而是：
  - 对某条 IntentRule/规则的结构化修改建议（IR diff）；
  - 对某个 handler 的局部代码片段（在严格边界内）；
  - 或对 Pattern/Use Case Blueprint 的设计稿。
  最终落码一律由 Compiler Service 负责，通过 AST + 模板执行。

这也是 v3 文档中“先立法（类型与文档），后执法（Parser），最后上岗（Agent）”在平台层的最终落点。

## 5. 后续演进与拆分建议

作为草稿，本文只给出了“最长远、最完美”的状态设想。具体落地时可以按以下方向拆分：

1. 从 Rule-Level 能力开始：
   - 完善 Parser / Compiler Service，对 Fluent 规则做可靠的抽取与校验；
   - 在 IDE / 画布中提供规则级解释与简单参数修改；
   - 引导 Agent 仅在 Fluent 子集中工作，并通过 Parser 做自愈。

2. 渐进引入 Use-Case-Level 能力：
   - 为典型场景设计 Use Case Blueprint 模型与一组 PoC；
   - 为这些场景自动生成 Logic 骨架和少量回放用例；
   - 把 Logix Compiler Service 用于场景级重构与迁移。

3. 最后铺向 Org-Level 治理与资产化：
   - 建立仓库级 Intent 图谱与 Pattern 资产库；
   - 将架构治理规则和迁移能力纳入 CI/CD 流程；
   - 用真实项目中的数据反馈持续调整 Agent 策略与 Pattern 设计。

后续可以根据项目节奏，从本文中挑选一两条“能力线”（例如 Rule-Level 自愈 / Use-Case Blueprint）单独拉出 specs 与 PoC，实现“从终局愿景向现实逐步靠拢”。

## 6. 外部实现参考：BubbleLab 映射与可复用模式（草稿）

> 本节用于对齐 BubbleLab 这类“配置驱动工作流引擎”的成熟实践，并标记哪些模式可以直接迁移到 Logix v3 的实现与工具链中。
> 暂不做详细 API 设计，只记录“值得抄”的模式与在本仓的落点。

### 6.1 Bubble 类型系统与工厂 → Logix.Module / Pattern Registry / Boilerplate

- BubbleLab 的 `IBubble / IServiceBubble / IToolBubble / IWorkflowBubble` + `BubbleFactory` 提供了三层能力：
  - 统一的 Bubble 接口：包含 schema、resultSchema、执行逻辑 `action()` 与执行上下文 `BubbleContext`；
  - 工厂与注册中心：`register / get / createBubble / list`，附带依赖与 credential 映射；
  - 面向 AI 的模板输出：`generateBubbleFlowBoilerplate()` 直接产出包含所有 Bubble imports 的 TS 模板。
- 对 Logix v3 的映射：
  - `Logix.Module` + Pattern/Flow 定义可以视为 Bubble 的等价物，承担“身份 + Schema + Logic 入口”的职责；
  - 我们需要一个类似 `BubbleFactory` 的 **Pattern / Module Registry**，统一收集 Module 与 Pattern 元信息；
  - **建议新增能力**：
    - 在工具链中提供 `generateLogicBoilerplate`：为 Agent/LSP 输出包含 `Logix.Module`、`BoundApi ($)` 与常用 Pattern imports 的 TS 模板（专供生成/补全使用）；
    - 为 Pattern/Spec 提供统一的注册/发现机制，后续由 Pattern metadata bundler（见下节）消费。

### 6.2 源码级依赖解析 → Fluent 规则的 detailedDeps 与位置信息

- BubbleLab 在 `bubble-factory.ts` 中使用 `source-bubble-parser`：
  - 从 TS 源码解析出 Bubble 实例的分布与依赖关系，记录每个 Bubble 在 Flow 中的使用位置（变量名、是否匿名、起止行号）；
  - 将这些信息缓存为 `detailedDeps`，供运行时与工具使用。
- 对 Logix v3 的直接启示：
  - 我们当前的 Fluent Parser 已经能抽出 `source/pipeline/sink`，但还没有系统管理“规则在源码中的位置信息与依赖详情”；
  - **建议扩展 Fluent Parser 输出**：
    - 除基础结构外，为每条规则附加：所在文件路径、起止行号（或更精细的范围）、涉及的 Store/Pattern/Service 标识；
    - 将这些 `detailedDeps` 持久化到 Compiler Service 或缓存中，供 Galaxy/调试/Trace 使用；
    - 为后续的跨文件依赖拓扑和影响分析提供数据基础。

### 6.3 运行时注入模型 → Logic.Env / $.use / Execution Metadata

- BubbleLab 的 `BubbleContext` + `BubbleInjector`：
  - 在每个 Bubble 执行时注入 logger、变量 ID、依赖图节点、uniqueId 计数器等执行元数据；
  - 通过注入器统一构建执行上下文，避免业务代码直接操作底层资源。
- 对 Logix v3 的对齐：
  - `Logic.Env<Sh,R>` 不应仅包含 Logix.ModuleRuntime + 服务 Env，还应包含：
    - 执行级 metadata：executionId / nodeId / traceId / 调用栈片段等；
    - 规则/Pattern 级 metadata：所属 Spec Id、规则 Id（对应 Fluent 链/IntentRule）；
  - `$.use` 背后可以采用类似 BubbleInjector 的 DI 模型：
    - 只允许访问 Env 中显式注册的 Tag/Spec；
    - 将服务实例与执行 metadata 一并注入（便于日志和 Trace）。
- **建议动作**：
  - 在 `runtime-logix/impl` 下补充一份 “Env/Scope/DI/Sandbox” 的实现规范（execution metadata 的字段约定 + `$.use` 的行为边界）；
  - 在 `packages/effect-runtime-poc` 中做一个小 PoC：打印 Env 中的 execution metadata 与 `$.use` 获取的服务，验证 Env 形状与约定一致。

### 6.4 类型注入与编辑器集成 → Bound API / Spec / Schema 的 d.ts 生成

- BubbleLab 通过 `monacoTypeLoader` + 预生成的 `*.d.ts`，将核心类型注入前端 Monaco，给用户提供完整的补全与类型检查。
- 对 Logix v3 而言，这是 **Code-First + Agent-First** 体验的关键基础设施：
  - 编辑 Fluent 规则时，编辑器/Agent 必须知道 `$` 的精确类型（`state/actions/flow/control/use/services/when*`）；
  - 必须知道当前 Store 的 State/Action 结构，以及当前可用的 Spec/Service/Pattern 类型。
- **建议设计一个独立的 d.ts 生成器**：
- 输入：`logix-v3-core.ts` 中 Bound API 类型 + 项目内所有 Domain / Pattern / Service Tag；
  - 输出：
    - `logix-bound-api.d.ts`：Bound API 核心签名；
    - `project-logix-context.d.ts`：当前项目/场景相关 Spec/Pattern/Service 的类型声明子集；
  - 由 Language Server / Studio 注入到 Monaco 或 TS 语言服务中，统一为人类与 Agent 提供智能感知。

### 6.5 Pattern Registry 与 Metadata Bundler

- BubbleLab 使用 Bubble 类 +工厂 + 元数据脚本构建了完整的 Bubble 资产体系，并生成文档与代码生成友好的清单。
- 对 Logix v3 的对应动作（与前文 Pattern 资产库呼应）：
  - 规范 Pattern 定义方式（导出签名 + Config Schema + JSDoc）；
  - 编写 `scripts/pattern-metadata-bundler.ts`：
    - 扫描仓库中的 Pattern 定义；
    - 抽取名称、Config Schema 类型信息、JSDoc 描述等；
    - 生成 `patterns.json` / `patterns/*.json` 作为 Pattern Registry。
  - Studio/Galaxy 直接消费该 Registry 渲染 Pattern palette 与 Config Panel，Agent 也能从中获知“可用积木”的全集。

以上内容暂作为对 BubbleLab 的“对照启发”草稿，后续可以按优先级将其中的 1–2 条演进为正式的 v3/impl 规范与 PoC（例如先实现 d.ts 生成器或 Pattern metadata bundler），再逐步并入主线设计。
