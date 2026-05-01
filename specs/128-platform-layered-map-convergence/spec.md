# Feature Specification: Platform Layered Map Convergence

**Feature Branch**: `128-platform-layered-map-convergence`
**Created**: 2026-04-06
**Status**: Done
**Input**: User description: "围绕 layered map 中的 surface、authoring kernel、runtime control plane、UI projection 的结构收敛。"

## Context

`docs/ssot/platform/01-layered-map.md` 已经把当前 runtime-first 主线压成最小分层图，但当前代码与 docs 之间还缺一份第二波 spec，去承接 layer-to-code ownership、三条链路的边界、platform narrative 的降噪规则和 examples/doc routing。

这份 spec 的目标，是让 `01-layered-map` 从概念图进一步变成可执行的结构收敛任务入口。

## Scope

### In Scope

- `docs/ssot/platform/01-layered-map.md`
- `docs/ssot/platform/README.md` 中与 layered map 相关的结构路由
- layer-to-code ownership
- implementation chain / governance chain / host projection chain 的边界

### Out of Scope

- 不定义 public API 主链具体 surviving surface
- 不定义 verification control plane 协议
- 不定义 naming bucket

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 架构 owner 能从每一层落到对应代码与 spec (Priority: P1)

作为架构 owner，我需要针对 layered map 的每一层，直接知道它的代码落点和 owner spec。

**Why this priority**: 平台分层若停留在概念图，没有代码落点，就会重新漂成叙事层。

**Independent Test**: 给出 layered map 的任意一层，owner 能在 5 分钟内定位 primary code roots 与相关 spec。

**Acceptance Scenarios**:

1. **Given** `runtime control plane` 这一层，**When** 我按本 spec 查询，**Then** 我能定位到它的 code roots 与相关 owner specs。

---

### User Story 2 - reviewer 能阻止“平台层级”凭叙事抬升 (Priority: P2)

作为 reviewer，我需要拒绝那些没有明确收益、只为平台存在感服务的层级抬升。

**Why this priority**: `01-layered-map` 的核心是压缩层级存在感，只保留真正改善 Agent authoring、runtime clarity、performance 或 diagnostics 的部分。

**Independent Test**: reviewer 能根据本 spec 判断某一层是否具备升级资格。

**Acceptance Scenarios**:

1. **Given** 一个新层级提议，**When** reviewer 检查，**Then** 能判断它是否满足收益门槛。

---

### User Story 3 - docs editor 能稳定维护三条链的边界 (Priority: P3)

作为 docs editor，我需要在修改 `platform/01` 时保持 implementation chain、governance chain、host projection chain 的边界清晰。

**Why this priority**: 这是 platform docs 长期稳定的关键，否则不同链路会被重新混写。

**Independent Test**: editor 能指出某条内容属于哪条链，并知道该回写哪个页面或 spec。

**Acceptance Scenarios**:

1. **Given** 一条关于 host projection 的变更，**When** editor 审视，**Then** 知道它不能落入 runtime control plane 描述。

### Edge Cases

- 某一层跨多个包时，仍需给出 primary owner 与 code roots，不能写成泛泛描述。
- 某个概念在 docs 中存在，但在代码里只是局部 helper 时，必须降低其层级可见度。
- 某个层级与 naming 争论纠缠时，结构判断仍需先完成，命名问题交给 `129`。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 为 layered map 中的每一层建立 primary code roots 与 owner spec 映射。
- **FR-002**: 系统 MUST 区分 implementation chain、governance chain 与 host projection chain。
- **FR-003**: 系统 MUST 规定 `surface / authoring kernel / field-kernel / runtime core` 的主实现链关系。
- **FR-004**: 系统 MUST 规定 `runtime control plane` 只承接治理、验证与证据。
- **FR-005**: 系统 MUST 规定 `UI projection` 只承接宿主投影语义。
- **FR-006**: 系统 MUST 给出层级抬升的收益门槛与拒绝条件。

### Non-Functional Requirements (Layer Discipline)

- **NFR-001**: 分层必须服务压缩公开面、稳定边界、提升诊断与性能，不得为了平台叙事抬升存在感。
- **NFR-002**: 每一层都必须能被代码落点和 owner spec 解释，禁止纯概念漂浮层。
- **NFR-003**: layered map 的边界必须能长期支撑 docs 与实现同步回写。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 任意一层都能在 5 分钟内定位到 primary code roots 与 owner spec。
- **SC-002**: reviewer 可以据此拒绝无收益的层级抬升。
- **SC-003**: docs editor 可以稳定区分三条链的边界和回写去向。

## Clarifications

### Session 2026-04-06

- Q: `128` 是否只停留在 docs inventory 层？ → A: 否。当前已补可执行 layered-map policy helper 与审计测试，把 layer、chain、owner 和 uplift gate 编成代码门禁。
