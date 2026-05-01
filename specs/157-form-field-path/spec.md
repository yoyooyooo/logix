# Feature Specification: Form Companion Formalization

**Feature Branch**: `157-form-field-path`  
**Created**: 2026-04-23  
**Status**: Implemented  
**Input**: User description: "正式实现 Form field(path).companion({ deps, lower })，并为 availability / candidates 建立最小运行时、验证闭环与 examples 覆盖"

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: NS-3, NS-4, NS-7, NS-10
- **Kill Features (KF)**: KF-3, KF-8, KF-9, KF-10

## Current Role

- 本页承接 Form `companion` 从 `155` 候选形状进入正式实现的最小必要 SSoT。
- 本页必须先回答 `companion` 的 owner、boundary、closure gate，后续才进入 `plan.md`。
- 本页不把核心 truth 委托给 `discussion.md`。

## Context

`155` 已把 Form 的下一层 API 形状收口到 `AC3.3 companion-residual-closed`，其核心判断已经稳定：

- owner split 固定为 `source / companion / rule / submit / host`
- day-one public contract 只开 `field(path).companion(...)`
- owner scope 固定为 `field-only`
- day-one slot inventory 固定为 `availability / candidates`
- hard law 冻结的是 `carrier-neutral atomic bundle semantics`；某个具体 JS 对象形状不进入 hard law

当前这条实现线已经补上首轮缺口：

- `FormDefineApi` 已承接 `field(path).companion(...)`
- companion bundle 已落到单一 internal soft-fact lane，并保持 `field-only` owner
- evidence contract artifact 已导出 companion ownership，不引入第二 truth
- `PF-08` exactness audit 已接受当前 startup-report / host-explain / row-heavy evidence floor，并把 `SC-C / SC-E / SC-F` 推到 covered baseline
- retained demo matrix 已新增 companion-specific route，并需要回链 `06` 主场景矩阵里的 `SC-C / SC-D`

当前仍保持 deferred / reopen-gated 的项目：

- exact read carrier noun
- exact `ui` landing path
- public helper noun
- companion 的 type-only public contract 已收口：`CompanionLowerContext / CompanionBundle / AvailabilityFact / CandidateSet / SourceReceipt`

因此这份 spec 的目标是把 `companion` 从候选形状推进到正式实现需求，并明确：

- 哪些 law 已经固定
- 哪些 exact noun / exact carrier 继续 deferred
- 什么算 companion 正式实现完成

## Scope

### In Scope

- 正式实现 `field(path).companion({ deps, lower })` 这条 field-owned local-soft-fact lane
- 固定 `field-only` owner scope，不重开 `list().companion` 或 `root().companion`
- 固定 day-one slot 为 `availability / candidates`
- 固定 `lower(ctx)` 的最小 authority：`value / deps / source?`
- 定义 `clear / bundle + single owner-local atomic commit` 的正式实现闭环
- 定义 companion 的 sanctioned selector-based read route 要求，但不强行冻结额外 host family
- 定义 `source -> companion -> rule -> submit` 的 diagnostics / evidence / trial closure 要求
- 定义 row-heavy proof 对 `field-only companion` 的最低证明面
- 定义 retained examples 的 companion 覆盖要求

### Out of Scope

- 重开 `source / rule / submit / host` owner split
- 重开 `list().companion`、`root().companion`
- 冻结 exact companion read carrier noun
- 冻结 exact `ui` landing path
- 增加第三个 top-level slot
- 把 companion 下沉成 kernel-owned public concept
- 为 companion 新开第二套 host hook family 或第二套 read family

## Imported Authority _(recommended)_

- [specs/155-form-api-shape/spec.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/155-form-api-shape/spec.md)
- [specs/155-form-api-shape/candidate-ac3.3.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/155-form-api-shape/candidate-ac3.3.md)
- [specs/155-form-api-shape/signoff-brief.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/155-form-api-shape/signoff-brief.md)
- [docs/ssot/form/06-capability-scenario-api-support-map.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/06-capability-scenario-api-support-map.md)
- [specs/155-form-api-shape/scenario-proof-family.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/155-form-api-shape/scenario-proof-family.md)，只作为 `06` 的 `WF* / W*` 投影视图
- [specs/156-form-implementation-first/spec.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/156-form-implementation-first/spec.md)
- [docs/ssot/form/13-exact-surface-contract.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/13-exact-surface-contract.md)
- [docs/ssot/runtime/06-form-field-kernel-boundary.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/06-form-field-kernel-boundary.md)
- [docs/standards/logix-api-next-guardrails.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/standards/logix-api-next-guardrails.md)

## Closure & Guardrails _(recommended for closure / cutover / hub specs)_

### Closure Contract

- `FormDefineApi` 正式承接 `field(path).companion(...)`
- companion 只作为 `field-only` local-soft-fact lane 存在，不复制第二 truth
- `availability / candidates` 成为当前唯一 day-one public slot inventory
- sanctioned read route 能在不暴露 raw internal landing path 的前提下消费 companion facts
- `source -> companion -> rule -> submit` 因果链可通过 diagnostics / evidence / trial 解释
- 至少一个 retained demo 覆盖 exact `field(path).companion(...)`
- row-heavy proof 仍然证明 `field-only companion` 足够，不逼出 `list/root companion`

### Implemented Outcome

- `field(path).companion({ deps, lower })` 已进入正式 Form authoring surface
- current implementation 将 bundle 写入 owner-local internal companion lane；exact landing path 不进入 spec authority
- sanctioned read route 当前按 canonical host gate 闭合：继续通过 `useModule + useSelector(handle, selectorFn)` 消费，并允许 `useSelector(handle, Form.Companion.field(path))` 与 `useSelector(handle, Form.Companion.byRowId(listPath, rowId, fieldPath))`；不新增 package helper
- startup control-plane report 已能导出 companion evidence contract artifact
- public scenario carrier 继续归 runtime verification lane；它当前不会重开 `157`
- retained demo route 已增加 `/form-field-companion`

### Must Cut

- 把 companion 吸收到 `source`、`rule`、`submit` 或 `host`
- 为了读 companion 而新增第二 host family、第二 read route、第二 diagnostics truth
- 提前重开 `list().companion`、`root().companion`
- 把 render policy / placeholder / display formatting 塞进 companion contract

### Reopen Bar

- 出现无法被 `field-only companion` 消化的 irreducible roster-level proof
- 现有 selector-based sanctioned read route 无法承接 companion facts，且会逼出 raw internal path 暴露
- `availability / candidates` 无法继续覆盖 day-one slot，需要第三 slot
- `carrier-neutral atomic bundle semantics` 无法支撑可测的 runtime / diagnostics / row-heavy proof

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 字段侧辅助信息正式可写 (Priority: P1)

作为 Form 作者，我需要在 `Form.make(..., define)` 里正式声明 `field(path).companion(...)`，这样字段侧本地辅助信息就不再停留在候选 API，而能稳定进入同一条公开 authoring 路径。

**Traceability**: NS-3, NS-4, KF-3, KF-9

**Why this priority**: 这是 companion 从 spec 进入代码的入口。如果这一层不成立，后面的 read route、proof、demo 都没有落点。

**Independent Test**: 只实现这一层，也应该能在一个最小 Form program 里声明 `field(path).companion(...)`，并看到 companion bundle 被稳定读到。

**Acceptance Scenarios**:

1. **Given** 一个字段声明了 `companion({ deps, lower })`，**When** `value / deps / source` 改变，**Then** 系统能同步生成该字段的 companion bundle。
2. **Given** `lower(ctx)` 返回 clear 语义，**When** 输入条件不再成立，**Then** 该字段 companion facts 会按单次 owner-local atomic commit 被清空。

---

### User Story 2 - companion 可解释且不越界 (Priority: P1)

作为维护者，我需要 companion 的运行时、diagnostics 与 row-heavy proof 都能解释清楚，这样 companion 不会变成第二 truth 或黑盒 local lane。

**Traceability**: NS-4, NS-7, NS-10, KF-8, KF-10

**Why this priority**: companion 一旦实现却不可解释，就会直接破坏 `155` promotion 所依赖的 diagnostics causal chain 和 field-only sufficiency。

**Independent Test**: 只实现这一层，也应该能用 row-heavy / diagnostics / trial proof 独立证明 companion 没有逼出第二 read family 或 `list/root companion`。

**Acceptance Scenarios**:

1. **Given** 一个 companion 依赖 `source?` 和本地 deps，**When** 维护者查看 diagnostics / evidence，**Then** 能解释 `source -> companion -> rule / submit` 的同一条因果链。
2. **Given** 一个 row-heavy 场景存在 reorder / replace / byRowId / cleanup，**When** companion facts 参与字段侧辅助信息，**Then** 维护者仍能证明 `field-only companion` 足够，且不需要 `list/root companion`。

---

### User Story 3 - examples 回链 SSoT 场景矩阵 (Priority: P2)

作为维护者，我需要 retained examples 里至少有一个 companion exact route demo，这样 `155` 的核心 shape 不会继续只存在于 spec，而没有 runnable proof。

**Traceability**: NS-3, NS-4, NS-7, KF-3, KF-9

**Why this priority**: 当前 examples 已经覆盖 quick-start、field source、field arrays。companion 需要补上 `SC-C / SC-D` 的 runnable route，避免 demo projection 与 SSoT 场景矩阵断链。

**Independent Test**: 只实现这一层，也应该能在 retained demo matrix 中看到一个 companion-specific route，并能映射回 `SC-C / SC-D` 与派生的 `WF1 / WF5`。

**Acceptance Scenarios**:

1. **Given** companion 已正式实现，**When** 维护者检查 retained demos，**Then** 能找到一个 companion-specific demo，无需再用 Query source 或内部 field demo 代替。
2. **Given** 维护者复核 retained demo matrix，**When** 对照 `06` 的 `SC-*` 主矩阵，**Then** companion 相关 proof 会有明确落点与说明。

### Edge Cases

- 当 `companion` 没有 `source` 输入时，`lower(ctx)` 仍然只读 `value / deps`，不自动补第二数据源。
- 当 `lower(ctx)` 只返回 `availability` 或只返回 `candidates` 时，系统仍按 single bundle 语义提交，不进入 partial merge lane。
- 当字段处于 row-heavy list item 内，reorder / replace / byRowId 不得打乱 companion owner binding。
- 当字段处于 nested list item 内，companion facts 必须写入完整 concrete row path，例如 `ui.items.0.allocations.0.dept` 对应的 owner-local lane，不得丢失外层 row index。
- 当 `source` 处于 pending / stale / error，不得把 companion 变成第二 submit truth 或第二 diagnostics truth。
- 当作者尝试在 `list()` 或 `root()` 上声明 companion 时，系统必须给出清晰拒绝，不得 silently accept。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: (NS-3, KF-3) System MUST treat `AC3.3 companion-residual-closed` as the sole implementation baseline for companion formalization.
- **FR-002**: (NS-3, NS-4, KF-3) System MUST expose `field(path).companion(...)` on the formal `FormDefineApi` field surface.
- **FR-003**: (NS-3, NS-4, KF-3) System MUST keep companion owner scope as `field-only`, and MUST NOT reopen `list().companion` or `root().companion` in this feature.
- **FR-004**: (NS-4, NS-10, KF-8) System MUST define `lower(ctx)` with the minimal authority `value / deps / source?`, and MUST keep `lower` synchronous and pure.
- **FR-005**: (NS-4, NS-10, KF-8) System MUST treat companion output as `clear | bundle`, and MUST commit companion facts as a single owner-local atomic bundle.
- **FR-006**: (NS-3, NS-4, KF-3) System MUST keep day-one slot inventory to `availability / candidates` only.
- **FR-007**: (NS-4, KF-9) System MUST provide a sanctioned selector-based read route for companion facts without requiring consumers to depend on raw internal landing paths.
- **FR-008**: (NS-4, NS-10, KF-8) System MUST keep `source -> companion -> rule -> submit` on one explainable diagnostics / evidence chain.
- **FR-009**: (NS-7, NS-10, KF-10) System MUST verify companion behavior through row-heavy, diagnostics, and trial-oriented proofes before the feature is considered closed.
- **FR-010**: (NS-3, NS-4, KF-3) System MUST add retained examples that explicitly cover `field(path).companion(...)` and map them back to the adopted `SC-*` scenario matrix plus derived `WF*` projection.

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: (NS-10, KF-8) System MUST define companion-related performance budgets on affected runtime hot paths and record a baseline before optimization decisions.
- **NFR-002**: (NS-10, KF-8) System MUST provide structured diagnostic signals for companion bundle writes, and diagnostics MUST remain near-zero overhead when disabled.
- **NFR-003**: (NS-4, NS-10, KF-8) System MUST use deterministic identifiers for companion-related evidence, including instance / reason / row-heavy attribution paths.
- **NFR-004**: (NS-4, KF-9) System MUST keep the canonical host read route on `useModule + useSelector(handle, selectorFn)` and MUST NOT introduce a second host family to consume companion facts.
- **NFR-005**: (NS-3, NS-4, KF-3) System MUST NOT create a second runtime truth, second diagnostics truth, second read family, or second lowering contract while implementing companion.
- **NFR-006**: (NS-7, KF-10) System MUST preserve row-heavy transaction safety: no IO inside transaction windows, and no React-side glue as a substitute for companion correctness.
- **NFR-007**: (NS-10, KF-8) System MUST keep `companion.lower` lightweight and synchronous; large candidate sets, remote filtering, async search, or heavy projection MUST stay in `source` / Query owner or trigger a separate reopen.

### Key Entities _(include if feature involves data)_

- **CompanionLowerContext**: `lower(ctx)` 接收的最小输入视图，只包含 `value`、显式 `deps`、以及可选 `source` receipt。
- **CompanionBundle**: 一次 field-owned companion derivation 的输出单元，语义上只允许 `clear` 或包含 `availability / candidates` 的 bundle。
- **AvailabilityFact**: 字段当前可交互性、可用性或本地 soft fact 的字段侧描述。
- **CandidateSet**: 基于字段上下文与来源事实同步降出的本地候选集合，不承接最终裁决 truth。
- **CanonicalDepValue**: `deps` tuple 的路径值推导模型；数组路径按聚合读值推导，例如 `items.warehouseId` 推为 `ReadonlyArray<string>`。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: (NS-3, KF-3) `field(path).companion(...)` 被正式纳入 Form public authoring surface，且没有新增并列 public route。
- **SC-002**: (NS-4, KF-9) 100% 的 day-one companion scenarios 都保持在 `field-only` scope 内，不需要 `list/root companion`。
- **SC-003**: (NS-7, NS-10, KF-10) 至少一组 row-heavy proof 与一组 diagnostics/trial proof 能独立证明 companion 没有引入第二 truth。
- **SC-004**: (NS-4, NS-10, KF-8) companion 因果链可以被解释为同一条 `source -> companion -> rule / submit` 链路，不得分裂成多条 truth。
- **SC-005**: (NS-3, NS-4, KF-3) retained example matrix 至少包含一条 companion-specific demo，并明确映射到 `06` 的 `SC-*` 主场景与派生 `WF*`。
- **SC-006**: (NS-4, KF-9) sanctioned read route 可以消费 companion facts，而无需用户代码直接依赖 raw internal landing path。
