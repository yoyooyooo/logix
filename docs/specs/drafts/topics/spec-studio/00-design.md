---
title: Spec Studio Design (SPEC Integration)
status: Ready for Review
version: 2
---

# Spec Studio: L0 意图入口 (The L0 Intent Interface)

> **Status**: Ready for Review (L9)
> **Focus**: 定义平台的 **L0 (Spec)** 层。这是将“模糊意图”转化为“清晰需求”的入口。

## 1. 核心理念：SPEC

平台采用 **SPEC** 方法论来引导用户从想法到实现：

1.  **S**pecification (L0): 定义 **What** 和 **Why**。问题、胃口（投入预期）、解决方案。
2.  **P**lanning (L1): 拆解为模块和依赖 (Universe 视图)。
3.  **E**xecution (L2): 设计逻辑流和领域模型 (Galaxy 视图)。
4.  **C**oding (L3): 实现细节 (Planet/Studio 视图)。

**Spec Studio** 是 **Specification** 阶段的专用界面。

## 2. Spec 模版 (The "Kit")

我们采用受 GitHub Spec Kit / Shape Up 启发的结构化方法。每个项目或特性都始于一个 **Spec 资产**。

### 2.1 结构

```markdown
# [Feature Name]

## 0. Goals & Metrics (Teleological Intent)
我们希望达成什么可量化的目标？
- [ ] 业务目标: 注册转化率提升 10%。
- [ ] 系统目标: API 响应时间 < 200ms。
> *Platform Magic*: 这些目标将自动生成代码中的 **Telemetry/Metrics** 埋点。

## 1. The Problem (问题)

## 2. Appetite (胃口/投入预期)
我们愿意投入多少时间/精力？
- [ ] Small Batch (1-2 天)
- [ ] Big Batch (1-2 周)

## 3. The Solution (解决方案)
方案的高层描述。

### User Stories (Logic Intent L0)
- [ ] 用户做 X，系统响应 Y。
- [ ] 当 Z 发生时，触发 W。

### UI Sketches (UI Intent L0)
- [ ] 仪表盘: 需要一个图表和一个最近订单列表。
- [ ] 弹窗: 简单的表单，带“提交”按钮。

### Domain Concepts (Domain Intent L0)
- [ ] Order (订单): { id, status, total }
- [ ] Customer (客户): { id, name }

## 4. Rabbit Holes (潜在风险)
风险、未知数和技术挑战。

## 5. No-Gos (不做列表)
明确我们在本次迭代中 **不做** 什么。
### 2.2 意图原语 (Intent Primitives)

为了将非结构化的自然语言转化为结构化 Spec，我们提炼了一组核心的 **意图原语**。

> [!NOTE]
> **方法论溯源 (Methodology Lineage)**
> 我们的数据模型直接继承自 **GitHub Spec Kit**，并针对复杂业务场景进行了扩展：
> *   **Spec**: 对应 Spec Kit 的 `Spec` (文档容器)。
> *   **User Story**: 对应 Spec Kit 的 `Story` (用户价值单元)。
> *   **Task**: 对应 Spec Kit 的 `Task` (工程执行单元)。
> *   **Epic (扩展)**: 这是一个新增层级，用于聚合相关的 Stories，解决大型 ToB 系统中 Story 过于零散的问题。

#### A. 史诗 (Epic / Feature Group)
*   **定义**: 大颗粒度的业务模块或能力集合（例如“支付系统”、“用户中心”）。
*   **作用**: 作为 User Story 的容器，用于组织和规划（L0.5 层级）。
*   **交互**: 在画布上表现为包含多个 Story 的“泳道”或“分组框”。

#### B. 用户故事 (User Story Widget)
*   **结构**: `As a <Role>, I want <Feature>, So that <Benefit>`
*   **交互**: 填空式卡片。
    *   `Role`: 下拉选择（复用 Domain 中定义的角色）。
    *   `Feature`: 简短文本。
    *   `Benefit`: 简短文本（可选）。

#### B. 逻辑流 (Logic Flow / Gherkin Widget)
*   **结构**: `Given <Context>, When <Event>, Then <Outcome>`
*   **交互**: 步骤条或即时逻辑构建器。
    *   `Given`: 初始状态（e.g., "订单状态为待支付"）。
    *   `When`: 触发事件（e.g., "用户点击支付"）。
    *   `Then`: 期望结果（e.g., "跳转收银台"）。

#### C. 领域概念 (Domain Concept Widget)
*   **结构**: `Entity <Name> { <Field>: <Type> }`
*   **交互**: 简易 ER 图编辑器或表格。
    *   自动识别名词并建议为实体。
    *   自动推导字段类型。

#### D. 界面草图 (UI Sketch Widget)
*   **结构**: `Screen <Name> contains <Component List>`
*   **交互**: 拖拽式线框图工具或自然语言生成（"画一个带搜索栏的列表"）。


## 3. 交互设计：Spec 向导 (The Spec Wizard)

Spec Studio 不仅仅是一个文本编辑器，它是一个 **AI 辅助的访谈界面**。

### 3.1 流程 (The Flow)

1.  **Brain Dump (想法倾倒)**: 用户在对话框中输入或语音描述模糊的想法。
    *   *User*: “我想做一个追踪披萨配送的仪表盘。”
2.  **The Interview (访谈)**: **Spec Agent** 分析输入，并基于 Spec 模版提出澄清问题。
    *   *Agent*: “明白了。对于仪表盘，你需要实时的地图追踪，还是只需要一个状态列表？在你的业务领域中，‘配送’是如何定义的？”
3.  **Live Crystallization (实时结晶)**: 随着对话进行，Agent 在屏幕右侧 **实时更新** 结构化的 Spec 文档。
    *   *User*: “实时太复杂了，先要个列表就行。”
    *   *Agent 更新 'No-Gos' 章节*: “实时地图追踪。”
4.  **Approval & Handover (审批与交接)**:
    *   用户点击 “Approve Spec”。
    *   平台从 Spec 生成 **Intent Rules** (L1/L2 草稿)。
    *   用户被重定向到 **Universe 视图** (L1)，其中包含预填充的模块结构。

## 4. 映射到意图层 (Mapping to Intent Layers)

Spec Studio 充当从自然语言到意图模型的 **解码器**。

| 意图原语 (Primitive) | 目标意图层 (Target Layer) | 生成的资产 (Artifact) | 映射逻辑 |
| :--- | :--- | :--- | :--- |
| **User Story** | **Logic Intent (L1)** | `LogicIntentNode` | `Role` -> Actor, `Feature` -> Description, `Benefit` -> Comment |
| **Logic Flow (Gherkin)** | **Logic Intent (L2)** | `IntentRule` | `Given/When` -> `Source` (Trigger), `Then` -> `Sink` (Action) |
| **Module Concept** | **Module Intent** | `ModuleIntentNode` | `Entity` -> `Module.make`, `Fields` -> `Schema.Struct` |
| **UI Sketch** | **UI Intent** | `UIIntentNode` | `Screen` -> Layout Component, `Component` -> Placeholder Node |
| **Appetite** | **Project Meta** | `Task.md` | `Small/Big Batch` -> Task Complexity / Due Date |

### 2.3 映射与交互深度分析 (Deep Dive)

为了确保 Spec 不仅仅是文档，而是可执行代码的草稿，我们需要建立从 **意图原语** 到 **Logix Runtime** 的精确映射，并为每个原语匹配最自然的交互形式。

#### A. 用户故事 (User Story) -> Logic Intent (L1)
*   **运行时映射**:
    *   `Role` -> **Auth Context / Actor**: 映射到 Runtime 中的 `CurrentRole` 或权限守卫。
    *   `Feature` -> **Logic Module Name**: 作为一个逻辑模块的自然语言标识。
    *   `Benefit` -> **Doc Comment**: 生成代码时的 JSDoc 注释，解释 *Why*。
*   **交互形式**: **结构化填空 (Mad Libs)**
    *   不要让用户面对空白文本框。
    *   提供一个句子模版：`作为 [角色下拉框]，我想 [输入功能]，以便于 [输入价值]`。
    *   *优势*: 强制用户思考角色和价值，同时利用现有的 Domain Role 数据。

#### B. 逻辑流 (Gherkin) -> IntentRule / Fluent API (L2)
这是最核心的映射，连接了自然语言与业务逻辑。

*   **运行时映射**:
    *   `Given <Context>` -> **Pre-condition / State Selector**:
        *   映射为 `yield* $.onState(s => s.status === 'Pending')`
        *   或 `Store.invariant` (业务不变量)。
    *   `When <Event>` -> **Trigger / Signal**:
        *   映射为 `yield* $.fromAction('Pay')` 或 `yield* $.onSignal(...)`。
    *   `Then <Outcome>` -> **Effect / Mutation**:
        *   映射为 `Service.call(...)` 或 `$.dispatch(...)`。
*   **交互形式**: **积木式语句构建器 (Block-based Builder)**
    *   类似 IFTTT 或 Zapier，但更细粒度。
    *   用户先选择 `Given/When/Then` 引导词，然后系统根据当前上下文推荐后续内容（例如选择了 `Order` Domain，就推荐 `Status` 字段）。
    *   *优势*: 既保留了自然语言的可读性，又限制了输入范围，确保能 100% 编译为代码。

#### C. 领域概念 (Domain Concept) -> Domain Assets
*   **运行时映射**:
    *   `Entity` -> **Module ID**: `Logix.Module('Order', ...)`。
    *   `Field` -> **Schema Definition**: `Schema.Struct({ status: Schema.String })`。
    *   `Relation` -> **Domain Reference**: 在 Schema 中引用其他 Module 的 ID。
*   **交互形式**: **智能表格 (Smart Spreadsheet)**
    *   类似 Notion Database 或 Airtable。
    *   第一列定义字段名，第二列定义类型（提供智能推导），第三列定义校验规则。
    *   *优势*: 开发者熟悉的定义数据的方式，比图形化的 ER 图更高效，比纯代码更直观。

#### D. 界面草图 (UI Sketch) -> UI Intent / Component Tree
*   **运行时映射**:
    *   `Screen` -> **Route / Page Component**。
    *   `Component` -> **UI Pattern / Placeholder**: 映射到组件库中的具体组件（如 `ProTable`）或通用占位符（`Box`）。
*   **交互形式**: **白板 + AI 识别 (Whiteboard + Vision)**
    *   允许用户绘制简单的线框图（Excalidraw 风格）。
    *   AI 识别图中的元素（"这是一个列表"，"这是一个按钮"）并转换为组件树结构。
    *   *优势*: 在 L0 阶段，用户更倾向于“画”而不是“配”。

### 2.4 活体 SPEC 画布 (The Living SPEC Canvas)

为了让 SPEC 方法论深入平台骨髓，我们不能只提供自由画布，必须提供 **“带方法论约束的画布”**。用户在画布上的每一次操作，都是在践行 SPEC 思想。

#### A. 智能节点 (Smart Nodes)
画布不再提供矩形或圆形，而是直接提供 **意图原语节点**。
*   **User Story Node**: 包含 Role/Feature/Benefit 三个插槽。
*   **Entity Node**: 自动展开为字段列表。
*   **Screen Node**: 也就是 UI Sketch Widget 的画布形态。

#### D. 视觉补全 (Visual Gap Filling)
这是多模态在“拆解过程”中的核心价值。当文字难以描述复杂逻辑时，画图是最高效的“信息注入”方式。
*   **场景**: AI 提示“我不理解‘复杂的审批流’具体指什么”。
*   **动作**: 用户在 Tldraw 上画一个带分支的流程草图。
*   **补全**: AI 识别草图结构，自动补全 Logic Flow 的细节，填补了文字描述的信息缺口。

#### E. 深度意图解析 (Deep Intent Parsing)
为了支持高保真生成，多模态引擎输出的 JSON 遵循 **UI Intent Schema** (Abstract/Concrete/Visual)。
*   **抽象组件**: 识别出 `Input { role: 'password' }` 而非具体的 `Antd.Input`。
*   **人机确认 (Human-in-the-loop)**: 当 AI 不确定时（例如“这是搜索框还是输入框？”），调用 `$.ask` API 在画布上弹出确认气泡。



#### B. 语义连接 (Semantic Links)
连线不仅仅是画线，而是建立 **意图关联**。
*   **Realizes (实现)**: 将 `User Story` 连向 `Screen` 或 `Logic Flow`。
    *   *交互*: 连线时弹出提示 "这个界面实现了故事中的哪个 Feature？"
*   **Displays (展示)**: 将 `Entity` 连向 `Screen`。
    *   *交互*: 自动在 Screen 中生成对应字段的占位组件。
*   **Triggers (触发)**: 将 `Screen` 中的按钮连向 `Logic Flow`。
    *   *交互*: 自动填充 Logic Flow 的 `When` 条件。

#### C. 自我闭环 (The Self-Closing Loop)
平台实时监控 SPEC 的完整性，形成闭环。
*   **孤岛检测**: 如果一个 `User Story` 没有连向任何 `Screen` 或 `Logic`，它会显示为“未实现 (Unrealized)”状态（红色高亮）。
*   **幽灵检测**: 如果一个 `Screen` 展示了 `Entity` 中不存在的字段，它会提示“数据缺失”。
*   **意图导航**: 双击 `User Story`，画布自动聚焦到所有实现它的 `Screen` 和 `Logic`，展示完整的“需求实现链”。

通过这种方式，画布不再是涂鸦板，而是 **可视化的 SPEC 编译器**。

### 2.5 严格溯源体系 (The Strict Traceability System)

参考 Spec Kit 的 Prompt 结构，我们将“User Story -> Task -> Implementation”的严格关联转化为平台的 UI/UX 核心机制。

#### A. 溯源链 (The Traceability Chain)
平台强制维护以下层级关系，禁止越级操作：
1.  **User Story (L0)**: 价值的起点。
2.  **Task (L0.5)**: 故事的拆解（TODO List）。
3.  **Intent Rule (L1/L2)**: 任务的逻辑/UI 映射。
4.  **Implementation (L3)**: 最终的代码实现。

#### B. 交互设计：三视图 (The Three Views)

1.  **溯源矩阵 (Traceability Matrix)**
    *   *形态*: 一个二维表格或泳道图。
    *   *行*: User Stories。
    *   *列*: Tasks / Logic / UI / Code。
    *   *作用*: 一眼看出哪个故事还没拆解任务，哪个任务还没写代码。红/绿/灰状态灯直观展示进度。

2.  **钻取导航 (Drill-down Navigation)**
    *   *交互*: 在 Spec 文档中点击一个 `User Story`，UI 不仅高亮，还会展开其下的 `Task` 列表。
    *   *交互*: 点击某个 `Task`，直接跳转到对应的 `Logic Module` 或 `Code Block`。
    *   *隐喻*: "剥洋葱" —— 从价值层一层层剥离到实现层。

3.  **严格模式守卫 (Strict Mode Guardrails)**
    *   **禁止游离代码**: 在严格模式下，试图创建不属于任何 Task 的 Logic/UI 时，系统会弹窗询问：“这是为了哪个 Task 服务？”
    *   **完成度校验**: 当标记 User Story 为 "Done" 时，系统自动检查其下所有 Task 是否已完成，以及所有 Task 是否都有对应的 Intent/Code 实现。

通过这套体系，我们把 Spec Kit Prompt 中的文本约束变成了 **平台交互约束**，确保“每一行代码都有迹可循”。

### 2.6 接地气：ToB 与 Effect-Native 深度集成

我们的平台服务于 ToB 复杂业务，且基于 Effect-Native 架构。因此，SPEC 不能止步于简单的 CRUD，必须能表达 **复杂的逻辑约束** 和 **Effect 运行时特性**。

#### A. ToB 专用意图原语 (ToB Primitives)
ToB 业务的核心不是“界面跳转”，而是“权限、审批、报表、数据一致性”。
*   **Permission Rule (权限规则)**: `Role <R> CAN/CANNOT <Action> ON <Resource> WHEN <Condition>`
    *   *映射*: `Policy.make(...)` 或 `Effect.when(isPermitted)`。
*   **Workflow State (工作流状态)**: `State <S> TRANSITIONS TO <S'> ON <Event> WITH <Guard>`
    *   *映射*: 状态机定义与 `Flow.fromState(...)`。
*   **Data Consistency (一致性约束)**: `Invariant: <Field A> MUST BE <Relation> <Field B>`
    *   *映射*: `Store.invariant(...)` 或 Database Constraint。

#### B. Effect-Native 映射 (The Effect Mapping)
Spec 中的“Rabbit Holes (潜在风险)”和“Context (背景)”直接映射到 Effect 的类型系统。

*   **Rabbit Holes -> Error Channel (E)**
    *   如果在 Spec 中写下：“风险：库存服务可能超时”，
    *   系统自动生成：`Effect<..., InventoryError | TimeoutError, ...>`，强制开发者处理错误。
*   **Context -> Environment (R)**
    *   如果在 Spec 中写下：“背景：需要当前用户信息”，
    *   系统自动注入：`yield* CurrentUser` Tag。
*   **Appetite -> Timeout/Retry Policy**
    *   如果在 Spec 中标记为 "Critical Path"，
    *   系统自动配置：`Effect.retry({ times: 3 })`。

#### C. 逻辑优先的交互 (Logic-First UX)
对于 ToB 系统，UI 往往是逻辑的副产品。
*   **先逻辑，后 UI**: 在 Spec Wizard 中，优先引导用户定义“数据流”和“规则”，而不是先画图。
*   **自动生成管理台**: 基于 Domain 定义，自动生成标准的 CRUD + 筛选 + 导出界面（ProComponents），让开发者专注于核心业务逻辑。

通过这种深度集成，SPEC 不再是泛泛的文档，而是 **Effect 代码的自然语言声明**。

### 2.7 理论基石：SDD 与 Spec-DD 的融合

本设计深受 **规范驱动开发 (SDD)** 与 **Spec-DD** 理论报告的启发，旨在实现 **Level 3: 规范即源码 (Spec-as-Source)** 的战略愿景。

#### A. 双重契约体系 (The Dual Contract System)
我们采纳 Spec-DD 的核心架构，建立两套互补的契约：
1.  **行为契约 (Behavioral Contract)**:
    *   *载体*: **Gherkin (Logic Flow)**。
    *   *作用*: 定义“系统应该做什么” (The Why & What)。
    *   *SSOT*: 产品经理拥有，作为功能验收的唯一标准。
2.  **技术契约 (Technical Contract)**:
    *   *载体*: **Domain Schema & Effect Signature** (类比 OAS)。
    *   *作用*: 定义“系统如何交互” (The Interface)。
    *   *SSOT*: 架构师拥有，作为代码生成的强制约束。

#### B. 形式化验证与反馈循环 (Formal Verification Loop)
借鉴 SDD 的“生成式反馈循环”机制：
1.  **生成 (Synthesize)**: AI Agent 根据 Spec 生成 `IntentRule` 和代码。
2.  **验证 (Verify)**: 平台利用 Effect 的类型系统和 `Store.invariant` 进行自动验证。
3.  **反馈 (Refine)**: 验证失败（如类型不匹配、死锁检测）直接反馈回 Spec Studio，提示用户修改 Spec，而不是修改代码。

#### C. 治理前置 (Shift-Left Governance)
通过 Spec Studio，我们将治理重心从 Code Review 转移到 **Spec Review**。
*   **宪法合规 (Constitutional Compliance)**: 在 Spec 阶段就检查是否符合架构原则（如“禁止在 View 层直接调用 API”）。
*   **风险模型转移**: 将风险从“实现风险”（代码写错）转移为“需求风险”（Spec 写错），利用 AI 的代码生成能力消除实现误差。

通过这一理论升维，Spec Studio 不再是一个简单的需求录入工具，而是 **下一代软件工程范式的控制台**。

### 2.8 用户策略：前端优先，兼容产品 (Frontend-First, Product-Compatible)

基于现状，**前端开发者**是 Spec Studio 的第一批核心用户，他们扮演着“需求翻译官”的角色。因此，交互设计必须优先满足前端的高效录入需求，同时为未来“产品经理直接使用”预留空间。

#### A. 开发者友好的输入 (Dev-Friendly Inputs)
前端开发者习惯代码思维，强制使用图形化 Wizard 可能会降低效率。
*   **TS 接口即领域 (TS Interface as Domain)**:
    *   允许用户直接在 Domain Widget 中粘贴 TypeScript Interface 定义（如 `interface Order { id: string; ... }`）。
    *   系统自动将其解析为 Domain Schema，无需手动点击添加字段。
*   **Markdown 速记 (Markdown Shorthand)**:
    *   支持在文本框中直接用 Markdown 列表快速录入 User Stories，系统自动识别并结构化。

#### B. 渐进式形式化 (Progressive Formalization)
不要一开始就强迫前端写出完美的 Gherkin。
*   **草稿模式 (Draft Mode)**: 允许先粘贴杂乱的 PRD 片段或会议记录。
*   **AI 提炼 (AI Refinement)**: 点击“整理”按钮，AI 辅助将草稿转化为结构化的 User Story 和 Logic Flow。
*   **从“怎么做”反推“要做什么”**: 允许前端先写伪代码（Logic），然后反向生成 User Story，补全 Spec。

#### C. 分工协作蓝图 (Collaboration Blueprint)
为未来的 PM/FE 协作设计“交接点”。
*   **PM 视图**: 专注于 User Story 和 UI Sketch（低保真）。
*   **FE 视图**: 专注于 Logic Flow 和 Domain Schema（高保真）。
*   **锁定与继承**: PM 锁定的需求，FE 只能“实现”不能“篡改”（除非申请变更），形成健康的制衡。

通过这种策略，我们既让前端现在就能“玩得转”（高效率），又为未来产品经理的加入铺平了道路（低门槛）。

## 3. 交互设计：Spec 向导 (The Spec Wizard)

虽然 L0 是高层的，但它植根于 Runtime 能力：

### 3.1 核心流程：拆解向导 (The Decomposition Wizard)

不同于传统的“新建向导”，Spec Wizard 是一个 **“拆解工作台”**。

1.  **导入 (Ingest)**:
    *   用户粘贴 PRD 文本、会议记录，或上传一张白板草图。
    *   系统提示：“正在分析方案背景与核心意图...”
2.  **识别 (Identify)**:
    *   AI 提取出关键的 **Epics (大颗粒需求)** 和 **Domain Objects (领域对象)**。
    *   **模式匹配 (Pattern Matching)**: 自动检索 `Generative Patterns` 库。
        *   识别出“审批”，推荐 `ApprovalPattern`。
        *   识别出“CRUD”，推荐 `ResourcePattern`。
    *   展示一个概览卡片：“我识别出 3 个核心模块...”
3.  **拆解 (Decompose)**:
    *   用户点击某个 Epic，进入拆解视图。
    *   AI 建议：“建议将‘支付流程’拆解为：选择支付方式、执行支付、支付回调处理。”
    *   用户确认或调整拆解粒度。
4.  **生成 (Generate)**:
    *   确认拆解无误后，生成对应的 Spec 文件结构和初始代码框架。


### 3.2 拆解视图：树与矩阵 (The Decomposition View: Tree & Matrix)

针对“如何展示和追踪拆解”，我们设计了 **“左树右表”** 的联动视图。

#### A. 视觉拆解树 (The Visual Decomposition Tree)
*   **形态**: 基于 ReactFlow 的思维导图结构。
*   **层级**: `Epic (根)` -> `User Story (枝)` -> `Task (叶)`。
*   **幽灵节点 (Ghost Nodes)**:
    *   AI 会根据上下文，在树上生成半透明的“幽灵节点”（建议的拆解任务）。
    *   **交互**: 用户点击幽灵节点，将其“实体化”为正式 Task；或者拖拽节点进行合并/拆分。
    *   *价值*: 降低拆解的认知负担，用户只需做“选择题”。

#### B. 追踪矩阵 (The Traceability Matrix)
*   **形态**: 位于底部的可折叠表格（类似 Excel）。
*   **列定义**:
    *   `Task`: 任务名称。
    *   `Status`: 🚦 红绿灯（Red: 未开始, Yellow: 开发中, Green: 已完成）。
    *   `Linked Logic`: 关联的代码函数（点击跳转 VSCode）。
    *   `Test Coverage`: 测试覆盖率。
        *   **Intent as Test**: 平台会自动生成 `business.test.ts`，测试结果直接反向点亮此处的红绿灯。
*   **联动**: 点击树上的节点，矩阵自动过滤显示该节点下的所有子任务状态。

#### C. 进度可视化 (Progress Visualization)
*   树上的父节点（User Story）会根据子节点（Task）的完成度，动态填充 **进度环**。
*   一眼就能看出哪个 Story 还在“卡壳”，哪个已经 Close。


用户的直觉是正确的：**画布 (Canvas)** 是承载非结构化意图的最佳容器。无论是流程图、思维导图还是草图，都是产品意图的自然流露。
但我们不能只做一个“画图工具”（Drawing Tool），必须做一个 **“语义化画布” (Semantic Canvas)**。

### 4.1 核心原则：图即数据 (Diagram as Data)
*   **基础层**: 采用成熟的画布引擎（推荐 **ReactFlow** 用于逻辑流，**Tldraw** 用于自由草图/思维导图）。
*   **语义层**: 每一个节点（Node）和连线（Edge）背后都必须绑定一个 **Spec ID**。
    *   画一个矩形 -> 后台生成一个 `UserStory` 对象。
    *   画一条连线 -> 后台生成一个 `Relation` 对象。
*   **拒绝纯图形**: 不允许存在“没有含义的图形”。如果用户画了一个圆，系统必须问：“这是什么？是开始节点，还是某个实体？”

### 4.2 为什么必须做画布？
1.  **思维的缓冲区**: 前端开发者在“翻译”需求时，需要一个地方整理思路。思维导图是最好的 User Story 拆解工具。
2.  **沟通的介质**: 未来产品经理介入时，他们看不懂代码，但看懂流程图。画布是 PM 和 FE 的通用语言。
3.  **意图的索引**: 当需求变多时，列表视图会失效。画布提供了天然的空间索引（Spatial Indexing）。

### 4.3 实施路线
1.  **Phase 1: 自由绘图 + 标注**: 先集成 Tldraw，允许用户自由画图，然后用“标注框”圈选内容并关联到 Spec。
2.  **Phase 2: 结构化节点**: 引入 ReactFlow，提供标准的 User Story Node 和 Logic Node，强制结构化连线。
3.  **Phase 3: 双向同步**: 画布上的修改实时同步到 Markdown Spec，反之亦然。

### 4.4 双引擎协同策略 (The Dual-Engine Strategy)

ReactFlow 和 Tldraw 各有千秋，我们采用 **“分层治理，渐进形式化”** 的策略将二者结合。

#### A. 角色分工 (Role Separation)
*   **L0 创意层 (The Whiteboard - Tldraw)**:
    *   *定位*: **"Messy & Free"**。
    *   *场景*: 脑暴、画草图、贴便利贴、绘制粗糙的 User Journey Map。
    *   *数据*: 存储为非结构化的 JSON，但支持通过“智能圈选”提取语义。
*   **L1/L2 逻辑层 (The Blueprint - ReactFlow)**:
    *   *定位*: **"Strict & Executable"**。
    *   *场景*: 编排 Logic Flow、定义状态机、连接 Domain 实体关系。
    *   *数据*: 直接映射到 `IntentRule` 和 `Domain Schema`，强类型约束。

#### B. 桥接机制：渐进形式化 (The Formalization Bridge)
如何从 Tldraw 过渡到 ReactFlow？我们设计了 **“转化 (Morphing)”** 动作。

1.  **圈选即定义 (Select to Define)**:
    *   用户在 Tldraw 中画了一个方框，里面写了“订单列表”。
    *   操作：右键 -> "Formalize as UI Node"。
    *   结果：系统在后台创建了一个 `UIIntentNode`。
2.  **无缝切换 (Seamless Switch)**:
    *   用户点击 "Switch to Logic View" (进入 ReactFlow 模式)。
    *   刚才那个“订单列表”方框变成了一个标准的 ReactFlow 节点，拥有了输入输出端口（Ports）。
3.  **双向锚点 (Bidirectional Anchors)**:
    *   在 ReactFlow 中对节点进行的逻辑连线，会在 Tldraw 中显示为“隐含的关联线”（虚线），提示用户这些草图元素在逻辑上是相连的。

#### C. 视图集成：画中画与钻取 (PIP & Drill-down)
您的直觉非常准确，这正是我们设计的核心交互模式：

1.  **缩略图模式 (Thumbnail Mode)**:
    *   在 ReactFlow 画布中，`UIIntentNode` 不渲染沉重的 Tldraw 编辑器，而是渲染一张 **SVG/Image 快照**。
    *   *视觉*: 看起来像一张缩略图卡片，上面有输入输出端口（用于连接 Logic）。
2.  **沉浸编辑模式 (Immersive Edit Mode)**:
    *   *交互*: **双击** ReactFlow 中的 `UIIntentNode`。
    *   *响应*: 弹出一个全屏模态框（或侧边抽屉），加载 **Tldraw 编辑器**。
    *   *操作*: 用户在这里精细绘制 UI 草图。关闭后，自动更新 ReactFlow 中的缩略图。
3.  **数据一致性**:
    *   ReactFlow 节点存储的是 `specId`。
    *   Tldraw 存储的是该 `specId` 对应的 `canvasData`。
    *   二者通过 Spec ID 实时同步。

### 4.5 多模态形式化引擎 (The Multimodal Formalization Engine)

正如您所见，从“乱涂乱画”到“结构化数据”的飞跃，必须依赖 **LLM 的多模态能力 (Vision)**。

#### A. 视觉解析流程 (Vision-to-Spec Pipeline)
当用户在 Tldraw 中圈选并点击 "Formalize" 时，后台发生以下过程：
1.  **快照截取**: 系统截取圈选区域的图片（PNG）。
2.  **视觉理解**: 发送给多模态大模型（如 Gemini 2.5 Pro / GPT-4o），Prompt: *"Analyze this UI sketch. Identify components, layout, and potential user interactions."*
3.  **结构化提取**: 模型返回 JSON 格式的组件树描述。
4.  **Spec 生成**: 平台将 JSON 转换为 `UIIntentNode` 和 `LogicIntentNode`。

#### B. 智能推断 (Intelligent Inference)
多模态不仅能识别“是什么”，还能推断“缺什么”：
*   **交互推断**: 识别出画了一个“搜索图标”，自动生成 `User Story: 用户可以通过关键字搜索...`。
*   **字段推断**: 识别出画了一个“表格”，自动根据表头文字推断 `Domain Schema`。

#### C. 持续校准 (Continuous Calibration)
*   如果 AI 识别错了（比如把按钮识别成了标签），用户可以在生成的 ReactFlow 节点属性中修正。
*   修正后的数据会作为 **Few-Shot 样本** 反馈给下一次识别，让 Spec Studio 越用越懂你的画风。

### 2.9 核心哲学：拆解优先 (Decomposition-First)

我们深刻认识到，**Spec Studio 的核心价值不是“无中生有”的创造，而是对已有方案的“拆解与追踪”**。
产品经理的思考（Background/Solution）发生在大脑或外部文档中，Spec Studio 的任务是接手这个“方案”，将其拆解为可执行的颗粒度。

#### 1.1 拆解工作流 (The Decomposition Workflow)

> **Progressive Constraint**: 拆解不是一蹴而就的。系统允许用户在早期保持模糊 (Epic/Sketch)，仅在进入出码阶段前强制要求 Story/Task 的完整度。

1.  **输入 (Ingest)**: 用户粘贴大段的 PRD、会议记录或方案描述。
2.  **识别 (Identify)**: AI 识别出其中的“大石头” (Epics/Features)。
3.  **拆解 (Decompose)**:
    *   **颗粒度控制**: AI 辅助将 Feature 拆解为 User Story，将 User Story 拆解为 Task。
    *   **人机协作**: 用户在画布上拖拽、合并、分割这些拆解后的节点。
4.  **追踪 (Trace)**: 系统实时监控拆解的完整性。

### 1.2 覆盖率与孤岛检测 (Coverage & Island Detection)

> **Alert Levels**:
> *   **Info (Gray)**: 探索阶段的温和提示。
> *   **Warn (Yellow)**: 准备阶段的建议。
> *   **Blocker (Red)**: 出码阶段的强制阻断。

*   **未覆盖 (Uncovered)**: 方案里提到“支持微信支付”，但没有对应的 User Story。
*   **孤岛 (Orphaned)**: 有一个 User Story “用户可以修改密码”，但没有对应的 Task 或 Logic 实现。
*   **颗粒度警报 (Granularity Alert)**: 某个 Task 过于庞大（如“实现整个后台”），系统建议继续拆解。

#### C. 意图识别的辅助角色 (AI as Copilot)
AI 不是替代思考，而是**辅助拆解**。
*   它负责从文本中提取候选对象（Candidate Objects）。
*   它负责检查逻辑漏洞（Gap Analysis）。
*   最终的**确认与编排**由人类（前端/产品）完成。

通过这种哲学，Spec Studio 成为了一个**“方案落地显微镜”**，帮助团队把模糊的方案变成精确的执行路径。


这是 Logix 区别于所有“原型工具”的根本所在：**画布不仅是生成器，更是运行时的“数字孪生 (Digital Twin)”**。

#### 4.1 代码即画布 (Code-to-Canvas)

> **Scope Constraint**: "Digital Twin" 仅针对 **Logix DSL (Intent/Flow)** 及其标准 Pattern，不试图解析任意用户手写代码。

得益于 **全双工解析器 (Full-Duplex Parser)**，代码的任何变动都会实时映射回画布。
*   **场景**: 开发者在 VSCode 中修改了 `user.flow.ts`，增加了一个 `Effect.retry` 步骤。
*   **渲染**: ReactFlow 画布自动刷新，对应的 Logic Node 上多出了一个“重试”图标/分支。

#### B. 运行时可视化 (Runtime Visualization)
因为 Logix Runtime (Effect) 是强结构的，我们可以把运行时状态投射到画布上。
1.  **执行高亮**: 当本地调试运行时，ReactFlow 中的连线会随着代码执行依次高亮（类似电路图通电）。
2.  **错误回显**: 如果某个 Effect 抛出了 Error，画布上对应的节点会变红，并显示错误堆栈。
3.  **热数据填充**: 可以在 Tldraw 的 UI 草图中，直接填充 Runtime 里的真实 Mock 数据，预览“有数据的草图”。

#### C. 架构守卫 (Architecture Guard)
如果开发者在代码里写了“违规代码”（例如绕过 Service 直接调 API），Parser 会识别出这个“未知调用”，并在画布上渲染一条**红色的虚线**，标记为“非法路径 (Illegal Path)”，强制开发者在视觉上直面架构腐化。

### 5. 出码策略：G3C (Granular Generation, Global Context)

针对“Epic 整体出码”还是“Task 逐个出码”的抉择，我们采用 **G3C 策略**：**颗粒度生成，全局上下文**。

#### A. 为什么不推荐 Epic 整体出码？
*   **上下文溢出**: 一个 Epic 可能包含几十个文件，LLM 一次性生成容易丢失细节或产生幻觉。
*   **调试困难**: 一次性生成 1000 行代码，如果跑不通，排查成本极高。
*   **心理负担**: 用户不敢轻易点击“生成”，因为回滚成本太高。

#### B. 推荐路径：Task/Story 级渐进式生成
1.  **原子化单元**: 最小出码单元是 **Task (L0.5)** 或 **User Story (L0)**。
    *   例如：只生成“创建订单”这一个 Flow，而不是生成整个订单系统。
2.  **全局上下文注入 (Global Context Injection)**:
    *   虽然只生成一个 Task，但 Prompt 会注入 **Epic 级别的元数据**（Domain Schema、公共工具类、架构规范）。
    *   确保生成的局部代码符合全局规范，不会产生“方言”。
3.  **依赖感知**:
    *   如果 Task B 依赖 Task A，系统会提示“建议先生成 Task A”。

#### C. 批量模式 (Batch Mode)
对于熟练用户，支持“勾选多个 Task”进行批量生成。
*   系统内部依然是**串行或并行地独立生成**每个 Task，最后进行代码合并。
*   这既保留了效率，又规避了上下文溢出的风险。

结论：**像搭积木一样出码，而不是像 3D 打印一样一次成型。**






*   **Pattern 推荐**: 如果 Spec 提到“审批流程”，Agent 会建议导入 `ApprovalFlow` Pattern。
*   **Domain 检查**: 如果 Spec 提到“用户”，Agent 会检查工作区中是否已存在 `User` Domain 并建议复用。
