# Form API Shape Initial Scheme Review Ledger

## Meta

- target: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/155-form-api-shape/spec.md`
- source_kind: `file-spec`
- reviewers: `A1/A2/A3/A4`
- round_count: `29`
- challenge_scope: `open`
- consensus_status: `plateau`

## Bootstrap

- target_complete: `true`
- challenge_scope: `open`
- reviewer_set: `A1/A2/A3/A4`
- active_advisors: `none`
- activation_reason: `open scope + public contract + long-term API governance`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan / Kolmogorov / Godel`
- dominance_axes: `concept-count / public-surface / compat-budget / migration-cost / proof-strength / future-headroom`
- stop_rule: `只有通过 Ramanujan / Kolmogorov / Godel gate 且在 dominance axes 上形成严格改进的 proposal 才允许 reopen`
- plateau_rule: `只有当连续多轮 reviewer 都无法提出在 dominance axes 上继续抬分的更优候选，或新候选只与 adopted candidate 持平且不增加 proof-strength 时，才允许停止`
- iteration_rule: `每轮若形成无模糊共识，必须先把共识候选写入 spec / discussion / ledger，再作为下一轮唯一评估基线`
- replacement_rule: `只有当某一轮出现“无歧义且更强”的候选，才允许替换当前基线；若只有分歧而无更强共识，则保留旧基线继续下一轮`
- reopen_bar: `必须给出比当前 adopted candidate 更小、更稳或 proof-strength 更强的严格证据`
- ledger_path: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-22-form-api-shape-optimality-loop.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `specs/155-form-api-shape/spec.md` 是本轮唯一目标工件，`discussion.md` 只作为 companion artifact 参与 review
  - status: `kept`
  - resolution_basis: `用户明确要求打磨未冻结 API 设计；本轮只审计划工件，不开始实现`
- A2:
  - summary: `challenge_scope=open`，允许 reviewer 挑战目标函数、边界和既有 proposal，不把当前 spec 当不可挑战前提
  - status: `kept`
  - resolution_basis: `用户明确要求大胆一点，挑战已有一切现状，面向未来规划`
- A3:
  - summary: `fieldValue(path)` 已被视为 future read-route cutover 的候选断点，应接受 reviewer 继续挑战其读侧 contract 是否足够
  - status: `overturned`
  - resolution_basis: `reviewers 一致认为 155 只能把它记为 reopen target，而不能提前写成已执行 cut`
- A4:
  - summary: local coordination layer 必须与 `source` 分家，且组件侧不得成为 canonical owner
  - status: `merged`
  - resolution_basis: `reviewers 保留“与 source 分家、组件不做 canonical owner”这组边界，但否决了“因此必有新 public primitive”的推论`

## Round 1

### Phase

- challenge

### Input Residual

- none

### Findings

- F1 `critical` `invalidity`:
  - summary: `155` 以 MUST 级语言提前重写 future exact surface，形成 shadow authority
  - evidence: `A1/A2/A3` 交集；当前 authority 仍冻结 `fieldValue` 和 surviving DSL path，`155` 只能作为 external proposal
  - status: `adopted`
- F2 `critical` `invalidity`:
  - summary: 当前 spec 预设必须存在新的 local coordination public primitive，导致讨论过早滑向 noun / placement
  - evidence: `A1/A3/A4` 交集；这违反 strict-dominance reopen bar
  - status: `adopted`
- F3 `high` `ambiguity`:
  - summary: `local coordination layer / availability fact / companion projection slot / landing page` 概念分裂，概念账本过厚
  - evidence: `A1/A2` 交集
  - status: `adopted`
- F4 `high` `controversy`:
  - summary: success criteria 过度奖励“同一 coherent surface family”，未采用更小 route matrix 与 dominance evidence
  - evidence: `A3/A4` 交集
  - status: `adopted`

### Counter Proposals

- P1:
  - summary: `boundary-only / delta-only / proof-first proposal`
  - why_better: 把 `155` 压回 external proposal 的正确角色，删除 shadow authority 风险
  - overturns_assumptions: `A3`
  - resolves_findings: `F1 F3 F4`
  - supersedes_proposals: `none`
  - dominance: `dominates`
  - axis_scores: `concept-count +3 / public-surface +3 / compat-budget +2 / migration-cost +3 / proof-strength +2 / future-headroom +1`
- P2:
  - summary: `零新增 Form 公共 surface` 先验
  - why_better: 先证伪最小路线，再讨论新 primitive，更符合用户要的大胆但不平庸的目标函数
  - overturns_assumptions: `A4`
  - resolves_findings: `F2 F4`
  - supersedes_proposals: `none`
  - dominance: `dominates`
  - axis_scores: `concept-count +2 / public-surface +2 / compat-budget +1 / migration-cost +1 / proof-strength +2 / future-headroom +1`
- P3:
  - summary: `routing-first proof matrix`
  - why_better: 复杂 proof 先分类到现有 exact surface / QueryProgram / Program-Module internal logic，再决定是否真缺 primitive
  - overturns_assumptions: `A4`
  - resolves_findings: `F2 F4`
  - supersedes_proposals: `none`
  - dominance: `dominates`
  - axis_scores: `concept-count +1 / public-surface +2 / compat-budget +1 / migration-cost +1 / proof-strength +2 / future-headroom +2`

### Resolution Delta

- `A3 -> overturned`
- `A4 -> merged`
- `F1 F2 F3 F4 -> adopted`
- `P1 P2 P3 -> adopted lineage`

## Adoption

- adopted_candidate: `AC1 boundary-only + zero-new-public-surface + routing-first proof matrix`
- lineage: `P1 + P2 + P3`
- rejected_alternatives: `standalone watch/computed family as current primary search space`
- rejection_reason: `未通过 strict-dominance reopen bar；先承认新 public primitive 会过早增加公理和公开面`
- dominance_verdict: `current 155 baseline is dominated`

### Freeze Record

- adopted_summary: `155 只保留 imported frozen axioms、负边界、route matrix、reopen targets、required proof/evidence；不再提前声明未来 exact surface 必然新增 local coordination family`
- kernel_verdict: `通过 Ramanujan / Kolmogorov / Godel 三重 gate；比 baseline 更小、更少重复、且不引入第二 authority`
- frozen_decisions:
  - `155` 是 external proposal，不承接 future exact authority
  - `fieldValue(path)` 只作为 reopen target 记录，不在 155 内被写成已执行 cut
  - `source` 继续只承接 Query-owned remote fact
  - 组件侧 glue 继续被拒绝为 canonical route
  - local coordination workload 的存在被承认，但“因此必有新 public primitive”不再被预设
  - 复杂 proof 必须先走 route matrix：`existing exact surface / QueryProgram / Program-Module internal logic`
- non_goals:
  - 预先冻结 `watch` / `computed` 命名
  - 预先冻结 `$form.companion` landing page
  - 预先冻结 `field / list / root / submit` 就是不可再压缩的最小生成集
- allowed_reopen_surface:
  - 零新增 public surface 路线被 irreducible proof 证伪
  - owner-attached primitive 是否足够
  - 若必须新增 primitive，它删除什么旧 route
- proof_obligations:
  - 给出不可再压缩的复杂 proof
  - 给出 strict-dominance 轴评分
  - 证明不引入第二 declaration carrier / 第二 host truth / 第二 remote truth
  - 给出 row-heavy perf 与 diagnostics 不劣证据
- delta_from_previous_round: `从“未来 exact surface 初始方案 spec”压回“boundary-only / proof-first proposal”`

## Round 2

### Phase

- converge

### Input Residual

- adopted freeze record `AC1 boundary-only + zero-new-public-surface + routing-first proof matrix`

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- all residual findings `closed`

## Consensus

- reviewers: `A1/A2/A3/A4`
- adopted_candidate: `AC1 boundary-only + zero-new-public-surface + routing-first proof matrix`
- final_status: `consensus reached`
- stop_rule_satisfied: `true`
- residual_risk: `真实的 row-heavy irreducible proof 仍可能最终逼出一个 primitive；但在 strict-dominance 证据出现前，不应再围绕 noun / placement 扩 scope`

## Main-Agent Post-Consensus Synthesis

- user_correction: `用户要的是最终 API 候选，不是只退回边界`
- synthesis_candidate: `field().choices(...)`
- rationale:
  - generic `watch / computed` 被 reviewers 正确否决
  - 零新增 surface 无法给出可操作的最终 API 候选
  - 当前最强 proof 是跨行互斥 select options
  - `choices` 直接承接 selectable field 的 choice read model，避免公开 generic local coordination family
- freeze_delta:
  - `choices` 是 owner-attached field primitive
  - `source` 继续只承接 Query-owned remote fact
  - `choices` 产物进入 existing `ui` tree
  - `rule` 继续承接跨行互斥的硬门禁
  - `disable / hide` 留给 host policy，core 只产 `availability`
- remaining_gate:
  - row-heavy perf baseline
  - nested list row identity proof
  - `ui` landing page exact shape
  - `source(name, ...)` 与 `choices.source` 的去重裁决

## Round 3

### Phase

- challenge

### Input Residual

- user correction: `choices` 过于贴当前 select proof，希望打磨出更强、非单点、但也不退回机制 noun 的最终 API
- current synthesized candidate: `field().choices(...)`

### Findings

- F5 `critical` `invalidity`:
  - summary: `field().choices(...)` 过度贴合 select proof，不能作为最终 noun
  - evidence: `A1/A2/A3/A4` 交集；均指出 `choices` 会诱发 `options / suggestions / lookup` 平行 noun
  - status: `adopted`
- F6 `critical` `invalidity`:
  - summary: `choices({ source: ... })` 复制既有 `field().source(...)` grammar
  - evidence: `A1/A2/A3` 交集；均指出 source 已有 owner，不能内联第二套 remote declaration
  - status: `adopted`
- F7 `high` `controversy`:
  - summary: `domain / valueDomain` 过宽，会与 schema / rule / submit gate 抢 authority
  - evidence: `A1/A2/A3/A4` converge 交集
  - status: `adopted`

### Counter Proposals

- P4:
  - summary: `field().candidates(...)`
  - why_better: 命中“离散候选值集合”这个稳定事实对象，覆盖 select/radio/autocomplete/lookup suggestion/entity picker，避免继续长平行 noun
  - overturns_assumptions: `choices is enough`
  - resolves_findings: `F5 F6 F7`
  - supersedes_proposals: `field().choices(...)`
  - dominance: `dominates`
  - axis_scores: `concept-count +2 / public-surface +2 / compat-budget +1 / migration-cost +1 / proof-strength +3 / future-headroom +3`
- P5:
  - summary: `single-source candidates model`
  - why_better: 去掉 `from / named source` 引用协议，隐式消费同一 field 的唯一 `source` receipt
  - overturns_assumptions: `candidates needs from`
  - resolves_findings: `F6`
  - supersedes_proposals: `candidates({ from })`
  - dominance: `dominates`
  - axis_scores: `concept-count +2 / public-surface +2 / compat-budget +1 / migration-cost +1 / proof-strength +1 / future-headroom 0`

### Resolution Delta

- `field().choices(...) -> rejected`
- `field().candidates(...) -> adopted candidate`
- `named source / from -> rejected until multi-source proof exists`

## Round 4

### Phase

- converge

### Input Residual

- residual 1: `candidates` 是否被 `domain / valueDomain` 支配
- residual 2: `candidates` 是否必须引入 named source / `from`

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- all residual findings `closed`

## Final Adoption

- adopted_candidate: `AC2.1 field().source(...) + field().candidates(...) single-source model`
- lineage: `P4 + P5 + plateau refinement`
- rejected_alternatives:
  - `field().choices(...)`
  - `field().domain(...)`
  - `field().valueDomain(...)`
  - `field().options(...)`
  - `field().lookup(...)`
  - `candidates({ from })`
- rejection_reason: `全部在 concept-count / public-surface / proof-strength / future-headroom 中至少一项被 candidates single-source model 支配`
- dominance_verdict: `AC2 dominates AC1's post-consensus choices candidate; AC2.1 strictly refines AC2 by deleting repeated path grammar`

### Final Freeze Record

- adopted_summary: `离散候选值集合用 field().candidates(...) 表达；远程事实仍由 field().source(...) 表达；candidates 隐式消费同一 field 的唯一 source receipt；exclusiveInList 默认当前 field path；keepCurrent 是 candidate set materialization policy`
- frozen_decisions:
  - generic `watch / computed` 不进入 exact surface
  - `choices` 退出主候选
  - `candidates` 成为当前最强 candidate noun
  - `domain / valueDomain` 过宽，当前拒绝
  - named source / `from` 当前拒绝
  - `exclusiveInList.path` 当前拒绝
  - `keepCurrent` 放在 `candidates` 顶层
  - host 仍只消费 `availability`，自行映射 `disable / hide / mark`
- remaining_reopen_surface:
  - 单字段多路独立 remote candidate feed
  - 无 remote source 的本地 candidate universe 是否高频到值得开放 `items` arm
  - `ui` tree landing page exact shape
- plateau_refinement:
  - A3 找到 AC2.1：删除 `exclusiveInList.path`，将 `keepCurrent` 从 availability law 移到 `candidates` 顶层
  - axis_scores: `concept-count +1 / public-surface +1 / compat-budget +1 / migration-cost 0 / proof-strength +2 / future-headroom +1`
- plateau_evidence:
  - A1/A2/A3/A4 均未发现 `candidates` 被 `domain / valueDomain` 或其他 noun 支配
  - A1/A2/A3/A4 均建议不引入 named source / `from`

## Round 5

### Phase

- converge

### Input Residual

- residual 1: `candidates` 是否被 `domain / valueDomain` 直接支配
- residual 2: `candidates` 是否必须依赖 named source / `from`

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- `candidates -> kept`
- `domain / valueDomain -> rejected`
- `named source / from -> rejected`

## Round 6

### Phase

- converge

### Input Residual

- residual: `AC2.1` 是否仍被 `AC2.2` 严格支配

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- `AC2.2 -> rejected as non-dominating refinement`
- `AC2.1 -> kept as baseline`

## Final Consensus

- reviewers: `A1/A2/A3/A4`
- adopted_candidate: `AC2.1 field().source(...) + field().candidates(...) single-source model`
- final_status: `consensus reached at plateau`
- plateau_rule_satisfied: `true`
- residual_risk:
  - 若后续出现单字段必须组合多路独立 remote candidate feed 的 irreducible proof，需重开 `from` 或更高层 route
  - 若后续出现无 remote source 的本地 candidate universe 成为高频 day-one proof，需重开 `items` arm 或更高层 route
  - 若后续 `autocomplete / suggestion` 需要超出 `project: { value, label }` 的稳定公共投影，重开点应落在 `project` 形状，不应先动 noun

## Round 7

### Phase

- challenge

### Input Residual

- user correction: `AC2.1` 仍然只是针对“多行互斥 select”场景的 overfit candidate，不接受其作为任意复杂 ToB 表单的通用 API 形状
- current baseline to challenge: `AC2.1 field().source(...) + field().candidates(...) single-source model`

### Findings

- F8 `critical` `invalidity`:
  - summary: `AC2.1` 仍是 leaf proof noun，无法作为任意复杂 ToB 表单的总骨架
  - evidence: `A1/A2/A3/A4` 一致指出 `candidates` 仍过拟合 select-like proof
  - status: `adopted`
- F9 `critical` `invalidity`:
  - summary: `AC2.1` 缺少稳定的本地协调 lane，后续只会继续长 sibling nouns 或退回 source/component glue
  - evidence: `A2/A3/A4` 交集
  - status: `adopted`

### Counter Proposals

- P6:
  - summary: `AC3 owner-attached companion / interaction skeleton`
  - why_better: 把 API 从 leaf proof noun 提升为可覆盖任意复杂 ToB 表单的 owner-attached fact skeleton
  - overturns_assumptions: `AC2.1 can be the final general API`
  - resolves_findings: `F8 F9`
  - supersedes_proposals: `AC2.1`
  - dominance: `dominates`
  - axis_scores: `concept-count +2 / public-surface +1 / compat-budget +1 / migration-cost +1 / proof-strength +4 / future-headroom +4`

### Resolution Delta

- user explicitly rejects `AC2.1` as final candidate
- `AC3 -> adopted as new baseline`

## Round 8

### Phase

- converge

### Input Residual

- residual 1: `companion` vs `interaction`
- residual 2: minimal slot inventory
- residual 3: landing shape

### Findings

- pending reviewer results

### Counter Proposals

- pending reviewer results

### Resolution Delta

- baseline switched to AC3

## Round 9

### Phase

- converge

### Input Residual

- residual 1: canonical noun `companion` vs `interaction`
- residual 2: day-one public contract `field-only` vs `field/list/root`
- residual 3: landing shape

### Findings

- canonical noun 已收平到 `companion`
- day-one public contract 已收平到 `field-only`
- landing shape 仍存在分歧：`owner-local $companion leaf` vs `global companion namespace`

### Counter Proposals

- `LP-A`: `state.ui.$companion.field.<path>`
- `LP-B`: `state.ui.<ownerPath>.$companion`

### Resolution Delta

- `companion -> adopted`
- `field-only -> adopted`
- landing unresolved, continue iterate

## Round 10

### Phase

- converge

### Input Residual

- landing residual: `ui.$companion...` namespace vs owner-local reserved leaf vs global owner registry

### Findings

- `LP2.1 owner-local reserved leaf principle -> adopted`

### Counter Proposals

- `LP1`: `state.ui.$companion.byOwner[ownerRef]`
- `LP2.1`: owner-local reserved leaf in existing `ui` tree, path encoding deferred
- `LP3`: `state.ui.$companion.field.<path>`

### Resolution Delta

- `LP2.1 -> adopted`
- `LP1 -> rejected`
- `LP3 -> rejected`

## AC3.1 Platform

- adopted_candidate: `AC3.1 companion-only skeleton`
- canonical_noun: `companion`
- day_one_public_contract: `field().companion(...)`
- day_one_slot_inventory: `availability`, `candidates`
- landing_principle: `owner-local reserved leaf in existing ui tree; exact path encoding deferred`
- lineage:
  - `AC2.1 field().source(...) + field().candidates(...)`
  - `AC3 owner-attached companion/interaction skeleton`
  - `AC3.1 companion-only skeleton`
- rejected_alternatives:
  - `choices`
  - `domain`
  - `valueDomain`
  - `options`
  - `lookup`
  - `watch/computed` public family
  - `interaction` public noun
  - `field/list/root` all-open companion family
  - `ui.$companion...` global namespace
  - `ui.$companion.byOwner[ownerRef]`
- plateau_status: `current strongest platform`
- residual_risk:
  - `field().companion` 是否足以承接未来 list/root irreducible proof
  - owner-local reserved leaf 的具体 path encoding 仍需后续 authority reopen 冻结
  - slot inventory 是否需要超出 `availability/candidates` 仍需 proof

## Round 11

### Phase

- challenge

### Input Residual

- residual 1: `field().companion` minimal contract can still be compressed
- residual 2: `availability / candidates` slot vocabulary can still be compressed or generalized

### Findings

- pending reviewer results

### Counter Proposals

- pending reviewer results

### Resolution Delta

- baseline `AC3.1 companion-only skeleton`

## Round 12

### Phase

- converge

### Input Residual

- residual 1: callback naming `lower` vs `facts`
- residual 2: ctx shape `value/deps/source` vs `value/deps/source/row/list/active`
- residual 3: sealed direct-slot object vs single-slot declaration

### Findings

- `A > B > C`
- `lower -> adopted`
- `value/deps/source -> adopted`
- `sealed direct-slot object -> adopted`

### Counter Proposals

- `A`: sealed direct-slot object + `lower(ctx: { value, deps, source? })`
- `B`: sealed direct-slot object + `facts(ctx: { value, deps, source?, row?, list? })`
- `C`: single-slot declaration `companion(slot, declaration)`

### Resolution Delta

- `AC3.2 -> adopted`
- `facts -> rejected`
- `row/list/active public ctx -> rejected`
- `single-slot declaration -> rejected`

## Round 13

### Phase

- converge

### Input Residual

- residual: single-slot declaration dissent against sealed direct-slot object

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- sealed direct-slot object accepted
- dissent resolved after adding guardrails:
  - only `availability` and `candidates` allowed
  - no third slot without irreducible proof
  - no custom slot registry
  - no slot selector family
  - no repeated `companion(...)` merge rules
  - one sealed object returns both slots only for atomic consistency and single-point diagnostics

## Round 14

### Phase

- close-residuals

### Input Residual

- residual: `field().companion` 是否足以承接复杂 list proof
- residual: owner-local reserved leaf 的 exact path encoding 是否需要现在冻结
- residual: slot inventory 是否需要超出 `availability/candidates`
- residual: 当前公开 contract 是否需要额外实现不变量来完成 closure

### Findings

- none

### Counter Proposals

- D0:
  - summary: `defer-exact-encoding`
  - why_better: 不新增 path grammar，却把 landing 的非公开边界写实，提升 proof-strength
  - overturns_assumptions: `none`
  - resolves_findings: `none`
  - supersedes_proposals: `none`
  - dominance: `dominates residual ambiguity`
  - axis_scores: `concept-count +1 / public-surface +1 / compat-budget +2 / migration-cost +2 / proof-strength +2 / future-headroom +2`
- G0:
  - summary: `field-only sufficiency + list/root reopen bar`
  - why_better: 继续保持最小 owner family，同时把 reopen 条件写死
  - overturns_assumptions: `none`
  - resolves_findings: `none`
  - supersedes_proposals: `none`
  - dominance: `dominates residual ambiguity`
  - axis_scores: `concept-count +1 / public-surface +1 / compat-budget +1 / migration-cost +1 / proof-strength +2 / future-headroom +1`
- S0:
  - summary: `slot reduction law`
  - why_better: 明确复杂 proof 先归约到 `availability`、`candidates` 或既有 owner，堵住第三 slot 的早放行
  - overturns_assumptions: `none`
  - resolves_findings: `none`
  - supersedes_proposals: `none`
  - dominance: `dominates residual ambiguity`
  - axis_scores: `concept-count +1 / public-surface +1 / compat-budget +1 / migration-cost +1 / proof-strength +2 / future-headroom +1`
- I0:
  - summary: `runtime invariants for companion lowering`
  - why_better: 不增加公开面，却让 transaction、cleanup、diagnostics 的解释链闭合
  - overturns_assumptions: `none`
  - resolves_findings: `none`
  - supersedes_proposals: `none`
  - dominance: `dominates residual ambiguity`
  - axis_scores: `concept-count +0 / public-surface +0 / compat-budget +1 / migration-cost +1 / proof-strength +2 / future-headroom +1`

### Resolution Delta

- `AC3.2 + D0 + G0 + S0 + I0 -> AC3.3`
- `field-only sufficiency -> accepted`
- `exact path encoding remains deferred -> accepted`
- `third top-level slot absent -> accepted`
- `runtime invariants + bundle-clear semantics -> accepted`

## Current Platform

- adopted_candidate: `AC3.3 companion-residual-closed`
- candidate_doc: `specs/155-form-api-shape/candidate-ac3.3.md`
- canonical_noun: `companion`
- core_interpretation: `field-owned local fact 的 lifecycle + module-state flow contract`
- day_one_public_contract: `field().companion(...)`
- day_one_owner_scope: `field-only`
- day_one_slot_inventory: `availability`, `candidates`
- callback_name: `lower`
- ctx_shape: `value`, `deps`, `source?`
- contract_shape: `sealed direct-slot object`
- landing_principle: `owner-local reserved leaf in existing ui tree; exact path encoding deferred`
- landing_non_freeze:
  - exact `ui` leaf spelling
  - row capsule / row-local path grammar
  - companion selector path
  - diagnostics internal path exposure
- stable_semantic_identity:
  - `owner field path`
  - `slot`
- runtime_invariants:
  - `deps` is the only explicit dependency authority; `value` is implicit
  - `source?` can only come from the same field's current source receipt
  - `lower` is sync, pure, and IO-free
  - `undefined` clears the field companion bundle
  - writeback only lands in owner-local reserved `ui` leaf
  - `availability/candidates` patch atomically in one bundle
  - aux `ui/errors` changes do not trigger companion recompute
  - row cleanup follows owner lifecycle and row identity
- guardrails:
  - top-level slot vocabulary only `availability` and `candidates`
  - no third slot without irreducible proof
  - no custom slot registry
  - no slot selector family
  - no repeated companion declaration merge rules
  - public ctx only `value / deps / source?`
  - no `list().companion` or `root().companion` without irreducible proof
- lineage:
  - `AC2.1 field().source(...) + field().candidates(...)`
  - `AC3 owner-attached companion/interaction skeleton`
  - `AC3.1 companion-only skeleton`
  - `AC3.2 companion-tightened ctx`
  - `AC3.3 companion-residual-closed`
- rejected_alternatives:
  - `choices`
  - `domain`
  - `valueDomain`
  - `options`
  - `lookup`
  - `watch/computed` public family
  - `interaction` public noun
  - `field/list/root` all-open companion family
  - `facts(...)`
  - `companion(slot, declaration)`
  - public `row/list/active` ctx
  - exact `ui` path encoding as current public contract
  - third top-level companion slot without reduction failure
- plateau_status: `current strongest platform; plateau re-confirmed after S1/S2/C003 subfreezes`
- residual_risk:
  - bundle-level proof 仍需更强 trace 证据
  - 不可分解的 roster-level soft fact proof 仍未出现
  - `byRowId` family 是否足以安全承接 exact carrier，仍待更强 proof

## Round 15

### Phase

- plateau-check

### Input Residual

- residual: `AC3.3` 回写后，是否还存在严格更优候选

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- `AC3.3 plateau -> confirmed`
- no strictly better candidate from field-owner, landing, slot, total-skeleton, or runtime/perf viewpoints
- reopen triggers consolidated:
  - sanctioned companion read route
  - list/root-level irreducible soft slice
  - third slot only after reduction failure
  - per-slot deps or source divergence with measurable cost
- artifact split follow-up:
  - `spec.md` holds principles, rejections, gates, workflow
  - `discussion.md` holds challenge queue and lineage
  - `candidate-ac3.3.md` holds active candidate narrative

## Round 16

### Phase

- plateau-recheck

### Input Residual

- residual: after S1/S2/C003 subfreezes, does any strictly better main candidate remain

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- `AC3.3 after S1/S2/C003 subfreezes -> plateau re-confirmed`
- no strictly better main candidate after absorbing:
  - `S1.1 selector-only, helper-deferred sanctioned law`
  - `S1-R1.1 owner-first slot projection law`
  - `S1-R2.1 row-heavy carrier admissibility law`
  - `S1-R3.1 evidence-envelope host backlink law`
  - `S1-R4.1 exact carrier deferred, byRowId-first reopen bias, no half-freeze`
  - `S2.1 no irreducible owner-scope proof`
  - `C003.1 evidence-envelope derivation-link causal-chain law`
  - `C003-R1.1 exact diagnostics object deferred, no second-system shape`
- main reopen triggers tightened to:
  - stronger bundle-level proof around `derivationReceiptRef / bundlePatchRef`
  - irreducible roster-level soft fact proof
  - exact carrier only if `byRowId`-first reuse proves strictly better

## Round 17

### Phase

- top-level-direction-scan

### Input Residual

- residual: whether new AC4 top-level directions can strictly dominate AC3.3

### Findings

- none that replace AC3.3

### Counter Proposals

- parked:
  - `AC4.1 field-fact-lane`
  - `AC4.2 field capability block`
  - `AC4.3 no-public-companion-program-lowered`
- rejected:
  - `policy-slice`
  - `owner-view-lane`
  - `capability object`
  - `host-adjunct-derived-affordance`

### Resolution Delta

- `AC3.3 remains active candidate`
- `AC4.1 / AC4.2 / AC4.3 -> parked challengers`
- no AC4 candidate strictly dominates AC3.3 yet
- future AC4 work must independently prove stronger owner law, read law, and diagnostics law without relaxing `S1 / S2 / C003`

## Round 18

### Phase

- post-ac4-pressure-summary

### Input Residual

- residual: after AC4 challenger pressure tests, does active candidate change

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- `AC3.3 remains active candidate`
- `AC4.1 field-fact-lane -> parked only`
- `AC4.2 field capability block -> rejected`
- `AC4.3 no-public-companion-program-lowered -> rejected`
- `AC4.4 field-slot-projection-lane -> rejected`
- remaining top-level challenger surface:
  - `AC4.1` only, and only if its fact boundary can be made no weaker than companion boundary

## Round 19

### Phase

- post-ac4-pressure-plateau-check

### Input Residual

- residual: after AC4.1 / AC4.3 / AC4.4 pressure tests, does AC3.3 remain active candidate

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- `AC3.3 remains active candidate`
- `AC4.1 field-fact-lane -> parked challenger only`
- `AC4.2 field capability block -> rejected`
- `AC4.3 no-public-companion-program-lowered -> rejected`
- `AC4.4 field-slot-projection-lane -> rejected`
- no AC4 candidate strictly dominates AC3.3

## Round 20

### Phase

- trace-substrate split

### Input Residual

- residual: `TRACE` parent challenge 过宽，是否需要先 split 才能继续推进 implementation trace evidence

### Findings

- F1 `high` `ambiguity`:
  - summary: 当前 `scenario/compare/evidence` parent challenge 过宽，已把不同 owner 与不同相位的问题绑在同一 success bar
  - status: `adopted`
- F2 `high` `ambiguity`:
  - summary: `TRACE-S1 / TRACE-S2 / TRACE-S3` 已冻结，但 parent challenge 尚未吸收 closed children，形成 scope drift
  - status: `adopted`

### Counter Proposals

- P1:
  - summary: `TRACE umbrella router + active scenario execution carrier + next compare truth substrate`
  - why_better: 先把 TRACE 主链重新压成顺序 residual chain，再继续下钻 scenario/compare substrate，避免 proof ordering 继续混乱
  - dominance: `dominates`
  - status: `adopted`

### Resolution Delta

- `AC3.3 remains active candidate`
- `TRACE` parent challenge split verdict -> adopted
- next execution focus moves to `scenario execution carrier`
- `compare truth substrate` becomes ordered next residual

## Round 21

### Phase

- scenario-execution-carrier-review

### Input Residual

- residual: active `scenario execution carrier` 是否足够 freeze 成 `TRACE-S4`

### Findings

- F1 `high` `ambiguity`:
  - summary: carrier 还没切开 stable compiled plan 与 run-local session
  - status: `adopted`
- F2 `high` `ambiguity`:
  - summary: carrier 缺内部 producer feed，容易在 raw observation 与 compare-ready summary 之间摇摆
  - status: `adopted`
- F3 `high` `ambiguity`:
  - summary: row-heavy fixture identity 与 benchmark reuse 仍需从 success bar 提升为 acceptance law
  - status: `adopted`

### Counter Proposals

- P1:
  - summary: `ScenarioExecutionCarrier = ScenarioCompiledPlan + ScenarioRunSession`
  - dominance: `dominates`
  - status: `adopted`
- P2:
  - summary: `ScenarioCarrierEvidenceFeed`
  - dominance: `dominates`
  - status: `adopted`
- P3:
  - summary: `FixtureIdentityTable + benchmark execution-carrier reuse law`
  - dominance: `dominates`
  - status: `adopted`

### Resolution Delta

- `scenario execution carrier -> needs-refinement`
- refinement delta written back to challenge and ledger
- next round target: refined freeze check for `TRACE-S4 scenario execution carrier law`

## Round 22

### Phase

- scenario-execution-carrier-freeze

### Input Residual

- residual: refined `scenario execution carrier` 是否可冻结为 `TRACE-S4`

### Findings

- none blocking

### Counter Proposals

- P4:
  - summary: `TRACE-S4 scenario execution carrier law`
  - why_better: 当前 refined contract 已把 producer 与 compare truth 分层、row-heavy identity law 与 benchmark reuse 边界一次收口
  - dominance: `dominates`
  - status: `adopted`

### Resolution Delta

- `TRACE-S4 scenario execution carrier law -> frozen`
- active trace residual moves to `compare truth substrate`

## Round 23

### Phase

- carryover-absorption

### Input Residual

- residual: `proposal-149-154-carryover.md` 是否仍应保留为独立 intake page

### Findings

- F1 `medium` `ambiguity`:
  - summary: carryover proposal 继续单独保留，会让 149 至 154 的历史语义停在第二入口，削弱 155 主链的一致性
  - status: `adopted`

### Counter Proposals

- P1:
  - summary: `absorb-and-delete carryover proposal`
  - why_better: 把 `149 / 150 / 151 / 152 / 153 / 154` 的有效语义直接压进 spec、candidate 与关键 challenge briefs，删除中间 intake 页
  - dominance: `dominates`
  - status: `adopted`

### Resolution Delta

- `149 / 150 / 151 / 152 / 153 / 154` carryover absorbed into main chain
- proposal page becomes redundant and can be removed

## Round 24

### Phase

- compare-truth-freeze

### Input Residual

- residual: refined `compare truth substrate` 是否可冻结为 `TRACE-S5`

### Findings

- none blocking

### Counter Proposals

- P1:
  - summary: `TRACE-S5 compare truth substrate law`
  - why_better: refined contract 已把 compare pipeline、artifact-backed result contract、stable admission、stable source locus 与 control-plane 壳层一次收口
  - dominance: `dominates`
  - status: `adopted`

### Resolution Delta

- `TRACE-S5 compare truth substrate law -> frozen`
- TRACE contract chain freezes through compare truth substrate

## Round 25

### Phase

- implementation-phase split

### Input Residual

- residual: contract layer 已冻结到 TRACE-S5 后，implementation gap 是否应立即拆成顺序 residual chain

### Findings

- F1 `high` `ambiguity`:
  - summary: 当前 implementation phase parent challenge 已跨 execution、correctness、perf 三层
  - status: `adopted`
- F2 `high` `ambiguity`:
  - summary: benchmark-first 当前缺 truth 基底，当前更高优先级的是 executable proof gate
  - status: `adopted`

### Counter Proposals

- P1:
  - summary: `implementation phase split-now`
  - why_better: 将 implementation gap 收成 `implementation proof execution -> benchmark evidence` 的顺序 residual chain
  - dominance: `dominates`
  - status: `adopted`

### Resolution Delta

- `challenge-implementation-trace-evidence-pack.md -> umbrella router`
- active residual moves to `implementation proof execution`
- benchmark evidence becomes ordered next residual

## Round 26

### Phase

- implementation-proof-freeze

### Input Residual

- residual: refined `implementation proof execution` 是否可冻结为 implementation-phase 下一条 law

### Findings

- none blocking

### Counter Proposals

- P1:
  - summary: `TRACE-I1 implementation proof execution law`
  - why_better: refined contract 已把 wiring、proof roster、row-heavy hard gate、compare hook 与 execution whitelist 一次收口
  - dominance: `dominates`
  - status: `adopted`

### Resolution Delta

- `TRACE-I1 implementation proof execution law -> frozen`
- active implementation residual moves to `benchmark evidence`

## Round 27

### Phase

- benchmark-evidence-freeze

### Input Residual

- residual: refined `benchmark evidence` 是否可冻结为 implementation-phase 的下一条 law

### Findings

- none blocking

### Counter Proposals

- P1:
  - summary: `TRACE-I2 benchmark evidence law`
  - why_better: refined contract 已把 whitelist、comparability hard gate、artifact-backed output contract 与唯一 verdict policy 一次收口
  - dominance: `dominates`
  - status: `adopted`

### Resolution Delta

- `TRACE-I2 benchmark evidence law -> frozen`
- implementation-phase design chain closes through benchmark evidence

## Round 28

### Phase

- implementation-phase plateau

### Input Residual

- residual: implementation-phase design chain 是否还有未冻结的 planning blocker

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- implementation-phase design chain freezes through `TRACE-I1 -> TRACE-I2`
- remaining gap shifts to actual code / empirical evidence

## Round 29

### Phase

- scenario-proof-family convergence

### Input Residual

- residual: `06-capability-scenario-api-support-map` 的 broader matrix 是否应为 155 再收敛出一份长期 scenario proof family

### Findings

- F1 `medium` `ambiguity`:
  - summary: 155 之前的 proof 主要散落在 spec、candidate、challenge 与 ssot matrix 中，缺长期 ToB pressure corpus 单点入口
  - status: `adopted`

### Counter Proposals

- P1:
  - summary: `155 scenario-proof-family artifact`
  - why_better: 把 broader matrix 压成 155 自己的长期 pressure corpus，同时作为 executable subset 与 benchmark whitelist 的统一来源
  - dominance: `dominates`
  - status: `adopted`

### Resolution Delta

- `scenario-proof-family.md -> added`
- `06-capability-scenario-api-support-map` now back-links to 155 scenario proof family
- AC3.3 / AC4.1 / TRACE-I1 / TRACE-I2 now share one long-term pressure corpus

## Current Final Platform

- active_candidate: `AC3.3 companion-residual-closed`
- parked_challenger:
  - `AC4.1 field-fact-lane`
- rejected_challengers:
  - `AC4.2 field capability block`
  - `AC4.3 no-public-companion-program-lowered`
  - `AC4.4 field-slot-projection-lane`
- plateau_status: `post-AC4 pressure plateau confirmed`
- remaining_reopen_triggers:
  - implementation trace evidence around `derivationReceiptRef / bundlePatchRef`
  - AC4.1 only if `fact` boundary can be proven no weaker than `companion` boundary
  - future list/root soft slice only if it cannot be routed to source / rule / settlement / reason / list DSL / host projection
  - TRACE chain now holds: `TRACE-S4 scenario execution carrier law -> compare truth substrate`
