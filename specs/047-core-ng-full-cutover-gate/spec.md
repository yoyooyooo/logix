# Feature Specification: core-ng 全套切换达标门槛（无 fallback）

**Feature Branch**: `047-core-ng-full-cutover-gate`  
**Created**: 2025-12-27  
**Status**: Draft  
**Input**: User description: "把 047（core-ng 全套切换达标门槛）与 048（切默认迁移）做成一眼可见、全方位可执行的规划产物；先完善规格与计划，不进入实现阶段。"

## Terminology

- **全套切换（Full Cutover）**：在“宣称可切默认/准备切默认”的语义下，运行时的 Kernel Contract 覆盖范围内 **所有** serviceId 都必须绑定到 `core-ng` 的实现，且 **禁止 fallback** 到 builtin/core。
- **fallback**：当请求 `core-ng` 但某个 serviceId 的实现缺失/不达标，运行时退回 builtin/core 的行为；在 `trial-run/test/dev` 可允许（并必须证据化），但在 Full Cutover Gate 下必须视为失败。
- **Kernel Contract**：由 `specs/045-dual-kernel-contract/` 固化的“上层只依赖 `@logix/core`”的可替换内核契约与证据形态。
- **证据门禁**：任何触及核心路径的变更必须以 `$logix-perf-evidence` 产出 Node + ≥1 条 headless browser 的 before/after/diff，并用结构化证据阻断负优化；证据采集必须隔离（独立 `git worktree/单独目录`），混杂工作区结果仅作线索不得用于宣称 Gate PASS。

## Related (read-only references)

- `specs/046-core-ng-roadmap/`（After 045 路线总控与 spec registry）
- `specs/045-dual-kernel-contract/`（Kernel Contract 与对照验证跑道）
- `specs/057-core-ng-static-deps-without-proxy/`（读状态车道：ReadQuery/SelectorSpec + SelectorGraph）
- `specs/039-trait-converge-int-exec-evidence/`（当前内核够硬：热路径证据达标与 guardrails）
- `.specify/memory/constitution.md`（双内核演进与证据门禁硬约束）

## Clarifications

### Session 2025-12-27

- Q: “全套切换达标”是否允许缺失 service 退回 builtin？ → A: 不允许。Full Cutover Gate 下任何 fallback 都必须被视为失败（可解释、可序列化、可定位）。
- Q: 本 spec 是否要求实现 core-ng 的性能优化本体？ → A: 不要求；本 spec 只定义“何谓可切默认”的硬门槛与验证矩阵，并拆出可执行 tasks，供实现阶段按证据推进。
- Q: 证据门槛是否要求 Browser 跑分？ → A: 必须包含 ≥1 条 headless browser（避免 Node-only 误判）。

### Session 2025-12-28

- Q: `$logix-perf-evidence` 的采集隔离要求怎么定？ → A: 必须隔离：在独立 `git worktree/单独目录` 中采集；混杂工作区结果只能作为线索，不得作为 Gate 达标证据。
- Q: Full Cutover 的 coverage matrix（必选 serviceId 列表）SSoT 落点？ → A: 以代码为 SSoT：在 `@logix/core`（优先 `packages/logix-core/src/Kernel.ts`）导出读取入口；测试/CI/harness 只读此处；spec/docs 仅解释口径。
- Q: Full Cutover 的 coverage 是否要求全覆盖 Kernel Contract 的可替换 services？ → A: 要求全覆盖：coverage 必须等于 Kernel Contract 当前所有可替换 `serviceId`；新增 `serviceId` 必须同步纳入，否则视为 Gate 失真。
- Q: Gate 失败输出的最小可序列化证据锚点必须包含哪些字段？ → A: `kernelId + missingServiceIds + moduleId/instanceId/txnSeq`（完整 runtimeServicesEvidence 仅 light/full）。
- Q: Full Cutover Gate 若在装配期就失败（缺 serviceId），此时可能还没有真实 txnSeq；最小失败锚点里的 txnSeq 怎么定义？ → A: 允许 `txnSeq=0`（约定 `0=assembly`），仍满足最小锚点字段集合。
- Q: 若引入“允许差异白名单”（contract diff allowlist），其单一事实源（SSoT）落点？ → A: 以代码为 SSoT：在 `@logix/core` 导出读取入口；测试/CI/harness 只读此处；spec/docs 仅解释口径。
- Q: 当 diff 命中 allowlist 时，Full Cutover Gate 结果如何表达？ → A: 仍算 PASS，但输出 `allowedDiffs` 的最小摘要（Slim/可序列化），用于审计与复核。
- Q: Full Cutover Gate 的运行入口最小要求？ → A: 提供 `@logix/core` 的一键入口（例如 `Reflection.verifyFullCutoverGate`），CI/TrialRun/Agent 统一调用。
- Q: Full Cutover Gate 的默认 diagnostics 档位要求？ → A: 必须在 `diagnostics=off` 下也可运行并给出最小结果（Slim/可序列化）；light/full 仅用于补充细节。
- Q: contract diff allowlist 的粒度/作用域如何定义？ → A: allowlist 仅允许 “op meta 的部分 key” 差异（以 `metaKey` 作为条目）；任何 op 增删、模块/种类/名称变化、以及非 allowlist metaKey 的差异都必须 FAIL（避免掩盖语义漂移）。
- Q: perf evidence 的 suites/budgets 的单一事实源（SSoT）怎么定？ → A: 统一以 `.codex/skills/logix-perf-evidence/assets/matrix.json` 为 SSoT（`priority/suites/budgets`），并以 `matrixId+matrixHash` 保证可比性；spec/plan 只声明“至少覆盖 P1 + profile=default”。
- Q: perf evidence 的 profile 门槛是否需要定死？ → A: 需要。Gate PASS 的硬结论至少要求 `profile=default`；`soak` 作为更稳的可选复核档；`quick` 仅作迭代线索，不得用于宣称达标。
- Q: allowlist 的 SSoT 落点与结构如何定义？ → A: SSoT=代码：在 `@logix/core` 导出读取入口（例如 `KernelContractMetaAllowlist: ReadonlyArray<{ metaKey; reason? }>`）；验证器仅用它限制 op.meta 的可比较 key（避免 spec/CI 漂移）。
- Q: Gate PASS 是否允许 `allowedDiffs` 非空（命中 allowlist）？ → A: 允许仍算 PASS，但必须在结论/quickstart 中显式标注“带 allowlist 通过”，并输出 `allowedDiffs` 最小摘要供人工复核与审计。
- Q: allowlist 的默认值策略是什么？ → A: 默认禁用（空 allowlist）；仅在明确需要时才显式开启并逐条记录 reason（避免无意放行）。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - “可切默认”判定可自动化且不误判 (Priority: P1)

作为运行时维护者，我希望有一套明确、可自动化的 Full Cutover Gate：当我们宣称“core-ng 已可作为默认实现”时，系统能证明 **无 fallback、契约一致性通过、预算内**；否则必须结构化失败并指出缺口。

**Why this priority**: 这是 NG 路线的分水岭。没有硬门槛就会出现“半成品态混入默认路径”，要么语义漂移，要么负优化，要么证据链断裂。

**Independent Test**: 只运行本 spec 定义的验证矩阵（无需阅读源码），能得到：PASS（可切默认）或 FAIL（缺口列表 + 证据/差异锚点 + 预算回归说明）。

**Acceptance Scenarios**:

1. **Given** 请求 `kernelId="core-ng"` 且启用 Full Cutover Gate，**When** 任一 serviceId 发生 fallback，**Then** Gate 必须 FAIL，且失败输出包含：`kernelId`、`missingServiceIds`、fallback 目标 `implId`（如有）、以及最小可序列化证据锚点（`moduleId/instanceId/txnSeq`）。
2. **Given** Full Cutover Gate 通过，**When** 用对照验证 harness 跑 core vs core-ng，**Then** 差异报告必须为“空差异”或“允许差异集合内”（可配置白名单），并包含稳定锚点（instanceId/txnSeq/opSeq）。

---

### User Story 2 - 默认路径性能预算不回归且可解释 (Priority: P1)

作为平台与上层生态建设者，我希望“可切默认”的判定不仅覆盖契约一致性，还覆盖性能预算：切换到 core-ng 后默认路径不出现不可解释回归，且证据与诊断链路仍能解释原因。

**Why this priority**: 平台建设依赖“地基可预测”。如果切默认带来长尾抖动或观测口径漂移，上层成本会被放大。

**Independent Test**: 在 Node + Browser 运行 `$logix-perf-evidence` 的指定 suites，得到 core vs core-ng 的 before/after/diff，并能用统一口径解释预算内/外。

**Acceptance Scenarios**:

1. **Given** core 与 core-ng 都处于 Full Cutover（无 fallback），**When** 采集并 diff 关键 suites，**Then** perf diff 满足预算门槛（suites/budgets SSoT=matrix.json，至少覆盖 `priority=P1`；before/after 需 `matrixId+matrixHash` 一致且 `comparability.comparable=true`）。
2. **Given** 发生预算回归，**When** 查看证据，**Then** 能定位回归归因的最小摘要（至少包含 suites、profile、诊断档位、kernel binding 摘要）。

---

### User Story 3 - 支持矩阵可演进且不引入并行真相源 (Priority: P2)

作为运行时维护者，我希望 Full Cutover Gate 的“覆盖范围（哪些 serviceId 必须被 core-ng 接管）”可以演进，但必须通过单一事实源维护，并且每次扩面都被证据门禁拦住回归。

**Why this priority**: Kernel Contract 会演进。缺少矩阵治理会导致“新增 serviceId 未被纳入 cutover 判定”的隐性缺口。

**Independent Test**: 更新一次支持矩阵后，只需跑一套验证矩阵即可确认：coverage 扩面已生效、无 fallback、预算不回归。

**Acceptance Scenarios**:

1. **Given** Kernel Contract 新增/扩展了可替换 service，**When** 更新 Full Cutover 覆盖矩阵，**Then** 若 core-ng 未实现该 service，则 Gate 必须 FAIL（不得静默忽略）。

---

### Edge Cases

- What happens when core-ng 的某个 service 实现存在但行为与 core 不一致（语义差异）？
- What happens when 只有 Browser 侧回归（Node 不回归）？
- How does system handle “仅 trial-run 混用”的试跑态被误当成“已可切默认”？
- How does system handle 允许差异（例如观测字段或非关键优化）与禁止差异（语义/锚点漂移）之间的边界？

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 定义并实现 Full Cutover Gate：在 gate 模式下请求 `core-ng` 时，Kernel Contract 覆盖范围内任何 serviceId 的 fallback 都必须导致结构化失败（不得静默退回）。
- **FR-002**: 系统 MUST 提供“覆盖矩阵（coverage matrix）”的单一事实源（SSoT=代码）：在 `@logix/core` 导出可读取入口（优先 `packages/logix-core/src/Kernel.ts`），供对照验证 harness 与测试读取；coverage MUST 等于 Kernel Contract 当前所有可替换 `serviceId`（新增/扩展必须同步纳入，避免并行真相源与漏判）。
- **FR-003**: 系统 MUST 基于 045 的对照验证 harness，提供 core vs core-ng 的契约一致性验证入口；差异报告必须是机器可读、可序列化，并带稳定锚点（instanceId/txnSeq/opSeq）。
- **FR-004**: 系统 MUST 在证据中可解释“请求的 kernelId”与“实际 bindings（serviceId→implId）”以及是否发生 fallback；Full Cutover Gate 的 PASS/FAIL 必须可被证据复核（不依赖日志），FAIL 至少包含 `kernelId + missingServiceIds + moduleId/instanceId/txnSeq` 的最小可序列化锚点；若在装配期失败，则 `txnSeq=0` 代表 assembly。
- **FR-005**: 系统 MUST 明确允许差异的口径（如需白名单）：允许差异必须显式登记并可审计；若引入 allowlist，则其 SSoT MUST 为代码（`@logix/core` 导出读取入口，供测试/CI/harness 读取），避免并行真相源；allowlist 仅允许 “op meta 的部分 key” 差异（以 `metaKey` 为条目），不得放行 op 增删/重排、以及任何结构性差异；命中 allowlist 时 Gate 仍可 PASS，但必须在结果中输出 `allowedDiffs` 的最小摘要（Slim/可序列化）；禁止差异（语义/锚点漂移/事务边界破坏）必须导致失败。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: Full Cutover Gate MUST 将 `$logix-perf-evidence` 作为硬门槛：Node + ≥1 条 headless browser before/after/diff 必须落盘并可复现；证据采集必须隔离（独立 `git worktree/单独目录`），否则不得用于宣称 Gate PASS。
- **NFR-002**: 本 gate 涉及的任何新增诊断/证据字段 MUST Slim 且可序列化；Full Cutover Gate MUST 在 `diagnostics=off` 下可运行并输出最小结果；`diagnostics=off` 下不得引入显著额外开销或常驻分配。
- **NFR-003**: 任何验证与证据对齐 MUST 以统一最小 IR（Static IR + Dynamic Trace）为唯一事实源，且使用稳定标识（instanceId/txnSeq/opSeq）。
- **NFR-004**: 事务窗口边界 MUST 保持同步：不得引入事务内 IO/async；不得引入新的写逃逸通道。

### Key Entities _(include if feature involves data)_

- **Cutover Coverage Matrix**: 定义 Full Cutover Gate 覆盖的 serviceId 集合，以及每个 service 的达标条件（行为一致性 + 预算 + 证据）。
- **Cutover Gate Result**: PASS/FAIL 的结构化结果（失败必须包含缺口列表与证据锚点）。
- **Contract Diff Report**: 045 harness 输出的结构化差异报告（含稳定锚点）。
- **Perf Evidence Set**: `$logix-perf-evidence` 输出的 Node+Browser before/after/diff 工件集合（落盘到本 spec 目录）。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 存在一套可自动化执行的 Full Cutover Gate（包含 coverage matrix + 对照验证 + 证据门禁），并能在“fallback/差异/预算回归”时给出结构化失败。
- **SC-002**: 在 Node + Browser 的关键 suites 上，core-ng Full Cutover 的 perf diff 满足预算门槛（suites/budgets 的口径以 `.codex/skills/logix-perf-evidence/assets/matrix.json` 为裁决，至少覆盖 `priority=P1`），且证据可复现、可落盘、可审计。
- **SC-003**: Gate 通过时，core-ng 的 bindings 证据可证明“无 fallback”；Gate 失败时，缺口 serviceId 可定位且可复现（不依赖日志）。
