# Feature Specification: Anchor Profile Static Governance

**Feature Branch**: `129-anchor-profile-static-governance`
**Created**: 2026-04-06
**Status**: Done
**Input**: User description: "围绕 anchor、strict static profile、实例化边界与 postponed naming 的第二波结构收敛。"

## Context

`docs/ssot/platform/02-anchor-profile-and-instantiation.md` 已把定义锚点、strict static profile、实例化入口与 `Workflow` 的结构边界写清；`docs/standards/logix-api-next-postponed-naming-items.md` 已把命名问题降级为 bucket。

当前还缺一份第二波 spec，去明确哪些静态角色仍可保留、何时重开、何时只在 naming bucket 处理，以及这些判断怎样影响 code/docs/examples 的后续收敛。

## Scope

### In Scope

- `docs/ssot/platform/02-anchor-profile-and-instantiation.md`
- `docs/standards/logix-api-next-postponed-naming-items.md`
- 定义锚点、strict static profile、实例化边界
- `ModuleDef / Workflow / roots` 一类 naming fallout 的 reopen 规则

### Out of Scope

- 不定义 layered map 全局分层
- 不定义 public API surviving surface
- 不定义 verification control plane

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 维护者能判断一个静态角色是否仍该保留 (Priority: P1)

作为维护者，我需要判断某个定义锚点或 static profile 能否继续存在，以及它存在的收益是否足够。

**Why this priority**: 这是 `02` 页面最核心的结构裁决，也是 docs 中最容易被“平台叙事”重新拉偏的主题。

**Independent Test**: 给定一个静态角色，维护者能在 5 分钟内判断它是保留、后置、还是删除。

**Acceptance Scenarios**:

1. **Given** 一个新静态角色提议，**When** 我按本 spec 审视，**Then** 我能判断它是否有足够的 identity、验证或诊断收益。

---

### User Story 2 - reviewer 能分清结构问题和命名问题 (Priority: P2)

作为 reviewer，我需要区分“是否允许这类静态角色存在”和“它最终叫什么名字”这两类问题。

**Why this priority**: 若结构与命名重新混写，就会把 `02` 和 postponed naming bucket 再次缠住。

**Independent Test**: reviewer 能判断一项讨论应该落在 `02` 还是 postponed naming bucket。

**Acceptance Scenarios**:

1. **Given** 一个关于 `Workflow` 的讨论，**When** reviewer 检查，**Then** 能判断它是在讨论结构边界还是在讨论命名本身。

---

### User Story 3 - 作者能知道哪些旧名词已退出公开主链 (Priority: P3)

作为作者，我需要知道 `ModuleDef`、`Workflow`、`roots` 这一类旧名词目前的对外口径。

**Why this priority**: 这些词若没有稳定口径，Agent 和人类都容易继续生成旧叙事。

**Independent Test**: 作者能根据本 spec 与 naming bucket，判断某个旧名词现在该如何表述。

**Acceptance Scenarios**:

1. **Given** 一个旧名词出现在新 docs 草稿里，**When** 作者对照本 spec，**Then** 能知道它应被替换、延后还是仅保留为局部上下文。

### Edge Cases

- 某个静态角色暂时保留，但对外不该恢复旧名字时，必须明确区分“结构保留”和“命名后置”。
- 某个命名问题会影响多个页面时，仍需保持一个 primary structure owner。
- 某个旧概念在实现里有残留时，也不能自动恢复到公开主链。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 固定定义锚点与 strict static profile 的保留条件。
- **FR-002**: 系统 MUST 固定 `Program.make(Module, config)` 与 `Runtime.make(Program)` 仍是唯一公开装配与运行入口。
- **FR-003**: 系统 MUST 规定 `Workflow` 只允许停留在局部原型、验证原型或历史上下文。
- **FR-004**: 系统 MUST 规定 `ModuleDef`、`Workflow`、`roots` 一类 naming fallout 的当前口径与 reopen 条件。
- **FR-005**: 系统 MUST 固定结构 owner 与 naming bucket 的分工边界。
- **FR-006**: 系统 MUST 要求 docs、code、examples 在这组静态角色口径上保持一致。

### Non-Functional Requirements (Static Governance)

- **NFR-001**: 只有能直接换来 identity、安装期验证或诊断收益的静态角色才允许保留。
- **NFR-002**: naming bucket 只承接命名延后项，不承接结构裁决。
- **NFR-003**: 任何静态角色若会重新抬升成公开主链对象，默认应被拒绝或后置。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 维护者可以在 5 分钟内判断一个静态角色是否值得保留。
- **SC-002**: reviewer 可以清晰区分结构问题与命名问题的 owner 页面。
- **SC-003**: 作者可以稳定处理 `ModuleDef / Workflow / roots` 这一类旧名词的当前口径。

## Clarifications

### Session 2026-04-06

- Q: `129` 是否只停留在 docs ledger 与 naming bucket 文案？ → A: 否。当前已补可执行 static governance policy 与审计测试，把 static role、instantiation boundary、naming owner 和 reopen 条件编成代码门禁。
