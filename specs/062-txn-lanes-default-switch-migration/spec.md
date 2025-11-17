# Feature Specification: Txn Lanes 默认开启（迁移与回退口径）

**Feature Branch**: `062-txn-lanes-default-switch-migration`  
**Created**: 2025-12-31  
**Status**: Done  
**Input**: 046 路线条目 `062`："Txn Lanes 默认开启：从显式 opt-in 切换为默认 on（迁移与回退口径）"

## Terminology

- **Txn Lanes**：事务后续 Follow-up Work 的优先级调度（urgent/non-urgent），见 `specs/060-react-priority-scheduling/`。
- **默认开启（default-on）**：不显式配置 `stateTransaction.txnLanes.enabled` 时，默认启用 Txn Lanes。
- **回退/对照（rollback/compare）**：通过运行期覆盖显式强制关闭或强制全同步，用于止血/定位差异。
- **overrideMode**：`forced_off | forced_sync`（见 `TxnLanesPatch.overrideMode`）。

## Related (read-only references)

- `specs/046-core-ng-roadmap/`（路线总控）
- `specs/060-react-priority-scheduling/`（Txn Lanes 语义与证据口径）
- `specs/052-core-ng-diagnostics-off-gate/`（diagnostics=off 近零成本闸门）
- `specs/014-browser-perf-boundaries/`（Browser perf matrix/diff 口径）
- `specs/048-core-ng-default-switch-migration/`（迁移 spec 的写法模板）
- 用户文档：`apps/docs/content/docs/guide/advanced/txn-lanes.md`

## Clarifications

### Session 2025-12-31

- Q: 062 会改变业务对外语义吗？ → A: 会改变“默认调度策略”（语义默认值变化）；因此必须提供迁移说明与显式回退口径，并证据化。
- Q: perf evidence 是否允许在 dev 工作区（git dirty）采集？ → A: 允许（当前阶段）；但必须确保 `matrix/config/env` 一致，并在 diff 中保留 `git.dirty.*` warnings；若出现 `stabilityWarning` 或结论存疑，必须复测（必要时 `profile=soak`）。
- Q: 062 的 Gate 覆盖什么？ → A: 至少覆盖 Browser `txnLanes.urgentBacklog`（off vs default-on 的对照），并要求 Node + Browser diff 都满足 `comparable=true && regressions==0`（Node 以 converge/txn 基线跑道为准，避免只看 Browser）。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 默认开启且可回退 (Priority: P1)

作为维护者，我希望 Txn Lanes 在默认路径下开启，以改善“交互被非关键补算拖尾”的 p95；同时在出现异常或需要对照定位时，可以显式回退到 forced_off/forced_sync，并且回退行为可解释、可证据化。

**Independent Test**:

- 不显式配置时，默认启用 Txn Lanes（default-on）。
- `overrideMode=forced_off` 时，行为回到 baseline（等价于关闭 Txn Lanes）。
- `overrideMode=forced_sync` 时，强制全同步（用于对照差异与止血），并能在证据中解释“为何强制同步”。

---

### User Story 2 - 默认开启不破坏 off 近零成本 (Priority: P1)

作为维护者，我希望 Txn Lanes 默认开启不会把诊断税带入默认路径：`diagnostics=off` 下仍然接近零成本；证据字段 Slim 且可序列化。

**Independent Test**: 复用 `specs/052-core-ng-diagnostics-off-gate/` 的 off 闸门与 diagnostics overhead suites，确保无新回归。

---

### User Story 3 - 证据闭环（off vs default-on，core + core-ng）(Priority: P2)

作为维护者，我希望默认开启不是“体感”决策：必须能用 `$logix-perf-evidence` 在同机同配置下产出 before/after/diff，并明确 core 与 core-ng 都达标。

**Independent Test**:

- Browser：`txnLanes.urgentBacklog` 的 off vs default-on diff 无回归；
- Node：默认路径 converge/txn 跑道 diff 无回归；
- 结论与工件路径回写到 quickstart，便于复核与交接。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 将 Txn Lanes 的默认策略切换为 default-on（不显式配置时启用）。
- **FR-002**: 系统 MUST 提供显式回退/对照入口：至少支持 `forced_off` 与 `forced_sync`，并保证其优先级与可解释性（证据字段含 override 信息）。
- **FR-003**: 系统 MUST 更新用户文档：默认状态、什么时候用、怎么回退、怎么验证生效（不得要求读源码）。
- **FR-004**: core 与 core-ng MUST 同时达标（证据与对照口径一致），不得只在单一内核宣称完成。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 必须产出 Node + ≥1 条 headless browser before/after/diff，且 `pnpm perf diff` 输出满足 `meta.comparability.comparable=true && summary.regressions==0`。
- **NFR-002**: `diagnostics=off` 下新增能力接近零成本，不得引入常驻分配或事务窗口内额外开销。
- **NFR-003**: 证据与诊断必须使用稳定标识（instanceId/txnSeq/opSeq 等），字段 Slim 且可序列化。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: default-on 生效且可回退：不显式配置时启用；forced_off/forced_sync 可用且可解释。
- **SC-002**: Browser `txnLanes.urgentBacklog` 的 off vs default-on diff 无回归（`summary.regressions==0`）。
- **SC-003**: Node 基线跑道 diff 无回归（`summary.regressions==0`），避免“只看 Browser”的误判。

## Delivery Notes

- 迁移说明与证据入口：`specs/062-txn-lanes-default-switch-migration/quickstart.md`
