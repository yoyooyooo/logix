# Feature Specification: UI Projection Contract（语义编排与 UI 投影解耦）

**Feature Branch**: `[032-ui-projection-contract]`  
**Created**: 2025-12-25  
**Status**: Draft  
**Input**: 将“展示态/路由/弹框栈”等 presentation state 明确建模为语义层（Scenario/Module）的状态与事件流；定义 Scenario Canvas 与未来 UI/Layout Editor 的对接契约：UI 只从绑定模块读取状态，并仅通过派发事件/动作触发语义层变化，做到彻底解耦与可多 UI 投影。

## Assumptions

- 不保证向后兼容：允许对平台侧蓝图与运行入口做破坏式调整，但必须提供迁移说明与示例更新。
- 以“Module 舞台”为主视角：Form 是一种特化 Module（kit），但平台能力必须能覆盖任意 Module/traits 的编排与投影。
- “代码是真相源”：编辑期以可执行表达式为主，但保存时必须同时固化一份可序列化、可 diff 的规范化表示与显式依赖。

## Motivation / Background

- 当平台要做“场景画布 + 多表单/弹框嵌套 + 动态列表回填”时，最容易失控的是：UI 自己维护展示态（打开/关闭/栈/路由）并直接读写别的模块，导致不可回放、不可解释、难以做 AI/自动化改写。
- 若把 presentation state 作为语义层模型（state + action + edge mapping）统一管理，UI 只负责投影与事件触发，则可以：
  - 支持多种 UI/Layout Editor 投影同一语义蓝图；
  - 让“行为/回填/校验/依赖”全部可追踪、可 diff、可试运行验收；
  - 为后续 sandbox/agent 改写提供稳定接口与确定性约束。
- 平台侧的 UI“连线/绑定”需要一个语义绑定协议（Binding Schema）：把逻辑端口（状态/动作/事件）与 UI 组件的 props/events 连接起来，并支持两种消费路径：预览期可解释执行、生产期可编译出码（可逃逸、避免 vendor lock-in）。

## Out of Scope

- 不交付 UI/Layout Editor 本体（本特性只定义对接契约与语义模型要求）。
- 不交付异步/IO 校验的正式方案（允许预留扩展点，但不把异步引入同步 rules/presentation 状态机的核心路径）。
- 不把平台升级为通用页面设计器（像素/布局细节不进入语义蓝图 SSoT）。
- 不规定具体组件库/渲染引擎/绑定运行时实现；只要求 Binding Schema 与其类型校验/可解释失败语义稳定且可替换。

## User Scenarios & Testing *(mandatory)*

### User Story 1 - UI 无状态化：展示态由语义层驱动 (Priority: P1)

作为平台/业务开发者，我希望 UI 层不再维护“弹框是否打开/栈顺序/路由”等真相源，只需绑定到某个模块实例并渲染其状态；所有打开/关闭/返回结果等行为都通过事件/动作在语义层完成。

**Why this priority**: 这是平台可解释与可演进的根；若 UI 继续拥有真相源，后续任何编排、回放、Agent 改写都会碎。

**Independent Test**: 在一个包含父弹框 + 动态列表 + 子弹框回填的场景中，只实现“渲染 state + 触发 action”的 UI，仍能跑通完整交互，并且行为可回放、可对照。

**Acceptance Scenarios**:

1. **Given** 一个父弹框模块实例，**When** 用户触发“打开子弹框”交互，**Then** 语义层状态更新为“子弹框已打开”，UI 仅通过渲染状态反映该变化（无需 UI 本地状态）。
2. **Given** 子弹框已打开，**When** 用户提交子弹框，**Then** 子弹框关闭、结果回填到父弹框指定位置，且该回填是通过语义层事件/动作完成（而非 UI 直接写父表单值）。
3. **Given** 同一场景在两套 UI 投影下运行（例如不同 Layout），**When** 重复上述交互，**Then** 语义行为一致（打开/关闭/回填一致），差异仅体现在布局投影。

---

### User Story 2 - 画布编排的是语义模型，不是界面像素 (Priority: P2)

作为平台使用者，我希望 Scenario Canvas 编排的是“模块实例 + 事件流 + 数据映射”，而不是 UI 组件树或像素布局；未来即使引入 UI/Layout Editor，也只是替换投影视图，不应改变语义蓝图。

**Why this priority**: 语义与 UI 混在一起会导致 diff 噪音、无法审阅、无法复用与难以做自动化改写。

**Independent Test**: 修改 UI 投影（布局/组件）后，语义蓝图的 diff 为空；反之修改语义蓝图（边/映射）后，行为改变可被试运行与 IR 对照验证。

**Acceptance Scenarios**:

1. **Given** 一个场景语义蓝图，**When** 仅调整 UI/Layout 投影数据（例如节点位置/布局分组/样式），**Then** 语义蓝图不发生变化，且行为不变。
2. **Given** 一个场景语义蓝图，**When** 调整语义边（事件→动作映射或回填映射），**Then** 行为发生对应变化，且该变化可通过可序列化证据/IR 对照验证。
3. **Given** 同一份 UI 投影绑定（Binding Schema），**When** 以“解释执行预览”和“编译出码产物”两种方式消费，**Then** 语义行为一致，差异仅体现在投影实现形态（可逃逸且无语义漂移）。

---

### User Story 3 - 禁止跨模块读取：UI 只读自身模块状态 (Priority: P3)

作为平台治理者，我希望 UI 表达式只允许读取“自身绑定模块实例”的状态，不允许直接读取其它模块实例的内部状态；若某个 UI 需要展示上游信息，必须由语义层显式镜像/聚合到自身模块的公开状态中。

**Why this priority**: 这是彻底解耦与可替换投影的必要条件；否则 UI 会形成隐式依赖，破坏模块边界与可回放链路。

**Independent Test**: 在编辑器中尝试让 UI 引用其它节点的状态，应被静态校验拒绝，并给出可行动修复建议（如何通过语义层暴露所需数据）。

**Acceptance Scenarios**:

1. **Given** 一个 UI 投影绑定到模块实例 A，**When** UI 试图引用模块实例 B 的内部状态，**Then** 平台必须拒绝并提示“通过语义层将 B 的所需信息暴露到 A 的公开状态”。
2. **Given** 语义层已将上游信息镜像到 A 的公开状态，**When** UI 渲染 A，**Then** UI 仅通过读取 A 的状态即可展示所需信息。

### Edge Cases

- 深层弹框栈与多分支路由：展示态如何保持确定性与可恢复（刷新/重进）。
- 动态列表重排/插入/删除后回填：必须以稳定行标识定位，禁止 index 定位导致错行回填。
- 事件竞态（双击打开/快速关闭/重复提交）：语义层必须给出确定性处理策略，避免 UI 本地状态发散。
- 被删除的行/已关闭的弹框仍收到返回事件：系统如何判定忽略、降级或给出可行动错误。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统 MUST 定义“语义蓝图（Scenario/Module）”作为 presentation state 的唯一事实源；UI/Layout 数据不得承载语义真相源。
- **FR-002**: 系统 MUST 提供可序列化的 presentation state 模型，至少覆盖：弹框/抽屉等 overlay 的打开/关闭与栈顺序、路由/步骤切换、聚焦/选择等常见展示态。
- **FR-003**: 系统 MUST 约束 UI 投影：UI 只能读取其绑定模块实例的公开状态，且只能通过派发该模块的事件/动作触发语义层变化；禁止 UI 直接读写其它模块的内部状态。
- **FR-004**: 系统 MUST 通过“事件 → 动作”的语义边来表达跨模块交互（例如子弹框提交→父弹框回填）；UI 侧的“写 patch”只能是动作语义的一种配置形式，不得绕过事件/动作语义直接跨边写状态。
- **FR-005**: 系统 MUST 支持“多 UI 投影同一语义蓝图”：UI/Layout Editor 通过稳定的模块实例标识进行绑定；替换 UI 投影不得改变语义蓝图与行为。
- **FR-006**: 系统 MUST 为动态列表提供稳定行标识机制，并要求所有跨弹框/跨模块回填基于稳定标识定位目标行（禁止 index 定位）。
- **FR-007**: 系统 MUST 提供对接契约，使未来 UI/Layout Editor 可以仅通过“读取公开状态 + 派发事件/动作”对接语义层；不要求 UI editor 了解 runtime 内部实现细节。
- **FR-008**: 系统 MUST 支持将语义蓝图与其依赖/映射关系固化为可 diff 的规范化表示（稳定排序、显式依赖、稳定标识），便于 CI 审阅与 AI/Agent 改写。
- **FR-009**: 系统 MUST 定义 UI 投影的语义绑定协议（Binding Schema）：将逻辑端口/状态路径映射到 UI props/events；平台必须能基于导出的端口/类型信息对绑定做类型与边界校验，并支持“预览解释执行”与“生产编译出码”两种消费模式。
- **FR-010**: 系统 MUST 提供 UI 组件库的“端口规格事实源”（`@logixjs/module.uiKitRegistry@v1`）：用于校验 `uiBlueprint.componentKey/propName/eventName` 并提供可补全的 props/events 列表；registry 必须支持 `tier=pro|ui|base` 等分层，以便平台按 Product/Dev 视图裁剪组件面板。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 本特性 MUST 不引入运行时热路径开销：展示态建模与投影对接仅影响平台/导出/宿主层与业务模块自身状态，不得强制 runtime 常驻观测或额外分配。
- **NFR-002**: 所有 presentation state 与映射产物 MUST 可序列化、确定性、可回放；不得包含随机/时间戳/机器特异信息作为默认值。
- **NFR-003**: 系统 MUST 提供结构化诊断信号，至少覆盖：展示态变更的事件来源、目标模块实例标识、关键映射摘要与失败原因；且在关闭诊断时接近零成本。

### Key Entities *(include if feature involves data)*

- **Scenario Blueprint（语义蓝图）**: 描述模块实例、事件流与映射关系的可序列化资产，是语义事实源。
- **UI Blueprint（投影蓝图）**: 描述 UI/Layout 如何绑定语义蓝图并渲染/触发事件的投影资产，不承载语义。
- **Binding Schema（语义绑定协议）**: UI Blueprint 内用于连接“逻辑插座（状态/动作/事件）”与“UI 插头（props/events）”的可序列化协议，支持预览解释执行与生产编译出码。
- **Presentation State**: 语义层中的展示态状态集合（overlay/route/stack/focus/selection 等）。
- **UI Kit Registry**: UI 组件库的端口规格事实源（componentKey + props/events/slots + tier），用于平台补全/校验与多视图裁剪（不要求绑定到具体 UI 库实现）。
- **Stable Instance / Row Identity**: 模块实例与动态列表行的稳定标识，用于回填与可回放对齐。

### Assumptions & Scope Boundaries

- UI 投影默认只读自身模块：跨模块展示需求必须通过语义层显式聚合/镜像到本模块公开状态中。
- 语义边的执行语义以“事件→动作→事务内写回”为基准，确保解释链路与回放一致；异步/IO 行为作为后续扩展点进入自定义模块节点，而非侵入同步 rules/展示态主线。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 在一个包含父弹框+动态列表+子弹框回填的代表性场景中，UI 仅通过渲染模块状态与派发事件即可跑通交互，无需维护 UI 本地展示态真相源。
- **SC-002**: 同一语义蓝图可被两套不同 UI/Layout 投影复用，行为一致；UI 投影的变更不会导致语义蓝图 diff 噪音。
- **SC-003**: UI 试图跨模块读取状态时会被静态校验拒绝，并给出可行动修复建议；通过语义层聚合后即可满足展示需求。
- **SC-004**: 动态列表在重排/插入/删除后，跨模块回填仍能准确定位到目标行（基于稳定行标识而非 index）。
- **SC-005**: 同一份 Binding Schema 可被“预览解释执行”和“生产编译出码”两种模式消费且语义一致；绑定类型/边界错误可在保存前被拦截并给出可行动提示。
- **SC-006**: 当 UI 投影引用不存在的 `componentKey/propName/eventName` 时，系统能基于 UI Kit Registry 在保存前拦截，并给出可补全候选与可解释错误；默认组件面板仅暴露 `tier=pro`，开发视图可按需暴露 `tier=ui/base`。
