# Feature Specification: Form Resource Source Boundary

**Feature Branch**: `154-form-resource-source-boundary`  
**Created**: 2026-04-21  
**Status**: Stopped
**Input**: User description: "Define the owner boundary and collaboration contract for Form consuming Query-owned Resource capabilities for form-local remote dependencies, while keeping QueryProgram as the upgrade path for full query scenarios."

## Stop Decision

2026-04-22 裁决：本 spec 停止作为独立实施主线继续推进。
后续 Form API 主线转入 [../155-form-api-shape](../155-form-api-shape/spec.md)。
本页只保留为历史语义来源；值得迁入 `155` 的要点已经汇总到 [../155-form-api-shape/proposal-149-154-carryover.md](../155-form-api-shape/proposal-149-154-carryover.md)。
任何后续实现不得继续按本 spec 单独扩展第二 remote protocol、form-level source family 或 component-side remote sync path。

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: NS-3, NS-4, NS-10
- **Kill Features (KF)**: KF-4, KF-8, KF-9

## Context

Form 当前已经冻结：

- Form 负责输入语义、校验语义、提交语义
- Query 领域包负责 `Resource` / engine owner
- React 继续只做 `useModule / useSelector` acquisition 与 projection

但“当表单需要远程数据或远程校验时，Form 应如何消费 Query owner 下的能力”还没有独立 spec 持有。

现在存在两类容易混淆的场景：

1. 表单内部的远程联动
   - 例如国家切换后加载省份选项
   - 例如输入编码后补齐摘要
2. 远程结果参与校验 / submit truth
   - 例如用户名唯一性检查
   - 例如优惠券、邀请码、税号合法性检查

如果这层 boundary 不冻结，后续很容易长出：

- Form 自己的一套 remote protocol
- rule 内直接 fetch
- React 组件再长一套网络同步 glue
- QueryProgram 与 form-local resource 场景混成一条线

## Scope

### In Scope

- Resource owner stays in Query
- Form consuming Query-owned Resource for form-local remote dependencies
- consumer-attached exact user-view declaration shape for form-local remote dependency
- Form-lowered companion / settlement / reason slices for Query-owned remote facts
- rule / submit / UI consuming remote result snapshots instead of performing IO directly
- obligation-based boundary between form-local resource dependency and full QueryProgram
- handoff to active-shape / settlement / reason members

### Out of Scope

- form-companion-attached alternative family
- exact carrier landing page / exact read helper spelling
- `writeTo` / snapshot field exact shape
- full QueryProgram API design
- render helper family
- field-ui exact leaf contract

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 维护者能用单一远程事实路径解释 Form 场景 (Priority: P1)

作为维护者，我希望表单里的远程依赖只有一条事实路径：Resource 由 Query owner 持有，Form 只声明依赖与消费方式，rule 不直接做 IO。

**Traceability**: NS-4, KF-9

**Why this priority**: 如果这里不冻结，后续 settlement 和 reason contract 会重新长出第二套远程 truth。

**Independent Test**: reviewer 只看 spec，就能判断一个表单远程场景是否仍维持单一远程事实路径。

**Acceptance Scenarios**:

1. **Given** 一个国家切换后加载省份列表的表单，**When** reviewer 对照本 spec，**Then** 能判断 Resource owner 在 Query，Form 只负责触发与消费。
2. **Given** 一个邀请码唯一性校验场景，**When** reviewer 对照本 spec，**Then** 能判断 rule 只能消费远程结果快照，不能直接发起 fetch。

---

### User Story 2 - 实施者能区分 form-local resource 与 full QueryProgram (Priority: P2)

作为实施者，我希望知道什么时候继续用 form-local remote dependency，什么时候应该升级成完整 QueryProgram。

**Traceability**: NS-3, KF-4

**Why this priority**: 如果升级门槛不清楚，Form source 很容易被硬塞成第二 Query 系统。

**Independent Test**: reviewer 可以根据 hard trigger 与 safe-local witness 判断该场景属于 form-local resource 还是 full QueryProgram。

**Acceptance Scenarios**:

1. **Given** 一个只服务单个 form instance 的选项联动场景，**When** 进行路由，**Then** 它继续属于 form-local remote dependency。
2. **Given** 一个需要显式 invalidate、分页或跨 form instance 复用的远程场景，**When** 进行路由，**Then** 只要命中任一 hard trigger，就必须升级到 QueryProgram。

---

### User Story 3 - reviewer 能拒绝第二套 remote protocol (Priority: P3)

作为 reviewer，我希望能直接拒绝 rule 里 direct fetch、Form 自带第二套 remote API、以及 React 组件手写网络同步 glue。

**Traceability**: NS-10, KF-8

**Why this priority**: 这是避免 Form 再长第二套 runtime 心智的硬门。

**Independent Test**: reviewer 只对照本 spec，就能否决 direct fetch / dual remote protocol / component-side sync truth。

**Acceptance Scenarios**:

1. **Given** 有人提议在 `Form.Rule.custom` 里直接 fetch，**When** reviewer 对照本 spec，**Then** 能直接否决。
2. **Given** 有人提议在 React 组件用 `useEffect` 同步表单远程数据，**When** reviewer 对照本 spec，**Then** 能直接否决。

### Edge Cases

- 表单内部远程联动不自动等于完整 Query 场景。
- 单个 hard trigger 命中就足以升级到 QueryProgram，不需要累计计数。
- Form-visible remote slice 只承接 lowered consumer facts，不承接第二 remote owner。
- 远程结果快照若进入 active universe，其 cleanup / blocking exit 仍回到 active-shape owner。
- 远程结果若进入 invalid / pending / compare / repair，仍回到 settlement / reason owner，不在本 spec 内重开。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: (NS-4, KF-9) Resource / ResourceSpec / load owner MUST remain in Query domain owner.
- **FR-002**: (NS-3, KF-4) Form MAY consume Query-owned Resource capability for form-local remote dependencies, but MUST NOT define a second remote protocol.
- **FR-003**: Rule, submit semantics, and UI reads MUST consume Query-owned remote facts lowered into Form-visible companion / settlement / reason slices, and MUST NOT perform direct IO.
- **FR-004**: React consumption MUST remain on the existing host law and MUST NOT introduce component-side remote truth synchronization as a second path.
- **FR-005**: The system MUST define an explicit obligation-based boundary between form-local remote dependency and full QueryProgram, using hard upgrade triggers and safe-local witness instead of count-based heuristics.
- **FR-006**: The spec MUST route active-exit / cleanup concerns to `151`, submit/pending/blocking concerns to `152`, and explain/evidence concerns to `153`.
- **FR-007**: Form-visible remote slices MUST remain lowered consumer facts and MUST NOT become a second remote owner, an independent cache owner, or a mutable write path.
- **FR-008**: The exact user-view declaration shape for form-local remote dependency MUST be consumer-attached `field(path).source({ resource, deps, key, ... })`.
- **FR-009**: The exact surface MUST NOT expose `target / scope / slot / reset`, a form-level `source(...)` family, or any second companion route for this capability.

### Non-Functional Requirements (Single Remote Truth)

- **NFR-001**: (NS-10, KF-8) The collaboration model MUST preserve a single remote fact path: Query owns remote fact, Form owns trigger semantics, React owns projection.
- **NFR-002**: This spec MAY freeze the exact user-view noun only at the consumer-attached declaration edge; exact carrier landing page, exact read helper spelling, and lane-specific read surfaces MUST remain deferred until the underlying lane owners close their semantics.
- **NFR-003**: Any future convenience API in this area MUST be rejected if removing it would require users to unlearn a second world model.
- **NFR-004**: The upgrade gate MUST remain explainable through owner and lifecycle obligations, and MUST NOT rely on a fragile feature-count heuristic.
- **NFR-005**: The exact user-view shape MUST extend the existing `Form.make(..., define)` DSL and MUST NOT introduce a second declaration carrier or a second form-local remote subsystem.

### Key Entities _(include if feature involves data)_

- **Form-local Remote Dependency**: 只服务单个 form instance 的远程依赖场景。
- **Query-owned Resource**: 真实 IO 入口与远程事实 owner。
- **Form-lowered Remote Slice**: Query-owned remote fact 被 lower 到 Form 可消费的 companion / settlement / reason facts。
- **Remote Result Snapshot**: rule / submit / UI 消费的远程结果事实载体。
- **Full Query Scenario**: 需要缓存 / 失效 / 预取 / 分页 / 跨区域复用的完整查询场景。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: reviewer 能区分“form-local remote dependency”与“full QueryProgram”。
- **SC-002**: reviewer 能直接否决 rule 直连 IO、Form 第二 remote protocol、React 侧第二同步路径。
- **SC-003**: 151 / 152 / 153 可以消费本 spec，而不需要在各自内部重新定义 Resource owner boundary。
- **SC-004**: reviewer 看到单个 hard trigger 命中时，能直接把场景路由到 QueryProgram，而不需要再做特征计数。
- **SC-005**: day-one 用户可以用单一公式 `field(path).source({ resource, deps, key, ... })` 解释 form-local remote dependency，而不需要学习 form-level remote subsystem。
