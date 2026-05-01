# C003-R3 Exact Witness Shape Review Ledger

## Meta

- target: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/155-form-api-shape/challenge-c003-r3-exact-evidence-shape.md`
- source_kind: `file-spec`
- reviewers: `A1/A2/A3/A4`
- round_count: `2`
- challenge_scope: `frozen`
- consensus_status: `consensus`

## Bootstrap

- target_complete: `true`
- challenge_scope: `frozen`
- reviewer_set: `A1/A2/A3/A4`
- active_advisors: `Shannon`
- activation_reason: `C003-R3 聚焦 exact witness shape 的信息增益与第二 diagnostics truth 风险`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan / Kolmogorov / Godel`
- dominance_axes: `concept-count / public-surface / compat-budget / migration-cost / proof-strength / future-headroom`
- stop_rule: `只有通过 Ramanujan / Kolmogorov / Godel gate，且在 exact witness shape 目标函数上形成严格改进，才允许替换当前 C003-R3 基线`
- reopen_bar: `不得重开 C003.1 / C003-R1.1 / C003-R2.1 已冻结 law；除非 reviewer 先证明 exact witness shape 在这些冻结前提下不可成立`
- ledger_path: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-22-form-api-shape-c003-r3-exact-evidence-shape.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `C003-R3` 只审 exact witness shape，不重开 law 层冻结
  - status: `kept`
  - resolution_basis: 当前 diagnostics 侧残余已经收缩到 witness shape
- A2:
  - summary: exact witness shape 若存在，必须继续作为 evidence envelope 内部从属对象
  - status: `kept`
  - resolution_basis: 否则就会长第二 diagnostics truth
- A3:
  - summary: clear / retire / supersede / cleanup 的 subordinate 位置不能因 exact shape 冻结而被放大
  - status: `kept`
  - resolution_basis: law 层已经把这些对象压回 subordinate 位
- A4:
  - summary: 若当前仍不该冻结 exact witness shape，本轮也可以以 no-better verdict 收口
  - status: `kept`
  - resolution_basis: plan-optimality-loop 允许 no strictly better candidate 作为有效结论

## Round 1

### Phase

- challenge

### Input Residual

- residual: exact witness shape

### Findings

- F1 `critical` `ambiguity`:
  - summary: 当前 exact witness shape 的收益主要是实现期编码面，不是新的 authority proof
  - evidence: `A1/A2/A3` 交集
  - status: `adopted`
- F2 `critical` `controversy`:
  - summary: 过早冻结可解析 witness shape 容易引入 id grammar / object semantics，并放大 second-system 风险
  - evidence: `A1/A2/A3` 交集
  - status: `adopted`
- F3 `high` `ambiguity`:
  - summary: internal scoped-seq witness shape 可作为 future implementation candidate，但尚未严格支配 opaque refs
  - evidence: `A1/A2/A4` 交集
  - status: `adopted`

### Counter Proposals

- P1:
  - summary: `C003-R3.1 exact witness shape deferred, opaque-ref law`
  - why_better: 不冻结 exact shape，却把未来进入 exact freeze 的条件与 internal scoped-seq 的位置收紧
  - overturns_assumptions: `none`
  - resolves_findings: `F1 F2 F3`
  - supersedes_proposals: `none`
  - dominance: `dominates`
  - axis_scores: `concept-count +2 / public-surface +2 / compat-budget +1 / migration-cost +1 / proof-strength +2 / future-headroom +1`
  - status: `adopted`
- P2:
  - summary: `internal scoped-seq witness shape`
  - why_better: 冻结 `BundleKey / DerivationWitness / BundlePatchWitness` 提高 proof-strength
  - overturns_assumptions: `none`
  - resolves_findings: `F1`
  - supersedes_proposals: `none`
  - dominance: `partial`
  - axis_scores: `concept-count -1 / public-surface -1 / compat-budget 0 / migration-cost 0 / proof-strength +2 / future-headroom 0`
  - status: `deferred`

### Resolution Delta

- `F1 F2 F3 -> adopted`
- `P1 -> adopted as C003-R3.1`
- `P2 -> deferred as future implementation candidate`

## Adoption

- adopted_candidate: `C003-R3.1 exact witness shape deferred, opaque-ref law`
- lineage: `C003-R2.1 -> C003-R3 -> P1`
- rejected_alternatives:
  - immediate exact witness shape freeze
  - public parseable id grammar
  - diagnostics helper/object surface
- rejection_reason: `当前 proof-strength 增益不足以抵消 concept-count 与 second-system 风险`
- dominance_verdict: `current C003-R3 baseline is dominated by P1`

### Freeze Record

- adopted_summary: `当前不冻结 exact witness shape；derivationReceiptRef 与 bundlePatchRef 继续作为 evidence envelope 内部 opaque refs；internal scoped-seq 只作为 future implementation candidate，不构成半冻结`
- kernel_verdict: `通过 Ramanujan / Kolmogorov / Godel gate；保持概念数更低，同时不削弱 C003-R2.1 的 witness law`
- frozen_decisions:
  - 当前不冻结 exact witness shape
  - `derivationReceiptRef` 与 `bundlePatchRef` 继续只作为 evidence envelope 内部 opaque refs
  - 当前不冻结 `Opaque<...>`、`BundleKey`、`DerivationWitness`、`BundlePatchWitness` 这类 exact object / typing shape
  - `internal scoped-seq witness shape` 只作为 future implementation candidate / reopen bias
  - exact shape 进入 freeze 的条件：现有 opaque refs 无法对 W1-W4 与 `C003-R2.1` 所需 witness 提供机械可区分性，且补 law 仍无法解决
- non_goals:
  - 现在就冻结 exact witness shape
  - 现在就冻结 public parseable ref grammar
  - 现在就新增 diagnostics helper / object surface
- allowed_reopen_surface:
  - exact witness shape
  - internal scoped-seq witness shape
  - split bundle / per-slot causal refs
- proof_obligations:
  - 证明 opaque refs 无法提供 mechanical distinguishability
  - 证明补 law 无法解决 witness gap
  - 证明 exact shape 不会放大 second-system 风险
- delta_from_previous_round:
  - from exact shape question to deferred no-better freeze

## Round 2

### Phase

- converge

### Input Residual

- residual: exact witness shape remains deferred

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- `exact witness shape deferred, opaque-ref law -> confirmed`
- exact witness shape remains reopen surface, not unresolved finding

## Consensus

- reviewers: `A1/A2/A3/A4`
- adopted_candidate: `C003-R3.1 exact witness shape deferred, opaque-ref law`
- final_status: `consensus reached with residual risk`
- stop_rule_satisfied: `true`
- residual_risk:
  - exact witness shape 仍未冻结
  - internal scoped-seq witness shape 是否更适合实现，仍待实现期或更强 witness
  - split bundle / per-slot causal refs 仍待 bundle atomicity 证伪
