# Feature Specification: Runtime Kernel Hotpath Convergence

**Feature Branch**: `123-runtime-kernel-hotpath-convergence`
**Created**: 2026-04-06
**Status**: Done
**Input**: User description: "围绕 runtime hot path、kernel 边界、steady-state 热链路与 perf evidence 的第二波实现收敛。"

## Context

`02-hot-path-direction` 已把 runtime steady-state 热链路的方向冻结下来，但当前实现只有第一波 cutover。仍需要一份第二波 spec，把 kernel zone、shell zone、runtime assembly/control plane 边界、dead branch、perf evidence 与 reopen 条件全部收成可执行目标。

这份 spec 只负责 kernel/hotpath 方向，不接公开 authoring surface。

## Scope

### In Scope

- `docs/ssot/runtime/02-hot-path-direction.md`
- 与其直接相关的 perf evidence 路由
- kernel zone 与 shell zone 的实现边界
- steady-state hot path 的 reopen / no-go / evidence 规则

### Out of Scope

- 不定义公开 API 主链
- 不定义 verification control plane
- 不定义 Form / domain / platform 结构

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 性能 owner 能从 docs 直接落到 kernel backlog (Priority: P1)

作为性能 owner，我需要从 hot-path docs 直接判断哪些路径属于 kernel 主线，哪些属于 shell 或 control plane。

**Why this priority**: hot-path 方向若不能直接路由到代码边界，后续所有 perf cut 都会继续混层。

**Independent Test**: 给出一个 runtime 变更点，owner 能在 5 分钟内判断它属于 kernel、shell 还是 control plane。

**Acceptance Scenarios**:

1. **Given** 一个 runtime internals 变更，**When** 我对照本 spec，**Then** 我能知道它是否属于 `packages/logix-core/src/internal/runtime/core/**` 主落点。

---

### User Story 2 - reviewer 能要求 perf evidence 而不是口头判断 (Priority: P2)

作为 reviewer，我需要对任何 hot-path 改动要求可复现基线或 evidence，而不是只看描述。

**Why this priority**: 当前阶段强调性能与可诊断性优先。没有 evidence 的 hot-path 改动无法稳定裁决。

**Independent Test**: reviewer 能从本 spec 判断某个改动应补哪类 baseline、diff 或 reopen 证据。

**Acceptance Scenarios**:

1. **Given** 一个影响热链路的改动，**When** reviewer 检查，**Then** 能明确它需要 baseline、diff 还是 reopen 条件说明。

---

### User Story 3 - Agent 能知道哪些分支必须删除或后置 (Priority: P3)

作为 Agent，我需要清楚哪些旧 surface、旧兼容分支和第二 kernel 目录已经被判定退出主线。

**Why this priority**: 第二波落地阶段最容易在局部修复中把旧分支带回热链路。

**Independent Test**: 读完本 spec 后，Agent 能列出 steady-state 热链路允许保留的主落点和必须退出的类型。

**Acceptance Scenarios**:

1. **Given** 一个旧 runtime 分支，**When** 我按本 spec 审视，**Then** 我能判断它是删除、后置还是仅保留为 expert 实验层。

### Edge Cases

- 某个能力只在 control plane 生效，但代码路径靠近 runtime core；此时必须按 steady-state 是否命中热链路裁决。
- 某个 perf 结论来自 archive 证据，但当前代码已变化；此时必须显式判断是继续沿用还是重测。
- 某个优化只在 diagnostics=on 时生效；此时必须明确它对 default steady-state 的影响是否可忽略。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 建立 kernel zone、runtime shell、control plane 的实现边界账本。
- **FR-002**: 系统 MUST 固定 `packages/logix-core/src/internal/runtime/core/**` 为 kernel 热链路主落点。
- **FR-003**: 系统 MUST 明确 runtime assembly / control plane / process / link 不进入 steady-state 热链路主清单。
- **FR-004**: 系统 MUST 明确哪些旧 surface、旧分支和第二 kernel 壳层必须退出主线。
- **FR-005**: 系统 MUST 为 hot-path 相关改动定义 perf evidence、baseline、diff 和 reopen 条件。
- **FR-006**: 系统 MUST 规定 docs、perf evidence 与代码边界的回写关系。

### Non-Functional Requirements (Performance & Evidence)

- **NFR-001**: 所有影响 hot path 的目标都必须带可复现 baseline 或 clean comparable evidence。
- **NFR-002**: diagnostics 关闭时的 steady-state 成本必须保持可解释的近零附加开销口径。
- **NFR-003**: 任何为了旧 facade 或兼容壳层存在的热链路分支，都不得被重新引回默认路径。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 任意 runtime internals 变更都能在 5 分钟内归类到 kernel、shell 或 control plane。
- **SC-002**: hot-path 改动的 review 结论都能明确对应 evidence 要求。
- **SC-003**: 不再出现“第二 kernel 目录”或“旧兼容壳层进入 steady-state”这一类口径回流。

## Clarifications

### Session 2026-04-06

- Q: `123` 是否只停留在 docs / inventory 账本？ → A: 否。当前已补可执行 policy helper 与审计测试，把 zone、evidence 和 reopen 规则编成代码门禁。
