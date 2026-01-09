# Feature Specification: Logix Router Bridge（路由抽象与可注入 Router）

**Feature Branch**: `071-logix-router-bridge`  
**Created**: 2026-01-02  
**Status**: Draft  
**Input**: User description: "Logix 引入 router 能力，使 logic 内部可读取并触发导航；路由引擎可替换；集成概念尽可能与 @logixjs/form、@logixjs/query 相似。"

## Terminology

- **Route Snapshot**：路由状态的结构化快照（仅对外暴露已提交/已解析的一致状态；包含 pathname/search/hash、params；可选 route identity/matches，需 Slim 且可序列化）。
- **Router Engine**：具体路由实现（可被替换），负责 URL 同步、匹配、导航、history 管理等。
- **Router Binding**：把 Router Engine 的信息与能力“桥接/注入”到 Logix 的可注入实现（内部概念；对外通过 `Router.layer(...)` 体现）。
- **Router Contract**：Logix 侧面向业务逻辑暴露的稳定抽象（可在 `.logic()` 内读取与调用），业务代码只依赖该抽象。
- **Navigation Intent**：由业务 logic 发起的“导航意图”（例如 push/replace/back），最终由 Router Engine 执行并产生 route change。

## Scope

### In Scope

- 提供一个可注入的 Router Contract，使 Logix `.logic()` 内可以：
  - 读取当前 Route Snapshot；
  - 监听 Route Snapshot 的变化；
  - 发起导航意图（push/replace/back 等）。
- 路由引擎可替换：业务模块/logic 不依赖具体 router 实现，切换引擎时只需替换注入的 Router 实现（Router Binding）。
- 提供可测试/可 mock 的能力：在单元测试中可用纯内存/虚拟实现驱动 route change，并断言导航意图。
- 提供最低限度的可诊断性：当启用诊断时，能解释“为什么发生了路由变化/是谁发起了导航”。

### Out of Scope (Non-goals)

- 不实现新的路由引擎（匹配算法、文件路由、代码分割路由等）。
- 不规定应用层路由表的组织方式（嵌套路由、动态路由、权限路由等仍由应用决定）。
- 不提供 UI 组件库层面的路由组件（Link/Nav/Outlet 等）。
- 不承诺覆盖所有运行环境（例如 SSR 的完整语义）；超出范围的环境需明确降级与错误口径。

## Clarifications

### Session 2026-01-03

- AUTO: Q: Route Snapshot 是否包含 pending 中间态？ → A: 仅提交/已解析快照
- AUTO: Q: `search/hash` 是否保留 `?/#` 前缀？ → A: 保留前缀或空串
- AUTO: Q: `params` 缺失语义是什么？ → A: 键缺失=不存在
- AUTO: Q: `changes` 是否包含 initial？ → A: 包含（subscribe 时先 emit current snapshot）（Q009）
- AUTO: Q: `changes` 的顺序/丢失语义？ → A: 保序且不丢最后
- AUTO: Q: `navigate` 是否返回“下一快照”？ → A: 不返回；用 `changes` 观测
- AUTO: Q: 未注入 Router 时如何处理？ → A: 结构化错误失败
- AUTO: Q: txn 窗口内 `navigate` 如何处理？ → A: 结构化错误失败
- AUTO: Q: 外部 route change 需要归因到 logic 吗？ → A: 不需要
- AUTO: Q: `routeId/matches` 的要求？ → A: 可选且可序列化
- Q004: Q: Query Params 的 DX 如何保证？ → A: 提供官方 `Router.SearchParams` utils（仍保持 `search` 为 raw string；不把 Query Params 塞进 `params`）
- Q005: Q: `pathname` 是否包含 `basename/basepath`？ → A: 不包含（对外暴露 router-local pathname）（Q005）
- Q007: Q: `params`/Query Params 是否支持多值？ → A: `params` 仅支持单字符串；Query Params 保持在 `search`，推荐用 `Router.SearchParams.getAll` 解析多值

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 在 `.logic()` 内读取并使用 Route Snapshot (Priority: P1)

作为 Logix 模块作者，我希望在 `.logic()` 内能够读取当前路由信息（例如 pathname、params），从而在“业务状态机/流程/权限/数据请求”等逻辑里自然地使用路由作为输入，而不是把路由当作组件层的旁路状态。

**Why this priority**: “读路由”是所有路由驱动业务的基础能力；如果只能在组件层读取并再手工注入到 logic，会造成割裂的真相源和大量样板代码。

**Independent Test**: 在一个最小应用中提供一个 Router 实现（Router Binding）：初始化到某个路由快照；然后模拟一次路由变化；验证同一个模块 logic 能读到更新后的快照并产生预期的状态变更/输出。

**Acceptance Scenarios**:

1. **Given** 应用已为某个 Logix Runtime 注入 Router 实现且当前路由快照为 A，**When** 业务 logic 读取 Route Snapshot，**Then** 读到的快照必须与该实现提供的 A 一致（字段完整且无内部不一致）。
2. **Given** 当前路由快照从 A 变化为 B，**When** 业务 logic 订阅/监听路由变化，**Then** logic 必须能够收到一次变更通知并读到 B（不得需要组件层手工同步）。
3. **Given** 未注入 Router（或注入错误实现），**When** 业务 logic 尝试读取路由快照，**Then** 系统必须以清晰、可诊断的结构化错误失败（不得 silent wrong value）。

---

### User Story 2 - 在 `.logic()` 内发起导航意图 (Priority: P2)

作为 Logix 模块作者，我希望在 `.logic()` 内能够发起导航（例如 push/replace/back），以便把导航作为业务流程的一部分（例如提交成功跳转、权限不足重定向、引导流程的下一步），并且能被测试与诊断。

**Why this priority**: “能导航”决定了路由是否能真正成为业务流程的一等输入/输出；否则业务流程仍需要回退到组件层 hooks，造成“流程一半在 logic、一半在组件”的断裂。

**Independent Test**: 使用一个可 mock 的 Router 实现：记录导航意图并同步更新 route snapshot；验证 logic 发起导航后，实现收到正确的 intent，随后 snapshot 更新，且 logic 可观测到更新。

**Acceptance Scenarios**:

1. **Given** 业务 logic 在某个条件满足时发起 `push` 导航到目标路由，**When** 该逻辑被触发，**Then** Router 实现必须接收到一次对应的 Navigation Intent，且路由快照最终变化到目标状态。
2. **Given** 业务 logic 发起 `replace` 导航，**When** 该逻辑被触发，**Then** Router 实现必须以 replace 语义处理该意图（不产生多余的历史记录），且快照变化符合预期。
3. **Given** 业务 logic 发起 `back`（或等价的返回）意图，**When** 该逻辑被触发，**Then** Router 实现必须以“历史返回”的语义处理，并产生对应的快照变化或清晰的不可用错误。

---

### User Story 3 - 路由引擎可替换，业务 logic 不改动 (Priority: P2)

作为应用架构者/平台维护者，我希望在不改业务模块逻辑的前提下更换路由引擎（例如从一个实现迁移到另一个实现），只需要替换注入的 Router 实现即可，避免把业务逻辑和某个路由框架深度绑定。

**Why this priority**: 路由引擎属于应用基础设施，生命周期与业务逻辑不同步；如果业务逻辑直接依赖具体引擎，将导致长期演进成本高、迁移风险大。

**Independent Test**: 用同一份业务模块：分别注入实现 A 与实现 B（模拟两个不同路由引擎）；执行同一组场景（读取快照、订阅变更、发起导航）；验证模块行为一致。

**Acceptance Scenarios**:

1. **Given** 业务模块仅依赖 Router Contract 抽象，**When** 从实现 A 切换到实现 B，**Then** 业务模块代码无需修改且行为保持一致（相同输入快照 → 相同输出/副作用）。
2. **Given** 两个实现都实现了同一份 Router Contract，**When** 业务 logic 发起导航意图，**Then** 两个引擎下都能完成等价导航并产生一致的快照演进。
3. **Given** 某个实现不支持某类能力（例如 forward），**When** 业务 logic 发起该能力调用，**Then** 必须以可诊断且可测试的方式失败（错误明确、不会破坏其它能力）。

### Edge Cases

- 同一页面存在多个 Router 实例或多个 Logix Runtime：Router Contract 必须绑定到对应 runtime 实例，避免全局单例导致串线。
- 快速连续路由变化（例如短时间多次 replace/push/back）：订阅者必须按顺序看到变化，且不会丢最后一次快照。
- params 缺失/不匹配/类型不一致：`params` 始终为对象；键缺失表示“键不存在”；值始终为字符串；不进行隐式数字/布尔转换。
- base path/嵌套路由导致的 pathname 与 params 组合差异：快照必须保持自洽，避免出现“pathname 已变但 params 仍是旧值”的中间态外泄。
- `basename/basepath`：`RouteSnapshot.pathname` 对外不包含 base（暴露 router-local pathname），避免部署路径与业务语义耦合。
- `basename/basepath` 配置错误：若 Binding 无法保证 `pathname` 为 router-local（例如无法剥离 configured basepath），必须以结构化错误失败，避免把部署路径泄露进业务语义。
- 可选扩展字段（`routeId/matches`）：允许存在，但不属于引擎可替换性的稳定保证面；业务 logic 若依赖它们，必须视为 `unsafe` 并能在缺失时退化（否则等价于“绑定某个引擎/路由表形态”）。
- Querystring 顺序变化：`RouteSnapshot.search` 透传 raw string，不做归一化；若仅顺序变化导致字符串变化，仍会触发 snapshot change（如需语义级比较，应自行解析后比较）。
- Router 未注入或被错误注入：必须快速失败并给出可定位信息（错误码/消息），不得默默降级成空行为。
- `back()` 无历史可回：必须以结构化错误失败（不得 silent no-op），以便业务逻辑可测试可诊断地处理该分支。
- React 生态 tearing：允许 “Logic 可能先于 UI render 观察到新路由” 的短暂撕裂；不强行与 React 渲染周期同步（保持低成本与可替换性）。
- 导航引发的业务重入：如果 route change 触发业务逻辑再次导航，系统必须可诊断该因果链，避免难以排查的循环。
- 底层 router 抛同步错误：底层引擎在 `navigate` 时的同步 throw / promise rejection 必须被捕获并转换为 `RouterError`（错误通道），不得 defect 冒泡（否则会破坏可测试性与诊断链路）。

## Requirements _(mandatory)_

### Scope & Non-goals

- 本特性聚焦“路由信息与导航能力进入 Logix logic 的可注入抽象”。
- 不提供第二套路由 DSL；不对应用层路由表做约束。
- 不要求应用必须使用某个特定路由库；本特性以可注入实现方式对接。

### Assumptions & Dependencies

- 调用方在运行时能够提供一个 Router 实现（由应用装配/注入），否则路由能力不可用但必须可诊断。
- Router Contract 的消费方主要是“业务模块逻辑/流程”，而不是 UI 组件；UI 组件依然可以选择使用其所在生态的原生方式。
- 需要一套最小测试夹具，以在不依赖真实浏览器 history 的前提下模拟 route change 与捕获导航意图。

### Functional Requirements

- **FR-001**: 系统 MUST 提供 Router Contract 抽象，使 Logix `.logic()` 内可读取当前 Route Snapshot（仅对外暴露已提交/已解析的一致快照；至少包含 pathname/search/hash 与 params；`search/hash` 保留 `?/#` 前缀或为空字符串；Query Params 通过 `search` 获取，官方提供 `Router.SearchParams` utils 避免重复解析样板；`pathname` 必须为 router-local（Binding 需剥离 configured `basename/basepath`，避免部署路径影响业务语义））。
- **FR-002**: 系统 MUST 提供在 `.logic()` 内订阅路由变化的能力：订阅流在 subscribe 时必须先 emit 一次 current snapshot（initial），随后在每次快照变化后触发；变更通知必须保序，且不得丢最后一次快照；每次触发都必须能读取到一致的最新快照。
- **FR-003**: 系统 MUST 支持在 `.logic()` 内发起导航意图（至少包含 push、replace、back 三类），且该调用不返回“导航后的快照”；导航结果通过 `getSnapshot/changes` 观测；该能力必须可测试（可被 mock、可断言）。
- **FR-004**: 系统 MUST 将“由业务 logic 通过 Router Contract 发起的导航意图”与“最终路由快照变化”建立可追溯关联（例如在诊断事件中体现来源与因果链），以支持调试与回放对齐；外部触发的 route change 不要求强行归因到某个 logic。
- **FR-005**: 系统 MUST 支持路由引擎替换：业务模块/logic 只能依赖 Router Contract，替换引擎时只替换注入的 Router 实现。
- **FR-006**: 系统 MUST 支持多实例隔离：同一页面/进程里多个 runtime 或多个 router 不得串线；Router Contract 的实现必须是可注入的实例级对象，而非全局单例。
- **FR-007**: 系统 MUST 为 params 提供稳定语义：params 是（path params 的）“键到字符串值”的映射；缺失为“键不存在”，不得进行隐式类型转换；不在 params 中表达 Query Params/多值语义（Query Params 保持在 `search`，并通过 `Router.SearchParams` 获取）。
- **FR-008**: 当 Router 未提供或能力不足时，系统 MUST 以清晰方式失败（结构化错误/可诊断事件），不得 silent no-op 或返回误导性默认值。

### Non-Functional Requirements (Performance & Diagnosability)

<!--
  If this feature touches Logix runtime hot paths, treat performance and
  diagnosability as first-class requirements:
  - Define budgets (time/alloc/memory) and how they are measured
  - Define what diagnostic events/Devtools surfaces exist and their overhead
-->

- **NFR-001**: 当 Router Contract 未被消费（无读取/无订阅/无导航）时，系统 MUST 不产生常驻轮询或额外后台工作，开销应接近零。
- **NFR-002**: 诊断/事件能力 MUST 可开关，且在关闭时开销接近零；开启时输出必须 Slim、可序列化、可用于解释因果链。
- **NFR-003**: 导航执行与路由变更 MUST 不发生在事务窗口内；任何与外部系统交互的工作必须在事务外完成；若在事务窗口内尝试发起导航，系统 MUST 以可诊断的结构化错误失败。
- **NFR-004**: Router Contract 与 Router 实现 MUST 通过依赖注入提供，支持 per-instance/session mock；不得依赖 process-global 单例。
- **NFR-005**: 如果本特性引入 breaking change，必须提供迁移说明（plan.md / PR），并遵循 forward-only（不提供兼容层/不设弃用期）。

### Key Entities _(include if feature involves data)_

- **RouteSnapshot**：当前路由快照（已提交/已解析的一致状态；包含 pathname/search/hash、params；可选 route identity/matches，需 Slim 且可序列化）。
- **NavigationIntent**：由业务 logic 发起的导航请求（push/replace/back 等），可被 Router 实现捕获并执行。
- **RouterBinding**：把路由引擎桥接到 Router Contract 的可注入实现，可替换、可 mock、实例级注入。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 在一个最小示例应用中，路由快照发生变化后，业务 logic 能在一次用户交互周期内读取到最新 pathname 与 params（无须组件层手工同步）。
- **SC-002**: 在不修改业务模块代码的情况下，仅替换注入的 Router 实现，即可切换路由引擎并通过同一组验收场景。
- **SC-003**: 对于由业务 logic 发起的每一次 Navigation Intent，诊断输出都能解释来源与因果链（谁发起 → 意图是什么 → 最终快照如何变化）。
- **SC-004**: 至少提供一组自动化测试覆盖：读取快照、订阅变化、发起导航、Router 实现可 mock/可替换。
