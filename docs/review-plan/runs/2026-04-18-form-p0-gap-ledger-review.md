# Form P0 Gap Ledger Review

## Meta

- target: `docs/ssot/form/02-gap-map-and-target-direction.md`
- targets:
  - `docs/ssot/form/02-gap-map-and-target-direction.md`
  - `docs/ssot/form/README.md`
- source_kind: `file-ssot-contract`
- reviewers: `4`
- round_count: `2`
- challenge_scope: `open`
- consensus_status: `reached`

## Bootstrap

- target_complete: `true`
- review_contract:
  - artifact_kind: `ssot-contract`
  - review_goal: `zero-unresolved`
  - target_claim: `当前 02 页里的 Form P0 gap ledger 已经是最小、最强、可长期维护的 authority；P0 只保留 active-shape lane / settlement lane / reason contract 三组，依赖、proof owner、implementation landing 已经足够闭环，可作为后续实施与 SSoT 写回的单一依据。`
  - non_default_overrides:
    - `reviewer_count=4`
    - `reviewer_model=gpt-5.4`
    - `reviewer_reasoning=xhigh`
    - `challenge_scope=open`
    - `A4 enabled`
- review_object_manifest:
  - source_inputs:
    - `user request: 只打磨 P0，并走 $plan-optimality-loop`
    - `current target: docs/ssot/form/02-gap-map-and-target-direction.md`
  - materialized_targets:
    - `docs/ssot/form/02-gap-map-and-target-direction.md`
    - `docs/ssot/form/README.md`
  - authority_target:
    - `docs/ssot/form/02-gap-map-and-target-direction.md`
  - bound_docs:
    - `docs/ssot/form/00-north-star.md`
    - `docs/ssot/form/01-current-capability-map.md`
    - `docs/ssot/form/03-kernel-form-host-split.md`
    - `docs/ssot/form/04-convergence-direction.md`
    - `docs/ssot/form/06-capability-scenario-api-support-map.md`
    - `docs/ssot/form/13-exact-surface-contract.md`
    - `docs/ssot/runtime/09-verification-control-plane.md`
  - derived_scope: `single-ssot-contract-with-bound-docs`
  - allowed_classes:
    - `P0 group shape`
    - `dependency DAG alignment`
    - `problem-vs-snapshot boundary`
    - `planning authority compression`
    - `proof owner allocation`
    - `implementation landing allocation`
    - `target-function critique`
  - blocker_classes:
    - `current snapshot duplication`
    - `P0/P1 leakage`
    - `second authority`
    - `host sugar creep`
    - `implementation-task detail creep`
    - `stale capability statements`
  - ledger_target:
    - `docs/review-plan/runs/2026-04-18-form-p0-gap-ledger-review.md`
- challenge_scope: `open`
- reviewer_set:
  - `A1`
  - `A2`
  - `A3`
  - `A4`
- active_advisors:
  - none
- activation_reason:
  - `A4 作为 reviewer 启用，因为目标涉及长期治理、public contract 与 authority target。`
- max_reviewer_count: `4`
- kernel_council:
  - `Ramanujan`
  - `Kolmogorov`
  - `Godel`
- dominance_axes:
  - `concept-count`
  - `public-surface`
  - `compat-budget`
  - `migration-cost`
  - `proof-strength`
  - `future-headroom`
- stop_rule: `Ramanujan gate + Kolmogorov gate + Godel gate`
- reopen_bar: `只有在 adopted candidate 被更小、更强方案直接支配时才允许 reopen`
- ledger_path: `docs/review-plan/runs/2026-04-18-form-p0-gap-ledger-review.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `P0 三分法本身仍是当前最小 root grammar。`
  - status: `kept`
  - resolution_basis: `A4 明确认为三分法无需 reopen，其他 reviewer 也没有给出更小、更强的 root grammar 替代。`
- A2:
  - summary: `02 可以同时作为 all-priority gap ledger、snapshot ledger、proof hub 和 landing hub。`
  - status: `overturned`
  - resolution_basis: `A1/A2/A4 一致认定 02 当前过胖，形成第二 authority。`
- A3:
  - summary: `02 可以保留 current state / proof owner / implementation landing 等列，而不破坏单一 authority。`
  - status: `overturned`
  - resolution_basis: `A2/A4 一致认定这些列把 snapshot、owner、proof 与实施落点混在一起。`
- A4:
  - summary: `reason contract 可以同时吸纳 verification / compare feed。`
  - status: `overturned`
  - resolution_basis: `A1/A3 一致认定 reason contract 与 control-plane feed 应分层。`
- A5:
  - summary: `participation invariant 可以在 02 再写一份，并继续占用 depends_on。`
  - status: `overturned`
  - resolution_basis: `A1/A3 认定这会长出隐性第四节点或第二公理面。`

## Round 1

### Phase

- challenge

### Input Residual

- none

### Findings

- F1 `high` `invalidity`: `02` 同时承载 P0 ledger、P1 到 P3 derived items、exact delta、proof/materializer 细则，已经长成第二 authority hub。
- F2 `high` `invalidity`: `current state / proof owner / implementation landing` 把 snapshot、owner split、proof mapping 与实施落点混在同一张表里，不再是最小 authority。
- F3 `high` `invalidity`: `reason contract` 仍和 verification / control-plane feed 重叠，`P0/P1` 边界不干净。
- F4 `medium` `ambiguity`: `participation invariant` 在 `02` 形成第二公理面，或被读成第四个根节点。

### Counter Proposals

- P1:
  - summary: `把 02 压成 delta-only P0 contract ledger`
  - why_better: `压掉第二 authority hub，只保留 P0 主缺口、DAG、exit rule 与 authority refs。`
  - overturns_assumptions:
    - `A2`
    - `A3`
  - resolves_findings:
    - `F1`
    - `F2`
  - supersedes_proposals:
    - none
  - dominance: `dominates`
  - axis_scores:
    - concept-count: `better`
    - public-surface: `same_or_better`
    - compat-budget: `same`
    - migration-cost: `same_or_better`
    - proof-strength: `better`
    - future-headroom: `better`
- P2:
  - summary: `02 的 ledger 只保留 gap_group / priority / depends_on / closure_gate / authority_refs / exit_rule`
  - why_better: `去掉 current state / proof owner / implementation landing，压掉 snapshot 与 landing 漂移。`
  - overturns_assumptions:
    - `A3`
  - resolves_findings:
    - `F2`
  - supersedes_proposals:
    - none
  - dominance: `dominates`
  - axis_scores:
    - concept-count: `better`
    - public-surface: `same`
    - compat-budget: `same`
    - migration-cost: `better`
    - proof-strength: `better`
    - future-headroom: `better`
- P3:
  - summary: `reason contract 收回 semantic authority；verification / compare feed 只留在 06 + runtime/09`
  - why_better: `压掉 P0/P1 leakage，并把 control-plane proof 单点回给 supporting docs。`
  - overturns_assumptions:
    - `A4`
  - resolves_findings:
    - `F3`
  - supersedes_proposals:
    - none
  - dominance: `dominates`
  - axis_scores:
    - concept-count: `better`
    - public-surface: `same`
    - compat-budget: `same`
    - migration-cost: `same_or_better`
    - proof-strength: `better`
    - future-headroom: `better`
- P4:
  - summary: `participation invariant 改成 imported gate，不再写进 02 的 depends_on`
  - why_better: `避免隐性第四节点化与第二公理面。`
  - overturns_assumptions:
    - `A5`
  - resolves_findings:
    - `F4`
  - supersedes_proposals:
    - none
  - dominance: `dominates`
  - axis_scores:
    - concept-count: `better`
    - public-surface: `same`
    - compat-budget: `same`
    - migration-cost: `same`
    - proof-strength: `better`
    - future-headroom: `better`

### Resolution Delta

- `F1` `merged`
- `F2` `merged`
- `F3` `merged`
- `F4` `merged`
- `P1` `adopted`
- `P2` `adopted`
- `P3` `adopted`
- `P4` `adopted`

## Adoption

- adopted_candidate: `delta-only-p0-contract-ledger`
- lineage:
  - `P1`
  - `P2`
  - `P3`
  - `P4`
- rejected_alternatives:
  - `reopen three-root-grammar split`
  - `keep all-priority ledger in 02`
  - `keep proof owner / implementation landing columns`
  - `keep participation invariant as depends_on`
- rejection_reason:
  - `会增加第二 authority、第二公理面，或造成 P0/P1 leakage`
- dominance_verdict:
  - `adopted candidate dominates on concept-count and proof-strength`

### Freeze Record

- adopted_summary:
  - `02` 只保留 delta-only `P0` contract ledger
  - `02` 只保留三条 P0 root lane
  - `02` 删除 `current state / proof owner / implementation landing`
  - `reason contract` 收回 semantic authority，不再吞 verification / compare feed
  - `participation invariant` 回到 imported gates，不再作为 depends_on 节点
  - exact / witness / control-plane admissibility 全部改成单点 authority refs
- kernel_verdict:
  - `Ramanujan`: 通过，压掉了第二 authority hub 与重复列
  - `Kolmogorov`: 通过，核心轴不恶化，文本与列数都更短
  - `Godel`: 通过，删除了 sibling authority、第四节点化和 P0/P1 混叠
- frozen_decisions:
  - `三分法不 reopen`
  - `02 只承接 P0`
  - `02 不再承接 snapshot`
  - `02 不再承接 exact delta`
  - `02 不再承接 proof / landing hub`
  - `reason contract` 不再承接 verification / compare feed
- non_goals:
  - `在 02 里维护 all-priority backlog`
  - `在 02 里维护 implementation landing`
  - `在 02 里重写 13/06/03/runtime09 的单点 authority`
- allowed_reopen_surface:
  - `若未来出现直接支配三分法的更小 root grammar`
  - `若 supporting docs 的单点 authority 发生真实重组`
- proof_obligations:
  - `converge round 需要确认 02 的 residual duplication 已经清空`
  - `README 必须和 02 的新角色保持一致`
  - `stale round 结果不得混入最终共识`
- delta_from_previous_round:
  - `从 all-priority gap ledger，压到 delta-only P0 contract ledger`

## Round 2

### Phase

- converge

### Input Residual

- `只检查 updated 02 是否还保留 exact / snapshot duplication`

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- `round1 residual duplication` `closed`
- `consensus_status` `closed`

## Consensus

- reviewers:
  - `A1`
  - `A2`
  - `A3`
  - `A4`
- adopted_candidate:
  - `delta-only-p0-contract-ledger`
- final_status:
  - `已达成共识`
- stop_rule_satisfied:
  - `true`
- residual_risk:
  - `若后续有人把 current snapshot、exact carrier、witness proof 或 control-plane 细节重新写回 02，authority 漂移会重新出现`
