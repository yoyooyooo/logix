# Feature Specification: Trait 派生收敛热路径性能与可诊断性达标

**Feature Branch**: `039-trait-converge-perf`  
**Created**: 2025-12-26  
**Status**: Done  
**Input**: User description: "Trait 派生收敛（Derived Converge）热路径性能与可诊断性优化：在保持单事务窗口 0/1 次提交、事务窗口禁止 IO、稳定标识（instanceId/txnSeq/opSeq）与统一最小 IR（Static IR + Dynamic Trace）约束不变的前提下，显著降低一次收敛的 CPU 时间与内存分配，并提供可复现的性能基线与诊断证据；同时清理已过时的 VM 优化草案，避免并行真相源。"

## Assumptions

- 本特性不改变对外可观察语义，只围绕“派生收敛热路径”的性能与可诊断性达标展开。
- “操作窗口 / 事务窗口 / 0 或 1 次提交 / 禁止 IO / 稳定标识 / 最小 IR”这些既有硬约束继续作为验收红线。
- 允许为了达成性能目标进行内部重构，但必须以可复现基线与证据作为裁决依据。
- “整型化/ID 化”属于内部性能实现细节：不新增对外心智模型与公共 API 概念，证据与诊断仍以既有协议表达。

## Out of Scope

- 不新增或改变 Trait DSL 的对外表达能力（例如新增语法糖/新特性类型）。
- 不改变数组/错误树/交互态等对外心智模型（这些由上层规范裁决）。
- 不在本特性中扩展 list.item scope 的派生执行能力（如需，另开特性）。
- 不引入新的 IO/异步通道进入事务窗口；异步能力仍应通过既有机制承载。

## Dependencies

- 至少 1 个“复杂表单基准场景”和 1 个“可调合成压力场景”，用于可复现的性能基线与回归。
- 诊断信号与证据导出链路能被 Devtools/对齐实验室消费（Slim + 可序列化）。
- 明确并固化“诊断开启/关闭”的性能口径，确保能测量并约束诊断开销。

### Benchmark Protocol（验收绑定）

- 业务型（Browser，P1）：suiteId=`form.listScopeCheck`（矩阵与采集口径以 `$logix-perf-evidence` 为裁决）。
- 合成型（Node + Browser，P1）：suiteId=`converge.txnCommit`（同上）。
- 诊断开销（Browser，P3）：suiteId=`diagnostics.overhead.e2e`（同上；用于量化 diagnostics off/light/sampled/full 的开销曲线，满足 `NFR-002` 的“可测量”要求）。
- 术语映射（用于 `SC-002/SC-003`）：
  - “10× scale”：`converge.txnCommit.steps=2000`（相对 `steps=200`）
  - “local/dirty case”：`dirtyRootsRatio=0.05`
  - “near-full case”：`dirtyRootsRatio=0.75`
  - “common case”：`convergeMode=auto + dirtyRootsRatio=0.05`（在 `steps=2000` 下）
- heap/alloc delta 的可判门口径：以 Node runner 输出的 `runtime.heapDeltaBytes.{median,p95}` 为准（browser 侧只判 time/阈值，不要求 heap delta）。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 复杂联动下仍流畅 (Priority: P1)

作为业务开发者，我希望在包含大量派生字段与联动规则的复杂表单中，连续输入/频繁操作时系统仍保持可用与稳定：每次操作窗口内派生能够收敛，并且对外只产生 0 或 1 次最终可观察提交。

**Why this priority**: 这是 Trait 系统进入真实业务仓库的底线体验；热路径抖动会直接导致输入卡顿与难以调试的长尾问题。

**Independent Test**: 通过一个“复杂表单基准场景”和一个“可调合成压力场景”分别测量单次操作窗口内派生收敛的 p50/p95 时间与堆内存增量，并验证提交次数与语义不变。

**Acceptance Scenarios**:

1. **Given** 一个包含大量派生规则的基准场景，**When** 执行一段固定的高频输入脚本，**Then** 95% 的操作窗口能在预算内完成派生收敛且对外提交次数为 0/1。
2. **Given** 相同输入序列与相同初始状态，**When** 运行多次（含冷启动与热启动），**Then** 最终可观察状态结果一致，且性能指标的抖动处于可解释范围（有诊断证据支持）。

---

### User Story 2 - 性能回归可定位 (Priority: P2)

作为运行时维护者，我希望当派生收敛出现性能回归或长尾抖动时，可以在不改动业务逻辑的前提下，通过结构化诊断信号定位“为什么触发、影响范围有多大、最贵的步骤是谁、是否发生降级/预算截断”。

**Why this priority**: 没有可解释链路，性能优化将不可持续；回归无法快速定位会拖慢迭代并影响业务信心。

**Independent Test**: 人为构造“近全量触发”“局部触发”“未知写入”“预算不足”“运行时错误”等场景，验证每次操作窗口都产出一致、可序列化且带稳定标识的诊断摘要，并能支撑对比与归因。

**Acceptance Scenarios**:

1. **Given** 一次局部写入导致的派生收敛，**When** 诊断开启，**Then** 可以从诊断摘要中读取：触发原因、影响范围摘要、执行/决策耗时、是否命中缓存/计划、以及最耗时步骤 Top-N。
2. **Given** 诊断关闭，**When** 执行同一基准场景，**Then** 诊断机制对热路径的额外开销接近零且不会引入可观测语义变化。

---

### User Story 3 - 超预算/错误安全降级 (Priority: P3)

作为业务开发者与运行时维护者，我希望当派生收敛在单次操作窗口内超出预算或遇到运行时错误时，系统不会产生“半成品”状态：要么保持本窗口开始时的稳定状态并阻止新提交，要么以明确的降级结果继续运行，并给出可解释证据。

**Why this priority**: 热路径的失败必须可控，否则会引入难以排查的状态撕裂与订阅闪烁。

**Independent Test**: 通过人为降低预算或注入错误，验证系统回退策略、对外提交次数、以及降级诊断证据。

**Acceptance Scenarios**:

1. **Given** 派生收敛预算被设置得极低，**When** 触发一次收敛，**Then** 系统在预算截断时不会提交半成品状态，并输出包含降级原因与关键摘要的诊断证据。
2. **Given** 某条派生规则在执行时抛出错误，**When** 触发一次收敛，**Then** 系统回退到窗口开始状态或按既定降级策略处理，并输出可序列化的错误摘要与降级口径。

---

### Edge Cases

- What happens when 本次窗口的写入集合不可追踪（未知写入/全量脏）？
- How does system handle 静态配置错误（循环依赖/多写者冲突）？
- What happens when “局部触发”反复出现导致计划缓存命中率极低（疑似 thrash）？
- How does system handle 极端规模（规则数与依赖边数提升 10 倍）下的长尾抖动与预算策略？

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST preserve existing external semantics of the Trait system: within one operation window, derived propagation MUST converge deterministically and MUST produce 0 or 1 final observable commit.
- **FR-002**: System MUST enforce a synchronous transaction boundary for derived converge: no IO/async work is allowed inside the operation window, and any escape MUST be detectable.
- **FR-003**: System MUST provide a reproducible benchmark protocol for the derived converge hot path, including at least one business-like scenario and one scalable synthetic scenario.
- **FR-004**: System MUST record baseline measurements for the benchmark protocol before optimization, and MUST support comparing future runs against that baseline.
- **FR-005**: System MUST provide structured, slim, serializable diagnostic evidence per operation window for derived converge, including stable identifiers and enough fields to explain “why/what/how much”.
- **FR-006**: System MUST bound worst-case planning/execution cost via explicit budgets; on budget exhaustion or runtime error, system MUST follow a safe downgrade strategy that avoids partial observable state.

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: System MUST define explicit performance budgets for the derived converge hot path (time and allocation/heap delta) and MUST document how they are measured (p50/p95, warmup policy, repeatability).
- **NFR-002**: Diagnostics MUST be structured and MUST have near-zero overhead when disabled; the overhead MUST be measurable and included in the baseline evidence.
- **NFR-003**: Diagnostic and replay surfaces MUST use deterministic identifiers for instance/transaction/operation sequencing (no random/time defaults).
- **NFR-004**: The transaction boundary MUST remain synchronous: no IO/async within the window, and no out-of-transaction write escape hatches.
- **NFR-005**: If this feature changes performance boundaries or introduces automatic policies, the project MUST update the relevant documentation to provide: a stable mental model (≤5 keywords), a coarse cost model, and an optimization ladder aligned with diagnostic evidence fields.
- **NFR-006**: Evidence artifacts (benchmarks, static IR summaries, diagnostic snapshots) MUST be slim and serializable, enabling controlled trial runs without relying on process-global mutable state.
- **NFR-007**: The benchmark protocol MUST include at least one automated headless browser run, since host-specific JIT/GC behaviors can materially affect converge hot path performance.
- **NFR-008**: The derived converge hot path MUST minimize string parsing and string allocations; internally it MUST prefer stable numeric identifiers (e.g., pathId/stepId) and only materialize strings when emitting diagnostics/evidence.

### Key Entities _(include if feature involves data)_

- **Operation Window**: A single user action–driven synchronous state change window that may trigger derived converge and ends with 0/1 observable commit.
- **Derived Converge Evidence**: A structured, serializable summary emitted per window to explain trigger cause, affected scope, budgets, and top contributors.
- **Performance Baseline**: A recorded set of benchmark results (time and allocation/heap delta) used for regression detection and improvement claims.
- **Stable Identifiers**: Deterministic identifiers for instance/transaction/operation sequencing used across evidence and replay surfaces.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Baseline evidence exists for the benchmark protocol (business-like + synthetic), with p50/p95 time for both, and heap/alloc delta measurements for the synthetic scenario (Node runner), with clear run metadata.
- **SC-002**: On the synthetic scenario (`converge.txnCommit`) at “10× scale”（`steps=2000`），p95 derived converge time improves by ≥ 3× in the common “local/dirty” case（`convergeMode=auto` + `dirtyRootsRatio=0.05`）and by ≥ 1.5× in the “near-full” case（`convergeMode=auto` + `dirtyRootsRatio=0.75`）, compared to the recorded baseline, without semantic changes.
- **SC-003**: On the same synthetic scenario, per-window heap/alloc delta improves by ≥ 5× in the common case compared to baseline（以 Node runner 的 `runtime.heapDeltaBytes.p95` 为主口径）。
- **SC-004**: With diagnostics enabled, each operation window produces serializable evidence that can explain: trigger reason, executed vs skipped steps, dirty summary, cache/plan evidence, budget outcomes, and top contributors.
- **SC-005**: With diagnostics disabled, the additional overhead introduced by this feature is ≤ 3% on p95 time and ≤ 3% on heap/alloc delta compared to running the same scenarios with diagnostics disabled.
- **SC-006**: Under forced budget exhaustion and injected runtime error scenarios, the system never commits partial observable state; downgrade behavior is deterministic and evidenced.
- **SC-007**: Baseline evidence includes at least one headless browser run and can be compared against future runs using the same protocol and metadata.
