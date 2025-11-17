# Feature Specification: core-ng 整型桥（Integer Bridge）

**Feature Branch**: `050-core-ng-integer-bridge`  
**Created**: 2025-12-27  
**Status**: Done  
**Input**: User description: "继续添加 050：把整型化（Integer Bridge）作为 core-ng 路线的关键 spec，定义从源头到执行的‘不往返、不半成品、可证据化’门槛与任务拆分（先完善文档，不进入实现阶段）。"

## Terminology

- **Integer Bridge（整型桥）**：把高层语义（fieldPath/step/reason 等）映射为稳定的整型 id，在热路径用 id/TypedArray 执行；仅在序列化/对外诊断边界 materialize string。
- **FieldPath**：字段路径的规范表示（建议为 segments 数组）；字符串形式仅作为输入/显示，不得在事务窗口内反复 `join/split`。
- **FieldPathId / StepId / ReasonCode**：稳定整型标识，用于 Exec IR/诊断锚点/差异对齐；必须可解释且可序列化。
- **半成品态**：将 path/step 转成 id 但在执行阶段又还原回 string 并 `split('.')` 的中间态；这是高风险负优化源，禁止成为默认路径。
- **证据门禁**：任何触及核心路径的改动必须以 `$logix-perf-evidence` 产出 Node + ≥1 条 headless browser 的 before/after/diff。

## Related (read-only references)

- `specs/046-core-ng-roadmap/`（路线总控：P1 全链路整型化）
- `specs/045-dual-kernel-contract/`（Kernel Contract 与对照验证跑道）
- `specs/039-trait-converge-int-exec-evidence/`（当前内核整型化与 guardrails（严禁 split/join 往返、argument-based recording、pathAsArray 透传））
- `specs/016-serializable-diagnostics-and-identity/`（稳定身份与可序列化证据）
- `specs/009-txn-patch-dirtyset/`（txn/patch/dirtyset 相关历史约束）
- `docs/specs/drafts/topics/logix-ng-architecture/`（NG 探索：integer handles / flat memory）

## Clarifications

### Session 2025-12-27

- Q: 050 是否会引入新的业务对外概念？ → A: 不引入。Integer Bridge 是内部执行与诊断实现细节；对外仍以统一最小 IR 与既有档位语义表达。
- Q: 050 是否要求立即覆盖所有场景？ → A: 不要求“一步到位”，但禁止半成品默认化；允许以显式试跑开关/分支阶段性推进，并用证据门禁拦截。
- Q: 050 是否允许事务窗口内 string↔array 往返？ → A: 不允许。事务窗口内必须避免 join→split 往返；仅在对外序列化/显示边界 materialize string。

### Session 2025-12-28

- AUTO: Q: 本特性的 perf evidence 预算口径是什么？ → A: 以 `.codex/skills/logix-perf-evidence/assets/matrix.json` 为唯一 SSoT；交付结论必须 `profile=default`（或 `soak`）并满足 `pnpm perf diff` 输出 `meta.comparability.comparable=true` 且 `summary.regressions==0`；before/after 必须 `meta.matrixId/matrixHash` 一致。
- AUTO: Q: perf evidence 采集是否允许在 dev 工作区（git dirty）完成？ → A: 允许（当前阶段）；但必须确保 `matrix/config/env` 一致，并在 diff 中保留 `git.dirty.*` warnings；若出现 `stabilityWarning` 或结论存疑，必须复测（必要时升级到 `profile=soak`）。
- AUTO: Q: 动态路径/无法整型化的写入如何处理？ → A: 允许，但必须在 txn 内仍以 FieldPath segments 进入 registry；若出现异常/超出容量，必须显式降级为 `dirtyAll=true` 并带 `DirtyAllReason`（Slim、可序列化），且该降级在 Perf Gate 覆盖场景中视为 FAIL（必须先收敛/证据化）。
- AUTO: Q: FieldPathId/StepId 的“稳定”要求到什么程度？ → A: 必须在同一 Static IR/同一交互序列下可重复对齐；id 分配不得依赖随机/时间，且 diff/对照验证的 primary anchors 仍以 `instanceId/txnSeq/opSeq` +（可解释的）path/step 锚点为准；mapping 必须可导出以复核。
- AUTO: Q: diagnostics=light/full 是否允许 materialize 可读字符串？ → A: 允许，但仅在事务外或 loop 外的缓存/摘要边界；不得在热循环里对每次操作做 join/split；`diagnostics=off` 下不 materialize。
- AUTO: Q: bitset 清零与稀疏 id 的默认策略是什么？ → A: 默认先采用最简单可证据化策略（例如 `fill(0)` 清零），只有当 perf evidence 显示清零主导时才引入 touched-words 等优化；并补充 microbench 证明收益。
- AUTO: Q: “半成品态”如何被守护？ → A: 必须有守护测试/微基准能在 txn/exec 热点检测到 `split/join` 往返（至少禁止 `id→string→split`）；一旦出现视为 Gate FAIL。
- AUTO: Q: Perf evidence 必须覆盖哪些档位？ → A: P1 suites 必须覆盖 `diagnostics=off`；light/full 仅作为开销曲线或诊断链路验证，不作为默认 Gate baseline。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 从源头到执行的整型闭环（无往返） (Priority: P1)

作为运行时维护者，我希望把“路径/步骤/原因”等高频语义从源头到执行全部整型化：事务内不再反复解析字符串，不再在 loop 内 split/join；执行阶段直接用 id 驱动访问器与计划，从而获得可预期的性能收益（纯赚且无负优化）。

**Why this priority**: 这是 Exec VM（049）与 039 的“最后半公里”。如果不打穿，会出现“查表 + split”双重成本，可能比全字符串更慢。

**Independent Test**: 通过性能证据 + 热点断言（microbench/profile）证明：事务窗口热循环内不再出现 split/join；并在 Node `converge.txnCommit` + Browser `converge.txnCommit`（converge-only）diff 中满足无回归。

**Acceptance Scenarios**:

1. **Given** converge/txn 热路径执行一次操作窗口，**When** diagnostics=off，**Then** 不应在热循环内出现 `path.split('.')` 或 string↔array 往返（以证据与守护测试判定）。
2. **Given** 输入为 string path 或 path segments，**When** 进入事务流水线，**Then** 系统必须能透传 segments（或等价 FieldPath 表示）直到 commit/证据边界；禁止 join→split 往返。

---

### User Story 2 - 稳定标识与可解释链路（不引入并行真相源）(Priority: P1)

作为 Devtools/Sandbox/对照验证维护者，我希望整型化引入的 id 是稳定且可解释的：在统一最小 IR 与差异报告中仍能用 stable anchors（instanceId/txnSeq/opSeq + pathId/stepId）串起因果链，并能映射回人类可读的字段路径/步骤名。

**Why this priority**: 如果 id 不稳定或不可解释，会破坏证据链与回放，导致优化不可持续。

**Independent Test**: 045 对照验证 harness 的差异锚点不漂移；证据字段可序列化且能映射回可读信息（至少在 diagnostics=light/full）。

**Acceptance Scenarios**:

1. **Given** 相同交互序列重复运行，**When** 导出证据/差异报告，**Then** 锚点（instanceId/txnSeq/opSeq）稳定且可对齐；pathId/stepId 可解释且可序列化。

---

### User Story 3 - 避免负优化的 guardrails（阶段性落地也安全）(Priority: P2)

作为维护者，我希望即使整型化需要分阶段落地，也不会出现“半成品态默认化”导致负优化：每次关键切换都必须有 before/after/diff 证据，并且在未打穿前不得切默认。

**Why this priority**: 整型化是最容易“做到一半反而更慢”的优化类型，必须工程化拦截。

**Independent Test**: 任何一次切换关键路径默认行为前，都必须存在对应证据文件与 diff 结论。

---

### Edge Cases

- What happens when FieldPathId 分布稀疏（bitset 内存浪费）？
- What happens when FieldPathId 数量极大（bitset fill 清零成本主导）？
- How does system handle 动态路径（运行期拼接 path）？是否必须降级/拒绝/证据化？
- What happens when mutative draft 复用引入意外成本（需要 microbench 证明）？

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 提供 FieldPath 的“源头零拷贝”表示（segments/FieldPath），并允许事务流水线透传该表示直到 commit/证据边界；不得在事务窗口内反复 join→split。
- **FR-002**: 系统 MUST 提供 argument-based patch recording（至少在 light 档位）：调用点不得创建 patch 对象；分支必须搬到 loop 外；禁止 rest 参数隐式数组分配。
- **FR-003**: 系统 MUST 在执行链路中使用整型 id 驱动访问器与计划（pathId/stepId/reasonCode），禁止 id→string→split 的半成品态进入默认路径。
- **FR-004**: 系统 MUST 为 FieldPathId/StepId/ReasonCode 提供可解释映射：diagnostics=light/full 可映射回可读信息；off 档位近零成本且不强制 materialize strings。
- **FR-005**: 系统 MUST 复用 045 的 Kernel Contract 与对照验证跑道：整型化不得破坏统一最小 IR 与稳定锚点；差异报告必须仍可对齐与解释。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 任何触及热路径的整型化改动 MUST 使用 `$logix-perf-evidence` 产出 Node `converge.txnCommit` + ≥1 条 headless browser `converge.txnCommit`（converge-only）before/after/diff；交付结论必须 `profile=default`（或 `soak`），且 before/after 必须满足 `meta.matrixId/matrixHash` 一致；`pnpm perf diff` 输出必须满足 `meta.comparability.comparable=true` 且 `summary.regressions==0`，否则不得宣称 Gate PASS。
- **NFR-002**: `diagnostics=off` 下额外开销必须接近零：off 下不得出现常驻分配或 O(n) 扫描；且在 P1 suites 的 perf diff 中不得引入新的回归阈值/等级退化。
- **NFR-003**: 统一最小 IR（Static IR + Dynamic Trace）与稳定锚点（instanceId/txnSeq/opSeq）必须保持；id 的引入不得造成锚点漂移或不可解释。
- **NFR-004**: 事务窗口必须保持同步：不得引入事务内 IO/async，不得引入写逃逸。

### Key Entities _(include if feature involves data)_

- **FieldPath**: segments 形式的字段路径表示（可透传/可规范化）。
- **Id Registry**: 将 FieldPath/Step/Reason 映射为稳定 id 的注册表（可解释、可序列化摘要）。
- **Perf Evidence Set**: `$logix-perf-evidence` 输出的 Node+Browser before/after/diff 工件集合。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 在关键热路径（converge/txn）中，事务窗口热循环内不再出现 split/join 往返热点（通过证据与守护测试/微基准复核）。
- **SC-002**: Node `converge.txnCommit` 与 Browser `converge.txnCommit` 的 before/after perf diff 满足 `meta.comparability.comparable=true` 且 `summary.regressions==0`；如要主张“纯赚收益”，补充至少 1 条可证据化收益（例如 `p95` 下降 ≥20% 或 heap/alloc 明显改善）。
- **SC-003**: diagnostics=light/full 下 id 可映射回可读信息且可序列化；diagnostics=off 下近零成本。
