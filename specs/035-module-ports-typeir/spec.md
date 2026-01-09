# Feature Specification: Module Ports & TypeIR（端口/类型 IR 作为平台 SSoT）

**Feature Branch**: `[035-module-ports-typeir]`  
**Created**: 2025-12-25  
**Status**: Draft  
**Input**: 定义 `ModulePortSpec@v1` 与 `TypeIR@v1` 作为平台智能提示/依赖安全的事实源：通过 TrialRunReport.artifacts（031）导出模块端口、可引用路径空间与类型 IR（预算/截断/确定性/diff 语义），供 Scenario Canvas、表达式编辑器与 lint 消费；并定义缺失/降级/冲突/失败的可行动语义。

## Assumptions

- 平台侧的智能提示与依赖安全以导出的 `ModulePortSpec/TypeIR` 为准（SSoT），而不是靠手工配置或 UI 推断。
- 端口/类型导出属于“检查/试运行/导出”链路：不影响正常运行时热路径。
- `ModulePortSpec/TypeIR` 必须可 JSON 序列化、可 diff、预算受控，并能与 ModuleManifest/Static IR 同源对照。
- 本 spec 依赖 `031-trialrun-artifacts` 的 artifacts 槽位导出，并作为 `033-module-stage-blueprints`（场景编排）与 `034-expression-asset-protocol`（表达式/校验资产）的类型与可引用空间事实源。

## Motivation / Background

- 平台要做 n8n 式补全与安全引用，必须知道：
  - 节点有哪些可触发事件/动作（inputs）与可引用输出（outputs）；
  - 当前节点可公开读取哪些状态路径（exports）；
  - 这些端口与路径的类型是什么（用于 autocomplete、lint、映射类型检查）。
- 仅有 actionKeys/staticIr 不足以支撑“表达式中可引用空间”的严格约束；平台如果自造推断，会形成第二份不可回放事实源。
- 因此需要统一导出协议：通过 trial-run artifacts 输出版本化的端口与类型 IR，供平台/CLI/devtools 同链路消费。
- 这份导出同时扮演“逻辑侧 Manifest / Available Sockets”：为 UI 语义绑定协议提供可绑定端口清单，并为 CI 合同守卫提供可 diff 的证据（端口 key/可引用空间/类型变化）。

## Out of Scope

- 不要求一次性覆盖所有类型细节（允许 TypeIR 分阶段演进），但必须保证“引用空间与端口 key”层面稳定可用。
- 不要求平台在本阶段支持任意复杂泛型/递归类型的完整还原；超出预算可截断并给出可解释降级。
- 不把端口/类型导出扩展为运行时强制校验（运行时仍以类型系统与出码产物为主）；此处是平台侧治理与提示能力。
- 不在本特性内定义 EnvironmentRequirements / EffectOp / Trace 等动态 IR 的 schema；但 PortSpec/TypeIR 应能与未来动态工件同源对照（moduleId/slot/ruleId 等锚点一致）。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 平台基于 PortSpec/TypeIR 做 autocomplete 与引用安全 (Priority: P1)

作为平台使用者，我希望在画布与表达式编辑器中获得可靠补全：只能引用已连线的上游输出与自身公开状态；并且能在保存前发现引用错误与类型不匹配。

**Why this priority**: 没有可靠的“引用空间 SSoT”，平台的编排与出码会不可控且难以审阅。

**Independent Test**: 选取一个包含表单提交事件与回填映射的场景，表达式编辑器只允许引用可达端口；错误引用会被拒绝。

**Acceptance Scenarios**:

1. **Given** 一个模块对象与其试运行报告，**When** 平台读取 artifacts，**Then** 获得 `ModulePortSpec@v1` 与 `TypeIR@v1`，并可用于生成补全候选集。
2. **Given** 表达式试图引用未连线的上游节点输出，**When** 用户保存映射，**Then** 平台必须拒绝并给出可行动提示（需要连线或通过语义层暴露）。
3. **Given** 表达式引用空间合法但类型不匹配，**When** 保存，**Then** 平台必须给出类型不匹配提示并阻止保存或要求显式降级。

---

### User Story 2 - 端口/类型 IR 可 diff，用于 CI 与破坏性变更检测 (Priority: P2)

作为团队维护者，我希望在模块升级时能通过导出的 PortSpec/TypeIR 发现破坏性变更（端口 key 删除/类型变化/可引用路径收缩），并在 CI 中形成可审阅的 diff 证据。

**Why this priority**: 平台化后模块会成为长期资产，没有可 diff 的端口/类型契约就无法治理。

**Independent Test**: 对同一模块的两个版本导出 PortSpec/TypeIR，diff 能检测端口变化与类型变化（至少在 key 层面可靠）。

**Acceptance Scenarios**:

1. **Given** 模块版本迭代导致 action key 删除或 payload 类型变更，**When** 对比前后 PortSpec/TypeIR，**Then** 能明确识别并给出可行动结论（PASS/WARN/FAIL）。
2. **Given** 仅 meta/展示信息变化，**When** diff，**Then** 不应产生破坏性噪音（稳定排序与摘要字段保证可审阅）。

---

### User Story 3 - 导出链路可扩展且有预算/截断/失败语义 (Priority: P3)

作为 runtime/kit 维护者，我希望新增端口或类型导出能力不会破坏已有协议；当类型过大/递归过深时，导出能按预算截断并给出解释，而不是让平台崩溃或静默失真。

**Why this priority**: 端口/类型信息一旦进入平台核心链路，必须可控、可扩展、可失败且可解释。

**Independent Test**: 构造一个类型很大或递归的模块导出，验证 TypeIR 被截断并标注预算与截断原因；其余导出仍可用。

**Acceptance Scenarios**:

1. **Given** TypeIR 超过预算，**When** 导出 artifacts，**Then** 以显式截断标记输出（包含 budget 与摘要），平台仍可使用 PortSpec 做补全与安全引用。
2. **Given** 两个导出者试图写入同一 artifact key，**When** 生成 TrialRunReport，**Then** 系统必须以可行动错误失败（避免静默覆盖）。
3. **Given** 单个导出者失败，**When** 生成 TrialRunReport，**Then** 报告仍应尽可能产出并包含其它 artifacts，同时标注该 artifact 导出失败原因。

### Edge Cases

- 端口/类型信息与实际运行不一致（漂移）：平台如何发现与告警（本特性要求“同源对照”字段）。
- 类型递归/联合爆炸：如何预算与截断，使平台仍可用且可解释。
- 多环境导出（Node/Browser）差异：PortSpec/TypeIR 必须保持确定性（或明确标注差异来源）。
- 模块未提供足够类型信息：如何降级（只用 key 空间）而不是阻塞平台。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 定义版本化 artifact：`ModulePortSpec@v1` 与 `TypeIR@v1`，并通过 TrialRunReport.artifacts 导出；artifact 必须可 JSON 序列化。
  - artifact keys（稳定且版本化；**概念域命名**，不绑定实现包名）：
    - `@logixjs/module.portSpec@v1`
    - `@logixjs/module.typeIr@v1`
- **FR-002**: `ModulePortSpec@v1` MUST 至少包含：可触发动作/事件 key、可引用输出 key、可公开读取的状态路径空间（exports），端口分类与稳定寻址信息，以及与 moduleId 的绑定信息。
- **FR-003**: `TypeIR@v1` MUST 为 PortSpec 中涉及的端口 payload 与公开状态提供类型引用/摘要，并以“扁平、具体的类型投影”作为默认消费形态；超出预算时必须可截断并带显式标记。
- **FR-004**: artifacts MUST 有预算与截断语义（字节/深度/节点数等）；平台必须能区分“完整”与“截断”并采取降级策略。
- **FR-005**: 导出结果 MUST 确定性：稳定排序、稳定字段、禁止时间戳/随机/机器特异信息；以便 diff 与缓存。
- **FR-006**: artifacts key 必须稳定且版本化；key 冲突必须失败并输出可行动错误；单个 artifact 失败不应阻塞其它 artifacts 的产出（尽可能产出并标注失败）。
- **FR-007**: PortSpec/TypeIR MUST 可与 ModuleManifest/Static IR 同源对照（至少 moduleId/actionKeys 对齐）；若不一致必须产生可行动告警或失败。
- **FR-008**: 平台 MUST 能仅依赖 PortSpec/TypeIR 生成 autocomplete 与引用安全检查；当 TypeIR 缺失或截断时，平台至少仍能基于 key 空间做引用合法性校验。
- **FR-009**: PortSpec/TypeIR MUST 以“实际可运行模块对象的最终形状”为准（覆盖动态组合/特性开关等场景），避免平台依赖脆弱的源码推断而形成并行事实源；若无法确定应显式降级并给出可行动提示。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 本特性 MUST 不增加运行时热路径开销；端口/类型导出只在 trial-run/inspection 路径执行。
- **NFR-002**: 诊断必须可解释：导出失败/截断/不一致必须提供结构化原因与最小上下文（moduleId、artifactKey、预算摘要）。
- **NFR-003**: 导出协议必须可扩展且向前演进：新增字段不破坏旧消费者，破坏性变更必须通过版本化 key 表达。

### Key Entities _(include if feature involves data)_

- **ModulePortSpec@v1**: 模块端口与可引用空间的可序列化描述（平台补全与安全引用的 SSoT）。
- **TypeIR@v1**: 与 PortSpec 对应的类型摘要/引用 IR（用于类型检查与更强补全）。
- **TrialRunReport.artifacts**: 统一承载补充 IR 的槽位（与 031 对齐）。
- **Logic Manifest (Available Sockets)**: 逻辑侧可绑定端口清单的语义角色，由 PortSpec/TypeIR 承担并供 Binding Schema 消费。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 平台可仅基于导出的 PortSpec/TypeIR 为表达式编辑器提供 n8n 式补全，并阻止非法引用。
- **SC-002**: PortSpec/TypeIR 可稳定导出并可 diff：关键破坏性变更（端口删除/类型变化/可引用空间收缩）可被检测并给出可行动结论。
- **SC-003**: TypeIR 超预算时可截断且平台仍可用（至少 key 空间可用）；截断/失败原因可解释。
- **SC-004**: 导出 key 冲突与单项失败语义明确：冲突失败、单项失败不阻塞其它导出且可行动。
- **SC-005**: PortSpec/TypeIR 能在动态组合场景下仍保持“与实际可运行形状一致”的确定性导出；当无法完整投影时，平台可基于显式降级信息继续提供安全引用与可行动提示。
