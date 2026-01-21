# Feature Specification: Module Stage Blueprints（Module 舞台语义蓝图）

**Feature Branch**: `[033-module-stage-blueprints]`  
**Created**: 2025-12-25  
**Status**: Draft  
**Input**: 将“场景画布编排语义模型（Module/traits）”落成可长期存储、可 diff、可 codegen 的蓝图体系：语义蓝图（Scenario/Module/Form/Assets）与投影蓝图（UI/Layout）彻底解耦；并固化稳定标识、事件→动作语义边、动态列表 rowRef 回填与试运行验收闭环。

## Assumptions

- 不保证向后兼容：允许一次性破坏式调整蓝图/导出协议与示例，但必须提供迁移说明。
- 平台侧以“Module 舞台”为基准能力：Form 是一种特化 Module（kit），但平台的编排与投影必须覆盖任意 Module。
- 运行时不解释蓝图：蓝图通过 codegen 转换为可运行模块；正常运行路径不引入额外解释成本。
- UI 是投影：UI 只读自身绑定模块状态，只派发自身模块事件/动作；跨模块交互只通过语义边表达（与 032 对齐）。
- 本 spec 与以下规格对齐并互相依赖：`031-trialrun-artifacts`（试运行/验收 IR 工件）、`032-ui-projection-contract`（投影边界）、`035-module-reference-space`（引用空间事实源：PortSpec/TypeIR + CodeAsset 协议）。
- 语义蓝图必须具备强溯源：可将关键节点/边回指到上游 Spec/Scenario/Step 的稳定锚点（例如 trackId/blockId），以支撑回放、对照验收与 drift detection（但不要求 UI 暴露这些细节）。

## Motivation / Background

- 我们需要一套“语义事实源”来支撑：场景编排、字段/规则依赖、跨弹框回填、自动补全、lint、diff、试运行验收、以及未来 AI/agent 自动改写。
- 如果把 UI 本地状态或跨模块读取写入当作事实源，会导致：不可回放、不可解释、无法可靠 diff、以及智能提示失真。
- 因此需要版本化的蓝图体系：语义蓝图负责行为与数据；UI/Layout 蓝图只负责投影与绑定；两者通过稳定标识对接。

## Out of Scope

- 不交付 UI/Layout Editor 本体（本特性定义其对接契约与蓝图边界）。
- 不交付异步/IO 校验主线（允许预留扩展点，但不把异步引入同步规则与展示态核心路径）。
- 不把平台升级为页面设计器（像素/样式/组件树细节不进入语义蓝图 SSoT）。

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 场景画布编排多个 Module，并可落盘/出码/验收 (Priority: P1)

作为平台/业务开发者，我希望在“一个场景”中编排多个模块实例（例如父弹框表单 + 子弹框表单），通过语义边表达打开/提交/回填，并将其保存为可 diff 的语义蓝图；随后能出码为可运行模块，并用试运行导出 IR 验收“编排确实生效且可解释”。

**Why this priority**: 这是 Module 舞台能落地的最小闭环：编辑→保存→出码→运行/验收。

**Independent Test**: 仅实现一个代表性场景（父弹框列表单元格打开子弹框，子弹框提交回填父列表行），即能验证蓝图结构、稳定标识、回填定位与试运行验收链路。

**Acceptance Scenarios**:

1. **Given** 一个场景包含父模块与子模块，父模块包含动态列表，**When** 用户配置“打开子模块 + 提交回填到父列表指定行”，**Then** 语义蓝图可完整表达该关系（无 UI 细节），并可保存为可序列化表示。
2. **Given** 同一语义蓝图，**When** 执行 codegen 并运行，**Then** 该交互可复现：打开子弹框、提交后关闭并回填到正确行，且回填不依赖 index（见 US3）。
3. **Given** 同一语义蓝图，**When** 执行一次试运行/检查，**Then** 可导出可序列化 IR/证据，使平台能解释“为什么会发生该回填”（事件来源、映射摘要、目标字段/行标识），且能将关键运行时事件回指到语义边的稳定 `ruleId`（用于高亮/回放对齐）。

---

### User Story 2 - 多 UI 投影同一语义蓝图 (Priority: P2)

作为平台开发者，我希望同一语义蓝图能被多种 UI 投影复用（例如不同布局、不同组件库、未来 UI/Layout Editor），而不会改变行为；UI 只需要绑定模块实例并渲染其状态，交互只通过派发动作即可。

**Why this priority**: 这是“语义与 UI 解耦”的核心收益，也是长期演进与平台化的前提。

**Independent Test**: 针对同一语义蓝图，替换两套 UI 投影数据，验证语义行为一致、diff 噪音可控。

**Acceptance Scenarios**:

1. **Given** 一个语义蓝图与两套不同 UI 投影，**When** 运行同一场景交互，**Then** 行为一致；差异仅体现在布局/组件表现。
2. **Given** 仅修改 UI/Layout 投影数据，**When** 进行 diff，**Then** 语义蓝图不发生变化。

---

### User Story 3 - 动态列表回填使用稳定 rowRef (Priority: P3)

作为平台使用者，我希望动态列表的回填、定位、错误对齐都基于稳定行标识，而不是 index；即使用户重排/插入/删除行，仍能准确回填到原目标行或给出可行动的降级结果。

**Why this priority**: 动态列表是最常见的“平台编排会踩坑”的地方；没有稳定 identity，场景能力无法可信扩展。

**Independent Test**: 在代表性场景中重排/插入/删除父列表行，重复子弹框提交回填，验证仍回填到正确行或显式失败。

**Acceptance Scenarios**:

1. **Given** 父模块动态列表存在稳定 `$rowId`，**When** 用户打开子弹框并提交结果回填，**Then** 回填通过 `rowRef` 定位到正确行（与当前 index 无关）。
2. **Given** 目标行已被删除，**When** 子弹框提交返回，**Then** 系统必须以确定性的策略处理（例如忽略/提示/降级写入），且能解释原因。

### Edge Cases

- 深层嵌套弹框与多层列表（rowRef 需要支持多段 rowPath）。
- 快速重复打开/关闭/提交导致竞态：语义边必须给出确定性处理策略。
- 同一事件触发多个映射与多个模块动作：顺序与失败语义需可解释。
- 语义蓝图变更与 UI 投影变更交织：如何避免 diff 噪音与事实源漂移。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统 MUST 定义版本化的语义蓝图体系，用于描述场景、模块实例、事件流与映射关系；语义蓝图必须可序列化、可 diff、可被工具链消费。
- **FR-002**: 系统 MUST 明确区分“语义蓝图”与“UI/Layout 投影蓝图”：投影蓝图不得承载语义真相源；两者通过稳定的模块实例标识绑定。
- **FR-003**: 语义蓝图中的模块实例 MUST 具有稳定 `instanceId`，并可作为运行时实例锚点注入；禁止默认随机/时间戳生成实例标识。
- **FR-004**: 语义蓝图中的跨模块交互 MUST 表达为“事件 → 动作”的语义边；禁止 UI 或映射绕过动作语义直接跨边写入其它模块状态。
- **FR-005**: 语义边的映射 MUST 引用版本化、可 diff 的表达式/资产（保存时具备规范化表示、显式依赖与稳定 digest），以支撑自动补全、lint 与审阅。
- **FR-006**: 系统 MUST 为动态列表提供稳定行标识机制：约定保留字段 `$rowId`，并要求所有跨模块回填通过 `rowRef.rowPath` 定位目标行，禁止 index 定位作为默认。
- **FR-007**: 系统 MUST 支持“语义蓝图 → 可运行模块”的出码路径：生成产物应可重复生成且输出确定性（同一输入重复出码一致），运行时不需要读取蓝图解释执行。
- **FR-008**: 系统 MUST 支持对语义蓝图进行试运行/检查并导出可序列化证据/IR，用于平台解释、告警与验收（与 031 的 artifacts 槽位协同；具体 artifact 类型由后续 specs 定义）。
- **FR-009**: 系统 MUST 支持多 UI 投影：UI 只读自身模块公开状态，只派发自身模块动作/事件；跨模块展示需求必须通过语义层聚合/镜像暴露到自身模块公开状态。
- **FR-010**: 语义蓝图中的“事件→动作”边 MUST 具备稳定 `ruleId` 与端点结构（source/sink），可选包含流控/变换 pipeline（由版本化资产引用）；并且 MUST 能与运行时 Trace 建立锚点映射（用于 Studio/Devtools 高亮与回放对齐）。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 语义蓝图与出码/试运行/检查链路 MUST 不影响正常运行时热路径：在不启用检查能力时接近零额外开销。
- **NFR-002**: 所有蓝图、映射与证据 MUST 可序列化、确定性、可回放；默认不得包含随机/时间戳/机器特异信息。
- **NFR-003**: 系统 MUST 提供可解释诊断信息，至少覆盖：事件来源、目标动作、实例标识、rowRef 摘要、映射摘要与失败原因；在关闭诊断时接近零成本。

### Key Entities *(include if feature involves data)*

- **ScenarioBlueprint（语义）**: 一个场景的模块实例图与事件→动作边集合，是行为事实源。
- **ModuleAsset / ModuleInstance**: 模块能力与其实例化绑定（端口、状态、动作、traits 等）。
- **EdgeMapping**: 事件 payload → 动作 payload/patch 的映射资产（具备显式依赖与稳定 digest）。
- **IntentRule（语义边）**: 事件→动作连线的版本化数据模型（稳定 ruleId + 端点 + 可选 pipeline + 可解释元信息），作为画布交互与 Trace 映射的共同锚点。
- **FormBlueprint**: 表单特化模块的字段树、规则清单、列表 identity 与 validator 资产引用。
- **UIBlueprint（投影）**: UI/Layout 对语义蓝图的投影视图与绑定信息（不承载语义）。
- **RowRef / $rowId**: 动态列表稳定行标识与定位信息，确保回填与错误对齐稳定。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 代表性场景（父弹框列表→子弹框→提交回填）可完全由语义蓝图表达、落盘、出码并复现运行行为。
- **SC-002**: 对同一语义蓝图重复出码，输出一致（确定性）；仅改 UI/Layout 投影不会导致语义蓝图 diff。
- **SC-003**: 动态列表在重排/插入/删除后，回填仍准确定位到目标行或以确定性策略失败并可解释（基于 rowRef 而非 index）。
- **SC-004**: 试运行/检查能导出足够的证据/IR，使平台能解释关键行为（事件→动作→写回目标），并支持 lint/告警。
