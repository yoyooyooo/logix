# Runtime Causal-Links Summary Law Review Ledger

## Meta

- target: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/155-form-api-shape/challenge-runtime-causal-links-summary-law.md`
- source_kind: `file-spec`
- reviewers: `A1/A2/A3/A4`
- round_count: `1`
- challenge_scope: `frozen`
- consensus_status: `consensus`

## Bootstrap

- target_complete: `true`
- challenge_scope: `frozen`
- reviewer_set: `A1/A2/A3/A4`
- active_advisors: `Shannon`
- activation_reason: `本轮聚焦 evidence summary 的信息压缩与 digest 稳定性`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan / Kolmogorov / Godel`
- dominance_axes: `concept-count / public-surface / compat-budget / migration-cost / proof-strength / future-headroom`
- stop_rule: `只有形成可冻结的 summary law 或明确 blocker，本轮才算完成`
- reopen_bar: `不得重开 AC3.3 public contract 与 C003 law；本轮只收 summary law`
- ledger_path: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-22-form-api-shape-runtime-causal-links-summary-law.md`
- writable: `true`

## Assumptions

- A1:
  - summary: 本轮只审 `causal-links` summary law，不重开 broader substrate
  - status: `kept`
  - resolution_basis: 当前最小 blocker 已收缩到 summary law
- A2:
  - summary: summary law 必须服务 compare digest 与 focusRef
  - status: `kept`
  - resolution_basis: 没有 digest / focusRef 就不能形成 canonical compare substrate
- A3:
  - summary: summary row 只承载 backlink truth，不重建第二 diagnostics object
  - status: `kept`
  - resolution_basis: `153` 与 `C003` 已冻结单一 diagnostics truth
- A4:
  - summary: 若 summary law 仍不足以落地，本轮也可以以 not-ready 收口
  - status: `kept`
  - resolution_basis: 不能用半成品 summary law 代替真正可比较证据

## Round 1

### Phase

- challenge

### Input Residual

- residual: canonical `causal-links` summary law

### Findings

- F1 `critical` `ambiguity`:
  - summary: `causal-links` 还缺 canonical summary law，无法稳定生成 `evidenceSummaryDigest` 与 `focusRef`
  - evidence: `A1/A4` 交集
  - status: `adopted`
- F2 `high` `ambiguity`:
  - summary: `stale` 不能继续被漏在 negative proof 之外，必须显式区分 current reason 与 terminal backlink
  - evidence: `A2`
  - status: `adopted`
- F3 `high` `ambiguity`:
  - summary: row-heavy summary row 不能省掉 `canonicalRowIdChainDigest`、`patchKind / supersedesBundlePatchRef`，否则 `reorder / replace` 解释会被压扁
  - evidence: `A3`
  - status: `adopted`
- F4 `high` `ambiguity`:
  - summary: summary row 还缺 `retention(live|terminal|subordinate)` 轴，且 digest 是否吃 opaque refs 尚未写死
  - evidence: `A1/A2` 交集
  - status: `adopted`

### Counter Proposals

- P1:
  - summary: `TRACE-S1 causal-links summary law`
  - why_better: 不冻结更大的 substrate，却把 summary row schema、ordering、digest normalization、focusRef mapping 一次收口
  - overturns_assumptions: `none`
  - resolves_findings: `F1 F2 F3 F4`
  - supersedes_proposals: `none`
  - dominance: `dominates`
  - axis_scores: `concept-count +1 / public-surface +1 / compat-budget +1 / migration-cost +1 / proof-strength +3 / future-headroom +1`
  - status: `adopted`

### Resolution Delta

- `F1 F2 F3 F4 -> adopted`
- `P1 -> adopted as TRACE-S1`

## Adoption

- adopted_candidate: `TRACE-S1 causal-links summary law`
- lineage: `TRACE -> summary law`
- rejected_alternatives:
  - deferring summary law longer
- rejection_reason: `不先收 summary law，digest 与 focusRef 都无法稳定`
- dominance_verdict: `summary law is ready even though full substrate remains not-ready`

### Freeze Record

- adopted_summary: `当前已可冻结 `causal-links` summary law：row schema、ordering、digest normalization、focusRef mapping、negative proof 一次收口；full substrate 仍 not-ready`
- kernel_verdict: `通过 Ramanujan / Kolmogorov / Godel gate；先冻结最小 blocker，不扩大 substrate 讨论面`
- frozen_decisions:
  - row 粒度固定为 “一个 bundle lineage 节点”
  - 每条 row 必带 `retention(live|terminal|subordinate)` 轴
  - `transition` 只收 `write | clear | retire | cleanup | reason-link`
  - row-scoped bundle 时 `canonicalRowIdChainDigest` 为必填
  - `focusRef` 只允许复制既有 `declSliceId / witnessStepId / reasonSlotId / sourceRef`
  - `sourceRef` 使用 typed opaque id 组合 `bundlePatch / terminal / derivationReceipt / sourceReceipt / rowChain`
  - `retention=live` 只允许当前生效 bundle head
  - `retention=subordinate` 只允许 `cleanup | stale`
  - `retention=terminal` 只允许 `clear | retire` 及其终止旧 live row
  - 若 opaque refs 仍非确定 id，它们退出 `evidenceSummaryDigest`，只保留在 summary row 供下钻
- non_goals:
  - 现在就冻结 full scenario substrate
  - 现在就冻结 compare diff substrate

## Consensus

- reviewers: `A1/A2/A3/A4`
- adopted_candidate: `TRACE-S1 causal-links summary law`
- final_status: `consensus reached with remaining substrate blocker`
- stop_rule_satisfied: `true`
- residual_risk:
  - compare 仍缺 row-level evidence summary diff substrate
  - `focusRef` 仍不能无损承载所有 row-heavy summary row
  - `sourceReceiptRef / derivationReceiptRef / bundlePatchRef` 的 deterministic opaque id 语义仍需单独冻结
