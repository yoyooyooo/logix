# Feature Specification: List Row Identity Public Projection Contract

**Feature Branch**: `149-list-row-identity-public-projection`
**Created**: 2026-04-18
**Status**: Stopped
**Input**: User description: "把 `list row identity public projection contract` 收成独立 spec：冻结 proof selection dominance、row roster projection theorem、projection legality、synthetic local id residue 禁止项与 required proof set，不冻结 exact noun 或 import shape。"

## Stop Decision

2026-04-22 裁决：本 spec 停止作为独立实施主线继续推进。
后续 Form API 主线转入 [../155-form-api-shape](../155-form-api-shape/spec.md)。
本页只保留为历史语义来源；值得迁入 `155` 的要点已经汇总到 [../155-form-api-shape/proposal-149-154-carryover.md](../155-form-api-shape/proposal-149-154-carryover.md)。
任何后续实现不得继续按本 spec 单独扩展 active task、helper family 或 exact surface。

## Imported Axioms

这份 spec 自身持有 proof closure。
下面这些页面只作为 imported axioms 被消费：

- [../../docs/ssot/form/03-kernel-form-host-split.md](../../docs/ssot/form/03-kernel-form-host-split.md)
- [../../docs/ssot/form/06-capability-scenario-api-support-map.md](../../docs/ssot/form/06-capability-scenario-api-support-map.md)
- [../../docs/ssot/form/13-exact-surface-contract.md](../../docs/ssot/form/13-exact-surface-contract.md)
- [../../docs/ssot/runtime/10-react-host-projection-boundary.md](../../docs/ssot/runtime/10-react-host-projection-boundary.md)
- [../../docs/internal/toolkit-candidate-ledger.md](../../docs/internal/toolkit-candidate-ledger.md)

本 spec 直接采用下面四条 imported axioms：

1. field-kernel 持有 canonical row identity substrate。
2. Form 持有 row roster semantics 与 `byRowId` 语义入口。
3. React host 只消费 projection，不拥有第二 identity truth。
4. exact noun 与 import shape 当前仍后置。

若 imported axioms 发生变化，必须 reopen 本 spec，不允许静默漂移。

## Proof Selection Dominance

这份 spec 只回答一个选择题：

- 为什么当前先收 `list row identity public projection contract`
- 为什么当前不先收 `field-ui` 叶子合同

### Dominance Table

| candidate | authority readiness | proof maturity | live residue pressure | blocker shape | chosen winner |
| --- | --- | --- | --- | --- | --- |
| row identity | 已有 owner split、exact handle surface、proof row | 已有 rowId substrate、`byRowId`、roster projection proof | `useFormList` 仍在生成 `example-row:*` synthetic id | 缺 public projection theorem 与 legality 封口 | selected |
| field-ui | 当前只到 companion boundary，`ui: unknown` 未升格 | proof 仍停在观察值层，exact leaf 未闭合 | `useFormField` 还混着 value/error/ui/event 四层语义 | 缺 leaf contract，多 consumer proof 不足 | deferred |

### Selection Basis

row identity 当前具备四类证据：

- substrate：`trackBy / rowId / rowIdStore`
- exact handle surface：`fieldArray(...).byRowId(...)`
- proof：row roster projection theorem 已进入 scenario map
- live residue：`useFormList` 还在维护 synthetic local id

field-ui 当前只有 boundary 证据：

- `ui: unknown`
- `touched / dirty` 只是观察值
- exact leaf shape 未冻结
- helper residue 仍混着多层语义

因此这轮只选择 row identity，不重开 field-ui。

## Proof Closure

这份 spec 只持有五块内容：

1. proof selection dominance
2. owner tuple
3. row roster projection theorem
4. projection legality
5. non-goals 与 reopen bar

## Owner Tuple

当前 owner tuple 固定为：

- field-kernel：canonical row identity substrate
- Form：row roster semantics 与 `byRowId` contract
- React host：projection consumer

当前明确拒绝：

- React host 自建第二 identity
- helper 自建 render-only local id truth
- example residue 反向定义公开 contract

## Row Roster Projection Theorem

这轮只冻结一条 theorem：

- 列表渲染使用的 public projection key，必须机械回链 canonical row identity truth

更具体地说：

- `byRowId`
- `trackBy`
- rowIdStore
- render key

这四条线当前都只允许回链同一份 canonical row identity。

这不是第二 identity。
它只是同一份 row identity 在公开渲染面上的投影义务。

## Projection Legality

### Legal Projection

当前允许进入 public projection proof 的只有两类：

| kind | status | rule |
| --- | --- | --- |
| `canonicalRowId` | legal | 直接使用 canonical row identity |
| `project(listPath?, canonicalRowId)` | conditional | 只在满足 admissibility rules 时合法 |

### Admissibility Rules

若要使用 `project(listPath?, canonicalRowId)`，必须同时满足：

1. 只读取 canonical row identity 事实
2. 对可见 roster 保持稳定
3. 对可见 roster 保持一一对应
4. 保留 diagnostic backlink，能够回链原始 row identity
5. 不读取 index
6. 不读取对象引用
7. 不读取 render history
8. 不读取本地计数器

### Non-Proof Residue

下面这些对象当前都不构成 public projection proof：

| kind | status | rule |
| --- | --- | --- |
| `index -> string` fallback | residue | 只算 substrate fallback 或 proof failure |
| `example-row:*` | residue | 只算 example-local synthetic id |
| 任何无法机械回链 canonical row identity 的 id | residue | 不得进入 public projection theorem |

## Required Proof Set

这轮必须绑定下面这些 proof，缺一个都不算闭合：

1. reorder continuity
2. roster replacement under `replace`
3. `byRowId` after reorder
4. nested list path namespace
5. `trackBy` present path
6. `trackBy` missing path
7. synthetic local id rejection

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: `NS-3`, `NS-4`
- **Kill Features (KF)**: `KF-3`, `KF-9`

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 维护者冻结 row identity 的 dominance basis (Priority: P1)

作为维护者，我希望把 row identity 为什么优先于 field-ui 写成显式 dominance basis，这样 proof 选择不再靠口头判断，而能被机械复核。

**Traceability**: `NS-3`, `NS-4`, `KF-3`, `KF-9`

**Why this priority**: 若 selection basis 不显式化，后续 reopen 很容易重新把 field-ui 拉回同一层。

**Independent Test**: 只阅读本 spec 与 imported axioms，不看实现代码，也能复核为什么当前先做 row identity。

**Acceptance Scenarios**:

1. **Given** 一个要在 row identity 与 field-ui 之间二选一的维护者，**When** 对照本 spec，**Then** 能按 dominance table 复核选择结果。
2. **Given** 一个想直接升完整 `useFormList` helper 的方案，**When** 对照本 spec，**Then** 能知道必须先关掉 projection legality 与 residue 问题。

---

### User Story 2 - Agent 理解 row roster projection theorem (Priority: P2)

作为 Agent，我希望清楚 render key 只能来自 canonical row identity 或合法投影，这样我不会把 render-only synthetic id 误学成公开真相。

**Traceability**: `NS-3`, `KF-3`

**Why this priority**: 只要这个 theorem 不够精确，local synthetic id 就会不断回流。

**Independent Test**: 只凭本 spec，Agent 就能判定一个 id 是否能进入 public projection proof。

**Acceptance Scenarios**:

1. **Given** 一个 reorder 后继续渲染列表的场景，**When** Agent 查看本 spec，**Then** 能知道 render key 必须保持 row-level continuity。
2. **Given** 一个 `trackBy` 缺失的场景，**When** Agent 查看本 spec，**Then** 能知道 index-string fallback 不能充当 public proof。

---

### User Story 3 - 后续 landing 保持最小闭包 (Priority: P3)

作为维护者，我希望这份 spec 只冻结 theorem、legality、required proof set 与 non-goals，不抢跑 exact noun 或 import shape，这样后续 landing 波次可以先做最小公开投影。

**Traceability**: `NS-4`, `KF-9`

**Why this priority**: 当前证据足够冻结 theorem，不足以直接冻结 helper surface。

**Independent Test**: 只看 spec，就能判断这轮成功标准在于“关掉第二 identity 与 render-only id 路线”，而不在于“选定最终 API 名字”。

**Acceptance Scenarios**:

1. **Given** 一个 future landing plan，**When** 维护者对照本 spec，**Then** 能知道这轮不要求 exact noun 或 import shape 落盘。
2. **Given** 一个试图把完整 `useFormList` binder 一起推进的方案，**When** 维护者对照本 spec，**Then** 能知道它越过了当前冻结边界。

### Edge Cases

- reorder 后 render key 不能退回 index。
- `replace` 是 roster replacement，不做隐式 identity 猜测。
- `byRowId(rowId)` 在 reorder 后仍必须命中同一条 canonical row identity。
- `trackBy` 存在时，projection 只能消费 canonical row identity truth。
- `trackBy` 缺失且 rowIdStore 不可用时，fallback 只算 residue 或 proof failure。
- nested list 场景里，projection 必须继续保留 listPath 语义。
- example-local `example-row:*` 只算 residue。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: (NS-3, KF-3) 系统 MUST 以显式 dominance basis 说明为什么当前先收 row identity，而不先收 field-ui。
- **FR-002**: (NS-3, KF-3) 系统 MUST 固定 row roster projection 不是第二 identity，而是 canonical row identity 的公开投影义务。
- **FR-003**: (NS-3) 系统 MUST 固定 `byRowId`、`trackBy`、rowIdStore、render key 当前都只允许回链同一条 canonical row identity 主线。
- **FR-004**: (NS-3) 系统 MUST 固定任何无法机械回链 canonical row identity 的 id，都不得进入 public projection proof。
- **FR-005**: (NS-3) 系统 MUST 固定 index-string fallback 与 `example-row:*` 只算 residue 或 proof failure。
- **FR-006**: (NS-3) 系统 MUST 对合法 projection 冻结 admissibility rules。
- **FR-007**: (NS-4, KF-9) 系统 MUST 明确当前不冻结 exact noun、import shape、完整 `useFormList` helper family 或 render-only binder object。
- **FR-008**: (NS-4, KF-9) 系统 MUST 把这轮成功标准固定为“冻结 dominance basis、row roster projection theorem、projection legality、required proof set 与 non-goals”。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: (NS-3) 当前方案 MUST 保持单一 row identity truth，不得长出 render-only second identity。
- **NFR-002**: (NS-3, KF-3) 当前方案 MUST 让 Agent 能机械判定一个 id 是否属于 public projection proof。
- **NFR-003**: (NS-3) 当前方案 MUST 保持可诊断性：若使用 projection，必须保留 diagnostic backlink，能够回链 canonical row identity。
- **NFR-004**: (NS-4, KF-9) 当前方案 MUST 保持后续可收缩和可重开：在没有新增 live-residue 证据前，不提前承诺 exact noun 或 import shape。

### Key Entities _(include if feature involves data)_

- **Canonical Row Identity**: field-kernel 持有的 row-level identity substrate。
- **Row Roster Projection**: 公开渲染面上的连续性 theorem；它不是第二 identity。
- **Lawful Projection**: 满足 admissibility rules 的 `project(listPath?, canonicalRowId)`。
- **Residue-Only Local Id**: 不能机械回链 canonical row identity 的本地 id。

## Non-Goals

- 不冻结 exact noun
- 不冻结 import shape
- 不冻结完整 `useFormList` helper family
- 不把 internal fallback 直接升成公开 proof
- 不顺手重开 field-ui 叶子合同

## Reopen Bar

后续只有在同时满足下面条件时，才允许继续重开：

1. 不引入第二 identity truth
2. 不把 residue fallback 升成 proof
3. exact noun 能直接回链本 spec 的 theorem 与 legality
4. 有完整 required proof set 支撑

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: (NS-3, KF-3) 维护者只读本 spec，即可按 dominance basis 复核为什么当前先收 row identity。
- **SC-002**: (NS-3) Agent 只凭本 spec，就能判定某个 render key 是否属于 public projection proof。
- **SC-003**: (NS-3) 这轮结论不要求冻结 exact noun 或 import shape，也不会因为缺少它们而留下 theorem 歧义。
- **SC-004**: (NS-4) 任何后续实现或 proposal 若把 render-only synthetic id、index-string fallback、完整 `useFormList` helper family 或第二 identity 带回当前 contract，都能被本 spec 明确判为越界。
