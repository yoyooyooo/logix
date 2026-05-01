# Feature Specification: Domain Package Rebootstrap

**Feature Branch**: `117-domain-package-rebootstrap`
**Created**: 2026-04-05
**Status**: Done
**Input**: 重启 @logixjs/query、@logixjs/form、@logixjs/i18n、@logixjs/domain 的领域包形态与目录结构，统一 program-first 或 service-first 口径。

## Context

领域包是最容易被旧语义拖回去的一层。当前 docs 已经明确：

- query 更接近 program-first
- i18n 更接近 service-first
- domain 更接近 pattern-kit
- form 保留领域层表达，但要与 field-kernel 边界保持清晰

这份 spec 的目标是把四个领域包的身份、目录模板和旧目录处置策略提前定死，同时保留那些已经对齐主链的领域实现与覆盖测试。

## Scope

### In Scope

- `@logixjs/query`
- `@logixjs/form`
- `@logixjs/i18n`
- `@logixjs/domain`

### Out of Scope

- 不包含 React、CLI、core kernel
- 不在本 spec 内直接实现新的 domain API

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 领域包不再长第二套心智 (Priority: P1)

作为维护者，我能明确每个领域包是 service-first、program-first 还是 pattern-kit，并据此收口公开面。

**Why this priority**: 如果领域包继续同时保留多套身份，主链就会再次分叉。

**Independent Test**: 阅读 spec 后，能回答 query、form、i18n、domain 的主输出形态和公开面边界。

**Acceptance Scenarios**:

1. **Given** 我查看某个领域包规划，**When** 我判断它的主入口，**Then** 我能得到唯一主输出形态。

---

### User Story 2 - 旧目录可封存，主线可重建 (Priority: P2)

作为实现者，我希望在语义偏差过大时，能直接把旧目录封存后重建，而不背兼容包袱。

**Why this priority**: 领域包常带有旧 facade 与旧命名，强行原地改造成本很高。

**Independent Test**: 对照 spec，能判断某个领域包是原地收缩、改名封存后重建，还是仅迁移少量内核代码。

**Acceptance Scenarios**:

1. **Given** 我需要重启 query 或 i18n，**When** 我读取 spec，**Then** 我知道应保留哪些概念，哪些旧入口直接退出主线。

### Edge Cases

- 某个领域包既有服务能力又有 projection 能力，此时必须明确主入口和辅助入口。
- form 与 field-kernel 的边界需保持稳定，不能让底层 expert 入口重新变成默认主写法。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 为 `@logixjs/query` 明确 program-first 定位，并给出公开面与内部目录模板。
- **FR-002**: 系统 MUST 为 `@logixjs/i18n` 明确 service-first 定位，并明确 `I18nModule` 一类旧入口的去向。
- **FR-003**: 系统 MUST 为 `@logixjs/domain` 明确 pattern-kit 定位，并给出 kit 化目录模板。
- **FR-004**: 系统 MUST 为 `@logixjs/form` 明确领域层与 field-kernel 的边界，并规划 form 主线与 react 子树的目录关系。
- **FR-005**: 系统 MUST 为四个领域包定义旧目录处置策略，包含保留、封存重建、局部迁移三类路径。
- **FR-006**: 系统 MUST 识别四个领域包内可直接复用的协议、helper、fixtures 与测试资产，并记录平移策略。

### Non-Functional Requirements (Clarity & Compression)

- **NFR-001**: 每个领域包只能有一个主输出形态，避免多组等价主入口。
- **NFR-002**: 领域包不得自带第二套 runtime、事务、DI、诊断事实源。
- **NFR-003**: 新目录模板必须有利于 Agent 生成、理解、组合与校验。
- **NFR-004**: 领域包重组默认优先复用已对齐目标主链的实现与测试资产。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: query、form、i18n、domain 四个包都能得到唯一主输出形态定义。
- **SC-002**: 每个包的旧入口去向都有明确记录，不再靠口头共识。
- **SC-003**: 后续进入实现时，维护者能在 5 分钟内判断某个领域能力该落在哪个包的哪个层级。
