# Form Future Noun Review Ledger

## Meta

- target: `docs/ssot/form/09-operator-slot-design.md`
- source_kind: `file-plan`
- reviewer_count: `4`
- reviewer_model: `gpt-5.4`
- reviewer_reasoning: `xhigh`
- challenge_scope: `open`
- consensus_status: `closed`

## Bootstrap

- target_complete: `anchor=docs/ssot/form/09-operator-slot-design.md; bound surface=docs/ssot/form/05-public-api-families.md, docs/ssot/form/06-capability-scenario-api-support-map.md, docs/ssot/form/07-kernel-upgrade-opportunities.md, docs/ssot/form/09-operator-slot-design.md`
- challenge_scope: `open`
- reviewer_set: `A1, A2, A3, A4`
- active_advisors: `A4`
- activation_reason: `目标涉及 future noun admission、alias/scope/manifestation 边界与 operator noun 后置策略，需要目标函数挑战`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan, Kolmogorov, Godel`
- dominance_axes: `concept-count, public-surface, compat-budget, migration-cost, proof-strength, future-headroom`
- stop_rule:
  - `Ramanujan gate`: 至少压掉一个 assumption、一个 public boundary、或一段重复 contract
  - `Kolmogorov gate`: `concept-count / public-surface / compat-budget` 不整体变差；若核心轴不变，必须在 `proof-strength` 或 `future-headroom` 上形成严格改进
  - `Godel gate`: 不得引入第二套 authority、第二套 workflow、第二套 contract、或未闭合矛盾
- reopen_bar: `只有当 adopted candidate 在 dominance axes 上被更优方案直接支配，且通过三重 gate，才允许 reopen`
- ledger_path: `docs/review-plan/runs/2026-04-15-form-future-noun-review.md`
- writable: `true`
- edit_policy: `allow-edit-target-and-bound-surface`
- residual_only: `false`

## Assumptions

- A1:
  - summary: `09-operator-slot-design.md` 足以作为 future noun admission 的主锚点
  - status: `kept`
  - resolution_basis: `在收缩成 canonical promotion gate 后，10 继续保留为主锚点`
- A2:
  - summary: 当前 noun 分类 `canonical / alias / scope / manifestation` 已经是最小且足够完整的 admission 体系
  - status: `overturned`
  - resolution_basis: `manifestation 与 scope 已回收到 09，10 不再维护这层 taxonomy`
- A3:
  - summary: 当前允许继续稳定存在的 canonical noun 类型已经合理
  - status: `overturned`
  - resolution_basis: `现存 canonical baseline 继续以 05/09/exports 为准，10 不再维护第二张 noun 台账`
- A4:
  - summary: noun admission checklist 已经足够强，后续 future noun 只需填表即可
  - status: `overturned`
  - resolution_basis: `checklist 已收紧成 promotion proof template，且只保留 gate 所需最小字段`
- A5:
  - summary: noun 继续后置，不需要在这一轮提前冻结 future operator noun
  - status: `kept`
  - resolution_basis: `本轮 adopted candidate 继续只冻结 promotion gate，不冻结 future operator noun`

## Round 1

### Phase

- `challenge`

### Input Residual

- none

### Findings

- F1 `critical` `invalidity`:
  - summary: 10 形成了第二张 noun 台账，与 05/09 的 authority 重叠
  - evidence: A1/A2/A4 都指出 10 在 noun 分类、当前 canonical inventory、checklist 上重复定义既有规则
  - status: `merged`
- F2 `high` `ambiguity`:
  - summary: `canonical / alias / scope / manifestation` 把不同层级揉成同一 taxonomy
  - evidence: A1/A2/A4 都要求把 manifestation 与 scope tag 从 noun kind 中移出
  - status: `merged`
- F3 `high` `ambiguity`:
  - summary: 10 的前置条件与 baseline inventory 失真，authoring / React noun 的地位不闭合
  - evidence: A1/A2/A4 都指出当前 canonical inventory 与 05/09/exports 不一致
  - status: `merged`
- F4 `medium` `ambiguity`:
  - summary: noun admission checklist 过胖，且缺少 dominance / deleted boundary 证明
  - evidence: A1/A2/A4 都要求把 checklist 收成更强的 promotion proof
  - status: `merged`

### Counter Proposals

- P1:
  - summary: 保留 10 为主锚点，但只做小修补
  - why_better: 改动面更小
  - overturns_assumptions: `A2, A4`
  - resolves_findings: `F2, F4`
  - supersedes_proposals:
  - dominance: `partial`
  - axis_scores:
    - concept-count: `partial`
    - public-surface: `partial`
    - compat-budget: `same`
    - migration-cost: `better`
    - proof-strength: `partial`
    - future-headroom: `partial`
  - status: `rejected`
- P2:
  - summary: `AC1`。把 10 收缩成 canonical promotion gate，route 继续归 05，slot 继续归 09，manifestation / scope / alias 也回到 09；10 只回答是否值得从既有 route-slot manifestation 升格为 canonical
  - why_better: 消掉第二张 noun 台账，同时保留一个单点的 promotion law
  - overturns_assumptions: `A2, A3, A4`
  - resolves_findings: `F1, F2, F3, F4`
  - supersedes_proposals:
  - dominance: `dominates`
  - axis_scores:
    - concept-count: `better`
    - public-surface: `better`
    - compat-budget: `better`
    - migration-cost: `better`
    - proof-strength: `better`
    - future-headroom: `better`
  - status: `adopted`

### Resolution Delta

- `A2` -> `overturned`
- `A3` -> `overturned`
- `A4` -> `overturned`
- `09-operator-slot-design.md` 已按 `AC1` 重写

## Adoption

- adopted_candidate: `SYN-8 canonical promotion gate`
- lineage: `P2`
- rejected_alternatives: `P1`
- rejection_reason: `小修补仍保留第二张 noun 台账，无法压掉 taxonomy 混轴`
- dominance_verdict: `SYN-8 在 concept-count, public-surface, proof-strength, future-headroom 上对 baseline 形成严格改进，并通过 Ramanujan / Kolmogorov / Godel 三重 gate`

### Freeze Record

- adopted_summary: `10 仅保留 canonical promotion gate；route 继续归 05，slot / alias / manifestation / scope 继续归 09，10 不再维护第二张 noun 台账`
- kernel_verdict: `通过。新方案压掉了独立 noun taxonomy，把 noun admission 收回到最小 gate`
- frozen_decisions:
  - 10 只承接 canonical promotion law
  - manifestation 与 scope tag 不再属于 10 的 noun taxonomy
  - 现存 canonical inventory 不再由 10 单独维护
  - future noun 默认拒绝；只有满足 promotion proof 才可升格
- non_goals:
  - 本轮不冻结 future operator noun
  - 本轮不维护完整 noun inventory
  - 本轮不让 10 回收 05/09 的 authority
- allowed_reopen_surface:
  - canonical noun baseline 是否仍有漂移
  - promotion proof 模板是否还可继续压缩
  - 10 是否还需要继续降格
- proof_obligations:
  - 未来候选 noun 必须回链到 05/09/06
  - 10 不得再次单列完整 noun 清单
  - manifestation / scope / alias 若要变更，继续回 09
- delta_from_previous_round: `从 noun taxonomy 与 inventory 页，压缩到 canonical promotion gate`

## Consensus

- reviewers: `A1, A2, A3, A4`
- adopted_candidate: `SYN-8 canonical promotion gate`
- final_status: `closed`
- stop_rule_satisfied: `true`
- residual_risk:
  - 05/09 若后续再次调整 authority 或 slot law，10 必须继续只回链，不得回收定义
  - future noun 仍默认拒绝，若有人绕开 promotion proof 直接立名，必须立即 reopen
