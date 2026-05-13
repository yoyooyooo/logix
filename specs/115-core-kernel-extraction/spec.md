# Feature Specification: Core Kernel Extraction

**Feature Branch**: `115-core-kernel-extraction`
**Created**: 2026-04-05
**Status**: Done
**Input**: 把 @logixjs/core 下沉出显式 kernel 层，重排 public surface、runtime core、observability、reflection 与 process 边界。

## Context

`@logixjs/core` 当前已经有 `internal/runtime/core`、`observability`、`reflection` 等深层结构，但公开层和内部层之间仍缺一个清晰的 `kernel` 叙事。与此同时，仓库还存在 `@logixjs/core-ng`，说明核心执行内核仍处于分裂状态。

这份 spec 要先回答一件事：真正作为长期主线的核心内核是什么，它的边界在哪里，外层 runtime shell 又在哪里。

同时，这份 spec 不能把“kernel 化”误解成全量重写。凡是现有热链路、执行器、诊断链路、覆盖测试已经满足目标边界的部分，应优先复用或最小平移。

## Scope

### In Scope

- 为 `@logixjs/core` 定义显式 kernel 层
- 明确 `kernel`、`runtime shell`、`observability`、`reflection`、`process` 的边界
- 明确 `@logixjs/core-ng` 的去向
- 规划新的目录拓扑与公开面收缩

### Out of Scope

- 不在本 spec 内完成全部 runtime 代码迁移
- 不在本 spec 内改 React、CLI、domain 包目录

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 能说清哪部分是 kernel (Priority: P1)

作为 runtime 贡献者，我能明确哪些能力属于 kernel，哪些属于 runtime shell 或控制面。

**Why this priority**: 没有 kernel 边界，后续 host 包和 domain 包无法围绕统一核心收口。

**Independent Test**: 阅读 spec 后，能对 `ModuleRuntime`、`StateTransaction`、`TaskRunner`、`RuntimeKernel`、`DebugSink`、`Reflection`、`ProcessRuntime` 做归类，不会出现归属模糊。

**Acceptance Scenarios**:

1. **Given** 我查看 core 拓扑图，**When** 我定位某个内部模块，**Then** 我能判断它位于 kernel、runtime shell、observability、reflection 或 process 之一。

---

### User Story 2 - 给 core-ng 一个明确结论 (Priority: P2)

作为维护者，我需要明确 `@logixjs/core-ng` 是被并入、冻结，还是作为短期实验残留。

**Why this priority**: 如果 `core` 和 `core-ng` 的关系不先裁决，kernel 规划会长期悬空。

**Independent Test**: 查看 spec 后，能明确 `core-ng` 的唯一去向和回写点。

**Acceptance Scenarios**:

1. **Given** 我需要推进新的核心执行路径，**When** 我查看 spec，**Then** 我知道应修改 `core` 主线还是 `core-ng` 临时区。

### Edge Cases

- 某些旧公开模块仍有保留价值，但实现需下沉进 kernel，此时必须允许“公开层保留、实现层下沉”。
- 某些 process 或 observability 能力与 kernel 耦合较深，但仍必须保持职责分层。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 为 `@logixjs/core` 定义显式 `kernel` 责任面，并给出目录落点。
- **FR-002**: 系统 MUST 定义 `runtime shell` 与 `kernel` 的边界，确保控制面、公开面和热路径实现不混层。
- **FR-003**: 系统 MUST 定义 `observability`、`reflection`、`process` 在新拓扑中的位置与相邻边界。
- **FR-004**: 系统 MUST 对 `@logixjs/core-ng` 给出明确去向，并写清过渡期关系。
- **FR-005**: 系统 MUST 规划 `@logixjs/core` 的公开 surface，至少覆盖 `Module`、`Logic`、`Program`、`Runtime` 与 expert 家族的稳定入口。
- **FR-006**: 系统 MUST 识别当前 `@logixjs/core` / `@logixjs/core-ng` 中可直接复用的热链路模块、诊断模块与覆盖测试，并记录平移策略。

### Key Entities _(include if feature involves data)_

- **Kernel Contract**: 核心执行内核的职责集合，包括事务、调度、状态推进、执行计划与最小运行时服务。
- **Runtime Shell Contract**: 围绕 kernel 的装配、控制面、宿主接入和外层协调协议。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: kernel 边界必须服务热路径优化，不能引入新的中间壳层税。
- **NFR-002**: kernel 相关模块的诊断与标识必须继续遵守稳定 `instanceId / txnSeq / opSeq` 口径。
- **NFR-003**: kernel 化不得扩张第二套真相源，observability 与 reflection 仍是从同一运行事实抽取证据。
- **NFR-004**: kernel 化默认优先复用已对齐目标边界的现有实现与测试资产，只有必须升级的部分才进入激进改造。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: `@logixjs/core` 的新拓扑能把关键内部模块稳定归入明确分层。
- **SC-002**: `@logixjs/core-ng` 的去向被明确记录，不再作为并行主线悬空存在。
- **SC-003**: 后续 host、domain、CLI specs 都可以引用 `kernel` 契约，不需要再次自定义核心边界。
