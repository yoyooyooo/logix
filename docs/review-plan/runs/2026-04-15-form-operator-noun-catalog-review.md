# Form Operator Noun Catalog Review Ledger

## Meta

- target: `docs/ssot/form/12-operator-noun-catalog.md`
- source_kind: `file-plan`
- reviewer_count: `4`
- reviewer_model: `gpt-5.4`
- reviewer_reasoning: `xhigh`
- challenge_scope: `open`
- consensus_status: `closed`

## Bootstrap

- target_complete: `anchor=docs/ssot/form/12-operator-noun-catalog.md; bound surface=docs/ssot/form/05-public-api-families.md, docs/ssot/form/06-capability-scenario-api-support-map.md, docs/ssot/form/09-operator-slot-design.md, docs/ssot/form/12-operator-noun-catalog.md`
- challenge_scope: `open`
- reviewer_set: `A1, A2, A3, A4`
- active_advisors: `A4`
- activation_reason: `目标涉及 candidate noun 目录、canonical promotion 前的待审对象与 cutover 状态，需要目标函数挑战`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan, Kolmogorov, Godel`
- dominance_axes: `concept-count, public-surface, compat-budget, migration-cost, proof-strength, future-headroom`
- stop_rule:
  - `Ramanujan gate`: 至少压掉一个 assumption、一个 public boundary、或一段重复 contract
  - `Kolmogorov gate`: `concept-count / public-surface / compat-budget` 不整体变差；若核心轴不变，必须在 `proof-strength` 或 `future-headroom` 上形成严格改进
  - `Godel gate`: 不得引入第二套 authority、第二套 workflow、第二套 contract、或未闭合矛盾
- reopen_bar: `只有当 adopted candidate 在 dominance axes 上被更优方案直接支配，且通过三重 gate，才允许 reopen`
- ledger_path: `docs/review-plan/runs/2026-04-15-form-operator-noun-catalog-review.md`
- writable: `true`
- edit_policy: `allow-edit-target-and-bound-surface`
- residual_only: `false`

## Assumptions

- A1:
  - summary: `12-operator-noun-catalog.md` 足以作为待审 noun 目录的主锚点
  - status: `overturned`
  - resolution_basis: `adopted candidate 直接移除了 12 作为 living SSoT 主锚点`
- A2:
  - summary: 当前 catalog 三分类 `candidate canonical / bridge residue / alias candidate` 已经是最小且足够完整的目录结构
  - status: `overturned`
  - resolution_basis: `三分类被删除，待审对象回收到单一 gate 与 review ledger`
- A3:
  - summary: 当前 catalog 条目选择已经合理
  - status: `overturned`
  - resolution_basis: `decode / inspect.path 等候选不再通过独立 catalog 维护`
- A4:
  - summary: promotion preconditions 已经足够强
  - status: `overturned`
  - resolution_basis: `12 的本地 preconditions 被整体删除，promotion law 继续只由 10 持有`
- A5:
  - summary: catalog 继续只作为待审目录，不会重新长出第二张 noun 台账
  - status: `overturned`
  - resolution_basis: `ALT-1 直接取消 12 作为常驻 catalog，彻底消除第二张 noun 台账`

## Round 1

### Phase

- `challenge`

### Input Residual

- none

### Findings

- F1 `critical` `invalidity`:
  - summary: 12 长出了第二张 noun 台账，与 09/10 重叠
  - evidence: reviewers A1/A2/A4 都指出 12 自带分类、本地状态和本地 gate
  - status: `merged`
- F2 `high` `ambiguity`:
  - summary: catalog 三分类混合了 canonical proposal、alias、bridge residue 三类不同治理对象
  - evidence: reviewers A1/A2/A4 都要求 alias/residue authority 回到 09
  - status: `merged`
- F3 `high` `ambiguity`:
  - summary: catalog 的 promotion preconditions 弱于 10 的 canonical gate
  - evidence: reviewers A1/A2/A4 都指出 12 的本地 preconditions 与 10 不一致
  - status: `merged`
- F4 `medium` `ambiguity`:
  - summary: catalog 条目选择 name-first，命名压力早于证明压力
  - evidence: reviewers A1/A2/A4 都点名 `decode`、`inspect.path` 等候选过早具名
  - status: `merged`

### Counter Proposals

- P1:
  - summary: 保留 12，但改成 proof-first queue
  - why_better: 保留一个单独入口，迁移面较小
  - overturns_assumptions: `A2, A4, A5`
  - resolves_findings: `F1, F2, F3`
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
  - summary: `ALT-1`。撤销 12 作为 living SSoT，待审 noun 全部回到 10 的 canonical promotion gate 与 review ledger
  - why_better: 直接消掉第二 workflow、第二状态机、第二 authority
  - overturns_assumptions: `A1, A2, A3, A4, A5`
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

- `A1~A5` -> `overturned`
- `12-operator-noun-catalog.md` 已从 form SSoT 主链移除
- `09-operator-slot-design.md` 已明确不再配套独立 noun catalog living page

## Adoption

- adopted_candidate: `SYN-10 no-living-noun-catalog`
- lineage: `P2`
- rejected_alternatives: `P1`
- rejection_reason: `保留 12 仍会留下第二个 noun workflow 与第二张 noun 台账`
- dominance_verdict: `SYN-10 在 concept-count, public-surface, proof-strength, future-headroom 上对 baseline 形成严格改进，并通过 Ramanujan / Kolmogorov / Godel 三重 gate`

### Freeze Record

- adopted_summary: `12 从 living SSoT 主链移除；待审 noun 继续只通过 10 的 canonical promotion gate 与 review ledger 维护`
- kernel_verdict: `通过。新方案直接消掉了 12 这层 catalog authority，把 noun 治理收回单点`
- frozen_decisions:
  - 12 不再作为 living SSoT 页面存在
  - 待审 noun 不再维护独立 catalog 页面
  - noun promotion 继续只回链 10
  - alias / manifestation / residue authority 继续只回链 09
- non_goals:
  - 本轮不冻结新的 noun
  - 本轮不维护 pending noun 列表页
- allowed_reopen_surface:
  - 是否仍需要一个非 SSoT 的 queue 入口
  - 10 的 promotion gate 是否还可继续压缩
- proof_obligations:
  - future noun 只允许通过 10 与 review ledger 进入讨论
  - 09 继续是 alias / residue / manifestation 的唯一 owner
  - 不得再在 form SSoT 主链新增第二张 noun 台账
- delta_from_previous_round: `从 pending noun catalog，收缩到单一 promotion gate + ledger 路径`

## Consensus

- reviewers: `A1, A2, A3, A4`
- adopted_candidate: `SYN-10 no-living-noun-catalog`
- final_status: `closed`
- stop_rule_satisfied: `true`
- residual_risk:
  - 若后续仍需要 queue，默认先放进 review ledger 或 next，不进 SSoT 主链
  - 10 若再次回收 alias、manifestation、inventory 定义，需要立即 reopen
