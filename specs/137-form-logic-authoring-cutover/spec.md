# Feature Specification: Form Logic Authoring Cutover

**Feature Branch**: `137-form-logic-authoring-cutover`
**Created**: 2026-04-09
**Status**: Active
**Input**: User description: "让 @logixjs/form 收口到新的 Logic 声明期与 field-kernel 边界，清理 rules/derived/fields 分叉。"

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: NS-3, NS-4, NS-10
- **Kill Features (KF)**: KF-4, KF-8, KF-9

## Context

当前 docs 已经明确：

- Form 保领域 DSL
- `field-kernel` 保底层能力
- Form 作者面最终要向 `logic` 家族收口

但 `@logixjs/form` 的现实作者面仍有多条等权入口：

- `Form.make({ rules })`
- `Form.make({ derived })`
- `Form.make({ fields })`
- `Form.from(...).rules / derived / fields`
- root export 仍公开 `rules / fields / list / node`

这些入口最终虽然都会 lower 到同一个 `FieldSpec` 和 `FieldLifecycle`，但作者面最小生成元仍然偏多，默认心智没有压成一条线。

这份 spec 的职责，是在 `136` 定死 declaration/run 合同后，把 `@logixjs/form` 的默认作者面、expert 路由和 field-kernel 边界一次性收干净。

本 spec 直接裁定终局：

- `Form.make(...)` 是唯一顶层创建入口
- `Form.from(schema).logic(...)` 是唯一 schema-scoped canonical authoring path
- `$.rules / $.derived / $.fields` 退出并列 canonical 地位
- `Form.Field.*` 与 direct field-kernel fragments 只停在 expert route
- root 小写导出 `rules / fields / list / node` 退出 package root

## Scope

### In Scope

- `@logixjs/form` 的默认作者面
- `rules / derived / fields` 的默认地位与最终去留
- root barrel 与 helper/export 分层
- Form 对 shared Logic declaration contract 的接入
- Form 与 `field-kernel`、`FieldLifecycle` 的最终职责边界
- canonical docs/examples/tests 对 Form 作者面的统一口径

### Out of Scope

- 不在本 spec 内重定义 field-kernel 内部执行算法
- 不在本 spec 内重开 Query 的默认作者面
- 不在本 spec 内重开 I18n 的默认作者面
- 不在本 spec 内定义 host projection 边界

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 业务作者能一眼看出 Form 的唯一默认写法 (Priority: P1)

作为业务作者，我希望能一眼知道 Form 的默认作者面，把校验、联动和 source wiring 放进同一条主写法。

**Traceability**: NS-3, NS-4, KF-4, KF-9

**Why this priority**: 目前 Form 的分叉最多。若这一层不一次收口，后续任何示例、文档、生成器都会继续发散。

**Independent Test**: 随机抽一位维护者，只看 package root 与一组 canonical examples，就能用一句话说出 Form 的默认作者面。

**Acceptance Scenarios**:

1. **Given** 一个新表单需求，**When** 作者查看 package root 与 canonical example，**Then** 能直接判断校验、联动与 source wiring 的默认入口。
2. **Given** 一个需要 list identity 与异步 source 的表单，**When** 作者按本 spec 组织代码，**Then** 不需要在 `rules / derived / fields` 多条路线之间猜测。

---

### User Story 2 - Form owner 能把所有语义压回 shared kernel contract (Priority: P2)

作为 Form owner，我希望所有 Form 语义都能压回 shared Logic declaration contract、field-kernel 与 `FieldLifecycle`，不再保留第二套 Form runtime。

**Traceability**: NS-3, NS-10, KF-8

**Why this priority**: Form 的价值来自领域 DSL，不来自自带一套额外 runtime。只要默认作者面继续多头并存，就会不断诱导第二真相源回流。

**Independent Test**: owner 能把任意 Form 能力归类到 default authoring、helper、expert field-kernel、runtime wiring 之一。

**Acceptance Scenarios**:

1. **Given** 一个 `validateOn / reValidateOn` 需求，**When** owner 对照本 spec，**Then** 能明确它属于 Form 领域层，不属于 field-kernel。
2. **Given** 一个 `computed / source / link` 需求，**When** owner 对照本 spec，**Then** 能明确它最终 lower 到 shared kernel contract。

---

### User Story 3 - reviewer 能拒绝继续保留多条等权入口 (Priority: P3)

作为 reviewer，我希望能直接拒绝继续让 `rules / derived / fields` 长期并列为 Form 默认入口的设计。

**Traceability**: NS-4, NS-10, KF-4, KF-8

**Why this priority**: 若默认入口不收口，Field-kernel 下沉就只停在实现层，作者面与 docs 永远会重复解释旧壳层。

**Independent Test**: reviewer 能依据本 spec 判断某个 export、某个 example 或某个 helper 是否在抬高平行作者面。

**Acceptance Scenarios**:

1. **Given** 有人提议继续把 `Form.rules`、`Form.derived`、`Form.fields` 都当成 day-one 默认入口，**When** reviewer 对照本 spec，**Then** 能判定该提议不符合目标。
2. **Given** 有人提议把 direct field-kernel API 放回 root main path，**When** reviewer 对照本 spec，**Then** 能判定该提议不符合目标。

### Edge Cases

- list identity、rowId、跨行校验仍需保留稳定表达，但不能借此保留第二套作者面。
- schema bridge 与 `errors.$schema` 仍可存在，但默认心智要服从 Form 的单一作者面。
- direct `Form.Field.*` 若保留，只能停在 expert 路由。
- `validateOn / reValidateOn`、commands、`errors/ui/$form` 仍属于 Form 领域层，不得下沉到 field-kernel。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: (NS-3, KF-4) 系统 MUST 固定 `Form.make(...)` 为 `@logixjs/form` 的唯一顶层创建入口。
- **FR-002**: (NS-3, KF-4) 系统 MUST 固定 `Form.from(schema).logic(...)` 为唯一 schema-scoped canonical authoring path，用于承接校验、联动与 source wiring。
- **FR-003**: (NS-3, NS-10, KF-8) 系统 MUST 让 Form 所有校验、联动与 source 语义都 lower 到 shared Logic declaration contract、field-kernel 与 `FieldLifecycle`，不得长出第二套 Form runtime。
- **FR-004**: 系统 MUST 将 `$.rules / $.derived / $.fields` 退出并列 canonical 地位；它们可以被删除、折叠进 `$.logic(...)`、或降到 helper 或 expert route，但不能继续作为 day-one path 并列。
- **FR-005**: 系统 MUST 保留 `validateOn / reValidateOn`、`commands`、`errors/ui/$form`、list identity 等 Form 领域职责，并与 field-kernel 职责分开描述。
- **FR-005A**: 系统 MUST 将 `Form.commands.make(...)` 固定为 post-construction helper，不得让它回流成并列作者面。
- **FR-006**: 系统 MUST 将 root 小写导出 `rules / fields / list / node` 从 `@logixjs/form` package root 移除。
- **FR-007**: 系统 MUST 将 direct `Form.Field.*`、direct field-kernel fragments 等能力固定为 expert route；若保留，不能与默认主写法并列。
- **FR-008**: 系统 MUST 将 `Form.Rule` 固定为 leaf rule fragment library；它可以服务 canonical path，但不能继续单独充当一条并列作者面。
- **FR-009**: 系统 MUST 清理 root barrel、docs、canonical examples 与 package tests，使默认写法、helper 写法与 expert 路由的口径完全一致。

### Key Entities _(include if feature involves data)_

- **Form Default Authoring Path**: 承接校验、联动与 source wiring 的唯一默认作者面。
- **Form Expert Route**: 承接 direct field-kernel 或 direct field fragments 的专家入口。
- **Form Domain State**: `values / errors / ui / $form` 这组仍属于 Form 领域层的状态与协议。

### Non-Functional Requirements (Clarity & Forward-Only Cleanup)

- **NFR-001**: (NS-4, KF-9) package root、docs、examples、tests 必须共享同一套默认词汇，不能各讲各的。
- **NFR-002**: 这轮收口不得保留兼容层、弃用期或长期双轨默认入口。
- **NFR-003**: 若改动触及 field-kernel hot path、diagnostics 或验证行为，必须同步给出对应证据或基线要求。
- **NFR-004**: 作者只看 canonical example 时，应能在 1 分钟内判断默认入口、helper 入口与 expert 路由。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: (NS-3, KF-4) 任意维护者可用一句话回答“Form 的默认作者面是什么”。
- **SC-002**: canonical docs/examples 不再把 `rules / derived / fields` 作为三条等权 day-one path 介绍。
- **SC-003**: reviewer 可直接依据本 spec 否决任何试图把 direct field-kernel route 抬回默认主叙事的方案。
- **SC-004**: Form owner 能把任一能力在 5 分钟内归到 default、helper、expert 或 domain-state responsibility 之一。
