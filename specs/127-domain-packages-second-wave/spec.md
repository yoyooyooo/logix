# Feature Specification: Domain Packages Second Wave

**Feature Branch**: `127-domain-packages-second-wave`
**Created**: 2026-04-06
**Status**: Done
**Input**: User description: "围绕 Query、I18n、Domain 与 future domain package admission 的第二波全量收敛。"

## Context

`08-domain-packages` 已经给 Query、I18n、Domain 定下统一方向，也把 future domain package 的 admission principle 写成了长期口径。

第一波 domain rebootstrap 已经完成边界压缩，但 docs 当前目标仍大于现有 spec 覆盖。还需要一份第二波 spec，把 package admission、future package classification、helper boundary、examples/docs/test alignment 和保留能力的最终责任收紧。

## Scope

### In Scope

- `docs/ssot/runtime/08-domain-packages.md`
- Query / I18n / Domain 的第二波收敛
- future domain package admission rule
- helper / command / facade boundary

### Out of Scope

- 不定义 Form field-kernel 结构
- 不定义 host scenario patterns
- 不定义 platform layered map

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 维护者能判断一个领域包该不该进入主线 (Priority: P1)

作为维护者，我需要明确一个领域包是否符合 `service-first / program-first` 的准入规则。

**Why this priority**: `08` 页面本身就承担未来领域包统一准入规则。若没有明确 spec owner，这条规则不会被稳定执行。

**Independent Test**: 给定一个领域包候选，维护者能在 5 分钟内判断它应进入主线、如何分类，以及哪些旧心智必须拒绝。

**Acceptance Scenarios**:

1. **Given** 一个新的领域包候选，**When** 我按本 spec 分类，**Then** 我能判断它属于 `service-first`、`program-first`，还是应被拒绝。

---

### User Story 2 - 现有 domain owners 能知道哪些能力保留、哪些必须降级 (Priority: P2)

作为 Query、I18n、Domain 的 owner，我需要明确各自仍保留的能力、默认主输出和 helper 边界。

**Why this priority**: 第一波只解决了“先收缩边界”，第二波需要把 docs 描述的长线目标补全。

**Independent Test**: owner 能从本 spec 判断 `Query.Engine`、`I18n.layer(driver)`、`Crud.make(...)` 等能力的保留方式与边界。

**Acceptance Scenarios**:

1. **Given** 一项领域包 helper，**When** owner 对照本 spec，**Then** 能判断它是便利层、主输出，还是应退出主线。

---

### User Story 3 - reviewer 能阻止第二套 runtime / DI / 事务面回流 (Priority: P3)

作为 reviewer，我需要阻止领域包重新长回独立 runtime、DI、事务或调试事实源。

**Why this priority**: 这是 `08` 的核心护栏，也是未来新包最容易踩回旧路的地方。

**Independent Test**: reviewer 能根据本 spec 拒绝一项会引入第二套运行时语义的领域包设计。

**Acceptance Scenarios**:

1. **Given** 一个领域包设计提议，**When** reviewer 检查，**Then** 能判断它是否违反单主线约束。

### Edge Cases

- 某个包的主体是服务能力，但又带一组投影 helper 时，仍需先守住 primary output type。
- 某个旧名字用户很熟悉，但与新主线冲突时，仍需按当前口径重命名或删除。
- 某个 helper 同时操作 state 和 commands 时，必须先判断它会不会形成第二语义面。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 固定 `service-first / program-first` 为领域包唯一主输出分类。
- **FR-002**: 系统 MUST 为 Query、I18n、Domain 明确第二波收敛目标、保留能力与退出能力。
- **FR-003**: 系统 MUST 为 future domain package admission 定义统一判断规则。
- **FR-004**: 系统 MUST 规定 helper、commands、facade 的边界，防止形成第二语义面。
- **FR-005**: 系统 MUST 要求 docs、examples、tests 和 package templates 对这组边界保持一致。
- **FR-006**: 系统 MUST 明确旧名字、旧 facade、旧 module-first 心智的退出口径。

### Non-Functional Requirements (Package Line Discipline)

- **NFR-001**: 领域包必须全部降到同一条 runtime 主线，不得自带第二套 runtime、DI、事务或调试事实源。
- **NFR-002**: 领域包的 admission 规则必须足够清晰，未来新包可在 5 分钟内完成初筛。
- **NFR-003**: 领域包的 helper 设计必须避免与 actions / state 并行形成第二核心面。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 维护者可以在 5 分钟内完成一个新领域包候选的主输出分类。
- **SC-002**: 现有 Query、I18n、Domain 的第二波目标不再依赖口头解释。
- **SC-003**: reviewer 能据此拒绝第二套 runtime / DI / 事务面回流。

## Clarifications

### Session 2026-04-06

- Q: `@logixjs/query` 的 root barrel 是否还能继续暴露 `source` 短名？ → A: 不能。root 只保留 `make / fields / Engine / TanStack`，`source` 继续停在 fields 子模块。
- Q: `@logixjs/domain` 是否还能继续暴露 `CrudModule` 这类 module-first 类型名或 “Domain modules” package 叙事？ → A: 不能。root 类型口径统一收敛到 `CrudProgram`，package metadata 改为 program-first pattern kits。
