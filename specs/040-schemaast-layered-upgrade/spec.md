# Feature Specification: SchemaAST 分层能力升级

**Feature Branch**: `[040-schemaast-layered-upgrade]`  
**Created**: 2025-12-26  
**Status**: Done  
**Input**: User description: "那新建个需求吧，把可能可以利用 SchemaAST 的层面都加进去，我后续细化"

## Scope Note（040 v1 的签收口径）

本次签收的 040 **仅覆盖 US1**：导出 `SchemaRegistryPack@v1` 并以 TrialRun artifact（`@logixjs/schema.registry@v1`）进入 CLI 链路；同时该 artifact 的 `value` 会进入 036 Contract Suite 的 Context Pack（白名单机制），用于 Agent/工具侧离线解释 action/state 的 shape。

US2/US3/US4 属于后续增量（已从 040 v1 范围中拆出，避免单体 spec 过大；见 `specs/040-schemaast-layered-upgrade/tasks.md` 的 Moved 记录）。

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - 统一 Schema 工件可查询 (Priority: P1)

作为 Logix 运行时/工具链的使用者，我希望系统能提供统一的 SchemaAST 工件（描述状态、动作、协议与契约的数据结构），并能在不同进程/会话中稳定引用与复用，从而让上层工具可以“看懂”数据形状并进行一致的校验与展示。

**Why this priority**: 这是其它层面（诊断、Devtools、Sandbox 协议、资产化）的共同基础；没有统一工件与稳定引用，上层能力会重复造轮子且难以对齐。

**Independent Test**: 在一个最小运行时会话中注册一组模块与协议后，工具可以只通过对外查询拿到 SchemaAST 工件与稳定标识，并在离线环境复用该工件完成解码/展示。

**Acceptance Scenarios**:

1. **Given** 一个包含模块状态与动作定义的运行时会话，**When** 工具请求该模块的 schema 元数据，**Then** 返回包含可序列化的 SchemaAST 以及稳定的 `schemaId`（同一输入在多次启动中保持一致）。
2. **Given** 一个导出的 schema registry 工件包，**When** 在另一环境导入并解析，**Then** 可以通过 `schemaId` 解析出结构、字段约束与注解信息，并用于校验一组样例数据是否符合预期。

---

### （Moved）User Story 2 - 诊断/回放链路 Schema 化 (Priority: P2)

作为排障与性能调优的工程师，我希望诊断事件与回放证据能够引用 schema（而不是依赖非结构化的对象图），从而在不泄漏敏感信息/不放大开销的前提下，让 Devtools 给出一致、可解释、可对比的证据链路。

**Why this priority**: 诊断能力是产品能力本身；SchemaAST 能把“可解释性”与“序列化/预算”绑定在一起，避免事件形态漂移与不可控膨胀。

**Independent Test**: 在启用诊断的情况下运行一个最小场景，产生的诊断事件可以被离线重放程序加载并解释（基于 schemaId+registry），且事件 payload 仍保持 slim、可 JSON 序列化。

**Acceptance Scenarios**:

1. **Given** 运行时启用诊断与证据导出，**When** 产生一组 action 与 state 更新事件，**Then** 每个事件都能引用相关 `schemaId`，并且事件 payload 是“按 schema 投影/摘要”的 JSON 值（不会直接透传原始对象图）。
2. **Given** 一个包含事件流与 schema registry 的证据包，**When** 在离线环境加载并选择任一事件，**Then** 工具能基于 `schemaId` 解释字段含义与约束，并展示可追溯的因果链（例如触发源 → action → state 影响域）。

---

### （Moved）User Story 3 - Sandbox 协议可校验与可解释错误 (Priority: P3)

作为 Sandbox/对齐实验室的使用者，我希望 Host↔Worker 的双工协议有明确的 SchemaAST 定义，并且当协议消息不合法或版本不匹配时，系统能给出结构化、可定位、可解释的错误事件，而不是静默忽略或产生难以诊断的异常。

**Why this priority**: Sandbox 是实验与对齐的基础设施；协议稳定性与可诊断性决定了“实验可复现”的上限。

**Independent Test**: 构造一组合法/非法/版本不匹配的协议消息，系统可以稳定区分并产出一致的错误事件（带原因与必要上下文），且不会导致 worker/host 崩溃。

**Acceptance Scenarios**:

1. **Given** Host 发送一条缺失必填字段的协议消息，**When** Worker 解码该消息，**Then** Worker 返回一条结构化错误事件（包含错误类别、字段路径、期望结构摘要），并保持会话继续可用。
2. **Given** Host 与 Worker 的协议版本不兼容，**When** 建立连接并进行握手，**Then** 系统明确拒绝并产出可解释的错误（包含双方版本与兼容性结论）。

---

### （Moved）User Story 4 - Flow/Logic 节点与服务契约可资产化 (Priority: P3)

作为平台/业务侧的开发者与工具使用者，我希望 Flow/Logic 的节点参数、输入输出以及服务边界的请求/响应都能被 schema 描述并沉淀为可资产化工件，从而支持 UI 生成、契约校验、变更影响分析与复用。

**Why this priority**: 这是把“可解释 schema”扩展到更高层抽象（节点与服务契约）的关键一步，直接提升“意图 → 可运行 → 可回放”的确定性与复用效率。

**Independent Test**: 选择一个最小节点/服务契约定义，工具可以读取其 schema 元数据生成参数面板/校验输入，并在契约变更时给出明确的影响提示。

**Acceptance Scenarios**:

1. **Given** 一个带 schema 元数据的节点/服务契约，**When** 工具渲染参数面板并提交输入，**Then** 输入会被 schema 校验并能给出字段级错误提示。
2. **Given** 该节点/服务契约的 schema 发生变更，**When** 工具对比两个版本的 schema，**Then** 能输出“破坏性/非破坏性”变更摘要与影响范围提示。

### Edge Cases

- 当 schema 结构中存在递归/循环引用时，SchemaAST 仍必须可序列化并可稳定计算 `schemaId`。
- 当 schema registry 体积较大时，导出/导入不应阻塞关键交互；并应支持按需加载或分片（以保证可用性）。
- 当事件/协议引用了未知的 `schemaId` 时，工具应以“不可解释但仍可显示的安全摘要”降级展示，并给出缺失原因。
- 当 schema/注解中包含敏感字段标记时，诊断事件必须遵守最小披露原则（只输出摘要/脱敏/统计信息）。
- 当 Host↔Worker 消息为旧版本或不兼容版本时，必须明确拒绝并返回结构化错误，不得静默忽略。

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: System MUST 定义并采用统一的 SchemaAST 表达，用于描述：模块状态、动作 payload、诊断/证据结构、Sandbox 协议消息、Flow/Logic 节点参数与服务契约。
- **FR-002**: System MUST 为每个 SchemaAST 生成稳定的 `schemaId`，并保证相同语义的 schema 在不同运行与不同环境中生成一致的标识。
- **FR-003**: System MUST 提供可查询的 schema 元数据出口，使外部工具能够按模块/动作/协议/契约维度获取：`schemaId`、SchemaAST、以及必要的可读元数据（名称/描述/标签/文档链接等）。
- **FR-004**: System MUST 提供会话级的 schema registry 工件包导出/导入能力；导出的工件必须可 JSON 序列化，并可用于离线解释与回放。
- **FR-005**: System MUST 支持 schema annotations（例如 UI 提示、隐私/PII 标记、缓存/分组、诊断投影策略），并保证这些注解在“定义 → 工件 → 工具消费”链路中保持一致。
- **FR-006**: System MUST 在统一最小 IR（Static IR + Dynamic Trace）中引用相关 `schemaId`，以便工具进行 IR diff、缓存锚定、以及跨会话的一致性检查。
- **FR-007**: System MUST 在诊断事件/证据导出中引用相关 `schemaId`，并确保事件 payload 为“按 schema 投影后的 JSON 值”，满足 slim、可序列化与预算约束。
- **FR-008**: System MUST 为 Host↔Worker 的协议消息定义 SchemaAST，并在编码/解码时进行校验；任何不合法消息 MUST 产生结构化错误事件（包含字段路径与失败原因）。
- **FR-009**: System MUST 提供 schema 变更影响分析：能够比较两个 schema 版本并识别破坏性变更（例如字段删除/类型收窄/语义约束增强），并生成可读摘要。
- **FR-010**: System MUST 允许 Flow/Logic 节点参数与输入输出引用 schema，使工具能基于 schema 自动生成参数面板与校验，并在 schema 变更时提示影响范围。
- **FR-011**: System MUST 允许服务边界（请求/响应）引用 schema，使工具能对入站/出站数据进行一致的校验与解释，并将契约信息纳入诊断证据链路。
- **FR-012**: System SHOULD 允许将 Schema Registry pack 作为 TrialRun artifacts 的可选附属工件导出（推荐 key：`@logixjs/schema.registry@v1`），以便 Workbench/CI/Agent 在同一条 IR 链路中拿到“schemaId→schema”映射。

### Non-Functional Requirements (Performance & Diagnosability)

<!--
  If this feature touches Logix runtime hot paths, treat performance and
  diagnosability as first-class requirements:
  - Define budgets (time/alloc/memory) and how they are measured
  - Define what diagnostic events/Devtools surfaces exist and their overhead
-->

- **NFR-001**: 040 v1 不得进入 runtime 热路径或事务窗口；只允许按需导出（TrialRun artifacts / 工具链路径）。
- **NFR-002**: 导出的 `SchemaRegistryPack@v1` 必须 JSON-safe、确定性、可 diff；失败必须降级为可解释的 JSON 值（不得崩溃）。
- **NFR-003**: `schemaId` 必须跨运行稳定（注解优先，否则结构派生），并能被 CI/Contract Suite 作为解释材料消费。
- **NFR-004**: SchemaRegistryPack 只作为“解释与校验支撑”，不得成为平台引用空间事实源（事实源仍为 035 PortSpec/TypeIR）。

### Key Entities *(include if feature involves data)*

- **SchemaAST**: 一种可序列化的结构化表示，用于描述数据形状、约束与注解。
- **schemaId**: 基于 SchemaAST 的确定性标识，用于跨会话引用、缓存锚定与变更对比。
- **Schema Registry**: 会话/运行时范围的 schema 工件集合，可导出/导入，用于离线解释与回放。
- **Schema Annotations**: 附着在 schema 上的元数据（UI/隐私/分组/诊断投影策略等）。
- **Diagnostic Event / Evidence Pack**: 诊断事件流与证据包，事件只携带 JSON-safe 摘要与 schema 引用。
- **Protocol Message**: Host↔Worker 或其它边界消息，必须可用 schema 校验并提供结构化错误。

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: 对代表性模块执行一次 trialrun/Contract Suite 后，`TrialRunReport.artifacts['@logixjs/schema.registry@v1']` 可用且 JSON 可序列化，且同一输入两次运行 `schemaId` 不变。
- **SC-002**: `logix contract-suite run` 在失败（或显式 `--includeContextPack`）时输出 `ContractSuiteContextPack@v1`，并默认携带 registry pack 的 `value` 供离线解释。
- **SC-003**: 040 contracts（schema-ref / schema-registry-pack / schema-diff）均可解析，且 `$ref` 可解析（CI 守卫）。

## Assumptions

- 本特性以“能力落点清单 + 可验收结果”为目标，具体实现分阶段推进；后续细化应优先以可复现基线与可解释证据链路驱动取舍。
- 在不引入兼容层的前提下，任何破坏性协议/事件变更都必须给出迁移说明与变更摘要（面向使用者与工具）。

## Dependencies

- （Moved）Devtools/Playground 的 schema-aware 解释视图（事件/IR）属于后续增量。
- （Moved）Sandbox Host↔Worker 协议 schema 校验与结构化错误属于后续增量。
- （Moved）证据包/回放消费者对 schema registry 的离线解释属于后续增量。
- 与 IR-first 平台链路的组合建议外链到：`specs/036-workbench-contract-suite/reading-cheatsheet.md`（registry pack 可通过 artifacts 同链路导出，并进入 Contract Suite/Context Pack）。
- 与 `@logixjs/module.portSpec@v1` / `@logixjs/module.typeIr@v1`（035）的边界：SchemaAST/registry 是“解释与校验支撑”，平台引用空间事实源仍以 PortSpec/TypeIR 为准；TypeIR 的实现可由 SchemaAST 投影，但 SchemaAST 本体不外泄为平台事实源。

## Out of Scope

- 具体 UI 组件形态、界面布局与交互细节（属于后续 Devtools/Studio 设计迭代）。
- 具体 SchemaAST 的底层实现与选型细节（此处只约束对外可验收能力与质量门）。
- 不以 SchemaAST 取代 035 的 PortSpec/TypeIR 作为平台引用空间事实源；SchemaAST 只作为实现侧结构来源与 registry pack 的解释材料。
- 不引入“TS AST 作为裁判/事实源”的路线；如需 AST 仅作为代码编辑载体（patch）而非 IR/验收输入。
- US2/US3/US4（诊断/协议/资产化）已从 040 v1 拆出，不阻塞本次签收。
