# AC4.3 No Public Companion Boundary Pressure Review Ledger

## Meta

- target: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/155-form-api-shape/challenge-ac4-r2-no-public-companion-boundary-pressure.md`
- source_kind: `file-spec`
- reviewers: `A1/A2/A3/A4`
- round_count: `1`
- challenge_scope: `frozen`
- consensus_status: `consensus`

## Bootstrap

- target_complete: `true`
- challenge_scope: `frozen`
- reviewer_set: `A1/A2/A3/A4`
- active_advisors: `Godel`
- activation_reason: `本轮核心是 no-public-companion 是否会长成 internal second-system`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan / Kolmogorov / Godel`
- dominance_axes: `concept-count / public-surface / compat-budget / migration-cost / proof-strength / future-headroom`
- stop_rule: `只有 AC4.3 通过边界压测，才有资格继续挑战 AC3.3`
- reopen_bar: `不得用 public surface 更小 这一点，替代 second-system 风险证据`
- ledger_path: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-22-form-api-shape-ac4-r2-no-public-companion-boundary-pressure.md`
- writable: `true`

## Assumptions

- A1:
  - summary: 本轮只压 `AC4.3`，不比较 `AC4.1/AC4.2`
  - status: `kept`
  - resolution_basis: AC4 compare 已给出 parked alternative
- A2:
  - summary: `AC4.3` 若无法证明 internal lane 不长第二系统，就不应继续保留高价值 challenger 身份
  - status: `kept`
  - resolution_basis: 当前主风险就是 internal lane second-system
- A3:
  - summary: `S1 / S2 / C003` law 全部视为必须复用的硬约束
  - status: `kept`
  - resolution_basis: 这些 law 已是跨方向复用资产
- A4:
  - summary: 若本轮压测失败，`AC4.3` 可以直接降级或淘汰
  - status: `kept`
  - resolution_basis: parked alternative 不等于长期保留

## Round 1

### Phase

- challenge

### Input Residual

- residual: does AC4.3 hide soft fact in an internal lane without growing a second system

### Findings

- F1 `critical` `controversy`:
  - summary: `dsl/internal lane` 会把精确 surface 换成高熵入口，第二系统风险更高
  - evidence: `A1/A2/A4` 交集
  - status: `adopted`
- F2 `critical` `ambiguity`:
  - summary: AC4.3 没有消掉 read-route 与 diagnostics blocker，只是把它们移进 internal lane
  - evidence: `A1/A2/A3/A4` 合成
  - status: `adopted`
- F3 `high` `ambiguity`:
  - summary: internal lane 若想维持 explainability，迟早要长 declaration identity/trace/contract，最终会逼回公开 contract 或 shadow system
  - evidence: `A1/A2/A4` 交集
  - status: `adopted`

### Counter Proposals

- P1:
  - summary: `AC4.3 reject after boundary pressure`
  - why_better: 直接切掉 internal second-system 风险，不再为更小 public-surface 的表面收益继续付出解释成本
  - overturns_assumptions: `none`
  - resolves_findings: `F1 F2 F3`
  - supersedes_proposals: `none`
  - dominance: `dominates`
  - axis_scores: `concept-count +1 / public-surface +0 / compat-budget +1 / migration-cost +1 / proof-strength +2 / future-headroom +1`
  - status: `adopted`

### Resolution Delta

- `F1 F2 F3 -> adopted`
- `AC4.3 -> reject`

## Adoption

- adopted_candidate: `AC4.3 reject after boundary pressure`
- lineage: `AC4.3 no-public-companion-program-lowered -> pressure`
- rejected_alternatives:
  - `AC4.3 survive`
  - `AC4.3 park`
- rejection_reason: `当前形态只是把 companion 语义藏进 internal lane，未通过“最小公开面真实收缩”与“no second-system”两条门`
- dominance_verdict: `AC4.3 is rejected`

### Freeze Record

- adopted_summary: `AC4.3 当前拒绝。它没有真正消掉 read-route 与 diagnostics 义务，只是把 soft fact authoring 下沉到 internal lane，最终要么长回公开 contract，要么形成 shadow system`
- kernel_verdict: `通过 Ramanujan / Kolmogorov / Godel gate；reject 比继续 parked 更干净`
- frozen_decisions:
  - `AC4.3` 当前拒绝
  - `dsl/internal` 不能承接 field soft fact 的长期公开替代方向
  - “public surface 更小”不足以抵消 internal second-system 风险
- non_goals:
  - 不再继续压 AC4.3 细节
  - 不再把 AC4.3 当 parked challenger

## Consensus

- reviewers: `A1/A2/A3/A4`
- adopted_candidate: `AC4.3 reject after boundary pressure`
- final_status: `consensus reached with rejection`
- stop_rule_satisfied: `true`
- residual_risk:
  - 若未来有更强证据证明 internal lane 只是编译期糖且不长第二系统，可重开，但当前无此证据
