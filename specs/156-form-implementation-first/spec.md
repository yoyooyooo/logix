# Feature Specification: Form Implementation First

**Feature Branch**: `156-form-implementation-first`  
**Created**: 2026-04-23  
**Status**: Implemented  
**Input**: User description: "把 155 当前已经基本定型的表面 API 暂时视为阶段性固定，围绕 Form 背后的逻辑先做一个实施导向的新需求。这个需求要把功能点、范围、非目标、和 155/C007 的衔接细化清楚，避免后续实现偏离、遗漏，且允许面向未来挑战和推翻已有实现。"

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: NS-3, NS-4, NS-7, NS-8, NS-10
- **Kill Features (KF)**: KF-3, KF-8, KF-9, KF-10

## Current Role

- 本页承接 Form 进入 implementation-first 阶段后的最小必要 SSoT。
- 本页回答：在 `155` 当前表面 API 暂冻的前提下，背后逻辑优先实现的功能点、边界、非目标与验收门。
- 本页也回答：当背后逻辑闭合后，`examples/logix-react` 的 form demos 与用户文档如何沿同一条叙事主线收口。
- 本页不重写 `155` 的 public contract，也不替代现行 authority。
- 本页不把 owner / boundary / closure gate 委托给 `discussion.md`。

## Context

`155` 当前已经把 Form 的表面 API 压到阶段性平台：

- `AC3.3` 继续是唯一 implementation baseline
- `C004` 已冻结 concrete spelling
- `C004-R1` 已冻结 exact carrier taste
- `C006` 已冻结 public lexicon audit

同时，`C007` 已经把“是否继续往 kernel 下沉”收窄成 `kernel enabler / lowering ownership audit`，明确当前只允许推进：

- internal mechanism
- lowering ownership
- evidence enabler

而不允许借机重开：

- semantic owner 下沉
- declaration authority 下沉
- public noun 下沉

所以当前最合理的新需求，是停止争表面 API，把后续实施真正要做的逻辑闭环写清，避免：

- implementation 波次与 `G1 / G2 / G3 / G4` 脱节
- 把已冻结边界重新当成自由变量
- 为了补实现细节而悄悄长第二系统
- 核心实现完成后，`examples/logix-react` 与 `apps/docs/content/docs/form/*` 继续各讲各的

## Scope

### In Scope

- 把 Form implementation-first 阶段的背后逻辑工作集写成可计划、可验证、可拆波次的功能点
- 把 `155` 的 `G1 / G2 / G3 / G4` 转成实施侧 closure contract
- 明确 `source(...)` 背后的 scheduling / task substrate 需求
- 明确 `source receipt -> reason / evidence / bundle patch` 的 lowering ownership 需求
- 明确 row-heavy remap / cleanup / stale hooks 的实现需求
- 明确 runtime trial / compare / evidence feed 对 Form implementation 的支撑要求
- 明确 implementation closure 之后，`examples/logix-react` 的 form demos 如何按 `06` 的 `SC-*` 主场景矩阵、派生 `WF*` projection 与 canonical docs route 归并与重述
- 明确 examples 与用户文档的叙事边界，当前用户文档不直接暴露 demo，后续再评估可预览接入
- 明确哪些对象属于 `already frozen`、`needed enabler`、`reopen-gated`

### Out of Scope

- 重开 `155` 表面 API
- 修改 `field(path).companion({ deps, lower })` 当前 baseline
- 重开 `rule / submit / decode / blocking verdict` 的领域 owner
- exact read carrier
- exact diagnostics object
- public noun 下沉到 kernel
- raw field route 或第二 declaration carrier
- 非 form demo 的统一重写
- 在本 spec 阶段提前冻结 docs 站点的最终 IA、视觉设计或嵌入方式

## Imported Authority _(recommended)_

- [specs/155-form-api-shape/spec.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/155-form-api-shape/spec.md)
- [specs/155-form-api-shape/candidate-ac3.3.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/155-form-api-shape/candidate-ac3.3.md)
- [specs/155-form-api-shape/challenge-c007-form-api-kernel-descent.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/155-form-api-shape/challenge-c007-form-api-kernel-descent.md)
- [docs/ssot/runtime/06-form-field-kernel-boundary.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/06-form-field-kernel-boundary.md)
- [docs/ssot/form/13-exact-surface-contract.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/13-exact-surface-contract.md)
- [docs/adr/2026-04-12-field-kernel-declaration-cutover.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/adr/2026-04-12-field-kernel-declaration-cutover.md)
- [docs/adr/2026-04-05-ai-native-runtime-first-charter.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/adr/2026-04-05-ai-native-runtime-first-charter.md)

## Closure & Guardrails _(recommended for closure / cutover / hub specs)_

### Closure Contract

- 形成一份实施导向的功能点清单，覆盖 `G1 / G2 / G3 / G4`
- 每个功能点都能归到：
  - `already frozen`
  - `needed enabler`
  - `reopen-gated`
- 后续进入 `plan.md` 时，不再需要重新判断“表面 API 还动不动”
- 实施计划可直接按本页拆波次，而不会越过已冻结边界
- 当 `G1-G4` 闭合后，存在一个单独的 examples/docs alignment pass，让 examples 与用户文档共享同一条叙事主线，同时保持用户文档不直接暴露 demo

### Must Cut

- 把 “背后逻辑实现” 偷换成 “重开表面 API”
- 把 internal mechanism 下沉偷换成 semantic owner 下沉
- 把 implementation enabler 偷换成新的 public route / helper family
- 把 `already frozen` 的对象重新放回候选集
- 把历史 demo 或 docs 页面直接当成 authority，而不回链到 `06` 的 `SC-*` 主场景矩阵、派生 `WF*` projection 与事实源

### Reopen Bar

- 出现直接命中 `155` Allowed Reopen Surface 的硬失败
- 出现新的 implementation witness 证明当前 baseline 必然逼出第二系统
- 出现无法在 `G1 / G2 / G3 / G4` 内完成 evidence closure 的结构性缺口

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 实施波次不越界 (Priority: P1)

作为框架维护者，我需要一份 implementation-first 的功能点清单，让我在不继续争表面 API 的前提下，直接推进 Form 背后的逻辑实现，并确保实现不会越过已冻结边界。

**Traceability**: NS-3, NS-4, KF-3, KF-9

**Why this priority**: 这是所有后续实现的入口。如果这一层不清楚，后续 plan 和 tasks 会不断把已冻结边界带回实施阶段，导致偏离和遗漏。

**Independent Test**: 只看本页，就能明确区分哪些工作现在可做、哪些不能做、哪些必须等 reopen evidence。

**Acceptance Scenarios**:

1. **Given** 当前 `155` 已冻结 `AC3.3` 为 implementation baseline，**When** 维护者阅读本页准备拆 implementation plan，**Then** 他能明确知道表面 API 暂时不动，优先推进背后逻辑与 evidence closure。
2. **Given** 某个候选实现会改动 semantic owner 或 public noun，**When** 维护者对照本页，**Then** 能立刻判断它属于越界项，不能进入当前工作集。

---

### User Story 2 - 功能点能直接映射到 G1-G4 (Priority: P1)

作为框架维护者，我需要每个 core implementation 功能点都直接服务 `G1 / G2 / G3 / G4`，这样后续 trace、trial、compare 和 witness 都能对齐同一条主线。

**Traceability**: NS-7, NS-8, NS-10, KF-8, KF-10

**Why this priority**: 如果功能点和 `G1-G4` 脱节，实现会变成内部自由发挥，最后很难证明这条路真的支撑了 `155` 的 promotion gate。

**Independent Test**: 可以逐条检查功能点是否都能落到 `G1 / G2 / G3 / G4` 之一，没有游离项。

**Acceptance Scenarios**:

1. **Given** 一个实现候选只改善内部整洁度，**When** 对照本页功能点，**Then** 若它不能缩小 `G1-G4` 中任一 residual，就不能进入实施主线。
2. **Given** 一个实现候选属于 scheduling / evidence substrate，**When** 对照本页功能点，**Then** 它必须能落到某个明确的 gate 上，不得作为泛化优化悬空存在。

---

### User Story 3 - 支撑背后逻辑的验证闭环 (Priority: P2)

作为框架维护者，我需要这份 spec 明确 trial / compare / evidence feed 对 Form 实施的要求，这样实现完成后能直接被验证，无需再补第二轮验证设计。

**Traceability**: NS-4, NS-7, NS-8, NS-10, KF-8, KF-9, KF-10

**Why this priority**: 这能保证 implementation-first 天然带着验证闭环推进，避免只停在代码实现。

**Independent Test**: 只看本页，就能列出 implementation 完成后需要跑的 witness / compare / evidence 关注面。

**Acceptance Scenarios**:

1. **Given** 某个背后逻辑功能点完成，**When** 维护者准备验收，**Then** 可以直接从本页找到它对应的 witness / evidence closure 面。
2. **Given** 某个功能点虽然写完了代码，**When** 无法回链到 trial/compare/evidence，**Then** 本页应能将其判定为 closure 未完成。

---

### User Story 4 - examples/logix-react 与用户文档同叙事收口 (Priority: P3)

作为框架维护者，我需要在核心 implementation closure 之后，整顿 `examples/logix-react` 的 form 相关历史 demo，并让它们与用户文档的默认路径共享同一叙事骨架，这样 docs 与 examples 不会形成第二套真相源，同时保留后续评估预览接入的空间。

**Traceability**: NS-3, NS-4, NS-7, KF-3, KF-9

**Why this priority**: 核心实现闭合之后，如果 example 与 docs 继续各讲各的，后续无论是否接入可预览方案，都会重新长出第二故事线，反过来稀释 canonical route。

**Independent Test**: 只看本页，就能明确知道哪些 form demo 应保留、重写、合并或删除，以及哪些用户文档页是默认对齐面。

**Acceptance Scenarios**:

1. **Given** `G1-G4` 已完成 closure，**When** 维护者开始整理 `examples/logix-react` 的 form demos，**Then** 他能把每个 retained demo 回链到 `06` 的 `SC-*` 主场景矩阵与派生 `WF*` projection，禁止凭历史惯性保留。
2. **Given** 后续要评估文档侧示例预览，**When** 维护者对照本页，**Then** 他能知道哪些 `apps/docs/content/docs/form/*` 页面已经与 examples 共享同一叙事，无需再临时拼接第二条故事线。

### Edge Cases

- 当某个实现项同时触碰 internal mechanism 和领域语义桥时，必须明确拆分 current owner 与 proposed owner，不能混写。
- 当某个实现候选只是复述已冻结的 field-kernel 边界时，必须归类为 `already frozen`，不能重复进入 candidate ranking。
- 当某个实现项需要新的 runtime substrate，但无法指向 `G1-G4` 中任一 residual 时，必须暂缓，不得以“先做通用机制”为理由进入主线。
- 当某个实现项看起来能提升公共 API 直觉，但会改动 public noun 或 exact carrier 时，必须视为 reopen-gated。
- 当某个历史 demo 与 `06` 的 `SC-*` 主场景矩阵或派生 `WF*` projection 无法建立稳定映射时，必须进入 `rewrite / merge / remove`，不能只因“已有可运行页面”而保留。
- 当 docs 页面仍引用旧 demo 叙事或旧 API 默认路径时，必须把它视为 alignment gap，不允许 example/docs 分叉存在。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: (NS-3, KF-3) System MUST treat `AC3.3` as the sole implementation baseline for this feature and MUST NOT reopen public surface by default during implementation planning.
- **FR-002**: (NS-7, NS-8, KF-10) System MUST map every internal-enabler work item to at least one of `G1 / G2 / G3 / G4`, and MUST map every post-closure example/docs alignment item back to `06` `SC-*`, derived `WF*`, or canonical docs route, or reject it from the mainline workset.
- **FR-003**: (NS-4, KF-9) System MUST classify every candidate item into `already frozen`, `needed enabler`, or `reopen-gated`, and MUST NOT allow mixed classification.
- **FR-004**: (NS-7, NS-10, KF-8) System MUST define concrete implementation work for the scheduling/task substrate behind exact `field(path).source(...)` without reopening that declaration act.
- **FR-005**: (NS-4, NS-10, KF-8) System MUST define concrete implementation work for `source receipt -> reason / evidence / bundle patch` lowering ownership, and this work MUST stay in internal mechanism space.
- **FR-006**: (NS-4, NS-7, KF-9) System MUST define concrete implementation work for row-heavy remap / cleanup / stale hooks, and MUST bind these items to row identity / cleanup guards already frozen by authority.
- **FR-007**: (NS-3, NS-4, KF-3, KF-9) System MUST explicitly forbid semantic-owner descent, declaration-authority descent, public-noun descent, and exact-act descent within this feature scope.
- **FR-008**: (NS-7, NS-8, KF-10) System MUST define how each `needed enabler` item will be verified through runtime trial / compare / evidence closure, even if the exact commands are deferred to `plan.md`.
- **FR-009**: (NS-4, KF-9) System MUST make implementation omissions observable by requiring each work item to declare current layer, target layer, deleted objects if any, and proof trigger.
- **FR-010**: (NS-3, NS-4, KF-3) System MUST define a post-closure refresh for `examples/logix-react` form demos, and MUST classify each form demo as `retain / rewrite / merge / remove`.
- **FR-011**: (NS-4, NS-7, KF-9) System MUST ensure retained form demos are narrated by `06` `SC-*` plus derived `WF*` already proven in implementation closure, so examples do not become a second story source.
- **FR-012**: (NS-3, NS-4, KF-3) System MUST name the target user-doc surfaces for demo alignment writeback, with `apps/docs/content/docs/form/index*`, `introduction*`, `quick-start*`, and `field-arrays*` as the minimum default alignment set when docs updates are needed.

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: (NS-10, KF-8) System MUST preserve current hot-path optimization headroom while implementing new enablers, and MUST reject any proposal that introduces a second runtime truth or second diagnostics truth.
- **NFR-002**: (NS-10, KF-8) System MUST ensure all new internal enablers can produce structured evidence or hook points consumable by `runtime.trial / runtime.compare`, with deterministic identifiers.
- **NFR-003**: (NS-7, NS-8, KF-10) System MUST preserve scenario-based verification as the primary validation route and MUST NOT require component glue as a substitute for internal evidence closure.
- **NFR-004**: (NS-4, KF-9) User-facing and maintainer-facing documentation produced from this feature MUST keep the same boundary language: internal mechanism vs Form semantics vs reopen-gated items.
- **NFR-005**: (NS-3, NS-4, KF-3) This feature MUST NOT create a second declaration authority, second IR truth, or second lowering contract while refining kernel enablers.
- **NFR-006**: (NS-3, NS-4, KF-3) Example refresh and docs writeback MUST NOT create a second narrative truth distinct from `docs/ssot/**`, `06` `SC-*`, derived `WF*`, and the retained canonical route.

### Key Entities _(include if feature involves data)_

- **Residual Mechanism Enabler**: 一个尚未被实现或尚未被明确归位的 internal mechanism，对应 `G1-G4` 的某个 evidence / execution gap。
- **Lowering Ownership Link**: 从 `source receipt`、reason/evidence、bundle patch 到运行时观察面的内部归属链路。
- **Audit Classification**: 对候选实现项的三分法：`already frozen`、`needed enabler`、`reopen-gated`。
- **Proof Trigger**: 证明某个实现项有资格进入主线的触发依据，例如命中 `G1-G4` residual 或删除一层公开翻译而不引入新 authority。
- **Demo Narrative Slice**: 一个保留后的 form demo 单位，包含 route、layout/module 落点、支撑它的 `SC-*` scenario ids、派生 `WF*` families，以及需要对齐的 docs surface。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: (NS-3, KF-3) 100% 的 core internal-enabler 工作项都能明确映射到 `G1 / G2 / G3 / G4` 之一，且没有游离于这些 gate 之外的主线任务。
- **SC-002**: (NS-4, KF-9) 100% 的 core internal-enabler 工作项都被明确归类为 `already frozen`、`needed enabler` 或 `reopen-gated` 之一，且不存在混合归类。
- **SC-003**: (NS-7, NS-8, KF-10) 后续 `plan.md` 能直接基于本页拆出 implementation 波次，而不需要再次重审 public surface 是否变动。
- **SC-004**: (NS-10, KF-8) 本 feature 完成后，至少一项 `G1-G4` residual 被明确缩小，且缩小路径可由 evidence / trial / compare 解释。
- **SC-005**: (NS-4, KF-9) 本 feature 不引入任何新的 public noun、public route、declaration authority 或 semantic owner。
- **SC-006**: (NS-3, NS-4, KF-3) `examples/logix-react` 中 100% 的 retained form demos 都有明确的 `retain / rewrite / merge / remove` 结论，并回链到 `06` 的 `SC-*` 主场景矩阵与派生 `WF*` projection。
- **SC-007**: (NS-3, NS-4, KF-3) 若本 feature 触发用户文档 writeback，则最少目标 docs pages 与 retained demos 共享同一 canonical naming 与边界语言，同时保持用户文档不直接暴露 demo route。

## Adopted Implementation Outcomes

- core closure 已固定三条 internal ownership：
  - source scheduling 只沿 `field-kernel/source.impl + form/install bridge` 演进
  - submit blocking / compare feed authority 继续固定在 `$form.submitAttempt`
  - list cleanup receipt authority 继续固定在 `ui.$cleanup.<listPath>`
- `@logixjs/form.evidenceContract@v1` 已把 source ownership / submitAttempt / cleanup receipt 的 contract 显式导出，用于 trial/compare 消费，但不形成第二 truth
- `examples/logix-react` 与 docs alignment 仍作为后续单独收口波次，不反向改写上述 owner truth
