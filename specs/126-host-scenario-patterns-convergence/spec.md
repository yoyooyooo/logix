# Feature Specification: Host Scenario Patterns Convergence

**Feature Branch**: `126-host-scenario-patterns-convergence`
**Created**: 2026-04-06
**Status**: Done
**Input**: User description: "围绕 standardized scenario patterns、host projection、examples 与 verification mapping 的第二波收敛。"

## Context

`07-standardized-scenario-patterns` 已经定义了 `Module / Program / Runtime / RuntimeProvider` 的宿主场景矩阵，并给出一组最小示例锚点。

第一波 host rebootstrap 与 examples/verification alignment 已打通部分入口，但仍缺一份第二波 spec，去承接 scenario matrix、host projection 边界、examples 锚点、verification subtree、imports scope、process 安装点与 local/session/suspend 协议的全量收敛。

## Scope

### In Scope

- `docs/ssot/runtime/07-standardized-scenario-patterns.md`
- 与其直接关联的 examples / verification mapping
- `@logixjs/react`、`examples/logix-react`、`examples/logix` 的宿主场景收口
- host projection 与 verification 入口的边界

### Out of Scope

- 不定义 Form field-kernel 结构
- 不定义 domain package admission
- 不定义 verification control plane 核心协议

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 作者能从场景类型直接找到最短示例 (Priority: P1)

作为作者，我需要针对“全局单例、局部实例、imports scope、layer override、subtree process”等场景，快速定位对应示例。

**Why this priority**: scenario pattern 是 docs 中最直接连接作者心智和 examples 的页面。

**Independent Test**: 针对任一标准场景，作者能在 5 分钟内找到唯一 primary example。

**Acceptance Scenarios**:

1. **Given** 一个 imports scope 场景，**When** 作者查本 spec，**Then** 能找到唯一 primary example 和相关 verification 入口。

---

### User Story 2 - host maintainer 能分清 projection 与 verification (Priority: P2)

作为 host maintainer，我需要明确哪些入口属于 host projection，哪些入口属于 verification。

**Why this priority**: 第一波实现后，最容易继续混淆的是 `RuntimeProvider`、`Platform`、sandbox、examples 和 verification 子树。

**Independent Test**: maintainer 能对 `RuntimeProvider.layer`、imports scope、local/session/suspend 协议、`useProcesses(...)` 与 verification subtree 的职责做清晰归类。

**Acceptance Scenarios**:

1. **Given** 一个 host-side API，**When** maintainer 检查，**Then** 能判断它属于 projection、scenario example，还是 verification entry。

---

### User Story 3 - reviewer 能阻止 host 包长出第二真相源 (Priority: P3)

作为 reviewer，我需要阻止 `@logixjs/react`、`@logixjs/sandbox`、`examples/**` 自己长出平行 control plane 或平行 runtime 心智。

**Why this priority**: 这组包都贴近用户体验层，最容易在“方便使用”的压力下重新加壳。

**Independent Test**: reviewer 能根据本 spec 拒绝把 verification control plane 或 runtime truth source 放进 host projection 包。

**Acceptance Scenarios**:

1. **Given** 一个新增 host API 提议，**When** reviewer 检查，**Then** 能判断它是否越过 projection 边界。

### Edge Cases

- 某个场景同时是 business example 和 verification fixture 时，必须先确定 primary role，再给 secondary link。
- 某个 local/session/suspend 变体需要更多例子时，必须回到同一套 scenario matrix，而不是单独再造分类。
- 某个 process 安装点跨 UI 子树和 verification 复用时，必须先守住 projection 与 control plane 的边界。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 为标准场景矩阵建立 primary example 与 related verification mapping。
- **FR-002**: 系统 MUST 固定 host projection、examples、verification subtree 的职责边界。
- **FR-003**: 系统 MUST 规定 `RuntimeProvider.layer`、imports scope、root escape hatch、local/session/suspend 协议的统一归属。
- **FR-004**: 系统 MUST 规定 `useProcesses(...)` 与 process expert family 的宿主安装边界。
- **FR-005**: 系统 MUST 要求 examples 与 docs 锚点保持稳定一一对应关系。
- **FR-006**: 系统 MUST 要求 host packages 不自带平行 verification control plane。

### Non-Functional Requirements (Host Boundary Discipline)

- **NFR-001**: host projection 包只能表达宿主语义，不得引入新的 runtime truth source。
- **NFR-002**: scenario patterns 的 examples 路由必须足够稳定，方便 Agent 与维护者直接检索。
- **NFR-003**: examples 与 verification 的双重角色必须通过明确主归属消解，不得长期混写。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 任一标准场景都能在 5 分钟内找到唯一 primary example。
- **SC-002**: maintainer 可以清晰区分 host projection API 与 verification entry。
- **SC-003**: reviewer 能据此拒绝 host 包中的第二真相源或第二 control plane。
