# S1-R4 Exact Carrier Noun And Import Shape Review Ledger

## Meta

- target: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/155-form-api-shape/challenge-s1-r4-exact-carrier-noun.md`
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
- activation_reason: `S1-R4 聚焦 exact carrier noun/import shape，对外可理解性与第二 family 风险`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan / Kolmogorov / Godel`
- dominance_axes: `concept-count / public-surface / compat-budget / migration-cost / proof-strength / future-headroom`
- stop_rule: `只有通过 Ramanujan / Kolmogorov / Godel gate，且在 exact carrier 目标函数上形成严格改进，才允许替换当前 S1-R4 基线`
- reopen_bar: `不得重开 S1 / S2 / C003 已冻结的 laws；除非 reviewer 先证明 exact carrier 问题在这些冻结前提下不可成立`
- ledger_path: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-22-form-api-shape-s1-r4-exact-carrier-noun.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `S1-R4` 只审 exact carrier noun/import shape，不重开 law 层冻结
  - status: `kept`
  - resolution_basis: 当前最靠近 authority 的缺口已经收缩到 exact carrier 层
- A2:
  - summary: exact carrier 若存在，必须优先复用既有 handle family 或明确 no-better
  - status: `kept`
  - resolution_basis: 当前不允许为了便利性再长第二 family
- A3:
  - summary: exact carrier 必须继续服从 row identity / cleanup / diagnostics 三条主线
  - status: `kept`
  - resolution_basis: carrier 若破坏三条主线，收益不足以支撑 reopen
- A4:
  - summary: 若当前仍不该冻结 exact carrier，本轮也可以以 no-better verdict 收口
  - status: `kept`
  - resolution_basis: plan-optimality-loop 允许 no strictly better candidate 作为有效结论

## Round 1

### Phase

- challenge

### Input Residual

- residual: exact carrier noun / import shape

### Findings

- F1 `critical` `ambiguity`:
  - summary: 当前 residual 更像 exact carrier 是否值得冻结的问题，不是 law 层能力不足
  - evidence: `A1/A2/A3/A4` 交集
  - status: `adopted`
- F2 `critical` `controversy`:
  - summary: 新 helper/token/descriptor/import 或过早升格 `byRowId` 都会增加 second-family 或 stale truth 风险
  - evidence: `A1/A2/A3/A4` 交集
  - status: `adopted`
- F3 `high` `ambiguity`:
  - summary: 若未来要重开，最优先应先证明既有 `fieldArray(...).byRowId(...)` family 是否足以承接
  - evidence: `A1/A2/A4` 交集
  - status: `adopted`

### Counter Proposals

- P1:
  - summary: `S1-R4.1 exact carrier deferred, byRowId-first reopen bias, no half-freeze`
  - why_better: 不冻结新载体，却把未来 reopen 的搜索顺序和进入 exact freeze 的硬门槛收紧
  - overturns_assumptions: `none`
  - resolves_findings: `F1 F2 F3`
  - supersedes_proposals: `none`
  - dominance: `dominates`
  - axis_scores: `concept-count +1 / public-surface +2 / compat-budget +1 / migration-cost +1 / proof-strength +2 / future-headroom +1`
  - status: `adopted`

### Resolution Delta

- `F1 F2 F3 -> adopted`
- `P1 -> adopted as S1-R4.1`

## Adoption

- adopted_candidate: `S1-R4.1 exact carrier deferred, byRowId-first reopen bias, no half-freeze`
- lineage: `S1-R2.1 -> S1-R4 -> P1`
- rejected_alternatives:
  - new helper/token/descriptor/import story
  - immediate `byRowId` sanctioned read carrier freeze
  - row-heavy exact carrier half-freeze
- rejection_reason: `要么新增 second-family 风险，要么在证据不足时过早冻结 exact 载体`
- dominance_verdict: `current S1-R4 baseline is dominated by P1`

### Freeze Record

- adopted_summary: `当前不冻结 exact carrier noun/import shape；但若未来需要重开，必须先证明既有 byRowId family 是否足以承接，再考虑任何新 noun/import；在此之前不允许半冻结 read carrier`
- kernel_verdict: `通过 Ramanujan / Kolmogorov / Godel gate；不增加 public surface，却降低 second-family 歧义`
- frozen_decisions:
  - 当前不冻结 exact carrier noun / import shape
  - 当前不把 `fieldArray(...).byRowId(...)` 视为已获 sanctioned read carrier 地位
  - 若未来需要重开 exact carrier，必须先证明既有 `fieldArray(...).byRowId(...)` family 是否足以承接，再考虑任何新 noun / token / helper family
  - nested list 的逐层 `fieldArray(...).byRowId(...)` 重入，目前只算未来 reopen 时的优先搜索方向，不构成已冻结的 exact 递进语法
  - 任何 exact carrier 候选若不能同时说明 read-route 拼接、second-family 风险、stale carrier 退出、diagnostics/cleanup 单一真相，就不能进入 exact freeze
- non_goals:
  - 现在就冻结 exact carrier noun / import shape
  - 现在就冻结 `byRowId` 的 read carrier 地位
  - 现在就冻结 selector slot read 或 projection bucket
- allowed_reopen_surface:
  - exact carrier noun / import shape
  - `byRowId` family 是否足以安全承接
  - nested row chain 的 exact 承载语法
- proof_obligations:
  - 证明 exact carrier 可以零新增 read family、零 stale carrier truth
  - 证明 exact carrier 与 diagnostics / cleanup law 保持单一真相
  - 证明 `byRowId` 复用或替代方案在 witness 下严格更优
- delta_from_previous_round:
  - from open exact carrier residual to no-half-freeze reopen bias

## Round 2

### Phase

- converge

### Input Residual

- residual: exact carrier remains deferred

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- `exact carrier deferred, byRowId-first reopen bias, no half-freeze -> confirmed`
- exact carrier noun/import shape remains reopen surface, not unresolved finding

## Consensus

- reviewers: `A1/A2/A3/A4`
- adopted_candidate: `S1-R4.1 exact carrier deferred, byRowId-first reopen bias, no half-freeze`
- final_status: `consensus reached with residual risk`
- stop_rule_satisfied: `true`
- residual_risk:
  - exact carrier noun / import shape 仍未冻结
  - `byRowId` family 是否足以安全承接，仍待更强 witness
  - nested row chain 的 exact 承载语法仍未冻结
