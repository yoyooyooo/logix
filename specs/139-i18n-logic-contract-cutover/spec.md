# Feature Specification: I18n Logic Contract Cutover

**Feature Branch**: `139-i18n-logic-contract-cutover`
**Created**: 2026-04-09
**Status**: Planned
**Input**: User description: "让 @logixjs/i18n 收口到 service-first 与共享 Logic 声明期 contract，清理投影与生命周期接线分叉。"

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: NS-3, NS-4, NS-10
- **Kill Features (KF)**: KF-4, KF-8, KF-9

## Context

`08-domain-packages` 已把 `@logixjs/i18n` 定位为 service-first 包：默认身份是服务能力与 token contract，可选 projection 只能停在辅助层。

当前 `@logixjs/i18n` 的 root surface 已经比 Query 和 Form 更干净，但还有一个关键问题没有被最终规格化：i18n driver 的 async ready、lifecycle wiring、snapshot projection、fixed root 解析域，尚未完全并到 shared Logic declaration contract 的最终口径里。

这份 spec 的职责，是把 I18n 的 service-first 身份、可选 projection 的降级位置和 driver lifecycle 接线一次性讲清楚，不给“重新长回 module/projection family”留下空间。

本 spec 直接裁定 package root 终局：

- Keep: `I18n`, `I18nTag`, `I18nSnapshotSchema`, token contract exports
- Remove: package-root 默认 projection 或 module helpers
- Move: 若 projection helper 仍有必要，迁到显式 expert submodule 或 app-local helper

## Scope

### In Scope

- `@logixjs/i18n` 的 service-first 默认身份
- i18n driver lifecycle / async ready 对 shared Logic declaration contract 的接入
- optional projection / snapshot program 的降级边界
- root/global 解析语义的默认地位与 expert 地位
- docs/examples/tests/root exports 对 I18n 主身份的统一口径

### Out of Scope

- 不在本 spec 内重定义 core phase model
- 不在本 spec 内重定义 Query 的 program-first 输出
- 不在本 spec 内重定义 Form 的作者面
- 不在本 spec 内新增新的 i18n runtime family

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 业务作者把 I18n 当作 service-first 能力使用 (Priority: P1)

作为业务作者，我希望默认通过 token 和 `services.i18n` 消费 i18n 能力，不先被拉进 projection/module 心智。

**Traceability**: NS-3, NS-4, KF-4, KF-9

**Why this priority**: I18n 的核心价值在于服务能力与 token contract。若默认主写法再次漂向 projection/module，service-first 口径就会被稀释。

**Independent Test**: 作者只看 package root 与 canonical example，就能判断默认入口是 token + service，而 projection 只是辅助层。

**Acceptance Scenarios**:

1. **Given** 一个普通业务逻辑要读取翻译文本，**When** 作者查看 package docs，**Then** 能判断默认消费方式是 token + service。
2. **Given** 一个需要 snapshot projection 的场景，**When** 作者查看 package docs，**Then** 能判断这属于辅助层，不会被误解成默认主入口。

---

### User Story 2 - I18n owner 能把 driver lifecycle 接到 shared Logic contract (Priority: P2)

作为 I18n owner，我希望 driver 的 async ready、初始化、重置与观察语义都接到 shared Logic declaration contract，不在包内再长出一套独立 lifecycle 叙事。

**Traceability**: NS-3, NS-10, KF-8

**Why this priority**: I18n 与 Query/Form 的不同点在于它是 service-first。正因为如此，更需要把 lifecycle wiring 讲清楚，避免包内偷偷长出独立相位模型。

**Independent Test**: owner 能把任意 i18n driver 能力归类到 service-first default、auxiliary projection、expert root/global 或 shared lifecycle wiring。

**Acceptance Scenarios**:

1. **Given** 一个 async ready driver，**When** owner 对照本 spec，**Then** 能明确它接到 shared Logic declaration contract，不会走独立 i18n lifecycle。
2. **Given** 一个 fixed root 解析域需求，**When** owner 对照本 spec，**Then** 能明确它属于 expert route。

---

### User Story 3 - reviewer 能拒绝 projection/module 再次成为默认主叙事 (Priority: P3)

作为 reviewer，我希望能直接拒绝任何把 I18n 重新包装成 projection-first 或 module-first 默认写法的设计。

**Traceability**: NS-4, NS-10, KF-4, KF-8

**Why this priority**: I18n 若重新长回 projection/module 默认主入口，就会与 service-first 身份长期并列，带来新的 package-level 双轨。

**Independent Test**: reviewer 能依据本 spec 判断某个 export、某个 example 或某个 helper 是否在抬高 projection/module 叙事。

**Acceptance Scenarios**:

1. **Given** 有人提议把 snapshot projection 重新包装成 package root 默认入口，**When** reviewer 对照本 spec，**Then** 能判定该提议不符合目标。
2. **Given** 有人提议把 root/global 解析语义塞进日常主写法，**When** reviewer 对照本 spec，**Then** 能判定该提议不符合目标。

### Edge Cases

- 某些驱动需要 async init 或 ready signal，但这只能通过 shared Logic declaration contract 接线。
- snapshot projection 仍可能存在，但只能是辅助层。
- fixed root / global 解析语义可以保留，但必须清楚归到 expert route。
- token contract 的可序列化与稳定身份不能因这轮收口被削弱。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: (NS-3, KF-4) 系统 MUST 固定 `services.i18n + token contract` 为 `@logixjs/i18n` 的默认主身份与默认消费路径。
- **FR-002**: 系统 MUST 将 i18n driver 的 init、ready、reset 与相关 lifecycle wiring 接入 shared Logic declaration contract，不得在包内保留独立 lifecycle 叙事。
- **FR-003**: 系统 MUST 将 package root 最终收成 Keep `I18n / I18nTag / I18nSnapshotSchema / token contract exports`、Remove package-root projection 或 module helpers、Move surviving projection helpers 到 expert route 这三类。
- **FR-004**: 系统 MUST 将 fixed root / global 解析语义归到 expert route，不得塞入 day-one 主写法。
- **FR-005**: 系统 MUST 清理 root exports、docs、canonical examples 与 tests，使 I18n 的 service-first 身份表达一致。
- **FR-006**: 系统 MUST 保留 token contract 的稳定、可序列化与可复用语义，不因收口削弱其角色。

### Key Entities _(include if feature involves data)_

- **I18n Service Contract**: 默认主身份，承接 driver 注入、消息解析与运行时消费。
- **I18n Token Contract**: 作为稳定可序列化锚点的 token 语义。
- **I18n Auxiliary Projection**: 为特定场景提供 snapshot / projection 的辅助层。

### Non-Functional Requirements (Service-First Discipline)

- **NFR-001**: (NS-4, KF-9) package root、README、examples 与 tests 必须共享同一套 service-first 语言。
- **NFR-002**: 本轮收口不得保留兼容层、弃用期或 service-first 与 projection-first 的双轨默认入口。
- **NFR-003**: async ready、driver reset 与相关 diagnostics 必须有清晰、稳定、可解释的事件语言。
- **NFR-004**: 作者只读 canonical docs 时，应能在 1 分钟内分清 default service-first、auxiliary projection 与 expert root/global。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: (NS-3, KF-4) 维护者可用一句话回答“I18n 的默认主身份是什么”。
- **SC-002**: canonical docs/examples 不再把 projection/module 作为 I18n 的 day-one 默认入口。
- **SC-003**: reviewer 可直接依据本 spec 否决任何试图把 projection/root-global 重新抬成主叙事的方案。
- **SC-004**: I18n owner 能在 5 分钟内把任一能力归到 service-first default、auxiliary projection、expert root/global 或 shared lifecycle wiring 之一。
