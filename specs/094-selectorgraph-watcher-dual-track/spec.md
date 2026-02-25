# Feature Specification: SelectorGraph Watcher Dual Track（O-001）

**Feature Branch**: `094-selectorgraph-watcher-dual-track`  
**Created**: 2026-02-25  
**Status**: Planned  
**Input**: O-001（双轨 watcher 优化）：`FlowRuntime.fromState` 不再强制用户显式 `ReadQuery`，显式与非显式 selector 都优先吃到 SelectorGraph 静态收益，并保留保守回退。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 显式 ReadQuery 直连静态车道 (Priority: P1)

作为运行时使用者，我已经提供了显式 `ReadQuery`，希望 `fromState` 默认走 SelectorGraph 路径，而不是退化为普通 `changes(selector)`。

**Why this priority**: 显式 `ReadQuery` 已具备静态依赖，继续走普通 selector 会直接损失增量重算收益。

**Independent Test**: 在 `FlowRuntime.fromState(ReadQuery)` 单测里，断言优先调用 `runtime.changesReadQueryWithMeta`，并输出 `Stream<V>`。

**Acceptance Scenarios**:

1. **Given** 输入是显式 `ReadQuery` 且 runtime 提供 `changesReadQueryWithMeta`，**When** 调用 `flow.fromState(query)`，**Then** 使用 `changesReadQueryWithMeta` 路径并映射到 `value`。
2. **Given** 输入是显式 `ReadQuery` 但 runtime 缺少 `changesReadQueryWithMeta`，**When** 调用 `flow.fromState(query)`，**Then** 安全降级到 `runtime.changes(query.select)`。

---

### User Story 2 - 非显式 selector 自动静态编译优先 (Priority: P1)

作为业务开发者，我仍然使用函数 selector（不改写为显式 `ReadQuery`），也希望默认尽量吃到静态车道收益。

**Why this priority**: “不强制改写”是本期目标，必须做到保留旧用法同时升级执行路径。

**Independent Test**: 在 `FlowRuntime.fromState(selector)` 单测里，`selector` 落入 `ReadQuery.compile(...).lane === "static"` 时，断言走 `changesReadQueryWithMeta`。

**Acceptance Scenarios**:

1. **Given** 输入是 `selector` 且 `ReadQuery.compile(selector)` 为 static，**When** 调用 `flow.fromState(selector)`，**Then** 自动走 `changesReadQueryWithMeta`。
2. **Given** 输入是 `selector` 且 `ReadQuery.compile(selector)` 为 dynamic，**When** 调用 `flow.fromState(selector)`，**Then** 回退 `runtime.changes(selector)`。

---

### User Story 3 - 双轨保守回退不破坏语义 (Priority: P2)

作为运行时维护者，我希望任何无法静态化或运行时能力缺失场景都不会破坏既有行为。

**Why this priority**: forward-only 并不等于冒进；双轨必须“宁可放过不可错杀”。

**Independent Test**: 通过 fallback 测试覆盖“dynamic lane”与“缺少 `changesReadQueryWithMeta`”两类退化。

**Acceptance Scenarios**:

1. **Given** selector 触发 dynamic lane，**When** `flow.fromState(selector)`，**Then** 继续得到与旧实现一致的 `changes(selector)` 语义。
2. **Given** runtime mock 仅实现 `changes`，**When** 任意 `fromState(...)`，**Then** 不抛错且行为保持可用。

---

### Edge Cases

- runtime 提供 `changesReadQueryWithMeta` 但返回元信息流，`FlowRuntime.fromState` 必须保持对外 `Stream<V>`（不泄漏 meta）。
- `ReadQuery.compile` 产出 `fallbackReason=unstableSelectorId` 时必须仍可运行（走 fallback），不得在 Flow 层引入硬失败。
- 显式 `ReadQuery` 必须优先走静态路径，但在 runtime 能力缺失时必须可降级，保证测试/轻量 mock 不被破坏。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: `FlowRuntime.fromState` MUST 在输入显式 `ReadQuery` 时优先调用 `runtime.changesReadQueryWithMeta(readQuery)`，并映射为 `Stream<V>`。
- **FR-002**: 当显式 `ReadQuery` 路径不可用（runtime 无 `changesReadQueryWithMeta`）时，MUST 降级到 `runtime.changes(readQuery.select)`。
- **FR-003**: `FlowRuntime.fromState` MUST 对非显式 selector 自动执行 `ReadQuery.compile(selector)`；若为 static lane，走 `changesReadQueryWithMeta`。
- **FR-004**: 当自动编译结果为 dynamic lane 或静态路径不可用时，MUST 回退到 `runtime.changes(selector)`，不得要求用户改写为显式 `ReadQuery`。
- **FR-005**: Flow 测试 MUST 覆盖显式路径、非显式自动编译路径、fallback 路径。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 本改动触及 runtime 热路径，MUST 在 `plan.md` 给出可复现的性能证据方案与后续落地任务（本阶段先做功能落地 + 回归门禁）。
- **NFR-002**: 双轨切换 MUST 保持诊断协议零新增（不引入并行真相源）；仅复用 `ReadQuery.compile` 现有 lane/fallback 语义。
- **NFR-003**: 保持稳定标识体系：Flow 层不得生成随机 selectorId/txn 锚点，完全复用 `ReadQuery.compile` 与 runtime 既有策略。
- **NFR-004**: 事务窗口语义不变：本改动仅变更订阅路由，不引入事务内 IO。
- **NFR-005**: 不提供兼容层；若后续策略升级，按 forward-only 在规范与实现中同步替换。

### Key Entities _(include if feature involves data)_

- **FlowFromStateInput**: `((s) => v) | ReadQuery<S, V>`，`fromState` 的双轨入口输入。
- **ReadQueryCompiled**: `ReadQuery.compile` 的产物，携带 `lane/producer/fallbackReason/staticIr`，用于判定是否走静态路径。
- **StateChangeWithMeta<V>**: runtime 静态路径返回的 `{ value, meta }` 事件载体；Flow 层仅透出 `value`。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: `packages/logix-core/test/Flow/FlowRuntime.fromState.ReadQuery.test.ts` 覆盖并通过 3 类路径：显式静态、自动静态、fallback。
- **SC-002**: 非显式 selector（静态可编译子集）在不改业务代码的情况下自动走静态路径。
- **SC-003**: dynamic lane 与 runtime 能力缺失场景保持兼容行为（仍可消费 `Stream<V>`）。
- **SC-004**: 本阶段最小验证命令全部通过，并可复现。
