# C003-R1 Exact Diagnostics Object Shape Review Ledger

## Meta

- target: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/155-form-api-shape/challenge-c003-r1-exact-diagnostics-object-shape.md`
- source_kind: `file-spec`
- reviewers: `A1/A2/A3/A4`
- round_count: `2`
- challenge_scope: `frozen`
- consensus_status: `consensus`

## Bootstrap

- target_complete: `true`
- challenge_scope: `frozen`
- reviewer_set: `A1/A2/A3/A4`
- active_advisors: `Feynman`
- activation_reason: `C003-R1 聚焦 exact diagnostics object 的对外可理解性与第二 diagnostics truth 风险`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan / Kolmogorov / Godel`
- dominance_axes: `concept-count / public-surface / compat-budget / migration-cost / proof-strength / future-headroom`
- stop_rule: `只有通过 Ramanujan / Kolmogorov / Godel gate，且在 exact diagnostics object 目标函数上形成严格改进，才允许替换当前 C003-R1 基线`
- reopen_bar: `不得重开 C003.1 law、S1-R3.1 backlink law、153 authority；除非 reviewer 先证明 exact diagnostics object 在这些冻结前提下不可成立`
- ledger_path: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-22-form-api-shape-c003-r1-exact-diagnostics-object-shape.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `C003-R1` 只审 exact diagnostics object，不重开 diagnostics law 层冻结
  - status: `kept`
  - resolution_basis: 当前 diagnostics 侧残余已经收缩到 object shape
- A2:
  - summary: exact diagnostics object 若存在，必须继续停在 evidence envelope 之下
  - status: `kept`
  - resolution_basis: 脱离 evidence envelope 就会长第二 diagnostics truth
- A3:
  - summary: stale / cleanup 只能作为 subordinate backlink，不得在 exact object 中复活为 active truth
  - status: `kept`
  - resolution_basis: 当前既有 freeze 已把 stale/cleanup 压回 subordinate 位
- A4:
  - summary: 若当前仍不该冻结 exact diagnostics object，本轮也可以以 no-better verdict 收口
  - status: `kept`
  - resolution_basis: plan-optimality-loop 允许 no strictly better candidate 作为有效结论

## Round 1

### Phase

- challenge

### Input Residual

- residual: exact diagnostics object shape

### Findings

- F1 `critical` `ambiguity`:
  - summary: 当前 diagnostics 侧残余已经收缩到 materialized object 编排问题，真相面本身没有缺口
  - evidence: `A1/A2/A3/A4` 交集
  - status: `adopted`
- F2 `critical` `controversy`:
  - summary: exact object 一旦携带 `status / cleanup/stale / selectorRead / ui path / slot-level causal refs`，就会滑成第二 diagnostics system
  - evidence: `A1/A2/A3/A4` 交集
  - status: `adopted`
- F3 `high` `ambiguity`:
  - summary: 当前最小 obligation 仍停在 evidence envelope refs，exact object 不能减少 authority 歧义
  - evidence: `A1/A2/A4` 交集
  - status: `adopted`

### Counter Proposals

- P1:
  - summary: `C003-R1.1 exact diagnostics object deferred, no second-system shape`
  - why_better: 不冻结 object，却把未来若重开时的 shape 边界收紧，避免第二 diagnostics system
  - overturns_assumptions: `none`
  - resolves_findings: `F1 F2 F3`
  - supersedes_proposals: `none`
  - dominance: `dominates`
  - axis_scores: `concept-count +2 / public-surface +2 / compat-budget +1 / migration-cost +1 / proof-strength +2 / future-headroom +1`
  - status: `adopted`

### Resolution Delta

- `F1 F2 F3 -> adopted`
- `P1 -> adopted as C003-R1.1`

## Adoption

- adopted_candidate: `C003-R1.1 exact diagnostics object deferred, no second-system shape`
- lineage: `C003.1 -> C003-R1 -> P1`
- rejected_alternatives:
  - immediate exact diagnostics object shape
  - host explain object / report shell
  - payload-heavy backlink view
- rejection_reason: `会把 backlink view 推成第二 diagnostics truth，且当前没有足够 proof-strength`
- dominance_verdict: `current C003-R1 baseline is dominated by P1`

### Freeze Record

- adopted_summary: `当前不冻结 exact diagnostics object；若未来重开，它也只能作为 evidence envelope 之下的从属 backlink view，并且 day-one shape 不能携带 status/cleanup/stale/selectorRead/ui path/slot-level causal refs`
- kernel_verdict: `通过 Ramanujan / Kolmogorov / Godel gate；不增加 object surface，却显著降低第二系统风险`
- frozen_decisions:
  - 当前不冻结 exact diagnostics object shape
  - 当前不新增 explain object、report shell、helper family、ui path readback
  - exact object 若未来重开，也只能作为 evidence envelope 之下的从属 backlink view
  - exact object 的未来候选 shape 优先限于：`ownerRef / sanctioned slot / canonicalRowIdChain? / derivationReceiptRef / bundlePatchRef / reasonSlotId? / sourceRef?`
  - `status`、`cleanup/stale`、`selectorRead`、`ui path`、slot 级 causal refs 不得进入 day-one exact shape
- non_goals:
  - 现在就冻结 exact diagnostics object
  - 现在就让 materialized view 获得 owner truth 地位
  - 现在就新增 diagnostics helper family
- allowed_reopen_surface:
  - exact diagnostics object shape
  - `bundlePatchRef` 对 `clear/retire` 的稳定覆盖
  - `sourceRef` 是否分主线并逼出 slot cadence
- proof_obligations:
  - 证明 exact object 仍是纯 backlink view
  - 证明 exact object 不会把 stale/cleanup 重新变成 active truth
  - 证明 exact object 比纯 envelope refs 有明确严格改进
- delta_from_previous_round:
  - from open exact object residual to no-better freeze

## Round 2

### Phase

- converge

### Input Residual

- residual: exact object remains deferred

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- `exact diagnostics object deferred, no second-system shape -> confirmed`
- exact diagnostics object shape remains reopen surface, not unresolved finding

## Consensus

- reviewers: `A1/A2/A3/A4`
- adopted_candidate: `C003-R1.1 exact diagnostics object deferred, no second-system shape`
- final_status: `consensus reached with residual risk`
- stop_rule_satisfied: `true`
- residual_risk:
  - `bundlePatchRef` 对 `clear/retire` 的稳定覆盖仍待更强 witness
  - `sourceRef` 是否分主线并逼出 slot 级 cadence，仍待更强 witness
