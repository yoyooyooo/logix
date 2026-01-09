---
title: Playground as Executable Spec Lab
status: draft
version: 2025-12-08
value: draft
priority: later
---

# Playground as Executable Spec Lab

> 本稿尝试把「规范驱动开发 (Spec-Driven Development, SDD)」与本仓的 **Intent-Driven / Logix Runtime** 体系对齐，给 Playground / Sandbox 在整个平台中的角色一个更清晰的定位：
>
> - 上游：PM 视角的需求意图（Spec / Scenario）；  
> - 中层：IntentRule / R-S-T 规则 + Logix/Effect 实现；  
> - 下游：Playground 中的可视化 UI/UX 与运行时行为；  
> - 联结点：Playground 作为 **Executable Spec Lab（可执行规范实验室）**，将三者对齐并形成可验证闭环。

## 1. 目标与边界

### 1.1 目标

- 给「Playground」一个 **平台级角色定义**，避免它退化成单纯的 Code Runner；  
- 把 SDD 的四个阶段（SPECIFY / PLAN / TASKS / IMPLEMENT）映射到本平台已有/规划中的资产：  
  - Spec 文档 / Intent 模型 / IntentRule / Logix / Runtime；  
- 明确：`@logixjs/sandbox` 与 `examples/logix-sandbox-mvp` 只是这个实验室的**运行时底座与第一个原型**，不是最终产品形态。

### 1.2 范围与不做的事

- 本稿只讨论「Playground / Alignment Lab」在 **平台架构** 与 **意图对齐链路** 中的角色，不下沉到具体 UI 像素级交互；  
- 不讨论完整的 Universe/Galaxy/Studio 信息架构，只描述 Playground 如何与这些视图挂钩；  
- 不设计新的 IntentRule 语法与 Spec DSL，只在概念上占位，具体语法仍以 v3 文档与 runtime-logix 为主事实源。

> 关联文档：  
> - `docs/specs/sdd-platform/ssot/foundation/00-overview.md`（平台整体愿景）  
> - `docs/specs/sdd-platform/workbench/ui-ux/00-platform-ui-and-interactions.md`（Universe/Galaxy/Studio 视图）  
> - `docs/specs/sdd-platform/workbench/20-intent-rule-and-ux-planning.md`（IntentRule / R-S-T 模型）  
> - `.codex/skills/project-guide/references/runtime-logix/logix-core/*`（Module / Logic / Flow / Runtime 契约）  
> - `docs/specs/drafts/topics/sandbox-runtime/00-overview.md`（Playground & Sandbox 概览）  
> - `docs/specs/drafts/topics/sandbox-runtime/mvp/README.md`（Playground/Sandbox MVP · 省市区联动）

## 2. SDD 四阶段在本平台中的映射

以 SDD 的四个阶段为骨架，结合当前 v3 模型 + runtime-logix，我们可以粗略对齐为：

### 2.1 SPECIFY：需求意图（Spec / Scenario）

- 角色：PM / 设计 / 领域专家；  
- 形式：  
  - 结构化自然语言：用户旅程 / 用例场景（可用 Gherkin 或简化 DSL）；  
  - 需求意图与成功条件（Given-When-Then 或期望状态描述）。  
- 输出（候选模型）：  
  - `FeatureSpec`：功能级规范；  
  - `ScenarioSpec`：场景级规范（例如「选择省份 → 城市列表刷新」）。

> Playground 关联：每个 ScenarioSpec 应当对应 Playground 中的一个「可运行场景」，可以被选中、执行并观察。

### 2.2 PLAN：IntentRule / R-S-T 规则层

- 角色：架构 / 资深开发 / 平台；  
- 形式：  
  - IntentRule：平台 UI 与 Logix Fluent API 之间的统一 IR；  
  - R-S-T：「Source --Strategy--> Target」的响应式链路。  
- 输出（候选模型）：  
  - `IntentRuleSet`：一组规则，表达「哪些源（State/Action/Event）如何影响哪些目标（State/Service/UI）」；  
  - 这些规则是 PM 视角需求意图的「可计算骨架」。

> Playground 关联：Playground 在此层需要「看得懂规则」——在执行时知道哪些 Trace/日志属于哪条 IntentRule / R-S-T 链路。

### 2.3 TASKS：Logix/Effect 任务与实现单元

- 角色：开发者 / LLM Agent；  
- 形式：  
  - `@logixjs/core` Module / Logic / Flow / Runtime；  
  - 具体的 TypeScript 实现与测试。  
- 输出：  
  - 一组 Logix/Effect 程序（例如 `RegionSelectorModule` + Logic + `Runtime.make`），是 IntentRule 的实现载体；  
  - 每个实现片段与其对应的 IntentRule / R-S-T 应有可追踪关系（例如通过 ruleId/tag）。

> Playground 关联：Worker 内真正执行的就是这一层；Playground 既要能运行这些程序，也要能把运行行为映射回 IntentRule 与 Spec。

### 2.4 IMPLEMENT：运行、观测与回流

- 角色：CI/CD / DevTools / AI Agent / 人类审核；  
- 形式：  
  - 运行环境：浏览器 + Web Worker Sandbox (`@logixjs/sandbox`)、未来的 Deno 逃生舱等；  
  - 观测物：日志 / Trace / Error / stateSnapshot。  
- 输出：  
  - `RunResult`：例如 `@logixjs/sandbox` 中的 `{ runId, duration, logs, traces, stateSnapshot }`；  
  - 将 RunResult 与 Spec/IntentRule 对比之后产生的 **对齐报告 (Alignment Report)**。

> Playground 关联：Playground 是 IMPLEMENT 阶段的「人类/AI可视入口」，承载执行、观测与初步比对。

## 3. 数据模型草案：从 Spec 到 RunResult

为了让 Playground 真正成为「Executable Spec Lab」，至少需要以下几类数据结构（可以先以概念模型存在）：

### 3.1 Spec / Scenario / IntentRule

- `FeatureSpec`（特性规范）  
  - id / name / description  
  - scenarios: ScenarioSpec[]
- `ScenarioSpec`（场景规范）  
  - id / name  
  - given / when / then（结构化字段，而非单纯文本）  
  - preconditions / postconditions（对 stateSnapshot 的谓词）  
- `IntentRule` / `RuleSet`（参见 platform 文档）  
  - ruleId  
  - source: State/Action/External  
  - strategy: e.g. debounce, retry, throttle, guard  
  - target: State/Action/Service/UI  

> 这些结构主要由平台侧负责管理与编辑，Playground 只需要读取它们作为「运行与对比的配置」。

### 3.2 Runtime Program / RunConfig / RunResult

- Runtime Program：  
  - Logix/Effect 程序（例如 `export default` 的 Effect 或一个工厂函数）；  
  - 在 RegionSelector 场景中，通常长成：`Logix.Runtime.make(ModuleImpl).runPromise(Effect.gen(...))`。
- `RunConfig`：  
  - runId  
  - scenarioId（绑定到某个 ScenarioSpec）  
  - kernelUrl / wasmUrl  
  - env（RegionApi mock、国家/语言等）  
  - actions / inputSequence（用于模拟 Given/When）
- `RunResult`（当前 `@logixjs/sandbox` 已有）  
  - runId / duration  
  - logs: LogEntry[]  
  - traces: TraceSpan[]  
  - stateSnapshot?: unknown  

> 后续可以在 RunResult 上加薄薄一层：  
> - `triggeredRuleIds: string[]`（运行过程中实际触发过的 IntentRule）；  
> - `alignment?: AlignmentReport`（对齐结果，见下）。

### 3.4 UI_INTENT / Trace 与 ScenarioStep 的映射（RegionSelector MVP 做法）

- 在 RegionSelector 这类交互性很强的场景中，可以把 ScenarioSpec 的步骤与 UI_INTENT 事件做一一映射：  
  - ScenarioStep 约定 `scenarioId` 与 `stepId`；  
  - 运行时由 Worker 将这些信息落入 UI_INTENT 的 `meta.storyId / meta.stepId` 字段。  
- Playground/Alignment Lab 在 Host 侧据此计算 Step 覆盖：  
  - 若某次 run 中存在 UI_INTENT 满足 `meta.storyId === scenarioId && meta.stepId === stepId`，则认为该 Step 在本次运行中被“命中”；  
  - UI 层可以用简单的 `covered/pending` 标记展示这一结果（当前 RegionSelector Demo 的 Step 卡片即是原型）。  
- 为了方便追踪相关 Trace/HTTP，可以在 TraceSpan（或 attributes）中同时记录：  
  - `intentId`：对应 UI_INTENT.id，用于从 Trace 回溯到具体 UI 节点；  
  - `stepId`：用于在 Trace 视图中按 Step 滤镜；  
  - `kind: "ui-intent" | "http" | "spy" | "logix-debug"`：用于区分观测物类型。

### 3.3 AlignmentReport（对齐报告，后续阶段）

> 本文只占位，具体 Schema 可以放到 `30-intent-coverage-and-ai-feedback.md` 中详细设计。

基本要素可以包括：

- scenarioId / runId  
- passed: boolean  
- violations: { ruleId | specRef, message, severity, relatedTraces }[]  
- coverage: e.g. `{ rulesTotal, rulesTriggered, branchesCovered }`

Playground 在 UI 上可以用非常简单的方式呈现：  
绿/黄/红 标记一条场景，列表展示违反/未覆盖的规则，为人类和 AI 提供下一轮迭代的依据。

## 4. Playground 视角下的三类用户路径

### 4.1 PM / 设计：从需求意图到「能跑得通的场景」

对 PM 来说，Playground 的价值是：

- 选中一个 FeatureSpec / ScenarioSpec，看见：  
  - 右侧的交互 UI（RegionSelector 表单）；  
  - 下方/侧边的规则列表（IntentRule / R-S-T）；  
  - 一条「Run Scenario」按钮，可以验证这条场景。
- 当点击 Run：  
  - Playground 调用 `@logixjs/sandbox` 在 Worker 中执行对应的 Logix 程序；  
  - 返回 RunResult 与 AlignmentReport；  
  - PM 可以直观看到“期望行为”与“实际行为”的差异（比如：城市列表没有按 Spec 要求刷新）。

> 这一视图侧重「需求意图是否被满足」而非「代码写得好不好」。

### 4.2 开发者 / 架构：从 IntentRule 到 Logix 实现与调试

对开发者来说，Playground 是一个「按 IntentRule 切片的调试视图」：

- 可以从某条 IntentRule 反查：  
  - 关联的 Logix 代码（`$.onState` / `$.onAction` / Flow 调用）；  
  - 关联的 UI 字段或组件（RegionSelector 的某个字段）。  
- 运行 Playground 时：  
  - 能过滤只看某条 IntentRule 的 Trace、日志和 stateDiff；  
  - 方便验证该规则在各种输入下是否工作正常。

> 与传统 DevTools 相比，Playground 在「规则→代码→运行时」上的映射更清晰，适合和 AI 协作。

### 4.3 AI Agent：从 Spec 到 Patch，再回到 Spec

对 AI 而言，Playground 提供的是一个可控的闭环环境：

1. 从 Spec/IntentRule 读取「应该如何」；  
2. 从当前 Logix 代码与 RunResult 观测「实际上如何」；  
3. 根据 AlignmentReport 得到一组诊断；  
4. 生成代码 patch 或 IntentRule 调整建议；  
5. 再次通过 Playground 执行和验证，直到对齐度达到平台要求。

这一点与 SDD 中文献提出的「Executable Specs + CI/CD Gate」非常接近，只是这里的执行环境是 Logix Playground。

### 4.4 录制模式与 ScenarioSpec 反推（规划能力）

- 除了「先有 Spec 再跑代码」，Playground 还需要支持一条从运行行为反推 Spec 的路径：  
  - 开启录制模式后，用户/开发在 Playground UI 中完成一轮交互（例如完整走完 RegionSelector 的 Step1~3）；  
  - 平台收集本次 run 的 UI_INTENT / TRACE / HTTP / stateSnapshot，并尝试自动归纳为一份 ScenarioSpec 草稿：  
    - 为每个关键 UI_INTENT 推导 Step（附上 meta.storyId/stepId/label 雏形）；  
    - 从 stateSnapshot / Trace 中推导基本的 postconditions 或断言模板。  
- PM/设计在此基础上补充/润色 Given-When-Then 文本，即可得到一份与真实运行行为对齐的 Spec。  
- 该能力属于平台端的交互与推导逻辑，本稿只在概念层占位，具体 UX 与存储模型可以在后续 PRD/实现文档中细化。

## 5. 与现有 Sandbox MVP 的衔接

当前已经落地的部分（2025-12）：

- `@logixjs/sandbox` 子包：  
  - 提供 `SandboxClient` 与 Effect Service 封装；  
  - 实现 Web Worker + esbuild-wasm 编译/执行链路；  
  - 定义了 RunResult（logs/traces/stateSnapshot）。
- `examples/logix-sandbox-mvp`：  
  - 实现了 RegionSelector 场景的 Module + Logic；  
  - 使用 `@logixjs/react` + `@logixjs/sandbox` 搭起了一个最小 UI + Run 面板；  
  - Browser 模式测试中用 MSW 注入 Kernel（`/sandbox/logix-core.js`）与 esbuild-wasm。
  - 引入了 `ScenarioBuilder + MockUiPreview`：PM 可以通过意图脚本（`/select` / `/button`）生成场景步骤与语义 UI 组件，右侧 UI_INTENT Tab 中的线框 Mock UI 支持真实点击，形成一条从「场景意图 → 语义 UI → UI_INTENT/TRACE」的最小 Executable Spec 链路。

这个组合已经满足了 **“Reliable Runner”** 的基线（见 `10-runtime-baseline.md` 与 `mvp/README.md`），下一步是：

1. 在 RegionSelector Playground 中为关键 Logic/Flow 标记 ruleId / intentId；  
2. 在 Trace / LOG / COMPLETE 事件中透传这些标识；  
3. 增加一个简化的规则面板（哪怕只是一个静态 JSON 列表），开始在 UI 上呈现「哪条规则被触发」；  
4. 在文档中为 RegionSelector 写一份简化版 ScenarioSpec，手工对照 RunResult 做一次“Executable Spec”的演示。

等这条链路跑通后，可以再将这些经验回写到：

- `30-intent-coverage-and-ai-feedback.md`：正式定义 AlignmentReport 与 Intent 覆盖率；  
- `docs/specs/sdd-platform/workbench/ui-ux/00-platform-ui-and-interactions.md`：增加一节「Playground / Alignment Lab」视图说明。

## 6. 小结

- 从 SDD 的角度，本仓的 v3 模型 + runtime-logix + @logixjs/sandbox 已经分别对应了 Spec / Plan / Tasks / Implement 四层中的大部分内容；  
- 真正缺的是一个把这四层「对齐起来」的实验场：  
  - 既能让 PM/设计用 Spec/Scenario 说清需求；  
  - 又能让 IntentRule / Logix 实现与运行时行为在同一视图里被观察与验证；  
  - 同时对 AI 提供可结构化消费的诊断反馈。  
- Playground 作为 **Executable Spec Lab**，就是为这件事服务的：  
  - 上游：消化 Spec 与 IntentRule；  
  - 中层：映射到 Logix/Effect 程序；  
  - 下游：通过 Sandbox 执行并生成 RunResult/AlignmentReport，再回流到 Spec 与代码中。

后续本稿会随着 RegionSelector Playground 与 AlignmentReport 的落地逐步从概念稿演进为实现说明，并拆分出更细的子文档（如 Spec DSL、规则编辑、CI 集成等）。
