# Form Terminal Planning Closure Ledger

## Meta

- target: `docs/ssot/form/README.md`
- targets: `docs/ssot/form/*.md`
- source_kind: `file-ssot-contract`
- reviewers: `A1, A2, A3, A4`
- round_count: `2`
- challenge_scope: `open`
- consensus_status: `closed`

## Bootstrap

- target_complete: `authority target=form terminal planning closure; prior freezes=docs/review-plan/runs/2026-04-16-form-public-api-optimality-loop.md, docs/review-plan/runs/2026-04-16-form-composition-model-challenge.md, docs/review-plan/runs/2026-04-16-form-public-composition-law-review.md, docs/review-plan/runs/2026-04-16-form-declaration-carrier-review-v3.md`
- review_contract:
  - artifact_kind: `ssot-contract`
  - review_goal: `zero-unresolved`
  - target_claim: `under zero-user and forward-only assumptions, Form planning should now close all remaining public-contract gaps after the frozen carrier and composition-law decisions, reaching the strongest terminal SSoT for declaration grammar, projection contract, internal declaration IR boundary, and residue documentation law`
  - non_default_overrides: `carrier and composition law are treated as frozen inputs; remaining open questions must be compressed without reopening them unless directly dominated`
- review_object_manifest:
  - source_inputs: `docs/ssot/form/*.md + prior freeze ledgers + docs/internal/form-api-quicklook.md`
  - materialized_targets: `docs/ssot/form/*.md`
  - authority_target: `form-terminal-planning-closure@2026-04-16`
  - bound_docs:
    - `docs/ssot/runtime/03-canonical-authoring.md`
    - `docs/ssot/runtime/06-form-field-kernel-boundary.md`
    - `docs/ssot/runtime/10-react-host-projection-boundary.md`
    - `docs/internal/form-api-quicklook.md`
    - `packages/logix-form/src/internal/form/impl.ts`
    - `packages/logix-form/src/internal/dsl/logic.ts`
    - `packages/logix-form/src/internal/dsl/rules.ts`
    - `packages/logix-form/src/index.ts`
  - derived_scope: `remaining Form planning closure only`
  - allowed_classes:
    - `declaration slot grammar`
    - `projection contract`
    - `single internal declaration IR boundary`
    - `residue / closed path documentation law`
    - `supporting doc compression`
    - `cross-doc proof obligations`
  - blocker_classes:
    - `reopened second carrier`
    - `reopened second composition law`
    - `fake-closed projection`
    - `multiple declaration IR stories`
    - `stale residue authority`
    - `teaching page overriding authority`
  - ledger_target: `docs/review-plan/runs/2026-04-16-form-terminal-planning-closure.md`
- challenge_scope: `open`
- reviewer_set: `A1, A2, A3, A4`
- active_advisors: `A4`
- activation_reason: `目标是把 Form 规划层补到终局，需要允许对 remaining open areas 做最强压缩，但默认不重开已冻结的 carrier 与 composition law`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan, Kolmogorov, Godel`
- dominance_axes: `concept-count, public-surface, compat-budget, migration-cost, proof-strength, future-headroom`
- stop_rule:
  - `Ramanujan gate`: 至少压掉一个剩余公开概念、一个重复 contract、或一段 residue authority 解释
  - `Kolmogorov gate`: `concept-count / public-surface / compat-budget` 不能整体变差；若核心轴不变，必须在 `proof-strength` 或 `future-headroom` 上形成严格改进
  - `Godel gate`: 不得重开第二 carrier、第二 composition law、第二 projection truth，或未解释矛盾
- reopen_bar: `只有直接支配已冻结 carrier/composition law 的更强方案，才允许重开已冻结输入`
- ledger_path: `docs/review-plan/runs/2026-04-16-form-terminal-planning-closure.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `carrier + composition law` 已足够稳定，剩余问题都是局部收口
  - status: `kept`
  - resolution_basis: `A1/A3/A4 的交集都认为主骨架已冻结，剩余主要是 residual proof closure 与页面压缩。`
- A2:
  - summary: declaration grammar、projection contract、internal IR、residue docs 这四项足以覆盖剩余终局规划面
  - status: `overturned`
  - resolution_basis: `A2/A3/A4 交集表明四项不在同层级，需要按 first-order checks 重排，且部分对象应降为 merged note。`
- A3:
  - summary: remaining open areas 都可以在不重开已冻结输入的前提下收口
  - status: `kept`
  - resolution_basis: `A3 证明只要把 remaining areas 缩成最小布局，就无需重开 carrier 或 composition law。`
- A4:
  - summary: 终局化阶段应优先完成 single law 的细化，而不是继续寻找新的上位目标函数
  - status: `kept`
  - resolution_basis: `A4 明确要求冻结现有上位目标函数，只做 residual proof closure。`

## Round 1

### Phase

- `challenge`

### Input Residual

- none

### Findings

- F1 `high` `invalidity`:
  - summary: terminal closure 的 remaining objects 需要按 first-order checks 重排，当前四项并列会稀释 hard gate
  - evidence: `A3 + A4`
  - status: `merged`
- F2 `high` `ambiguity`:
  - summary: `walkthrough` 仍以 placeholder 教学面维持第二表面，持续冲击 authority
  - evidence: `A1 + A2`
  - status: `merged`
- F3 `high` `invalidity`:
  - summary: `09` 的 `O1/O2/O3/O4` 形成第二层 grammar，应压回北极星三语义
  - evidence: `A1 + A2`
  - status: `merged`
- F4 `medium` `invalidity`:
  - summary: `08/10/11/12` 继续以独立 living 页存在，信息增益低于维护成本
  - evidence: `A1 + A2`
  - status: `merged`
- F5 `medium` `ambiguity`:
  - summary: `projection contract` 只应收到 acquisition + opaque boundary；`single internal IR` 只应收 negative boundary
  - evidence: `A3`
  - status: `merged`

### Counter Proposals

- P1:
  - summary: `继续维持当前 page topology，只补 wording`
  - why_better: `改动小`
  - overturns_assumptions:
  - resolves_findings:
  - supersedes_proposals:
  - dominance: `none`
  - axis_scores:
    - concept-count: `worse`
    - public-surface: `same`
    - compat-budget: `same`
    - migration-cost: `same`
    - proof-strength: `worse`
    - future-headroom: `worse`
  - status: `rejected`
- P2:
  - summary: `SYN-21 minimal terminal layout`
  - why_better: `冻结现有上位目标函数，remaining areas 只做 residual proof closure；living docs 压到更小布局`
  - overturns_assumptions: `A2`
  - resolves_findings: `F1, F2, F3, F4, F5`
  - supersedes_proposals:
  - dominance: `dominates`
  - axis_scores:
    - concept-count: `better`
    - public-surface: `better`
    - compat-budget: `same`
    - migration-cost: `better`
    - proof-strength: `better`
    - future-headroom: `better`
  - status: `adopted`

### Resolution Delta

- `A1` -> `kept`
- `A2` -> `overturned`
- `A3` -> `kept`
- `A4` -> `kept`
- `P2` -> `adopted`
- remaining objective stack 改写为：`projection boundary` 第一优先级，`declaration grammar + single lowering boundary` 第二优先级，`residue/supporting docs` 最后

## Adoption

- adopted_candidate: `SYN-21 minimal terminal layout`
- lineage: `ALT-A4-1 + ALT-A4-2 + ALT-A3-1 + ALT-A1-1 + ALT-A1-2`
- rejected_alternatives: `P1`
- rejection_reason: `继续维持当前 topology 会让 teaching page、mirror page、第二 grammar 与元页面长期存活`
- dominance_verdict: `SYN-21 在 concept-count, migration-cost, proof-strength, future-headroom 上形成直接改进，并通过 Ramanujan / Kolmogorov / Godel 三重 gate`

### Freeze Record

- adopted_summary: `终局化阶段不再搜索新的上位目标函数，只做 residual proof closure。living docs 压成更小布局：projection 只收 acquisition + opaque boundary，internal IR 只收 single unpublished lowering boundary，08/10/11/12/walkthrough 降成 merged note 或附录。`
- kernel_verdict: `通过。当前最强动作是继续删对象、删边界、删重复页面，不重开已冻结的 carrier 与 composition law。`
- frozen_decisions:
  - 上位目标函数继续冻结在 `authoring-determinism / evidence-determinism / host-separability`
  - `projection contract` 当前只收 `form.view()` + opaque `FormViewContract`
  - `single internal declaration IR` 当前只收 negative boundary，不单列第二张 IR 契约页
  - `08` 并回 `07`
  - `10` 并回 `09`
  - `11` 并回 `06`
  - `12` 退回 `13` 附录 / review ledger / tests
  - `walkthrough` 压成 exact-only 摘要，不再维护 placeholder 教学面
  - `09` 的 `O1/O2/O3/O4` 降为对北极星三语义的局部标签
- non_goals:
  - 本轮不开始实现 cutover
  - 本轮不重开 host acquisition、composition law、declaration carrier
  - 本轮不冻结 projection helper member shape
- allowed_reopen_surface:
  - `FormProgram` 最终命名
  - builder grammar 细项
  - projection helper member 的 future promotion
- proof_obligations:
  - living docs 不得再持有 placeholder helper 教学面
  - merged note 页不得继续承载独立语义
  - `09` 的 slot law 必须直接回到北极星三语义，不再维持第二 grammar
  - `12` 的 closed drift 只能留在附录、ledger 或 tests
- delta_from_previous_round: `从四项并列 terminal target，压到 minimal terminal layout`

## Consensus

- reviewers: `A1, A2, A3, A4`
- adopted_candidate: `SYN-21 minimal terminal layout`
- final_status: `closed`
- stop_rule_satisfied: `true`
- residual_risk:
  - 若后续把 host sugar 细节重新沉淀到 supporting docs，第二 truth 仍可能回流
  - 若把 `O*` 旧标签重新抬回主语义位，第二 grammar 仍可能回流
