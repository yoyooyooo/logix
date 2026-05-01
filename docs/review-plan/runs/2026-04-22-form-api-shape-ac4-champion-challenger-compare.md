# AC4 Champion Challenger Compare Review Ledger

## Meta

- target: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/155-form-api-shape/challenge-ac4-champion-challenger-compare.md`
- source_kind: `file-spec`
- reviewers: `A1/A2/A3/A4`
- round_count: `0`
- challenge_scope: `frozen`
- consensus_status: `consensus`

## Bootstrap

- target_complete: `true`
- challenge_scope: `frozen`
- reviewer_set: `A1/A2/A3/A4`
- active_advisors: `Hamming / Feynman`
- activation_reason: `本轮目标是对 parked challengers 排序，强调目标函数与 public contract 可理解性`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan / Kolmogorov / Godel`
- dominance_axes: `concept-count / public-surface / compat-budget / migration-cost / proof-strength / future-headroom`
- stop_rule: `只有在 parked challengers 之间形成清晰排序与去留结论，本轮才算完成`
- reopen_bar: `不得重开 AC3.3 主线与 S1/S2/C003 law；本轮只比较 AC4 parked challengers`
- ledger_path: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-22-form-api-shape-ac4-champion-challenger-compare.md`
- writable: `true`

## Assumptions

- A1:
  - summary: 本轮只比较 `AC4.1 / AC4.2 / AC4.3`
  - status: `kept`
  - resolution_basis: 顶层扫描已经筛出这三条最值得保留的 challenger
- A2:
  - summary: 三条候选都必须接受 `S1 / S2 / C003` law 约束
  - status: `kept`
  - resolution_basis: law 目前是跨方向可复用的硬边界
- A3:
  - summary: 本轮需要给出明确排序，不接受“都不错”式结论
  - status: `kept`
  - resolution_basis: 否则 parked challengers 数量会继续发散
- A4:
  - summary: 即使 preferred challenger 产生，也不自动替换 AC3.3
  - status: `kept`
  - resolution_basis: challenger compare 不等于 main candidate replace

## Round 1

### Phase

- compare

### Input Residual

- residual: among parked challengers, who is the preferred challenger

### Findings

- F1 `critical` `ambiguity`:
  - summary: 三条 parked challenger 都没有严格支配 `AC3.3`，本轮目标只剩排序与去留
  - evidence: `A1/A2/A3/A4` 交集
  - status: `adopted`
- F2 `high` `controversy`:
  - summary: `AC4.1` 在最小生成元 / read-teaching / diagnostics 对齐上最强，但边界过宽风险仍在
  - evidence: `A1/A2/A4` 交集
  - status: `adopted`
- F3 `high` `controversy`:
  - summary: `AC4.3` public surface 最小，但 internal second-system 风险明显
  - evidence: `A1/A2/A4` 交集
  - status: `adopted`
- F4 `high` `controversy`:
  - summary: `AC4.2` attachment unit 与 owner unit 容易混淆，当前收益主要停在 authoring 姿势
  - evidence: `A1/A2/A4` 交集
  - status: `adopted`

### Counter Proposals

- P1:
  - summary: `AC4.1 preferred challenger`
  - why_better: 在不重开主线的前提下，最有潜力挑战 AC3.3 的顶层方向
  - overturns_assumptions: `none`
  - resolves_findings: `F2`
  - supersedes_proposals: `none`
  - dominance: `partial`
  - axis_scores: `concept-count +0 / public-surface +0 / compat-budget +0 / migration-cost +0 / proof-strength +1 / future-headroom +1`
  - status: `adopted`
- P2:
  - summary: `AC4.3 parked alternative`
  - why_better: 作为更小 public-surface 压测方向仍有价值
  - overturns_assumptions: `none`
  - resolves_findings: `F3`
  - supersedes_proposals: `none`
  - dominance: `partial`
  - axis_scores: `concept-count +1 / public-surface +1 / compat-budget +0 / migration-cost +0 / proof-strength +0 / future-headroom +0`
  - status: `adopted`
- P3:
  - summary: `AC4.2 reject`
  - why_better: 当前主要收益只停在 co-location authoring，不足以保留为高优 challenger
  - overturns_assumptions: `none`
  - resolves_findings: `F4`
  - supersedes_proposals: `none`
  - dominance: `adopted`
  - axis_scores: `concept-count +0 / public-surface +0 / compat-budget +0 / migration-cost +0 / proof-strength +0 / future-headroom +0`
  - status: `adopted`

### Resolution Delta

- `F1 F2 F3 F4 -> adopted`
- `AC4.1 -> parked challenger`
- `AC4.3 -> parked alternative pending pressure`
- `AC4.2 -> rejected challenger`

## Adoption

- adopted_candidate: `AC4 compare ranking finalized`
- lineage:
  - `AC4.1 field-fact-lane`
  - `AC4.3 no-public-companion-program-lowered`
  - `AC4.2 field capability block`
- rejected_alternatives:
  - `AC4.2 field capability block` as preferred challenger
- rejection_reason: `当前不能在 owner law / proof-strength 上优于 AC4.1，也不如 AC4.3 那样提供更小 public surface 的压力测试价值`
- dominance_verdict: `AC4 compare did not replace AC3.3, but it did produce one preferred challenger`

### Freeze Record

- adopted_summary: `AC4 compare 完成：AC4.1 先保留为 parked challenger，AC4.3 先保留为 parked alternative，AC4.2 当前拒绝；AC3.3 继续为 active candidate`
- kernel_verdict: `通过 Ramanujan / Kolmogorov / Godel gate；减少 parked challenger 的分叉数，同时保留最值得继续压测的一条`
- frozen_decisions:
  - `AC4.1 field-fact-lane` 当前保留为 parked challenger
  - `AC4.3 no-public-companion-program-lowered` 先进入边界压测
  - `AC4.2 field capability block` 当前拒绝
  - `AC3.3` 继续为 active candidate
- non_goals:
  - 现在就用 preferred challenger 替换 AC3.3
  - 现在就清空所有 AC4 候选
- allowed_reopen_surface:
  - `AC4.1 field-fact-lane`
  - `AC4.3 no-public-companion-program-lowered`
- proof_obligations:
  - `AC4.1` 需要证明 field local fact lane 不会放大 owner law 与 watch/computed 回潮风险
  - `AC4.3` 需要证明 internal lane 不会长成第二系统
- delta_from_previous_round:
  - from three parked challengers to one preferred challenger plus one parked alternative

## Consensus

- reviewers: `A1/A2/A3/A4`
- adopted_candidate: `AC4 compare ranking finalized`
- final_status: `consensus reached before pressure tests`
- stop_rule_satisfied: `true`
- residual_risk:
  - `AC4.1` 仍可能因 fact 过宽被淘汰，或需更强 guardrails
  - `AC4.3` 仍可能因 internal second-system 风险被淘汰
  - `AC4` 尚未出现严格支配 `AC3.3` 的新主候选
