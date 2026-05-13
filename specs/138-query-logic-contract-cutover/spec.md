# Feature Specification: Query Logic Contract Cutover

**Feature Branch**: `138-query-logic-contract-cutover`
**Created**: 2026-04-09
**Status**: Active
**Input**: User description: "让 @logixjs/query 收口到共享的 Logic 声明期与 runtime contract，退出独立 query 世界心智。"

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: NS-3, NS-4, NS-10
- **Kill Features (KF)**: KF-4, KF-8, KF-9

## Context

`08-domain-packages` 已明确把 `@logixjs/query` 定位为 program-first 的 resource-oriented program kit。

但当前 `@logixjs/query` 仍保留几处会放大第二心智的表面：

- package root 仍公开 `fields`
- `Query.make(...)` 仍把 query declarations lower 成 module `fields`
- `Engine / TanStack / invalidate / refresh` 与 default authoring 的关系还没完全说死

当前实现并没有第二套 runtime，但包面对外仍容易让人先理解成一套“独立 query 世界”，再回到主链。这份 spec 的职责，是把 Query 默认主输出、shared Logic declaration contract 接入与 expert integration layer 一次性收清。

本 spec 直接裁定 package root 终局：

- Keep: `Query.make`, `Query.Engine`, `Query.TanStack`
- Move: declarations 或 fields helpers 迁到 public submodule `@logixjs/query/Fields`
- Remove: root `Query.fields`

## Scope

### In Scope

- `@logixjs/query` 的默认主输出与 day-one authoring
- Query 对 shared Logic declaration contract 的接入
- `fields` root export 的默认地位与最终去留
- `Engine / TanStack / invalidate / refresh` 的角色分层
- query cache snapshot 回写到模块 state 的单真相约束
- docs/examples/tests/root exports 对 Query 心智的统一口径

### Out of Scope

- 不在本 spec 内重定义 core phase model
- 不在本 spec 内重定义 Form 的作者面
- 不在本 spec 内重定义 I18n 的 service-first 边界
- 不在本 spec 内新增第二套 cache engine family

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 业务作者把 Query 当作 program-first kit 使用 (Priority: P1)

作为业务作者，我希望把 Query 直接理解为可挂载的 program kit，不再先被拉进 fields DSL 或查询模块体系。

**Traceability**: NS-3, NS-4, KF-4, KF-9

**Why this priority**: Query 的公开主输出决定了业务作者和 Agent 的第一心智。若这里继续模糊，后续 examples 与生成器都很难稳定。

**Independent Test**: 给定一个查询需求，作者只看 package root 与 canonical example，就能判断默认拿到的是 program kit，以及何时才需要 expert integration layer。

**Acceptance Scenarios**:

1. **Given** 一个需要参数驱动查询与刷新能力的场景，**When** 作者查看 package root，**Then** 能判断默认主输出是 program-first kit。
2. **Given** 一个只需要接 TanStack engine 的高级场景，**When** 作者查看 package docs，**Then** 能判断这属于 integration layer，不会被误解成另一条默认作者面。

---

### User Story 2 - Query owner 能让 internals 降回 shared Logic contract (Priority: P2)

作为 Query owner，我希望 Query internals 继续用 shared Logic declaration contract、Module、Program 和 shared runtime contract 表达，不再显得像一套独立 runtime。

**Traceability**: NS-3, NS-10, KF-8

**Why this priority**: Query 的真实价值在于资源语义、缓存语义和 state projection；若包面对外继续像独立 runtime，后续 helper 会不断变成第二主链。

**Independent Test**: owner 能把任意 Query 能力归类到 default program kit、integration layer、helper 或 expert route。

**Acceptance Scenarios**:

1. **Given** 一个自动触发查询与失效逻辑，**When** owner 对照本 spec，**Then** 能明确它属于 shared Logic contract 下的 package logic，不会被抬成额外相位对象。
2. **Given** 一个 query cache 观察需求，**When** owner 对照本 spec，**Then** 能明确 cache snapshot 仍需投影回模块 state。

---

### User Story 3 - reviewer 能拒绝第二套 cache truth 与 root fields 主叙事 (Priority: P3)

作为 reviewer，我希望能拒绝继续把 `Query.fields` 当作默认作者面，或继续让 Query 讲“查询模块世界”的方案。

**Traceability**: NS-4, NS-10, KF-4, KF-8

**Why this priority**: root `fields` helper 若继续处于默认主叙事，就会与 program-first 输出长期并存，形成新的双轨作者面。

**Independent Test**: reviewer 能根据本 spec 直接判定某个 export、某个 example 或某个 helper 是否在抬高第二作者面或第二 cache truth。

**Acceptance Scenarios**:

1. **Given** 有人提议继续把 `Query.fields` 放在 root 主写法里，**When** reviewer 对照本 spec，**Then** 能判定该提议不符合目标。
2. **Given** 有人提议让 query cache 成为独立 truth source，**When** reviewer 对照本 spec，**Then** 能判定该提议不符合目标。

### Edge Cases

- 某些 integration layer 仍需要 `Engine` 或 `TanStack`，但它们不能重新定义默认主输出。
- 某些 query 不需要自动触发，也不能因此回退到 fields-first 心智。
- `invalidate / refresh` 可保留为 helper，但不能与 state/actions 并列形成第二语义面。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: (NS-3, KF-4) 系统 MUST 固定 `Query.make(...)` 为 `@logixjs/query` 的默认主输出入口，承接 program-first query kit。
- **FR-002**: 系统 MUST 让 Query 的 declarations 继续通过 package-local query authoring surface 进入 shared Logic declaration contract，不再把 root `fields` helper 作为默认作者面。
- **FR-003**: 系统 MUST 将 package root 最终收成 Keep `make / Engine / TanStack`、Move declarations helpers 到 `@logixjs/query/Fields`、Remove root `fields` 这三类。
- **FR-004**: (NS-3, NS-10, KF-8) 系统 MUST 要求 Query internals 继续 lower 到同一条 `Module + Logic + Program + Runtime` 主线，不得长出第二套 runtime。
- **FR-005**: 系统 MUST 继续保证 query cache / resource snapshot 投影回模块 state，不得形成第二套 cache truth。
- **FR-006**: 系统 MUST 将 `Engine`、`TanStack`、`invalidate`、`refresh` 归类为 integration layer 或 helper，不允许它们反向定义作者面主链。
- **FR-007**: 系统 MUST 在 docs/examples/tests/package metadata 中停止讲“查询模块世界”，统一讲 `Query.make(...)` 对应的 query program kit 与 integration layer。

### Key Entities _(include if feature involves data)_

- **Query Program Kit**: 对外默认主输出，承接 params、ui、queries state 与默认逻辑。
- **Query Integration Layer**: 例如 `Engine`、`TanStack` 这类 capability 与外部缓存集成层。
- **Query State Projection**: 将资源快照回写到模块 state 的单真相表达。

### Non-Functional Requirements (Single Truth & Surface Compression)

- **NFR-001**: (NS-4, KF-9) root exports、README、examples 与 tests 必须共享同一套 program-first 语言。
- **NFR-002**: 本轮收口不得保留兼容层、弃用期或 fields-first 与 program-first 双轨默认入口。
- **NFR-003**: refresh、invalidate、race、cache reuse 等语义必须可诊断，且在 diagnostics 关闭时不增加第二心智面。
- **NFR-004**: 作者只读 canonical docs 时，应能在 1 分钟内分清 default output、integration layer 与 expert route。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: (NS-3, KF-4) 维护者可用一句话回答“Query 的默认主输出是什么”。
- **SC-002**: canonical docs/examples 不再把 root `Query.fields` 作为默认 day-one path 介绍。
- **SC-003**: reviewer 可直接依据本 spec 否决任何试图引入第二 cache truth 或第二作者面的方案。
- **SC-004**: Query owner 能在 5 分钟内把任一能力归到 default program kit、integration layer、helper 或 expert route 之一。
