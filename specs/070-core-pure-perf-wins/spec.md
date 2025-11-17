# Feature Specification: core 纯赚/近纯赚性能优化（默认零成本诊断与单内核）

**Feature Branch**: `070-core-pure-perf-wins`  
**Created**: 2025-12-31  
**Status**: Draft  
**Input**: User description: "在 @logix/core 中梳理并固化一批‘纯赚/近纯赚’性能优化：默认单内核模式零额外成本；生产模式默认诊断链路零开销（不构造/不记录/不分配）；对比/实验场景仍可启用多内核与详细诊断，并提供可复现的 perf evidence 与成功指标。"

## Terminology

- **纯赚（Pure Win）**：不改变业务语义，不改变默认可观测行为（尤其是那些“本来也会被丢弃”的 Debug 事件），仅移除不必要的运行期开销（分支、分配、字符串 materialize、计时调用等）。
- **近纯赚（Near Pure Win）**：不改变业务语义，但可能改变“仅在显式启用观测/Devtools 时才有意义”的输出形状；必须做到默认档无成本，并在 spec 中写清楚裁剪/降级口径与可解释字段。
- **默认档（Default）**：用户“只用 core、不做对照/试跑”的常态；默认请求内核 `kernelId=core`，默认 `diagnosticsLevel=off`；本 spec 的 Gate/perf evidence 默认以 `Debug.layer({ mode: "prod" })` 的 errorOnly-only sinks 作为基线。
- **装配期 Gate 计算（Assembly-time Gate）**：只在 Runtime 装配阶段评估的门禁（例如 Full Cutover Gate）；不得进入 per-op/per-txn 热路径。
- **Full Cutover Gate**：当请求 `kernelId != core` 且启用 `fullCutover` 时，在装配期禁止任何 fallback / missing binding；失败必须给出可解释的缺失/回退摘要与锚点（`txnSeq=0`）。
- **“会被消费”的 Debug 事件**：本 spec 采用保守判定：仅当 sinks 集合被明确识别为 errorOnly-only 时，才认为 `state:update` / `trace:*` 等高频事件“不会被消费”并允许跳过；任何未知/自定义 sinks 一律视为“可能消费”，不得误丢事件。
- **diagnosticsLevel**：`off | light | sampled | full`；仅控制可导出/重字段（trace payload、hotspots、静态 IR 导出等）的生成与裁剪，不等价于“是否记录到 sinks”。

## Scope

### In Scope

- 让默认档（单内核 + diagnostics=off + errorOnly）在关键热路径上不承担“为丢弃的观测事件付费”的默认税。
- 明确并固化“装配期 Gate 计算”与“运行期热路径”的边界：kernelId/多内核能力只在装配期决策与产证据。
- 保持对比/实验能力：显式开启 Devtools/诊断、多内核试跑时仍可获得可解释输出与可复现 perf evidence。

### Out of Scope (Non-goals)

- 不改变业务语义：事务窗口规则、converge/validate 的功能性结果、调度策略、并发/队列语义不在本 spec 范围。
- 不默认开启任何可能触发回退/负优化的“实验性执行模式”（例如 Exec VM mode 之类的实现策略开关）；实验能力保留为显式 opt-in。
- 不引入新的对外兼容层；如需破坏性改变，必须另立 spec 并提供迁移说明（forward-only）。

## Related (read-only references)

- `specs/045-dual-kernel-contract/`（Kernel Contract 与可替换内核的契约边界）
- `specs/047-core-ng-full-cutover-gate/`（Full Cutover Gate 的门禁与覆盖矩阵）
- `specs/052-core-ng-diagnostics-off-gate/`（diagnostics=off 的近零成本 Gate 与回归防线）
- `packages/logix-core/src/internal/runtime/core/DebugSink.ts`（Debug sinks / diagnosticsLevel / record 的核心落点）
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`（`state:update` 事件与事务 commit 链路）
- `packages/logix-core/src/internal/state-trait/converge-in-transaction.ts`（trait converge 的 decision/dirtySummary 生成点）
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.ts`（Runtime 装配期 Gate：FullCutoverGate.evaluateFullCutoverGate）

## Clarifications

### Session 2026-01-01

- AUTO: Q: “会被消费”的判定是否需要精确推断任意自定义 sink？ → A: 不需要；仅在可证明不会被消费时跳过（当前至少覆盖 errorOnly-only），其余一律保守视为“可能消费”。
- AUTO: Q: `diagnosticsLevel=off` 是否禁止生成任何 decision/summary？ → A: 不禁止；当存在非 errorOnly-only sink 会消费 `state:update` 时允许生成 slim decision（用于 `state:update.traitSummary`），但 trace payload/topK/hotspots/静态 IR 导出等 heavy 必须 `diagnosticsLevel!=off` 才允许生成与导出。
- AUTO: Q: “默认档（Default）”的 Gate/perf evidence baseline 是什么？ → A: 固定为 `kernelId=core + diagnosticsLevel=off + Debug.layer(mode=prod)`（errorOnly-only sinks），以验证“不会被消费就不付费”的默认税清零。
- AUTO: Q: perf evidence 的硬门口径是什么？ → A: 以 `.codex/skills/logix-perf-evidence/assets/matrix.json` 为唯一 SSoT；交付结论必须 `profile=default`（或 `soak`）且 `pnpm perf diff` 满足 `meta.comparability.comparable=true && summary.regressions==0`，before/after 必须 `meta.matrixId/matrixHash` 一致。
- AUTO: Q: before/after 是否允许在混杂改动的 worktree 上采集并下硬结论？ → A: 不允许；硬结论必须在隔离 worktree/目录分别采集，混杂结果仅作线索不得宣称 Gate PASS。
- AUTO: Q: SC-001 是否必须强制出现“提升”才算完成？ → A: 不强制；硬门为“无回归且可比”，若要主张“纯赚收益”则必须补充至少 1 条可证据化收益并回写 `quickstart.md`。
- AUTO: Q: 是否将 `LOGIX_CORE_NG_EXEC_VM_MODE` 作为 core 的默认纯赚开关？ → A: 不；继续保持显式 opt-in（默认档不启用），避免把潜在回退/负优化变成默认风险。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 默认档“零观测税”：不会被消费就不付费 (Priority: P1)

作为业务开发者/使用者，我希望在“只用 core、不开 Devtools、diagnostics=off”的默认档位下，系统不会因为支持诊断/多内核/对照能力而在热路径上额外分配、计时或构造大 payload；尤其是不应该为了最终会被丢弃的 Debug 事件付费。

**Why this priority**: 默认档是最高频路径；任何隐式税都会放大成系统性回归，并且会污染后续所有优化证据。

**Independent Test**: 在默认档下跑标准 perf evidence（Node + Browser），diff 结果必须可判定且无回归（`meta.comparability.comparable=true && summary.regressions==0`）；若主张“纯赚收益”，补充至少 1 条可证据化收益并回写 `quickstart.md`。

**Acceptance Scenarios**:

1. **Given** Runtime 处于默认档（`kernelId=core`、`diagnosticsLevel=off`、Debug mode 为 `prod` 且 errorOnly-only sinks），**When** 系统经历大量事务提交与 trait converge，**Then** 不会为 `state:update`/`trace:trait:*` 等“不会被消费”的事件构造 payload 或做额外分配。
2. **Given** 默认档下存在高频 `state:update` 事件源，**When** sinks 被判定为 errorOnly-only，**Then** 事件记录链路的热路径应为常数时间且不读取额外诊断上下文。

---

### User Story 2 - 显式开启观测时可解释且成本可控 (Priority: P1)

作为维护者/调优者，我希望在显式启用 Devtools/trace/diagnostics 档位时，系统仍能输出可序列化、可解释的最小 IR/锚点，并且能说明“哪些字段被裁剪/为何降级”；同时在关闭观测时，这些能力不会泄漏成本到默认档。

**Why this priority**: “可诊断性”与“性能证据”必须同时成立：默认零成本 + 需要时可解释，二者缺一都会让体系失效。

**Independent Test**: 同一套 workload 下，切换 diagnostics 档位（off → light/full），可导出事件与证据字段随档位变化而变化，但业务语义不变；并且 off 档位的 perf evidence 无回归。

**Acceptance Scenarios**:

1. **Given** 显式启用 Devtools 并将 diagnostics 档位设为 `light` 或 `full`，**When** 发生一次事务提交与 converge，**Then** Devtools 能拿到可序列化事件并解释 “dirty roots → 执行范围 → 降级原因”。
2. **Given** 将 diagnostics 档位切回 `off`，**When** 重复同一 workload，**Then** 相关解释字段被裁剪且不会引入额外开销（与默认档等价）。

---

### User Story 3 - 单内核默认，实验/对照才多内核 (Priority: P2)

作为仓库维护者，我希望用户默认只需理解“一个内核”的心智模型：`kernelId` 只是请求的内核族标识，默认是 `core`；只有在对照/试跑时才会请求非 `core` 的 kernel，并且 Full Cutover Gate 只在装配期判定，不影响运行期热路径。

**Why this priority**: 单内核默认是性能与可解释性的共同最优点；多内核必须显式且可控，否则会把“试验设施”变成默认税与歧义源。

**Independent Test**: 装配期启用/禁用 Full Cutover Gate 的行为差异可以被自动化验证；默认档不触发 Gate 判定。

**Acceptance Scenarios**:

1. **Given** 默认请求 `kernelId=core`，**When** Runtime 装配，**Then** 不评估 Full Cutover Gate（或评估成本为零/可忽略的常数），且运行期不基于 kernelId 做分支。
2. **Given** 显式请求 `kernelId!=core` 并启用 `fullCutover`，**When** Runtime 装配发现 fallback/missing binding，**Then** 装配直接失败并输出可解释的缺失/回退摘要与锚点（`txnSeq=0`）。

---

### Edge Cases

- 默认安装的 sinks 不是“只有 errorOnly”而是多个 sinks（例如额外 trace sink）：不能误判为“不会被消费”，不得丢事件。
- diagnostics=off 但仍启用 Devtools（或部分 trace）：事件裁剪/导出规则必须一致且可解释；off 档不得隐式构造 heavy payload。
- 浏览器环境与 Node 环境的 fallback 行为差异：优化不得改变 `lifecycle:error` 与 `diagnostic(warning/error)` 的兜底语义。
- 并发/调度导致的乱序：允许 Devtools 在启用时做最小对齐（例如 txn 锚点后补），但默认档不得为此承担常驻成本。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 在热路径入口做“可证明不会被消费”的门控：当 sinks 集合可判定为不会消费该类事件（当前至少覆盖 errorOnly-only）时，热路径 MUST 不构造该事件的 payload（包括但不限于 `state:update` 的 `state/dirtySet/traitSummary/replayEvent`，以及 trait converge 的 `dirtySummary/rootIds/topK/hotspots` 等）；未知/自定义 sinks 必须保守视为“可能消费”，不得误丢事件。
- **FR-002**: 在默认档（仅 errorOnly 行为）下，系统 MUST 为高频事件提供常数时间 fast-path：对非 `lifecycle:error`、非 `diagnostic(severity!=info)` 的事件，MUST 不读取额外诊断上下文且等价于直接丢弃。
- **FR-003**: `state:update` 的 Debug 事件 MUST 仅在存在至少一个会消费 `state:update` 的 sink 时才会进入记录链路；否则该事件 MUST 完全跳过（对外等价于未发生记录调用）。
- **FR-004**: trait converge/validate/check 等热路径上的诊断 payload 分层门控：slim decision（用于 `state:update.traitSummary`）MUST 仅在 sinks 非 errorOnly-only 时生成；heavy/exportable 细节（trace payload、topK/hotspots、静态 IR 导出等）MUST 进一步要求 `diagnosticsLevel!=off`；在默认档下 MUST 不出现与这些 payload 相关的额外数组分配或字符串 materialize。
- **FR-005**: kernelId/多内核能力 MUST 只影响装配期证据与 Gate 判定（例如 Full Cutover Gate）；运行期 per-op/per-txn 热路径 MUST 不基于 kernelId 做分支，单内核默认不得因为“支持未来多内核”而承担额外运行期开销。
- **FR-006**: 当显式启用观测（devtools/trace/diagnostics）时，系统 MUST 输出 Slim 且可序列化的事件与证据；并且 MUST 能解释任意裁剪/降级发生的原因（以稳定错误码/原因码表达，避免自由文本作为语义开关）。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 本特性影响运行时热路径，必须在实现前记录可复现的性能基线，并产出可对比的 Node + Browser perf evidence before/after/diff（同环境/同 `matrixId/matrixHash`/同 profile）；交付结论必须 `profile=default`（或 `soak`）且 `pnpm perf diff` 满足 `meta.comparability.comparable=true && summary.regressions==0`。
- **NFR-002**: 默认档的“观测相关开销”必须接近零：不得引入随事务次数/step 数增长的常驻分配；任何例外必须可度量、可解释，并在 plan.md 中写明预算与原因。
- **NFR-003**: 诊断事件与证据字段必须 Slim 且可序列化；默认档不得 materialize 大对象图或将不可序列化对象写入证据/事件缓存。
- **NFR-004**: 硬结论的 before/after/diff 必须在隔离 worktree/目录分别采集；混杂改动结果仅作线索不得宣称 Gate PASS。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 默认档（单内核 + diagnostics=off + errorOnly-only）下的 Node + Browser perf evidence diff 无回归（`meta.comparability.comparable=true && summary.regressions==0`），且结论可交接（落盘路径与 envId/profile 明确）。
- **SC-002**: 在默认档下，针对 `state:update` 与 trait converge 的“不会被消费即不付费”至少有 1 条自动化回归防线（测试或基准）能在出现隐式 payload 构造/分配时失败。
- **SC-003**: 对照/实验档下（显式开启 devtools/diagnostics），可导出事件仍可序列化并可解释裁剪/降级原因；关闭后恢复为默认档的零成本口径。
- **SC-004**: 若要主张“纯赚收益”，至少 1 条可证据化收益被明确记录（例如 `summary.improvements>0` 或 `evidenceDeltas` 中至少 1 条方向性改善），并回写到 `quickstart.md`。
