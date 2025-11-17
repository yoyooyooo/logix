# Feature Specification: 018 定期自校准（库侧默认值审计 + 用户侧运行时自校准）

**Feature Branch**: `[018-periodic-self-calibration]`  
**Created**: 2025-12-20  
**Status**: Draft  
**Input**: User description: "创建个 spec做这这个“定期自校准”"

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

### User Story 1 - 库侧“定期默认值审计”：判断是否需要调整库内置默认值 (Priority: P1)

作为库作者/维护者，我希望有一套可周期性运行的“默认值审计”能力：它能在一组预定义的工作负载下，评估当前库内置默认配置与若干候选配置的差异，给出“是否需要更新内置默认值”的建议与证据（含不确定性与风险提示），从而让库默认值随版本演进保持合理、并能尽早发现回归。

**Why this priority**: 这是保证“库默认值”长期可靠的最短闭环：避免凭直觉改默认、也避免默认值长期停留在过时状态。

**Independent Test**: 运行一次审计后，系统能输出：当前默认值 vs 候选集合的对比、推荐结论（建议更新/不建议更新/证据不足）、以及可复现的证据与阈值；审计结论可被复跑验证一致性。

**Acceptance Scenarios**:

1. **Given** 审计运行完成，**When** 输出结论，**Then** 必须明确给出“是否建议更新内置默认值”的结论与理由，并附带可复现的证据。
2. **Given** 候选配置在关键指标上优于当前默认值，**When** 结论为“建议更新”，**Then** 必须同时满足安全约束（不触发止损/硬门失败）与稳定性阈值（结论可复跑一致）。
3. **Given** 审计过程中存在超时/缺指标/波动过大，**When** 结论生成，**Then** 必须显式标注不可比点位与不确定性，并避免据此推动默认值更新。

---

### User Story 2 - 用户侧“运行时定期自校准”：生成本机最优覆盖，不依赖库默认值 (Priority: P2)

作为应用维护者/高级用户（应用开发者），我希望在终端用户的真实环境中启用一套“运行时定期自校准”：它能在不影响交互体验的前提下，基于预定义工作负载探索候选控制面参数组合，并产出一个可解释的“本机推荐配置”，以应用侧默认覆盖生效；这套推荐不会修改库内置默认值，但可以帮助用户在不同硬件/电量/浏览器环境下获得更合适的表现。

**Why this priority**: 设备性能、负载与电量/温控会变化；没有“重校准”会让一次性推荐很快过期；但如果重校准影响交互，就会变成负收益。

**Independent Test**: 在交互活跃时触发校准，校准会暂停/降速；停止交互后恢复；推荐产物可复用（作为应用侧覆盖生效）且可一键回退到 baseline/builtin；并且校准频率受到节流约束（不会频繁重复）。

**Acceptance Scenarios**:

1. **Given** 校准正在运行，**When** 用户开始高频交互，**Then** 校准必须在短时间内暂停/降速，并在交互停止后可继续。
2. **Given** 在短时间窗口内多次触发“需要重校准”的信号，**When** 系统调度校准，**Then** 只会合并为一次校准（或按策略延后），不会导致持续后台高负载。

---

### User Story 3 - 可解释、可审计、LLM 友好 (Priority: P3)

作为评审者/LLM 使用者，我希望每次校准与推荐都能被解释与追溯：包含输入（工作负载/候选参数集合/安全阈值）、运行环境摘要、每个候选的关键指标、被淘汰的原因、最终推荐的理由与置信度，并且这些信息可被导出为可序列化数据供对比与复现。

**Why this priority**: 自校准属于“自动策略”，缺乏可解释性会让它无法被信任，也无法指导后续手动优化（例如收窄写入、稳定 rowId、拆分模块）。

**Independent Test**: 运行一次校准后，导出物可以被人和 LLM 直接读懂，并能把推荐结论追溯到具体指标与淘汰规则。

**Acceptance Scenarios**:

1. **Given** 一次校准完成，**When** 我查看或导出结果，**Then** 我能定位：推荐配置、对比基线、关键指标、以及每条推荐/淘汰规则命中的证据。

---

### Edge Cases

- 校准运行中被用户交互打断/取消后，如何恢复与是否需要丢弃部分样本。
- 校准输出出现明显抖动（超过稳定性阈值）时，如何标注“不可信”并建议复测。
- 工作负载与真实业务差异导致推荐不适配时，如何安全回退到 baseline / builtin。
- 版本升级导致 IR/诊断协议变化时，旧推荐如何判定为过期并重新校准。
- 设备电量/温控/后台限速导致校准无法完成时，如何避免无休止重试与资源消耗。

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: 系统 MUST 提供“库侧默认值审计”的入口（可周期性运行），并产出结论：建议更新/不建议更新/证据不足（含基线对比与证据）。
- **FR-002**: 系统 MUST 支持“将审计结论转化为可审查的默认值变更建议”，并明确需要满足的安全阈值与稳定性阈值。
- **FR-003**: 系统 MUST 提供“用户侧显式触发一次自校准”的入口，并能产出一份本机推荐配置（含基线对比与证据）。
- **FR-004**: 系统 MUST 支持“本机推荐配置作为应用侧默认覆盖生效”的模式，并提供一键回退到 baseline/builtin 的能力。
- **FR-005**: 系统 MUST 提供“周期/按需重校准”的调度策略，包含：节流（最短间隔）、失效条件（版本/环境/观测信号）与可取消性。
- **FR-006**: 系统 MUST 在校准期间识别“交互活跃/资源紧张”等不安全窗口，并暂停/降速校准，避免可感知的交互退化。
- **FR-007**: 系统 MUST 为每次审计/校准产物提供可解释输出：候选集合、淘汰原因、最终结论/推荐理由、以及不确定性/置信度说明。
- **FR-008**: 系统 MUST 确保推荐/建议满足安全约束：不得选择会触发止损回退（如 `outcome=Degraded`）或导致硬门失败的候选；若无安全候选则不产出推荐或保持 baseline。
- **FR-009**: 系统 MUST 支持结果的导出与复用：导出物必须可序列化、可追溯到具体 workload/候选/阈值，并可用于后续对比与复现。

### Assumptions & Dependencies

- 用户侧自校准默认关闭（opt-in）；这里的“用户”指应用开发者（App Developer），不是终端消费者；开启与“是否自动应用本机推荐”均由应用维护者显式决定。
- 库侧默认值更新不做“自动写入并发布”的黑盒策略：审计只产出可审查建议；是否采纳由维护者决策并通过常规发布流程完成。
- 本期审计/自校准的参数范围仅覆盖 013 控制面中与 converge 直接相关的旋钮（requestedMode 与预算），不扩展到其他缺少证据字段与语义口径的内置参数。
- 审计/校准结论只对“被校准的工作负载集合”负责；不同业务场景/设备环境可能存在不同最优值，系统必须显式呈现其适用范围与不确定性。
- 依赖：可复用的工作负载定义与对比跑道（014/017），以及可解释的 converge 证据字段（如 `traitSummary.converge`）。
- 依赖：converge synthetic workload 目前仍在 `packages/logix-react/test/browser/perf-boundaries/converge-runtime.ts` 与 `examples/logix-react/src/demos/PerfTuningLabLayout.tsx` 存在重复定义，需要抽取为可复用的 workload fixtures（收口到 `packages/logix-react/src/internal/perfWorkloads.ts`），以便在 Node/browser/Worker 复用并避免口径漂移（018/017/014 共用同一事实源）。

### Non-Functional Requirements (Performance & Diagnosability)

<!--
  If this feature touches Logix runtime hot paths, treat performance and
  diagnosability as first-class requirements:
  - Define budgets (time/alloc/memory) and how they are measured
  - Define what diagnostic events/Devtools surfaces exist and their overhead
-->

- **NFR-001**: 系统 MUST 定义“校准自身”的资源预算（总时长/占用上限/可取消延迟），并在默认关闭时保持近零额外开销。
- **NFR-002**: 系统 MUST 提供结构化诊断信号覆盖：校准调度状态、候选评估摘要、推荐产物与淘汰原因；并在诊断关闭时保持近零额外开销。
- **NFR-003**: 系统 MUST 使用稳定、可复现的标识表达校准过程与产物（例如实例/事务/操作的单调序号），不得默认使用随机/时间作为唯一锚点。
- **NFR-004**: 系统 MUST 保持事务窗口约束：校准不允许引入“事务窗口内 IO/异步”以及任何 out-of-transaction 写逃逸。
- **NFR-005**: 系统 MUST 维护统一最小 IR 与证据字段口径：校准使用的指标、证据字段与 Devtools 展示必须对齐（避免出现“脚本一套字段、UI 又一套字段”的并行真相源）。
- **NFR-006**: 若引入“自动策略”（例如默认加载最近推荐），必须同步更新高级用户文档，提供稳定心智模型、粗粒度成本模型、以及优化阶梯（默认 → 观测 → 收窄写入 → 稳定 rowId → 覆盖/调参 → 拆分/重构）。
- **NFR-007**: 用户侧自校准 MUST 避免在开始/暂停/恢复时产生可感知的主线程同步阻塞（例如大量数据准备/状态快照）；如无法保证则必须自动降级为不依赖大 State 的 workload 或延后执行。

### Key Entities *(include if feature involves data)*

- **Calibration Policy**：自校准策略配置（是否启用、触发条件、节流窗口、安全阈值、适用范围）。
- **Calibration Run**：一次校准运行记录（工作负载集合、候选集合、环境摘要、过程状态、最终结论）。
- **Recommendation**：推荐配置产物（推荐的控制面参数、适用条件、置信度、不确定性说明、回退信息）。
- **Calibration Evidence**：可解释证据（每个候选的指标统计、淘汰原因、对比基线的差值、以及稳定性摘要）。

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: 库侧审计在固定工作负载下输出“是否需要调整内置默认值”的结论，并可复跑验证一致性（允许波动，但结论一致：是否满足硬门/是否建议更新）。
- **SC-002**: 默认关闭用户侧自校准时，系统行为与性能边界不发生变化（对外零影响）。
- **SC-003**: 在交互活跃的情况下启用用户侧自校准，用户仍可持续完成核心交互；校准任务必须可被暂停/取消，且不会造成可感知的持续卡顿。
- **SC-004**: 推荐/建议满足安全约束：在其适用的工作负载下不触发止损回退（例如 `outcome=Degraded` 为 0）。
- **SC-005**: 推荐/建议相对 baseline 在关键指标上产生可度量的改进（例如 `commit wall-time` 的 median 与 p95 同时下降，或在稳定性阈值内不回归）。
- **SC-006**: 每份结论都可被解释与追溯：能定位到具体 workload/候选/阈值与淘汰规则，且导出物可被人和 LLM 直接消费。
