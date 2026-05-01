# Feature Specification: Transaction Core Writeback Split（O-002）

**Feature Branch**: `095-transaction-core-writeback-split`
**Created**: 2026-02-25
**Status**: Phase 1 Complete
**Input**: O-002 第一阶段：在不改公共 API 的前提下，拆解事务巨石，把 commit 后 side effects 切成显式 post-commit 阶段函数，保持语义与顺序不变。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 事务后处理边界可读化（Priority: P1)

作为 runtime 维护者，我希望 `runWithStateTransaction` 的 commit 后逻辑具备清晰阶段边界，而不是堆在单个超长函数里。

**Why this priority**: 这是后续阶段化重构与诊断可解释性的基础。

**Independent Test**: 重构后能从代码结构直接定位 post-commit 阶段入口与子阶段职责。

**Acceptance Scenarios**:

1. **Given** 事务提交成功，**When** 进入后处理，**Then** 所有 side effects 通过统一 `runPostCommitPhases(...)` 入口执行。
2. **Given** 需要排查事件顺序，**When** 阅读 post-commit 代码，**Then** 能明确看到各阶段顺序与条件分支。

---

### User Story 2 - 语义与顺序完全保持（Priority: P1)

作为使用者与测试维护者，我希望本轮重构不改变行为语义：事件顺序、提交语义、`txnId/txnSeq` 稳定性都不回归。

**Why this priority**: 第一阶段目标是结构切分，不是行为改写。

**Independent Test**: 事务顺序相关测试保持通过，且新增顺序断言可覆盖关键阶段。

**Acceptance Scenarios**:

1. **Given** diagnostics=`off`，**When** 事务提交，**Then** `onCommit` 的执行时机与现状一致。
2. **Given** diagnostics!=`off`，**When** 事务提交，**Then** `state:update` 记录与 `onCommit` 相对顺序保持一致。

---

### User Story 3 - 诊断与边界约束不回退（Priority: P2)

作为平台 owner，我希望本轮切分继续满足：事务窗口禁 IO、诊断事件 Slim 可序列化、稳定标识不漂移。

**Why this priority**: 避免“结构优化”引入隐性协议回退。

**Independent Test**: 最小验证命令可复现通过，关键诊断路径不增并行协议。

**Acceptance Scenarios**:

1. **Given** 核心路径改动，**When** 执行最小验证命令，**Then** 可复现并稳定通过。
2. **Given** 诊断关闭，**When** 执行事务路径，**Then** 不引入新的高成本诊断依赖。

### Edge Cases

- `dirtyAll` fallback 场景下，阶段切分后仍要保留原告警语义。
- commitHub 无订阅者时，发布路径必须保持短路策略。
- rowId reconcile 与 txn history 写入顺序不可互换。
- `onCommit` 的 diagnostics 分支时机（off vs non-off）必须保持一致。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: MUST 将 `ModuleRuntime.transaction.ts` 的 commit 后 side effects 抽为显式阶段入口（建议名：`runPostCommitPhases`）。
- **FR-002**: MUST 保留现有执行顺序与分支语义，至少覆盖：dirty fallback diagnostic、txn history、rowId reconcile、commitHub publish、debug 记录、`onCommit` 分支。
- **FR-003**: MUST 不修改公共 API 与调用方契约。
- **FR-004**: MUST 在 Phase 2 补齐或更新事务顺序相关测试，证明重构不改语义（追踪：[#98](https://github.com/yoyooyooo/logix/issues/98)）。
- **FR-005**: MUST 输出改动文件、切分点、验证命令与结果。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 核心路径改动 MUST 提供可复现验证口径（至少最小测试 + 类型门禁）。
- **NFR-002**: 诊断事件口径 MUST 保持 Slim 且可序列化，不新增并行协议。
- **NFR-003**: `instanceId/txnSeq/txnId/opSeq` 稳定标识语义 MUST 保持不变。
- **NFR-004**: 事务窗口边界 MUST 不放松（禁止引入事务内 IO/await）。
- **NFR-005**: 若后续产生破坏性变更，MUST 提供迁移说明，且不引入兼容层。

### Key Entities

- **TransactionSyncCore**: 事务同步窗口内的核心执行逻辑。
- **PostCommitPhases**: commit 后副作用阶段集合（结构化入口）。
- **CommitOrderingEvidence**: 用于证明事件顺序与标识稳定性的测试证据。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: `specs/095-transaction-core-writeback-split/spec.md`、`plan.md`、`tasks.md` 三件套完整存在且无模板占位符。
- **SC-002**: `ModuleRuntime.transaction.ts` 完成 post-commit 阶段入口抽取，且行为测试不回归。
- **SC-003**: 事务顺序与 `txnId/txnSeq` 稳定性相关测试在 Phase 2 通过（追踪：[#98](https://github.com/yoyooyooo/logix/issues/98)）。
- **SC-004**: 最小验证命令可复现，结果可留档。
