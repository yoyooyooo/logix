# Feature Specification: Effect v4 前向式全仓重构（无兼容层）

**Feature Branch**: `103-effect-v4-forward-cutover`  
**Created**: 2026-03-01  
**Status**: Draft  
**Input**: 用户明确裁决：彻底面向 Effect v4 编写，不保留兼容逻辑；允许必要重构；以未来 `1.0` 一次性发布为目标。

## 背景

当前仓库尚未对外投入真实用户，迁移窗口成本最低。基于此，本特性采用 `forward-only + v4-only` 策略：

- 不做 v3/v4 双栈。
- 不设兼容开关与弃用期。
- 不保留“迁移桥接层”长期存在。
- 允许重构核心模块实现方式，只保留行为契约与平台宪法约束。
- 本迁移的性能放行前提是 `feat/perf-dynamic-capacity-maxlevel` 已完成并合入 `main`；在此前允许并行推进 v4 实施轨道，但不得宣称性能 gate 通过。

## 目标

1. 将全仓 Effect 相关能力迁移到 v4 语义与 API。
2. 借迁移窗口重塑 runtime 核心设计，消除 v3 时代结构债务。
3. 在迁移过程中保持性能与可诊断性门禁，不以“先迁完再优化”做借口。
4. 输出可直接支撑 `1.0` 发布的中文迁移说明与 breaking changes 清单。

## 范围

## In Scope

- `packages/*`、`apps/*`、`examples/*` 的 Effect 使用面与运行时边界。
- `docs/ssot/runtime/*`、`docs/ssot/platform/*`、`apps/docs/*` 同步回写。
- 主线迁移 + STM（Tx*）局部 PoC 决策。

## Out of Scope

- v3/v4 双栈共存。
- 任何兼容层、兼容开关、弃用过渡 API。
- 以迁移为名引入第二套运行时真相源。

## User Scenarios & Testing

### User Story 1 - 核心维护者完成一次性 cutover (Priority: P1)

作为核心维护者，我希望 `logix-core` 与关键基础设施包只依赖 Effect v4，后续迭代不再被 v3 语义牵制。

**Why this priority**: 核心阻断项，未达成则其余迁移都不稳。  
**Independent Test**: 完成 `logix-core` 的 `S2-A/S2-B` 两波迁移并通过 `Gate-A/Gate-B/G1`，再推进 `logix-react` 且门禁持续通过。

**Acceptance Scenarios**:

1. **Given** 已完成 S2-A 与 S2-B，**When** 执行 Gate-A/Gate-B 与 G1，**Then** 核心包无 v3 API 残留且回归通过。  
2. **Given** 运行核心事务与诊断链路，**When** 比较 before/after 证据，**Then** 性能预算与可解释性门禁通过。

### User Story 0 - 迁移负责人确认 Perf 前置就绪 (Priority: P1)

作为迁移负责人，我希望在启动 v4 迁移前，先确保 perf 采集与 gate 基础设施已经收口到 `main`，避免迁移中途反复改流程。

**Why this priority**: 这是性能证据可信度的前置条件，但不应阻断实现并行推进。  
**Independent Test**: v4 改造收敛后，基于 `rebase main + 单提交增量` 触发一次 `logix-perf-sweep`（`base=<V4_DELTA^>`、`head=<V4_DELTA>`、`perf_profile=soak`、`diff_mode=strict`）并落盘证据。

**Acceptance Scenarios**:

1. **Given** `feat/perf-dynamic-capacity-maxlevel` 尚未合入，**When** 评估迁移条件，**Then** 允许实施轨道推进，但性能 gate 保持阻塞。  
2. **Given** 前置分支已合入且已形成单提交增量，**When** 触发 `sweep(strict+soak)` 对比，**Then** 产出可审计的 pre/post 性能证据并用于最终 gate 判定。

### User Story 2 - 架构维护者借助 v4 重塑实现 (Priority: P1)

作为架构维护者，我希望按 v4 语义重写关键实现，而不是保守迁移旧模式。

**Why this priority**: 用户已明确“可以推翻旧实现”。  
**Independent Test**: 完成 Service/Reference/Runtime/Cause 主干重构并通过 G1。

**Acceptance Scenarios**:

1. **Given** core 存在 v3 结构债务，**When** 迁移到 v4 原生模式，**Then** 代码拓扑更清晰且行为可回归。  
2. **Given** 存在 breaking changes，**When** 阶段交付，**Then** 提供迁移说明而非兼容层。

### User Story 3 - 运行时负责人评估 STM 价值 (Priority: P2)

作为运行时负责人，我希望在主线稳定后评估 STM 局部引入是否值得采纳。

**Why this priority**: STM 可能带来状态一致性收益，但不应拖慢主线。  
**Independent Test**: 在 `WorkflowRuntime` 与 `ProcessRuntime` PoC 后给出 go/no-go。

**Acceptance Scenarios**:

1. **Given** 完成 STM 局部 PoC，**When** 执行性能/正确性/复杂度评估，**Then** 输出 go/no-go 决策。  
2. **Given** PoC 失败，**When** 主线继续推进，**Then** 不引入 STM 技术债或待定状态。

### User Story 4 - 文档与发布负责人形成 1.0 基线 (Priority: P2)

作为文档与发布负责人，我希望迁移后得到统一的 v4 文档、示例与发布稿。

**Why this priority**: 决定 1.0 对外可读性与交付完整性。  
**Independent Test**: 文档示例可运行，且无 v3 残留。

**Acceptance Scenarios**:

1. **Given** 迁移完成，**When** 校验 docs/examples，**Then** 仅保留 v4 写法。  
2. **Given** 准备 1.0 发布，**When** 阅读发布稿，**Then** 可清晰理解破坏性变更与迁移路径。

## Edge Cases

- v4 beta API 在实施期继续变化：允许滚动更新任务，但不得破坏阶段 gate。
- Cause 扁平化、Layer memoization、fiber keep-alive 可能出现“测试绿但语义偏移”：必须用语义级回归防线。
- STM PoC 必须严格局部：触及事务核心边界视为违规。
- 若发现迁移引入并行真相源（新状态面/新协议面），必须回滚设计，不得继续实现。
- `feat/perf-dynamic-capacity-maxlevel` 合并延期：允许继续推进实现轨道，但性能 gate 与发布 gate 维持阻塞。
- 若预算切片在 before 已 `budgetExceeded`：不得自动判定为“迁移新增回归”，必须按 `no-worse` 语义判定并登记 baseline debt。

## Requirements

### Functional Requirements

- **FR-001**: 全仓 MUST 迁移到 Effect v4 语义与 API，不保留 v3 兼容逻辑。
- **FR-002**: 系统 MUST 清理生产路径中的 v3 核心模式：`Context.*`、`FiberRef`、`Effect.locally`、`Runtime.run*`（旧调用方式）。
- **FR-003**: 迁移 MUST 允许并执行必要重构，不以“尽量不改结构”作为约束。
- **FR-004**: 破坏性变更 MUST 通过迁移说明承载，不引入兼容层/弃用期。
- **FR-005**: 按固定顺序推进迁移：`S2-A(logix-core 第一波) -> S2-B(logix-core 第二波) -> logix-react -> sandbox/i18n -> query/form/domain -> cli -> apps/examples/docs`。
- **FR-006**: 每阶段 MUST 产出证据包（类型、测试、性能、诊断）。
- **FR-007**: 核心路径 MUST 保持统一最小 IR（Static IR + Dynamic Trace）与稳定标识（`instanceId/txnSeq/opSeq`）。
- **FR-008**: 事务窗口 MUST 禁止 IO，业务侧 MUST 不可写 `SubscriptionRef`。
- **FR-009**: 所有契约调整 MUST 同步回写 `docs/ssot/runtime/*` 与 `docs/ssot/platform/*`。
- **FR-010**: STM 策略 MUST 限定为“P0 后局部 PoC + go/no-go 决策”。
- **FR-011**: STM PoC MUST 仅允许以下点位：`WorkflowRuntime(ProgramState)`、`ProcessRuntime(实例控制面状态)`。
- **FR-012**: STM PoC MUST 禁止触及：`ModuleRuntime.transaction`、`TaskRunner` 事务边界、含外部 IO 的 workflow step 执行体。
- **FR-013**: 系统 MUST 在迁移期纳入 Schema v4 专项轨道，优先覆盖 `logix-form`、`logix-core`、`logix-query` 的高收益链路。
- **FR-014**: 系统 MUST 在迁移完成前至少落地 1 个 `Schema -> JSON Schema/Standard Schema` 导出试点，且不引入第二真相源。
- **FR-015**: 系统 MUST 将 `feat/perf-dynamic-capacity-maxlevel` 合入 `main` 视为性能放行前置条件；未满足前可推进实现任务，但不得宣称 G1/G2/G5 性能 gate 通过。
- **FR-016**: 系统 MUST 在前置阶段完成 perf 基础设施核验（workflow、scripts、strict gate 口径）并产出记录文件。
- **FR-017**: 系统 MUST 将 Stage 2 拆分为 `S2-A` 与 `S2-B`：`S2-A` 先完成 `#2/#1/#3` 热路径收敛，`S2-B` 完成 `#4` 与运行时边界硬化收口。
- **FR-018**: 系统 MUST 在 G1 前先通过 `Gate-A` 与 `Gate-B`，并产出独立 gate 记录。
- **FR-019**: 系统 MUST 在 G2 前先通过 `Gate-C`，其验收至少包含并发/取消/超时/重试矩阵、replay 一致性与稳定标识 diff 校验。
- **FR-020**: 系统 MUST 在实施收敛后执行 `rebase main` 并将 v4 改造压缩为单提交 `V4_DELTA`；最终性能结论必须基于 `V4_DELTA^ -> V4_DELTA` 的 sweep 对比。
- **FR-021**: 系统 MUST 将 `G1/G2` 的性能判定拆分为双门：`Gate-Abs`（绝对预算）与 `Gate-Rel`（相对回归），并在 StageGateRecord 中分别记录。
- **FR-022**: 当预算切片在 before 已 `budgetExceeded` 时，`Gate-Rel` MUST 使用 `no-worse` 语义：仅当 after 相对 before 的退化超过已声明阈值才计入阻断回归。
- **FR-023**: 采用 `no-worse` 的预算切片 MUST 进入 baseline debt 清单，并记录 owner、阈值、退出条件与证据路径；未登记条目不得豁免。
- **FR-024**: Gate 摘要输出 MUST 分开展示 `head budgetExceeded`、`regressions/improvements` 与 baseline debt 状态，禁止将三者合并为单一未分层结论。

### Non-Functional Requirements

- **NFR-001**: 核心阶段（G1/G2）性能预算：`p95` 回归 <= 5%，吞吐回归 <= 3%，内存回归 <= 8%。
- **NFR-002**: 诊断关闭路径（`diagnostics=off`）额外开销 MUST 接近零（目标 <= 1%）。
- **NFR-003**: 诊断事件 MUST 保持 Slim、可序列化、可解释。
- **NFR-004**: `perf diff` 若 `comparable=false` MUST 视为 gate 未通过，必须复测。
- **NFR-005**: 最终 1.0 基线 MUST 是单一 v4 心智模型，不得出现双语义并存。
- **NFR-006**: STM PoC 失败 MUST 不阻断主线迁移，必须输出结论并继续推进。
- **NFR-007**: Schema 专项改造触及核心路径时 MUST 复用同一套性能/诊断 gate，不得单独降低标准。
- **NFR-008**: 前置阶段核验结果 MUST 可审计（可定位到 merge commit、workflow 配置、脚本版本）。
- **NFR-009**: `Gate-A/Gate-B/Gate-C` 结论 MUST 绑定可复现证据（strict perf diff + diagnostics + replay/稳定标识校验），不得以口头结论替代。
- **NFR-010**: 最终性能 gate MUST 使用 GitHub Actions `logix-perf-sweep` 的 `perf_profile=soak` + `diff_mode=strict` 并固定 `base=<V4_DELTA^>`、`head=<V4_DELTA>`。
- **NFR-011**: 双门判定结果 MUST 在本地与 CI 保持同口径可复现；同一 before/after 证据不得出现相互矛盾的 `Gate-Abs/Gate-Rel` 结论。
- **NFR-012**: baseline debt 的 `no-worse` 阈值 MUST 可审计（阈值定义、适用切片、更新时间），不得依赖隐式默认值。
- **NFR-013**: gate 记录在宣称 `PASS` 时 MUST 同时给出 `Gate-Abs` 与 `Gate-Rel` 结果及 debt 清单状态；任一缺失视为证据不完整。

### Key Entities

- **MigrationStage**: 阶段实体（目标、范围、产物、gate、风险）。
- **MigrationLedger**: API 命中台账（路径、模式、改造状态、验收证据）。
- **EvidenceBundle**: 阶段证据包（typecheck/lint/test/perf/diagnostics）。
- **StageGateRecord**: gate 判定记录（`PENDING/IN_PROGRESS/PASS/NOT_PASS/FAIL` + `mode` + 指标 + 结论）。
- **STMDecisionRecord**: STM go/no-go 记录（must/should 评分 + 最终裁决）。
- **CheckpointDecisionRecord**: 阶段汇总记录（`PASS/NOT_PASS/BLOCKED/NO-GO`），仅用于进度汇总，不替代 gate 放行。

## Success Criteria

### Measurable Outcomes

- **SC-001**: `logix-core`、`logix-react` 生产代码中 v3 关键 API 残留为 0。
- **SC-002**: 全仓通过 `pnpm typecheck`、`pnpm typecheck:test`、`pnpm lint`、`pnpm test:turbo`。
- **SC-003**: G1/G2 核心路径性能预算满足 NFR-001。
- **SC-004**: G1/G2 诊断开销预算满足 NFR-002，且事件链路解释能力不下降。
- **SC-005**: docs/examples 仅保留 v4 写法且可运行。
- **SC-006**: 输出中文 `1.0` 迁移说明与 breaking changes 清单。
- **SC-007**: STM PoC 给出明确 `GO` 或 `NO-GO`，无悬而未决项。
- **SC-008**: `logix-form/logix-core/logix-query/apps/docs` 的 Schema 旧语法命中按阶段目标持续下降，最终与 v4 目标写法一致。
- **SC-009**: 至少 1 个模块完成 JSON Schema/Standard Schema 导出试点并被文档链路消费。
- **SC-010**: `specs/103-effect-v4-forward-cutover/inventory/perf-prerequisite.md` 完成并记录前置通过结论。
- **SC-011**: `inventory/gate-a.md`、`inventory/gate-b.md`、`inventory/gate-c.md` 均已产出并与 G1/G2 判定一致。
- **SC-012**: 存在一份单提交增量性能证据：`base=<V4_DELTA^>`、`head=<V4_DELTA>`、`perf_profile=soak`、`diff_mode=strict`，并被 G5 引用。
- **SC-013**: `inventory/gate-g1.md`（及后续 `gate-g2.md`）包含双门字段：`perf_abs_gate_passed`、`perf_rel_gate_passed` 与 baseline debt 清单。
- **SC-014**: 所有纳入 `no-worse` 的 debt 条目均具备 owner、阈值、退出条件与证据引用，且 checkpoint 日志可追踪其状态变化。
- **SC-015**: 宣称 `strict_perf_budget_passed=PASS` 前，after-only 硬阻塞预算切片（hard budgets）计数必须为 0。
