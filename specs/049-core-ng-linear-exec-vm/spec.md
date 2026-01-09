# Feature Specification: core-ng 线性执行 VM（Exec VM）

**Feature Branch**: `049-core-ng-linear-exec-vm`  
**Created**: 2025-12-27  
**Status**: Done  
**Input**: User description: "继续添加 049：把 core-ng 的 runtime-only NG 路线（线性指令流/Exec VM）做成一眼可见、全方位可执行的规格与规划（先完善文档，不进入实现阶段）。"

## Terminology

- **Exec VM（线性执行 VM）**：运行时热路径执行形态接近“编译产物”：线性指令流 + 整型索引 + buffer 复用 +（diagnostics=off）近零分配。
- **Exec IR**：构造期（JIT-style）从 Static IR 预编译得到的可执行工件（plan/访问器表/bitset/typed buffers）。
- **构造期预编译（JIT-style）**：在 `ManagedRuntime`/program generation 创建期完成“重活”，运行期窗口内只做线性执行。
- **证据门禁**：任何触及核心路径的变更必须以 `$logix-perf-evidence` 产出 Node + ≥1 条 headless browser 的 before/after/diff。

## Related (read-only references)

- `specs/046-core-ng-roadmap/`（路线总控：P1 runtime-only NG）
- `specs/045-dual-kernel-contract/`（Kernel Contract + 对照验证跑道）
- `specs/047-core-ng-full-cutover-gate/`（Full Cutover Gate：禁止 fallback 的门槛）
- `specs/039-trait-converge-int-exec-evidence/`（当前内核热路径整型化与 guardrails，可复用口径拦截负优化）
- `docs/specs/drafts/topics/logix-ng-architecture/`（NG 架构探索：线性指令流/flat memory/toolchain）

## Clarifications

### Session 2025-12-27

- Q: 049 是否要求引入构建期工具链（Vite/AOT）？ → A: 不要求；目标是 runtime-only NG（JIT-style 构造期预编译），但要求 AOT-ready（未来可选）。
- Q: 049 的核心约束是否“纯优化不改语义”？ → A: 是。不得改变事务窗口 0/1 commit、事务窗口禁 IO/async、稳定锚点与统一最小 IR 口径。
- Q: 049 是否允许“半成品态”（ID→string→split/join）作为默认路径？ → A: 不允许；任何中间态只能在显式试跑分支下存在，并被证据门禁拦截（参考 039 Guardrails）。

### Session 2025-12-28

- AUTO: Q: 本特性的 perf evidence 预算口径是什么？ → A: 以 `.codex/skills/logix-perf-evidence/assets/matrix.json` 为唯一 SSoT；交付结论必须 `profile=default`（或 `soak`）并满足 `pnpm perf diff` 输出 `meta.comparability.comparable=true` 且 `summary.regressions==0`；before/after 必须 `meta.matrixId/matrixHash` 一致。
- AUTO: Q: perf evidence 采集是否允许在 dev 工作区（git dirty）完成？ → A: 允许（当前阶段）；但必须确保 `matrix/config/env` 一致，并在 diff 中保留 `git.dirty.*` warnings；若出现 `stabilityWarning` 或结论存疑，必须复测（必要时升级到 `profile=soak`）。
- AUTO: Q: Perf Gate 必须覆盖哪些诊断档位？ → A: P1 suites 的 Gate baseline 以 `diagnostics=off` 为准；light/full 仅用于开销曲线与可解释链路验证，不作为默认 Gate baseline。
- AUTO: Q: Exec IR/Exec VM 无法生成或缺少能力时的默认策略？ → A: 允许显式降级到保守路径，但必须证据化 `reasonCode`；在 047/Full Cutover Gate 覆盖场景中降级视为 FAIL（必须先补齐能力/证据化再切默认）。
- AUTO: Q: bitset 清零与 buffer 复用的默认策略是什么？ → A: 默认先采用最简单可证据化策略（例如 `fill(0)` 清零 + buffer pool 复用），只有当 perf evidence 显示清零/分配主导时才引入更复杂优化，并用 microbench 证明收益。
- AUTO: Q: “半成品态/字符串解析”如何被守护？ → A: 必须有守护测试/微基准能在 txn/exec 热点检测到 `split/join` 往返或 `id→string→split`；一旦出现视为 Gate FAIL。

### Session 2025-12-29

- AUTO: Q: perf evidence 的 Gate PASS 是否要求 Node 与 Browser 的 diff 同时满足 `comparable=true && regressions==0`？ → A: 是；Node 与 Browser 必须分别 `comparable=true` 且 `summary.regressions==0`，任一 FAIL 则整体 FAIL；结论必须分别写出两端状态与定位入口（避免 cherry-pick）。
- AUTO: Q: Exec VM 的“未命中原因”是否允许自由文本？ → A: 不允许；必须输出稳定的 `reasonCode`（枚举码，Slim、可序列化），可选 `reasonDetail` 仅用于 light/full；diagnostics=off 不输出。
- AUTO: Q: AOT-ready 的最低交付口径是什么？ → A: Exec IR 必须数据化/可序列化/可对比，包含 `execIrVersion` 与稳定 `execIrHash`；未来 AOT 只替换工件生产方式，不改变工件 schema 与证据口径。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 热路径执行形态接近“编译产物”（纯优化） (Priority: P1)

作为运行时维护者，我希望在 `core-ng` 中把关键热路径（尤其 converge/txn）改造成 Exec VM 形态：运行期窗口内只执行线性 plan，避免遍历复杂对象结构、避免字符串解析、避免频繁分配，从而显著降低 p95 与长尾抖动。

**Why this priority**: 这是 runtime-only NG 的核心收益来源，也是后续 Full Cutover（047）与切默认（048）能“纯赚且不回归”的基础。

**Independent Test**: 只运行本 spec 绑定的对照验证与 perf suites，就能判断：Exec VM 是否真的在热路径生效、是否无回归、是否有可解释证据。

**Acceptance Scenarios**:

1. **Given** diagnostics=off 且启用 core-ng Exec VM，**When** 执行一次 converge/txn 热路径窗口，**Then** 运行期窗口内不应出现可观测的字符串解析热点与额外分配热点（以证据/基准判定）。
2. **Given** core 与 core-ng 执行同一交互序列，**When** 运行 045 的 contract verification harness，**Then** 差异报告必须为空或在允许差异集合内（不得语义漂移）。

---

### User Story 2 - 可诊断、可对照、off 近零成本 (Priority: P1)

作为平台/Devtools/Sandbox 维护者，我希望 Exec VM 的引入不破坏统一最小 IR 与可解释链路：diagnostics=off 近零成本；diagnostics=light/sampled/full 能解释“是否命中 Exec IR/plan/访问器表、发生了什么降级/回退、预算为何触发”。

**Why this priority**: 没有可解释性，性能优化不可持续；而额外诊断分配会反噬热路径。

**Independent Test**: 在 off/light/sampled/full 四档下跑同一套 suites，输出证据字段可序列化、可裁剪，且 off 不引入显著开销。

**Acceptance Scenarios**:

1. **Given** diagnostics=off，**When** 执行 converge/txn suites，**Then** 诊断机制本身不引入显著额外分配或 O(n) 扫描。
2. **Given** diagnostics=light/sampled/full，**When** 执行同一 suites，**Then** 证据能解释 Exec VM 是否生效（命中/未命中原因、plan/缓存摘要、预算结果），且字段 Slim 可序列化。

---

### User Story 3 - AOT-ready（但不绑定工具链）(Priority: P2)

作为长期维护者，我希望 Exec VM 的工件形态足够“数据化/可序列化/可对比”，使未来可以用“构建期产出等价工件”的方式加速 cold build，而不是把工具链长期税强加到默认运行路径上。

**Why this priority**: 你希望极致性能但不希望被 Vite/AOT 绑死；AOT 只能在证据驱动下作为可选加速器。

**Independent Test**: 在不引入任何构建期工具链的情况下，core-ng 仍能生成等价 Exec IR 并达标；未来引入 AOT 时只替换工件生产方式，不改变对外语义与证据口径。

---

### Edge Cases

- Exec IR 编译失败或缺能力：允许显式降级到保守路径，必须证据化 `reasonCode`；在 047 覆盖场景中降级视为 FAIL。
- Browser-only 或 Node-only 回归：任一平台 diff 出现 regression 都视为 Gate FAIL；结论必须分别写出 Node/Browser 状态与定位入口。
- FieldPathId 极大导致 bitset clear 成本主导：默认先 `fill(0)` 清零；如 evidence 显示主导，则引入更复杂策略（如 generation stamping）并用 microbench 证明收益。
- diagnostics=off 下仍发生 steps 数组/top3 sort 等分配：视为 bug；必须有 guard test 或 microbench 能稳定复现并阻止回归。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 在 core-ng 中引入 Exec VM 执行形态：运行期窗口内执行线性 plan；重活必须发生在构造期预编译（JIT-style），不得在每次窗口内重复构建 Exec IR。
- **FR-002**: Exec VM 热路径 MUST 避免字符串解析与对象分配：不得在 loop 内 `split/join`、不得 materialize patch 对象、不得隐式创建数组（例如 rest 参数）。
- **FR-003**: 系统 MUST 复用 045 的 Kernel Contract 与对照验证 harness：core vs core-ng 的契约一致性必须可重复验证，并输出结构化差异（含稳定锚点）。
- **FR-004**: 系统 MUST 提供 Exec VM 的可解释证据（可裁剪）：至少能解释“命中/未命中、原因码（`reasonCode`）、关键摘要”，并且 off 档位近零成本。
- **FR-005**: 如 Exec VM 需要降级/回退策略，系统 MUST 将其视为显式策略并证据化；不得隐式 fallback 进入默认路径（与 047/048 对齐）。
- **FR-006**: 系统 MUST 保证 Exec IR 工件数据化/可序列化/可对比，并带 `execIrVersion` 与稳定 `execIrHash`，以支撑 AOT-ready（未来只替换生产方式，不改变 schema 与证据口径）。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 任何触及热路径的改动 MUST 使用 `$logix-perf-evidence` 产出 Node + ≥1 条 headless browser before/after/diff；交付结论必须 `profile=default`（或 `soak`），且 before/after 必须满足 `meta.matrixId/matrixHash` 一致；Node 与 Browser 的 `pnpm perf diff` 输出必须分别满足 `meta.comparability.comparable=true` 且 `summary.regressions==0`，任一不满足则 Gate FAIL（不得宣称 PASS）。
- **NFR-002**: `diagnostics=off` 下额外开销必须接近零（≤3% 作为默认门槛，具体以证据裁决）；off 下不得出现可观测的常驻分配。
- **NFR-003**: 统一最小 IR（Static IR + Dynamic Trace）与稳定锚点（instanceId/txnSeq/opSeq）必须保持；不得引入并行真相源。
- **NFR-004**: 事务窗口必须保持同步：不得引入事务内 IO/async，不得引入写逃逸。

### Key Entities _(include if feature involves data)_

- **Exec IR**: 构造期预编译得到的可执行工件（plan/访问器表/bitset/buffers），用于热路径线性执行。
- **Instruction Stream**: Exec VM 的线性指令流（可视为 plan 的具体化）。
- **Perf Evidence Set**: `$logix-perf-evidence` 输出的 Node+Browser before/after/diff 工件集合（落盘到本 spec 目录）。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: core-ng Exec VM 可被对照验证 harness 驱动并通过契约一致性验证（core vs core-ng），差异可序列化且带稳定锚点。
- **SC-002**: 在 Node + Browser 的 P1 suites 上，Node 与 Browser 的 before/after perf diff 必须分别满足 `meta.comparability.comparable=true` 且 `summary.regressions==0`；并在至少 1 个关键场景拿到可证据化收益（推荐：`p95` 下降 ≥20% 或 heap/alloc delta 改善）。
- **SC-003**: diagnostics=off 下额外开销可证据化为近零（默认 ≤3%），且 off 不产生 steps/top3/label 等无谓分配。
