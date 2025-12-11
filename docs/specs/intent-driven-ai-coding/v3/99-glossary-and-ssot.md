---
title: 99 · 概念总览与术语表 (Glossary & Conceptual SSOT)
status: draft
version: 1 (Concept-First)
---

> 本文档站在「概念层」之上，对 v3 阶段出现的核心概念与术语做统一定义。
> 运行时实现（runtime-logix）与平台实现（platform/Studio/Galaxy）都应当被视为这些概念的**具体化**，而不是反过来由实现去“定义”概念。

## 1. 分层视角：我们在谈哪些「层」？

从上到下，可以粗略分为四层：

1. **概念层 (Conceptual Layer)**
   - 讨论的是「世界观」：
     - 什么是 Intent？什么是 UI / Logic / Module 三位一体？
     - 什么算“需求意图”、“开发意图”、“实现”？
   - 本文档属于这一层，是所有术语的最终解释权（SSOT）。

2. **模型与协议层 (Model & Protocol Layer)**
   - 讨论的是「结构化表达」：
     - IntentSpec / IntentRule / Asset Schema 长什么样？
     - Pattern、Blueprint、Store/Logic/Flow/Control 在类型上的契约是什么？
   - 主要由下列文档承载：
     - `02-intent-layers.md` / `03-assets-and-schemas.md`
     - `runtime-logix/core/*.md`（Store / Logic / Flow / Control / IntentRule）
     - `platform/README.md`（L0–L3 资产链路、平台视图）。

3. **实现层 (Implementation Layer)**
   - 讨论的是「具体代码」：
     - Effect-native 的 Logix Runtime；
     - 平台的 Parser / Codegen / Studio 交互；
     - PoC 场景与 Pattern 示例。
   - 主要由：`runtime-logix`、`v3/effect-poc`、`v3/platform` 目录内代码与文档承载。

4. **应用层 (Application Layer)**
   - 讨论的是「在真实项目里如何使用」：
     - 某个业务仓库如何接入 Logix；
     - 某条产品线如何沉淀 Pattern / IntentRule；
     - 团队如何运营资产。

后面所有术语，如果出现歧义，应优先以 **概念层 → 模型与协议层** 的定义为准，再回看实现与应用。

## 2. 三位一体模型相关术语

### 2.1 Intent（意图）

- **Intent**：对「系统应该做什么」的结构化描述，而不是「怎么做」。
  - 从业务视角：需求、用例、交互规则。
  - 从技术视角：可以被 Codegen / Parser 消费的结构化数据（IntentSpec / IntentRule）。
- Intent 本身不绑定具体技术栈（React / Vue / Effect / REST / gRPC 等），它只描述：
  - 哪些 UI 节点参与；
  - 哪些业务流程发生；
  - 哪些领域概念/数据被读写。

### 2.2 UI / Logic / Module（三位一体）

- **UI (Presentation)**
  - 表达界面结构与展示状态；
  - 关注“看得见的行为”：组件树、布局、交互控件、视觉状态（loading/disabled 等）；
  - 不直接描述业务流程和领域规则，只表达「交互入口」与「展示结果」。

- **Logic (Behavior)**
  - 表达业务规则与流程编排；
  - 关注“事件 → 步骤 → 结果”的链路：
    - 触发条件（按钮点击、字段变化、定时器）；
    - 步骤顺序（串行/并行/重试/补偿）；
    - 状态更新与副作用（写 Store、调用服务、发通知）。
  - 在 v3 实现中，Logic 通常落在 Logix Runtime 的 `Store / Logic / Flow / Control` 层。

- **Module (Data)**
  - 表达业务概念与数据模型（实体）及其不变量；
  - 包含：
    - 实体 Schema（Employee、Contract、Task、ImportJob…）；
    - 领域服务契约（ApprovalService、ImportService、NotificationService 等）；
    - 领域错误（ApprovalServiceError、FileImportError…）。
  - 在实现层中，Module 通常以 Effect.Schema + Context.Tag/interface 的形式出现，但概念上先于任何具体实现。

## 3. 资产与模式相关术语

### 3.1 Pattern（模式）

- **Pattern Function**（运行时事实形态）：
  - 统一视为「Effect-native 长逻辑封装」：
    - 纯 Effect 形态：`runXxxPattern(input: XxxPatternInput): Effect.Effect<A, E, R>`；
    - Logic Pattern 形态：`makeXxxLogicPattern(config?): Logic.Of<Sh, R, A, E>`。
  - 内部只使用 Effect / Service Tag / Store / Logic / Flow / Control 等原语，不再引入第二套 DSL。

- **Pattern Asset**（平台资产形态）：
  - 在 Pattern Function 外层包一层 metadata：`{ id, version, configSchema, tags, ... }`；
  - 用于 Pattern Studio / Galaxy 中进行注册、配置与运行。

- **Tag-only Pattern**：
  - Pattern 中只定义服务契约（Tag + interface），不提供默认实现；
  - 实现由消费方在场景或 RuntimeLayer 中通过 `Effect.provideService` / `Layer.succeed` 注入；
  - 典型例子：Notification Pattern、Confirm Pattern。

### 3.2 IntentRule（意图规则）

- **IntentRule**：平台侧对 Logic Intent 的中间表示（IR），用于可视化与 Codegen。
  - 描述「源 (Source) → 策略管道 (Pipeline) → 终点 (Sink)」的链路：
    - Source：来自哪个 Store / Service 的状态或动作；
    - Pipeline：防抖、过滤、并发策略等算子；
    - Sink：更新哪个状态、派发哪个动作或调用哪个 Pattern。
  - 不依赖具体实现细节，但可以映射到 Store / Logic / Flow / Pattern 的代码结构。

### 3.3 资产层级（L0–L3）

参考 `03-assets-and-schemas.md` 的定义，这里只提炼关键含义：

- **L0：业务需求资产**
  - 需求文档、用例描述、PRD 摘要；
  - 形态不限，但应能映射到 IntentSpec。

- **L1：需求意图 / 用例蓝图 (Use Case Blueprint)**
  - 将 L0 自然语言投影到三位一体模型与 IntentRule 集合上；
  - 描述“一个用例”涉及哪些 UI/Logic/Module 节点与粗粒度规则。

- **L2：开发意图资产 (Developer Intent)**
  - Pattern `(input) => Effect`、Logic 模板、Store 模板、IntentRule 集合；
  - 是平台化与复用的主战场：Pattern + IntentRule 是首选平台资产。

- **L3：实现资产 (Implementation)**
  - 具体项目中的代码与配置：Store 实现、Logic 内部细节、UI 代码等；
  - 更贴近单一项目，可以反向提炼为 L2 资产。

## 4. Runtime 相关术语（概念视角）

### 4.1 Store / Logic / Flow / Control

- **Store**
  - 概念上是「一个可独立演进/复用的状态+动作模块」：
    - 有自己的 State Schema 与 Action Schema；
    - 提供读写、订阅与派发能力。
  - 不等价于“页面”或“组件”，更类似于“业务模块的可运行单元”。

- **Logic**
  - 概念上是「在某一类 Store 上长期运行的一段业务程序」；
  - 以 Effect 形态表达，Env 中可以看到当前 Store 的 runtime 能力以及额外的 Module Service；
  - 通过 Flow / Control 组合形成可视化的业务流程。

- **Flow**
  - 概念上是「围绕时间与事件流的编排工具集」：
    - 回答「从哪里开始？如何触发？如何控制并发？」；
    - fromAction / fromState / debounce / runLatest / runExhaust 等（并发语义通过 `run` / `runLatest` / `runExhaust` / `runParallel` 等算子表达）。
  - 不负责业务决策，只负责“什么时候跑哪个 Effect”。

- **Control**
  - 概念上是「围绕 Effect 的结构化控制流工具集」：
    - 回答「触发之后怎么执行？有哪些分支/错误域/并发结构？」；
    - branch / tryCatch / parallel 等。
  - 对平台而言，这些算子是构建 Logic Graph 的结构锚点。

### 4.2 Link (The Edge)

- **Link**
  - 概念上是「连接不同 Store/Module 的逻辑纽带」：
    - 在可视化视图（Galaxy/Canvas）中表现为连接 Store 节点的“边（Edge）”；
    - 负责表达“当 A 发生时，触发 B”的跨模块协作意图。
  - **运行时映射**：
    - Link **不是** 一个独立的运行时原语（没有 `Link.define`）。
    - 它在代码层面通过 **Logic** + **Bound API (`$.use`)** 实现：
      - `$.use(TargetStore)` 声明依赖；
      - `$.on(Source).then(Target.dispatch)` 实现交互。
  - **历史注**：曾被称为 `Orchestrator`，现已废弃该术语，统一收敛为 Link（图视角）与 Logic（代码视角）。

### 4.2 Intent 命名空间

- **Intent (L1/L2 门面)**
  - 提供更接近业务语义的原语：
    - L1 IntentRule：单 Store 内派生状态 / 事件驱动状态更新（对应代码侧 `$.onState / $.onAction + $.state.update/mutate`）；
    - L2 IntentRule（Coordinate）：跨 Store 协作（A → B，代码侧使用 `$.use(StoreSpec) + $.on($Other.changes/...).then($SelfOrOther.dispatch)`）。
  - 对平台/Parser 来说，Intent 命名空间是识别 “意图原语” 的首选入口。

### 4.3 StateTrait（字段能力引擎）

- **StateTrait**
  - 概念上是「字段能力与 State Graph 的统一引擎」：
    - 从 Module 图纸上的 `state + traits` 槽位，抽象出每个字段的能力（Computed / Source / Link 等）；
    - 生成结构化的 Graph 与 Plan，用于 Runtime 与 DevTools 消费；
    - 以 Module 维度作为边界，不跨模块偷偷引入隐式字段依赖。
  - 在实现层由 `@logix/core` 内部的 StateTrait 模块承载（见 `runtime-logix/core/02-module-and-logic-api.md` 与 `specs/001-module-traits-runtime/*`），早期分离包 `@logix/data` 的方案已被统一收敛到 StateTrait。
- **StateTraitGraph / StateTraitPlan / StateTraitProgram**
  - Graph（图）：字段与能力的结构视图（节点 = 字段；边 = 计算/联动/资源依赖）；
  - Plan（计划）：Runtime 执行这些能力的步骤清单（何时重算 computed、何时刷新 source、何时进行 link 传播）；
  - Program：从「State Schema + traits 声明」build 出来的统一 Program 对象，既包含原始 Spec，又包含 Graph/Plan，作为 Runtime 与 DevTools 的单一入口。
- **设计要点**：
  - StateTrait 只负责「字段如何被维护」的 **What**（例如：sum 是 a/b 的函数、profile.name 跟随 profileResource.name、某字段来自外部资源），不关心具体 IO 细节；
  - Runtime 通过 StateTraitPlan 将这些能力编译为实际的 Effect/Watcher/EffectOp 流，DevTools 则以 StateTraitGraph 作为 State Graph 的事实源。

### 4.4 Resource / Query（逻辑资源与查询环境）

- **Resource（逻辑资源规格）**
  - 概念上是「某类外部资源访问的规格说明」，由 ResourceSpec 描述：
    - `id`：逻辑资源 ID（例如 `"user/profile"`），与 StateTrait.source 中的 `resource` 对齐；
    - `keySchema`：用于描述访问 key 形状的 Schema（类似强类型 queryKey）；
    - `load(key)`：给定 key 如何访问该资源（Effect-native 实现，通常基于 Service Tag + Layer 注入）；
    - `meta`：缓存分组、描述信息等扩展位。
  - ResourceSpec 注册在 Runtime 环境中（通过 `Resource.layer([...])`），不同 RuntimeProvider 子树可以为同一资源 ID 提供不同实现。
- **Query（查询环境与中间件）**
  - 概念上是「针对部分资源接入查询引擎（如 QueryClient）的可插拔适配层」，不改变 StateTraitProgram 的结构：
    - `Query.layer(client)`：在 Env 中注册一个 QueryClient 实例；
    - `Query.middleware(config)`：订阅 `EffectOp(kind="service")`，基于 `resourceId + key + config` 决定某些调用是否走 QueryClient（缓存/重试/并发合并）。
  - StateTrait / Program **不理解** Query 细节，它们只负责在 Plan 中标记哪些字段是 Source、对应的 resourceId 与 key 规则；是否启用 Query 完全由 Runtime 层是否装配 `Query.layer + Query.middleware` 决定。
- **Runtime 协作关系（StateTrait.source ↔ Resource/Query）**
  - Module 图纸：只写 `StateTrait.source({ resource, key })`；
  - StateTraitProgram：在 Graph/Plan 中标记 source 字段与 resourceId/keySelector；
  - Runtime：在显式入口（例如 `$.traits.source.refresh("profileResource")`）被调用时构造 `EffectOp(kind="service", meta.resourceId, meta.key)`，交给 Middleware 总线；
  - Resource / Query 中间件：根据 resourceId + key 决定走 ResourceSpec.load 还是 QueryClient，DevTools 则在 Timeline 中观察这些 Service 调用与 State 更新。

### 4.5 EffectOp（运行时事件与统一中间件总线）

- **EffectOp**
  - 概念上是「所有重要边界 Effect 的统一事件模型」：
    - `kind`: `"action" | "flow" | "state" | "service" | "lifecycle"` 等；
    - `name`: 逻辑名称（如 Action tag、Flow 名称、资源 ID）；
    - `payload`: 输入/上下文；
    - `meta`: 结构化元信息（moduleId、fieldPath、resourceId、key、trace 等）；
    - `effect`: 实际要执行的 Effect 程序。
  - Runtime 在 Action/Flow/State/Service/Lifecycle 等边界构造 EffectOp，并通过统一的 MiddlewareStack 处理横切关注点（日志、监控、限流、Query 集成等）。
- **EffectOp Middleware 总线**
  - 与 `core/04-logic-middleware.md` 中的 Logic Middleware 不同，EffectOp 中间件是 **运行时级** 的统一总线：
    - Logic Middleware（`Logic.secure`）在 Logic/Flow 层包装某一段业务 Effect；
    - EffectOp Middleware 在引擎层对所有边界事件统一拦截与装饰；
  - 通过 Env Service（例如 `EffectOpMiddlewareEnv` + Tag）在 Runtime.make 入口注入当前使用的 MiddlewareStack，再由 StateTrait.install / Runtime 核心在需要时消费。
- **DevTools 视角**
  - EffectOp 提供了一条天然的时间轴与因果链：DevTools 可以基于 EffectOp 序列构建「Action/Flow/State/Service」的 Timeline 与因果图；
  - Debug 模块会将部分 EffectOp 以 `trace:effectop` 事件形式写入 DebugSink，供 Playground / Runtime Alignment Lab 与外部工具消费。  
  - StateTraitGraph 与 EffectOp Timeline 结合，构成“字段能力 + Runtime 行为”的双视角：结构（Graph）与事件（EffectOp）。

## 5. 平台相关术语（概念视角）

### 5.1 平台视图

- **Doc View**：需求录入与用例梳理（对应 L0/L1）。
- **Canvas View (Galaxy)**：跨模块协作与 IntentRule 图形化编辑（对应 L1/L2）。
- **Studio View**：代码生成与精修（对应 L2/L3），与本地仓库中的 Pattern / Store / Logic 等资产打通。

### 5.2 Full-Duplex Anchor Engine（全双工锚点引擎）

- 概念上是一套「Intent ↔ Code」互相映射的协议与工具链：
  - Intent → Code：根据 IntentSpec / IntentRule 生成符合约定的 Store / Logic / Pattern 实现；
  - Code → Intent：从受约束的代码子集解析出 IntentRule / Logic Graph，实现可视化回流。
- 关键前提：
  - 代码子集必须遵守上文定义的 Pattern / Store / Logic / Flow / Control 语义；
  - 锚点（Anchor）与 IR（IntentRule）是中间桥梁。

### 5.3 Playground / Sandbox / Runtime Alignment Lab

- **Sandbox Runtime（沙箱运行时）**
  - 指基于 Web Worker / Deno 等隔离环境的 Logix/Effect 运行容器；  
  - 主要职责是：在受控环境中执行代码，并产出结构化的日志 / Trace / 状态快照；  
  - 当前实现落点为 `@logix/sandbox` 子包（浏览器 Worker + esbuild-wasm + Mock 层）。

- **Playground（意图 Playground）**
  - 指平台侧面向人类/AI 的交互视图，用于：  
    - 挂载某个 Intent/Scenario（例如省市区联动）；  
    - 展示对应的 Logix/Effect 实现与运行结果（RunResult）；  
    - 支持手动/自动运行场景，用于验证实现是否符合 Intent。  
  - 本质上是 Intent/Spec → Logix → Runtime 闭环在 UI 层的一个窗口。

- **Runtime Alignment Lab（运行时对齐实验室）**
  - Playground 的目标形态：不仅“能跑代码”，而且显式回答：  
    > 当前运行行为是否与 Spec/Intent 对齐？  
  - 输入：Spec/Scenario + IntentRule/R-S-T + Logix/Effect 实现；  
  - 输出：RunResult + 对齐报告（Alignment Report），指出哪些规则/场景被覆盖、哪些存在偏差。  
  - 与 SDD 映射：对应于 SDD 中的 “Executable Specs + Verify/Loop” 阶段。

### 5.4 Universal Spy / Semantic UI Mock（简称 & 角色）

- **Universal Spy（通用探针 Mock）**
  - 用途：接管非核心 IO/SDK 依赖（HTTP 客户端、第三方 SDK 等），在 Sandbox 中将其统一降维为「可观测的调用 + 可配置的 Mock 行为」。  
  - 行为：通过递归 Proxy 记录调用路径与参数，并按 MockManifest 返回结果；  
  - 与平台的关系：为运行时提供“外部世界”的可控替身，便于在 DevTools/Playground 中观测与调试。

- **Semantic UI Mock（语义 UI Mock，简称 Semantic Mock）**
  - 用途：接管 UI 组件库（如 antd/mui），在 Sandbox 中不渲染真实 DOM，而是输出 **语义组件 + UI_INTENT 信号**；  
  - Worker 内：  
    - 提供 Button/Modal/Select 等语义组件的 Headless 实现；  
    - 以 `UiIntentPacket` 的形式发出组件的状态（props）与行为意图（mount/update/action 等）。  
  - Host/Playground：  
    - 在主线程将 UI_INTENT 渲染为线框视图或其他可视化表现；  
    - 把用户交互回传 Worker，驱动 Logix/Effect 逻辑运行。  
  - 概念定位：Semantic UI Mock 是 UI 层的 **Executable Spec** 载体——它描述“有哪些交互、这些交互如何影响状态”，而不是像素级的 UI 外观。

## 6. 冲突解决与 SSOT 归属

当你在实现或阅读过程中遇到“概念不一致”或“多处定义冲突”时，按以下顺序判断：

1. **优先查本文件**：
   - 若术语在此有定义，以此为准；
   - 若表述与其它文档不一致，应先修改其它文档，使之与本文件对齐。

2. **其次查模型与协议层文档**：
   - 三位一体与资产结构：`02-intent-layers.md`、`03-assets-and-schemas.md`；
   - Runtime 契约：`runtime-logix/core/*.md`；
   - 平台资产与视图：`platform/README.md`、`06-platform-ui-and-interactions.md`。

3. **最后看 PoC 与实现细节**：
   - `v3/effect-poc` 与其它运行时代码仅作为“实现参考”；
   - 如实现先于文档演进，应尽快回写概念层与模型层文档，避免“事实源漂移”。

> 一句话记忆：**概念先于实现，模型约束实现，PoC 用来帮我们验证与修正概念/模型，而不是反过来由 PoC 决定世界观。**
