# S1-R2 Row-Heavy Owner Binding Carrier Review Ledger

## Meta

- target: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/155-form-api-shape/challenge-s1-r2-owner-binding-carrier.md`
- source_kind: `file-spec`
- reviewers: `A1/A2/A3/A4`
- round_count: `2`
- challenge_scope: `frozen`
- consensus_status: `consensus`

## Bootstrap

- target_complete: `true`
- challenge_scope: `frozen`
- reviewer_set: `A1/A2/A3/A4`
- active_advisors: `von Neumann`
- activation_reason: `S1-R2 聚焦 row-heavy carrier、replace/cleanup 一致性与第二 family 风险`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan / Kolmogorov / Godel`
- dominance_axes: `concept-count / public-surface / compat-budget / migration-cost / proof-strength / future-headroom`
- stop_rule: `只有通过 Ramanujan / Kolmogorov / Godel gate，且在 owner binding carrier 目标函数上形成严格改进，才允许替换当前 S1-R2 基线`
- reopen_bar: `不得重开 S1.1 route law、S1-R1.1 selector law、owner split、field-only、slot inventory、exact ui path deferred；除非 reviewer 先证明 carrier 目标在这些冻结前提下不可成立`
- ledger_path: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-22-form-api-shape-s1-r2-owner-binding-carrier.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `S1-R2` 只审 row-heavy owner binding carrier，不重开 S1.1 与 S1-R1.1
  - status: `kept`
  - resolution_basis: 当前 residual 已收缩到 exact carrier 载体
- A2:
  - summary: carrier 必须与 `149` 的 canonical row identity theorem 保持一致
  - status: `kept`
  - resolution_basis: row-heavy 读取若脱离 canonical rowId，就会退回第二 identity
- A3:
  - summary: carrier 必须与 `151` 的 roster replacement / cleanup law 保持一致
  - status: `kept`
  - resolution_basis: owner binding 若与 cleanup 断链，会形成 stale carrier truth
- A4:
  - summary: 若当前还不该冻结 exact carrier，本轮也可以以 no-better verdict 收口
  - status: `kept`
  - resolution_basis: plan-optimality-loop 允许 no strictly better candidate 作为有效结论

## Round 1

### Phase

- challenge

### Input Residual

- residual: row-heavy owner binding carrier

### Findings

- F1 `critical` `ambiguity`:
  - summary: 当前 residual 的真正缺口是 row-heavy owner binding carrier 的 admissibility，而不是 exact noun 本身
  - evidence: `A1/A2/A3/A4` 交集
  - status: `adopted`
- F2 `critical` `controversy`:
  - summary: 新 `rowBinding` / token / helper family 会长第二 read family
  - evidence: `A1/A2/A4` 交集
  - status: `adopted`
- F3 `high` `ambiguity`:
  - summary: carrier 必须与 canonical rowId theorem、roster replacement、cleanup law 同时一致
  - evidence: `A2/A3/A4` 交集
  - status: `adopted`
- F4 `medium` `ambiguity`:
  - summary: stale / cleanup diagnostics 只能作为 backlink，不得形成继续参与读取的残留 truth
  - evidence: `A1/A3/A4` 交集
  - status: `adopted`

### Counter Proposals

- P1:
  - summary: `S1-R2.1 row-heavy carrier admissibility law`
  - why_better: 不冻结新载体，却把 row-heavy owner binding 的准入条件与 stale/cleanup 规则冻结下来
  - overturns_assumptions: `none`
  - resolves_findings: `F1 F2 F3 F4`
  - supersedes_proposals: `none`
  - dominance: `dominates`
  - axis_scores: `concept-count +2 / public-surface +2 / compat-budget +1 / migration-cost +1 / proof-strength +2 / future-headroom +1`
  - status: `adopted`
- P2:
  - summary: `existing-handle-as-owner-carrier`
  - why_better: 通过既有 handle family 极小延伸承接 row-heavy owner binding
  - overturns_assumptions: `none`
  - resolves_findings: `F1 F3`
  - supersedes_proposals: `none`
  - dominance: `partial`
  - axis_scores: `concept-count 0 / public-surface -1 / compat-budget 0 / migration-cost 0 / proof-strength +2 / future-headroom 0`
  - status: `deferred`

### Resolution Delta

- `F1 F2 F3 F4 -> adopted`
- `P1 -> adopted as S1-R2.1`
- `P2 -> deferred until stronger witness proves exact carrier is needed`

## Adoption

- adopted_candidate: `S1-R2.1 row-heavy carrier admissibility law`
- lineage: `S1.1 -> S1-R1.1 -> S1-R2 -> P1`
- rejected_alternatives:
  - new `rowBinding` / token / helper family
  - index-based / path-based / render-residue carrier
  - immediate exact carrier freeze
- rejection_reason: `要么新增第二 family，要么在证据不足时过早冻结 exact 载体`
- dominance_verdict: `current S1-R2 baseline is dominated by P1`

### Freeze Record

- adopted_summary: `当前只冻结 row-heavy owner binding 的 admissibility law：任何 carrier 若未来进入公开面，都必须 fresh resolve、走 canonical rowId chain、与 roster replacement / cleanup law 一致，并且 stale / cleanup diagnostics 不形成残留 truth；exact carrier 继续 deferred`
- kernel_verdict: `通过 Ramanujan / Kolmogorov / Godel gate；在不增加 public surface 的前提下提高 proof-strength`
- frozen_decisions:
  - 当前不冻结 exact carrier noun / import shape / path grammar / token / helper noun / fieldHandle family
  - 任何 row-heavy owner binding carrier 都必须 fresh resolve against current roster + active set
  - 单字段 owner 由 canonical field path 唯一确定
  - list / nested list 只允许 canonical rowId chain 重入
  - 禁止 index、object ref、render history、local synthetic id、path teaching
  - `replace` / delete / hide / active exit 后旧 binding 不再贡献事实，只允许进入 stale / cleanup diagnostics backlink
  - stale / cleanup diagnostics 不得形成可继续参与读取的残留 truth
- non_goals:
  - 现在就冻结 exact carrier noun / import shape
  - 现在就冻结既有 handle family 的极小延伸
  - 现在就冻结 roster-level companion aggregation read story
- allowed_reopen_surface:
  - exact carrier noun / import shape
  - 既有 handle family 是否足以安全承接
  - roster-level companion aggregation 是否需要更强 read story
  - diagnostics causal chain 的 host-side witness
- proof_obligations:
  - 证明 exact carrier 在 row-heavy witness 下比 admissibility freeze 更强且不增加 second-family 风险
  - 证明 stale / cleanup backlink 足以支撑 diagnostics readability
  - 证明 roster replacement / active exit 后不会残留 carrier truth
- delta_from_previous_round:
  - from deferred exact carrier to frozen admissibility law

## Round 2

### Phase

- converge

### Input Residual

- residual: exact carrier noun / import shape remains deferred

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- `row-heavy carrier admissibility law -> confirmed`
- exact carrier remains reopen surface, not unresolved finding

## Consensus

- reviewers: `A1/A2/A3/A4`
- adopted_candidate: `S1-R2.1 row-heavy carrier admissibility law`
- final_status: `consensus reached with residual risk`
- stop_rule_satisfied: `true`
- residual_risk:
  - exact carrier noun / import shape 仍未冻结
  - 既有 handle family 是否足以安全承接，仍待更强 witness
  - roster-level companion aggregation 是否需要更强 read story，仍待 witness
  - diagnostics causal chain 的 host-side witness 仍需补证据
