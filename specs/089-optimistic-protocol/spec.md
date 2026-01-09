# Feature Specification: Optimistic Protocol（乐观更新：一等公民、可回滚、可解释）

**Feature Branch**: `089-optimistic-protocol`  
**Created**: 2026-01-10  
**Status**: Draft  
**Input**: 定义 Optimistic 更新的一等公民协议：支持乐观写入、确认、回滚/撤销、合并与冲突裁决；所有变更必须可回放、可诊断，并与 Logix 事务窗口/统一最小 IR/Trace 稳定锚点（instanceId/txnSeq/opSeq/linkId）对齐，避免零散 setState 造成不可解释中间态。

## Context

乐观更新的目标不是“更快”，而是“更协调”：用户交互后立即得到可信反馈，同时系统在后台完成真实 IO 并最终收敛到一致状态。当前如果每个业务模块各自手写 optimistic，会导致：

- 回滚/撤销语义不一致（甚至不可实现），中间态不可解释。
- Devtools 无法把 optimistic 与后续 IO/事务链路串起来。
- 由于缺少统一协议，很难做性能与诊断门禁（诊断开销难以控制）。

本特性把 optimistic 作为一等公民协议，要求与 088 的 Async Action 协调面合流：optimistic 不是“随便先改 state”，而是一个可标识、可回滚、可解释的链路片段。

## Terminology

- **Optimistic Update**：在真实 IO 完成前先应用到状态的变更。
- **Optimistic Token / optimisticId**：稳定标识，用于把 apply/confirm/rollback 串成同一条链；必须可确定重建（推荐：从 action `linkId` + 单调序号衍生）。
- **Confirm**：真实 IO 成功后，确认 optimistic 变更（可能只需要清理 token）。
- **Rollback/Cancel**：真实 IO 失败或 run 被取消时，撤销 optimistic 变更并恢复一致性。

## Assumptions

- 依赖 088：optimistic 必须绑定到某一次 ActionRun（或等价的协调链路），并继承其稳定标识与取消语义。
- 事务窗口同步红线不变：apply/confirm/rollback 都必须通过事务提交表达，事务内禁止 IO/await。

## Clarifications

### Session 2026-01-10

- AUTO: Q: optimisticId 如何生成，如何避免乱序误判？ → A: optimisticId MUST 从 ActionRun 的 `linkId` + instance-local 单调序号衍生（推荐格式：`<linkId>::p<seq>`）；confirm/rollback 必须以 optimisticId 精确匹配，乱序返回不得影响其他 token。
- AUTO: Q: rollback 的默认顺序是什么？ → A: 默认且强制为 LIFO（后入先出）：同一 instance 内 optimistic token 的回滚必须按栈语义进行；不支持“非 LIFO 选择性回滚”（避免不可解释与不可实现的状态组合）。
- AUTO: Q: optimistic 变更的最小可回滚表示是什么？ → A: 每个 token 必须携带可回滚的 inverse 记录（例如受影响路径的 before 值/反向 patch），以保证 rollback 在有限步内可完成；诊断事件只输出 Slim 摘要，不输出重 payload。
- AUTO: Q: token 数量与体积如何门禁？ → A: token 数量与单 token 影响范围必须有界；默认上界为 `maxTokens=32`（instance 内同时存活 token 上限）；超过上界的 apply MUST 被拒绝（reject apply，不产生新 token），并返回可序列化错误摘要（禁止无限堆积或隐式 override）。
- AUTO: Q: confirm/rollback 是否要求幂等？ → A: 必须幂等：重复 confirm/rollback 不得产生额外副作用；对已 settle 的 token 只允许 no-op（可选记录诊断原因）。

### Session 2026-01-12

- Q: 默认 `maxTokens` + “超限裁决”选哪个组合？ → A: 默认 `maxTokens=32`；超限 MUST reject apply（不产生新 token），并返回可序列化错误摘要。

## Out of Scope

- 业务领域的冲突解决算法细节（例如协同编辑 OT/CRDT）；本 spec 只规定“协议与可解释边界”。
- UI Busy 指示策略（由 091 负责），以及 Resource/Query 的缓存策略（由 090 负责）。

## User Scenarios & Testing _(mandatory)_

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - 乐观写入 + 最终收敛（Priority: P1）

作为业务开发者，我能声明一个 optimistic 更新：交互后立即写入可见反馈；真实 IO 成功后确认；失败或取消时回滚；最终状态一致且无悬挂中间态。

**Why this priority**: 这是 Async React 策略里“立即反馈”的关键拼图；缺少统一协议会直接把复杂性下放到业务代码。

**Independent Test**: 在最小示例中，触发 optimistic 更新后立即可见；模拟成功/失败/取消三种结果，均能在有限步内收敛（确认或回滚），且不会破坏事务边界。

**Acceptance Scenarios**:

1. **Given** 一个 action run 声明了 optimistic 写入，**When** IO 最终成功，**Then** optimistic 被确认（token 清理/合并），最终状态与“非 optimistic 版本”一致。
2. **Given** 一个 action run 声明了 optimistic 写入，**When** IO 失败或 run 被取消，**Then** optimistic 被回滚，最终状态恢复到可解释的一致形态（不得遗留半回滚）。

---

### User Story 2 - Devtools 能解释 optimistic 的因果链（Priority: P2）

作为开发/排障人员，我能在 Devtools 中看到 optimistic 的 apply/confirm/rollback 三段事件，并能关联到触发它的 action run 与事务序列（txnSeq）。

**Why this priority**: 如果 optimistic 不可解释，就会变成“看起来很快但出错后无法定位”的黑盒。

**Independent Test**: 对同一输入，分别走 confirm 与 rollback 路径，Devtools 都能给出可序列化事件链路并定位到稳定锚点。

**Acceptance Scenarios**:

1. **Given** optimistic apply 产生了一次事务提交，**When** 查看诊断事件，**Then** 能看到 optimisticId 与 txnSeq/txnId 的对齐关系。
2. **Given** optimistic rollback 发生，**When** 查看诊断事件，**Then** 能解释 rollback 的原因（failure/cancel/override），且 payload Slim。

---

### User Story 3 - 合并/冲突裁决与幂等（Priority: P3）

作为框架维护者，我能定义 optimistic 的合并/覆盖/幂等语义，使高频输入或重复触发不会导致无限堆积 token 或不可预测回滚。

**Why this priority**: 没有合并/幂等，optimistic 会在高频输入/离线重试时演化成内存与诊断灾难。

**Independent Test**: 连续触发同一 optimistic 更新 N 次，系统能按策略 coalesce，token 数量有界，最终一致性可验证。

**Acceptance Scenarios**:

1. **Given** 同一 actionId 在短时间内触发多次 optimistic apply，**When** 后续 run 覆盖前序 run，**Then** 前序 optimistic 能被可解释地取消/回滚或合并，且不会泄露 token。

### Edge Cases

- 请求返回乱序：后返回的结果不得错误地 confirm/rollback 另一个 optimistic。
- retry：失败后重试的 optimisticId 如何处理（复用/新建），避免“确认了旧 token”。
- 多 optimistic 叠加：同一字段被多个 optimistic 覆盖时的回滚顺序与最终一致性。
- 诊断关闭：optimistic 仍可工作且不引入常态分配；开启诊断才输出事件与快照（按预算采样）。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 定义 optimistic 协议的一等公民语义：apply/confirm/rollback（或等价三段），并能与 088 的 ActionRun 绑定（同一 run 可关联多个 optimistic，或按策略限制为 0/1）。
- **FR-002**: 系统 MUST 为每个 optimistic 更新分配稳定标识 optimisticId，并能与稳定锚点贯穿（至少关联 instanceId；可串到 txnSeq/txnId 与 action `linkId`）；optimisticId MUST 可确定重建（不得使用 random/time 默认）。
- **FR-003**: 系统 MUST 支持回滚：在 failure/cancel/override 等场景下，optimistic 必须在有限步内回滚并恢复一致性，禁止遗留悬挂 token 或半回滚状态。
- **FR-004**: 系统 MUST 支持确认：IO 成功时确认 optimistic（清理 token/合并状态），最终状态与“非 optimistic”路径一致。
- **FR-005**: 系统 MUST 定义合并/覆盖/幂等语义：高频重复触发时 token 数量必须有界，且最终一致性可预测；默认 `maxTokens=32`（instance 内同时存活 token 上限）；超过上界的 apply MUST 被拒绝（reject apply，不产生新 token），并返回可序列化错误摘要；默认回滚顺序为 LIFO，且 confirm/rollback 必须幂等。
- **FR-006**: 系统 MUST 输出 Slim、可序列化的诊断事件：能解释 optimistic 的 apply/confirm/rollback 与原因分类，并可关联到 action run 与事务。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 本特性触及事务写入与订阅传播，MUST 定义性能预算并产出可复现 perf evidence（Node + Browser before/after/diff），预算与证据落点写入 `specs/089-optimistic-protocol/plan.md`。
- **NFR-002**: `diagnostics=off` 下必须接近零成本：optimistic 机制不得引入常态事件分配；必要的 token/索引必须可控且有界。
- **NFR-003**: optimisticId 等标识必须稳定、可复现（禁止 random/time 默认），并与 action/txn 锚点对齐。
- **NFR-004**: 诊断事件必须 Slim 且可序列化；必须明确 downgrade/裁剪策略与 ring buffer 上界。
- **NFR-005**: 事务边界红线：apply/confirm/rollback 均为同步事务（事务内禁 IO/await）。

### Key Entities _(include if feature involves data)_

- **OptimisticToken**：optimisticId + 关联锚点的最小记录（用于串联与回滚）。
- **OptimisticChange**：一次 optimistic 写入的变更摘要（用于回滚/合并/诊断）。
- **OptimisticOutcome**：confirm/rollback 的原因分类（success/failure/cancel/override）。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 最小示例中，optimistic apply 能在一次事务内生效；success 时 confirm 不改变最终语义；failure/cancel 时 rollback 能在有限步内恢复一致状态。
- **SC-002**: Devtools 能解释 optimistic 的 apply/confirm/rollback 三段因果链，并与 action run 与 txn 对齐（稳定标识贯穿；payload Slim/可序列化）。
- **SC-003**: `diagnostics=off` 下的 perf evidence 达标：optimistic 机制对核心路径（txn commit/notify）的 p95 与分配无显著回归（阈值在 plan.md 固化）。
