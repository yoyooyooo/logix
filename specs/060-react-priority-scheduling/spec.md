# Feature Specification: Txn Lanes（事务后续工作优先级调度 / 可解释调度；统一 Lanes 证据）

**Feature Branch**: `060-react-priority-scheduling`  
**Created**: 2025-12-29  
**Status**: Draft  
**Input**: User discussion: "把事务更新的优先级调度抽成独立 spec（类比 React 并发更新）；默认不启用；先把可验收边界与证据门禁写清；并把 Read Lanes / Txn Lanes 的车道证据与 Devtools 展示收敛到同一链路（吸收 057 的 US2），避免并行真相源。"

## Terminology

- **Txn Lanes（事务车道）**：对“一次用户交互触发的事务 + 事务后续工作（Follow-up Work）”进行优先级分层与调度的模型。注意：这里的 lane 指 **调度优先级**（主要作用于事务外的 Follow-up Work），避免与 `specs/057-core-ng-static-deps-without-proxy/` 的 **Read Lanes（读状态车道）** 混淆。
- **紧急更新（Urgent）**：必须在当前用户交互窗口内完成并可立即对外观察到的更新（例如输入回显、光标位置、关键校验/禁用态）。
- **非紧急更新（Non-urgent / Transition）**：可以延后执行以换取交互流畅性的更新（例如大列表过滤结果、非关键派生字段、装饰性 UI 状态），但必须保证“最终会跟上”，并有可度量的延迟上限。
- **后续运行时工作（Follow-up Work）**：事务完成后，为了让状态/派生/订阅/诊断链路保持一致而必须做的工作集合（例如：派生收敛、增量重算、补算/清空积压）。
- **积压（Backlog）**：由于优先级策略延后而尚未执行的 Follow-up Work 队列/集合。
- **调度预算（Budget）**：每个“调度窗口”允许用于处理非紧急积压的最大工作量（可以用时间、步数、或可解释的成本摘要来度量）。
- **饥饿保护（Starvation Protection）**：当积压长期得不到处理时的强制策略，用于保证非紧急更新不会无限期延后。
- **lane-aware queue（车道队列）**：当非紧急 backlog 已在队列中等待/执行时，紧急更新仍能优先被处理，避免“低优先级工作堵塞关键交互”的 p95 长尾。
- **Work loop（分片工作循环）**：非紧急 backlog 以分片方式逐步追平：每片遵守预算，并在片与片之间给紧急更新让路（但最终必达）。
- **Coalesce / Cancel（合并/取消）**：多次非紧急更新可合并（只保留必要的最新目标），并允许跳过已经被新输入覆盖的中间态工作（但不得破坏最终一致性）。
- **Default Switch Gate（默认切换门槛）**：把 Txn Lanes 从“显式 opt-in”切为“默认开启”之前必须满足的一组硬条件（证据门禁/性能预算、`diagnostics=off` 近零成本、可回退/对照、文档与迁移说明），以结构化结论裁决。

## Assumptions

- 同步事务边界仍是红线：事务窗口内禁止 IO/async；本特性不引入“可中断事务”。
- 本特性的 time-slicing 是“把 Follow-up Work 拆成多个独立调度窗口分批执行”，而不是“在单次事务中途打断”。
- 默认行为不变：未启用 Txn Lanes 时，运行时行为与性能基线应保持一致（不引入新的默认成本与心智模型）。
- 本特性面向 **core 与 core-ng 的共同契约**：即使只在其中一个内核先落地，也必须保证语义与证据口径可对照、可迁移。

## Out of Scope

- 不试图复刻 UI 框架内部的完整渲染调度器（例如渲染树级别的可抢占/可恢复），只聚焦“事务更新 + 事务后续工作”的优先级与可解释调度。
- 不在本特性中引入工具链/AOT 依赖；如需编译期生成调度计划，必须另立 spec（对齐 046 的工具链门禁）。
- 不在本特性中改变既有“静态错误硬失败”原则（例如 cycle/multiple-writers）；调度只能影响“何时执行”，不能吞掉“应当报错”的事实。
- 不在本特性中把 Txn Lanes 切为默认开启；默认切换属于 breaking change，必须另立 spec 并通过 Default Switch Gate（证据门禁 + 回退口径）。

## Related (read-only references)

- `specs/046-core-ng-roadmap/`（本特性需登记进 registry，作为“语义改变/调度模型”独立条目）
- `specs/045-dual-kernel-contract/`（跨内核一致性与证据跑道）
- `specs/043-trait-converge-time-slicing/`（既有的“派生收敛 time-slicing”最小闭环；Txn Lanes 不能与之冲突）
- `specs/044-trait-converge-diagnostics-sampling/`（采样诊断口径，与本特性需要的“可解释 backlog”强相关）
- `specs/057-core-ng-static-deps-without-proxy/`（Read Lanes：车道证据/展示需要与 Txn Lanes 统一，避免两套 lane 口径）
- `docs/specs/drafts/topics/react-adapter/03-concurrent-rendering.md`（并发渲染语境与“低优先级更新”的用户心智）
- `docs/specs/drafts/topics/runtime-v3-core/00-invariants-and-gates.md`（事务边界/证据门禁/稳定锚点不变量）

## Clarifications

### Session 2025-12-29

- Q: 默认开启吗？ → A: 默认不启用。不开启时应保持现状（同窗口即时完成既有工作），避免全仓隐式语义变化。
- Q: “延后”是不是“不更新”？ → A: 不是。“延后”只意味着 **优先级降低**：必须保证最终会更新，并能以“最长延迟上限 + 饥饿保护”避免无限期积压。
- Q: 能否直接类比 React 并发渲染的 time-slicing？ → A: 只能类比“优先级/让出/合并”，不能类比“打断事务”。Logix 的事务窗口仍是同步不可中断；time-slicing 发生在事务之外的 Follow-up Work 上。
- Q: 这对 core 收益还是 core-ng 收益？ → A: 目标是共同契约：core 先落地可直接收获；core-ng 需要在切默认前保证同语义同证据口径（否则 046/047 的对照与 Gate 会失真）。
- Q: 既然目标是 p95 明确受益，是否允许更激进的队列语义？ → A: 允许，但必须满足两条硬约束：紧急更新不被低优先级工作堵塞（p95 受益可证据化），且低优先级工作不会无限期饿死（上界 + 可解释饥饿保护）。

### Session 2025-12-30

- Q: 未来稳定后是否可以默认开启？ → A: 可以；默认开启迁移已在 `specs/062-txn-lanes-default-switch-migration/` 完成。060 作为能力与证据口径基线仍按“显式覆盖/回退”描述；Default Switch Gate（`diagnostics=off` 近零成本、Node+Browser 证据预算达标、forced_off/forced_sync 回退/对照、用户文档与迁移说明完整）以 062 为准。
- Q: Logix 的 lowPriority 与 React 的 `startTransition` 是一回事吗？ → A: 不是。Txn Lanes 延后的是 Logix runtime 内部的 Follow-up Work（以及可能的 ExternalStore 通知），而 `startTransition` 延后的是 React 渲染调度；两者可以组合，但用户文档必须明确它们各自影响的“时间窗口”与预期效果。
- Q: 需要利用现代浏览器的 `navigator.scheduling.isInputPending` 吗？ → A: 可以作为渐进增强：仅用于 non-urgent work loop 的“是否该让路”判定信号（帮助输入期间更快让路、空闲期间更快追平 backlog），但不是核心依赖；必须保留硬上界避免饿死渲染/paint，且在不支持环境下退化为纯时间预算策略（不改变语义）。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 关键交互优先，非关键更新可延后但会跟上 (Priority: P1)

作为业务开发者，我希望把同一次用户交互触发的更新分成“必须立刻跟上”和“可以晚一点再算”，从而在大规模状态/派生存在时仍保持输入与交互的流畅度。

**Why this priority**: 这是用户感知最强的价值：优先保证“交互不卡”，同时不牺牲一致性（非关键部分最终会跟上）。

**Independent Test**: 构造一个“高频输入 + 大量非关键派生/订阅”的模块：将非关键部分标记为低优先级后，验证关键交互的窗口耗时显著下降，且停止输入后非关键部分能在上界内追平。

**Acceptance Scenarios**:

1. **Given** 同一交互会触发关键更新与非关键派生更新，**When** 启用 Txn Lanes 并把非关键部分设为低优先级，**Then** 关键更新必须在当前窗口完成并可立即观察到，而非关键部分可以进入 backlog 并在后续窗口补算。
2. **Given** 连续高频输入导致 backlog 累积，**When** 输入停止，**Then** backlog 必须在配置的“最长延迟上限”内被清空（或进入可解释的饥饿保护策略）。
3. **Given** backlog 已经排队等待执行，**When** 用户继续触发紧急交互（例如输入继续发生），**Then** 系统必须保证紧急更新不会被 backlog 堵塞（紧急更新优先），且 backlog 会被合并/推迟到后续窗口继续追平。

---

### User Story 2 - 延后行为可解释，可定位“为什么慢/慢在哪” (Priority: P2)

作为运行时维护者或排障者，我希望在不依赖日志的情况下解释：哪些更新被降为低优先级、积压有多少、为什么没在当前窗口执行、预计何时会补算，以及是否触发了饥饿保护。

**Why this priority**: 不可解释的自动策略会把性能收益转化为调试成本与不信任。

**Independent Test**: 构造“正常延后/积压增长/触发饥饿保护/强制追平”四种场景，验证每次都能导出 Slim、可序列化、含稳定锚点的摘要证据。

**Acceptance Scenarios**:

1. **Given** 某个窗口主动延后了低优先级更新，**When** 诊断开启，**Then** 证据必须包含：lane 分类摘要、backlog 规模、延后原因（例如预算不足/策略选择）、以及后续补算的执行摘要。
2. **Given** backlog 已达到饥饿保护阈值，**When** 系统触发降级/强制追平，**Then** 必须输出结构化原因与结果摘要，并可与稳定锚点对齐（`moduleId/instanceId/txnSeq/opSeq`）。
3. **Given** backlog 被合并/取消（跳过中间态），**When** 诊断开启，**Then** 证据必须能解释“跳过了什么、为何可跳过、最终如何保证一致”。

---

### User Story 3 - 默认不变，支持快速回退与对照 (Priority: P3)

作为仓库维护者，我希望未启用 Txn Lanes 时完全不受影响；启用后也可以在模块/实例维度快速关闭或强制“全同步”以排查问题，并能对照验证开关差异。

**Why this priority**: 这是治理与推广前提：默认路径稳定、回退明确、对照可证据化。

**Independent Test**: 在关闭特性时跑完整回归与性能基线；在开启特性后，能按实例快速关闭并复现差异。

**Acceptance Scenarios**:

1. **Given** 未启用 Txn Lanes，**When** 运行既有回归/基线，**Then** 行为与性能不回归（在可接受误差内一致）。
2. **Given** 已启用 Txn Lanes，**When** 对某个实例强制关闭或强制全同步，**Then** 行为回到“同窗口立即完成”的模式，并产出可解释的对照证据（说明当前处于何种模式）。

---

### Edge Cases

- backlog 长期增长但交互一直高频，如何保证“最长延迟上限”与饥饿保护不会反向伤害关键交互？
- 低优先级更新依赖高优先级更新的派生链路，如何保证补算不会漏算/重复算且可解释？
- 多模块/多实例同时产生 backlog 时，调度是否需要公平性（避免某实例长期饿死）？
- 启用/关闭策略在运行期切换时，backlog 的归属与清理如何定义（避免“切换一次导致状态不可解释”）？
- core 与 core-ng 在实现细节不同的情况下，如何保证对外证据口径一致（避免 Gate 失真）？

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 定义 Txn Lanes（调度优先级）模型，并允许将 Follow-up Work 分为至少两档：紧急与非紧急；优先级差异必须可被验收用例观察到（而不是“仅内部标记”）。
- **FR-002**: 系统 MUST 提供显式 opt-in：未启用时保持既有默认行为与成本模型；启用范围至少支持模块/实例维度。
- **FR-003**: 系统 MUST 为非紧急更新提供“最长延迟上限”与饥饿保护策略，保证非紧急更新最终会跟上，且不会无限期积压。
- **FR-004**: 系统 MUST 将调度行为证据化：在诊断开启时，必须导出 Slim、可序列化的 lane/backlog 摘要，并能与稳定锚点对齐（`moduleId/instanceId/txnSeq/opSeq`）。
- **FR-005**: 系统 MUST 支持运行期临时覆盖（用于排查/回退/对照）：至少允许“强制全同步（忽略非紧急延后）”与“强制关闭本策略”，且覆盖本身必须可被证据解释。
- **FR-006**: 系统 MUST 与既有语义改变 spec 协同：不得破坏 `specs/043-trait-converge-time-slicing/` 的最小闭环；若需要扩展 043 的“立即/延后”模型，必须保持对外心智模型一致并提供迁移说明。
- **FR-007**: 系统 MUST 作为跨内核契约：core 与 core-ng 必须能在同一对照验证跑道下证明“同输入→同可观察结果（允许非紧急延后，但须满足延迟上界）”，并能通过结构化证据解释差异。
- **FR-008**: 系统 MUST 提供用户文档：以业务开发者视角解释“什么时候用、怎么选、怎么验证生效、如何回退”，并保持术语与证据字段一致（避免出现“只有实现懂的词”）。
- **FR-009**: 系统 MUST 提供 lane-aware queue：当非紧急 backlog 已排队等待/执行时，紧急更新必须可以优先执行（不被 backlog 堵塞），以获得可证据化的 p95 改善。
- **FR-010**: 系统 MUST 提供 Work loop：非紧急 backlog 必须按预算分片执行，并在片与片之间给紧急更新让路；同时必须提供饥饿保护以保证最终追平。
- **FR-011**: 系统 MUST 支持对非紧急 backlog 的合并/取消（coalesce/cancel）：同一类非紧急工作在新输入到来时可以合并或跳过中间态，但必须保证最终一致性与可解释证据（不能靠“猜测用户不会在意”）。
- **FR-012**: 系统 MUST 统一 “Txn Lanes + Read Lanes” 的车道证据链路：证据字段命名/投影口径应可被同一套 Devtools 汇总视图消费，避免把 lane 概念拆成两套不兼容协议（从而产生并行真相源）。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 触及核心路径的调度策略 MUST 定义性能预算，并产出可复现的 Node + Browser before/after/diff 证据（采集必须在独立目录中进行，以保证可比性）。
- **NFR-002**: `diagnostics=off` 下新增能力必须接近零成本：不得引入常驻分配/计时；不得在事务窗口内增加不可避免的解析成本。
- **NFR-003**: 证据与诊断必须使用稳定标识（不得依赖 random/time default）；输出必须 Slim 且可序列化（JsonValue）。
- **NFR-004**: 必须保持同步事务边界：事务窗口内禁止 IO/async；Follow-up Work 的调度与执行必须发生在事务外的独立窗口内，并可被证据链路解释。

### Key Entities _(include if feature involves data)_

- **TxnLane**：优先级分档（至少 urgent/non-urgent）。
- **TxnLanePolicy**：lane 的调度策略（预算、最长延迟上限、饥饿保护规则）。
- **Backlog**：待执行的 Follow-up Work 集合及其可解释摘要。
- **LaneEvidence（Slim）**：面向 Devtools/证据导出的可序列化摘要字段集合。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 在“高频交互 + 大量非关键派生/订阅”的基准场景下，启用 Txn Lanes 后，关键交互窗口的 p95 耗时相对“全同步策略”提升 ≥ 2×，且 backlog 存在时关键交互仍不被明显拖尾（p95/长尾无回归）。
- **SC-002**: 非紧急 backlog 在输入停止后能在“最长延迟上限”内追平（p95），并且在持续高频输入下不会无限期积压（饥饿保护可被触发且可解释）。
- **SC-003**: 未启用 Txn Lanes 时，既有回归与性能基线无回归（在可接受误差内一致）。
- **SC-004**: Devtools/证据能够解释一次“延后/补算/饥饿保护/强制追平”的因果链路：至少包含 lane/backlog 摘要、原因、以及稳定锚点对齐信息。
- **SC-005**: Devtools 至少提供一处 lanes 汇总视图，能同时回答：Txn backlog 状态 + selector lane 分布 + fallbackReason TopN，并能 drill-down 到稳定锚点（同 instance 可对齐到 txnSeq/opSeq）。
