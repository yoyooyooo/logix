# Feature Specification: 切默认到 core-ng（迁移与回退口径）

**Feature Branch**: `048-core-ng-default-switch-migration`
**Created**: 2025-12-27
**Status**: Superseded（已回退为默认 `core`）
**Input**: User description: "把 048 做成一眼可见、全方位可执行的迁移 spec：在满足 Full Cutover Gate 的前提下，把默认内核切到 core-ng，并提供可证据化的回退口径（不引入长期兼容层）。"

> NOTE（2025-12-31）：本 spec 记录了“把默认内核切到 `core-ng`”的实现与门槛口径；但当前仓库已选择 **单内核默认**（默认 `core`，`core-ng` 仅对照/试跑显式启用），因此本文中的“默认=core-ng”不再作为当前行为裁决。以 `specs/046-core-ng-roadmap/roadmap.md` 的 Policy Update 为准。

## Terminology

- **默认内核（Default Kernel）**：在创建 `ManagedRuntime` 时未显式指定 kernel 时，系统所选择的默认实现。
- **切默认（Default Switch）**：把默认内核从 `core` 切换为 `core-ng`，且默认路径必须是 Full Cutover（无 fallback）。
- **回退（Rollback）**：在显式配置下（例如 `kernelId="core"`），把某个 runtime 选择回 `core` 以便排障/对照；回退必须可解释且证据化，禁止隐式 fallback。
- **Full Cutover Gate**：`specs/047-core-ng-full-cutover-gate/` 定义的“可切默认”硬门槛（无 fallback + 契约一致性 + Node+Browser 证据预算）。
- **Fully Activated（全套激活）**：Full Cutover Gate 的结构化结果中，`verdict="PASS"` 且 `fullyActivated=true`（并且 `missingServiceIds=[]`、`fallbackServiceIds=[]`）。
- **证据门禁**：任何触及核心路径的变更必须以 `$logix-perf-evidence` 产出 Node + ≥1 条 headless browser 的 before/after/diff；证据采集必须隔离（独立 `git worktree/单独目录`），混杂工作区结果仅作线索不得用于宣称 Gate PASS。

## Related (read-only references)

- `specs/046-core-ng-roadmap/`（After 045 路线总控）
- `specs/047-core-ng-full-cutover-gate/`（切默认前置门槛：M3）
- `specs/045-dual-kernel-contract/`（Kernel Contract 与对照验证跑道）
- `specs/057-core-ng-static-deps-without-proxy/`（读状态车道：ReadQuery/SelectorSpec + SelectorGraph）
- `specs/039-trait-converge-int-exec-evidence/`（当前内核够硬：热路径证据达标）
- `.specify/memory/constitution.md`（双内核硬约束：上层只依赖 core、证据门禁、AOT-ready）

## Clarifications

### Session 2025-12-27

- Q: 切默认后是否允许“自动回退到 core（静默 fallback）”？ → A: 不允许。默认路径必须是 core-ng Full Cutover；任何回退只能显式配置并证据化。
- Q: 是否保留长期兼容层？ → A: 不保留。以迁移说明替代兼容层；回退仅作为显式排障/对照机制，不作为默认隐式路径。

### Session 2025-12-28

- Q: perf evidence 的采集隔离要求是否强制？ → A: 强制：所有 `$logix-perf-evidence` 的 Node+Browser before/after/diff 必须在独立 `git worktree/单独目录` 中采集；混杂工作区结果仅作线索，不得用于宣称 Gate PASS。
- Q: perf evidence 的 suites/budgets 的单一事实源（SSoT）怎么定？ → A: 统一以 `.codex/skills/logix-perf-evidence/assets/matrix.json` 为 SSoT（`priority/suites/budgets`），并以 `matrixId+matrixHash` 保证可比性；spec/plan 只声明“至少覆盖 P1 + profile=default”。
- Q: perf evidence 的 profile 门槛是否需要定死？ → A: 需要。切默认完成的硬结论至少要求 `profile=default`；`soak` 作为更稳的可选复核档；`quick` 仅作迭代线索，不得用于宣称完成。

### Session 2025-12-29

- AUTO: Q: Full Cutover Gate 未通过时是否允许合入/发布“切默认”？ → A: 不允许；切默认只允许在 `specs/047-core-ng-full-cutover-gate/` 结论为 PASS 后进行。
- AUTO: Q: 默认路径请求 `core-ng` 但未达 Full Cutover（缺 bindings）时系统如何处理？ → A: 必须结构化失败并输出最小可序列化证据锚点（不得 fallback；装配期允许 `txnSeq=0` 代表 assembly）。
- AUTO: Q: 只有 Browser 侧回归（Node 不回归）时是否仍可宣称切默认完成？ → A: 不可；Node 或 Browser 任一 required suite 回归都视为失败（`summary.regressions>0` 阻断）。
- AUTO: Q: 业务侧显式选择 kernel 但当前可用实现/绑定不匹配时口径是什么？ → A: 必须失败并可解释（输出 requested kernelId + 可用 kernels/bindings 摘要），禁止隐式 fallback。
- AUTO: Q: “fully activated” 的成功态证据口径如何判定？ → A: 以 Full Cutover Gate 的结构化结果为准：`verdict="PASS"` 且 `fullyActivated=true`（并且 `missingServiceIds=[]`、`fallbackServiceIds=[]`）。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 切默认后系统可用且可回退 (Priority: P1)

作为运行时维护者，我希望在满足 Full Cutover Gate 后，把默认内核切到 core-ng；并且在需要排障/对照时，可以显式把某个 runtime 回退到 core，且两者都可解释、可证据化。

**Why this priority**: 这是 M4 的核心交付：让平台/上层建设可以放心“押注默认路径”，同时仍保留可控的排障/对照手段。

**Independent Test**: 在不改业务代码的前提下：

- 默认创建 runtime → 证据显示 `core-ng` 且 fully activated；
- 显式配置创建 runtime（`kernelId="core"`）→ 证据显示 `core`；
- 两者均通过 045 的 contract verification harness（core vs core-ng 仍可对照）。

**Acceptance Scenarios**:

1. **Given** Full Cutover Gate 已通过，**When** 创建 runtime 未指定 kernel，**Then** 默认使用 `core-ng` 且无 fallback，并能导出可序列化证据证明这一点。
2. **Given** 需要排障，**When** 创建 runtime 显式指定 `kernelId="core"`，**Then** 运行时选择 core 且证据可解释；不得出现“请求 core 但实际混入 core-ng”的隐式行为。

---

### User Story 2 - 上层生态不被绑死在 core-ng (Priority: P1)

作为平台/Devtools/Sandbox/Logix React 的维护者，我希望切默认不会迫使上层直接依赖 `@logix/core-ng`；上层仍只依赖 `@logix/core`，并通过统一最小 IR 与证据字段解释当前内核选择与回退。

**Why this priority**: 防止生态分叉与重复迁移成本。

**Independent Test**: `@logix/react` 不依赖 core-ng；切默认后上层仍可运行并能导出/解释证据。

**Acceptance Scenarios**:

1. **Given** 切默认完成，**When** 构建/运行上层包，**Then** 不需要引入 `@logix/core-ng` 的直接依赖。

---

### User Story 3 - 迁移说明与证据落盘可交接 (Priority: P2)

作为仓库维护者，我希望切默认有清晰的迁移说明与回退口径，并且有落盘的 Node+Browser 证据（before/after/diff）供未来回归与审计使用。

**Why this priority**: 默认路径切换是最容易引发“事后说不清”的动作；必须可交接。

**Independent Test**: 只看本 spec 目录即可完成一次“切默认验证闭环”，并能找到证据文件与结论摘要。

**Acceptance Scenarios**:

1. **Given** 切默认完成，**When** 查阅本 spec 的 quickstart，**Then** 能找到迁移步骤、回退步骤与证据文件路径（Node+Browser before/after/diff）。

---

### Edge Cases

- Full Cutover Gate 未通过：不得合入/发布切默认；若本地强行切默认导致默认路径请求 `core-ng` 但缺 bindings，必须 FAIL（不得 fallback），并输出最小可序列化证据锚点。
- Browser-only 回归（Node 不回归）：仍视为 FAIL；任一 required suite 回归都阻断完成结论。
- 显式选择 kernel 但可用实现/绑定不匹配：必须 FAIL 且可解释（requested kernelId + 可用 kernels/bindings 摘要），禁止隐式 fallback。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 将默认内核切换为 `core-ng`，且默认路径必须是 Full Cutover（无 fallback）；切默认必须以证据门禁裁决（不得口头宣称）。
- **FR-002**: 系统 MUST 提供显式回退机制：允许在创建 runtime 时显式选择 `kernelId="core"`；该回退必须可解释且证据化，禁止隐式 fallback。
- **FR-003**: 系统 MUST 把 “Full Cutover Gate 已通过” 作为切默认的前置条件（依赖 `specs/047-core-ng-full-cutover-gate/` 的验证矩阵与证据落盘）。
- **FR-004**: 上层生态 MUST 继续只依赖 `@logix/core`：除少量测试/基准/试跑外，仓库内 consumer 不得直接依赖 `@logix/core-ng`。
- **FR-005**: 系统 MUST 更新迁移说明与导航回写：包含切默认步骤、回退步骤、风险提示与证据文件落点（不提供长期兼容层），并回写 046（M4 指向 048）与相关导航入口避免口径漂移。
- **FR-006**: 系统 MUST 在默认/回退/失败（缺 bindings、请求不可用 kernel 等）场景下导出可序列化证据；失败至少输出最小可序列化证据锚点（`kernelId + missingServiceIds + moduleId/instanceId/txnSeq`，装配期允许 `txnSeq=0`）。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 切默认必须通过 `$logix-perf-evidence` 的 Node + ≥1 条 headless browser before/after/diff，且满足预算门槛（suites/budgets SSoT=matrix.json；至少覆盖 `priority=P1`；`pnpm perf diff` 要求 `comparability.comparable=true` 且 `summary.regressions==0`）；硬结论至少要求 `profile=default`（`quick` 仅线索；`soak` 可选复核）；证据采集必须隔离（独立 `git worktree/单独目录`），否则不得用于宣称切默认完成。
- **NFR-002**: 诊断与证据字段 MUST Slim 且可序列化；`diagnostics=off` 下保持近零成本。
- **NFR-003**: 证据与对照验证必须使用统一最小 IR（Static IR + Dynamic Trace）与稳定锚点（instanceId/txnSeq/opSeq）。
- **NFR-004**: 事务窗口必须保持同步：不得引入事务内 IO/async，不得引入写逃逸。

### Key Entities _(include if feature involves data)_

- **DefaultKernelPolicy**: 默认选择规则（默认 core-ng；显式 override 选择 core）。
- **RollbackConfig**: 显式回退配置（每 runtime）。
- **Migration Playbook**: 迁移说明（步骤 + 风险 + 回退 + 证据落点）。
- **Perf Evidence Set**: `$logix-perf-evidence` 产出的 Node+Browser before/after/diff 工件集合（落盘到本 spec 目录）。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 未显式指定 kernel 时，runtime 默认选择 `core-ng` 且 Fully Activated（无 fallback），并能导出可序列化证据证明（`verdict="PASS"` 且 `fullyActivated=true`）。
- **SC-002**: 显式指定 `kernelId="core"` 时，runtime 选择 core 且 Fully Activated，证据可解释；不得依赖隐式 fallback。
- **SC-003**: 切默认前/后都有可复现的 Node+Browser before/after/diff 证据落盘，且预算门槛满足；如不满足则不能宣称切默认完成。
- **SC-004**: 默认路径请求 `core-ng` 但未达 Full Cutover（缺 bindings）时，必须 FAIL（不得隐式 fallback），并能导出最小可序列化证据锚点（装配期 `txnSeq=0` 代表 assembly）。
