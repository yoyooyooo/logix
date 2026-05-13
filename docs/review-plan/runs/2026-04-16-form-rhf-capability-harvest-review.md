# Form RHF Capability Harvest Review Ledger

## Meta

- target: `docs/proposals/form-rhf-capability-harvest.md`
- targets:
  - `docs/proposals/form-rhf-capability-harvest.md`
  - `docs/ssot/form/02-gap-map-and-target-direction.md`
  - `docs/ssot/form/03-kernel-form-host-split.md`
  - `docs/ssot/form/06-capability-scenario-api-support-map.md`
- source_kind: `file-ssot-contract`
- reviewers: `A1, A2, A3, A4`
- round_count: `2`
- challenge_scope: `open`
- consensus_status: `closed`

## Bootstrap

- target_complete: `authority target=RHF capability harvest delta; bound docs cover semantic closure, static IR / trial, rule x i18n, public composition law, and react host projection boundary`
- review_contract:
  - artifact_kind: `ssot-contract`
  - review_goal: `zero-unresolved`
  - target_claim: `under zero-user and forward-only assumptions, Form should absorb RHF's strongest user-facing strengths only where they materially improve scenario coverage, projection ergonomics, diagnostics, or planning closure inside our existing single-truth architecture, without copying RHF surface families, string-error contracts, register model, or proxy-shaped host truth`
  - non_default_overrides: `challenge scope=open; target includes authority bucketing, writeback routing, host-projection obligations, semantic planning deltas, and docs-only diagnostics`
- review_object_manifest:
  - source_inputs:
    - `docs/proposals/form-rhf-capability-harvest.md`
    - `docs/proposals/form-semantic-closure-contract.md`
    - `docs/proposals/form-static-ir-trial-contract.md`
    - `docs/proposals/form-rule-i18n-message-contract.md`
    - `docs/review-plan/runs/2026-04-16-form-public-composition-law-review.md`
    - `docs/ssot/form/02-gap-map-and-target-direction.md`
    - `docs/ssot/form/03-kernel-form-host-split.md`
    - `docs/ssot/form/06-capability-scenario-api-support-map.md`
    - `docs/ssot/runtime/10-react-host-projection-boundary.md`
  - materialized_targets:
    - `docs/proposals/form-rhf-capability-harvest.md`
    - `docs/ssot/form/02-gap-map-and-target-direction.md`
    - `docs/ssot/form/03-kernel-form-host-split.md`
    - `docs/ssot/form/06-capability-scenario-api-support-map.md`
  - authority_target: `form-rhf-capability-harvest@2026-04-16`
  - bound_docs:
    - `docs/ssot/form/05-public-api-families.md`
    - `docs/ssot/form/13-exact-surface-contract.md`
    - `docs/ssot/runtime/10-react-host-projection-boundary.md`
    - `docs/ssot/form/01-current-capability-map.md`
  - derived_scope: `RHF capability harvest and adoption planning only`
  - allowed_classes:
    - `harvested capability identification`
    - `adoption vs rejection boundary`
    - `authority bucket selection`
    - `list semantics`
    - `error lifetime planning`
    - `projection ergonomics`
    - `docs/diagnostics routing`
  - blocker_classes:
    - `API copying disguised as harvesting`
    - `second host truth`
    - `second error contract`
    - `second hook family`
    - `competitor survey bloat`
    - `open planning anchor leaking into exact authority`
  - ledger_target: `docs/review-plan/runs/2026-04-16-form-rhf-capability-harvest-review.md`
- challenge_scope: `open`
- reviewer_set: `A1, A2, A3, A4`
- active_advisors: `A4`
- activation_reason: `目标涉及 public contract、host law、future planning、长期治理，需要直接挑战目标函数与 authority bucket`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan, Kolmogorov, Godel`
- dominance_axes: `concept-count, public-surface, compat-budget, migration-cost, proof-strength, future-headroom`
- stop_rule:
  - `Ramanujan gate`: 至少压掉一个重复 ledger、一个错位 authority writeback、或一段 competitor-survey 冗余
  - `Kolmogorov gate`: `concept-count / public-surface / compat-budget` 不能整体变差；若核心轴不变，必须在 `proof-strength` 或 `future-headroom` 上形成严格改进
  - `Godel gate`: 不得引入第二 host truth、第二 error contract、第二 hook family、第二 workflow 或未解释矛盾
- reopen_bar: `只有出现更小更强且能同时压掉 writeback 漂移与 proof gap 的候选时，才允许 reopen`
- ledger_path: `docs/review-plan/runs/2026-04-16-form-rhf-capability-harvest-review.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `projection ergonomics 的 owner 与 carrier 可以后置，写成“继续通过 core selector law 消费”就够了`
  - status: `overturned`
  - resolution_basis: `A1/A3/A4 一致要求 H1/H3/H5 先绑定 authority bucket，再决定 writeback。`
- A2:
  - summary: `RHF harvested capability 需要按 H1 到 H6 各自独立 narrative 维护`
  - status: `overturned`
  - resolution_basis: `A2 要求压成单一 harvest ledger，避免 proposal 自己长出重复 ledger。`
- A3:
  - summary: `error lifetime 可以继续靠 manual / submit / global 来源特例表来解释`
  - status: `overturned`
  - resolution_basis: `A1/A3 都要求改成 `origin × scope × clear-trigger` 的单一 lifetime law。`
- A4:
  - summary: `当前 snapshot 页、exact authority 页、host exact law 页可以承接 comparative gap 与 future question`
  - status: `overturned`
  - resolution_basis: `A2/A4 一致要求只把开放问题留在 proposal，自身 writeback 只进 planning authority。`
- A5:
  - summary: `row roster 是新的核心 capability gap`
  - status: `overturned`
  - resolution_basis: `A1/A4 都要求把 H1 收窄成对既有 row identity 的 projection theorem，而不是新 identity。`
- A6:
  - summary: `selector cookbook / exact scoping 自然该进入 top adoption set`
  - status: `overturned`
  - resolution_basis: `A3/A4 都要求 H5 降为 docs-only，除非能证明 diagnostics 或 scenario proof 的净增益。`

## Round 1

### Phase

- `challenge`

### Input Residual

- none

### Findings

- F1 `critical` `invalidity`:
  - summary: H1/H3/H5 没有绑定到单一 authority bucket，后续易在 `runtime/10`、`form/13`、`form/06` 多处长出双 authority
  - evidence: `A1 + A3 + A4`
  - status: `merged`
- F2 `high` `invalidity`:
  - summary: proposal 自己长出重复 ledger、重复 reject authority 与错位 writeback
  - evidence: `A2 + A4`
  - status: `merged`
- F3 `high` `invalidity`:
  - summary: H4 error lifetime 没有被压回单一 mapping law，`global-slot` 等新特例有回流风险
  - evidence: `A1 + A3`
  - status: `merged`
- F4 `high` `controversy`:
  - summary: H1 把既有 row identity 包装成新 capability gap，目标函数偏移
  - evidence: `A1 + A4`
  - status: `merged`
- F5 `medium` `ambiguity`:
  - summary: H5 更像 docs/host ergonomics backlog，不足以直接进入核心 adopted set
  - evidence: `A3 + A4`
  - status: `merged`

### Counter Proposals

- P1:
  - summary: `保留原始 H1..H6 narrative 结构，只做 wording 修补`
  - why_better: `改动最小`
  - overturns_assumptions:
  - resolves_findings:
  - supersedes_proposals:
  - dominance: `none`
  - axis_scores:
    - concept-count: `worse`
    - public-surface: `worse`
    - compat-budget: `same`
    - migration-cost: `same`
    - proof-strength: `worse`
    - future-headroom: `worse`
  - status: `rejected`
- P2:
  - summary: `SYN-RHF-1 three-bucket single harvest ledger`
  - why_better: `把 proposal 压成 adoption gate + 单一 harvest ledger + 三桶 authority bucket，并把 H4 改成单一 lifetime law`
  - overturns_assumptions: `A1, A2, A3, A4, A5, A6`
  - resolves_findings: `F1, F2, F3, F4, F5`
  - supersedes_proposals:
  - dominance: `dominates`
  - axis_scores:
    - concept-count: `better`
    - public-surface: `better`
    - compat-budget: `same`
    - migration-cost: `better`
    - proof-strength: `better`
    - future-headroom: `better`
  - status: `adopted`

### Resolution Delta

- proposal 改写为单一 harvest ledger
- H1/H3/H5 先绑定 authority bucket
- H1 收窄为 row roster projection theorem
- H2 收窄为 list cardinality basis，只吸收 `minItems / maxItems`
- H4 改写为 `origin × scope × clear-trigger` 单一 lifetime law
- 只允许回写到 `02 / 03 / 06`
- H5/H6 降为 docs-only

## Round 2

### Phase

- `converge`

### Input Residual

- none

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- reviewers A1/A2/A3/A4 全部返回 `无 unresolved findings`

## Adoption

- adopted_candidate: `SYN-RHF-1 three-bucket single harvest ledger`
- lineage: `ALT-A1-1 + ALT-A1-2 + ALT-A1-3 + ALT-A1-4 + ALT-A2-1 + ALT-A2-3 + SYN-A3-1 + A4 gate-matrix direction`
- rejected_alternatives: `P1`
- rejection_reason: `原始 proposal 同时存在 authority bucket 悬空、重复 ledger、错位 writeback 与 proof gap，无法满足 zero-unresolved`
- dominance_verdict: `SYN-RHF-1 在 concept-count, public-surface, migration-cost, proof-strength, future-headroom 上形成直接改进，并通过 Ramanujan / Kolmogorov / Godel 三重 gate`

### Freeze Record

- adopted_summary: `RHF harvest 本轮只吸收四个 delta：row roster projection theorem、list cardinality basis、validating projection obligation、error lifetime law。它们统一进入三桶 authority bucket：form semantic planning、host-projection obligation、docs-only。开放问题不再写进 snapshot authority、exact authority 或 host exact law。`
- kernel_verdict: `通过。当前最强方案是继续压掉 competitor-survey 冗余、写回漂移与第二 authority 风险。`
- frozen_decisions:
  - H1 只作为 row roster projection theorem 吸收，不构成新 identity
  - H2 只吸收 `minItems / maxItems`，`required` 只允许作为 sugar 或 deferred
  - H3 只冻结 validating projection obligation，不冻结命名 selector 列表
  - H4 只允许通过 `origin × scope × clear-trigger` 单一 lifetime law 吸收
  - H5 与 H6 继续只留在 docs-only
  - 只允许回写到 `02 / 03 / 06`
  - 不允许把 comparative gap 或 future question 写进 `01 / 05 / 10 / 13`
- non_goals:
  - 本轮不 reopen exact surface
  - 本轮不 reopen react exact host law
  - 本轮不实现 selector cookbook
- allowed_reopen_surface:
  - H3 若未来证明有 diagnostics 或 scenario proof 的显著净增益，可单独 reopen host projection corollary
  - H5 若未来证明需要 law-level exact scoping，可单独 reopen
- proof_obligations:
  - 02 必须写入 list cardinality basis 与 single error lifetime law
  - 03 必须写入 row roster theorem、validating projection owner split 与 error lifetime owner split
  - 06 必须写入 H1/H2/H3/H4 的 witness coverage
  - 不得把 H1/H3 落成 exact selector spelling
  - 不得把 H4 扩成第二错误分类表
- delta_from_previous_round: `从 competitor-survey 风格 proposal，压到三桶单 authority 的 harvest delta`

## Consensus

- reviewers: `A1, A2, A3, A4`
- adopted_candidate: `SYN-RHF-1 three-bucket single harvest ledger`
- final_status: `closed`
- stop_rule_satisfied: `true`
- residual_risk:
  - 写回 02/03/06 时，若把 H1/H3 滑回 exact selector spelling，或把 H4 膨胀成来源特例树，会触发 reopen
  - H5/H6 目前只停在 docs-only，若未来被误升为 SSoT 主线，也会触发 reopen
