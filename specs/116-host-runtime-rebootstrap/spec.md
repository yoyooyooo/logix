# Feature Specification: Host Runtime Rebootstrap

**Feature Branch**: `116-host-runtime-rebootstrap`
**Created**: 2026-04-05
**Status**: Done
**Input**: 重启 @logixjs/react、@logixjs/sandbox、@logixjs/test、@logixjs/devtools-react 的宿主与验证拓扑，使其围绕 kernel 与 runtime control plane 收口。

## Context

宿主相关包当前分散承担了 React 语义、sandbox 验证、test harness、devtools UI 等职责，但它们的共同中心应当是 `kernel + runtime control plane`，不是各自长出独立世界。

这份 spec 要把宿主相关包的角色、目录拓扑和互相依赖提前定好，给后续真正重组目录打基础。已对齐 kernel 与 control plane 的宿主切片、fixtures 与测试应优先复用。

## Scope

### In Scope

- `@logixjs/react`
- `@logixjs/sandbox`
- `@logixjs/test`
- `@logixjs/devtools-react`

### Out of Scope

- 不覆盖 domain 包与 CLI
- 不在本 spec 内完成 UI 或测试实现

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 宿主相关包围绕同一核心组织 (Priority: P1)

作为维护者，我能看到 React、sandbox、test、devtools 如何围绕同一 kernel 和 control plane 组织。

**Why this priority**: 这些包若分别以自己的心智重建，后续会再次长出多套宿主语义。

**Independent Test**: 阅读 spec 后，能明确四个包各自的职责、公开面和依赖方向。

**Acceptance Scenarios**:

1. **Given** 我查看宿主包规划，**When** 我判断某项能力应落在哪个包，**Then** 我能根据职责边界做出唯一选择。

---

### User Story 2 - 目录重启前先定模板 (Priority: P2)

作为实现者，我希望在真正动目录前就拿到每个包的目标拓扑模板。

**Why this priority**: 宿主包牵涉范围广，先定模板能减少后续反复搬家。

**Independent Test**: 每个包都能回答公开入口、internal cluster、tests、fixtures 的目标位置。

**Acceptance Scenarios**:

1. **Given** 我要重启 `@logixjs/react` 或 `@logixjs/sandbox`，**When** 我对照 spec，**Then** 我知道旧目录如何封存，新目录如何开出第一版骨架。

### Edge Cases

- 某个包可能保留包名但重写内部目录，这种情况必须有“保留名字、重启拓扑”的处置路径。
- 某个包可能只保留少量 helper，其余职责转移到邻近包，这种迁移也要有明确边界。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 为 `@logixjs/react` 定义新的宿主语义拓扑，明确 provider、hooks、store、platform 的归位。
- **FR-002**: 系统 MUST 为 `@logixjs/sandbox` 定义验证与实验场拓扑，围绕 `runtime.trial` 与受控环境收口。
- **FR-003**: 系统 MUST 为 `@logixjs/test` 定义与 control plane 对齐的测试入口，明确 test runtime、assertions、vitest integration 的关系。
- **FR-004**: 系统 MUST 为 `@logixjs/devtools-react` 定义 devtools 与统一观测契约的关系，避免自产第二套诊断事实源。
- **FR-005**: 系统 MUST 为四个包给出目标目录模板和迁移策略。
- **FR-006**: 系统 MUST 识别四个包内可直接复用的宿主协议、helper、fixtures 与覆盖测试，并记录平移策略。

### Non-Functional Requirements (Coherence & Diagnostics)

- **NFR-001**: 宿主相关包必须围绕同一 control plane 组织，不能各自定义验证主线。
- **NFR-002**: devtools、sandbox、test 共享的诊断与证据格式必须可序列化、可比较。
- **NFR-003**: React 宿主语义必须保持单快照读取与无 tearing 原则。
- **NFR-004**: 宿主包重组默认优先复用已对齐目标契约的实现与测试资产，避免无价值重写。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 四个宿主相关包都能在一份 spec 中找到明确目标职责与目录模板。
- **SC-002**: 后续实现时，维护者可以在 5 分钟内判断一项宿主能力应进入哪个包。
- **SC-003**: sandbox、test、devtools 的验证与证据契约能与 `runtime.check / runtime.trial / runtime.compare` 对齐。
