# Feature Specification: core-ng 整型化 Phase 2（事务/录制 id-first）

**Feature Branch**: `065-core-ng-id-first-txn-recording`  
**Created**: 2025-12-31  
**Status**: Draft  
**Input**: User description: "补齐 core-ng 整型化第二阶段：在不改变对外语义的前提下，把整型化从 converge 热路径扩展到 txn dirty-set/patch recording/diagnostic anchors，实现 id-first（FieldPathId/StepId），字符串仅在序列化/显示边界 materialize；同时建立 Node+Browser perf evidence（matrix SSoT）与 hard gates，防止 split/join 回归；在证据触发前不启动 AOT/Wasm。"

## Clarifications

### Session 2025-12-31

- AUTO: Q: FieldPathId 的唯一语义来源是什么？ → A: `FieldPathId` 定义为 `ConvergeStaticIrExport.fieldPaths` 的数组下标，并且必须以同一个 `staticIrDigest` 作为对齐锚点才允许反解。
- AUTO: Q: StepId 在本 spec 中指的是什么？ → A: `StepId` 指 `ConvergeStepId`（converge steps table 的整数下标）；非 converge 来源的 patch 不填 StepId（避免混用不同 id 空间）。
- AUTO: Q: dirty-set 在对外证据中以什么形态表达 roots？ → A: `dirtyAll=false` 时以 `rootIds: FieldPathId[]` 表达（可对齐、可 diff）；可读 `rootPaths` 只允许在显示/序列化边界基于 Static IR 反解（热路径禁止 materialize）。
- AUTO: Q: rootIds 的 canonicalization 规则是什么？ → A: `rootIds` 必须去重、prefix-free（按 FieldPath 前缀去冗余）、最终按 `FieldPathId` 升序稳定排序，并同时输出 `rootCount/keyHash/keySize` 作为 diff 锚点。
- AUTO: Q: PatchReason / DirtyAllReason 是否必须稳定枚举？ → A: 必须；`DirtyAllReason` 固定为 `unknownWrite|customMutation|nonTrackablePatch|fallbackPolicy`，`PatchReason` 收敛为稳定枚举（`reducer|trait-computed|trait-link|source-refresh|devtools|perf|unknown`）。
- AUTO: Q: diagnostics=light/full 的默认 bounded 策略是什么？ → A: 对外事件中 `rootIds` 默认只输出 TopK（light=3，full=32），并以 `rootIdsTruncated` 标记裁剪；full 下的 patch records 必须有界（默认最多 256 条，超限必须裁剪并给出可解释标记/原因码）。
- AUTO: Q: 本 spec 的 hard gates 覆盖哪些关键 suites？ → A: Browser matrix：`converge.txnCommit`（P1）、`form.listScopeCheck`（P2）；Node：`bench:027:devtools-txn`、`bench:009:txn-dirtyset`。
- AUTO: Q: Gate 的判定标准是什么？ → A: Browser diff 必须 `comparable=true && regressions==0 && budgetViolations==0`；Node `bench:027:devtools-txn` 必须 `gate.ok=true`；Node `bench:009:txn-dirtyset` 相对 before 的回归不得超过 15%（median 与 p95 同时满足）。
- AUTO: Q: key 含 `.` 导致 dot-path 歧义时如何处理 string path 输入？ → A: string path 仅作为“无歧义 dot-separated”边界输入；若无法映射到 registry 必须显式降级为 `dirtyAll=true` 且 `reason=fallbackPolicy`（并建议改用 segments 输入）。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 事务窗口整型化闭环（dirty-set + patch recording）(Priority: P1)

作为 Logix runtime 维护者，我希望事务窗口内的“影响域（dirty-set）与补丁记录（patch recording）”以稳定的整型锚点驱动（FieldPathId/StepId 等），避免在 txn 热路径发生字符串解析往返，从而把整型化从 converge 热路径扩展到 txn 录制全链路，并为长期 perf/诊断门禁提供可靠锚点。

**Why this priority**: 这是整型化“补齐第二阶段”的核心交付；如果 txn 仍依赖 string path 往返，converge 的整型化收益会被 txn/recording 抵消，并导致长期回归难以拦截。

**Independent Test**: 在固定环境与固定 matrix/profile 下，采集 Node+Browser 的 perf before/after 并生成 diff；diff 必须 `comparable=true` 且关键 suites 无回归；同时守护测试能在热路径阻断 string 往返与隐式降级。

**Acceptance Scenarios**:

1. **Given** 一次只写入“可追踪路径集合”的同步事务，**When** 事务提交并生成聚合 dirty-set，**Then** dirty-set 必须以“去冗余后的根集合”表达，且不得出现隐式的 `dirtyAll=true` 降级。
2. **Given** 一次包含不可追踪/不可映射路径的同步事务，**When** 事务提交，**Then** 系统必须显式降级为 `dirtyAll=true` 并携带稳定原因码（例如 `nonTrackablePatch`/`fallbackPolicy`），且该降级在 diagnostics=light/full 下可被观测与解释。

---

### User Story 2 - 可解释链路：稳定 id + 可反解的最小 IR（Priority: P2）

作为 Devtools/证据链路使用者，我希望系统能在 diagnostics=light/full 下输出“足够 Slim 且可序列化”的整型锚点，并可基于 Static IR 在需要时反解为可读路径/步骤，帮助解释“为何触发 converge/为何降级/有哪些热点”，同时保证 diagnostics=off 近零成本。

**Why this priority**: 只有“可解释”才能把整型化收益沉淀为长期可回放、可 diff 的证据；否则 id-first 很容易沦为不可验证的内部实现细节。

**Independent Test**: 同一套业务输入在两次运行中产生的 Static IR digest 必须一致；在 diagnostics=light/full 下，可导出包含 id 锚点的事件并能反解出可读摘要；在 diagnostics=off 下不得导出该类事件。

**Acceptance Scenarios**:

1. **Given** 相同的 converge 结构输入，**When** 分别在两次独立运行中生成 Static IR，**Then** Static IR digest 必须一致，且同一 digest 下 FieldPathId/StepId 的语义映射可重复对齐。
2. **Given** diagnostics=light（或 full）且发生 converge，**When** 输出诊断事件，**Then** 事件中必须包含稳定锚点（instance/txn/op）与必要的 id 信息，并可在不引入并行真相源的前提下反解出可读摘要。

---

### User Story 3 - 长期门禁：Perf hard gates + Exec-VM 证据（Priority: P3）

作为 core-ng 路线的 gatekeeper，我希望这波整型化补齐能被“长期门禁”守住：关键 perf suites 的阈值/容量不得回退，且当执行形态发生回退/降级时必须可解释并被 gate 捕获（默认不允许静默回退）。

**Why this priority**: 整型化一旦回归（split/join 复燃、动态路径扩散、exec-vm 退回保守路径），收益会迅速蒸发；没有 hard gates 就只能靠人工感觉。

**Independent Test**: 以固定 matrix/profile 跑通 Node+Browser 的证据并生成 diff，门禁输出必须可判定 PASS/FAIL；当出现回退/降级时，必须能通过稳定 reason code 定位原因。

**Acceptance Scenarios**:

1. **Given** 关键 perf suites（Node + Browser）在基线环境下运行，**When** 生成 before/after diff，**Then** diff 必须可比（`comparable=true`），且 gate 定义的关键指标不得回退。
2. **Given** Exec VM 未命中或被禁用，**When** 在 diagnostics=light/full 下采集证据，**Then** 必须输出 `hit=false` 且携带稳定原因码；在 diagnostics=off 下不得产生该证据输出。

---

### Edge Cases

- 当写入路径包含不可归一化片段（空串、`*`、数组语法、或包含歧义分隔符）时，系统如何显式降级并给出原因码？
- 当写入路径可归一化但无法映射到当前 Static IR 的 FieldPathIdRegistry 时，系统如何显式降级并避免静默回退？
- 当 key 本身包含 `.` 导致 dot-path 语义歧义时，系统如何避免错误映射与错误优化？
- 当事务涉及大量写入路径时，dirty roots 归一化是否仍可控，且不会导致不可解释的 `dirtyAll` 扩散？
- 当 time-slicing / 分片调度开启时，id-first 锚点与门禁是否仍稳定可对齐？
- 当 Devtools/可视化侧拿到 `rootIds` 但 `staticIrDigest` 缺失或与已注册的 Static IR 不匹配时，是否必须避免反解为 `rootPaths`（避免展示错误信息）？

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 在事务窗口内以稳定整型锚点表达“影响域”（至少覆盖 dirty roots 与 converge 调度所需的根集合），并避免在 txn 热路径出现字符串解析往返。
- **FR-002**: 系统 MUST 在每次事务提交时输出一个可序列化、Slim 的 dirty-set：要么是 `dirtyAll=true` + `DirtyAllReason`，要么是 `dirtyAll=false` + `{ rootIds, rootCount, keyHash, keySize }`（其中 `rootIds` 必须 prefix-free 且稳定排序）。
- **FR-003**: 当出现不可追踪/不可映射路径时，系统 MUST 显式降级（`dirtyAll=true`）并携带稳定原因码；在 diagnostics=light/full 下 MUST 可观测与可解释，不得静默吞掉。
- **FR-004**: 系统 MUST 支持 patch recording 的“低成本模式”（light/off）与“可解释模式”（full）；low-cost 模式至少保留 `dirty-set` + `patchCount` 摘要；full 模式允许导出 patch records（必须有界、可裁剪、可序列化）。
- **FR-005**: 系统 MUST 确保 converge 计划/调度可基于 id-first 输入执行，并且在默认路径下不得退回到基于字符串解析的调度逻辑。
- **FR-006**: 系统 MUST 为“可解释链路”提供 Static IR 的稳定摘要（digest）与最小导出能力，使得 `FieldPathId/StepId` 可在需要时反解为可读路径/步骤摘要；其中 `FieldPathId`/`StepId` 的语义必须只依赖 Static IR table（不得依赖随机/时间/进程级状态）。
- **FR-006a**: 当 `staticIrDigest` 缺失或与已注册的 Static IR 不匹配时，消费者（Devtools/Sandbox/平台）MUST 不尝试反解 `rootIds → rootPaths`（避免展示错误信息）；仍允许展示 id 与摘要字段用于排障。
- **FR-007**: 系统 MUST 提供可自动采集与可对比的 Node+Browser 证据产物（before/after/diff），并能在 diff 中显式标注可比性与漂移风险（例如环境/矩阵不一致）。
- **FR-008**: 系统 MUST 定义并实施 perf hard gates：当关键 suites 的门禁条件不满足时必须 FAIL，并给出可解释的失败原因（例如 budget exceed、cutoff、降级原因码）；任何 `comparable=false` 均视为 FAIL（禁止下硬结论）。
- **FR-009**: 系统 MUST 提供 Exec VM 命中/未命中证据，未命中 MUST 有稳定原因码；diagnostics=off 时 MUST 近零成本（不得输出该证据）。
- **FR-010**: 系统 MUST 维持“事务窗口同步边界”：事务窗口内不得引入 IO/async，不得出现写逃逸（out-of-transaction write）导致的不可解释状态变更。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 系统 MUST 为本次影响的热路径（至少 converge/txn commit/dirty-set/recording）定义预算与基线，并用同口径证据对比验证：Node 与 Browser 两端均可比（`comparable=true`）且无回归。
- **NFR-002**: diagnostics=off MUST 近零成本；diagnostics=light/full 的事件 payload MUST Slim 且可序列化，并且有界（bounded）避免无上限增长（默认：rootIds TopK=3/32、full patch records ≤256）。
- **NFR-003**: 诊断/回放/证据链路 MUST 使用确定性标识（instanceId/txnSeq/opSeq 等），不得以随机/时间作为默认锚点；id 映射必须可重复对齐。
- **NFR-004**: 事务窗口同步边界 MUST 被强制与可诊断：事务窗口内不得出现 IO/async；若发生必须可观测并给出可解释错误/告警。
- **NFR-005**: 若引入新的门禁或自动策略，必须同步形成稳定心智模型（≤5 个关键词 + 粗成本模型 + 优化阶梯），并保证术语在 docs/bench/diagnostics 字段上一致。
- **NFR-006**: 任何跨模块协作能力 MUST 通过可注入契约表达（可替换/可 mock），并支持导出 Slim、可序列化的证据/IR 供 Node/Browser 试跑对照。
- **NFR-007**: 如引入破坏性变更，必须提供迁移说明并坚持 forward-only（不保留兼容层/不做 deprecation 周期）。

### Key Entities _(include if feature involves data)_

- **FieldPath**: canonical 表示为 segments（数组）；string path 仅作为 dot-separated 边界输入（对 key 含 `.` 的场景不可靠，无法映射时必须显式降级）。
- **FieldPathId**: `ConvergeStaticIrExport.fieldPaths` 的数组下标（以 `staticIrDigest` 对齐）。
- **StepId**: `ConvergeStepId`（converge steps table 的整数下标；非 converge patch 不填）。
- **DirtySet**: `{ dirtyAll=true, reason }` 或 `{ dirtyAll=false, rootIds, rootCount, keyHash, keySize }`（rootIds prefix-free + 稳定排序；并支持 `rootIdsTruncated` 标记裁剪）。
- **Patch Record**: full 模式可导出的变更记录（至少包含 `opSeq/pathId/reason`，可选 `stepId`；必须有界且可序列化），light/off 仅保留 `patchCount` 摘要。
- **Static IR（最小 IR）**: 用于反解/对齐 id 锚点的静态描述（`staticIrDigest + fieldPaths + steps table`）。
- **Perf Evidence（before/after/diff）**: 可对比证据产物（Browser matrix + Node bench），用于 hard gates 判定。
- **Exec VM Evidence**: `trace:exec-vm` 证据（稳定 reason code；off 不输出）。

### Assumptions

- 本 spec 面向 “046 路线下的 runtime-only NG” 场景：优先通过运行时与构造期预编译推进，不以工具链（AOT/Wasm）为前置条件。
- 任何 string path 形式的输入只作为“边界输入/兼容输入”；核心路径以 segments 或 id-first 为准。
- diagnostics=off 是默认门禁基线；light/full 主要用于可解释链路与开销曲线验证。

### Out of Scope

- AOT 工具链、Wasm planner、Flat store 等路线（仅在证据触发条件满足后再单独立 spec 推进）。
- 引入新的业务语义（本 spec 只允许纯优化与可诊断性补齐，不改变对外行为契约）。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 在同一环境与同一 matrix/profile 下，Node 与 Browser 的 before/after diff 均满足 `comparable=true`；Browser 关键 suites（`converge.txnCommit`、`form.listScopeCheck`）满足 `regressions==0 && budgetViolations==0`。
- **SC-002**: 在门禁覆盖的关键 suites 中，不得出现不可解释的 `dirtyAll=true`；若出现，必须带稳定原因码并被 gate 识别为 FAIL（除非该 suite 明确声明允许降级）。
- **SC-003**: diagnostics=off 下不输出整型化解释性事件与 Exec VM 证据（近零成本）；light/full 下输出的事件 payload 必须 Slim 且可序列化，并能解释“为何触发/为何降级/有哪些热点”。
- **SC-004**: 对于目标执行形态，Exec VM 证据在 diagnostics=light/full 下可观测：命中时 `hit=true`，未命中时 `hit=false` 且 `reasonCode` 为稳定枚举码。
- **SC-005**: 同一 converge 结构输入在两次独立运行中产生的 Static IR digest 必须一致，并能用该 digest 对齐 FieldPathId/StepId 的语义映射摘要。
