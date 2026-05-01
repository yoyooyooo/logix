# Form Spec Hub Discussion Route Manifest Review Ledger

## Meta

- target:
  - `specs/150-form-semantic-closure-group/discussion.md`
- targets:
  - `specs/150-form-semantic-closure-group/discussion.md`
  - `specs/150-form-semantic-closure-group/spec.md`
  - `specs/150-form-semantic-closure-group/spec-registry.json`
  - `specs/150-form-semantic-closure-group/checklists/group.registry.md`
  - `docs/ssot/form/README.md`
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
  - `1`
- consensus_status:
  - `open`

## Bootstrap

- target_complete:
  - `true`
- review_contract:
  - `artifact_kind: discussion-spec`
  - `review_goal: shrink-150-into-user-facing-route-manifest`
  - `target_claim: 把 150 的待裁决点收成维护者 / 实施者 / reviewer 可直接消费的最终形状，并去掉第二 authority / 第二治理流风险`
  - `non_default_overrides: reviewer_count=4; reviewer_set=A1,A2,A3,A4; challenge_scope=open`
- review_object_manifest:
  - `source_inputs: specs/150-form-semantic-closure-group/discussion.md; specs/150-form-semantic-closure-group/spec.md; specs/150-form-semantic-closure-group/spec-registry.json`
  - `materialized_targets: specs/150-form-semantic-closure-group/discussion.md; specs/150-form-semantic-closure-group/spec.md; specs/150-form-semantic-closure-group/spec-registry.json; specs/150-form-semantic-closure-group/checklists/group.registry.md; docs/ssot/form/README.md`
  - `working_target: specs/150-form-semantic-closure-group/discussion.md`
  - `authority_targets: docs/ssot/form/02-gap-map-and-target-direction.md; docs/ssot/form/06-capability-scenario-api-support-map.md; docs/next/form-p0-semantic-closure-wave-plan.md`
  - `bound_docs: docs/adr/2026-04-05-ai-native-runtime-first-charter.md; docs/ssot/runtime/01-public-api-spine.md; docs/ssot/runtime/03-canonical-authoring.md; docs/standards/logix-api-next-guardrails.md`
  - `derived_scope: discussion-first optimality loop with required writeback to tightly bound spec/registry/readme/checklist artifacts`
  - `allowed_classes: hub-boundary clarification; registry taxonomy; dependency dag; admission law; derived-view rule; reopen bar`
  - `blocker_classes: second authority; future intake gate; stale member summary; split dependency truth; checklist-as-gate`
  - `ledger_target: docs/review-plan/runs/2026-04-21-form-spec-hub-discussion-route-manifest-review.md`
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
  - `目标工件涉及长期治理、route manifest、public-facing contract 与 stop rule；open scope 下启用 A4`
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
  - `必须同时通过 Ramanujan / Kolmogorov / Godel gate，且 converge 后 reviewer 无 unresolved findings`
- reopen_bar:
  - `只有在 blocking DAG、imported predecessor 消费关系、或三问路由能力发生严格变化时才允许 reopen`
- ledger_path:
  - `docs/review-plan/runs/2026-04-21-form-spec-hub-discussion-route-manifest-review.md`
- writable:
  - `true`

## Assumptions

- A1:
  - summary:
    - `150 应只承接 hub 自身的 route contract，不承接 member 语义站位、future backlog completeness 或 checklist gate`
  - status:
    - `kept`
  - resolution_basis:
    - `四位 reviewer 都要求把 150 收成 route manifest，并移除 cluster summary / manual order / checklist 扩张`
- A2:
  - summary:
    - `新 gap / probe / follow-up proposal 不应由 150 充当前置 intake gate，而应先在 owner 工件成形`
  - status:
    - `kept`
  - resolution_basis:
    - `A1/A3/A4 一致指出“先注册再落工件”制造第二治理流；A2 要求删掉已结案 open questions`
- A3:
  - summary:
    - `registry 的依赖顺序必须成为唯一真相，并显式包含 154`
  - status:
    - `kept`
  - resolution_basis:
    - `四位 reviewer 均指出 discussion/spec/registry 对 154 的口径漂移`
- A4:
  - summary:
    - `checklist 只能是 registry 的派生执行视图，不能作为第二 authority 或核心成功标准`
  - status:
    - `kept`
  - resolution_basis:
    - `A1/A3/A4 明确要求把 checklist 降级为 derived view；A2 要求回到单屏 routing contract`
- A5:
  - summary:
    - `predecessor / external 需要 kind-specific status 与明确 role，archived 不进入 taxonomy`
  - status:
    - `kept`
  - resolution_basis:
    - `A1/A3/A4 都指出现有 statusEnum 与实际 entry 状态不闭合，且 archived 会把 150 拉成历史目录`

## Round 1

### Phase

- challenge

### Input Residual

- none

### Findings

- F1 `critical` `invalidity`:
  - `150` 被写成 future intake gate，`discussion/spec/README` 把“先注册再落工件”当主合同，已经逼近第二 authority / 第二治理流`
  - evidence:
    - `A1/A3/A4 交集指出 150 只应回答 route manifest 三问，owner-first intake 才能维持单点 authority`
  - status:
    - `merged`
- F2 `critical` `controversy`:
  - `discussion/spec/registry` 的依赖顺序分裂，尤其 `154` 在人工顺序与 FR 中漂移，导致 blocking DAG 不可机械判别`
  - evidence:
    - `四位 reviewer 全部要求把 dependsOn 冻结为唯一真相，并显式写出 149 + 154 -> 151 -> 152 -> 153`
  - status:
    - `merged`
- F3 `high` `ambiguity`:
  - `Cluster Reviewer Summary / Suggested Discussion Order / checklist kind` 在 150 内复制 member 立场与治理议程，正在长成第二总账本`
  - evidence:
    - `A1/A2/A3/A4 均要求删除或降级为 backlink / derived view`
  - status:
    - `merged`
- F4 `high` `invalidity`:
  - `spec-registry.json` 的 status 口径与 entry 实值不闭合，external / predecessor 的机器语义不完整`
  - evidence:
    - `A1/A3 指出 statusEnum 不含 living/proposed；A3 进一步要求补 role 或 kind-specific schema`
  - status:
    - `merged`

### Counter Proposals

- P1:
  - summary:
    - `Present-Tense Route Manifest`
  - why_better:
    - `把 150 压回“归谁 / 是否阻塞 / 消费哪些 imported decisions”三问，不再承担 future backlog completeness`
  - overturns_assumptions:
    - `A1`
    - `A2`
  - resolves_findings:
    - `F1`
    - `F3`
  - supersedes_proposals:
    - none
  - dominance:
    - `dominates`
  - axis_scores:
    - `concept-count: +3`
    - `public-surface: +3`
    - `compat-budget: +2`
    - `migration-cost: +1`
    - `proof-strength: +3`
    - `future-headroom: +2`
- P2:
  - summary:
    - `Owner-First Admission Law`
  - why_better:
    - `新 gap / probe / follow-up proposal 先在 owner 工件成形，只有进入当前长期 route 时才回挂 150`
  - overturns_assumptions:
    - `A2`
  - resolves_findings:
    - `F1`
    - `F4`
  - supersedes_proposals:
    - none
  - dominance:
    - `dominates`
  - axis_scores:
    - `concept-count: +2`
    - `public-surface: +2`
    - `compat-budget: +2`
    - `migration-cost: +1`
    - `proof-strength: +3`
    - `future-headroom: +3`
- P3:
  - summary:
    - `Registry-Single-Truth DAG`
  - why_better:
    - `把 dependsOn 固定为唯一依赖真相，并显式收口 149 + 154 -> 151 -> 152 -> 153`
  - overturns_assumptions:
    - `A3`
  - resolves_findings:
    - `F2`
  - supersedes_proposals:
    - none
  - dominance:
    - `dominates`
  - axis_scores:
    - `concept-count: +1`
    - `public-surface: +1`
    - `compat-budget: +1`
    - `migration-cost: +1`
    - `proof-strength: +3`
    - `future-headroom: +2`
- P4:
  - summary:
    - `Derived Checklist Only`
  - why_better:
    - `把 checklist 降为 registry 的派生执行视图，避免第二 authority / 第二 stage gate`
  - overturns_assumptions:
    - `A4`
  - resolves_findings:
    - `F3`
  - supersedes_proposals:
    - none
  - dominance:
    - `dominates`
  - axis_scores:
    - `concept-count: +1`
    - `public-surface: +1`
    - `compat-budget: +1`
    - `migration-cost: +2`
    - `proof-strength: +2`
    - `future-headroom: +1`

### Resolution Delta

- `F1..F4` -> `merged`
- `P1..P4` -> `adopted-candidate input`

## Adoption

- adopted_candidate:
  - `Route-Manifest-Only 150`
- lineage:
  - `baseline + P1 + P2 + P3 + P4`
- rejected_alternatives:
  - `继续把 future probes / follow-up proposals 作为 150 的 mandatory pre-registration gate`
  - `继续在 discussion 内保留 cluster reviewer summary / suggested discussion order`
  - `继续用人工顺序和 FR 并行描述依赖，而不是单点 dependsOn`
  - `继续把 checklist 当作 hub 核心交付或 stage gate`
- rejection_reason:
  - `它们都会放大第二 authority、第二治理流、stale 顺序口径与 checklist-as-gate 风险`
- dominance_verdict:
  - `adopted candidate dominates baseline on concept-count / public-surface / proof-strength / future-headroom`

### Freeze Record

- adopted_summary:
  - `把 150 收成 user-facing route manifest：discussion 只保留 go-to map、adopted shape、reopen bar；spec 与 README 改成 owner-first admission；registry 升级为 kind-specific status + role + single DAG truth；checklist 只作为 member-derived execution view`
- kernel_verdict:
  - `通过 Ramanujan gate`
  - `通过 Kolmogorov gate`
  - `通过 Godel gate`
- frozen_decisions:
  - `150 的最小价值固定为 present-tense route manifest，只回答“归谁 / 是否阻塞 / 消费哪些 imported decisions”三问`
  - `entry taxonomy 固定为 member / predecessor / external；archived 不进入 150 taxonomy`
  - `新 gap / 新 probe / 新 follow-up proposal 先在 owner 工件成形；只有进入当前长期 route 时，才回挂 150`
  - `spec-registry.json.entries[].dependsOn` 固定为唯一依赖顺序真相；当前 normalized DAG 固定为 149 + 154 -> 151 -> 152 -> 153`
  - `checklist 只作为 registry 的派生执行视图，不再承接 hub contract 或第二 stage gate`
- non_goals:
  - `member 语义站位摘要`
  - `future backlog completeness`
  - `exact noun / import shape`
  - `checklist kind 扩张`
- allowed_reopen_surface:
  - `blocking DAG 发生变化`
  - `已冻结 spec 的 imported predecessor 消费关系发生变化`
  - `registry 无法继续回答三问`
- proof_obligations:
  - `discussion/spec/registry/README/checklist 需要保持一致`
  - `converge 轮需要确认无 unresolved findings`
- delta_from_previous_round:
  - `从开放式 hub 讨论稿收紧为 adopted route-manifest contract，并同步回写 tightly bound docs`

## Round 2

### Phase

- converge

### Input Residual

- `discussion/spec/registry/README/checklist` 是否全部落到 adopted freeze record
- `Route-Manifest-Only 150` 是否仍被一个更小、更强的方案直接支配

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- `A1/A2/A3/A4` 均返回 `无 unresolved findings`
- `discussion.md` metadata 对齐为 adopted route-manifest purpose
- `consensus_status -> closed`

## Consensus

- reviewers:
  - `A1`
  - `A2`
  - `A3`
  - `A4`
- adopted_candidate:
  - `Route-Manifest-Only 150`
- final_status:
  - `closed`
- stop_rule_satisfied:
  - `true`
- residual_risk:
  - `后续若 blocking DAG、imported predecessor 消费关系或 owner-first admission 再次漂移，但 registry 与派生视图未同步回写，150 仍可能重新出现 route drift`
