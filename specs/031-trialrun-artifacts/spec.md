# Feature Specification: TrialRun Artifacts（试运行补充 IR 工件槽位）

**Feature Branch**: `[031-trialrun-artifacts]`  
**Created**: 2025-12-25  
**Status**: Draft  
**Input**: 将 RulesManifest 明确为 Trial Run 的 Supplemental Static IR artifact，并通过统一 artifacts 槽位贯通 sandbox/CLI/devtools；平台侧当前以 `examples/logix-sandbox-mvp` 的 `/ir` 作为最小消费者。

## Assumptions

- 不保证向后兼容：允许对 TrialRunReport 契约做破坏式调整，但必须同步更新示例与文档。
- 平台侧当前以 `examples/logix-sandbox-mvp` 作为“最小平台”；未来真实平台将复用同一 artifacts 契约。
- 本特性只影响“检查/试运行/导出”链路；不要求为正常运行时增加额外开销。
- 本 spec 把 Trial Run 视为平台的“Loader Pattern 反射/试运行”基础能力：平台/CLI/Studio 可以在不直接读取源码细节的情况下，提取可序列化的 Manifest 与 Supplemental IR，作为 Lean Context Pack 与可回放证据链的一部分。

## Motivation / Background

- 表单 rules 已有一份可 JSON 序列化、稳定、预算受控的“规则清单 IR”（RulesManifest），包含 `ruleId/scope/deps/validateOn/list identity` 等解释语义，并且能输出 warnings。
- 当前最小 Static IR 在 check 节点上主要覆盖 `deps → reads` 的依赖信息，缺少 rules 的身份、scope、触发策略等解释语义。
- 因此 RulesManifest 适合作为“可解释层补充 IR”，与 Static IR 同源对照，供平台/Devtools 做解释、告警与 diff。

## Out of Scope

- 不在本特性内实现“按 `scope.fieldPath` 关联 Static IR check 节点”的富交互视图；先用通用 JSON viewer 展示 artifacts，后续增强单独规划。
- 不引入可执行 validator 资产协议（ValidatorAssets/validatorRef）与沙箱执行；本特性只做“静态摘要导出”。
- 不为每个 feature kit 单独新增 inspect API；统一走 artifacts 槽位。
- 不在本特性内定义 Trace IR / Environment IR / Effect Op Tree 等“动态链路工件”的 schema；artifacts 槽位只提供统一承载与约束，具体类型由后续 specs 版本化定义。

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 平台侧能看到 RulesManifest（Supplemental Static IR）(Priority: P1)

作为平台/Devtools 使用者，我希望在同一条“Trial Run → 报告 → `/ir` 展示”的链路里看到 RulesManifest 与 warnings，以便解释“规则是什么/依赖什么/在哪个 scope/何时触发”，并与 Static IR 做同源对照。

**Why this priority**: 这是把 RulesManifest 纳入通用 inspection 心智模型的最短路径；一旦贯通，后续其它 kit 的补充 IR 也能复用这条链路。

**Independent Test**: 选取一个包含表单 rules 的模块，在 sandbox 的 `/ir` 页面能直接看到 `@logixjs/form.rulesManifest@v1` 工件及其 warnings；对同一输入重复导出保持一致。

**Acceptance Scenarios**:

1. **Given** 一个包含 `@logixjs/form` rules 的模块，**When** 通过 sandbox 执行一次 `/ir` 检查，**Then** TrialRunReport 中包含 `artifacts`，且包含键 `@logixjs/form.rulesManifest@v1`，其内容可 JSON 序列化并可被通用 JSON viewer 展示。
2. **Given** 规则清单存在可行动告警（例如 deps 缺失、identity 缺失等），**When** 导出 RulesManifest artifact，**Then** artifact 同时携带 warnings，平台可直接展示或导出。
3. **Given** 一个不使用表单 rules 的模块，**When** 执行 `/ir` 检查，**Then** `artifacts` 可以为空或缺省，但 `/ir` 展示不应报错。

---

### User Story 2 - Feature Kit 可扩展导出补充 IR（OCP）(Priority: P2)

作为 feature kit 维护者，我希望无需修改 logix-core 的内部实现，就能把 kit 自己的“补充静态 IR 摘要”挂到 TrialRunReport 里，让 sandbox/CLI/devtools 统一消费。

**Why this priority**: 避免 inspection 表面积分散、各 kit 各做一套导出 API；同时让平台只需要理解一个“artifacts 槽位”。

**Independent Test**: 新增一个假想的 kit artifact（最小 JSON），不改动 core 的业务逻辑，只通过扩展点注册后即可在 TrialRunReport 中出现。

**Acceptance Scenarios**:

1. **Given** 一个 kit 声明了 artifact 导出能力，**When** 试运行模块并生成 TrialRunReport，**Then** report.artifacts 自动包含该 artifact（键稳定、内容可序列化）。
2. **Given** 两个导出者试图写入同一个 artifact key，**When** 导出 artifacts，**Then** 系统必须以可行动错误失败（避免静默覆盖），并指出冲突 key 与来源。
3. **Given** 某个导出者输出不可序列化值或抛出异常，**When** 导出 artifacts，**Then** TrialRunReport 仍应产出（尽可能包含其它 IR），同时以结构化错误标注该 artifact 导出失败。

---

### User Story 3 - Artifact 可预算、可截断、可 diff (Priority: P3)

作为平台/CI 使用者，我希望 artifacts 默认是 slim 的、可 JSON 序列化的，并且具有明确的 size budget 与截断标记；这样平台可以安全存储、展示与对比，不会因为体积或非确定性导致噪音。

**Why this priority**: 平台侧要把这些 IR 当作长期资产；没有预算与确定性约束会导致不可控的成本与 diff 噪音。

**Independent Test**: 对同一模块重复导出 artifacts 输出一致；当 artifact 超过预算时能看到明确的截断标记与可对比摘要。

**Acceptance Scenarios**:

1. **Given** 同一模块在同一版本中重复导出 TrialRunReport，**When** 对比 artifacts，**Then** 输出应保持一致（不包含时间戳/随机/机器特异信息）。
2. **Given** 某个 artifact 体积超过预算，**When** 导出 TrialRunReport，**Then** artifact 必须被截断并带有明确标记（例如 `truncated: true` + `budgetBytes`），且平台仍可安全展示。
3. **Given** 两个版本的模块 artifacts 发生变化，**When** 平台做 JSON diff，**Then** 变更应主要反映真实语义差异（排序/非确定性不应成为噪音来源）。

### Edge Cases

- artifact 体积接近预算上限：如何保证截断后的输出仍可被 JSON viewer 展示且不破坏整体报告结构。
- artifact 结构中包含大数组/深层嵌套：平台展示与 diff 的性能边界。
- artifact 导出者在模块启动阶段触发额外副作用：系统如何约束其只读与可控。
- 同一模块在不同环境（Node/Browser）导出 artifacts：结果一致性与可复现性要求。
- RulesManifest 与 Static IR 在同一模块上出现“同源不一致”（例如 deps/fieldPath 对不上）：平台如何发现与告警（本特性只要求导出与展示）。
- 构建态耦合运行态副作用：若反射/导出阶段触发 IO/网络或依赖运行态服务，应被视为可行动违规（而非静默成功），避免把“不纯构建态”引入平台 IR 链路。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统 MUST 在 TrialRunReport 中提供可选 `artifacts` 槽位，用于承载各 feature kit 的补充静态 IR 摘要；`artifacts` 必须可 JSON 序列化。
- **FR-002**: 系统 MUST 提供模块级扩展点，使 feature kit 能在 Trial Run 过程中导出 artifacts；新增 artifact 不应要求修改 core 的业务逻辑（符合 OCP）。
- **FR-003**: 每个 artifact MUST 使用稳定且版本化的 key（例如 `@scope/name@vN`）；同 key 在同版本下的结构与语义必须稳定，便于平台长期存储与对比。
  - key 的命名空间必须 **概念化**：`@scope/name` 表达“契约域/概念域”，而不是实现包名；避免使用 `core/sandbox/react` 等实现层前缀。
  - 允许 key 外观与 npm 包名相同（例如 `@logixjs/form.*`），但语义只视为“协议命名空间”，消费者不得据此推断 import 路径或实现落点。
- **FR-004**: artifacts MUST 有明确的体积预算（默认每个 artifact ≤ 50KB），并在超过预算时以显式截断标记输出，而不是静默丢失或导致报告失败。
- **FR-005**: artifacts 输出 MUST 具有确定性：字段顺序、数组顺序、枚举值等需保持稳定；不得包含时间戳/随机/机器特异信息。
- **FR-006**: 当出现 artifact key 冲突时，系统 MUST 失败并输出可行动错误（包含冲突 key 与来源），避免静默覆盖。
- **FR-007**: 当单个 artifact 导出失败（异常/不可序列化/超预算无法截断等）时，系统 MUST 仍尽可能产出 TrialRunReport（保留其它 IR 与 artifacts），并以结构化错误呈现失败原因。
- **FR-008**: `@logixjs/form` MUST 在 Trial Run artifacts 中导出 RulesManifest（首个用例），并同时导出其 warnings：
  - key: `@logixjs/form.rulesManifest@v1`
  - payload: `{ manifest, warnings }`（均可 JSON 序列化）
- **FR-009**: 平台侧（以 `examples/logix-sandbox-mvp` 作为最小平台）MUST 能在 `/ir` 展示 artifacts：至少提供一个通用 JSON viewer，能查看/复制/下载 artifact 内容。
- **FR-010**: Trial Run 的反射/导出环境 MUST 受控且默认只读：artifacts 导出不得触发 IO/网络/随机/时间戳等非确定性来源；如发生违规，必须以结构化错误呈现（包含 moduleId、artifactKey、violationKind），并保持“单项失败不阻塞其它 artifacts”的语义。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 在不触发 Trial Run/inspection 的正常运行路径中，本特性 MUST 带来接近零的额外开销（不引入新的常驻观测、缓存或热路径分配）。
- **NFR-002**: artifacts/错误/告警输出 MUST 是 slim 且可序列化的；任何诊断字段必须稳定可复现，并可用于解释链路（不引入第二套事实源）。
- **NFR-003**: Trial Run 的 artifacts 导出 MUST 受控：可配置时间与输出预算；超限必须以结构化错误或截断标记收束，避免悬挂与不可控膨胀。

### Key Entities *(include if feature involves data)*

- **TrialRunReport**: 受控试运行的结果封装，供平台/CLI/devtools 消费。
- **TrialRun Artifacts**: 以 `key → JSON` 的方式附加在 TrialRunReport 上的“补充静态 IR 摘要”集合。
- **Supplemental Static IR**: 不参与执行热路径，但用于解释、告警、对照与 diff 的静态摘要工件。
- **RulesManifest Artifact**: `@logixjs/form` 的补充静态 IR，描述规则清单（ruleId/scope/deps/validateOn/list identity 等）与 warnings。

### Assumptions & Scope Boundaries

- 本特性把 RulesManifest 定位为“可解释层补充 IR”，与最小 Static IR 并存且同源对照；不要求 core 静态 IR 在本阶段补齐 rules 的全部语义字段。
- 平台展示先以通用 JSON viewer 为主；富交互关联（按 `scope.fieldPath` 跳转/高亮）属于后续增强。
- artifacts 的内容只允许“摘要/清单/告警”；不得包含可执行代码或需要 IO 的产物。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 在 sandbox 的 `/ir` 页面，对一个包含表单 rules 的模块能看到 `@logixjs/form.rulesManifest@v1` artifact，且内容可 JSON 序列化并可展示。
- **SC-002**: 对同一模块重复导出 TrialRunReport，artifacts 输出保持一致（确定性）。
- **SC-003**: 当 RulesManifest 接近或超过预算时，artifact 仍可导出且带显式截断标记；平台展示不崩溃。
- **SC-004**: 新增一个非 form 的示例 artifact（最小 JSON）无需修改 core 业务逻辑即可出现在 TrialRunReport 中（验证扩展点有效）。
- **SC-005**: 在未触发 Trial Run/inspection 的场景下，核心运行路径没有可观测的性能回退（相对既有基线）。
- **SC-006**: artifacts 导出失败/冲突时，TrialRunReport 仍尽可能产出，并给出可行动错误信息，平台可直接展示。
