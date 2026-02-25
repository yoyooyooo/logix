# Feature Specification: Workflow/Process 统一内核第一阶段（O-003）

**Feature Branch**: `096-unified-workflow-process-engine`  
**Created**: 2026-02-25  
**Status**: Planned  
**Input**: 用户要求在不破坏 DSL/API 的前提下，抽取 WorkflowRuntime 与 ProcessRuntime 的可复用调度/诊断共核片段，并补齐行为一致性测试与最小验证。

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: 暂不显式绑定（本阶段是 Runtime 内核重构与一致性收敛）
- **Kill Features (KF)**: 暂不显式绑定

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 统一调度边界元数据装配（Priority: P1)

作为 Runtime 维护者，我希望 Workflow/Process 在“调度边界 + 诊断元数据”上有可复用的最小共核，以降低重复并避免后续策略演进时出现行为漂移。

**Why this priority**: 这是本阶段核心目标；不先收敛共核，后续策略统一会持续放大维护成本。  
**Independent Test**: 不改对外 DSL 的情况下，Workflow 与 Process 的既有并发策略测试应保持通过。

**Acceptance Scenarios**:

1. **Given** WorkflowRuntime 的 runBoundary 调用点存在重复元数据拼装，**When** 抽取共核 helper，**Then** 运行行为不变且元数据字段不丢失。  
2. **Given** ProcessRuntime 的 triggerSeq/预算/onDrop 接线分散，**When** 抽取共核 helper，**Then** 并发策略语义保持一致。

---

### User Story 2 - Workflow/Process 策略行为对齐证据（Priority: P2)

作为评审者，我希望至少有一组跨 workflow/process 的策略行为对齐测试，证明“同类策略”在两条执行链路上的外部可观察语义一致。

**Why this priority**: 第一阶段重构必须可验证；没有对齐测试就无法证明“只重构不改语义”。  
**Independent Test**: 新增/调整的策略对齐测试在本地可单独运行并稳定通过。

**Acceptance Scenarios**:

1. **Given** workflow 的 `exhaust` 与 process 的 `drop` 都属于“忙时丢弃”语义，**When** 连续触发重入，**Then** 两侧都只执行首个 run，后续触发被记录为 drop/warning。

---

### User Story 3 - 性能与诊断约束不回退（Priority: P3)

作为平台 owner，我希望本次核心路径改动附带最小可复现性能基线命令与诊断约束说明，避免“重构后不可解释”。

**Why this priority**: 核心路径改动必须有可复现证据与诊断口径。  
**Independent Test**: 能执行既定 baseline 命令并产出可留档结果；诊断 `off` 路径无新增必需事件。

**Acceptance Scenarios**:

1. **Given** 涉及 runtime core 的重构，**When** 执行基线命令，**Then** 能得到可复现的基线输出（命令 + 环境 +结果）。
2. **Given** diagnostics 关闭，**When** 运行相关策略测试，**Then** 不引入额外诊断事件依赖。

### Edge Cases

- diagnostics=`off` 时，helper 不能强制进入高成本观测路径。
- latest/exhaust/drop 并发路径下，中断与丢弃必须保持原有语义。
- serial/parallel 路径不能因为 helper 抽取而改变 queue guard 行为。
- 触发序号（`triggerSeq`）与 run 序号（`runSeq`）必须继续稳定、单调、可解释。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 必须完整写入 speckit 三件套：`spec.md`、`plan.md`、`tasks.md`（目录：`specs/096-unified-workflow-process-engine/`）。
- **FR-002**: 必须在 `WorkflowRuntime.ts` 抽取至少一个可复用的“边界执行/元数据装配”共核片段，减少重复 runBoundary 组装。
- **FR-003**: 必须在 `ProcessRuntime.make.ts` 抽取至少一个可复用的“trigger 调度/预算/事件接线”共核片段，减少重复逻辑。
- **FR-004**: 不得修改 Workflow/Process 的 DSL 入口与对外 API 行为。
- **FR-005**: 至少新增或增强一组“workflow/process 策略行为对齐”测试。
- **FR-006**: 改动范围必须限制在用户授权文件：`specs/096/**`、`WorkflowRuntime.ts`、`ProcessRuntime.make.ts`、（必要时）`concurrency.ts`/`triggerStreams.ts`、以及相关测试。
- **FR-007**: 输出结果必须包含：改动文件清单、共核抽取点、测试结果、未完成清单。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 本次核心路径改动必须提供可复现性能基线命令，至少包含 process 并发基线：`pnpm perf bench:012:process-baseline`。
- **NFR-002**: 诊断事件语义保持 Slim + 可序列化，且 diagnostics=`off` 时保持近零额外开销路径。
- **NFR-003**: 稳定标识不回退：`instanceId/runSeq/triggerSeq` 相关行为保持确定性与可解释。
- **NFR-004**: 严守事务窗口约束：不在事务窗口引入 IO/async 写逃逸。
- **NFR-005**: 统一最小 IR 口径不漂移：Static IR + Dynamic Trace 的锚点字段与语义不新增并行真相源。
- **NFR-006**: 本阶段若存在破坏性调整，仅允许迁移说明，不引入兼容层。

### Key Entities

- **WorkflowBoundaryKernel**: Workflow 侧用于组装 runBoundary 基线 meta 与策略字段的可复用片段。
- **ProcessTriggerChainKernel**: Process 侧用于 triggerSeq 分配、事件预算接线、onDrop/chain-run 的可复用片段。
- **SchedulingAlignmentEvidence**: 用于证明 workflow/process 同类策略语义一致的测试证据集合。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: `specs/096-unified-workflow-process-engine/spec.md`、`specs/096-unified-workflow-process-engine/plan.md`、`specs/096-unified-workflow-process-engine/tasks.md` 三件套完整存在且无模板占位符。  
- **SC-002**: Workflow 与 Process 各至少完成 1 处共核抽取，且不引入 DSL/API 变更。  
- **SC-003**: 至少 1 组策略行为对齐测试通过（例如 workflow `exhaust` vs process `drop`）。  
- **SC-004**: 最小验证命令（相关测试 + 必要类型检查）可运行并给出明确结果。  
- **SC-005**: 可复现性能基线命令可执行并可留档（命令、输出、时间戳、环境）。
