# Spec Group: Form Spec Hub

**Feature Branch**: `150-form-semantic-closure-group`  
**Created**: 2026-04-21  
**Status**: Stopped
**Input**: User description: "Create a long-lived group spec that serves as the total entrypoint for Form-related specs, while coordinating the remaining semantic closure gaps across active-shape, settlement, and reason contract without duplicating member implementation details."

## Stop Decision

2026-04-22 裁决：本 group 停止作为 `149~154` 的活跃调度入口继续推进。
后续 Form API 主线转入 [../155-form-api-shape](../155-form-api-shape/spec.md)。
`149 / 151 / 152 / 153 / 154` 不再作为并列 active members 推进；它们只作为历史语义来源，被汇总到 [../155-form-api-shape/proposal-149-154-carryover.md](../155-form-api-shape/proposal-149-154-carryover.md)。
本页与 registry 只保留历史路由、依赖和停止事实，不再作为 implementation route。

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: NS-3, NS-4, NS-10
- **Kill Features (KF)**: KF-4, KF-8, KF-9

## Why This Group Exists

`143 / 144 / 145` 已经分别把 canonical error carrier、submitAttempt 最小观察面、row locality 主轴切出第一刀，`149` 继续承接 row roster projection theorem。

Form 相关工作已经不止一条线：

- exact surface / authority closure
- live residue / examples / docs cutover
- semantic closure
- post-P0 reopen

如果每条线继续各自长 spec，而没有长期总入口，会出现三个问题：

- spec 路由会回到“靠记忆找 member / proposal”
- 当前 blocking route、依赖与 imported decisions 容易分裂
- 维护者 / 实施者 / reviewer 很难快速判断“下一步该去哪一页”

因此 150 的历史角色曾固定为：

- Form 相关 spec 的 route manifest
- member / predecessor / external 的长期 registry hub
- 只持有分类、依赖、registry、routing law
- 不复制任何 member 的实现细节

停止前这个 hub 下优先收的语义缺口是四块：

- active-set / presence / cleanup law
- Form × Query/Resource source boundary
- async settlement contributor semantics
- reason projection / evidence envelope

## Imported Predecessors

下面这些 spec 已经提供前置裁决，但不再作为本 group 的活跃 member：

- [143-form-canonical-error-carrier-cutover](../143-form-canonical-error-carrier-cutover/spec.md)
- [144-form-settlement-submit-cutover](../144-form-settlement-submit-cutover/spec.md)
- [145-form-active-shape-locality-cutover](../145-form-active-shape-locality-cutover/spec.md)

本 hub 直接消费它们的冻结结果：

- `FormErrorLeaf` 已是唯一 canonical error carrier
- `$form.submitAttempt.summary / compareFeed` 已有最小落点
- row locality / roster replacement 已有第一层稳定主轴

## Group Boundary

150 作为长期 hub，当前分三层管理：

### 1. 已停止成员（stopped members）

- [149-list-row-identity-public-projection](../149-list-row-identity-public-projection/spec.md)
- [151-form-active-set-cleanup](../151-form-active-set-cleanup/spec.md)
- [154-form-resource-source-boundary](../154-form-resource-source-boundary/spec.md)
- [152-form-settlement-contributor](../152-form-settlement-contributor/spec.md)
- [153-form-reason-projection](../153-form-reason-projection/spec.md)

### 2. 已消费前置（imported predecessors）

- `143`
- `144`
- `145`

### 3. 外部关联（external related docs / proposals）

- `docs/ssot/form/02-gap-map-and-target-direction.md`
- `docs/ssot/form/06-capability-scenario-api-support-map.md`
- `docs/next/form-p0-semantic-closure-wave-plan.md`
- `specs/155-form-api-shape/spec.md`

150 不承接：

- exact noun / import shape
- host sugar / toolkit wrapper
- examples residue
- render API / field-ui helper family
- future backlog completeness

## Registry Rule

150 相关 spec 的长期 SSoT 固定为：

- `specs/150-form-semantic-closure-group/spec-registry.json`

当前 registry 允许三类 entry：

- `member`
- `predecessor`
- `external`

- `member` status 为 `stopped` 时，只表示历史 semantic-closure member
- `predecessor` 只表示曾被当前 route 消费的已冻结 spec
- `external` 只表示当前 blocking route 需要回链的非-member owner page 或 wave route
- `archived` 不进入 150 taxonomy
- `spec-registry.json.entries[].dependsOn` 是唯一依赖顺序真相
- 新 gap / 新 proof route / 新 follow-up proposal 先在 owner 工件成形
- 只有当条目进入当前长期 route 时，才进入 `150` registry
- 新条目进入 registry 时，默认先按 `external` 回挂；若后续成为活跃语义收口对象，再升为 `member`

## Entry Classification

| entry | kind | role | why tracked in 150 |
| --- | --- | --- | --- |
| `149` | `member` | `theorem-gate` | 只收 row roster projection theorem，不混入 cleanup / presence policy |
| `151` | `member` | `semantic-closure` | 只收 active set、presence、cleanup、blocking exit 语义 |
| `154` | `member` | `shared-boundary` | 只收 Form 消费 Query-owned Resource 的边界、升级门槛与 direct-fetch 禁止项 |
| `152` | `member` | `semantic-closure` | 只收 async declaration、contributor grammar、pending/stale/blocking truth |
| `153` | `member` | `semantic-closure` | 只收 explain / reasonSlot / evidence envelope / compare feed |
| `143/144/145` | `predecessor` | `imported` | 只提供曾被 active members 消费的已冻结结果 |
| `docs/ssot/form/02` | `external` | `authority` | 只持有长期 gap authority，不代持 member tasks |
| `docs/ssot/form/06` | `external` | `proof` | 只持有 scenario proof / verification proof，不反向定义 gap |
| `docs/next/form-p0-semantic-closure-wave-plan.md` | `external` | `routing` | 只持有当前波次路由与 proof bundle |
| `155` | `external` | `proposal` | 只持有未来 Form API shape 的初始方案、负边界、reopen targets 与开放问题，不替代当前 exact authority |

## Dependency DAG

历史 active members 的 normalized DAG 曾固定为：

- `149 + 154 -> 151 -> 152 -> 153`

历史规则：

- `spec-registry.json.entries[].dependsOn` 是唯一依赖顺序真相
- `149` 提供 theorem / legality gate，给 `151` 的 cleanup / compare / repair locality 提供前提
- `154` 提供 shared boundary gate，避免 `151 / 152 / 153` 各自长第二套 remote truth
- `151` 冻结 active-set / cleanup universe，`152` 才能判断哪些 pending / blocking 仍属于 active submit truth
- `152` 冻结 contributor / submit semantics，`153` 才能把 explain / evidence / compare 收到同一 authority

## Historical Cluster Default Terminal Policy

150 当前额外固定一组 cluster-level default terminal policy。
它不替代各 member 的 authority，只提供当前默认站位，帮助 reviewer 在进入各 member 前先做粗裁决。

### 149 default terminal policy

- 继续不冻结 exact noun
- 若未来必须落 noun，第一优先仍是 `rowId`
- 不允许把 `projectionKey / localId / renderKey` 提前升成 owner noun

### 154 default terminal policy

- 先冻结 owner / boundary，不冻结 exact source noun
- 不允许 rule direct fetch
- 不允许 Form 自带第二套 remote protocol
- 不允许 React 侧第二 remote sync path

### 151 default terminal policy

- `presence policy` day-one 先只保留 `retain | drop`
- `cleanup receipt` day-one 先只进入 reason / evidence
- active-set entry / exit day-one 默认不先冻结 noun

### 152 default terminal policy

- field / list.item / list.list / root day-one 继续共用同一 contributor grammar
- `submitImpact` day-one 先只讨论 `block | observe`
- `minItems / maxItems` day-one 继续停在 list-level declaration，不长 companion object
- settlement contributor 当前受 grammar ceiling 约束：不扩 retry family、richer task lifecycle、第二 blocker taxonomy、额外 settlement summary object

### 153 default terminal policy

- path explain day-one 先不冻结 exact noun
- `evidence envelope` 继续是 authority
- `materialized report` 继续只是 on-demand view
- `reasonSlotId.subjectRef` day-one 继续只允许 `row | task | cleanup`

### Cluster-wide cuts

下面这些方向当前整个 cluster 默认直接拒绝：

- 第二 declaration carrier
- 第二 host truth
- 第二 remote protocol
- 第二 cleanup / settlement / reason taxonomy
- 第二 explain object / 第二 report truth
- 在 semantic closure 未闭环前先冻结完整 helper family

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 维护者能用单一 hub 入口调度 Form 相关 specs (Priority: P1)

作为维护者，我希望只看一个 hub spec 就知道 Form 相关 specs、前置 spec、当前 external route 与 blocking DAG 怎么关联。

**Traceability**: NS-4, KF-9

**Why this priority**: 没有长期 hub，Form 相关 spec 会重新退回分散路由与记忆式检索。

**Independent Test**: 只看 `150/spec.md + spec-registry.json`，不读 member 实现细节，也能复核分类、依赖顺序和外部 authority 路由。

**Acceptance Scenarios**:

1. **Given** 一个维护者要继续推进 Form 相关工作，**When** 他查看 hub spec，**Then** 能明确看到活跃 member、前置 spec 和外部 authority 的角色与顺序。
2. **Given** 一个新 gap / proof route / follow-up proposal 已在 owner 工件成形，**When** 对照 hub boundary，**Then** 能判断它是否该进入 registry，以及应先挂为 `external` 还是升为 `member`。

---

### User Story 2 - 实施者不会把三条 lane 重新混成大总 spec (Priority: P2)

作为实施者，我希望 active-shape、settlement、reason contract 分别由独立 member 持有，避免在一个 spec 里平推。

**Traceability**: NS-3, KF-4

**Why this priority**: lane 混写会重新长出第二套规划真相和第二套完成定义。

**Independent Test**: 对照 group spec，可以判断任一 member 的 scope 是否只覆盖单一 lane 或单一 theorem gate。

**Acceptance Scenarios**:

1. **Given** 一个 active-set cleanup 议题，**When** 实施者路由，**Then** 它进入 `151`，不会路由到 `152/153`。
2. **Given** 一个 path explain / evidence 议题，**When** 实施者路由，**Then** 它进入 `153`，不会路由到 `151/152`。

---

### User Story 3 - reviewer 能用 registry 与派生视图定位下一步入口 (Priority: P3)

作为 reviewer，我希望用 registry 与派生 checklist 快速定位当前 member 的下一步入口，同时不把 checklist 当成第二 authority。

**Traceability**: NS-10, KF-8

**Why this priority**: 语义 spec 若没有统一调度口径，很容易在验收时漂移。

**Independent Test**: reviewer 可通过 registry 状态与派生 checklist 判断哪个 member 当前需要下钻哪个入口，而不必在 150 内重复寻找 stage 真相。

**Acceptance Scenarios**:

1. **Given** `149` 仍是 `draft`，**When** reviewer 查看 registry，**Then** 能知道 `151` 不应被误判为 fully unblocked。
2. **Given** 一个 reviewer 需要继续推进某个 member，**When** 他查看 group checklist，**Then** 能拿到派生入口，并继续回到 member 自己的 `spec.md / plan.md / discussion.md`，若存在 `tasks.md` 再继续下钻。

### Edge Cases

- 某个缺口横跨多条 lane 时，优先放到“owner truth 所在 member”，其他 member 只通过 imported axiom 消费。
- 若 `149` 后续 absorbed into `151`，必须先改 group registry，再改 member 边界，不允许静默合并。
- 如果某个 future helper 只是在减少样板，不得新建 member spec，直接走 `runtime/12` intake。
- 如果是新的 form gap / form proof route / form follow-up proposal，先在 owner 工件成形；只有进入当前长期 route 时，才回挂到 `150`。
- `archived` 只表示历史背景，不进入 `150` taxonomy。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: (NS-4, KF-9) Hub MUST 将历史 Form 语义缺口分类为 `149 + 151 + 154 + 152 + 153` 五个 stopped member。
- **FR-002**: (NS-3, KF-4) Group MUST 为每个 member 固定单一角色，避免 active-shape / settlement / reason contract 混写。
- **FR-003**: (NS-4) Hub MUST 用 `spec-registry.json` 作为 Form 相关 specs、前置 spec 与外部 authority 路由的机器事实源。
- **FR-004**: (NS-4, KF-9) Group MUST 以 `spec-registry.json.entries[].dependsOn` 作为唯一依赖顺序真相；历史 normalized DAG 记录为 `149 + 154 -> 151 -> 152 -> 153`，当前实施主线转入 `155`。
- **FR-005**: (NS-3, KF-4) Group MUST 明确 `143 / 144 / 145` 是 imported predecessors，不再作为活跃 member。
- **FR-006**: (NS-10, KF-8) Hub MUST 提供从 registry 派生的 checklist 入口，而不把 checklist 变成第二 authority。
- **FR-007**: (NS-4) Any new form gap / proof route / follow-up proposal MUST first land in an owner artifact; only entries accepted into the current long-term route MAY enter `150/spec-registry.json`.

### Non-Functional Requirements (Coordination & Single Truth)

- **NFR-001**: (NS-4, KF-9) Hub MUST 不复制 member 实现细节，不形成第二套 plan/tasks 真相源。
- **NFR-002**: (NS-3) Hub MUST 让 member / predecessor / external entry 边界互斥、可路由、可审计。
- **NFR-003**: (NS-10, KF-8) Hub MUST 让状态与依赖变更先回 registry，再刷新 checklist/说明文档等派生视图。

### Key Entities _(include if feature involves data)_

- **Group Registry**: 持有 form-related entries、kind-specific status、依赖顺序与路由角色的机器事实源。
- **Member Lane**: 一个 member 对应的单一语义闭环面。
- **Imported Predecessor**: 已冻结但不再作为活跃调度对象的前置 spec。
- **External Route Entry**: 当前 blocking route 需要回链的非-member owner page 或 wave route。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: reviewer 只看 hub spec 与 registry 就能判断 Form 相关 specs 如何分类与路由。
- **SC-002**: `149 / 151 / 154 / 152 / 153` 的 scope 不再互相覆盖。
- **SC-003**: 新的 Form gap / proof route / follow-up proposal 都能先在 owner 工件成形，再按当前长期 route 需要回挂到 `150`，不再靠记忆管理。
