# Feature Specification: StateTrait 状态事务与生命周期分层

**Feature Branch**: `003-trait-txn-lifecycle`  
**Created**: 2025-12-11  
**Status**: Draft  
**Input**: User description: "StateTrait 状态事务与 Trait 蓝图/setup/run 生命周期分层"

## User Scenarios & Testing *(mandatory)*

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

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统必须为每个模块引入显式的状态事务模型：任何一次可能修改模块状态的逻辑入口（例如动作派发、显式触发的资源刷新、来自外部服务的状态回写）都必须在单一状态事务中执行，并为该事务分配唯一标识、记录发起来源、起始状态和字段级变更信息。  
- **FR-002**: 在单个状态事务内部，系统必须允许多次对「事务内草稿状态」进行修改，但对外只能在事务提交时进行一次实际状态写入，并向所有订阅者发出一次聚合的状态更新通知；订阅接口必须以事务提交为粒度传播状态变化，而不是以内部步骤为粒度。  
- **FR-003**: 当模块声明了 Trait 后，系统必须将 Trait 执行视为处于 Reducer 之上的补充层：在每次状态事务提交前，Runtime 必须按照 Trait 计划（Plan）的顺序与依赖关系，对事务内草稿状态执行 Trait 派生，并保证在该 TraitProgram 下达到稳定点后才允许提交；Trait 的每个步骤应记录为独立的内部事件，供调试与回放使用，但不得在 Trait 内部开启新的状态事务或触发额外的对外提交。  
- **FR-004**: StateTrait 必须显式支持「蓝图 → setup → run」三段生命周期：  
  - 蓝图层：由 Trait DSL 和 StateTrait.build 负责，只依赖状态结构与 Trait 声明，产生 StateTraitProgram / Graph / Plan 等结构化描述；  
  - setup 层：在 ModuleRuntime / BoundApi 构造阶段执行，只负责与环境无关的结构接线（例如为每个 source 字段注册刷新入口、为 Devtools / Debug 记录 TraitPlanId 与 Graph 节点锚点），禁止调用任何 run-only 能力；  
  - run 层：在 Runtime 运行阶段执行，基于 Program / Plan 安装具体的监视与行为逻辑（例如监听状态变化并在事务内更新派生字段、发起远程调用），并通过事务模型对外暴露一致的状态变化视图。  
- **FR-005**: 系统必须为 Devtools / Studio 提供基于上述生命周期和事务模型的统一观测接口：  
  - 能够在不启动完整运行环境的前提下获取蓝图与 setup 信息，用于绘制 TraitGraph、展示字段能力分布、执行结构性校验；  
  - 在运行时能够按事务维度拉取 Trait 执行轨迹，包括每个内部步骤的字段变更和关联的生命周期阶段；  
  - 出现错误时，可以明确标记问题出现在蓝图声明、setup 接线还是 run 阶段执行。
- **FR-006**: Devtools 面板在 UI 结构上必须以「Module → Instance → Transaction」三层父子关系组织左侧导航：  
  - Module 节点代表逻辑模块蓝图（ModuleInstance Tag），展示模块名与实例数量；  
  - Instance 节点代表某个模块在特定 Runtime 环境中的具体实例，展示实例标签与 Trait setup 状态；  
  - Transaction 节点代表一次状态事务（StateTransaction），展示 origin 类型、时间与简要描述。  
  左侧导航的任意一个选中项都必须可用于驱动中部视图的过滤与高亮。  
- **FR-007**: Devtools 面板在选中不同层级节点时，中部主视图必须展现对应层级的语义：  
  - 选中 Module：中部展示该模块的 TraitGraph（蓝图视图），以及可选的实例汇总信息；  
  - 选中 Instance：在相同 TraitGraph 上叠加 setup 状态（已接线 / 未接线 / 错误），并展示该实例下最近若干事务列表；  
  - 选中 Transaction：展示该事务内按时间排序的事件时间线（EffectOp 流）和字段 Patch 列表，并在 TraitGraph 上高亮本事务涉及的节点。  
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
  - 时间旅行仅在开发 / 测试环境可用，必须通过运行时配置或 Devtools 通道显式启用。  
- **FR-011**: Devtools 面板在 UI 上必须提供时间旅行入口：  
  - 在选中某个 Instance + Transaction 的前提下，用户可以通过「回到事务前状态」和「回到事务后状态」两类操作按钮触发对该实例的时间旅行；  
  - 面板需要在显著位置标记当前实例处于“时间旅行状态”（例如显示当前基于哪个 txnId / mode），并提供“返回当前最新状态”的操作；  
  - 时间旅行操作可以记录为一种特殊类型的事务（例如 origin.kind = "devtools"），以便后续审查与调试。  
- **FR-012**: 为方便后续扩展录制/回放能力，Devtools 与 Runtime 间的事务与 Trait 数据契约（StateTransaction / StatePatch / TraitRuntimeEventRef / TraitGraph 等）在设计上必须保持向前兼容：  
  - 允许在现有字段上增加快照、Patch 分组、录制 sessionId 等信息，而不破坏现有字段含义；  
  - 当前实现可以按需要填充这些扩展字段，但规范层必须为它们明确语义，使后续能力可以在不破坏 Trait 主线的前提下平滑接入。
- **FR-013**: 为了让 Trait + 事务下的 UI 行为可回放、可对比，系统必须对 Devtools 消费的 Debug 事件做一次统一标准化，并显式纳入「组件渲染事件」：  
  - Runtime 必须为 Devtools 提供一个归一化的 RuntimeDebugEvent 视图（对应数据模型中的 `TraitRuntimeEventRef`），将现有的 `action:dispatch`、`state:update`、service 调用、Trait 派生步骤等事件统一映射为带 `eventId / moduleId / instanceId / txnId? / timestamp / kind / label / meta` 的结构；  
  - 在 React 集成层（`@logix/react`）必须新增一类 `kind = "react-render"` 的视图事件，用于记录组件渲染：至少包含组件标识（componentLabel）、关联的 Module / Instance 信息、关键 selector 或字段路径、是否处于 StrictMode 双调用阶段、以及若由某次 StateTransaction 提交触发时的 `txnId`；  
  - Devtools 的时间线视图必须支持把这些 `react-render` 事件与同一事务下的 Trait / state 事件一起展示和过滤，使开发者可以直接看到“一次事务导致了哪些组件渲染”，并可按事件类别（action / trait / state / view-render / devtools 等）开启或关闭显示。  

### Key Entities *(include if feature involves data)*

- **StateTransaction**：一次逻辑入口在 Runtime 中对应的状态事务，包含事务标识（txnId）、来源信息（如动作类型、资源标识）、起始状态引用、事务内草稿状态以及字段级变更列表，用于确保状态更新的原子性和 Devtools 中的事务级可视化。  
- **StateTxnContext / StatePatch**：在事务执行期间由 Runtime 维护的上下文对象及其内部 Patch 列表，用于收集 Reducer / Trait / 中间件在事务内对状态的所有修改，以及这些修改对应的字段路径和原因，供提交和调试使用。  
- **StateTraitProgram / StateTraitGraph / StateTraitPlan**：蓝图层由 Trait 声明构建出的程序性结构和图结构，描述每个字段有哪些 Trait、它们之间的依赖关系以及在运行阶段应执行的步骤顺序，是 setup 和 run 阶段的唯一结构事实源。  
- **StateTraitLifecycle（蓝图 / setup / run）**：Trait 从声明到运行的三段式生命周期：蓝图层负责生成 Program / Graph / Plan；setup 层负责把 Program 与 Runtime 结构入口接线；run 层在事务内执行具体行为，并将内部事件与事务模型对齐。  
- **Devtools Trait / Transaction View**：为调试和 Studio 提供的视图模型，能够基于 StateTraitProgram / Graph 显示 Trait 结构，基于 StateTransaction / Patch 显示事务演进轨迹，并支持在两者之间跳转和联动过滤。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 在一个包含至少 50 个 Trait 节点的示例模块中，通过一次用户交互触发状态变更时，Runtime 对底层状态存储的实际写入次数不超过 1 次，订阅者收到的状态更新通知不超过 1 次，且视图层的渲染次数符合现有性能约束（例如每次交互不超过规定的渲染上限）。  
- **SC-002**: 在集成 Devtools 的示例应用中，开发者可以基于事务视图完整回放至少 10 次连续的用户交互或服务回写，看到每一次事务的起点（来源）、内部 Trait / Reducer 步骤和最终状态，对同一问题不再需要在多个分散的日志和面板之间切换。  
- **SC-003**: 在仅加载蓝图和 setup 的模式下，对包含多模块的示例工程执行 Trait 结构校验，能在 1 分钟内完成所有模块的 Program / Graph 生成与接线检查，并对缺失接线或结构错误给出明确报告，而不需要启动任何外部服务或完整运行环境。  
- **SC-004**: 在一次面向内部开发者的验证中，至少 3 名对 Runtime 实现不熟悉的开发者可以在 30 分钟内借助事务视图和 Trait 生命周期视图定位一个 Trait 行为异常的原因（蓝图声明错误 / setup 未接线 / run 阶段执行错误），无需深入阅读底层 Runtime 实现代码。

## Implementation Notes & Env / Debug Policy *(supporting information)*

> 本节用于约束本特性在「运行时环境判断」与「Devtools 辅助代码」上的实现策略，避免未来再出现多套 env 实现或无法裁剪的高噪音逻辑。若与 runtime-logix 文档冲突，以 runtime-logix 为准。

- **统一环境检测入口**  
  - 所有 Runtime / React / Devtools 辅助代码必须通过 `@logix/core/env` 导出的 `getNodeEnv` / `isDevEnv` 读取运行时环境：  
    - 内部实现下沉到 `packages/logix-core/src/internal/runtime/core/env.ts`，通过 `globalThis.process.env.NODE_ENV` 观察调用方环境，避免 tsup 在构建库时提前内联；  
    - React 绑定层（`@logix/react`）不得再直接访问 `process.env` 或自行实现 getNodeEnv，而是通过 `packages/logix-react/src/internal/env.ts` 统一 re-export `@logix/core/env`。  
  - Debug.layer 在 `mode: "auto"` 下，必须通过 `getNodeEnv()` 判断当前是 dev 还是 prod，而不是直接依赖 `process.env.NODE_ENV` 字面判断。

- **Dev-only 行为与 Debug API 的边界**  
  - 仅用于 Devtools / 诊断的辅助结构（例如 `ModuleTraitsRegistry` 中按 moduleId 存储 StateTraitProgram、LogicDiagnostics 中的 phase diagnostics 输出、ModuleCache 中的 ownership 校验与 stableHash 警告），必须统一通过 `isDevEnv()` 控制：  
    - 在 `isDevEnv() = false`（生产）时，这些逻辑应当退化为 no-op 或不记录任何额外结构数据，视为“可裁剪的辅助代码”；  
    - 运行时行为（状态提交、事务执行、Trait 派生）不得依赖这些 dev-only 结构。  
  - 面向用户的 Debug 能力（`Logix.Debug.layer/traceLayer/record`、Debug 中间件等）不强行视为 dev-only：  
    - 库侧只负责提供清晰的 API 与统一的 env 语义；  
    - 是否在生产环境启用 Debug / 观测，由业务项目自行决定（在 Node/浏览器打包配置中选择合适的 Layer 与 DCE 策略）。  
  - `@logix-devtools/react` 整包视为 dev-only 依赖：  
    - 规范层假定生产入口不主动渲染 `LogixDevtools` 时，该包可以完全被业务 bundler 摇掉；  
    - 本特性密切相关的 RuntimeDebugEvent / StateTransaction / TraitGraph 语义必须在没有 Devtools 时也保持一致，以便未来接入其他观测工具。  
