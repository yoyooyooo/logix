# Feature Specification: 017 调参实验场（基于 014 跑道，消费 013 控制面）

**Feature Branch**: `[017-perf-tuning-lab]`  
**Created**: 2025-12-20  
**Status**: Active（P1 已落地；持续扩展中）  
**Input**: User description: "直接把 调参实验场寻找最佳默认值加入到 014 作为 US"

> 实施落点与使用方式见：
>
> - `specs/017-perf-tuning-lab/quickstart.md`
> - `specs/017-perf-tuning-lab/plan.md`

## User Scenarios & Testing _(mandatory)_

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

### User Story 1 - 用参数 sweep 找到“最佳默认值”并给出证据 (Priority: P1)

作为 Runtime/内核维护者，我希望在 014 的性能实验场中，基于 013 已定义并落地的控制面（例如收敛策略/预算/覆盖等），用一组可枚举的“控制面参数组合”批量跑出可对比的性能/稳定性结果，并得到一个可解释的“推荐默认值”，以便在做性能升级或策略变更时，能够用证据驱动决策而不是凭感觉调参。

**Why this priority**: 这是把 014 从“测一次”升级为“可系统性探索最优默认”的关键能力，直接影响每次内核改动能否快速收敛到更好的默认配置。

**Independent Test**: 在固定环境下选择一个 baseline，并运行一次参数 sweep；系统能产出一份“可比较报告 + 推荐默认值 + 推荐理由”，且推荐结果可以被复现。

**Acceptance Scenarios**:

1. **Given** 已存在一份基线报告（Before），**When** 我对同一套 suite 运行一次参数 sweep，**Then** 系统输出每个参数组合的可对比结果，并给出一个“推荐默认值”。
2. **Given** sweep 过程中部分点位超时或缺数据，**When** 系统生成结论，**Then** 结论必须显式标注“不确定性来源”，并避免把不可对比点位计入“最佳默认值”的判断。
3. **Given** 我选择推荐默认值作为 After，**When** 生成 Before/After 对比结果，**Then** 结果必须明确标注是否存在回归、提升集中在哪些 suite/budget、以及是否触发任何硬门失败。

---

### User Story 2 - 评审者可复现与可审计 (Priority: P2)

作为评审者/发布负责人，我希望能用同样的输入（基线、环境信息、参数组合定义）复现同一份结论，并能审计每个结论来自哪些对比点位，避免“调参黑箱”。

**Why this priority**: 缺少可复现与可审计会导致性能结论无法在团队内达成共识，进而无法落地为默认策略。

**Independent Test**: 任意第三方在相同环境下，使用同一份 sweep 定义与基线，能够得到等价的对比结论（在已定义的稳定性阈值内）。

**Acceptance Scenarios**:

1. **Given** 一份 sweep 结论与其输入（基线/环境/参数集合），**When** 我重新运行一次 sweep，**Then** 系统给出的“是否回归/是否通过硬门/推荐默认值”结论一致（允许在稳定性阈值内波动）。
2. **Given** sweep 输出包含多个 suite，**When** 我查看某条结论（例如某个预算阈值变化），**Then** 我能定位到它对应的具体 suite/budget/参数 where 与对比值来源。

---

### User Story 3 - LLM 可自动读懂并生成结论摘要 (Priority: P3)

作为使用 LLM 辅助的内核维护者，我希望把 sweep 的输入与结果交给 LLM 后，它能稳定产出结构化总结（通过/回归/提升/不确定性/建议下一步），减少人工读原始数据的成本。

**Why this priority**: 014 产物面向长期迭代；让 LLM 能可靠消费是规模化维护的前提。

**Independent Test**: 给定一份对比结果，LLM 能输出固定格式的摘要，并且摘要中每个结论都能被追溯到具体 suite/budget/where。

**Acceptance Scenarios**:

1. **Given** 一份 sweep 结果与 Before/After 对比结果，**When** 交给 LLM，**Then** 它输出的摘要包含：硬门是否通过、回归是否为 0、最显著的提升/回归点、以及不确定性说明。

---

### Edge Cases

- Before 与 After 的 suites 不一致，导致无法严格对比时，应如何输出“仅现状/不可对比”的结论。
- 某些点位出现超时/失败/缺指标时，如何避免错误地把它当作“更快/更慢”。
- 不同参数组合下出现明显抖动（超过稳定性阈值）时，如何标注并建议复测。
- 参数组合数量过大导致总体运行成本超出预期时，如何安全降级（例如分批/提前 cutOff/只输出部分结论）。

## Requirements _(mandatory)_

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: 系统 MUST 支持以“参数组合集合”为输入，对同一套实验矩阵运行可批量对比的实验（参数 sweep）。
- **FR-002**: 系统 MUST 为每个参数组合产出可比较的结果摘要，至少包括：关键预算是否通过、阈值上限（max level）与缺失/超时原因。
- **FR-003**: 系统 MUST 在 sweep 结束后输出“推荐默认值”，并给出可审计的推荐理由（例如：优先满足硬门、回归为 0、在主要场景提升最大、不确定性最小）。
- **FR-004**: 系统 MUST 支持“模拟旧状态/回退基线”的参数配置，以便在同一实验场中对照“旧默认 vs 新默认”。
- **FR-005**: 系统 MUST 输出可复现信息，使得第三方可以在相同环境下复现同一结论（在稳定性阈值内）。
- **FR-006**: 系统 MUST 显式处理不可对比情况（缺 suite/缺点位/指标不可用），并在结论中标注不确定性来源。
- **FR-007**: 系统 MUST 把本能力作为 014 的一个用户故事纳入其文档导航，让人/LLM 都能找到“如何跑、如何读、如何做对比、如何据此选默认值”。
- **FR-008**: 系统 MUST 明确以 013 的控制面定义作为唯一事实源：本特性只做“实验与推荐”，不重新定义/复制控制面语义，避免口径漂移。
- **FR-009**: 系统 MUST 维护一份“可调旋钮清单”（面向人/LLM 都能读懂），至少覆盖：013 控制面之外仍可影响性能/观测开销的内置参数，并标注每个旋钮当前是否已被 014 的实验矩阵与证据字段覆盖。

### Non-Functional Requirements (Performance & Diagnosability)

<!--
  If this feature touches Logix runtime hot paths, treat performance and
  diagnosability as first-class requirements:
  - Define budgets (time/alloc/memory) and how they are measured
  - Define what diagnostic events/Devtools surfaces exist and their overhead
-->

- **NFR-001**: 本特性 MUST 以 014 的 PerfReport/PerfDiff 作为唯一证据口径；推荐结论必须记录完整复现输入（profile/matrixId/候选集合/关键环境指纹），避免“只能口头复述怎么跑的”。
- **NFR-002**: 如需新增证据字段/诊断事件以支撑调参解释链路，必须声明诊断开销分档（off/light/full）并给出可复现的测量方式；默认关闭时保持近零额外开销。
- **NFR-003**: 与回放/诊断相关的实例/事务标识 MUST 稳定可重建（不得默认随机/时间作为唯一锚点），以保证 Before/After 与 sweep 的证据可对齐。
- **NFR-004**: 事务窗口 MUST 保持纯同步边界：调参能力不得引入事务内 IO/async，也不得引入可写 Ref 逃逸；任何采集/落盘发生在事务外。
- **NFR-005**: 若调参能力推动了默认策略或性能边界变化，MUST 同步更新高级用户文档，提供稳定心智模型（≤5 关键词）、粗成本模型与优化梯子（默认 → 观测 → 缩小写入 → 稳定 rowId → 覆盖/调参 → 拆分/重构），并确保术语/证据字段在 docs/benchmarks/devtools 间一致。

### Key Entities _(include if feature involves data)_

- **参数组合（Parameter Set）**：一组可枚举的控制面参数取值；可被命名、可比较、可复现。
- **实验运行（Experiment Run）**：一次 sweep 的运行记录，包含环境信息、采样配置、以及各 suite 的结果摘要。
- **对比结果（Comparison）**：Before/After 的对比输出，能指出回归/提升点与不确定性。
- **推荐默认值（Recommendation）**：从参数组合集合中挑出的候选默认值，包含理由与证据引用。
- **控制面（Control Plane, 013）**：被 sweep 的参数语义集合（策略/预算/覆盖），作为本特性的上游事实源。

## Success Criteria _(mandatory)_

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: 在固定环境下，用户可以在一次 sweep 中得到“推荐默认值 + 可审计理由 + 可比较报告”，且无需人工阅读原始数据才能判定“是否回归”。
- **SC-002**: 在固定环境下，对同一份 sweep 输入重复运行 2 次，关键结论（是否通过硬门/是否存在回归/推荐默认值）一致；若不一致，系统能显式标注“不确定性来源”。
- **SC-003**: 对于定义了硬门的关键场景，系统能明确判定硬门是否通过，并在失败时指出第一个失败 level 与原因（超预算/缺数据/超时/指标不可用）。
- **SC-004**: 对比输出支持“零回归”作为发布门槛：当存在回归时，输出必须指出最显著回归点及其影响范围（哪条预算/哪个场景/哪组参数）。
- **SC-005**: 文档交接达标：人类读者与 LLM 都能在 10 分钟内理解如何运行 sweep、如何解读结论、以及如何基于结论选择或回退默认值。

## Assumptions & Dependencies

- 假设：014 已存在可比较的基线产物或可以快速生成基线；并且实验矩阵对“同机同配置”有明确要求。
- 假设：控制面参数可以被枚举为有限集合（即使后续扩展，也应保持可比较性）。
- 依赖：014 作为性能证据与对比的唯一事实源（矩阵、报告结构与解读口径不漂移）。
- 依赖：013 作为控制面参数语义与证据字段的事实源；017 不新增第二套控制面口径，仅消费并用于实验与推荐。
- 旋钮清单（FR-009 产物）：`specs/017-perf-tuning-lab/knobs.md`。
