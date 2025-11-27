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
     - 什么是 Intent？什么是 UI / Logic / Domain 三位一体？  
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

### 2.2 UI / Logic / Domain（三位一体）

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

- **Domain (Data)**  
  - 表达业务概念与数据模型（实体）及其不变量；  
  - 包含：  
    - 实体 Schema（Employee、Contract、Task、ImportJob…）；  
    - 领域服务契约（ApprovalService、ImportService、NotificationService 等）；  
    - 领域错误（ApprovalServiceError、FileImportError…）。  
  - 在实现层中，Domain 通常以 Effect.Schema + Context.Tag/interface 的形式出现，但概念上先于任何具体实现。

## 3. 资产与模式相关术语

### 3.1 Pattern（模式）

- **Pattern Function**（运行时事实形态）：  
  - 统一视为「Effect-native 长逻辑封装」：  
    - 纯 Effect 形态：`runXxxPattern(input: XxxPatternInput): Effect.Effect<A, E, R>`；  
    - Logic Pattern 形态：`makeXxxLogicPattern(config?): Logic.Fx<Sh, R, A, E>`。  
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
  - 描述“一个用例”涉及哪些 UI/Logic/Domain 节点与粗粒度规则。

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
  - 以 Effect 形态表达，Env 中可以看到当前 Store 的 runtime 能力以及额外的 Domain Service；  
  - 通过 Flow / Control 组合形成可视化的业务流程。

- **Flow**  
  - 概念上是「围绕时间与事件流的编排工具集」：  
    - 回答「从哪里开始？如何触发？如何控制并发？」；  
    - fromAction / fromChanges / debounce / runLatest / runExhaust / runSequence 等。  
  - 不负责业务决策，只负责“什么时候跑哪个 Effect”。

- **Control**  
  - 概念上是「围绕 Effect 的结构化控制流工具集」：  
    - 回答「触发之后怎么执行？有哪些分支/错误域/并发结构？」；  
    - branch / tryCatch / parallel 等。  
  - 对平台而言，这些算子是构建 Logic Graph 的结构锚点。

### 4.2 Intent 命名空间

- **Intent (L1/L2 门面)**  
  - 提供更接近业务语义的原语：  
    - `Intent.andUpdateOnChanges` / `Intent.andUpdateOnAction`：单 Store 内派生状态/事件驱动状态更新；  
    - `Intent.Coordinate.*`：跨 Store 协作（A → B）。  
  - 对平台/Parser 来说，Intent 命名空间是识别 “意图原语” 的首选入口。

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

