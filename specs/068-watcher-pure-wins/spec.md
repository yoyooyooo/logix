# Feature Specification: Watcher 纯赚性能优化（全量交付，不拆短/中长期）

**Feature Branch**: `068-watcher-pure-wins`  
**Created**: 2025-12-31  
**Status**: Draft  
**Input**: User description: "那新建个需求吧，先把短期纯赚、中长期纯赚都写进去"

## Background

当前 Logix Runtime 中，`$.onAction / $.onState` 这类 watcher 通常会随着业务复杂度自然增长，形成两类典型压力：

1. **Action fan-out 压力**：高频 Action 在发布时会触达大量 watcher；无关 watcher 也可能参与一次“过滤/判定”，并在极端情况下形成背压，放大 dispatch 延迟。
2. **State 通知压力**：每次可观察提交都会触发状态订阅链路；若订阅无法声明依赖范围，则容易退化为“每次提交都重算/去重”，导致 commit 侧成本随 watcher 数线性增长。

本 spec 的目标是固化一组**必须全量交付**的 watcher 性能纯赚优化，并把成功标准锁死为可回归的性能证据与可解释的诊断锚点（实现顺序由 `plan.md` / `tasks.md` 决定）。

## Terminology

- **Watcher**：绑定在模块实例生命周期上的长期运行“监听规则”，对 Action 或 State 变化作出响应。
- **Fan-out**：一次变化（Action 发布/State 提交）需要触达的 watcher 数量，以及触达过程中产生的调度/判定/背压成本。
- **纯赚（Pure Win）**：不改变业务语义，只移除不必要的运行期开销或无关触达；默认档位不得出现负优化。
- **编译期优化（Compilation Enhancement）**：一种可选的构建期增强，可产出可被运行时消费的静态化信息（例如依赖/传播表）；未启用时运行时仍可保守正确地执行。
- **可回退（Fallback）**：当无法证明某段逻辑可静态化时，系统自动回退到运行时保守路径，并能解释“为何回退”。
- **保守正确（宁可放过不可错杀）**：任何编译/静态化只在能证明语义等价时生效；不确定则回退，绝不以“误优化”换取表面性能。

## Scope

### In Scope

- 建立 watcher 压力回归用例：覆盖高频 Action、多 watcher、多模块协作、销毁/回收，能稳定发现“泄漏/灾难性退化”。
- Action 分发在不改变语义前提下减少无关触达：高频场景下，Action 的传播成本应主要与“相关 watcher”相关，而不是与“系统总 watcher 数”相关。
- State 订阅在可声明依赖时做到增量通知：当一次提交与订阅依赖无交集时，不应触发重算/handler 执行；对无法静态声明依赖的订阅，应提供可诊断的安全回退与严格门禁选项。
- 将“主状态转移（Primary Reducer）”与 watcher 联动职责分层：主路径应是纯同步且可被识别的，watcher 只承担联动与副作用。
- 定义并固化最小化的“响应式图谱/传播 IR”：能把“写入影响哪些 watcher/steps”表达为稳定标识与可序列化表结构，并可在默认档位下零成本关闭其物化与导出。
- 定义“闭包可处理性分型”的裁决口径（例如可编译/可批处理/不可分析），确保任何自动化优化只对可证明不负优化的子集生效，并且可通过证据解释为何降级/回退。
- 编译期优化必须可选且可回退：未启用时运行时能力完整且语义一致；启用时仅对可证明语义等价的子集生效，其余回退并可解释。

### Out of Scope (Non-goals)

- 不改变业务语义：Action 的可达性/顺序/可靠性约束不在本 spec 内改动；任何“丢弃/重排/合并”语义只能显式 opt-in。
- 不把“引入新的执行后端/运行时后端替换”作为本 spec 的交付目标；本 spec 只固化静态化路线的契约与成功指标。
- 不引入兼容层；如涉及破坏性变化，必须提供迁移说明并遵循 forward-only evolution。

## Related (read-only references)

- `specs/014-browser-perf-boundaries/`（浏览器侧性能跑道与门禁）
- `specs/067-core-pure-perf-wins/`（默认档位零诊断税与单内核边界）
- `docs/specs/drafts/topics/runtime-v3-core/03-perf-regression-suite.md`（watcher 压力回归用例草案）
- `docs/specs/drafts/topics/module-definition-future/03-primary-reducer.md`（Primary Reducer 与 watcher 分层草案）
- `docs/specs/drafts/topics/logix-ng-architecture/01-compiler-driven-runtime.md`（编译器驱动运行时：构建期前移的路线草案）
- `docs/specs/drafts/topics/logix-wasm-endgame/20-reactivity-graph-ir.md`（Reactivity Graph IR 草案）
- `docs/specs/drafts/topics/logix-wasm-endgame/25-closure-taxonomy-and-compilation.md`（动态闭包税与编译化分型草案）
- `docs/specs/drafts/topics/logix-wasm-endgame/26-ast-lift-and-dsl-subset.md`（AST lift 与可证明子集：保守正确的编译入口草案）

## Assumptions & Dependencies

### Assumptions

- 默认档位以“业务语义不变、只减少无关触达/无谓开销”为第一原则；任何改变行为的策略必须显式 opt-in。
- 性能结论以“可复现的证据对比”为唯一口径；不接受仅凭主观体验的“看起来更快”。

### Dependencies

- 依赖现有的性能证据与回归跑道体系（Node 与浏览器侧基线与对照），并与其指标口径保持一致。
- 依赖稳定标识（实例/事务等）的既有约束，确保诊断锚点与证据可对齐、可回放。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Watcher 压力可回归（防泄漏/防灾难退化） (Priority: P1)

作为 Runtime 维护者，我需要一组可重复运行的 watcher 压力用例，能够在引入新特性或重构后稳定发现“资源泄漏、吞吐/延迟灾难性退化”，并给出可解释的定位线索。

**Why this priority**: 没有回归门禁，watcher 成本会随业务演进悄悄线性爬升，直到在真实仓库里爆炸才暴露，修复代价极高。

**Independent Test**: 仅实现该故事即可独立运行压力用例，并在出现“泄漏/退化”时稳定失败。

**Acceptance Scenarios**:

1. **Given** 一个模块实例在高频 Action 下运行并启动大量 watcher，**When** 连续触发足够多次事件与提交，**Then** 关键资源指标（活跃 watcher/订阅/Fiber 等）在稳定上界内，不随事件次数继续增长。
2. **Given** 多模块协作与跨模块监听链路，**When** 相关模块实例被销毁/回收，**Then** 不再有事件从已销毁实例流出，且关键资源指标回落到销毁前的基线范围。

---

### User Story 2 - Action 分发不被无关 watcher 拖慢 (Priority: P1)

作为业务开发者，我希望在存在大量 watcher 的系统中，派发某类高频 Action 时只为“相关 watcher”付费；无关 watcher 的数量与慢速行为不应显著放大该 Action 的 dispatch 延迟。

**Why this priority**: 高频入口一旦被 fan-out 或背压放大，会直接影响 UI 交互与业务吞吐，属于最敏感的性能边界。

**Independent Test**: 仅实现该故事即可构造“相关/无关 watcher 混合”的对照用例，并验证 dispatch 延迟随无关 watcher 数增长不出现灾难性退化。

**Acceptance Scenarios**:

1. **Given** 两组 watcher 分别只关心两类不同的 Action，且无关组数量远大于相关组，**When** 连续派发相关 Action，**Then** 相关 Action 的分发成本主要与相关组规模相关，而与无关组规模弱相关（在预算内）。
2. **Given** 无关组中存在慢速 watcher（会导致其自身处理变慢），**When** 连续派发相关 Action，**Then** 相关 Action 的 dispatch 延迟不应因为无关组的慢速处理出现显著放大（在预算内）。

---

### User Story 3 - State 订阅支持“声明依赖 → 增量通知” (Priority: P2)

作为业务开发者，我希望为 State 订阅声明它关心的字段依赖范围，使系统在提交只影响无关字段时跳过重算与 handler 执行；并且当订阅无法声明依赖时，系统提供可诊断的安全回退与严格门禁选项。

**Why this priority**: `onState` watcher 在真实业务里数量极大；“每次提交都重算”的模式会把 commit 热路径锁死为线性成本。

**Independent Test**: 仅实现该故事即可构造“字段无关提交”用例，并验证 handler 不触发且无多余通知。

**Acceptance Scenarios**:

1. **Given** 一个订阅声明其依赖字段集合，**When** 一次提交只修改不相交的字段集合，**Then** 该订阅不触发 handler 且不产生通知。
2. **Given** 一次提交修改了依赖字段但订阅结果值等价不变，**When** 提交完成，**Then** 该订阅不触发 handler（等价去重仍生效）。

---

### User Story 4 - 编译期优化可选且可回退（宁可放过不可错杀） (Priority: P2)

作为业务开发者/维护者，我希望不依赖任何构建期编译增强也能正常使用 watcher；当显式启用编译期优化时，系统在保证业务语义一致的前提下获得性能收益，并且遇到不确定/不可分析场景时自动回退到保守正确路径。

**Why this priority**: 编译期优化是“锦上添花”，不能成为运行时的硬依赖；一旦出现误优化会造成最难排查的语义偏差。

**Independent Test**: 同一套用例在“未启用编译期优化”与“启用编译期优化”两种模式下行为一致；启用模式下对可静态化子集有可判定收益，对不可静态化子集可解释回退。

**Acceptance Scenarios**:

1. **Given** 未启用编译期优化或缺失对应静态化产物，**When** 运行 watcher（含 `onAction` 与 `onState`）用例，**Then** 行为正确且不因缺失产物而失败。
2. **Given** 显式启用编译期优化，且 selector/依赖可被证明静态化，**When** 运行相同用例，**Then** 行为与未启用模式一致，并在预算内体现可判定的性能改善。
3. **Given** 显式启用编译期优化，但 selector/依赖不可分析，**When** 运行相同用例，**Then** 系统回退到运行时保守路径，并提供可序列化且稳定的回退原因锚点。

---

### Edge Cases

- 订阅依赖无法被可靠推导（动态 key/动态路径/不可分析 selector）：必须安全回退，并能通过诊断/门禁暴露该退化。
- 出现全量脏标记（等价“修改范围未知/覆盖全量”）：允许退化，但必须可解释，并避免在默认档位下引入不可控的常驻成本。
- 极端高频 Action 场景下出现慢速 watcher：必须明确隔离策略与可预期的最坏情况上界，避免系统级雪崩。
- 多模块协作链路中实例回收/重建：watcher 的生命周期必须严格绑定实例，避免幽灵订阅。
- 编译期优化未启用/产物缺失或不可用：必须回退而不是崩溃，并能给出可解释的原因锚点。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 提供一组 watcher 压力回归用例，覆盖“单模块高频 Action + 大量 watcher”与“多模块协作 + 销毁回收”，并在检测到资源泄漏或性能灾难性退化时稳定失败。
- **FR-002**: 系统 MUST 提供最小可观测指标以支撑回归与定位（例如活跃 watcher/订阅/Fiber 的计数与变化趋势），并保证默认档位下近零成本。
- **FR-003**: 系统 MUST 在不改变业务语义的前提下，减少 Action 分发的无关触达：对于只关心某类 Action 的 watcher，无关 Action 不应触发其 handler 执行；并且相关 Action 的分发成本必须满足预算约束。
- **FR-004**: 系统 MUST 避免“无关慢 watcher”显著放大相关 Action 的 dispatch 延迟（在预算内），并对不可避免的背压/等待提供可解释的诊断锚点。
- **FR-005**: 系统 MUST 提供一种“声明 State 订阅依赖范围”的方式，使得提交与依赖无交集时跳过重算与 handler 执行。
- **FR-006**: 当订阅无法声明/推导依赖范围时，系统 MUST 提供安全回退策略，并且 MUST 支持严格门禁（在需要时把隐式退化视为告警或错误）。
- **FR-007**: 系统 MUST 将“主状态转移”与 watcher 联动分层：主路径必须是纯同步且可被识别/统计的；watcher 只承担联动与副作用，避免把主路径锁死在 watcher 调度模型上。
- **FR-008**: 系统 MUST 定义并可导出最小化的“响应式图谱/传播 IR”表示，用于表达依赖与传播计划，并确保其字段 Slim 且可序列化。
- **FR-009**: 系统 MUST 定义“闭包可处理性分型”的裁决口径，并保证任何自动化优化只对可证明语义等价且不负优化的子集生效（宁可放过不可错杀）；当降级/回退发生时必须可解释。
- **FR-010**: 系统 MUST 在未启用任何编译期优化/静态化产物的情况下保持完整可用（功能与语义一致），不得要求用户配置构建期编译增强才能使用 watcher/订阅能力。
- **FR-011**: 当编译期优化被显式启用且存在对应静态化产物时，系统 MAY 使用这些产物降低运行期开销；但 MUST 保守正确：仅在能证明语义等价时采用，否则 MUST 自动回退到运行时保守路径。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 本特性触及 runtime 热路径，必须在实现前记录可复现的性能基线，并产出可对比的 Node + Browser perf evidence before/after/diff（同环境/同矩阵/同配置），且 diff 结论不得出现回归。
- **NFR-002**: 默认档位下（不启用额外观测/调试）watcher 优化不得引入随事件次数增长的常驻成本；任何例外必须可度量、可解释，并在 plan.md 中写明预算与原因。
- **NFR-003**: 诊断与证据必须 Slim 且可序列化；不得在默认档位 materialize 大对象图或把不可序列化对象写入证据/事件缓存。
- **NFR-004**: 必须保持同步事务边界：事务窗口内禁止 IO/异步；不得引入“事务外写入逃逸口”。
- **NFR-005**: 任何新增的“优化梯子/心智模型”必须在文档中可被一句话表达（≤5 个关键词），并与证据字段与诊断口径一致，避免并行真相源。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: watcher 压力回归用例可稳定运行并具备判定力：在长时间高频触发后，关键资源指标保持在稳定上界内，不出现随次数线性增长。
- **SC-002**: 在“相关 watcher 少、无关 watcher 多”的对照场景中，相关 Action 的 dispatch 延迟与吞吐满足预算，且相对基线有可判定改善（可通过证据对比呈现）。
- **SC-003**: 对声明依赖的 State 订阅，在“无关字段提交”场景下 handler 触发次数为 0；在“依赖字段提交但值等价”场景下 handler 触发次数为 0（等价去重有效）。
- **SC-004**: 当订阅进入安全回退或严格门禁被触发时，系统能给出可序列化且可解释的诊断锚点（稳定原因码/关键信息），并能被回归用例覆盖。
- **SC-005**: 同一套核心用例在“未启用编译期优化”与“启用编译期优化”两种模式下业务行为一致；启用模式下至少 1 个可静态化用例出现可判定收益，且至少 1 个不可静态化用例能稳定回退并输出可解释原因锚点。
