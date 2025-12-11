# Feature Specification: 统一 Module Traits（StateTrait）与 Runtime Middleware/EffectOp

**Feature Branch**: `001-module-traits-runtime`  
**Created**: 2025-12-10  
**Status**: Draft  
**Input**: User description: "现在我们可以基于以上全部的讨论，创建一个新的 spec 了"

## User Scenarios & Testing *(mandatory)*

本特性聚焦三类用户视角：模块作者 / 业务开发者、Runtime 维护者 / 平台开发者、Devtools / Studio 维护者。目标是在一次演进中，把 Module 图纸的 Traits 能力、StateTrait 引擎以及 Runtime Middleware/EffectOp 的总线设计串成一条可长期演进的主线。

### User Story 1 - 模块作者用 `state + actions + traits` 定义完整图纸 (Priority: P1)

作为 Logix 模块作者，我希望在定义模块时，只需要：
- 在 `state` 槽位中，用标准 Effect Schema 定义完整 State 结构（包含需要作为正式字段存在的 computed 字段）；
- 在 `traits` 槽位中，用统一的 StateTrait DSL（例如 `StateTrait.from(StateSchema)({ ... })` + `computed / source / link`）为已有字段标注能力；
就可以让 Runtime 自动维护 computed / source / link 的行为，而不需要在 Logic 里手写一堆 Helper 或中间件 wiring。同时，Module 图纸（`state / actions / traits` 三个槽位）本身就能让人和 Studio 端一眼看清模块的状态形状与能力分布。

**Why this priority**: Module 图纸是平台和 Studio 的核心资产。如果能力声明仍然散落在 Logic Helper 或运行时代码里，就无法实现真正的“以图纸为中心”的全双工体验。本 User Story 确保 StateTrait 首先为“模块作者视角”服务，让 `state + traits` 成为可复用、可 Diff、可可视化的单一事实源。

**Independent Test**: 在仅引入 Logix core 与新 Trait 能力的前提下：
- 定义至少 2 个示例模块，仅通过 `state`（Schema）+ `traits: StateTrait.from(StateSchema)({...})` 声明 computed / source / link 行为；
- 确认模块作者在 IDE 中可以获得字段路径与 derive 函数的完整类型提示；
- 在不查阅实现文档的前提下，让一名新开发者根据图纸（state + traits）就能理解模块的主要状态与数据流向。

**Acceptance Scenarios**:

1. **Given** 模块作者为某模块补上 `traits: StateTrait.from(StateSchema)({ ... })`，**When** 在 IDE 中编辑 `traits` 时，**Then** 字段路径与依赖字段均有类型安全的提示，且 computed 字段本身的类型与 State Schema 保持一致。
2. **Given** 一个没有任何 Logic glue code 的示例模块仅依赖 `state + traits`，**When** 在教程或示例中以图纸形式展示该模块，**Then** 读者可以在不阅读 runtime 实现的前提下说清每个关键字段的来源（原始值 / computed / source / link）与依赖关系。

---

### User Story 2 - Runtime 维护者通过 StateTrait Program 安装行为 (Priority: P1)

作为 Runtime / 平台维护者，我希望在 Module Runtime 构建过程中可以：
- 将 Module 图纸中的 `state + traits` 交给统一的 StateTrait 引擎 `build`，得到一个 StateTraitProgram（内部含 StateTraitGraph 等结构 IR）；
- 在创建 ModuleRuntime / Logic 的过程中，只需调用 `StateTrait.install($, program)`，就可以把 computed / source / link 对应的 watcher / Flow / subscription 全部“安装”到 Bound API 上；
- 在未来引入 Runtime Middleware/EffectOp 总线时，StateTrait.install 可以自然地改为“把 Program 翻译成 EffectOp + Middleware 组合”，而无需回头修改业务模块。

**Why this priority**: Runtime 如果不能从 Module 图纸自动消费 Trait Program，Trait 就只能停留在“静态注释”层面。US2 确保 Runtime 有一条稳定的、Trait 优先的接线方式，为后续 EffectOp/Middleware 总线接入预留空间，同时不把 Module 作者暴露给中间件细节。

**Independent Test**: 在不修改业务模块 `state` 与普通业务 logic（例如 Action handler）的前提下，仅通过 StateTraitProgram + `StateTrait.install`：
- 可以跑通至少一个包含 computed / source / link 的典型模块，且行为与之前的手写 Helper 版本一致；
- 当 `traits` 中的声明发生变化时，无需修改 Runtime 入口代码，仅重新 build+mount 即可更新行为；
- 可以在不依赖 React / Router / Query 等周边框架的测试环境中完成验证。

**Acceptance Scenarios**:

1. **Given** Runtime 在初始化模块时从 `state + traits` 生成了 StateTraitProgram，**When** ModuleRuntime 被创建并调用 `StateTrait.install($, program)`，**Then** 模块的 computed / source / link 行为全部按约定生效，无需模块作者手写任何 glue code。
2. **Given** 模块作者仅修改了 `traits` 中某个 computed 字段的 derive 函数或某个 source 字段的资源配置，**When** 重新运行模块，**Then** Runtime 在不修改任何 Runtime 配置或中间件 wiring 的前提下，自动按最新 Program 更新行为。

---

### User Story 3 - Devtools / Studio 统一消费 StateTraitGraph 与 Trait 家族 (Priority: P2)

作为 Devtools / Studio / 平台开发者，我希望：
- 通过一套 Trait 家族（StateTrait 起步）为 Module 图纸上的状态、行为、视图等提供能力标签，并在内部统一 build 为 Program；
- StateTraitProgram 中包含的 StateTraitGraph 可以作为 Devtools / Studio 的结构事实源，用于渲染字段依赖图、能力拓扑、版本 diff 等；
- 在未来引入 ActionTrait / FlowTrait / ModuleTrait 等后，Devtools 可以用类似方式获取对应的 Graph/Program，而不用解析 runtime Middleware 或 Logic 代码。

**Why this priority**: Devtools / Studio 需要一个稳定的“Program & Graph 层”，而不是面向零散的 runtime 实现。US3 确保 StateTraitProgram 与 StateTraitGraph 的设计足够通用，可以作为后续 Trait 家族与 Runtime Middleware/EffectOp 的连接点，为新版 Studio 和诊断工具预留统一入口。

**Independent Test**: 在不构建 UI 的前提下，仅通过程序化接口：
- 能从运行中的 Runtime 中导出某个模块的 StateTraitProgram，并从中拿到 StateTraitGraph；
- 能对比同一模块在两个分支上的 StateTraitGraph，得到字段与依赖变更的结构化 diff；
- 这些结构可以被 Devtools / Studio 代码消费，而无需了解 StateTrait 的内部 runtime 实现细节。

**Acceptance Scenarios**:

1. **Given** 某模块已经通过 `state + traits` 声明了字段能力并在 Runtime 中运行，**When** Devtools 调用约定的诊断接口，**Then** 可以获取到该模块的 StateTraitProgram 与 StateTraitGraph，并基于 Graph 正确绘制字段/能力依赖拓扑。
2. **Given** 同一模块在两个版本之间调整了部分 traits 声明，**When** Devtools 调用 diff 能力对比两份 StateTraitGraph，**Then** 可以得到新增/移除字段以及依赖边的清单，供代码审查与可视化展示使用。

---

### User Story 4 - Runtime 维护者通过 EffectOp/Middleware 统一挂载横切能力 (Priority: P1)

作为 Runtime 维护者，我希望在 Logix 的 Action / Flow / State / Lifecycle / Service 等边界上：
- 只用一套 Effect‑Native 的中间件模型（EffectOp + Middleware + Observer/Runner/Guard）来挂载日志、观测、运行策略与守卫能力；
- 通过 RuntimeConfig / ModuleMeta / Flow 选项等配置方式，声明每类边界上希望启用的中间件组，而不是在每个 API 入口手写 wrapper；
- 在未来接入 StateTrait / ActionTrait / FlowTrait 等时，可以让 TraitProgram 仅生成“需要在某些边界启用哪些中间件”的意图，而中间件执行细节全部由 EffectOp 总线统一处理。

**Why this priority**: 如果 Runtime 的中间件模型仍然是多个零散的 wrapper/钩子，就算 Module 图纸和 Trait 家族设计得再好，下层执行也会异常分散。US4 确保 Runtime 有一根统一的中间件总线，为现有能力（日志、重试、超时、风控等）和未来 TraitProgram 驱动的能力提供稳定落点。

**Independent Test**: 在不改动业务模块的前提下，仅通过 RuntimeConfig + EffectOp/Middleware：
- 能在 Action 边界挂载一个简单的日志 Observer，在 Flow 边界挂载一个重试 Runner，并验证行为可配置、可关闭；
- 可以用同一套 Middleware 类型和组合器对 Action/Flow/State 三类边界做包装（而不是三套不兼容的接口）；
- 可以在单元测试中通过注入不同的中间件组合验证策略切换。

**Acceptance Scenarios**:

1. **Given** RuntimeConfig 中为 Action / Flow 边界分别配置了若干 Middleware，**When** 业务模块 dispatch Action 或执行 Flow 时，**Then** 中间件被按预期顺序触发，日志/重试等行为生效，并且更换/关闭某个中间件只需改动配置而非业务代码。
2. **Given** 对同一个 Flow 在不同环境（开发 / 预发 / 生产）使用不同的中间件组合（例如在开发环境启用 Debug Observer，在生产环境启用限流 Runner），**When** 运行应用，**Then** 只需通过配置切换即可改变行为，不需要修改 Flow 本身或 Module 逻辑。

---

### User Story 5 - Runtime 维护者通过 Query 环境为 StateTrait.source 提供统一查询能力 (Priority: P2)

作为 Runtime / 平台维护者，我希望在不改变模块作者使用 `StateTrait.source` 的前提下，通过 `Resource` / `Query` 命名空间和 Middleware：
- 通过 `Resource.make(...)` + `Resource.layer([...])` 为常见资源（如 `"user/profile"`）定义访问规格，将资源实现与 Module 图纸解耦；
- 在需要的 Runtime 范围（根 Runtime 或某个 RuntimeProvider 子树）装配 `Query.layer(queryClient)` + `Query.middleware(config)`，让该范围内的 `StateTrait.source` 调用自动获益于查询引擎的缓存 / 重试 / 并发合并等能力；
- 可以通过调整 Query 相关 Layer / Middleware，在“直连 Service 实现 vs 通过 QueryClient”之间切换，而不修改任何 Module / traits 声明。

**Why this priority**: Query 集成是 Trait + Middleware 组合在真实业务场景（远程资源）的第一条闭环，用来验证 `resourceId + key(state)` 这套事实源是否足以贯通 Module 图纸、Runtime 策略和 Debug 视图。US5 把 `StateTrait.source` 从“只描述资源 ID”升级为“可以在不同 Runtime 环境下挂接统一查询能力”的入口，对于后续把更多外部资源接入 Trait / Middleware 体系具有示范作用。

**Independent Test**: 在 quickstart 中的 CounterWithProfile 模块基础上：
- 构建一个仅使用 `Resource.layer([UserProfileResource])` 的 Runtime 配置（不启用 Query），并在 Logic 中定义一个显式 Action（例如 `refreshProfile`）通过 `$.traits.source.refresh("profileResource")` 触发加载，验证每次触发该 Action 时都会直接调用 ResourceSpec.load，对应 Service Tag 的调用次数与触发次数一致；
- 构建一个在上面基础上叠加 `Query.layer(queryClient)` + `Query.middleware(config)` 的 Runtime 配置，验证同样的用户路径下：
  - 业务可见行为（State 结构、computed/link 结果）保持一致；
  - 对应 `resourceId + key` 组合的 Service 实现实际调用次数减少（命中缓存或请求合并）；
  - Debug / Devtools 的 EffectOp Timeline 中可以看到 Query 相关 Middleware 的命中信息。

**Acceptance Scenarios**:

1. **Given** 某个模块的 `StateTrait.source` 仅声明了 `resource: "user/profile"` 与 `key(state)`，且 RuntimeA 只装配了 `Resource.layer([UserProfileResource])`，并在 Logic 中定义了 `actions.refreshProfile` 以显式调用 `$.traits.source.refresh("profileResource")`，**When** 在该 RuntimeA 下运行示例应用并多次触发 `refreshProfile`，**Then** Debug/日志中可以看到对应 `resourceId + key` 的 Service 实现在每次触发时都被调用（无缓存），且 Module / traits 无需感知任何 Query 细节。
2. **Given** 在 RuntimeA 的基础上构建 RuntimeB，叠加了 `Query.layer(queryClient)` 与 `Query.middleware(config)`，**When** 在 RuntimeB 下重复同样的用户操作路径，**Then**：
   - 对最终 State 与 UI 的观察结果与 RuntimeA 一致；
   - 对同一 `resourceId + key` 序列，Service 实现的实际调用次数明显减少（由 Query 负责缓存或去重），并且在 EffectOp Timeline 中可以看到 Query Middleware 的参与情况；
   - 整个过程中，Module 图纸中的 `StateTrait.source` 声明保持不变。

---

### User Story 6 - Debug / Devtools 统一建立在 Trait + EffectOp 体系之上 (Priority: P2)

作为 Debug / Observability 模块维护者，我希望：
- 将所有以 ad‑hoc 方式散落在 Logic / Runtime 中的 DebugSink、日志打印、状态快照等能力，统一建模为基于 EffectOp 的 Observer 中间件，并以 EffectOp 作为唯一运行时事件事实源（不再直接从 ModuleRuntime / Store / ActionHub 等内部结构订阅事件）；
- 对 State 层的结构观测，只消费 StateTraitProgram 和 StateTraitGraph，避免重复建图、避免出现“与 Trait 无关的第二套状态视图”；
- 在 Devtools / Studio 中，Debug 面板只依赖 StateTraitGraph（结构）、EffectOp 事件流（时间线）和 Middleware 配置（策略），不再暴露任何与 EffectOp 无关的 Debug 专用通道；仍然存在的旧 Debug 模块仅作为内部适配层或一次性迁移工具存在，不再作为扩展点。

**Why this priority**: 如果 Debug / Devtools 继续围绕旧 Debug 模块单独演进，很容易形成第二套与 Trait/Middleware 平行的“隐形 runtime”，既不利于排错，也不利于平台统一能力管道。US6 确保所有 Debug 能力被视为 Observer 类中间件，结构视角来源于 TraitGraph，时间线视角来源于 EffectOp 事件流，旧 Debug 模块彻底退居幕后。

**Independent Test**: 在重写一个典型的 Debug 能力（例如 Action/Flow 日志和 State 变化快照）时：
- 新实现仅通过 EffectOp Observer 订阅 Action / Flow / State / Service / Lifecycle 等边界事件，且输出信息不少于旧实现，同时 Debug 模块内部不再直接依赖 ModuleRuntime / Store / ActionHub 等内部结构；
- 可以在 Debug 视图中同时展示 StateTraitGraph（静态结构）与基于 EffectOp 的事件时间线（动态行为），帮助开发者理解“何时、何处、哪些 Trait / Middleware 在工作”；
- 任何仍保留的 ad‑hoc Debug 入口都被封装为基于 EffectOp 的 Observer 实现细节，新引入的 Debug 能力一律通过 EffectOp/Middleware 总线接入。

**Acceptance Scenarios**:

1. **Given** 一个基于新体系实现的 Debug 模块已经只通过 EffectOp Observer 订阅 Action / Flow / State / Service / Lifecycle 事件，**When** 运行示例应用并执行若干用户操作，**Then** Debug 面板中的时间线应能完整显示这些事件的触发顺序与结果，并附带关键 meta（模块 id、Trait/中间件命中情况等），且在代码层面看不到新的“直连 Runtime/Store 的 Debug 通道”。
2. **Given** 同一模块在 Trait / Middleware 政策发生变化（例如新增了某个 Runner 或关闭某个 Guard），**When** 在 Debug 面板中查看 StateTraitGraph 与 EffectOp 时间线，**Then** 能清晰看出结构和运行策略的差异，而不需要追踪到内部实现细节，也不需要查阅任何与 EffectOp 无关的 Debug 日志管道。

---

### User Story 7 - Devtools 面板统一承载 Debug / Trait / Middleware 视图 (Priority: P3)

作为 Devtools 维护者，我希望在 Devtools 面板中：
- 用基于 StateTraitGraph 的视图展示“模块状态与字段能力结构”（静态图），取代或统一现有零散的状态树/依赖视图；
- 用基于 EffectOp 事件流的时间线展示“Action / Flow / State / Service 运行轨迹”（动态图），包括哪些 Observer/Runner/Guard 被触发；
- 在同一面板中打通 Debug 与 Trait：从时间线中的某个事件可以跳转到对应的 Graph 节点与 Module 图纸，从 Graph 节点也能看到近期相关 EffectOp 事件与中间件命中情况。

**Why this priority**: Devtools / Debug 在用户心智里是一体的：既需要“现在状态长什么样”（结构），也需要“刚才发生了什么”（时间线）。如果 TraitGraph 和 EffectOp 时间线分别挂在不同子系统里，调试体验会碎片化。US7 确保 Devtools 面板成为 Trait + Middleware 的统一观测入口。

**Independent Test**: 在一个集成示例中：
- Devtools 面板至少提供一个「StateTraitGraph」视图和一个「EffectOp Timeline」视图，分别展示字段能力结构与边界事件时间线；
- 从 Timeline 中选中一个 Action / Flow / State 事件时，可以在 Graph 视图中高亮对应的字段/节点；反之，在 Graph 中选中某个字段/能力节点时，可以在 Timeline 中过滤/高亮最近相关事件；
- 旧 Debug 面板的核心能力（例如 action log、state diff）可以映射到上述两个视图，而不需要保留独立的、与 Trait/Middleware 脱节的 UI。

EffectOp Timeline 视图应提供“事件列表 + 详情区域”的布局：当没有选中任何事件时，详情区域默认展示时间线上最近一条 EffectOp 事件的信息；当用户点击某条事件时，详情区域展示该事件详情，再次点击同一事件则取消选中并恢复默认展示。

**Acceptance Scenarios**:

1. **Given** Devtools 已接入 StateTraitProgram 与 EffectOp 事件流，**When** 开发者在 Devtools 中打开某模块的调试面板，**Then** 可以在一个统一入口看到该模块的字段能力图（Graph）以及最近发生的 Action/Flow/State 事件（Timeline），并支持相互联动。
2. **Given** 某次线上问题被报告为“某个 computed 字段值异常”，**When** 开发者通过 Devtools 先选中该字段对应的 Graph 节点，再查看关联的 EffectOp Timeline，**Then** 能够快速定位近期影响该字段的事件序列与中间件策略，而不需要查阅多个不相干的 Debug 工具。

---

### User Story 8 - Query 语法糖扩展 StateTrait.source（Priority: P4 / 后续阶段）

作为模块作者，我希望在已经有 `StateTrait.source` 的前提下，可以选择性地使用 `Query` 命名空间提供的语法糖（例如 `Query.source` / `Query.cachedSource` 等）来声明常见的远程资源字段：
- 这些语法糖在类型和行为上仍然等价于调用 `StateTrait.source`，不会改变 Module 图纸和 StateTraitProgram 的结构，只是让常见模式（按路径取 key、带缓存语义的 source 等）更易读、更少样板代码；
- Query 语法糖的运行时行为完全通过 `Query.layer` / `Query.middleware` 与 EffectOp/Middleware 总线实现，移除对应 Layer/Middleware 后，模块仍然是一个纯粹依赖 StateTrait.source 的模块。

**Why this priority**: Query 语法糖是建立在 “StateTrait.source + Resource / Query + Middleware” 主干之上的额外便利层，属于锦上添花而非必需骨架。本 User Story 明确放在后续阶段，用来在不动 StateTrait 核心协议的前提下，为常见查询场景提供一批契合心智的 helper API，验证 Trait + Middleware 组合对“语法糖生态”的支撑力。

**Independent Test**: 在已有的 CounterWithProfile 示例上：
- 为 `profileResource` 同时提供一个基于 `Query.source` 的写法，并证明其编译结果与直接调用 `StateTrait.source` 在 StateTraitProgram/Graph 层完全一致（仅 Devtools 元信息可能增加）；
- 在启用/禁用 Query 相关 Layer/Middleware 时，模块的 traits 声明不需要任何改动，行为差异完全体现在底层 Service 调用次数、缓存命中和 EffectOp Timeline 的中间件标记上。

---

### Edge Cases

- 当模块 State 过于庞大（深度嵌套、包含大量动态列表）时，StateTraitSpec 与类型系统是否仍保持可用性与性能（例如 IDE 提示不明显卡顿，`StateTrait.from(StateSchema)` 下的路径提示可在合理时间内完成推导）。
- 当 `traits` 声明与 State Schema 不一致（例如删掉某字段但 traits 仍引用它）时，系统应在编译期或开发时给出明确错误/警告，而不是在 Runtime 默默失败。
- 当一个模块在不同 Runtime 上下文被多次挂载（例如多实例、多租户）时，StateTraitProgram 与 StateTraitGraph 的导出必须通过模块级 Program + 实例 envelope 的方式区分模块级结构与实例维度：Program / Graph 作为模块级结构模板复用，Runtime 在导出给 Devtools 时附加包含 moduleId 与 instanceId 的 runtime envelope，并要求所有 EffectOp 事件带上相同实例 id，以便 Devtools 在实例维度上进行隔离与筛选，避免诊断信息混淆。
- 当前版本的规模假设：单个 Runtime 主要面向中等规模应用（约 50–80 个 Module，每个 Module ≤ 200 个 State/Trait 节点）；超出该范围的极端大图不在本轮优化范围内，可在后续阶段专门评估性能与内存优化。
- 对于过于复杂或深度递归的 Effect Schema 组合，本轮特性默认“尽可能支持”：StateTrait.from 应在类型推导与 Graph 构建时递归到预设层级即停止展开，将超出层级或高度动态的结构（例如深层 Map/Record、极端 Union 等）视为叶子节点整体对待，而不是在编译失败或 Runtime 崩溃之间做二选一。

## Clarifications

### Session 2025-12-10

- Q: 在 v001 版本的规范层面，StateTrait / Runtime / Devtools 是否要显式钉死“EffectOp 为 runtime 事件唯一事实源”？ → A: 是，EffectOp 为唯一运行时事件事实源，所有 Debug/Devtools 能力必须通过 EffectOp Observer/Middleware 接入。
- Q: 旧 Debug 模块（如早期的 DebugSink/DebugHub 等）在本特性中的定位是什么，是否需要维持运行时层面的兼容入口？ → A: 一律视为 Legacy 实现，仅允许通过基于 EffectOp 的适配层做一次性迁移/清理，不再作为对外扩展点，也不再保证与新 Runtime 的直接兼容。
- Q: 当由 StateTrait.source 产生的资源访问失败（例如网络错误、超时，或对应 `resourceId` 未注册）时，这一版特性在 Runtime 层的默认策略应该是什么？ → A: 默认保留上一次成功值或初始默认值，并通过 EffectOp/Devtools 记录错误状态。
- Q: 当 StateTrait.build 检测到 traits 声明存在结构性错误（例如引用不存在字段、形成依赖环或配置不符合 Schema 类型等）时，这一版的默认行为应该是什么？ → A: 采用分级错误处理：对致命结构错误在 StateTrait.build 阶段直接失败并返回错误；对非致命问题以 warning 形式写入 Program 元数据并在 Devtools/日志中展示，同时仍然生成 Program。资源绑定类错误由后续 Runtime/Resource 校验负责，另提供 strict 模式将 warnings 视为错误用于 CI。
- Q: 当同一个 Module 在多个 Runtime 上下文被挂载（多实例、多租户）时，StateTraitProgram 与 StateTraitGraph 应如何区分模块级结构与实例维度？ → A: 将 StateTraitProgram / Graph 视为模块级结构模板复用，在导出给 Devtools 时通过单独的 runtime envelope（包含 moduleId + instanceId 等）包装，并要求所有时间线事件带上相同实例 id，Devtools 通过实例维度做隔离与筛选。
- Q: 在应用未显式配置 RuntimeConfig 时，Runtime 对 Middleware 的默认策略应该是什么？ → A: 采用环境感知的观测基线：在 dev/test 环境无配置时默认启用一组覆盖旧 Debug 行为核心能力的 Observer（例如 Action 日志、错误记录与轻量状态快照）；在 prod 环境默认仅保留错误记录与关键指标 Observer，其它高开销中间件需通过 RuntimeConfig 显式启用。
- Q: 当前这一版特性需要默认支持到什么规模的模块 / Trait 图（模块数量与每个模块的字段/Trait 节点数）？ → A: 单个 Runtime 以中等规模为目标：约 50–80 个模块，每个模块不超过 200 个 State/Trait 节点。
- Q: 在「中等规模」假设下，这一版特性对 StateTrait.build + StateTrait.install 首次路径的性能基线是什么？ → A: 在开发环境中，单个 Module 的 build + install 目标控制在 50ms 以内，一个包含约 50–80 个 Module 的 Runtime 首次装配目标控制在 500ms 以内，后续优化在此基线之上迭代。
- Q: Devtools 与日志中默认如何处理可能包含敏感数据的 State / EffectOp 信息？ → A: 本轮特性假定调试数据仅面向开发/测试环境的开发者使用，无需字段级脱敏，Devtools 与日志默认展示完整原始数据，与现有 Debug 行为保持一致，访问控制交由环境与平台配置保障。
- Q: StateTrait DSL 中的配置函数（例如 computed 的 derive、source 的 key 等）在本轮特性中需要多“纯”？ → A: 所有此类函数必须是同步纯函数，只依赖传入的 state 与闭包中的常量，不允许直接执行 IO 或访问运行时环境，所有外部交互一律通过 StateTrait.source + Resource/Query + Middleware 所承载的 EffectOp 通路表达。
- Q: 这一版 StateTrait 引擎对 Effect Schema 的支持范围要多大，尤其是面对过度复杂或深度递归的 Schema 组合时应该如何处理？ → A: 这一版默认面向完整的 Effect Schema 能力设计，StateTrait.from 会尽可能支持各种组合与递归结构；在类型推导与 Graph 构建时，如果遇到过于复杂或深度超出合理阈值的 Schema，可以在预设层级后停止递归，将超出部分视为不再展开的叶子节点整体处理，而不是直接报错或崩溃。

### Session 2025-12-11

- Q: Devtools 面板中 EffectOp Timeline 视图的事件选中与详情区域的默认行为应该是什么？ → A: Timeline 默认不激活任何事件，当没有选中事件时，详情区域始终展示时间线上最近一条 EffectOp 事件的信息；当用户点击某条事件时，详情区域切换为该事件的详情视图，再次点击同一事件将取消选中并恢复“跟随最新事件”的默认展示。
- Q: 当 StateTrait 在一次用户输入下产生多次 update 事件时，这一版对 React 组件每次输入允许的 render 次数上限与 Trait 引擎的合并/去重策略有什么约束？ → A: 在典型开发与生产环境中，每次用户输入最多允许触发 2 次组件实际 render（不含 React StrictMode 的额外检查），Trait/Runtime 层可以产生多次内部状态更新事件，但 UI 绑定层必须通过批处理与去重将这些事件合并，使订阅只触发不超过 2 次实际渲染。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统必须在现有 Module 编程模型之上收敛出统一的「Module 图纸」形态，使模块作者可以仅通过 `state`（Effect Schema）、`actions` 与 `traits`（StateTraitSpec）三个槽位完成模块状态结构与字段能力声明，且无需在 Logic 中为字段能力编写额外 glue code。
- **FR-002**: 系统必须为 State 层提供一套完整的 StateTrait 能力（命名空间 `StateTrait`），包含用于声明的 DSL（`from / computed / source / link`）与用于 Runtime 的钩子（`build / install`），并在类型层面保证 traits 中的字段路径、derive 函数与 State Schema 保持一致。
- **FR-003**: 系统必须能够基于 Module 图纸中的 `state + traits` 调用 StateTrait 引擎 `build` 生成 StateTraitProgram，Program 应至少包含：原始 State Schema、StateTraitSpec、StateTraitGraph 以及供 Runtime 使用的 StateTraitPlan（执行计划）。对于 `kind = "source"` 的 StateTraitEntry，Program 需保留其 `resourceId` 与 key 规则（`key: (state) => ...`），但不直接嵌入具体 HTTP/DB/RPC 逻辑。
- **FR-004**: Runtime 必须能够在 ModuleRuntime / Logic 初始化阶段，通过统一的 `StateTrait.install($, program)` 钩子消费 StateTraitProgram，将 computed / source / link 等行为安装到 Bound API 上，而不是在多个路径中重复实现这些逻辑。
- **FR-005**: Devtools / Studio / 平台必须能够通过约定接口获取某模块的 StateTraitProgram 与 StateTraitGraph，用于可视化、诊断与版本 diff；后续引入的其他 Trait 家族（例如 ActionTrait / FlowTrait / ModuleTrait）应尽量复用同样的“Spec → Program → mount”生命周期与 Graph 思路。
- **FR-006**: 在对外 API 层面，应逐步淡化历史上规划的 `@logix/data` 独立包定位，将其中已有的字段/能力/图结构 IR 收敛进 `@logix/core` 的 StateTrait 内核（internal state-trait 模块），对最终用户只暴露 Trait / StateTrait 概念与 `state / actions / traits` 图纸形态，不再引入新的 `@logix/data` 发布或对外依赖；既有与 `@logix/data` 相关的规范（如 `specs/000-implement-logix-data`、`specs/002-logix-data-core-dsl`）统一视为 PoC / 历史方案，仅供参考，本特性（`specs/001-module-traits-runtime`）为新的主线入口。
- **FR-007**: 本特性的设计必须与 Runtime Middleware & EffectOp 蓝图保持兼容：StateTrait.install 的实现应预留通过 EffectOp/Middleware 总线执行 Plan 的路径，后续可将 StateTraitPlan 中与运行策略相关的部分降解为 Middleware 配置，而不改 Module 图纸与 StateTraitSpec。
- **FR-008**: 系统必须在 Runtime 中提供一个统一的 EffectOp/Middleware 中间件总线，用于对 Action / Flow / State / Lifecycle / Service 等边界挂载 Observer / Runner / Guard 能力，并提供配置模型（例如 RuntimeConfig / ModuleMeta），使这些中间件可以按环境和模块粒度进行启用/关闭与组合，而不侵入业务逻辑；EffectOp 同时作为这些边界上所有运行时行为（Action 派发、状态更新、外部服务调用、生命周期事件等）的唯一事件事实源。
- **FR-009**: Debug / Observability 能力（包括 DebugSink、日志钩子、状态快照等）必须视 EffectOp 为唯一运行时事件事实源，通过基于 EffectOp 的 Observer 中间件接入，并以 StateTraitProgram / StateTraitGraph 为结构事实源，用于绘制结构拓扑与解释事件时间线；旧有零散 Debug 接口必须在实现层被封装为基于 EffectOp 的适配层或直接移除，对外不再作为扩展点，本特性之后不允许引入绕过 EffectOp 总线的直接 Debug 通道。
- **FR-010**: Devtools 面板必须在 UI 层显式接入 Trait 与 Middleware 信息：提供基于 StateTraitGraph 的结构视图与基于 EffectOp 的时间线视图，并支持两者之间的联动导航，从而让 Debug 与 Trait/中间件策略在一处集中呈现，而非分散在多个工具中。
- **FR-011**: 对于 StateTrait.source 声明的资源字段，Runtime 必须提供统一的 `Resource` / `Query` 命名空间接线模型：模块侧只声明 `resourceId + key(state)`；应用侧通过 `Resource.make(...)` 定义资源规格并用 `Resource.layer([...])` 注册到 Runtime（内部封装 ResourceRegistryTag 与具体 Service Tag）；可选的查询引擎集成通过 `Query.layer(queryClient)` 与 `Query.middleware` 基于 `EffectOp(kind = "service")` 决定哪些 resourceId 走缓存/重试等策略。StateTrait.install 在执行 source 相关计划时，应仅依赖 resourceId 与 key 规则构造 `EffectOp(kind = "service")`，再交由 Middleware/EffectOp 总线及 Resource/Query 层决定具体访问方式，而不直接暴露底层 Tag/Registry。
- **FR-012**: 为避免 Studio/Parser 与 Runtime 行为不一致，`StateTrait.build` 必须是纯函数（仅依赖 `stateSchema + StateTraitSpec`），其核心逻辑应设计为可在非 Runtime 环境中复用（例如通过共享代码或 WASM），以便 Studio/Parser 可以使用相同规则构建 StateTraitProgram / StateTraitGraph，并对 traits 做静态验证。
- **FR-013**: 为支持 Devtools 的“玻璃盒”调试体验，StateTraitProgram / StateTraitGraph / StateTraitPlan 中的节点与步骤应携带必要的源位置信息与元数据（例如模块 id、文件路径与大致行号，关联的 EffectOp 标识），使 Devtools 能够从 Graph 节点和时间线事件跳转回对应的 traits 定义代码，并展示由 StateTrait.install 展开的 watcher/Flow/EffectOp 链接关系。
- **FR-014**: 对于 StateTrait.source 声明的资源字段，Runtime 在资源访问失败（例如网络错误、超时或未注册 `resourceId`）时，必须默认保留该字段的上一次成功值或初始默认值，并通过 EffectOp / Debug 事件在 Devtools / 日志中显式记录错误状态，以便后续重试与诊断。
- **FR-015**: StateTrait.build 在仅依赖 `stateSchema + StateTraitSpec` 的前提下，必须采用分级错误处理模型：对致命结构错误（例如引用不存在字段、依赖环、Trait 配置类型与 Schema 不匹配、未知 kind 等）直接失败并返回错误，不生成 StateTraitProgram；对非致命问题以 warning 形式写入 Program 元数据并在 Devtools/日志中展示，同时仍生成 Program。涉及资源绑定与 Runtime 配置的错误（例如 resourceId 未在 Resource/Query Layer 注册）必须交由后续 Runtime/Resource 校验负责。库层需提供 strict 模式（如 buildStrict 或配置项）以在 CI 场景下将 warnings 视为错误。
- **FR-016**: Runtime 在应用未显式提供 RuntimeConfig 时，必须采用环境感知的默认 Middleware 组合：在开发/测试环境中默认启用一组覆盖旧 Debug 行为核心能力的 Observer（包括但不限于 Action 日志、错误记录与轻量状态快照），以保证开箱即用的可观测性；在生产环境中默认仅保留错误记录与关键指标 Observer，其它高开销或噪声较大的中间件必须通过 RuntimeConfig 显式启用。在引入基于 EffectOp/Middleware 的新 Debug 体系后，总体默认行为需保持等价，只改变实现路径而不改变开发者对“默认可观测性”的感知。
- **FR-017**: 本特性默认假定 Devtools 面板与详尽日志仅在开发/测试环境中供开发者使用，不在本轮引入字段级脱敏或隐私策略；在这些环境中，StateTraitProgram / StateTraitGraph 与 EffectOp Timeline 中的 State/Action/Service payload 可以完整展示原始数据，访问与隔离由环境与平台配置控制。若未来需要面向生产或更高敏感等级的场景，将通过额外特性引入脱敏与权限模型，而不在本轮强加约束。
- **FR-018**: 为保证 StateTraitProgram / StateTraitGraph 的可移植性与静态分析能力，StateTrait DSL 下用于声明字段行为的函数（包括但不限于 computed 的 derive、source 的 key 以及 link 相关的路径/映射函数）在本轮特性中必须被视为同步纯函数：只依赖传入的 state 与闭包中的常量，不得直接执行 IO、访问运行时环境或触发 Effect；所有外部依赖与副作用必须通过 StateTrait.source + Resource/Query + Middleware 所承载的 EffectOp 通路表达。
- **FR-019**: 在 v001 版本中，StateTrait.source 生成的 `source-refresh` 计划必须通过显式入口触发：`StateTrait.install($, program)` 需为每个 source 字段在 Bound API / Runtime 上提供标准加载入口（例如 `$.traits.source.refresh(field)`），默认不得在模块挂载或任意 State 变化时隐式执行该计划。若未来引入自动模式（如 `onMount` / `onKeyChange`），必须通过 traits 配置与 Runtime/Middleware 显式启用。
- **FR-021**: 在与 React 等 UI 框架集成时，本特性必须对 Trait/Runtime 层的多次状态更新做合并与去重：在典型开发与生产环境中，每次用户输入（例如一次受控输入的 change 事件）允许触发的组件实际 render 次数上限为 2 次（不含 React StrictMode 的额外检查）；StateTrait.install 及其在 `@logix/react` 中的适配层需要通过批处理、事务或差分订阅等方式，将同一“逻辑输入”产生的多次内部 update 事件压缩为有限次数的 UI 层更新，避免 Devtools 中大量事件导致实际 UI 渲染频率失控。

- **FR-020**: Devtools 面板中的 EffectOp Timeline 视图在交互上必须满足：默认状态下不选中任何事件，当 Timeline 中没有选中事件时，时间线右侧或相邻的详情区域应跟随并展示最近一条 EffectOp 事件的信息；当用户在 Timeline 中点击某个事件时，该事件进入“选中”状态，详情区域展示其完整详情；再次点击同一事件应取消选中并恢复到“跟随最新事件”的默认展示模式。

- **FR-022**: ModuleRuntime 在内部必须引入显式的 StateTransaction 语义：任何一次可能修改 State 的逻辑输入（包括但不限于 Action dispatch、BoundApi.state.update/mutate、StateTrait 派生写回、Resource/Query 刷新结果）都必须在单一的状态事务中执行。事务应维护 `txnId / origin / pendingState / dirtyPaths` 等上下文，在事务作用域内允许多次写入 `pendingState`，但对外仅在事务提交时调用一次底层状态存储（例如 SubscriptionRef.set），并产生一条聚合的 `state:update` EffectOp 事件；`ModuleRuntime.changes(selector)` 对同一事务最多发出一次经 `Stream.changes` 去重后的值，用作 React / 外部订阅者的唯一可见快照。
- **FR-023**: 当某 Module 安装了 StateTraitProgram 时，每次 StateTransaction 提交前必须将 StateTraitProgram 视为 Reducer 之上的补充层：从事务内的 `pendingState` 出发，按照 StateTraitPlan 的步骤顺序与依赖关系执行 computed/link 等派生逻辑，直至在当前 Program 下达到状态不再变化的稳定点（fixpoint），然后再提交事务。StateTraitProgram 在事务内产生的每个步骤应对应独立的 EffectOp 事件（如 `computed:update` / `link:propagate`），与本次事务共享同一 `txnId`，但不得在内部再打开新的 StateTransaction 或触发额外的对外状态提交，以免放大订阅通知次数或破坏事务原子性。
- **FR-024**: 为与 Module.reducer / lifecycle / Middleware 等能力在生命周期维度对齐，StateTrait 必须显式呈现「蓝图 → setup → run」三段结构：蓝图层由 `StateTrait.build(stateSchema, spec)` 承担，仅依赖 `stateSchema + StateTraitSpec`；setup 层在 ModuleRuntime / BoundApi 构造阶段执行，只负责与 Env 无关的结构接线（例如为每个 `source` 字段在 `$.traits.source.refresh` 上注册刷新入口、在 ModuleTraitsRegistry / DebugSink 中登记 StateTraitProgram / Graph / Plan 节点），禁止调用 `$.onState` / `$.onAction` / Flow.run 等 run-only 能力；run 层在 Runtime 运行阶段执行，负责基于 StateTraitPlan fork watcher / Flow、通过 EffectOp/Middleware 跑 computed/link/source 等行为。实现上允许 `StateTrait.install` 对上述两段做封装，但必须保证 setup 与 run 在 Phase Guard 语义上可区分，且测试能够只跑到「蓝图 + setup」即验证 Trait 的结构完整性与接线正确性。

本版本中，StateTrait.source 的语义分层为：Trait 层只声明 `resourceId + key(state)` 以及结果写回规则；Plan 层通过 `StateTrait.build` 为每个 source 字段生成一次性 `source-refresh` 步骤；触发层则通过显式调用加载入口执行该计划，具体的缓存 / 重试 / 去抖等运行策略统一由 EffectOp/Middleware 与 Resource/Query 决定。

### Key Entities *(include if feature involves data)*

- **Module 图纸（state / actions / traits）**：模块作者在定义 Module 时可见的三大槽位，`state` 承载完整 State Schema（含 computed 字段），`actions` 承载意图/事件，`traits` 承载基于 StateTraitSpec 的字段能力声明，三者合在一起构成 Studio / 平台眼中的模块图纸。
- **StateTraitSpec / StateTraitEntry**：由 `StateTrait.from(StateSchema)({ ... })` 生成的 Trait 规格对象，描述“哪些字段具有什么 kind 的 Trait（computed / source / link）”及其配置，用作 StateTrait.build 的输入。
- **StateTraitProgram**：StateTrait 引擎从「State Schema + StateTraitSpec」中 build 出来的程序性结构，对外表现为 Program，对内包含 StateTraitGraph（结构 IR）与 StateTraitPlan（执行计划）；Runtime 通过 `StateTrait.install` 消费 Program，将字段能力编译为具体的 Flow / Effect 行为。
- **StateTraitGraph**：从 StateTraitProgram 中导出的图结构视图，描述模块内字段与 Trait 的节点和依赖关系，是 Devtools / Studio 用于绘制拓扑、做结构 diff 的核心实体。
- **StateTraitLifecycle（蓝图 / setup / run）**：StateTrait 从声明到运行的三段式生命周期：蓝图层以 `StateTrait.from` / `StateTrait.build` 为入口，构造 StateTraitSpec / Program / Graph / Plan；setup 层在 ModuleRuntime / BoundApi 构造阶段运行，只做结构 wiring（如 source 刷新入口注册、TraitPlanId / GraphNodeId 与 DebugSink/Devtools 的锚点注册），不依赖 Env 或 EffectOp；run 层则在 Runtime 运行阶段基于 Program/Plan 安装具体的 watcher / Flow / Middleware 行为，是 Trait 在 Effect 运行时中的展开形态。
- **EffectOp / Middleware / Observer/Runner/Guard**：Runtime 层统一的中间件抽象，所有边界上的一次逻辑执行以 `EffectOp` 表示，横切能力通过 `Middleware` 组合实现；Observer/Runner/Guard 是对 Middleware 行为的语义分型，分别承担“只观测 / 改怎么跑 / 决定能不能跑”的职责。
- **DebugTraitObserver 与 Debug 视图模型**：基于 EffectOp 的 Debug/Observability 中间件（例如记录 Action/Flow/State 事件）的集合，以及在 Devtools / Studio 中用来呈现时间线、事件详情与对应 StateTraitGraph 节点的视图模型，是旧 Debug 模块迁移后的统一承载体，也是 Devtools 面板中“Debug”标签页/区域背后的数据来源。
- **StateTraitResource 与 Resource / Query 命名空间**：StateTraitSpec 中 `StateTraitEntry` 的 `resource` 与 `key` 字段仅描述“这个字段对应哪种逻辑资源，以及如何从 State 计算访问该资源的 key”。资源访问逻辑通过 `Resource` 命名空间定义的 ResourceSpec 与 `Resource.layer([...])` 注册到 Runtime，内部封装 ResourceRegistryTag 与具体 Service Tag 实现；可选的查询引擎集成通过 `Query.layer(...)` 与 Query 相关 Middleware 将某些 resourceId 映射到带缓存/重试等策略的执行路径。StateTraitProgram 中只保留 resourceId 与 key 规则，供 Runtime / Middleware / Devtools 用来理解模块与外部资源的依赖关系与调用拓扑。
- **StateTransaction / StateTxnContext / StatePatch**：ModuleRuntime 内部用于管理一次完整状态演进的事务模型与上下文，负责为每次逻辑输入分配唯一的 `txnId`，在事务内维护 `pendingState` 与字段级 dirty 信息，并在提交时统一写入底层状态存储、产生聚合的 `state:update` EffectOp 事件；StateTraitProgram 与 Reducer/Middleware 的具体步骤只在事务内部修改 `pendingState` 并记录 Patch 列表，由 Devtools 基于 `txnId + Patch` 重建事务内的演进轨迹与可视化视图。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 至少有 2 个示例模块可以仅通过 `state + traits` 完成 computed / source / link 行为声明，新接手的开发者在不阅读 Runtime 实现的前提下，能在 30 分钟内根据 Module 图纸正确解释每个关键字段的来源与依赖关系。
- **SC-002**: 在集成示例中，修改某模块的字段能力（只改 `traits`）后，无需修改任何 Runtime 配置或 Logic glue code，即可完成行为更新，完整修改路径不超过 3 个文件，验证“图纸驱动 Runtime”的设计目标。
- **SC-003**: 使用 IDE 编辑典型模块时，StateTrait 相关的类型检查与路径提示在 1 秒内完成，无大规模 `any` 泄漏；对于 traits 中引用不存在字段的错误，编译期可以给出明确诊断信息。
- **SC-004**: Devtools 或诊断脚本可以在运行中的应用中正确导出至少 1 个模块的 StateTraitProgram 与 StateTraitGraph，并完成一次版本 diff（展示字段与依赖边的增删），为未来 Studio 视图与审查工具提供直接输入。
- **SC-005**: 在一个集成示例中，RuntimeConfig 中至少配置 2 类 Middleware（例如 Action 日志 Observer 与 Flow 重试 Runner），并可以通过修改配置在不同环境下切换策略，而不修改任何业务逻辑代码；同时 Debug 视图能基于 EffectOp 时间线清晰展示这些中间件的触发情况。
- **SC-006**: 在集成 Devtools 示例中，开发者可以在单一面板内完成“从某个字段/能力 → 找到对应 TraitGraph 节点 → 查看近期相关 EffectOp 事件 → 查看哪些中间件参与”的完整调试流程，全程不需要切换到旧 Debug 工具或阅读 Runtime 实现代码。
- **SC-007**: 在 Devtools 集成示例中，开发者可以从某个 StateTraitGraph 节点（例如某个 computed 或 source 字段）一键跳转到其在 Module 图纸中的 traits 定义位置，同时在 Debug/Timeline 视图中看到由该 Trait 展开的 watcher/Flow/EffectOp 链接，从而确认 Trait 的展开行为是可视、可追踪的，而非黑盒“魔法”。
- **SC-008**: 在包含约 50–80 个 Module 的集成示例应用中，从 `state + traits` 构建 StateTraitProgram 并完成首个 Runtime 装配（包括 StateTrait.build 与 StateTrait.install）在典型开发环境硬件上测量的总耗时不超过 500ms，单个 Module 的 build + install 耗时不超过 50ms。
