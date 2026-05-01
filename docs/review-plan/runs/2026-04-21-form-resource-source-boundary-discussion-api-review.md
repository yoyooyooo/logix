# Form Resource Source Boundary Discussion API Review Ledger

## Meta

- target:
  - `specs/154-form-resource-source-boundary/discussion.md`
- targets:
  - `specs/154-form-resource-source-boundary/discussion.md`
- source_kind:
  - `file-spec`
- reviewer_count:
  - `4`
- reviewer_model:
  - `gpt-5.4`
- reviewer_reasoning:
  - `xhigh`
- challenge_scope:
  - `open`
- round_count:
  - `2`
- consensus_status:
  - `closed`

## Bootstrap

- target_complete:
  - `true`
- review_contract:
  - `artifact_kind: discussion-spec`
  - `review_goal: sharpen-api-discussion-without-starting-implementation`
  - `target_claim: 在不违背 spec 对 exact noun 暂不冻结的前提下，把 discussion.md 收敛成更小、更一致、更可判别的 Form × Query 远程依赖 API 讨论稿。`
  - `non_default_overrides: reviewer_count=4; reviewer_set=A1,A2,A3,A4; challenge_scope=open`
- review_object_manifest:
  - `source_inputs: specs/154-form-resource-source-boundary/discussion.md; specs/154-form-resource-source-boundary/spec.md`
  - `materialized_targets: specs/154-form-resource-source-boundary/discussion.md`
  - `working_target: specs/154-form-resource-source-boundary/discussion.md`
  - `authority_targets: specs/154-form-resource-source-boundary/spec.md; docs/ssot/form/09-operator-slot-design.md; docs/ssot/form/13-exact-surface-contract.md; docs/ssot/runtime/10-react-host-projection-boundary.md`
  - `bound_docs: docs/ssot/runtime/01-public-api-spine.md; docs/ssot/runtime/03-canonical-authoring.md; docs/ssot/form/02-gap-map-and-target-direction.md; docs/ssot/form/README.md; docs/review-plan/runs/2026-04-20-resource-query-owner-relocation-review.md`
  - `derived_scope: single-file discussion refinement with authority alignment to spec and form/runtime ssot`
  - `allowed_classes: boundary clarification; noun strategy; snapshot landing; upgrade gate; rejection criteria; discussion structure`
  - `blocker_classes: exact noun premature freeze; second remote protocol; second write path; React-side sync truth; drift against Query owner authority`
  - `ledger_target: docs/review-plan/runs/2026-04-21-form-resource-source-boundary-discussion-api-review.md`
- challenge_scope:
  - `open`
- reviewer_set:
  - `A1 structure-purity`
  - `A2 token-economy`
  - `A3 dominance-search`
  - `A4 goal-function-challenge`
- active_advisors:
  - `A4`
- activation_reason:
  - `目标工件直接涉及 public contract、长期 boundary 与成功标准；open scope 下自动启用 A4`
- max_reviewer_count:
  - `4`
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
- stop_rule:
  - `必须同时通过 Ramanujan / Kolmogorov / Godel gate，且 reviewer 无 unresolved findings`
- reopen_bar:
  - `只有在 dominance axes 上形成严格改进，或在核心轴不恶化的前提下显著提高 proof-strength / future-headroom，才允许 reopen`
- ledger_path:
  - `docs/review-plan/runs/2026-04-21-form-resource-source-boundary-discussion-api-review.md`
- writable:
  - `true`

## Assumptions

- A1:
  - summary:
    - `目标工件虽然是 discussion，不是 authority，但它足够完整，可承接一次独立的 API 设计 optimality review`
  - status:
    - `kept`
  - resolution_basis:
    - `文件已存在，且已包含 baseline 立场、候选 shape、snapshot landing、upgrade gate 与 rejected alternatives；本轮已把它收成 working artifact`
- A2:
  - summary:
    - `本轮允许直接改写 discussion.md，但不默认把 exact noun 冻结进 spec.md`
  - status:
    - `kept`
  - resolution_basis:
    - `spec.md 继续把 exact noun / method spelling 放在 out of scope；本轮只把 boundary delta 回写到 spec.md`
- A3:
  - summary:
    - `Query owner / single remote truth / React host law 这些更高位约束已经足够稳定，可作为 reviewer 的 authority background`
  - status:
    - `kept`
  - resolution_basis:
    - `spec.md 与相关 SSoT 已明确 Query owner、rule 禁止 direct IO、React 禁止第二同步路径`
- A4:
  - summary:
    - `当前 challenge_scope=open，允许 reviewer 挑战“是否该继续讨论 Shape A/B exact noun”这一目标函数本身`
  - status:
    - `kept`
  - resolution_basis:
    - `四个 reviewer 都要求把 exact noun 竞争移出主文，并把 future noun 压回 reopen surface`

## Round 1

### Phase

- challenge

### Input Residual

- none

### Findings

- F1 `blocker` `controversy`:
  - `discussion.md` 以 working artifact 身份重复持有已冻结 contract，并在 review contract 中被误登记成 authority target，存在 shadow authority 与双 authority 风险`
  - evidence:
    - `A2/A3 交集指出 discussion 自述“不是 authority”，但原 ledger 把它写成 authority_target；exact authority 已固定在 spec/09/13/runtime/10`
  - status:
    - `merged`
- F2 `blocker` `invalidity`:
  - `Snapshot Landing Options` 把 owner truth 与 consumer lowering 混成 Option 1/2 二选一，容易读成 Form 拥有第二 remote truth 或第二 write path`
  - evidence:
    - `A1/A3/A4 交集要求改成 Query-owned truth + Form-lowered slices 的单矩阵，并把 lane handoff 回路到 151/152/153`
  - status:
    - `merged`
- F3 `high` `controversy`:
  - `Shape A/B/C` 把 boundary contract、future noun reopen 与 quasi-exact code gallery 放在同一层，主线从 boundary 讨论滑向 surface 比稿`
  - evidence:
    - `A1/A2/A3/A4 全部要求把 A/B 移出主文，至少降成 reopen surface 或 appendix hypothesis`
  - status:
    - `merged`
- F4 `high` `ambiguity`:
  - `2-of-N` 升级门与多套 taxonomy 降低 proof-strength，reviewer 难以机械判别 form-local 与 QueryProgram 的边界`
  - evidence:
    - `A1/A2/A3/A4 全部要求改成 hard triggers + safe-local witness / obligation-based gate，并停用计数法`
  - status:
    - `merged`

### Counter Proposals

- P1:
  - summary:
    - `Boundary-First Delta Discussion`
  - why_better:
    - `把 discussion 收回 working artifact，只保留 authority map、boundary invariants、proof obligations 与 reopen surface`
  - overturns_assumptions:
    - `A4`
  - resolves_findings:
    - `F1`
    - `F3`
  - supersedes_proposals:
    - none
  - dominance:
    - `dominates`
  - axis_scores:
    - `concept-count: +3`
    - `public-surface: +2`
    - `compat-budget: 0`
    - `migration-cost: 0`
    - `proof-strength: +3`
    - `future-headroom: +2`
- P2:
  - summary:
    - `Query Truth + Form Lowering Matrix`
  - why_better:
    - `把 owner truth、Form-lowered companion/settlement/reason slices 与 forbidden second-write forms 压成单一路由`
  - overturns_assumptions:
    - none
  - resolves_findings:
    - `F2`
  - supersedes_proposals:
    - none
  - dominance:
    - `dominates`
  - axis_scores:
    - `concept-count: +1`
    - `public-surface: 0`
    - `compat-budget: 0`
    - `migration-cost: 0`
    - `proof-strength: +3`
    - `future-headroom: +2`
- P3:
  - summary:
    - `Obligation-Based QueryProgram Gate`
  - why_better:
    - `用 hard triggers + safe-local witness 取代 2-of-N 计数法，提升 reviewer 可执行性与未来稳定性`
  - overturns_assumptions:
    - none
  - resolves_findings:
    - `F4`
  - supersedes_proposals:
    - none
  - dominance:
    - `dominates`
  - axis_scores:
    - `concept-count: +1`
    - `public-surface: 0`
    - `compat-budget: 0`
    - `migration-cost: 0`
    - `proof-strength: +3`
    - `future-headroom: +2`
- P4:
  - summary:
    - `Attachment Polarity Reopen Surface`
  - why_better:
    - `保留 future API 设计的最小讨论面，只比较 consumer-attached 与 form-companion-attached 两种附着极性，不冻结 exact noun 或 code shape`
  - overturns_assumptions:
    - none
  - resolves_findings:
    - `F3`
  - supersedes_proposals:
    - none
  - dominance:
    - `partial`
  - axis_scores:
    - `concept-count: +1`
    - `public-surface: 0`
    - `compat-budget: 0`
    - `migration-cost: 0`
    - `proof-strength: +1`
    - `future-headroom: +2`

### Resolution Delta

- `F1..F4` -> `merged`
- `P1..P4` -> `adopted-candidate input`

## Adoption

- adopted_candidate:
  - `Closure-First, Lane-Routed, Reopen-Gated Discussion`
- lineage:
  - `baseline + P1 + P2 + P3 + P4`
- rejected_alternatives:
  - `继续把 A/B code gallery 作为主文强候选`
  - `继续保留 Option 1 / Option 2 二选一`
  - `继续保留 2-of-N 升级门`
  - `继续把 discussion 记成 authority-bearing target`
- rejection_reason:
  - `它们会继续放大 shadow authority、第二 write path 风险、以及 count-based gate 的 proof 弱点`
- dominance_verdict:
  - `adopted candidate dominates baseline on concept-count / public-surface / proof-strength / future-headroom`

### Freeze Record

- adopted_summary:
  - `把 discussion 收成 authority-correct 的 boundary delta discussion：Query 继续持有 remote fact truth，Form 只 lower companion/settlement/reason slices，QueryProgram gate 改为 obligation-based hard triggers + safe-local witness，future noun 只保留 attachment polarity reopen surface`
- kernel_verdict:
  - `通过 Ramanujan gate`
  - `通过 Kolmogorov gate`
  - `通过 Godel gate`
- frozen_decisions:
  - `discussion.md 继续只是 working artifact；authority map 回到 spec.md + form/09 + form/13 + runtime/10`
  - `Query 继续持有 remote fact / load lifecycle / cache truth`
  - `Form 只 lower companion / settlement / reason slices；lowered facts 不进入 values，不形成 second write path`
  - `React 只作为 consumer-side constraint，host glue 不参与 owner 决策`
  - `QueryProgram upgrade gate 改成 hard triggers + safe-local witness；2-of-N 计数法停用`
  - `future noun 暂不冻结；若未来重开，只保留 attachment polarity 这一层 reopen surface`
- non_goals:
  - `当前不冻结 exact noun`
  - `当前不冻结 exact method spelling`
  - `当前不冻结 target / scope / slot / reset 一类 carrier spelling`
  - `当前不冻结 row.item / list.item / submit-lane 的 future spelling`
  - `当前不在 discussion.md 内决定 exact carrier landing page`
- allowed_reopen_surface:
  - `attachment polarity`
  - `exact carrier landing page，前提是 151 / 152 / 153 给出足够 proof`
  - `future noun gate，前提是通过 form/09 并回写 form/13 或 runtime/10`
- proof_obligations:
  - `151 能解释 lowered facts 的 active exit / cleanup`
  - `152 能解释 pending / stale / blocking / submitImpact 对 lowered facts 的消费`
  - `153 能解释 reason / evidence / compare / repair 对 lowered facts 的消费`
  - `examples 与 walkthrough 能在无 exact noun 的情况下讲清 boundary`
  - `Decision Backlinks 保持完整`
- delta_from_previous_round:
  - `删除 A/B/C gallery 主线`
  - `删除 Option 1 / Option 2`
  - `删除 2-of-N gate`
  - `改写为 authority map + lowering matrix + obligation-based gate + reopen surface`

## Consensus

- reviewers:
  - `A1`
  - `A2`
  - `A3`
  - `A4`
- adopted_candidate:
  - `Closure-First, Lane-Routed, Reopen-Gated Discussion`
- final_status:
  - `closed`
- stop_rule_satisfied:
  - `true`
- residual_risk:
  - `后续仍需由 151 / 152 / 153 与 examples / walkthrough 真正兑现 lowered facts 的消费闭环；若这些 proof obligations 无法兑现，才允许受控 reopen`

## Round 2

### Phase

- converge

### Input Residual

- `shadow authority closure`
- `snapshot owner / lowering separation`
- `future noun reopen surface only`
- `obligation-based QueryProgram gate`

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- `F1` -> `closed`
- `F2` -> `closed`
- `F3` -> `closed`
- `F4` -> `closed`
