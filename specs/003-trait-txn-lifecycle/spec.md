# Feature Specification: StateTrait 状态事务与生命周期分层

**Feature Branch**: `003-trait-txn-lifecycle`  
**Created**: 2025-12-11  
**Status**: Draft  
**Input**: User description: "StateTrait 状态事务与 Trait 蓝图/setup/run 生命周期分层"

## Clarifications

### Session 2025-12-11

- Q: React 渲染事件（`kind = "react-render"`）与 StateTransaction 的 `txnId` 应如何绑定？ → A: 以 Runtime 显式事务上下文为主，在正常事务执行路径下通过 Runtime 上下文自动填充 txnId；当某个渲染事件发生在无事务上下文的场景时，由 Devtools 端以“最近一次 `state:update` 事件的 txnId”作为兜底，或将其标记为未绑定事务的渲染事件。
- Q: 当 Trait 在 run 段执行过程中试图开启新的 StateTransaction（例如内部再次调用 `beginTransaction` 或通过 dispatch 触发新事务）时，Runtime 应如何处理？ → A: 在已有事务上下文中一律复用当前 StateTransaction，不创建新的事务；在开发环境下额外发出结构化 Debug/diagnostic 事件记录“nested transaction attempt from Trait”，在生产环境中则静默复用当前事务，保证“单入口 = 单事务”的语义不被破坏。
- Q: Devtools 触发的时间旅行操作（`applyTransactionSnapshot`）是否必须记录为 StateTransaction？ → A: 是，时间旅行操作本身必须作为 origin.kind = "devtools" 的 StateTransaction 被记录下来，即便不对外触发新的订阅通知，也要在事务时间线中保留完整的 time-travel 轨迹，便于后续审计与回放。
- Q: 当一次 StateTransaction 在内部发生错误最终不提交时，订阅接口（state:update / onStoreChange）是否还应发出通知？ → A: 否，若事务最终判定为不提交（草稿状态被丢弃或回滚），则不得发出任何新的 state:update 事件或订阅通知，对订阅方而言这次事务在状态层面“未发生”；错误信息应通过 Debug/诊断事件暴露给 Devtools 或日志，而不是通过一次“空更新”让视图层猜测发生了什么。
- Q: 是否需要为“只读订阅 / 中间状态观察”设计独立的状态订阅通道？ → A: 否，状态订阅接口统一以 StateTransaction.commit 为粒度传播最终状态变化，任何只读或中间状态的观测诉求一律通过 RuntimeDebugEvent 流与 Devtools 视图解决，而不在状态订阅层再开第二套 API，避免语义双轨与实现复杂度升级。
- Q: StateTransaction 的观测策略（Instrumentation Policy）应在哪一层配置，是否允许按实例覆写？ → A: 在 Runtime.make 上提供全局默认策略，并允许在 Module.make 上为特定模块做覆写，不支持 per-instance 级别的观测策略配置，避免产生组合爆炸与调试困难。
- Q: Devtools 顶部的时间轴总览条（overview strip）是否是所有 Devtools 会话的固定部分？观测粒度切换是否需要反向作用到 Runtime 以减少 dev 环境下的开销？ → A: 是，只要渲染 Devtools 主面板就始终包含 overview strip；观测模式切换（如 `"basic"` / `"deep"`）不仅影响 UI 展示维度，还应通过 Debug/Devtools 配置反馈给 Runtime/Debug 层，尽可能在 dev 环境下关闭当前模式不需要的事件类别或统计逻辑，在不改变事务语义的前提下降低运行时损耗。
- Q: 在 Devtools 的 `"basic"` 模式下，哪些能力必须被关闭，哪些事件应仍然保留？ → A: `"basic"` 模式下必须关闭 Trait 细节事件（trait-\*）与时间旅行 UI，只展示 action/state/service 级事件和粗粒度的 `react-render` 事件，以降低调试噪音与运行时开销，但仍保留足够的信息用于粗粒度分析“一次事务触发了多少渲染”这一类性能问题。
- Q: Devtools 顶部时间轴总览条使用怎样的时间 bucket 粒度策略？ → A: 使用固定的基础粒度（例如 100ms）作为最小单位，由 overview strip 根据当前可见时间范围与像素宽度自适应选择实际 bucket 大小（例如 100ms / 500ms / 1s / 5s），力求“1 像素 ≈ 1 bucket”，在不同时间跨度下兼顾可读性与渲染性能。
- Q: 性能预警的阈值应如何配置？overview 是否需要根据阈值自动变色？ → A: Devtools 内部应提供一组合理的默认阈值（如每事务事件数 / 渲染次数 / 耗时上限），并允许通过 Devtools 配置在项目级全局覆写，不支持 per-module 级别配置；overview strip 应根据这些阈值对不同区间进行红黄绿等颜色区分，若 `recharts` 无法对单条 line/area 做细粒度变色，可通过分段 series 或背景区域划分（bands）来表达“安全 / 警告 / 高危”区间。
- Q: 在 Runtime 观测策略为 `"light"` 且 Devtools 处于 `"basic"` 模式时，`react-render` 事件是否仍然采集？ → A: 在 `"light"` + `"basic"` 组合下，不完全关闭 `react-render` 事件，而是对其做采样或限频（例如只记录首个渲染和周期性统计点），以便在最轻观测模式下仍保留对渲染频率的基本感知；仅在 `"full"` 或 `"deep"` 模式下才全量记录 `react-render` 事件。

### Session 2025-12-12

- Q: Devtools 中针对“一次按钮点击后发生的这批事件/渲染”的即时反馈汇总，应以什么形态呈现？ → A: 采用固定 info bar 形态，放置在事务时间线或事件列表上方，展示“本次操作在最近一段时间窗口内的事件/渲染汇总”，默认不自动消失，由下一次操作覆盖或由用户显式关闭。
- Q: Task Runner 在 Bound/Flow 层的 API 表面应如何设计以降低心智？ → A: 提供 `runTask` / `runLatestTask` / `runExhaustTask` / `runParallelTask` 四个对应方法，与现有 `run` / `runLatest` / `runExhaust` / `runParallel` 的触发并发语义一一镜像，不引入新的并发模式心智。
- Q: Task Runner 系列 API 应放置在哪个用户侧入口？ → A: 放在 IntentBuilder 上，即 `$.onAction/$.onState/$.on(...)` 返回的 Builder 同级新增 `runTask/runLatestTask/runExhaustTask/runParallelTask`，以保持 DSL 一致性。
- Q: runLatestTask 的取消/写回语义应如何定义？ → A: 与现有 runLatest 的 `switch` 语义一致：新触发到来时尽量 `interrupt` 旧 task Fiber，并用内部 `taskId` guard 兜底，保证旧 task 永不进入 `success/failure` 写回事务。
- Q: Task Runner 的 pending 步骤应与事务边界如何对齐？ → A: pending 永远是 Task Runner 自己开启的第 1 笔独立事务（排队进入 txnQueue），不尝试并入触发它的那笔事务，以保持入口/事务模型的一致性。
- Q: pending 的触发时机是否与 run\* 并发策略对齐？ → A: 是，pending 只对“被接受并实际启动的 task”执行：runExhaustTask 忽略的触发不产生 pending 事务；runTask/runLatestTask/runParallelTask 每次接受触发都产生 pending。
- Q: `Runtime.make(..., { devtools: true })` 一键启用 Devtools 时，对 Debug sinks 的组合策略是什么？ → A: 追加 Devtools Hub Sink，保留调用方已有 Debug sinks（不做替换）。
- Q: `Runtime.make(..., { devtools: true })` 是否受 `isDevEnv()` 自动裁剪限制？ → A: 不受限制；只要调用方显式传入 devtools 选项就始终启用 Devtools（含 Hub Sink 与 DebugObserver），是否在生产环境启用由业务自行判断，用户文档需明确提示开销与风险。
- Q: 当 `devtools` 显式启用时，React 侧是否仍应受 `isDevEnv()` 限制采集 `trace:react-render`？ → A: 不应受限制；`devtools` 启用时 React 侧也必须始终采集 `trace:react-render`（仍受采样/阈值等配置约束），以保证事务与渲染观测在所有环境下一致可用。
- Q: `DevtoolsRuntimeOptions` 应包含哪些配置、与 DevtoolsSettings 的职责如何划分？ → A: `DevtoolsRuntimeOptions` 仅承载启动/桥接级配置（如 Hub 缓冲区大小、DebugObserver/filter、`react-render` 采样或限频、未来的 replaceSinks 等）；UI 展示、模式与阈值等配置继续以 DevtoolsSettings + `localStorage` 为唯一事实源。
- Q: Devtools Hub 的作用域应为全局还是按 Runtime 分离？ → A: Hub 为进程/页面级全局单例，收集所有 Runtime 的 Debug 事件，并按 runtimeLabel/instanceId 分组供 Devtools UI 选择与展示。

## User Scenarios & Testing _(mandatory)_

本特性聚焦三类角色：Runtime 维护者 / 平台开发者、Devtools / Studio 维护者、模块作者。目标是在不改变现有 Module 图纸（state / actions / traits）形态的前提下，为 Trait 与状态更新补上一条清晰的「事务 + 生命周期」主线。

### User Story 1 - Runtime 维护者按事务推理状态变化 (Priority: P1)

作为 Runtime / 平台维护者，我希望每一次逻辑入口（例如一次派发动作、一次显式触发的远程刷新、一次来自外部服务的回写）都被视为一条独立的「状态事务」：

- 在这次事务内部可以有多步 Reducer、Trait 派生和中间件逻辑；
- 但最终只会有一次对外可见的状态提交和一次对订阅者的通知；  
  这样我在分析性能问题或行为异常时，可以以事务为单位追踪「从初始状态到最终状态」的完整演进，而不被中间的实现细节噪音干扰。

**Why this priority**: 没有统一的状态事务语义，Trait 越多、逻辑越复杂，状态更新轨迹越难推理，也越难保证不会出现「一次用户交互引出多次意外更新」；这是后续所有 Trait 能力继续演进的基础。

**Independent Test**: 在一个包含多条 Trait（computed / link / source）的示例模块中：

- 通过一次用户交互触发一次动作；
- 观察 Runtime 事件与状态变化：应只产生一条聚合的状态提交事件，对订阅者只通知一次最终状态；
- Devtools 中内部步骤仍然可见，但都挂在同一个事务 ID 下。

**Acceptance Scenarios**:

1. **Given** 模块初始状态已加载且 TraitProgram 已安装，**When** 通过任意入口触发一次状态变更（例如派发某个动作），**Then** Runtime 只对底层状态存储执行一次提交，并且订阅者（视图层或外部监听器）仅收到一条与该事务对应的状态更新通知。
2. **Given** 某次事务内部包含多条 Trait 派生和中间件逻辑，**When** 在 Devtools 中查看该事务，**Then** 可以在一个连续的事务视图中看到所有内部步骤及其导致的字段变化，而不需要在多条无关联事件之间来回跳转。

---

### User Story 2 - Devtools 以「蓝图 / setup / run」三段视角调试 Trait (Priority: P2)

作为 Devtools / Studio 维护者，我希望在同一个工具中可以从三个层面理解 Trait 行为：

- 蓝图层：看到某模块在图纸中为哪些字段声明了哪些 Trait（computed / link / source 等）；
- setup 层：看到这些 Trait 在某个 Runtime 中是否已经正确挂接到结构入口（例如 source 刷新入口、调试锚点）；
- run 层：看到在具体事务中这些 Trait 实际执行了哪些步骤、如何影响状态；  
  这样当某个字段行为异常时，我可以快速判断问题出在蓝图声明、setup 接线，还是运行时执行。

**Why this priority**: 目前 Trait 更多是「一坨运行时代码」，调试时只能看到结果，很难区分是声明错误、结构没接上，还是运行时出错；对 Studio / Alignment Lab 也不友好。

**Independent Test**: 在一个带有多条 Trait 的示例模块上：

- 仅加载蓝图与 setup，即可在 Devtools 中看到 TraitGraph 和接线状态；
- 启动运行后，通过一次事务可以看到 Trait 在 run 段的展开轨迹，并且每个步骤都能跳回对应的蓝图定义。

**Acceptance Scenarios**:

1. **Given** 某模块已定义 traits 并成功构建 StateTraitProgram，**When** Devtools 只加载该模块的蓝图和 setup 信息，**Then** 可以在「结构视图」中看到每个字段的 Trait 配置和资源绑定状态，而无需启动真实 Env 或远程服务。
2. **Given** Runtime 已运行且 Devtools 接入了事务事件流，**When** 用户在 Devtools 中选中某个 Trait 节点，**Then** 可以看到最近若干事务中与该 Trait 相关的执行步骤及其对状态的影响。

---

### User Story 3 - 模块作者在大量 Trait 下仍能信任「一次交互 = 有界更新」(Priority: P3)

作为模块作者，当我在图纸中为 State 声明越来越多的 Trait（computed / link / source 组合）时，我希望仍然可以相信：

- 一次用户交互或一次业务事件，只会引出有限次状态提交和视图更新；
- 即使 Trait 非常多，调试时仍然可以通过 Devtools 清晰看到这些 Trait 在每次事务中的执行顺序和结果；  
  而不需要担心随着 Trait 增长，状态更新和渲染会呈指数级放大。

**Why this priority**: Trait 的目标是让「在图纸中声明能力」成为主路径，如果在规模上升后行为不可控或者很难诊断，模块作者就会退回到手写逻辑和自定义状态机。

**Independent Test**: 构造一个包含大量 Trait 的示例模块：

- 在典型硬件和配置下，通过一次用户交互触发事务；
- 验证事务内的内部步骤可以在 Devtools 中完整呈现，同时对外状态提交次数和视图更新次数保持在预期上限内。

**Acceptance Scenarios**:

1. **Given** 某模块包含大量 Trait，**When** 在视图层通过一次点击触发动作，**Then** 实际状态提交次数和视图更新次数均保持在规范约定的上限内，而不会因为 Trait 数量增加而成倍放大。
2. **Given** 同一模块在不同环境（开发 / 测试 / 预发）下运行，**When** 开发者打开 Devtools 查看 Trait 行为，**Then** 都可以按事务维度稳定地还原 Trait 在该环境下的执行轨迹，不受具体 Env 配置差异影响。

---

### User Story 4 - Devtools 支持事务级时间旅行调试 (Priority: P3)

作为 Devtools / 平台维护者，我希望在调试 Trait 行为时，能够在 Devtools 中选中某一次事务，并将当前模块实例的状态**临时回放**到该事务发生前或发生后的状态：

- 不需要重新触发外部服务调用或重复执行副作用；
- 仅通过写入状态快照和必要的纯 Trait 派生来还原视图；  
  这样我可以在本地快速重现实例问题、对比某个字段在事务前后的差异，而不需要手动重复用户操作。

**Why this priority**: Trait 引入后，单次事务内部包含更多隐式步骤，单纯看时间线不一定足够；时间旅行可以帮开发者快速定位“问题到底出在哪个事务、哪个 Trait 步骤”。

**Independent Test**: 在包含 Trait 的示例模块中：

- 触发若干次交互产生一串事务；
- 在 Devtools 中选中其中一次事务，分别执行「回到事务前状态」和「回到事务后状态」；
- 验证模块实例的状态与 UI 展示与当时的状态一致，且不会重新打出外部请求或重复执行副作用。

**Acceptance Scenarios**:

1. **Given** Devtools 已记录某实例最近的事务序列，**When** 开发者在 Devtools 中选中一个事务并点击「回到事务前状态」，**Then** 模块实例的状态与该事务开始时一致，视图显示与回放前一致，且不会重新触发任何外部服务调用或产生新的业务副作用（时间旅行本身可以作为 devtools 类型的事务被记录）。
2. **Given** 同一事务下，**When** 开发者点击「回到事务后状态」，**Then** 模块实例的状态与该事务提交后的最终状态一致，Devtools 可以在 TraitGraph 和时间线视图中稳定展示该状态下的字段与事件关联关系。

### Edge Cases

- 当同一模块短时间内被多个来源同时触发（例如用户快速点击、后台定时任务和外部服务回写交织）时，系统如何保证每个逻辑入口对应的状态事务彼此隔离、串行提交，并保持最终状态与逻辑入口顺序一致？
- 当某个 Trait 在 run 阶段执行过程中发生错误（例如派生逻辑抛出异常），系统如何避免事务处于「部分更新」的中间状态，并为 Devtools 提供清晰的错误定位信息？
- 当只加载蓝图和 setup（不启动完整 Runtime 与外部服务）时，系统如何保证 Trait 结构检查可以独立运行，并在结构不合法或接线缺失时给出明确提示，而不是在 run 阶段才暴露问题？

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统必须为每个模块引入显式的状态事务模型：任何一次可能修改模块状态的逻辑入口（例如动作派发、显式触发的资源刷新、来自外部服务的状态回写）都必须在单一状态事务中执行，并为该事务分配唯一标识、记录发起来源、起始状态和字段级变更信息。
- **FR-002**: 在单个状态事务内部，系统必须允许多次对「事务内草稿状态」进行修改，但对外只能在事务提交时进行一次实际状态写入，并向所有订阅者发出一次聚合的状态更新通知；订阅接口必须以事务提交为粒度传播状态变化，而不是以内部步骤为粒度。对于同一 `moduleId + instanceId` 组合，多次逻辑入口对应的 StateTransaction 在不跨真实 IO 的前提下必须按 FIFO 顺序串行执行：任意时刻最多只有一个活跃事务，新事务须在前一事务 commit 或 rollback 后才可开始；不同实例的事务可以并行执行。
  - 若某次事务在内部发生错误并判定为不提交（例如 Trait 派生或 Middleware 抛出不可恢复错误），Runtime 必须丢弃或回滚事务内草稿状态，并且不得发出任何新的 state:update 事件或订阅通知；该事务的失败原因应通过 Debug/诊断事件暴露给 Devtools 与日志，对订阅方而言此次事务在状态层面视为“未发生”。
  - 本规范不为“中间状态”或“只读诊断”提供第二套状态订阅通道：任何希望观察事务内部步骤或中间状态的需求，必须通过 RuntimeDebugEvent 流与 Devtools 提供的时间线视图来满足，而非绕过 StateTransaction.commit 粒度在状态层面开洞。
  - 即便在高频交互场景（例如拖拽过程中实时更新位置），模块状态更新仍必须通过 StateTransaction 执行；此类场景应优先采用「单步事务 + 轻量 Instrumentation（如 `"light"` 模式）+ 视图层节流/合并」等方式控制开销，而不是为该模块或 Runtime 引入非事务直写路径。
- **FR-003**: 当模块声明了 Trait 后，系统必须将 Trait 执行视为处于 Reducer 之上的补充层：在每次状态事务提交前，Runtime 必须按照 Trait 计划（Plan）的顺序与依赖关系，对事务内草稿状态执行 Trait 派生，并保证在该 TraitProgram 下达到稳定点后才允许提交；Trait 的每个步骤应记录为独立的内部事件，供调试与回放使用，但不得在 Trait 内部开启新的状态事务或触发额外的对外提交。
  - 若 Trait 在 run 段执行过程中尝试调用 `beginTransaction` 或通过其他入口开启新的 StateTransaction，Runtime 必须检测到当前已存在事务上下文并一律复用该上下文，不创建新的 StateTransaction；在开发环境下需要发出结构化诊断事件以标记“Trait 内部存在嵌套事务尝试”，在生产环境下则静默复用当前事务，确保“单入口 = 单事务”的语义不被破坏。
- **FR-004**: StateTrait 必须显式支持「蓝图 → setup → run」三段生命周期：
  - 蓝图层：由 Trait DSL 和 StateTrait.build 负责，只依赖状态结构与 Trait 声明，产生 StateTraitProgram / Graph / Plan 等结构化描述；
  - setup 层：在 ModuleRuntime / BoundApi 构造阶段执行，只负责与环境无关的结构接线（例如为每个 source 字段注册刷新入口、为 Devtools / Debug 记录 TraitPlanId 与 Graph 节点锚点），禁止调用任何 run-only 能力；
  - run 层：在 Runtime 运行阶段执行，基于 Program / Plan 安装具体的监视与行为逻辑（例如监听状态变化并在事务内更新派生字段、发起远程调用），并通过事务模型对外暴露一致的状态变化视图。
- **FR-005**: 系统必须为 Devtools / Studio 提供基于上述生命周期和事务模型的统一观测接口：
  - 能够在不启动完整运行环境的前提下获取蓝图与 setup 信息，用于绘制 TraitGraph、展示字段能力分布、执行结构性校验；
  - 在运行时能够按事务维度拉取 Trait 执行轨迹，包括每个内部步骤的字段变更和关联的生命周期阶段；
  - 出现错误时，可以明确标记问题出现在蓝图声明、setup 接线还是 run 阶段执行。
- **FR-006**: Devtools 面板在 UI 结构上必须以「Module → Instance → Transaction」三层父子关系组织左侧导航：
- Module 节点代表逻辑模块蓝图（ModuleTag），展示模块名与实例数量；
  - Instance 节点代表某个模块在特定 Runtime 环境中的具体实例，展示实例标签与 Trait setup 状态；
  - Transaction 节点代表一次状态事务（StateTransaction），展示 origin 类型、时间与简要描述。  
    左侧导航的任意一个选中项都必须可用于驱动中部视图的过滤与高亮。
- **FR-007**: Devtools 面板在选中不同层级节点时，中部主视图必须展现对应层级的语义：
  - 选中 Module：中部展示该模块的 TraitGraph（蓝图视图），以及可选的实例汇总信息；
  - 选中 Instance：在相同 TraitGraph 上叠加 setup 状态（已接线 / 未接线 / 错误），并展示该实例下最近若干事务列表；
  - 选中 Transaction：展示该事务内按时间排序的事件时间线（EffectOp 流）和字段 Patch 列表，并在 TraitGraph 上高亮本事务涉及的节点。
  - 当某一层级没有可用数据时（例如当前没有任何模块、某 Module 暂无实例、某 Instance 尚未产生事务），中部区域 MUST 展示明确的空状态文案与简要指引，而不是出现完全空白的面板：例如提示“当前无事务记录，请在页面上触发一次交互”或“未检测到已注册的模块，请确认 Runtime 已启用 Debug/Devtools Layer”；
  - 当 Runtime 未正确接入 Debug 流或 Devtools 暂时无法订阅到事件时，面板 SHOULD 显示统一的“断连状态”提示（例如“未连接到 Runtime 调试流”），并在必要时给出简单排查建议，而不是悄悄地什么都不显示。
- **FR-008**: Devtools 在 TraitGraph 视图中必须支持“以 Trait 节点为入口”的调试：
  - 用户点击某个 Trait 节点（例如某个 computed / link / source 字段）时，详情区域必须展示该节点的蓝图信息（依赖字段、配置摘要等）以及在当前 Instance 中的 lifecycle 状态（蓝图存在 / setup 状态 / 是否有运行事件）；
  - 时间线视图必须自动过滤或高亮最近若干与该 Trait 相关的事务和事件，方便从结构跳到行为。
- **FR-009**: Devtools 必须提供至少一个以事务为中心的细节视图，使开发者可以从一次事务内部看到：
  - 起点：origin（动作类型 / source 刷新 / 服务回调等）及其时间戳；
  - 中间：按顺序展示 Reducer / Trait / Middleware 步骤及其生成的 StatePatch（字段路径与原因）；
  - 终点：最终状态提交事件（state:update）以及与之关联的 Patch 汇总。  
    该视图应明确标注事务 ID，并支持从任一步骤跳回 TraitGraph 中对应的 Trait 节点（如有）。
  - 当某个事务内部包含 N 个事件 / 步骤时，该视图必须支持将其中任意一个步骤标记为当前「时间线游标」：
    - 例如当时间线已有 10 个事件时，选中第 5 个事件后，E1–E4 以“已执行”状态渲染，E5 高亮为“当前”，E6–E10 以“未来步骤”样式渲染（弱化或虚线）；
    - 视图顶部应展示类似 `Step 5/10` 的提示，帮助开发者在长时间线中快速定位当前调试位置；
    - 该游标本身是 Devtools 的视图状态，不改变底层事务记录，但可以与时间旅行能力结合，用于将实例状态回放到“执行到第 k 步之后”的状态（具体实现可以基于快照 + Patch 或更细粒度的回放接口）。
- **FR-010**: Runtime 必须为 Devtools 提供事务级时间旅行的状态回放能力：
  - 至少提供一个接口，允许基于 `moduleId + instanceId + txnId + mode("before" | "after")` 将指定模块实例的状态回放到某个事务前或后的状态；
  - 时间旅行操作本身不得重新触发外部服务调用或重复执行业务副作用，只允许通过写入状态快照和执行必要的纯 Trait 派生逻辑来还原状态；
  - 时间旅行仅在开发 / 测试环境可用，必须通过运行时配置或 Devtools 通道显式启用；每次时间旅行操作本身必须记录为一个 StateTransaction（origin.kind = "devtools"），以便在 Devtools 事务时间线中审计与回放。
- **FR-011**: Devtools 面板在 UI 上必须提供时间旅行入口：
  - 在选中某个 Instance + Transaction 的前提下，用户可以通过「回到事务前状态」和「回到事务后状态」两类操作按钮触发对该实例的时间旅行；
  - 面板需要在显著位置标记当前实例处于“时间旅行状态”（例如显示当前基于哪个 txnId / mode），并提供“返回当前最新状态”的操作；
  - 时间旅行操作可以记录为一种特殊类型的事务（例如 origin.kind = "devtools"），以便后续审查与调试。
- **FR-012**: 为方便后续扩展录制/回放能力，Devtools 与 Runtime 间的事务与 Trait 数据契约（StateTransaction / StatePatch / TraitRuntimeEventRef / TraitGraph 等）在设计上必须保持向前兼容：
  - 允许在现有字段上增加快照、Patch 分组、录制 sessionId 等信息，而不破坏现有字段含义；
  - 当前实现可以按需要填充这些扩展字段，但规范层必须为它们明确语义，使后续能力可以在不破坏 Trait 主线的前提下平滑接入。
- **FR-013**: 为了让 Trait + 事务下的 UI 行为可回放、可对比，系统必须对 Devtools 消费的 Debug 事件做一次统一标准化，并显式纳入「组件渲染事件」：
  - Runtime 必须为 Devtools 提供一个归一化的 RuntimeDebugEvent 视图（对应数据模型中的 `TraitRuntimeEventRef`），将现有的 `action:dispatch`、`state:update`、service 调用、Trait 派生步骤等事件统一映射为带 `eventId / moduleId / instanceId / txnId? / timestamp / kind / label / meta` 的结构；
  - 在 React 集成层（`@logixjs/react`）必须新增一类 `kind = "react-render"` 的视图事件，用于记录组件渲染：至少包含组件标识（componentLabel）、关联的 Module / Instance 信息、关键 selector 或字段路径、是否处于 StrictMode 双调用阶段、以及若由某次 StateTransaction 提交触发时的 `txnId`；`txnId` 的赋值策略以 Runtime 显式事务上下文为主，在正常事务执行路径下通过上下文自动填充，当渲染发生在无事务上下文场景时由 Devtools 端以最近一次 `state:update` 事件的 `txnId` 作为兜底（若无法合理推断则可标记为未绑定事务的渲染事件）；
  - Devtools 的时间线视图必须支持把这些 `react-render` 事件与同一事务下的 Trait / state 事件一起展示和过滤，使开发者可以直接看到“一次事务导致了哪些组件渲染”，并可按事件类别（action / trait / state / view-render / devtools 等）开启或关闭显示。
- **FR-014**: 为方便业务开发者快速从“时间轴”角度理解系统行为，Devtools 除了事务视图外，还应提供一个以全局时间线为主体的第二视图（Origin-first Timeline View）：
  - 该视图以跨模块的“逻辑入口 / 业务事件 / Devtools 操作”（origin）为主轴按时间顺序展示，例如 `click: save`、`service: profileLoaded`、`devtools: timeTravel to Txn#42 AFTER` 等；
  - 选中某个 origin 事件时，右侧或下方应展开该事件下涉及的所有 StateTransaction 分组（按 moduleId + instanceId 划分），并允许进一步展开某个事务内部的事件时间线与 Patch 列表；
- time-travel 和状态回放的触发仍然落在具体 ModuleRuntime 实例的具体事务或步骤上：业务开发者可以从 origin-first 视图切入，在右侧选择某个事务（或未来的某个 Step k），再触发事务级或步级时间旅行；
  - 在该视图下，默认选中某个事件或事务时只改变 Devtools 高亮与过滤以及右侧展示的“当时逻辑状态”（基于快照 + Patch 在 Devtools 内部重建的虚拟状态），实际 Runtime/React 组件状态仅在用户显式点击 time-travel 按钮时才会回放到对应事务或步骤，避免误触导致运行态串台；
  - 事务视图与 Origin-first Timeline View 的切换 MUST 收敛为顶部 header 中的一组视图切换控件（例如两个标签或 Segmented 控件），与主题切换按钮处于同一行并大致居中显示，避免在侧边散落多个入口；视图切换本身不需要持久化到 `localStorage`，每次打开 Devtools 默认回到事务视图即可。
- **FR-015**: Runtime 必须支持通过统一的配置控制 StateTransaction 的观测强度（Instrumentation Policy），以便在不同环境或模块下权衡“调试可见度”与“运行时开销”：
  - 至少提供 `"full"` 与 `"light"` 两个级别：`"full"` 模式下记录 Patch、可选快照与完整 RuntimeDebugEvent；`"light"` 模式下仍保持“单入口 = 单事务 = 单次订阅通知”的语义，但允许关闭 Patch/快照构建并只保留少数事件种类（例如 action/state），不影响模块功能行为；
  - 观测策略应在 Runtime 或 Module 级通过显式配置设置，而不是散落在业务逻辑中的布尔开关：
    - Runtime 级：`Logix.Runtime.make(root, { stateTransaction?: { instrumentation?: "full" | "light" } })` MUST 作为应用级默认入口，用于为整颗 Runtime 指定缺省观测级别（`root` 可为 program module 或其 `.impl`）；
    - Module 级：`ModuleDef.implement({ initial, logics?, imports?, processes?, stateTransaction?: { instrumentation?: "full" | "light" } })` MUST 允许为单个 ModuleImpl 覆写观测级别，用于少数高频/性能敏感模块（如拖拽）声明 `"light"`；
    - 优先级：当同时存在多层配置时，ModuleImpl 级配置 MUST 覆盖 Runtime.make 级配置，两者都未提供时才回退到 `getDefaultStateTxnInstrumentation()` 基于 `NODE_ENV` 推导的默认值。
  - React 集成层（`RuntimeProvider`）只允许透传该策略，不得自行更改事务语义：
    - 当 `RuntimeProvider` 直接接收 `runtime={ManagedRuntime}` 时，事务观测级别完全由构造该 Runtime 时的 `Logix.Runtime.make` 配置决定，Provider 不得在 React 层改写；
    - 当使用 `RuntimeProvider layer={...}` 在 React 侧追加局部 Layer 时，Layer 内可以提供与观测相关的 Service（例如 DebugSink、Logger），但不得通过额外的“隐藏开关”改变 StateTransaction 是否存在或其粒度，仅可在既有 `"full"` / `"light"` 策略基础上调整记录的事件消费方式。
  - 无论处于何种策略，StateTransaction 对外的语义（原子提交、订阅粒度、Devtools 可见的事务边界）必须保持一致，Instrumentation 只允许调整“记录多少细节”，不得引入第二套事务模型。
- **FR-016**: Devtools 必须提供性能观测与预警的基础能力，帮助模块作者在不离开调试上下文的情况下判断是否需要启用手动优化：
  - Devtools 至少提供一个观测粒度开关（例如 `"basic"` 与 `"deep"` 模式），用于控制时间线中是否展示 Trait 级事件、`react-render` 事件、时间旅行控制等；`"basic"` 模式可以只展示 action/state/service 级事件，`"deep"` 模式则展开所有细节；
  - Devtools 必须基于 RuntimeDebugEvent 与 StateTransaction 派生一组轻量级性能指标（例如：每事务事件数、每事务渲染次数、事务耗时的简单分布），并在指标超过预设软阈值（例如 SC-001 所定义的性能目标）时以非侵入方式给出可见提示（如标记某事务为“高噪音”或在模块摘要中显示 warning）；
    - Devtools 顶部应提供一个“时间轴总览条”（overview strip），以**窄柱状图（bar）承载每个时间 bucket 内的事务数量（txnCount）**，并在同一坐标系中叠加一条折线或半透明面积来表示每个 bucket 的渲染次数（renderCount），形成“事务密度 + 渲染密度”的复合视图；overview strip 只需聚焦这两类关键指标，不再额外叠加 trait-\* 事件计数等次要维度，避免信息过载；overview strip 必须支持用户拖拽/框选一段时间区间，自动将下方的事务列表与事件时间线过滤到该区间，交互体验参考 Chrome DevTools Network 面板；
  - 性能指标与预警计算仅在 dev/test 环境或显式启用 Devtools 时进行，不得在生产环境引入额外的 Debug 事件转换或统计开销；在 `isDevEnv() = false` 且未挂接 Devtools 时，Instrumentation Policy 可以退化为最轻模式。
  - 为提升“单次操作”的即时反馈能力，Devtools 应基于 RuntimeDebugEvent 流维护一个短时间窗口（例如默认 1000ms，可配置），在检测到某个逻辑入口（如一次 `action:dispatch` 或 Devtools 操作）后开始收集该窗口内发生的所有相关事件（action/state/service/`react-render` 等）：
    - 若在窗口内持续有新事件到达，则相应延长窗口（重置计时），直到某段时间内不再出现新事件；
    - 窗口结束时，将本次收集到的事件归并为一条“本次操作摘要”，在时间线或事务列表上方以固定 info bar 的形式展示（例如“本次操作：3 actions / 5 state:update / 4 react-render / 用时 842ms”），该 info bar 默认为当前会话可见，由下一次操作覆盖或由用户手动关闭，不采用自动淡出；
    - 摘要的计算逻辑与展示位置由 Devtools 自身实现负责，但必须基于 RuntimeDebugEvent / StateTransaction 提供的结构化信息完成，不额外引入第二套事件管线。
- **FR-017**: Devtools 所有影响 Runtime 开销的观测开关（例如 `"basic"` / `"deep"` 模式、是否展示 Trait 级事件、是否开启时间旅行控件、overview strip 中的额外维度、**事件窗口大小 eventBufferSize** 等）必须集中收敛到一个「设置面板」中，并持久化到浏览器 `localStorage`：
  - 设置入口应位于 Devtools 顶部 header 的显著位置（例如右上角的「Settings」图标），点击后弹出或展开统一的设置面板，类似 Chrome DevTools 的设置体验；
  - 面板中的每一项设置（尤其是会影响 Debug/Runtime 开销的观测级别与开关，包括事件窗口大小 `eventBufferSize`）MUST 在变更时立即更新 DevtoolsState，并同步写入 `localStorage`，使得同一浏览器下后续打开 Devtools 时可以自动恢复上一次会话的观测配置；
  - `eventBufferSize` 应提供合理的默认值（例如 500）与推荐范围（例如 200–2000），超出范围时 MUST 在设置层做裁剪或提示，而不是让底层 DebugSink 处于不确定状态；
  - 当运行环境无法使用 `localStorage`（例如 SSR 或受限环境）时，Devtools MUST 优雅降级为仅使用内存态配置，但不得因为持久化失败而影响当前会话的观测行为；
  - 后续新增的观测/调试相关开关若需要跨会话生效， SHOULD 统一接入该设置面板与持久化机制，而不是各组件自行定义零散的 `localStorage` key，确保配置来源单一且可审计。

- **FR-018**: Runtime 必须提供一键启用 Devtools 的入口：`Logix.Runtime.make(root, { devtools: true | DevtoolsRuntimeOptions })`（`root` 可为 program module 或其 `.impl`）。devtools 为显式 override：只要调用方传入该选项就必须生效，不受 `isDevEnv()` 的自动推导/裁剪影响；是否在生产环境启用由业务项目自行判断，用户文档需明确提示对应开销与风险。当 devtools 启用时：
  - Runtime MUST 自动在 EffectOp MiddlewareStack 上追加 DebugObserver（产出 `trace:effectop`）；
  - MUST 自动把 Devtools Hub Sink **追加**到 Debug sinks 中（不替换调用方已有 sinks）；
  - Devtools Hub Sink 对应的 Hub 必须是进程/页面级全局单例，收集所有 Runtime 的 Debug 事件，并按 runtimeLabel/instanceId 分组供 Devtools UI 选择与展示；
  - React 集成层在检测到 devtools 启用时，也 MUST 无视 `isDevEnv()` 采集 `trace:react-render`（仍受采样/阈值配置约束）。
  - `DevtoolsRuntimeOptions` 仅承载启动/桥接级配置（Hub 缓冲区大小、Observer/filter、渲染事件采样/限频、是否 replaceSinks 等）；UI 展示、模式与阈值等配置仍由 DevtoolsSettings + `localStorage` 作为唯一事实源（见 FR-017），并通过 Devtools 通道回流到 Runtime 以影响采样/开销。  
    从而在无需手动 wiring 的情况下收集 action/state/service/trait/`react-render` 等事件供 Devtools UI 消费。

- Q: StateTransaction 是否允许在 Runtime 或 Module 层被关闭，以便在高频交互场景（如拖拽实时更新位置）直接绕过事务批量提交？ → A: 不允许关闭事务模型；即便在拖拽等高频交互场景，状态更新仍必须通过 StateTransaction 执行，推荐使用「单步事务 + 轻量 Instrumentation（light 模式）+ 视图层节流/合并」等方式控制开销，而不是走非事务直写路径。
- Q: StateTransaction 的观测级别（Instrumentation `"full"` / `"light"`）应如何在 Runtime / Module / React Provider 之间配置和传递？ → A: 观测级别的显式配置入口集中在 Runtime 与 ModuleImpl：在 `Logix.Runtime.make(root, { stateTransaction?: { instrumentation?: "full" | "light" } })` 上提供应用级默认，在 `ModuleDef.implement({ ..., stateTransaction?: { instrumentation?: "full" | "light" } })` 上允许为单个模块覆写，优先级为 ModuleImpl 配置 > Runtime 配置 > 基于 `NODE_ENV` 的默认值；React 层的 `RuntimeProvider` 仅负责透传已经构造好的 Runtime 与 Layer，不得在 Provider 级别引入新的事务观测模式或关闭事务模型。

### Key Entities _(include if feature involves data)_

- **StateTransaction**：一次逻辑入口在 Runtime 中对应的状态事务，包含事务标识（txnId）、来源信息（如动作类型、资源标识）、起始状态引用、事务内草稿状态以及字段级变更列表，用于确保状态更新的原子性和 Devtools 中的事务级可视化。
- **StateTxnContext / StatePatch**：在事务执行期间由 Runtime 维护的上下文对象及其内部 Patch 列表，用于收集 Reducer / Trait / 中间件在事务内对状态的所有修改，以及这些修改对应的字段路径和原因，供提交和调试使用。
- **StateTraitProgram / StateTraitGraph / StateTraitPlan**：蓝图层由 Trait 声明构建出的程序性结构和图结构，描述每个字段有哪些 Trait、它们之间的依赖关系以及在运行阶段应执行的步骤顺序，是 setup 和 run 阶段的唯一结构事实源。
- **StateTraitLifecycle（蓝图 / setup / run）**：Trait 从声明到运行的三段式生命周期：蓝图层负责生成 Program / Graph / Plan；setup 层负责把 Program 与 Runtime 结构入口接线；run 层在事务内执行具体行为，并将内部事件与事务模型对齐。
- **Devtools Trait / Transaction View**：为调试和 Studio 提供的视图模型，能够基于 StateTraitProgram / Graph 显示 Trait 结构，基于 StateTransaction / Patch 显示事务演进轨迹，并支持在两者之间跳转和联动过滤。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 在一个包含至少 50 个 Trait 节点的示例模块中，通过一次用户交互触发状态变更时，Runtime 对底层状态存储的实际写入次数不超过 1 次，订阅者收到的状态更新通知不超过 1 次，且视图层的渲染次数符合现有性能约束（例如每次交互不超过规定的渲染上限）。在典型开发机环境下（本地 dev 模式），示例模块中一次交互对应的单次 StateTransaction 执行时间通常应控制在 50ms 以内，React 侧渲染次数不应超过 3 次（StrictMode 双调用导致的额外渲染除外），作为性能调优与自检的软目标。
- **SC-002**: 在集成 Devtools 的示例应用中，开发者可以基于事务视图完整回放至少 10 次连续的用户交互或服务回写，看到每一次事务的起点（来源）、内部 Trait / Reducer 步骤和最终状态，对同一问题不再需要在多个分散的日志和面板之间切换。
- **SC-003**: 在仅加载蓝图和 setup 的模式下，对包含多模块的示例工程执行 Trait 结构校验，能在 1 分钟内完成所有模块的 Program / Graph 生成与接线检查，并对缺失接线或结构错误给出明确报告，而不需要启动任何外部服务或完整运行环境。
- **SC-004**: 在一次面向内部开发者的验证中，至少 3 名对 Runtime 实现不熟悉的开发者可以在 30 分钟内借助事务视图和 Trait 生命周期视图定位一个 Trait 行为异常的原因（蓝图声明错误 / setup 未接线 / run 阶段执行错误），无需深入阅读底层 Runtime 实现代码。

## Implementation Notes & Env / Debug Policy _(supporting information)_

> 本节用于约束本特性在「运行时环境判断」与「Devtools 辅助代码」上的实现策略，避免未来再出现多套 env 实现或无法裁剪的高噪音逻辑。若与 runtime-logix 文档冲突，以 runtime-logix 为准。

- **统一环境检测入口**
  - 所有 Runtime / React / Devtools 辅助代码必须通过 `@logixjs/core/Env` 导出的 `getNodeEnv` / `isDevEnv` 读取运行时环境：
    - 内部实现下沉到 `packages/logix-core/src/internal/runtime/core/env.ts`，通过 `globalThis.process.env.NODE_ENV` 观察调用方环境，避免 tsup 在构建库时提前内联；
    - React 绑定层（`@logixjs/react`）不得再直接访问 `process.env` 或自行实现 getNodeEnv，而是通过 `packages/logix-react/src/internal/env.ts` 统一 re-export `@logixjs/core/Env`。
  - Debug.layer 在 `mode: "auto"` 下，必须通过 `getNodeEnv()` 判断当前是 dev 还是 prod，而不是直接依赖 `process.env.NODE_ENV` 字面判断。

- **Dev-only 行为与 Debug API 的边界**
  - 仅用于 Devtools / 诊断的辅助结构（例如 `ModuleTraitsRegistry` 中按 moduleId 存储 StateTraitProgram、LogicDiagnostics 中的 phase diagnostics 输出、ModuleCache 中的 ownership 校验与 stableHash 警告），必须统一通过 `isDevEnv()` 控制：
    - 在 `isDevEnv() = false`（生产）时，这些逻辑应当退化为 no-op 或不记录任何额外结构数据，视为“可裁剪的辅助代码”；
    - 运行时行为（状态提交、事务执行、Trait 派生）不得依赖这些 dev-only 结构。
  - 面向用户的 Debug 能力（`Logix.Debug.layer/traceLayer/record`、Debug 中间件等）不强行视为 dev-only：
    - 库侧只负责提供清晰的 API 与统一的 env 语义；
    - 是否在生产环境启用 Debug / 观测，由业务项目自行决定（在 Node/浏览器打包配置中选择合适的 Layer 与 DCE 策略）。
  - `@logixjs/devtools-react` 整包视为 dev-only 依赖：
    - 规范层假定生产入口不主动渲染 `LogixDevtools` 时，该包可以完全被业务 bundler 摇掉；
    - 本特性密切相关的 RuntimeDebugEvent / StateTransaction / TraitGraph 语义必须在没有 Devtools 时也保持一致，以便未来接入其他观测工具。
  - 文档回写要求：本特性所有新增概念与契约在实现稳定后，必须同步补充到 SSoT 与用户文档：
    - SSoT 侧：在 `.codex/skills/project-guide/references/runtime-logix/logix-core/concepts/10-runtime-glossary.md` 中登记 StateTransaction / StateTxnContext / Trait 生命周期 / Devtools 事务视图 / RuntimeDebugEvent 等术语及其跨层关系，并在 `.codex/skills/project-guide/references/runtime-logix/logix-core/*` 与 `impl/README.md` 中补充对应运行时契约与实现要点；
    - 用户文档侧：在 `apps/docs/content/docs/guide/advanced/debugging-and-devtools.md` 及相关 API 文档中增加“按事务调试 Trait + 使用时间旅行 + 观察渲染事件”的示例与推荐实践，保持对最终业务开发者友好的叙事，不暴露 PoC 内部实现细节。

- **测试策略与 001 特性的承接**
  - 本特性在实现 StateTransaction / StatePatch / RuntimeDebugEvent 与 Trait 生命周期分层时，应承接 `specs/000-module-traits-runtime/tasks.md` 中 T070「补足缺失的单元测试与类型测试（围绕高风险路径：Graph/Plan 构造、EffectOp 中间件组合、Resource/Query 集成）」的测试债：
    - 对 Graph/Plan 构造与 EffectOp 管线的高风险路径，需在“单入口 = 单事务 = 单次提交 + 单次订阅通知”的语义下补齐行为测试与类型测试；
    - 针对 Trait 步骤与 StateTransaction.txnId 绑定、事务回滚不通知、时间旅行事务（origin.kind = "devtools"）、React 渲染事件与事务兜底绑定等场景，需要在 `packages/logix-core/test` 与 `packages/logix-devtools-react/test` 中新增专门用例；
  - 具体测试拆分与命名可以在后续 `specs/003-trait-txn-lifecycle/tasks.md` 中细化，但本 spec 视“补齐上述高风险路径测试”为本特性的必达目标之一。

- **事务执行窗口与队列语义**
  - 单个 StateTransaction 的执行窗口 SHOULD 只覆盖“对模块状态的纯计算与写入过程”，MUST NOT 跨越真实 IO 边界：
    - 触发远程调用或长耗时操作时，推荐模式是在事务内仅更新本地状态（例如标记 loading/pending）并发起 IO，待 IO 完成后再以新的逻辑入口（origin.kind = "service-callback" 等）开启第二个事务写回结果；
    - 禁止将整个“发起 IO + 等待 + 写回”的长生命周期封装为单个 StateTransaction，以免事务窗口无限延长并破坏串行语义与调试体验。
  - 对于同一 `moduleId + instanceId` 组合，ModuleRuntime MUST 内部维护事务队列：
    - 任意时刻至多有一个活跃 StateTransaction；
    - 新的逻辑入口（dispatch / source-refresh / service-callback / devtools 操作）必须按 FIFO 顺序排队，等待当前事务 commit 或 rollback 后才能开始；
    - 不同实例的事务可以并行执行，队列语义仅在单实例范围内约束。
  - Trait run 段内的派生逻辑（computed/link）MUST 在当前事务窗口内完成；涉及 IO 的 Trait.source 实现 SHOULD 按上述“短事务 + 多入口”模式设计，而不是在单个事务内部阻塞等待外部服务。

- **补充规划：长链路 Task Runner 语法糖（降低业务心智 / 奥卡姆剃刀）**
  - 目标：保持“事务边界显式、入口级”这一内核不变量不变，同时为业务提供更线性的长链路写法，避免在每个模块里手写 `refreshSuccess/refreshFailed` 等结果 Action。
    - 稳定不变量（业务心智只需记三条）：
      1.  每次进入入口 API（dispatch / source.refresh / devtools / service-callback）必然开启一笔 StateTransaction；引擎不根据 `Effect.sleep/HTTP` 等异步边界隐式切事务。
      - 补充：若某个 source 通过 kernel DSL 开启 `onMount` / `onKeyChange` 等自动模式，Runtime 会在合适的时机**自动调用同一 `source.refresh` 入口**；因此自动模式并不改变“入口级事务”的不变量，只是把入口触发从业务侧迁移到 Runtime 侧。
      2.  单笔事务窗口只覆盖同步计算 + 状态写入，不跨真实 IO；事务内允许多次 `$.state.update/mutate`，对外只在 commit 时可见。
      3.  长链路（pending → IO → result）= 多次逻辑入口（多笔事务），但该拆分应由高层 API 自动完成。
  - 方案（后续演进，非本轮必达）：在 Bound/Flow 层提供 `runTask` 系列语法糖，API 与现有 Flow `run*` 语义一一镜像，内部自动按多入口模式拆分事务：
    - **API 表面（四个对应方法）**：`runTask` / `runLatestTask` / `runExhaustTask` / `runParallelTask`，其触发与并发策略分别等价于 `run` / `runLatest` / `runExhaust` / `runParallel`：
      - `runTask`：顺序排队执行每次触发的 Task；不取消、不错过触发。
      - `runLatestTask`：新触发到来时中断上一条未完成 Task，仅保留/写回最新结果。
      - `runExhaustTask`：当已有 Task 运行时忽略新触发；待当前 Task 完成后才接受下一次。
      - `runParallelTask`：允许多个 Task 并发运行；每个 Task 独立写回结果。
    - **API 放置与用法**：四个 `run*Task` 方法与现有 `run*` 同级，直接挂在 IntentBuilder 上，示例：`$.onAction("refresh").runLatestTask({...})`、`$.onState(...).runTask({...})`。
    - **runLatestTask 语义约束**：实现上必须同时满足两点：1) 新触发到来时对旧 task Fiber 发起 `interrupt`（若可中断）；2) 在写回阶段通过递增的 `taskId`/Ref 校验当前 task 是否仍为最新，确保旧 task 不会产生任何 `success/failure` 入口与事务。
    - 入口 1（事务 1）：**由 Task Runner 自行开启独立事务**提交 `pending`（如 `loading=true` / 清理错误）并立即 commit；且仅对“被接受并实际启动的 task”执行（runExhaustTask 忽略的触发不产生 pending 事务）。
    - 背景 IO：在独立 Fiber 中执行 `effect`；
    - 入口 2/3（事务 2/3）：IO 完成后，以新的逻辑入口（`origin.kind = "service-callback"` 或隐式结果 Action）写回 `success/failure`。
  - 业务侧概念示例（伪代码）：
    ```ts
    yield* Effect.all(
      [
        $.onAction("refresh").runExhaustTask({
          pending: $.state.update((s) => ({ ...s, loading: true, error: undefined })),
          effect: () => api.fetchUser(),
          success: (data) => $.state.update((s) => ({ ...s, loading: false, data })),
          failure: (err) => $.state.update((s) => ({ ...s, loading: false, error: String(err) })),
        }),
      ],
      { concurrency: "unbounded" },
    )
    ```
  - 必要后门（高级场景仍可显式控制，不完全封死）：
    - **手写多入口**：高级作者仍可显式声明结果 Action / service-callback 入口，完全掌控事务切分与 Debug 语义。
    - **显式事务作用域（unsafe）**：预留 `$.unsafe.transaction(origin, body, { allowAsync?: true })` 之类 API，仅供极少数需要批处理/平台内部工具的场景；dev 下必须对跨 IO 的长事务发出诊断事件。
    - **自定义 origin/优先级**：Task Runner 允许覆写 `origin.kind/label`，必要时可增加 `priority`（与 React `startTransition` 思想类比）但不改变事务边界。
