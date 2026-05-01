# AC4.1 Field Fact Lane Boundary Pressure Review Ledger

## Meta

- target: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/155-form-api-shape/challenge-ac4-r1-field-fact-lane-boundary-pressure.md`
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
- activation_reason: `本轮核心是 field-fact-lane 是否会突破 owner 边界、滑向第二系统`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan / Kolmogorov / Godel`
- dominance_axes: `concept-count / public-surface / compat-budget / migration-cost / proof-strength / future-headroom`
- stop_rule: `只有 AC4.1 通过边界压测，才有资格继续挑战 AC3.3`
- reopen_bar: `不得用命名好听、叙事更顺、DX 更统一替代严格边界证据`
- ledger_path: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-22-form-api-shape-ac4-r1-field-fact-lane-boundary-pressure.md`
- writable: `true`

## Assumptions

- A1:
  - summary: 本轮只压 `AC4.1`，不比较 `AC4.2/AC4.3`
  - status: `kept`
  - resolution_basis: AC4 compare 已经产出 preferred challenger
- A2:
  - summary: `AC4.1` 若不能证明边界锐度，不得因为命名/对齐优势继续保留高优先级
  - status: `kept`
  - resolution_basis: 当前主风险就是 `fact` 过宽
- A3:
  - summary: `S1 / S2 / C003` law 全部视为必须复用的硬约束
  - status: `kept`
  - resolution_basis: 这些 law 已是跨方向复用资产
- A4:
  - summary: 若本轮压测失败，`AC4.1` 可以直接降级或淘汰
  - status: `kept`
  - resolution_basis: preferred challenger 不等于长期保留

## Round 1

### Phase

- challenge

### Input Residual

- residual: can AC4.1 keep `fact` narrow enough to remain a real challenger

### Findings

- F1 `critical` `ambiguity`:
  - summary: `fact` 语义天然过宽，容易侵蚀 `source / rule / settlement / reason / meta / values` 的 owner 命名域
  - evidence: `A1/A2/A3/A4` 合成
  - status: `adopted`
- F2 `critical` `controversy`:
  - summary: `derive` 会天然唤回 `watch / computed` 心智，削弱已冻结的反 computed 护栏
  - evidence: `A1/A3/A4` 交集
  - status: `adopted`
- F3 `high` `ambiguity`:
  - summary: 若要保留，必须把 `fact` 压成 sealed residual alias，并写硬禁止项与 runtime invariants
  - evidence: `A1/A2/A3` 交集
  - status: `adopted`

### Counter Proposals

- P1:
  - summary: `AC4.1 park with hard guardrails`
  - why_better: 不直接淘汰该方向，但把它压回 parked challenger，避免继续以 preferred challenger 身份消耗主线
  - overturns_assumptions: `none`
  - resolves_findings: `F1 F2 F3`
  - supersedes_proposals: `none`
  - dominance: `dominates`
  - axis_scores: `concept-count +1 / public-surface +1 / compat-budget +1 / migration-cost +1 / proof-strength +1 / future-headroom +1`
  - status: `adopted`

### Resolution Delta

- `F1 F2 F3 -> adopted`
- `AC4.1 preferred challenger -> park`
- `AC4.1 keep only under hard guardrails`

## Adoption

- adopted_candidate: `AC4.1 parked after boundary pressure`
- lineage: `AC4.1 field-fact-lane -> AC4.1 pressure`
- rejected_alternatives:
  - `AC4.1 survive`
- rejection_reason: `当前边界太宽、anti-computed 护栏太弱，尚不足以继续作为 preferred challenger`
- dominance_verdict: `AC4.1 survives only as parked challenger under stricter guardrails`

### Freeze Record

- adopted_summary: `AC4.1 不淘汰，但降级为 parked challenger；若未来重开，必须先把 fact 压成 field-owned local sealed soft UI fact，并锁死 day-one slots、禁止项与 anti-computed 约束`
- kernel_verdict: `通过 Ramanujan / Kolmogorov / Godel gate；把宽边界风险压回 parked 位，避免过早替换主线`
- frozen_decisions:
  - `AC4.1` 当前不再作为 preferred challenger
  - `fact` 必须只定义为 `field-owned local sealed soft UI fact`
  - day-one 只允许 `availability / candidates`
  - 明文禁止吸入 `reason / issue / error / pending / stale / submitImpact / meta / value`
  - `derive` 必须同步、纯、无 IO、无 writeback、无 reason materialization
- non_goals:
  - 现在就让 `AC4.1` 替换 `AC3.3`
  - 现在就引入 `fact` read family
- allowed_reopen_surface:
  - `AC4.1` 在更强 guardrails 下重新压测
- proof_obligations:
  - 证明 `fact` noun 不会扩张 owner split
  - 证明 `derive` 不会回到 computed primitive
  - 证明 `AC4.1` 能严格支配 `AC3.3`

## Consensus

- reviewers: `A1/A2/A3/A4`
- adopted_candidate: `AC4.1 parked after boundary pressure`
- final_status: `consensus reached with downgrade`
- stop_rule_satisfied: `true`
- residual_risk:
  - `fact` 边界仍可能无法被真正锁死
  - 若后续继续压测，AC4.1 仍可能被直接淘汰
