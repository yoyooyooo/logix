# Feature Specification: 事务 IR + Patch/Dirty-set 一等公民

**Feature Branch**: `[009-txn-patch-dirtyset]`  
**Created**: 2025-12-15  
**Status**: Draft  
**Input**: User description: "好现在我们把 docs/reviews/99-roadmap-and-breaking-changes.md 展开细节，梳理一个新需求"

## Clarifications

### Session 2025-12-15

- Q: 同一事务内对同一路径多次写入时的语义与 `patch` 合并规则是什么？ → A: 仅允许同一 `stepId` 内对同一目标路径重复写入（最终值=按事务内单调序号 `opSeq` 的最后一次写入）；跨 `stepId` 的重复写入视为冲突并使事务稳定失败（可解释）；`patch` 在 `full` 诊断级别记录完整写入序列，在 `light` 下仅保留合并结果与计数摘要。
- Q: 对列表/动态行写入（如 `items[index].name`），`dirty-set` 的路径归一化口径是什么？ → A: 去除索引、保留字段段：`items[index].name → items.name`；插入/删除/重排等结构变更统一记为 `items` 根。
- Q: 诊断等级如何分档（`off`/`light`/`sampled`/`full`），各档保留哪些信息？ → A: 四档：`off`/`light`/`sampled`/`full`。`off` 不记录 trace/patch（仅保留运行正确性所需的瞬时数据，不进入诊断缓冲区）；`light` 记录可序列化事务摘要（例如 `txnId`、`dirtyRootCount/patchCount`、`dirtyAll`、降级/冲突摘要、Top-cost steps 摘要），不保留完整 patch 序列；`sampled` 采用确定性采样（基于稳定锚点，如 `txnSeq`）：未命中时等价于 `light`，命中时允许记录**有界**的 patch/trace 细节（例如有界 patch 序列与少量 per-step 计时摘要），用于低成本定位长尾；`full` 记录完整可序列化 Dynamic Trace（事务→步骤→op 因果链）与 patch 写入序列（含 `from/to/reason/stepId/opSeq/...`），并支持 ring buffer 上限与裁剪策略配置。
- Q: 当 Static IR 中出现“两个规则/trait 声明写入同一路径”时，默认裁决是什么？ → A: 构建 Static IR 即稳定失败（默认单写者），并输出冲突详情（`path` + 涉及 `writerId/stepId`）。
- Q: 事务/步骤/写入 op 的稳定标识模型具体采用哪套字段？ → A: `instanceId` 必须外部注入；`txnSeq` 为 instance 内单调递增；`opSeq` 为 txn 内单调递增；`stepId/writerId` 必须可映射到 Static IR 节点；`txnId/opId` 仅作为确定性派生编码（由上述字段可重建）。
- Q: `patch` / `dirty-set` / Static IR 中的 `path` 使用哪种 canonical 表示？ → A: 段数组（例如 `["profile","name"]`）作为唯一 canonical 表示；展示层可渲染为点分字符串用于阅读。
- Q: 默认“避免负优化”的降级阀门触发条件是什么？ → A: 同时支持两类阈值：`dirtyRootCount` 超阈值或 `affectedSteps/totalSteps` 超阈值，任一触发即自动降级为 `dirtyAll`；并在 trace 中记录触发原因与阈值（可配置）。
- Q: `dirty-set` 的 canonical 结果是否必须前缀去冗余（prefix-free）？ → A: 必须。canonical dirty-set 不允许祖先/后代同时存在；若已包含 `profile`，则不得再包含 `profile.name`（以保证阈值判断与调度口径稳定可解释）。
- Q: 关闭诊断（`off`）时，事务结束后允许保留的最小信息是什么？ → A: 仅允许事务内临时使用 `dirty-set`/计数作为本次调度输入；commit/abort 后立即释放，不得将任何 txn 摘要/事件写入 DevtoolsHub/ring buffer。
- Q: 基准脚本结果波动时，用什么统计口径保证 Before/After 可判定、可复现？ → A: 每场景运行 30 次，丢弃前 5 次 warmup，报告中位数与 p95，并记录环境元信息。

### Session 2025-12-16

- Q: 当事务因“跨 `stepId` 重复写入冲突 / 事务窗口 IO”等原因稳定失败时，提交语义与诊断记录口径选哪种？ → A: 原子 abort（不提交任何写入）；仅在 `light/full` 记录可序列化的 `txn.abort`（含原因/冲突证据）；`off` 不写入诊断缓冲区，仅抛错。
- Q: 在 `full` 诊断级别记录 `Patch.from/to` 时，如果值不可 `JSON.stringify`（函数/循环引用/class 实例等），应采用哪种口径？ → A: 强约束可序列化：`from/to` 仅允许可 `JSON.stringify` 的值；否则直接省略 `from/to`（保留 `path/reason/stepId/opSeq` 等证据）。
- Q: `trace:effectop` 的 SlimOp 里，`payloadSummary`/`meta` 的默认裁剪与预算口径选哪种？ → A: `payloadSummary` 仅短字符串（默认 <=256 chars，超出截断）；`meta` 仅允许原始类型/小对象白名单；单事件默认软上限 4KB（按 JSON 字符串长度估算），超限必须截断/丢字段。
- Q: `trace:effectop` 事件在诊断等级 `off/light/sampled/full` 的默认采集范围选哪种？ → A: `full` 才默认采集 `trace:effectop`；`sampled` 仅在采样命中时允许采集（仍需 SlimOp + 预算/裁剪），未命中时不采集；`light` 只记录事务摘要/计数/Top-cost steps（无 per-op 事件）；`off` 不进入诊断缓冲区。
- Q: 负优化降级阀门（`dirtyAll`）的默认阈值选哪套？ → A: 默认：`dirtyRootCount > 32` 或 `affectedSteps/totalSteps > 0.5` 即降级（可配置）。

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

### User Story 1 - 事务增量化（只做必要工作） (Priority: P1)

作为业务模块作者/运行时使用者，我希望每次事务更新都能生成字段级的 `dirty-set`（必要时可附带 `patch`），从而让运行时只对“受影响的派生/校验/刷新”做增量计算，避免因为小改动触发全量收敛，且不会引入额外的负优化。

**Why this priority**: 这是把性能压力压到最低的核心支点；没有 Patch/Dirty-set，后续的 trait/事务体系、React 批处理、Devtools 因果分析都会退化为“全量扫描 + 事后猜测”。

**Independent Test**: 在一个包含多条派生/校验步骤的模块中，只更新一个字段，系统能证明：只执行受影响步骤，并输出对应的 dirty-set（以及可选 patch）；当更新触发“未知写入/无法精确定位”时，系统必须显式降级并可解释原因。

**Acceptance Scenarios**:

1. **Given** 某事务只写入 `profile.name`，且存在 100 个派生/校验步骤，**When** 提交事务，**Then** 运行时只执行依赖 `profile.*` 的步骤（或其父根），不会执行无关步骤。
2. **Given** 某写入无法推导精确路径（例如“未知写入”），**When** 提交事务，**Then** 运行时必须显式标记为“dirtyAll/全量收敛（可解释）”，并给出导致降级的来源信息。

---

### User Story 2 - 统一最小 IR（可合并、可冲突检测） (Priority: P2)

作为平台/Devtools/Alignment Lab 的集成者，我希望事务的增量信息能够 100% 降解为统一的最小 IR（Static IR + Dynamic Trace），并支持一致的冲突检测与合并（例如路径重复定义、单写者规则、冲突详情输出），从而让平台只认 IR 而不依赖并行真相源。

**Why this priority**: 没有统一 IR，平台/工具链将无法稳定消费（尤其是“全双工”场景的回放与解释）；同时也无法做可靠的冲突检测与合并。

**Independent Test**: 通过静态声明构建一份最小 Static IR，并在运行时产生 Dynamic Trace；对任意一次事务，IR 侧能够复现 dirty-set 与 patch（若启用），并能对冲突/重复写入给出确定性裁决。

**Acceptance Scenarios**:

1. **Given** 两个规则/trait 写入同一路径，**When** 构建 Static IR，**Then** 必须稳定失败（默认单写者），并输出冲突详情（`path` + 涉及 `writerId/stepId`）；不得出现顺序相关或静默覆盖。
2. **Given** 一次事务产生 dirty-set（以及可选 patch），**When** 输出 Dynamic Trace，**Then** trace 中包含稳定标识与输入/变更快照，使平台可回放与解释。

---

### User Story 3 - 可诊断且低开销（默认不拖慢） (Priority: P3)

作为开发者与运行时维护者，我希望每次事务的“派生/刷新/丢弃”都能提供：稳定标识、触发原因、输入快照、状态变更记录；且在关闭诊断时几乎零额外成本，从而既能把性能压到最低，也能解释“为什么发生”。

**Why this priority**: 事务与 trait 的增量化一旦出错，会导致极难排查的“缺更新/多更新/串因果”；必须把解释链路变成默认能力，同时保证不开诊断时不负优化。

**Independent Test**: 对同一事务分别在“诊断关闭/诊断开启（full）”运行，关闭时开销接近基线，开启时能输出完整可序列化 trace，且能把每个执行步骤与原因关联起来。

**Acceptance Scenarios**:

1. **Given** 事务触发了若干派生/刷新步骤，**When** 开启诊断并查看 trace，**Then** 每个步骤都能解释“由哪个 dirty-root/依赖触发”，并能定位到输入/变更记录。
2. **Given** 诊断等级为 `full` 且产生了诊断事件（含 `trace:effectop`），**When** 获取 Devtools snapshot 并对 `events` 做 `JSON.stringify`，**Then** 不得抛错，且 `trace:effectop` 的 payload 必须为 SlimOp（不包含 `effect`/函数/不可序列化对象），避免把用户对象图挂到 ring buffer 上。
3. **Given** 诊断等级为 `light`，**When** 获取 Devtools snapshot，**Then** `events` 不得包含 `trace:effectop`（仅保留事务摘要/计数/Top-cost steps 等，不记录 per-op 事件）。

---

### User Story 4 - 变更前后性能可对比（基线与极限） (Priority: P4)

作为运行时维护者，我希望在改造 Patch/Dirty-set/增量调度相关热路径之前，就准备好可复现的性能基线（Before）与压力极限（Worst-case/Limit），并在改造后用同一套脚本/用例对比出差异，从而避免“追求增量化却引入负优化”。

**Why this priority**: 本特性会触及事务提交与 trait converge 的核心路径；没有基线与极限用例，任何“更快/更慢”的结论都不可复现，也无法指导进一步的优化取舍。

**Independent Test**: 在同一台机器、同一 Node 版本下，用同一套脚本分别记录 Before/After 的结果，输出包含至少一类可量化指标（耗时/执行步数/分配），并能稳定重跑获得接近的中位数结果。
（统计口径：每场景运行 30 次，丢弃前 5 次 warmup，报告中位数与 p95，并记录环境元信息。）

**Acceptance Scenarios**:

1. **Given** 存在一套覆盖典型场景与极限场景的基准脚本/测试用例，**When** 在改造前运行，**Then** 会记录可复现的 Before 基线（含运行环境元信息）。
2. **Given** 同一套脚本在改造后再次运行，**When** 对比 Before/After，**Then** 能明确指出关键指标差异，并对“是否回归/是否达到目标”给出可判定结论。

---

### Edge Cases

- dirty-set 过粗或过多：当 `dirtyRootCount` 超阈值或 `affectedSteps/totalSteps` 超阈值时，自动降级为 `dirtyAll`，并在 trace 中记录触发原因与阈值（默认：`dirtyRootCount > 32` 或 `affectedSteps/totalSteps > 0.5`；可配置）。
- 同一事务内对同一路径多次写入：仅允许同一 `stepId` 内重复写入（最终值=按事务内单调序号 `opSeq` 的最后一次写入）；跨 `stepId` 视为冲突并使事务稳定失败（可解释）。
- 列表/动态行（例如 `items[]`）写入：索引不进入 dirty-root；字段写入归一化为 `items.name`（去索引保留字段段）；结构变更（增删/重排）归一化为 `items` 根。
- 稳定失败的事务（例如跨 `stepId` 写入冲突、事务窗口 IO）：必须原子 abort（不提交任何写入）；仅在 `light/full` 记录可序列化的 `txn.abort`（含原因/冲突证据）；`off` 不写入诊断缓冲区，仅抛错。
- 嵌套 `dispatch` / React `flushSync`：同一 `instanceId` 内事务必须串行；事务窗口内重入 `dispatch` 必须合并到同一事务（延续同一 `txnSeq/opSeq` 序列）；commit 收尾阶段触发的 `dispatch` 必须排队到下一事务；不得覆盖式开启新事务。
- 关闭诊断（`off`）时：`dirty-set`/计数仅事务内临时使用；事务结束（commit/abort）后立即释放；不得写入 DevtoolsHub/ring buffer，也不得保留 txn 摘要/事件。
- 基准脚本结果波动：每场景运行 30 次，丢弃前 5 次 warmup，报告中位数与 p95，并记录环境元信息；若波动过大不可判定，附加一组更高 warmup/重复次数的补充数据。

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: 系统必须在每次事务中生成 `dirty-set`（字段级或字段根级），并保证其生成复杂度与“写入量”近似线性（不得默认做全量 diff 推导）。对数组/列表路径，索引必须被归一化掉：`items[index].name → items.name`；结构变更（插入/删除/重排）归一化为 `items` 根。`dirty-set` 的 canonical 结果必须前缀去冗余（prefix-free）：禁止祖先/后代同时存在；若已包含 `["profile"]`，则不得再包含 `["profile","name"]`；`dirtyRootCount` 等计数阈值必须以 canonical 结果为准。`dirty.roots` 必须稳定排序（按 FieldPath 段数组逐段字典序；若某一路径是另一条的前缀则短者在前，但 canonical 输出应已 prefix-free）。
- **FR-002**: 系统必须支持在需要时生成 `patch`（可用于诊断/回放/合并），并定义同一路径重复写入语义：仅允许同一 `stepId` 内对同一目标路径多次写入（最终值=按事务内单调序号 `opSeq` 的最后一次写入）；跨 `stepId` 重复写入视为冲突并使事务稳定失败（可解释）；`patch` 在 `full` 诊断级别记录完整写入序列，在 `light` 下仅保留合并结果与计数摘要。对列表/集合场景，`patch` 可选携带 `affectedKeys`/`affectedIndices` 作为二级过滤证据（与 Feature 010 Row-Scoped Rule 对齐）。`full` 模式下若记录 `from/to`，其值必须可 `JSON.stringify`；不可序列化时必须省略 `from/to`（不得把不可序列化对象图写入 trace/缓冲区）。
- **FR-003**: 系统必须基于 `dirty-set` 驱动派生/校验/刷新步骤的增量调度，使“执行步骤数”与“受影响依赖范围”近似线性，而不是与“总步骤数”线性。
- **FR-004**: 当无法生成精确 dirty-set（未知写入等）时，系统必须显式降级为全量收敛，并提供可解释的原因信息（而不是静默退化）。
- **FR-005**: 系统必须提供统一最小 IR，使上述事务信息可完全降解到 Static IR + Dynamic Trace，并支持冲突检测与合并（Static IR 合并可检测冲突；同一路径重复写入默认单写者硬失败，禁止顺序相关或静默覆盖）。IR/dirty-set/patch 中的 `path` 必须使用段数组作为唯一 canonical 表示（见 Key Entities: Path）。
- **FR-006**: 系统必须为事务、步骤、派生结果提供稳定标识，并在 Dynamic Trace 中串起因果链（触发源 → dirty-set/patch → 执行步骤 → 状态变更）。稳定标识模型：`instanceId` 外部注入；`txnSeq` 为 instance 内单调递增；`opSeq` 为 txn 内单调递增；`eventSeq` 为 instance 内单调递增（用于事件排序与去重）；`stepId/writerId` 可映射到 Static IR 节点；`txnId/opId/eventId` 必须由上述字段确定性派生（可重建）。
- **FR-007**: 系统必须强制“事务窗口禁止 IO”，任何 IO/异步必须在事务外被显式表达；违反时必须稳定失败并可解释。
- **FR-008**: 诊断事件必须 Slim 且可序列化；禁止把闭包/不可序列化对象作为事件载荷进入 trace/缓冲区。对于 `trace:effectop`，必须使用 SlimOp 作为 payload（不得直接记录原始 EffectOp/`effect`）；并保证 Devtools snapshot 的 `events` 可被 `JSON.stringify`。SlimOp 默认预算：`payloadSummary` <=256 chars（超出截断）；`meta` 仅允许原始类型/小对象白名单；单事件默认软上限 4KB（按 JSON 字符串长度估算），超限必须截断/丢字段（不得把大对象图写入缓冲区）。默认仅在 `full` 诊断级别采集 `trace:effectop`；`light` 不得记录 per-op 事件。对所有 trace 事件与 origin：`TraceEvent.data` / `TxnOrigin.details` 必须可 `JSON.stringify` 且默认软上限分别为 4KB / 2KB（按 JSON 字符串长度估算），超限必须截断/丢字段或省略（不得把大对象图写入缓冲区）。
- **FR-009**: 系统必须提供可复现的基准脚本/用例，并要求在改造前记录 Before 基线、改造后记录 After 对比；每个场景至少运行 30 次、丢弃前 5 次 warmup，报告中位数与 p95，并记录运行环境元信息与结果摘要；若波动过大导致不可判定，可额外增加 warmup/重复次数作为补充，但主报告仍需输出上述口径以便横向对比。
- **FR-010**: 清理/GC 等 best-effort 路径允许不中断主流程，但不得静默吞掉非 interrupt 的失败；在 dev/test 下必须可被诊断（至少能输出可读的失败原因）。
- **FR-011**: 同一 `instanceId` 内事务必须串行；事务窗口内的嵌套 `dispatch` 必须合并到同一事务（延续同一 `txnSeq/opSeq` 序列），commit 收尾阶段触发的 `dispatch` 必须排队到下一事务；不得采用“覆盖式开启新事务”导致顺序不确定或丢失写入。
- **FR-012**: 当事务稳定失败（例如跨 `stepId` 的重复写入冲突、事务窗口 IO/异步等）时，必须原子 abort（不提交任何写入）；仅在 `light/full` 记录可序列化的 `txn.abort`（含错误原因与冲突证据）；`off` 不得向诊断缓冲区写入任何 txn 摘要/事件，仅抛错。

#### Functional Acceptance Mapping

 - FR-001/FR-003/FR-004/FR-011 的最低验收：满足 User Story 1 的两个 Acceptance Scenarios，并覆盖 “dirty-set 过粗/过多” Edge Case。
 - FR-005/FR-006 的最低验收：满足 User Story 2 的两个 Acceptance Scenarios。
 - FR-007/FR-008/FR-010/FR-012 的最低验收：满足 User Story 3 的 Acceptance Scenarios，并验证“诊断关闭时无显著负优化”。
 - FR-009 的最低验收：满足 User Story 4 的两个 Acceptance Scenarios，并能稳定复跑得到接近的中位数结果。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 在 dirty 模式下，事务调度与派生执行的开销必须随“写入量 + 受影响步骤数”近似线性增长，并且提供可复现的性能基线与对比数据。
- **NFR-002**: 在关闭诊断时，系统不得引入显著额外分配或全量扫描；在开启诊断时，成本必须可预估且可裁剪（例如 ring buffer 上限与裁剪策略、单事件 payload 预算与截断策略）。
- **NFR-003**: 任何对外可见的标识必须确定性生成（禁止随机/时间作为默认唯一标识），并支持回放与对比；其中 `instanceId` 必须外部注入，`txnSeq/opSeq` 必须单调序号，`txnId/opId` 必须可由 `(instanceId, txnSeq, opSeq, stepId/...)` 确定性重建。
- **NFR-004**: 默认行为必须避免负优化：当 dirty-set 过滤的成本可能超过收益时，应提供显式降级阀门并可解释；默认实现必须同时支持 `dirtyRootCount` 阈值与 `affectedSteps/totalSteps` 阈值（任一触发即自动降级为 `dirtyAll`），并在 trace 中记录触发原因与阈值；默认阈值：`dirtyRootCount > 32` 或 `affectedSteps/totalSteps > 0.5`；阈值需可配置。
- **NFR-005**: 系统必须提供四档诊断等级：`off`/`light`/`sampled`/`full`。`off` 不记录 trace/patch，且不得向 DevtoolsHub/ring buffer 写入任何 txn 摘要/事件（`dirty-set`/计数仅事务内临时使用，commit/abort 后立即释放）；`light` 仅记录可序列化事务摘要与计数（不保留完整 patch 序列，且不得记录 per-op 事件如 `trace:effectop`）；`sampled` 采用确定性采样：未命中时等价于 `light`，命中时允许记录有界的 patch/trace 细节（并保持 Slim/可序列化/可裁剪）；`full` 记录完整可序列化 Dynamic Trace 与 patch 写入序列（含 `trace:effectop` SlimOp）；并支持 ring buffer 上限与裁剪策略配置。

### Assumptions & Scope Boundaries

- 该特性只聚焦“事务 IR + Patch/Dirty-set”与其最小可解释链路，不同时实现所有领域包（Form/Query/...）的全面迁移。
- 该特性的输出面向业务作者、运行时维护者与平台/Devtools 消费者；以“统一最小 IR”为桥梁，避免并行真相源。
- 为满足“诊断 Slim/可序列化”的宪法约束，本特性包含对现有 `trace:effectop` 事件负载的收敛（SlimOp），以避免 ring buffer 持有不可序列化对象图。
- 列表/集合场景的 Row-Scoped 二级过滤依赖 Feature 010 的执行模型；009 仅定义 `Patch.affectedKeys/affectedIndices` 的可序列化字段与契约，缺失时允许退化为 coarse 执行但不得破坏语义正确性。

### Key Entities *(include if feature involves data)*

- **Transaction**: 一次同步事务窗口内的状态更新单元（必须可解释且可回放）。
- **Dirty-set**: 描述本次事务“写了哪些路径/根”的最小集合，用于增量调度。
- **Patch**: 描述状态变更的结构化记录（可用于诊断、回放、合并/冲突检测）。
- **SlimOp**: `trace:effectop` 的最小可序列化表示（不包含 `effect`）；用于 Devtools 重建时间线，字段包含 `opId`、`kind/name`、`payloadSummary`、`meta`（Slim 子集）、`timing`、`status`（默认预算：`payloadSummary` <=256 chars；单事件 <=4KB；超限截断/丢字段）。
- **Path**: 用于在 IR/dirty-set/patch 中标识目标位置；canonical 表示为段数组（例如 `["profile","name"]`）。文档示例中的 `profile.name` 等仅用于阅读展示。
- **Static IR**: 可编译/可合并/可冲突检测的声明性表示（规则、依赖、写入声明等）。
- **Dynamic Trace**: 运行期时间线（txn/step/op），用稳定标识串起因果链。
- **Identity Model**: 稳定标识模型：`instanceId` 外部注入；`txnSeq` 为 instance 内单调递增；`opSeq` 为 txn 内单调递增；`eventSeq` 为 instance 内单调递增（事件排序与去重）；`stepId/writerId` 可映射到 Static IR 节点；`txnId/opId/eventId` 可重建且可比较。

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: 在包含 ≥100 个派生/校验步骤的模块中，单字段更新触发的执行步骤数与“受影响依赖范围”近似线性增长（而不是接近全量）。
- **SC-002**: `dirty-set` 生成在常见写入模式下不依赖全量 diff，且其成本与“写入量”近似线性（通过可复现基线与对比数据验证）。
- **SC-003**: 对重复写入/冲突写入（尤其是 Static IR 中同一路径多写者），系统能在构建或运行阶段给出确定性裁决（默认构建期稳定失败），且不会出现“顺序相关”的非确定性结果。
- **SC-004**: 在开启诊断时，开发者可以对任意一次事务在 10 分钟内回答：“触发源是什么/写了什么/为什么执行这些步骤/变更了什么”。
- **SC-005**: 在关闭诊断时，相对基线的性能回归不超过 15%（通过可复现测量验证）。
- **SC-006**: 至少 1 个“典型场景”与 1 个“极限场景”基准被固化为可复现脚本/用例；每场景运行 30 次、丢弃前 5 次 warmup，记录 Before/After 的中位数与 p95，并附环境元信息。
- **SC-007**: 文档同步完成：对外调试文档明确 `trace:effectop` 仅暴露 SlimOp（可序列化、无闭包）；若引入 breaking change，则提供迁移/路线图说明。
