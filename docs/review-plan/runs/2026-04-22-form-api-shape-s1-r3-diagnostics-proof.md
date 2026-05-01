# S1-R3 Diagnostics Host-Side Witness Review Ledger

## Meta

- target: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/155-form-api-shape/challenge-s1-r3-diagnostics-proof.md`
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
- activation_reason: `S1-R3 聚焦 diagnostics witness、信息增益与第二解释面风险`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan / Kolmogorov / Godel`
- dominance_axes: `concept-count / public-surface / compat-budget / migration-cost / proof-strength / future-headroom`
- stop_rule: `只有通过 Ramanujan / Kolmogorov / Godel gate，且在 diagnostics witness 目标函数上形成严格改进，才允许替换当前 S1-R3 基线`
- reopen_bar: `不得重开 S1.1 route law、S1-R1.1 selector law、S1-R2.1 carrier admissibility law、owner split、field-only、slot inventory；除非 reviewer 先证明 diagnostics 目标在这些冻结前提下不可成立`
- ledger_path: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-22-form-api-shape-s1-r3-diagnostics-proof.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `S1-R3` 只审 diagnostics host-side witness，不重开 read-side route / selector / carrier law
  - status: `kept`
  - resolution_basis: 当前 residual 已收缩到 diagnostics witness
- A2:
  - summary: diagnostics witness 必须与 `153` 的 reason / evidence authority 一致
  - status: `kept`
  - resolution_basis: read-side explainability 若脱离 `153`，就会长第二 diagnostics truth
- A3:
  - summary: stale / cleanup diagnostics 只能作为 backlink 与回执，不能形成残留 truth
  - status: `kept`
  - resolution_basis: `151` 与 `S1-R2.1` 已把 stale / cleanup truth 收紧
- A4:
  - summary: 若当前还不该冻结 diagnostics witness，本轮也可以以 no-better verdict 收口
  - status: `kept`
  - resolution_basis: plan-optimality-loop 允许 no strictly better candidate 作为有效结论

## Round 1

### Phase

- challenge

### Input Residual

- residual: diagnostics host-side witness

### Findings

- F1 `critical` `ambiguity`:
  - summary: 当前 residual 的真正缺口是 host 侧还缺最小 backlink law，无法闭合 `source -> lower -> bundle patch -> selector read`
  - evidence: `A1/A2/A3/A4` 交集
  - status: `adopted`
- F2 `critical` `controversy`:
  - summary: host explain object / report shell / helper family / ui path readback 都会长第二解释面
  - evidence: `A1/A2/A3/A4` 交集
  - status: `adopted`
- F3 `high` `ambiguity`:
  - summary: diagnostics witness 必须与 `153` 的 `reasonSlotId / sourceRef / evidence envelope` 机械对齐
  - evidence: `A1/A2/A4` 交集
  - status: `adopted`
- F4 `medium` `ambiguity`:
  - summary: `stale / cleanup` 只能保留为 retirement backlink 或 cleanup receipt backlink，不得形成残留 truth
  - evidence: `A1/A3/A4` 交集
  - status: `adopted`

### Counter Proposals

- P1:
  - summary: `S1-R3.1 evidence-envelope host backlink law`
  - why_better: 不冻结新 object shape，却把 diagnostics witness 的最小 backlink law 收进统一 evidence envelope
  - overturns_assumptions: `none`
  - resolves_findings: `F1 F2 F3 F4`
  - supersedes_proposals: `none`
  - dominance: `dominates`
  - axis_scores: `concept-count +2 / public-surface +2 / compat-budget +1 / migration-cost +1 / proof-strength +3 / future-headroom +1`
  - status: `adopted`
- P2:
  - summary: `direct host witness object shape`
  - why_better: 通过冻结具体 pseudo shape 提高可教学性
  - overturns_assumptions: `none`
  - resolves_findings: `F1 F3`
  - supersedes_proposals: `none`
  - dominance: `partial`
  - axis_scores: `concept-count -1 / public-surface -1 / compat-budget 0 / migration-cost 0 / proof-strength +2 / future-headroom 0`
  - status: `rejected`

### Resolution Delta

- `F1 F2 F3 F4 -> adopted`
- `P1 -> adopted as S1-R3.1`
- `P2 -> rejected for freezing object shape too early`

## Adoption

- adopted_candidate: `S1-R3.1 evidence-envelope host backlink law`
- lineage: `S1.1 -> S1-R1.1 -> S1-R2.1 -> S1-R3 -> P1`
- rejected_alternatives:
  - host explain object / report shell / helper family
  - ui-path-based readback
  - immediate exact diagnostics object shape
- rejection_reason: `要么新增第二解释面，要么在证据不足时过早冻结 exact object`
- dominance_verdict: `current S1-R3 baseline is dominated by P1`

### Freeze Record

- adopted_summary: `当前只冻结 diagnostics witness 的 law：host-side witness 必须停在同一个 evidence envelope 内，最小 backlink 集合至少覆盖 ownerRef、sanctioned slot、canonicalRowIdChain?、bundlePatchRef、reasonSlotId?、sourceRef?；stale/cleanup 只作为 retirement backlink，不形成残留 truth；exact object shape 继续 deferred`
- kernel_verdict: `通过 Ramanujan / Kolmogorov / Godel gate；不增加 public surface，却显著提高 diagnostics proof-strength`
- frozen_decisions:
  - diagnostics witness 继续停在同一个 evidence envelope 内
  - host 侧不新增 explain object、report shell、helper family、ui path readback
  - 对任一 companion selector read，host-side witness 至少要能 backlink：`ownerRef`、当前 read 的 sanctioned slot、`canonicalRowIdChain?`、`bundlePatchRef`、`reasonSlotId?`、`sourceRef?`
  - `stale / cleanup` 只允许作为 retirement backlink 或 cleanup receipt backlink
  - `stale / cleanup` 不得形成继续参与读取的残留 truth
  - 当前不冻结 exact object shape、字段名、direct reader、helper noun、path grammar
- non_goals:
  - 现在就冻结 diagnostics witness exact shape
  - 现在就冻结 host explain object / report shell
  - 现在就冻结 companion 专属 diagnostics helper
- allowed_reopen_surface:
  - exact diagnostics object shape
  - `bundlePatchRef` 如何稳定覆盖 bundle clear / retirement
  - per-slot patch cadence / 分离 sourceRef 主线
  - roster-level companion aggregation 的 diagnostics 解释面
- proof_obligations:
  - 证明最小 backlink 集合足以解释 read-side diagnostics
  - 证明 stale / cleanup 继续停在 subordinate backlink 位置
  - 证明未来即使重开 exact shape，也不会长第二解释面
- delta_from_previous_round:
  - from deferred diagnostics witness to frozen backlink law

## Round 2

### Phase

- converge

### Input Residual

- residual: exact diagnostics object shape remains deferred

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- `evidence-envelope host backlink law -> confirmed`
- exact diagnostics object shape remains reopen surface, not unresolved finding

## Consensus

- reviewers: `A1/A2/A3/A4`
- adopted_candidate: `S1-R3.1 evidence-envelope host backlink law`
- final_status: `consensus reached with residual risk`
- stop_rule_satisfied: `true`
- residual_risk:
  - exact diagnostics object shape 仍未冻结
  - `bundlePatchRef` 如何稳定覆盖 bundle clear / retirement 仍待更强 witness
  - per-slot patch cadence 或分离的 `sourceRef` 主线，可能要求重开 bundle-level witness
