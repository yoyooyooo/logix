# Form Semantic Closure Contract Review Ledger

## Meta

- target: `docs/proposals/form-semantic-closure-contract.md`
- targets:
  - `docs/proposals/form-semantic-closure-contract.md`
  - `docs/ssot/form/02-gap-map-and-target-direction.md`
  - `docs/ssot/form/03-kernel-form-host-split.md`
  - `docs/ssot/form/05-public-api-families.md`
  - `docs/ssot/form/06-capability-scenario-api-support-map.md`
  - `docs/ssot/form/07-kernel-upgrade-opportunities.md`
  - `docs/ssot/form/13-exact-surface-contract.md`
- source_kind: `file-ssot-contract`
- reviewers: `A1, A2, A3, A4`
- round_count: `3`
- challenge_scope: `open`
- consensus_status: `closed`

## Bootstrap

- target_complete: `authority target=form semantic closure delta; bound docs cover form problem contract, owner split, route budget, witness map, kernel grammar, exact surface, plus imported freezes from static IR / trial, rule x i18n, and public composition law`
- review_contract:
  - artifact_kind: `ssot-contract`
  - review_goal: `zero-unresolved`
  - target_claim: `under zero-user and forward-only assumptions, Form should close its remaining semantic gaps by freezing a single cross-source error carrier, a single render-boundary law, a structured reason coordinate, a single async submit gate contract, an identity-aware structure-edit law, a declaration-carrier residual decision, and a minimal composition corollary without introducing second truth, second composition law, second i18n contract, or hidden runtime heuristics`
  - non_default_overrides: `challenge scope=open; open scope includes public contract, reason/evidence boundary, dynamic structure semantics, support-surface budget, and long-term governance`
- review_object_manifest:
  - source_inputs:
    - `docs/proposals/form-semantic-closure-contract.md`
    - `docs/proposals/form-static-ir-trial-contract.md`
    - `docs/proposals/form-rule-i18n-message-contract.md`
    - `docs/review-plan/runs/2026-04-16-form-public-composition-law-review.md`
    - `docs/ssot/form/02-gap-map-and-target-direction.md`
    - `docs/ssot/form/03-kernel-form-host-split.md`
    - `docs/ssot/form/05-public-api-families.md`
    - `docs/ssot/form/06-capability-scenario-api-support-map.md`
    - `docs/ssot/form/07-kernel-upgrade-opportunities.md`
    - `docs/ssot/form/13-exact-surface-contract.md`
    - `docs/ssot/runtime/08-domain-packages.md`
    - `docs/ssot/runtime/09-verification-control-plane.md`
  - materialized_targets:
    - `docs/proposals/form-semantic-closure-contract.md`
    - `docs/ssot/form/02-gap-map-and-target-direction.md`
    - `docs/ssot/form/03-kernel-form-host-split.md`
    - `docs/ssot/form/05-public-api-families.md`
    - `docs/ssot/form/06-capability-scenario-api-support-map.md`
    - `docs/ssot/form/07-kernel-upgrade-opportunities.md`
    - `docs/ssot/form/13-exact-surface-contract.md`
  - authority_target: `form-semantic-closure-contract@2026-04-16`
  - bound_docs:
    - `docs/ssot/runtime/08-domain-packages.md`
    - `docs/ssot/runtime/09-verification-control-plane.md`
    - `docs/proposals/form-static-ir-trial-contract.md`
    - `docs/proposals/form-rule-i18n-message-contract.md`
    - `docs/review-plan/runs/2026-04-16-form-public-composition-law-review.md`
  - derived_scope: `Form semantic closure delta only`
  - allowed_classes:
    - `cross-source error carrier`
    - `error lowering authority`
    - `render-boundary law`
    - `reason coordinate and leaf family`
    - `async submit gate`
    - `dynamic structure edit semantics`
    - `declaration-carrier residual`
    - `support-surface budget`
    - `teaching corollary`
  - blocker_classes:
    - `second error carrier`
    - `rendered string re-entering canonical truth`
    - `second reason truth`
    - `second composition law`
    - `declaration authority split`
    - `hidden row or task heuristics`
    - `fake-closed async gate`
    - `support namespace drifting into third route`
  - ledger_target: `docs/review-plan/runs/2026-04-16-form-semantic-closure-contract-review.md`
- challenge_scope: `open`
- reviewer_set: `A1, A2, A3, A4`
- active_advisors: `A4`
- activation_reason: `目标涉及 public contract、reason/evidence boundary、render boundary、support-surface budget 与长期治理，需要直接挑战目标函数与成功标准`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan, Kolmogorov, Godel`
- dominance_axes: `concept-count, public-surface, compat-budget, migration-cost, proof-strength, future-headroom`
- stop_rule:
  - `Ramanujan gate`: 至少压掉一个重复 closure object、一个重复 boundary、或一段假闭合叙事
  - `Kolmogorov gate`: `concept-count / public-surface / compat-budget` 不能整体变差；若核心轴不变，必须在 `proof-strength` 或 `future-headroom` 上形成严格改进
  - `Godel gate`: 不得引入第二 authority、第二 workflow、第二 i18n contract、第二 reason truth 或未解释矛盾
- reopen_bar: `只有出现更小更强且能同时压掉 proof gap 与 public-surface 噪声的候选时，才允许 reopen`
- ledger_path: `docs/review-plan/runs/2026-04-16-form-semantic-closure-contract-review.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `一份语义闭环 proposal 需要把所有已冻结事实完整重述一遍，才能证明单一真相`
  - status: `overturned`
  - resolution_basis: `A2/A4 都明确要求 proposal 改成 delta-only authority，只保留 imported freezes 与本轮新增 delta。`
- A2:
  - summary: `把最小组合体验与教学主线升成一级 closure target，仍不会重开 public composition law`
  - status: `overturned`
  - resolution_basis: `A2/A4 一致要求 D9 降为 corollary，只允许回写到 05 与 13。`
- A3:
  - summary: `row / task / cleanup locality 可以继续藏在 side refs，不影响 compare / repair / byRowId proof`
  - status: `overturned`
  - resolution_basis: `A1/A3/A4 都要求结构化 `reasonSlotId`，并把 row / task / cleanup locality 收进 `subjectRef`。`
- A4:
  - summary: `blocking truth 可以同时存在于 leaf-local flags、独立 blocking leaf 与 submit summary，不会形成第二 reason truth`
  - status: `overturned`
  - resolution_basis: `A1/A3 都要求删除 canonical blocking leaf，只保留 base facts 与单一 submit summary。`
- A5:
  - summary: `cross-source error unification 只要共用 leaf shape 即可，非 rule 来源的 lower authority 可以保持隐式`
  - status: `overturned`
  - resolution_basis: `A3/A4 都要求补齐 `rule / decode / manual / submit` 四类来源的显式 lower authority。`
- A6:
  - summary: `Form.Error` 可以同时承接 constructor、selector、render helper 与教学锚点，仍不会逼近第三 route`
  - status: `overturned`
  - resolution_basis: `A1/A2/A3/A4 都要求把 `Form.Error` 收窄成 data-support only，并增加明确负约束。`

## Round 1

### Phase

- `challenge`

### Input Residual

- none

### Findings

- F1 `critical` `invalidity`:
  - summary: proposal 过厚，重复冻结 static IR、declaration authority、composition law 等已关闭事实，造成 sibling authority 与文档膨胀风险
  - evidence: `A2 + A4`
  - status: `merged`
- F2 `critical` `invalidity`:
  - summary: cross-source error 只冻结了 leaf shape，没有冻结 `rule / decode / manual / submit` 的显式 lower authority，仍存在 hidden runtime heuristics
  - evidence: `A3 + A4`
  - status: `merged`
- F3 `critical` `invalidity`:
  - summary: row / task / cleanup locality 没有进入稳定坐标，`byRowId`、cleanup receipt、submit contributor locality 仍未闭环
  - evidence: `A1 + A3 + A4`
  - status: `merged`
- F4 `high` `invalidity`:
  - summary: blocking truth 同时落在 pending flag、error severity、blocking leaf 与 submit gate 归约，形成第二 reason truth 风险
  - evidence: `A1 + A3`
  - status: `merged`
- F5 `high` `ambiguity`:
  - summary: `Form.Error` 与 render boundary 被提前 exact-freeze，support-surface budget 还没结算
  - evidence: `A1 + A2 + A3 + A4`
  - status: `merged`
- F6 `high` `ambiguity`:
  - summary: proposal 没有自己的 semantic closure gate，条目命名可能被误判为 proof 已闭合
  - evidence: `A4`
  - status: `merged`
- F7 `medium` `invalidity`:
  - summary: `FormErrorLeaf.details` 这类开放 payload 破坏可比较真相
  - evidence: `A1`
  - status: `merged`

### Counter Proposals

- P1:
  - summary: `保留原始大而全 proposal，只做 wording 修补`
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
  - summary: `SYN-FSC-1 delta-only semantic closure contract`
  - why_better: `把 proposal 改成 imported freezes + adopted delta + surface-impact matrix + freeze gate，并补齐 lower authority、structured reasonSlotId、single submitAttempt、data-support-only Form.Error`
  - overturns_assumptions: `A1, A2, A3, A4, A5, A6`
  - resolves_findings: `F1, F2, F3, F4, F5, F6, F7`
  - supersedes_proposals:
  - dominance: `dominates`
  - axis_scores:
    - concept-count: `better`
    - public-surface: `better`
    - compat-budget: `same`
    - migration-cost: `same`
    - proof-strength: `better`
    - future-headroom: `better`
  - status: `adopted`

### Resolution Delta

- proposal 改写为 delta-only authority
- 教学路径降为 corollary
- cross-source error 改成 `single leaf + explicit lower authority`
- `FormErrorLeaf` 删除开放 payload
- `reasonSlotId` 升为结构化坐标，并承接 `row / task / cleanup`
- canonical `blocking` leaf 删除，submit summary 只从 base facts 归约
- `submitAttempt` snapshot 成为 async submit gate 的单一观察边界
- `Form.Error` 收窄为 data-support only
- render boundary 改成公式级合同，不再冻结 exact member shape

## Round 2

### Phase

- `converge`

### Input Residual

- task locality 仍有双坐标表达

### Findings

- F8 `high` `ambiguity`:
  - summary: `reasonSlotId.subjectRef.kind="task"` 已成立，但 `ReasonLeaf.pending/stale` 与 submit explanation 仍保留独立 `taskRef` 表述
  - evidence: `A3 residual`
  - status: `merged`

### Counter Proposals

- P3:
  - summary: `SYN-FSC-2 single task locality authority`
  - why_better: `把 task identity 全收回 `reasonSlotId.subjectRef.kind="task"`，删除 leaf 与 explanation 中的独立 `taskRef`，进一步压缩坐标来源`
  - overturns_assumptions:
  - resolves_findings: `F8`
  - supersedes_proposals: `P2`
  - dominance: `dominates`
  - axis_scores:
    - concept-count: `better`
    - public-surface: `same`
    - compat-budget: `same`
    - migration-cost: `same`
    - proof-strength: `better`
    - future-headroom: `better`
  - status: `adopted`

### Resolution Delta

- `ReasonLeaf.pending/stale` 删除独立 `taskRef`
- `submitAttempt` explanation 只回链 `reasonSlotId`
- task locality 只允许留在 `reasonSlotId.subjectRef.kind="task"`

## Round 3

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

- adopted_candidate: `SYN-FSC-2 delta-only semantic closure contract + single task locality authority`
- lineage: `P2 + P3`
- rejected_alternatives: `P1`
- rejection_reason: `原始 proposal 同时引入对象膨胀、proof gap 与 sibling authority 风险，无法满足 zero-unresolved`
- dominance_verdict: `SYN-FSC-2 在 concept-count, public-surface, proof-strength, future-headroom 上形成直接改进，并通过 Ramanujan / Kolmogorov / Godel 三重 gate`

### Freeze Record

- adopted_summary: `Form semantic closure 本轮只回写 delta：cross-source error 继续只认 FormErrorLeaf，但必须补显式 lower authority；reason 与动态结构编辑继续共用结构化 reasonSlotId，并以 subjectRef 承接 row / task / cleanup locality；async submit gate 继续只从 base facts 与单一 submitAttempt snapshot 纯归约；Form.Error 只保留 data-support 身份；教学路径只保留为 corollary。`
- kernel_verdict: `通过。当前最强方案是继续删掉重复 authority、重复 blocker truth 和重复 locality 坐标。`
- frozen_decisions:
  - `FormErrorLeaf` 固定为 `origin / severity / code / message`
  - `rule / decode / manual / submit` 各有唯一 lower authority
  - `reasonSlotId` 升为结构化坐标，并固定 `subjectRef.kind in row | task | cleanup`
  - canonical `blocking` leaf 删除
  - submit summary 只从 base facts 纯归约
  - `submitAttempt` snapshot 成为 async submit gate 的单一观察边界
  - `replace(nextItems)` 固定为 roster replacement
  - `byRowId` 成为 identity edit 的正式 surface
  - `Form.Error` 只保留 data-support 身份
  - 教学路径只保留为 corollary
- non_goals:
  - 本轮不实现 source adapters
  - 本轮不冻结 render-only context 的 exact member shape
  - 本轮不重开 public composition law
- allowed_reopen_surface:
  - `Form.Error` selector descriptor factory 的 exact spelling
  - render-only context 的 exact member shape
  - `Form.SchemaErrorMapping` 与 submit error mapper 的最终 type spelling
- proof_obligations:
  - 目标 SSoT 必须同步写入 `rule / decode / manual / submit` 的 lower authority
  - 目标 SSoT 必须同步写入结构化 `reasonSlotId.subjectRef`
  - 目标 SSoT 不得再出现 canonical `blocking` leaf
  - 目标 SSoT 不得把 `Form.Error` 写成第三 route
  - 目标 SSoT 不得把 D9 corollary 扩散到 02 / 03 / 06 / 07
- delta_from_previous_round: `从大而全 proposal，压到可写回的 closure delta，并消掉 task locality 双坐标`

## Consensus

- reviewers: `A1, A2, A3, A4`
- adopted_candidate: `SYN-FSC-2 delta-only semantic closure contract + single task locality authority`
- final_status: `closed`
- stop_rule_satisfied: `true`
- residual_risk:
  - `Form.Error.toRenderInput` 与 selector descriptor factory 的 exact spelling 继续只允许在 13 号页收口
  - `Form.SchemaErrorMapping` 与 submit error mapper 的最终 API spelling 仍需在 future exact surface 中继续压小
