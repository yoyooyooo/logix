# Runtime Row-Level Summary Diff Substrate Review Ledger

## Meta

- target: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/155-form-api-shape/challenge-runtime-row-level-summary-diff-substrate.md`
- source_kind: `file-spec`
- reviewers: `A1/A2/A3/A4`
- round_count: `1`
- challenge_scope: `frozen`
- consensus_status: `consensus`

## Bootstrap

- target_complete: `true`
- challenge_scope: `frozen`
- reviewer_set: `A1/A2/A3/A4`
- active_advisors: `Shannon / Turing`
- activation_reason: `本轮目标是把 summary law 真正接到 compare/repair substrate`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan / Kolmogorov / Godel`
- dominance_axes: `concept-count / public-surface / compat-budget / migration-cost / proof-strength / future-headroom`
- stop_rule: `只有形成可冻结的 row-level diff substrate 或明确 blocker，本轮才算完成`
- reopen_bar: `不得重开 AC3.3 public contract 与 C003/TRACE 已冻结 law；本轮只补 diff substrate`
- ledger_path: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-22-form-api-shape-runtime-row-level-summary-diff-substrate.md`
- writable: `true`

## Assumptions

- A1:
  - summary: 本轮只审 row-level summary diff substrate，不修改 summary law
  - status: `kept`
  - resolution_basis: 当前 blocker 已从 summary law 收缩到 diff substrate
- A2:
  - summary: diff substrate 必须直接服务 `focusRef` 与 repair loop
  - status: `kept`
  - resolution_basis: compare 不能只停在 digest mismatch
- A3:
  - summary: negative proof atoms 必须能表达 clear/retire/cleanup/stale 退出 active truth
  - status: `kept`
  - resolution_basis: 这是当前 TRACE 最缺的证据能力
- A4:
  - summary: 若当前仍不该冻结 diff substrate，本轮也可以以 not-ready 收口
  - status: `kept`
  - resolution_basis: 不能用半成品 diff substrate 代替真实 compare substrate

## Round 1

### Phase

- challenge

### Input Residual

- residual: row-level summary diff substrate

### Findings

- F1 `critical` `ambiguity`:
  - summary: compare 还缺 row-level diff unit、stable key、stable ordering、digest normalization、focusRef projection 的一体化 law
  - evidence: `A1/A4` 交集
  - status: `adopted`
- F2 `high` `ambiguity`:
  - summary: `stale` 与 negative proof 还缺 canonical atom domain，否则 clear/retire/cleanup 退出 active truth 无法机械证明
  - evidence: `A2`
  - status: `adopted`
- F3 `high` `ambiguity`:
  - summary: row-heavy diff 必须先按 row identity 对齐，再比较 row atoms，不能退回 render order 或 position diff
  - evidence: `A3`
  - status: `adopted`

### Counter Proposals

- P1:
  - summary: `TRACE-S2 row-level summary diff substrate law`
  - why_better: 不扩大 diagnostics object，却把 compare substrate 最小可比单元一次收口
  - overturns_assumptions: `none`
  - resolves_findings: `F1 F2 F3`
  - supersedes_proposals: `none`
  - dominance: `dominates`
  - axis_scores: `concept-count +1 / public-surface +1 / compat-budget +1 / migration-cost +1 / proof-strength +3 / future-headroom +1`
  - status: `adopted`

### Resolution Delta

- `F1 F2 F3 -> adopted`
- `P1 -> adopted as TRACE-S2`

## Adoption

- adopted_candidate: `TRACE-S2 row-level summary diff substrate law`
- lineage: `TRACE-S1 -> row-level diff substrate`
- rejected_alternatives:
  - continuing with digest-only compare
- rejection_reason: `没有 row-level diff substrate，就无法形成可 repair 的 compare substrate`
- dominance_verdict: `row-level diff substrate is ready even though full runtime substrate remains not-ready`

### Freeze Record

- adopted_summary: `当前已可冻结 row-level summary diff substrate：SummaryDiffEntry、rowStableKey、rowComparablePayload、firstProjectableDiff、focusRef projection、negative proof atoms 一次收口`
- kernel_verdict: `通过 Ramanujan / Kolmogorov / Godel gate；先冻结最小 compare substrate，不扩大 diagnostics surface`
- frozen_decisions:
  - diff unit 固定为 `SummaryDiffEntry`
  - compare 先按 `rowStableKey` key-join，再产出 `added | removed | changed`
  - `rowStableKey` 只允许使用稳定字段；run-local refs 退出 key 与 ordering
  - `rowComparablePayload` 只保留 canonical JSON 的结构字段
  - `evidenceSummaryDigest` 由排序后的 `rowComparablePayload` 计算
  - compare 必须同时产出 `firstDiff` 与 `firstProjectableDiff`
  - `repairHints.focusRef` 绑定 `firstProjectableDiff`
  - negative proof atoms 最小集合：`noLiveHead / noContribution / staleRef / reasonSlotMustNotLink`
  - `reorder` 不得制造 diff；`replace` 只表达 old bucket 消失与 new bucket 出现
- non_goals:
  - 现在就冻结 compare route 的代码实现
  - 现在就冻结 deterministic opaque id exact shape

## Consensus

- reviewers: `A1/A2/A3/A4`
- adopted_candidate: `TRACE-S2 row-level summary diff substrate law`
- final_status: `consensus reached with remaining substrate blocker`
- stop_rule_satisfied: `true`
- residual_risk:
  - deterministic opaque stable ids 仍未冻结
  - compare 仍缺 row-level diff execution substrate
  - `focusRef` 仍不能无损承载所有 row-heavy summary row
