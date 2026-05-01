# Runtime Deterministic Opaque Id Law Review Ledger

## Meta

- target: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/155-form-api-shape/challenge-runtime-deterministic-opaque-id-law.md`
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
- activation_reason: `本轮目标是把 summary/diff 依赖的 stable opaque ids 一次收口`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan / Kolmogorov / Godel`
- dominance_axes: `concept-count / public-surface / compat-budget / migration-cost / proof-strength / future-headroom`
- stop_rule: `只有形成可冻结的 deterministic opaque id law 或明确 blocker，本轮才算完成`
- reopen_bar: `不得重开 AC3.3 public contract 与 TRACE-S1/TRACE-S2 law；本轮只收 stable id law`
- ledger_path: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-22-form-api-shape-runtime-deterministic-opaque-id-law.md`
- writable: `true`

## Assumptions

- A1:
  - summary: 本轮只审 deterministic opaque ids，不重开 summary/diff law
  - status: `kept`
  - resolution_basis: 当前 blocker 已收缩到 stable id 语义
- A2:
  - summary: run-local refs 一旦不稳定，就必须退出 digest/key
  - status: `kept`
  - resolution_basis: 否则 compare 与 focusRef 会漂
- A3:
  - summary: stable opaque ids 不能变成第二 diagnostics object
  - status: `kept`
  - resolution_basis: 只允许作为 id/ref，不允许带第二 truth
- A4:
  - summary: 若当前仍不该冻结 stable ids，本轮也可以以 not-ready 收口
  - status: `kept`
  - resolution_basis: 不能用半成品 id 语义代替可比较证据

## Round 1

### Phase

- challenge

### Input Residual

- residual: deterministic opaque stable ids for summary/diff/focus

### Findings

- F1 `critical` `ambiguity`:
  - summary: stable id law 还没分清“能进 key/digest/focus”的 refs 与“只能下钻”的 refs
  - evidence: `A1/A2` 交集
  - status: `adopted`
- F2 `high` `ambiguity`:
  - summary: row-heavy 场景里，row identity 仍是稳定主锚；若 `rowStableKey` 不先绑定 `canonicalRowIdChainDigest`，reorder/replace 会漂
  - evidence: `A3`
  - status: `adopted`
- F3 `high` `ambiguity`:
  - summary: `sourceRef` 不能再吃 run-local receipt/patch refs，必须只吃 stable source locus
  - evidence: `A1/A2` 交集
  - status: `adopted`

### Counter Proposals

- P1:
  - summary: `TRACE-S3 deterministic opaque id admission law`
  - why_better: 不冻结 exact id shape，却先把 stable-vs-debug、row anchor、sourceRef admission 这三组规则收紧
  - overturns_assumptions: `none`
  - resolves_findings: `F1 F2 F3`
  - supersedes_proposals: `none`
  - dominance: `dominates`
  - axis_scores: `concept-count +1 / public-surface +1 / compat-budget +1 / migration-cost +1 / proof-strength +2 / future-headroom +2`
  - status: `adopted`

### Resolution Delta

- `F1 F2 F3 -> adopted`
- `P1 -> adopted as TRACE-S3`

## Adoption

- adopted_candidate: `TRACE-S3 deterministic opaque id admission law`
- lineage: `TRACE-S1 -> TRACE-S2 -> stable-id admission`
- rejected_alternatives:
  - letting run-local refs participate in digest/key
  - freezing exact typed witness objects too early
- rejection_reason: `当前最值的是先收 admission law，不是直接冻结 typed id shape`
- dominance_verdict: `stable id admission law is ready, while exact id constructors remain unresolved`

### Freeze Record

- adopted_summary: `当前已可冻结 deterministic opaque id admission law：哪些 refs 可进 key/digest/focus，哪些只做下钻，row-heavy 场景先锚 canonicalRowIdChainDigest`
- kernel_verdict: `通过 Ramanujan / Kolmogorov / Godel gate；先冻结最小稳定性规则，不扩大 diagnostics surface`
- frozen_decisions:
  - stable core ids：`declSliceId / ownerRef / reasonSlotId / witnessStepId / canonicalRowIdChainDigest`
  - row-heavy 行上，`canonicalRowIdChainDigest` 为 rowStableKey 主锚点
  - `sourceReceiptRef / bundlePatchRef` 只有在证明 deterministic opaque stable id 后，才可进 key/digest/focus
  - `derivationReceiptRef` 当前只做 debug/backlink，不进 key/digest/focus
  - 非稳定 refs 必须同时退出 key/ordering/digest/focus
  - `sourceRef` 只允许从 stable source locus 派生
- non_goals:
  - 现在就冻结 exact typed witness shape
  - 现在就让所有 receipt/patch refs 进 digest

## Consensus

- reviewers: `A1/A2/A3`
- adopted_candidate: `TRACE-S3 deterministic opaque id admission law`
- final_status: `consensus reached with remaining blocker`
- stop_rule_satisfied: `true`
- residual_risk:
  - `bundlePatchRef` family 的 deterministic constructor 仍未冻结
  - `sourceReceiptRef` 是否可入 digest 仍待更强 witness
  - `focusRef.sourceRef` 的最终优先级仍需和 compare substrate 一起收口
