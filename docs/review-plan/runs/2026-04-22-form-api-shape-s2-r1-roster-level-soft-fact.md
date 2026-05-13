# S2-R1 Roster-Level Soft Fact Witness Review Ledger

## Meta

- target: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/155-form-api-shape/challenge-s2-r1-roster-level-soft-fact.md`
- source_kind: `file-spec`
- reviewers: `A1/A2/A3/A4`
- round_count: `1`
- challenge_scope: `frozen`
- consensus_status: `consensus`

## Bootstrap

- target_complete: `true`
- challenge_scope: `frozen`
- reviewer_set: `A1/A2/A3/A4`
- active_advisors: `Hamming`
- activation_reason: `S2-R1 聚焦最后一个可能推翻 field-only 的高价值触发器`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan / Kolmogorov / Godel`
- dominance_axes: `concept-count / public-surface / compat-budget / migration-cost / proof-strength / future-headroom`
- stop_rule: `只有通过 Ramanujan / Kolmogorov / Godel gate，且在 roster-level soft fact 目标函数上形成严格改进，才允许替换当前 S2-R1 基线`
- reopen_bar: `不得重开 S1 read-side laws、C003 diagnostics laws、source/settlement/reason owner；除非 reviewer 先证明 roster-level soft fact 在这些冻结前提下不可成立`
- ledger_path: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-22-form-api-shape-s2-r1-roster-level-soft-fact.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `S2-R1` 只审 roster-level soft fact，不重开 read/diagnostics law
  - status: `kept`
  - resolution_basis: 当前主线最可能 reopen trigger 已收缩到 roster-level soft fact
- A2:
  - summary: list/root companion 只有在 irreducible witness 出现时才允许重开
  - status: `kept`
  - resolution_basis: `AC3.3` 当前仍以 field-only 为最小 day-one owner scope
- A3:
  - summary: roster-level witness 必须先排除 list DSL / rule / settlement / reason / source 既有 owner
  - status: `kept`
  - resolution_basis: 不能用 companion 抢已有 owner 的 truth
- A4:
  - summary: 若当前仍无 irreducible witness，本轮也可以以 no-better verdict 收口
  - status: `kept`
  - resolution_basis: plan-optimality-loop 允许 no strictly better candidate 作为有效结论

## Round 1

### Phase

- challenge

### Input Residual

- residual: irreducible roster-level soft fact witness

### Findings

- F1 `critical` `ambiguity`:
  - summary: 本轮枚举的 roster-level witness 都能归到 existing owner，未发现必须归 companion 的 soft fact
  - evidence: `A1/A2/A3/A4` 交集
  - status: `adopted`
- F2 `high` `controversy`:
  - summary: `list().companion` 当前会复制 source / rule / reason / cleanup / list DSL owner
  - evidence: `A1/A3/A4` 交集
  - status: `adopted`
- F3 `high` `ambiguity`:
  - summary: 当前最接近的 trigger 是 list operation availability，但 owner 仍更接近 list DSL / active-shape / settlement
  - evidence: `A2/A4` 交集
  - status: `adopted`

### Counter Proposals

- P1:
  - summary: `S2-R1.1 no irreducible roster-level soft fact`
  - why_better: 不重开 list/root companion，同时把各类 roster-level witness 的 existing owner 路由写清
  - overturns_assumptions: `none`
  - resolves_findings: `F1 F2 F3`
  - supersedes_proposals: `none`
  - dominance: `dominates`
  - axis_scores: `concept-count +2 / public-surface +2 / compat-budget +1 / migration-cost +1 / proof-strength +2 / future-headroom +1`
  - status: `adopted`

### Resolution Delta

- `F1 F2 F3 -> adopted`
- `P1 -> adopted as S2-R1.1`

## Adoption

- adopted_candidate: `S2-R1.1 no irreducible roster-level soft fact`
- lineage: `S2.1 -> S2-R1 -> P1`
- rejected_alternatives:
  - immediate `list().companion`
  - immediate `root().companion`
  - roster-level companion for row chrome / shared pool / batch remote / list operation availability / summary facts
- rejection_reason: `当前所有 witness 都能归到 existing owner，没有 owner-level 失配证据`
- dominance_verdict: `current S2-R1 baseline is dominated by P1`

### Freeze Record

- adopted_summary: `当前没有不可分解的 roster-level soft fact；field-only companion 继续成立，list/root companion 继续关闭`
- kernel_verdict: `通过 Ramanujan / Kolmogorov / Godel gate；不扩大 owner scope，同时提高 witness routing proof`
- frozen_decisions:
  - row chrome 继续归 `field availability`、`reason`、`renderer` 或 `host projection`
  - roster pool 继续归 `source + field candidates`，互斥/配额失败归 `rule / reason`
  - batch remote fact 继续归 Query-owned `source`，pending/blocking 归 `settlement`，explain 归 `reason`
  - add/remove/move/swap availability 继续归 list DSL / active-shape / settlement
  - cross-row summary 继续归 `reason / renderer / host projection`
  - 当前不重开 `list().companion` 或 `root().companion`
- non_goals:
  - 现在就冻结 list/root companion exact contract
  - 用 render chrome 或 host summary 触发 owner-scope reopen
- allowed_reopen_surface:
  - list-level companion only after irreducible roster-level soft fact witness
  - root-level companion only after list-level witness仍不足以承接
- proof_obligations:
  - 证明该 soft fact 无法 field-local 化
  - 证明它无法归 source / rule / settlement / reason / list DSL / host projection
  - 证明 host selector 推导会丢 cleanup 或 diagnostics backlink

## Consensus

- reviewers: `A1/A2/A3/A4`
- adopted_candidate: `S2-R1.1 no irreducible roster-level soft fact`
- final_status: `consensus reached with no-better verdict`
- stop_rule_satisfied: `true`
- residual_risk:
  - 未来若出现稳定 list/root 级 soft slice，仍需重开
