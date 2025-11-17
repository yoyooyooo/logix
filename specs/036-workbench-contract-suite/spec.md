# Feature Specification: Workbench Contract Suite（031-035 统一验收与治理入口）

**Feature Branch**: `[036-workbench-contract-suite]`  
**Created**: 2025-12-25  
**Status**: Draft  
**Input**: 建立一个统一管控 031-035 的集成规格（Contract Suite / Integration Track）：以 `examples/logix-sandbox-mvp` 作为最小平台 Workbench，串起 TrialRun artifacts（含 `@logix/form.rulesManifest@v1`）、UI 投影与语义绑定边界、Scenario Canvas 语义蓝图、表达式/校验资产协议、以及 Module 端口/类型 IR 导出，定义端到端可验收的集成闭环与版本化治理口径；不新增实现细节，仅提供统一的验收与依赖关系裁决，避免各子 spec 漂移。

## Assumptions

- 本 spec 是“集成/治理入口”，不取代 031-035；各协议细节的 SSoT 仍分别在：
  - 031 TrialRun artifacts（补充 IR 槽位 + RulesManifest 首用例）
  - 032 UI 投影契约（UI 只做投影 + Binding Schema 两种消费模式）
  - 033 Module 舞台语义蓝图（Scenario Canvas 语义模型 + codegen）
  - 034 表达式/校验资产协议（规范化 IR + deps/digest + sandbox 约束）
  - 035 Module 端口/类型 IR（PortSpec/TypeIR 作为可引用空间 SSoT）
- 本 spec 的依赖关系以 `depends_on` 的强语义理解：若上游 spec 的核心成功标准未满足，本 spec 视为不可签收。
- 以 `examples/logix-sandbox-mvp` 作为“最小平台 Workbench”，只做消费者与验收跑通；正式平台未来可以无损替换。
- 不保证向后兼容：若 031-035 的协议需要破坏式演进，以版本化 key/协议升级为准。

## Dependencies

- depends_on:
  - `specs/031-trialrun-artifacts/spec.md`
  - `specs/032-ui-projection-contract/spec.md`
  - `specs/033-module-stage-blueprints/spec.md`
  - `specs/034-expression-asset-protocol/spec.md`
  - `specs/035-module-ports-typeir/spec.md`

## Motivation / Background

- `docs/specs/drafts/topics/sdd-platform/*` 提出了大量平台/协议设想，但如果缺少统一的“交付闭环/验收入口”，各协议容易各自演进形成并行事实源。
- 031-035 已经抽象出了“平台 ↔ runtime”最关键的五块契约；本 spec 的价值是把它们收束为一个可签收的里程碑：
  - 有一个统一入口说明依赖关系、验收闭环与版本化治理口径；
  - 让 Workbench 先把“可序列化 IR/证据链”跑通，后续平台只替换 UI/工作流，不重写协议。

## Out of Scope

- 不新增或改写 031-035 的协议字段与对外 API：它们仍以各自 spec 为 SSoT；036 只做“集成/治理口径”的收束。
- 允许新增 **治理层输出** 的版本化协议（例如 Integrated Verdict / Context Pack），作为 Workbench/CI/Agent 的可存档工件；其字段细节在 `$speckit plan` 阶段固化到 `specs/036-*/contracts/schemas/*`。
- 不交付正式平台产品形态；只定义以 Workbench 作为最小消费者的集成验收口径。
- 不把动态 Trace/Environment/EffectOp 的完整 schema 一次性纳入本特性（仍由各子 spec/后续 spec 版本化推进）。
- 不引入 AST 作为集成验收的事实源：本特性只以“可序列化工件 + 证据链”作为裁判；如未来出现 AST Patch，仅视为代码修改载体，不参与 verdict 推导。

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 一键集成验收：031-035 在同一条链路跑通 (Priority: P1)

作为平台/Runtime 维护者，我希望有一个统一的“Contract Suite”验收入口：对一个代表性模块进行受控试运行/检查后，能在同一份输出中看到 031-035 对应的可序列化工件（按可用性降级），并据此完成签收与回归。

**Why this priority**: 没有集成验收入口，各子协议即使“各自正确”也容易在组合时漂移；P1 目标是让平台替身（Workbench）能以最小成本跑通闭环。

**Independent Test**: 使用一个包含表单 rules 与跨模块交互的代表性场景，执行一次检查即可得到完整/部分的工件集合，并能判断 PASS/WARN/FAIL。

**Acceptance Scenarios**:

1. **Given** 一个代表性模块（包含表单 rules 与跨模块事件→动作边），**When** 执行一次受控试运行/检查，**Then** 输出包含 TrialRunReport 与版本化 artifacts，并能展示/导出以供审阅与 diff。
2. **Given** 模块包含表单 rules，**When** 执行检查，**Then** 输出包含 `@logix/form.rulesManifest@v1`（含 warnings），且可与 StaticIR/PortSpec 做同源对照。
3. **Given** 某个子协议工件缺失或截断（例如 TypeIR 超预算），**When** 展示与验收，**Then** 系统仍能完成降级验收（例如仅基于 PortSpec 做引用合法性校验），并给出可行动提示。

---

### User Story 2 - 版本化治理：合同守卫与破坏性变更可审阅 (Priority: P2)

作为团队维护者，我希望 031-035 的关键输出都可被稳定存储与 diff，并能用于 CI/评审发现破坏性变更（key 删除、可引用空间收缩、类型变化、规则身份变化等），避免平台侧“静默坏掉”。

**Why this priority**: 平台化后模块与协议会长期演进；没有统一治理口径，就无法形成可靠的审阅与回归。

**Independent Test**: 对同一模块的两个版本导出工件，diff 能稳定指出“破坏性变化 vs 非破坏性变化”，并给出可行动结论。

**Acceptance Scenarios**:

1. **Given** 两个版本的导出工件，**When** 做对比，**Then** 能识别破坏性变化（删除端口 key、收缩 exports、规则 ruleId 漂移等）并给出 PASS/WARN/FAIL。
2. **Given** 仅排序/展示字段变化，**When** diff，**Then** 不应产生噪音（确定性输出与稳定排序保证可审阅）。

---

### User Story 3 - Workbench 可迁移：平台替身与正式平台解耦 (Priority: P3)

作为未来平台实现者，我希望 Workbench 的消费方式不依赖 runtime 内部实现细节：它只消费“可序列化工件与稳定协议”，并保持足够独立的结构边界，以便未来迁移到正式平台时最小改动。

**Why this priority**: 这决定了我们现在的 demo 是否会变成“不可迁移的临时代码”。

**Independent Test**: 将 Workbench 视为纯消费者：替换底层模块集合或替换宿主，不需要改动协议解释逻辑即可继续工作。

**Acceptance Scenarios**:

1. **Given** Workbench 只拿到协议输出（TrialRunReport/Artifacts/PortSpec/TypeIR/资产元信息），**When** 替换模块集合或运行宿主，**Then** Workbench 仍可展示与验收，不需要读取 runtime 私有数据结构。

### Edge Cases

- 031-035 的某个 artifact key 版本升级：Workbench/CI 如何在版本缺失时降级并给出可行动提示。
- 报告超预算（整体 maxBytes 或单项预算）：如何在“可审阅摘要”下保持可用并避免静默失真。
- 构建态不纯导致试运行失败：如何把失败归因到“违反受控反射约束”并保持其他工件可用（若可用）。
- 模块动态组合导致类型投影不完整：如何显式降级而不是产生错误补全。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统 MUST 提供一个“Contract Suite”集成验收口径，明确 031-035 的依赖关系与组合预期，并将其作为统一签收入口（不取代子 spec）。
- **FR-002**: 系统 MUST 以 `examples/logix-sandbox-mvp` 作为最小消费者跑通集成验收：对代表性模块执行检查后，可展示与导出版本化工件集合（按 031-035 定义）。
- **FR-003**: 系统 MUST 定义“降级验收”语义：当某个子工件缺失/失败/超预算截断时，仍能基于其余工件完成可解释的验收结论，并输出可行动提示。
- **FR-004**: 系统 MUST 定义“破坏性变更”的统一判定口径（PASS/WARN/FAIL），覆盖至少：artifact key/version、端口 key/可引用空间、规则身份与关键元信息；并确保对比所需的输出确定性。
- **FR-005**: Workbench MUST 只依赖稳定的可序列化协议输出进行展示与验收；不得要求读取 runtime 私有内部结构作为事实源。
- **FR-006**: 系统 MUST 定义版本化、可序列化的治理层输出工件：`ContractSuiteVerdict@v1`（Integrated Verdict）与 `ContractSuiteContextPack@v1`（给 Agent/工具面的最小事实包）；它们必须可由 031-035 的工件推导（不引入第二事实源）。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 本集成特性 MUST 不引入运行时热路径开销：所有导出/验收为按需路径，并受预算/超时约束。
- **NFR-002**: 集成验收输出 MUST 确定性且可审阅：稳定排序、稳定字段、版本化 key；默认不包含随机/时间戳/机器特异信息。
- **NFR-003**: 验收失败/降级 MUST 可解释：至少包含缺失工件、预算/截断、违规（IO/非确定性）、版本不匹配等分类与最小上下文。

### Key Entities *(include if feature involves data)*

- **Contract Suite**: 由 031-035 定义的协议输出集合与集成验收口径（统一签收与回归入口）。
- **Workbench (Minimal Platform)**: 当前以 `examples/logix-sandbox-mvp` 承担的最小平台消费者角色，仅消费协议输出用于展示/验收。
- **Integrated Verdict**: 对一次集成验收给出的 PASS/WARN/FAIL 结论及其可解释原因摘要。
- **Contract Suite Context Pack**: 给 Agent/工具面使用的最小事实包（facts/constraints/target），可选携带平台输入（StageBlueprint/UIBlueprint/BindingSchema/UiKitRegistry/CodeAsset），但不读取 runtime 私有结构。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 对代表性模块执行一次检查即可得到可序列化、版本化的工件集合，并给出可解释的集成验收结论。
- **SC-002**: 同一输入重复导出与验收结果一致（确定性）；对两个版本的工件 diff 能稳定识别破坏性变化并产出可行动结论。
- **SC-003**: 当单项工件缺失/失败/截断时，系统仍能完成降级验收并明确指出缺口与修复路径（不静默通过）。
- **SC-004**: Workbench 作为消费者可迁移：替换宿主或模块集合时，不需要依赖 runtime 私有内部结构即可继续展示与验收。
