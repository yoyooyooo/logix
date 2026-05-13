# Form Logic Complement Spine Freeze Ledger

## Meta

- target: `docs/ssot/form/13-exact-surface-contract.md`
- targets:
  - `docs/ssot/form/00-north-star.md`
  - `docs/ssot/form/03-kernel-form-host-split.md`
  - `docs/ssot/form/04-convergence-direction.md`
  - `docs/ssot/form/05-public-api-families.md`
  - `docs/ssot/form/06-capability-scenario-api-support-map.md`
  - `docs/ssot/form/09-operator-slot-design.md`
  - `docs/ssot/form/13-exact-surface-contract.md`
  - `docs/ssot/runtime/01-public-api-spine.md`
  - `docs/ssot/runtime/02-hot-path-direction.md`
  - `docs/ssot/runtime/05-logic-composition-and-override.md`
  - `docs/ssot/runtime/06-form-field-kernel-boundary.md`
  - `docs/ssot/runtime/08-domain-packages.md`
  - `docs/ssot/runtime/10-react-host-projection-boundary.md`
  - `docs/adr/2026-04-04-logix-api-next-charter.md`
  - `docs/adr/2026-04-05-ai-native-runtime-first-charter.md`
  - `docs/internal/form-api-quicklook.md`
- source_kind: `file-ssot-contract`
- reviewers: `A1, A2, A3, A4`
- round_count: `3`
- challenge_scope: `open`
- consensus_status: `closed`

## Bootstrap

- target_complete: `authority target=form final user contract under a logic-complement spine; prior evidence=2026-04-16 form public api optimality loop, declaration carrier, public composition law, terminal planning closure`
- review_contract:
  - artifact_kind: `ssot-contract`
  - review_goal: `zero-unresolved`
  - target_claim: `under zero-user and forward-only assumptions, Form should freeze a final user-facing API as the input-state domain kit on a single Logix logic-complement spine where React owns UI/host/render and Logix owns declaration/composition/execution/evidence; north star, runtime spine, domain-package law, host law and Form exact surface are all challengeable`
  - non_default_overrides: `north star challenge enabled; runtime spine and Logix kernel/API design may be challenged; compatibility and migration remain near-zero by baseline`
- review_object_manifest:
  - source_inputs:
    - `docs/ssot/form/README.md`
    - `docs/ssot/form/00-north-star.md`
    - `docs/ssot/form/02-gap-map-and-target-direction.md`
    - `docs/ssot/form/03-kernel-form-host-split.md`
    - `docs/ssot/form/05-public-api-families.md`
    - `docs/ssot/form/09-operator-slot-design.md`
    - `docs/ssot/form/13-exact-surface-contract.md`
    - `docs/ssot/runtime/01-public-api-spine.md`
    - `docs/ssot/runtime/02-hot-path-direction.md`
    - `docs/ssot/runtime/05-logic-composition-and-override.md`
    - `docs/ssot/runtime/06-form-field-kernel-boundary.md`
    - `docs/ssot/runtime/08-domain-packages.md`
    - `docs/ssot/runtime/10-react-host-projection-boundary.md`
    - `docs/adr/2026-04-04-logix-api-next-charter.md`
    - `docs/adr/2026-04-05-ai-native-runtime-first-charter.md`
    - `docs/internal/form-api-quicklook.md`
    - `packages/logix-form/src/index.ts`
    - `packages/logix-form/src/Form.ts`
    - `packages/logix-form/src/FormView.ts`
    - `packages/logix-form/src/react/useForm.ts`
    - `packages/logix-form/src/react/useField.ts`
    - `packages/logix-form/src/react/useFieldArray.ts`
    - `packages/logix-form/src/react/useFormState.ts`
  - materialized_targets:
    - `docs/ssot/form/00-north-star.md`
    - `docs/ssot/form/05-public-api-families.md`
    - `docs/ssot/form/09-operator-slot-design.md`
    - `docs/ssot/form/13-exact-surface-contract.md`
    - `docs/ssot/runtime/01-public-api-spine.md`
    - `docs/ssot/runtime/05-logic-composition-and-override.md`
    - `docs/ssot/runtime/08-domain-packages.md`
    - `docs/ssot/runtime/10-react-host-projection-boundary.md`
    - `docs/adr/2026-04-04-logix-api-next-charter.md`
    - `docs/adr/2026-04-05-ai-native-runtime-first-charter.md`
  - authority_target: `form-logic-complement-spine-freeze@2026-04-16`
  - bound_docs:
    - `docs/ssot/form/03-kernel-form-host-split.md`
    - `docs/ssot/form/04-convergence-direction.md`
    - `docs/ssot/form/06-capability-scenario-api-support-map.md`
    - `docs/ssot/runtime/02-hot-path-direction.md`
    - `docs/ssot/runtime/06-form-field-kernel-boundary.md`
    - `docs/internal/form-api-quicklook.md`
  - derived_scope: `final Form user contract plus affected runtime/adr authority`
  - allowed_classes:
    - `north-star challenge`
    - `public spine and host owner`
    - `domain package owner`
    - `form exact surface`
    - `route boundary and residue law`
    - `cross-doc authority alignment`
    - `hot-path negative constraint`
  - blocker_classes:
    - `future helper placeholder`
    - `second host truth`
    - `second assembly law`
    - `pure projection family owned by domain package`
    - `form-local core facade`
    - `second exact contract`
    - `stale quicklook authority`
  - ledger_target: `docs/review-plan/runs/2026-04-16-form-logic-complement-spine-freeze.md`
- challenge_scope: `open`
- reviewer_set: `A1, A2, A3, A4`
- active_advisors: `A4`
- activation_reason: `目标涉及 north star、public contract、runtime spine、domain-package law、host law 与最终用户 API 冻结`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan, Kolmogorov, Godel`
- dominance_axes: `concept-count, public-surface, compat-budget, migration-cost, proof-strength, future-headroom`
- stop_rule:
  - `Ramanujan gate`: 至少压掉一个公开概念、一个重复 contract、一个 special-case boundary，或一段 placeholder 维持的用户面
  - `Kolmogorov gate`: `concept-count / public-surface / compat-budget` 不能整体变差；若核心轴不变，必须在 `proof-strength` 或 `future-headroom` 上形成严格改进
  - `Godel gate`: 不得引入第二 authority、第二 exact surface、第二 host truth、第二 assembly law，或未解释矛盾
- reopen_bar: `freeze 之后只有在 dominance axes 上被更小更强方案直接支配，且通过三重 gate 时才允许 reopen`
- ledger_path: `docs/review-plan/runs/2026-04-16-form-logic-complement-spine-freeze.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `更远大的目标等于更大的 Form 公开面与更多 Form 专属 facade`
  - status: `overturned`
  - resolution_basis: `A1/A2/A3/A4 delta 交集都要求更大的目标回收到同一条 runtime spine，而不是在 Form 内复制 host/composition truth。`
- A2:
  - summary: `完全冻结的 Form 用户面可以只在 form 子树内完成`
  - status: `overturned`
  - resolution_basis: `reviewer 交集都要求同时回写 runtime/01、runtime/05、runtime/08、runtime/10 与两份 ADR。`
- A3:
  - summary: `Form 可以拥有 canonical React hook family 或 pure projection family`
  - status: `overturned`
  - resolution_basis: `delta 交集都把 host owner 继续压回 core runtime law。`
- A4:
  - summary: `runtime/02 需要跟着一起重开 object boundary`
  - status: `overturned`
  - resolution_basis: `A2/A3/A4 delta 一致认为 runtime/02 只需补负约束，不需重开 hot-path object boundary。`
- A5:
  - summary: `Form.make` 可以长期以独立 assembly law 形态冻结`
  - status: `overturned`
  - resolution_basis: `A1/A2/A4 都要求 `Form.make` 只能按 core `Program.make(...)` 的领域 specialization 理解。`

## Round 1

### Phase

- `challenge`

### Input Residual

- none

### Findings

- F1 `critical` `invalidity`:
  - summary: 当前 form family 仍把 future placeholder、host hook family 与 opaque projection boundary 混成同一份 final claim
  - evidence: `A1 + A2 + A3 + A4`
  - status: `merged`
- F2 `critical` `invalidity`:
  - summary: `05 / 09 / 13 / quicklook / runtime/10` 共同代持用户面 contract，形成 second contract
  - evidence: `A1 + A2 + A3 + A4`
  - status: `merged`
- F3 `high` `controversy`:
  - summary: root / handle / host / projection 的 owner 仍未闭合
  - evidence: `A1 + A2 + A3`
  - status: `merged`

### Counter Proposals

- P1:
  - summary: `form-local full freeze`
  - why_better: `看起来一步到位`
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
  - summary: `canonical-core contraction`
  - why_better: `先把 final contract 收到 root、runtime handle 与单一 owner law`
  - overturns_assumptions: `A1, A2, A3`
  - resolves_findings: `F1, F2, F3`
  - supersedes_proposals:
  - dominance: `dominates`
  - axis_scores:
    - concept-count: `better`
    - public-surface: `better`
    - compat-budget: `same`
    - migration-cost: `same`
    - proof-strength: `better`
    - future-headroom: `better`
  - status: `merged`

### Resolution Delta

- `P2` 成为后续 delta reopen 的基线
- core issues 收敛到：single authority、single host owner、single assembly law

## Round 2

### Phase

- `challenge`

### Input Residual

- `用户显式上提目标函数：Logix 追求成为 React 的另一半；Form 需要吸收并扩展 relevant Logix abilities；必要时允许挑战 kernel / API 设计`

### Findings

- F4 `critical` `invalidity`:
  - summary: 更大的目标不会要求更大的 Form 公开面；它要求更强的 runtime spine 与 host law 统一
  - evidence: `A1 + A2 + A3 + A4 delta`
  - status: `merged`
- F5 `critical` `invalidity`:
  - summary: Form 最终用户 contract 不能只在 form 子树内冻结，必须联动 runtime spine、domain-package law 与 ADR
  - evidence: `A1 + A2 + A3 + A4 delta`
  - status: `merged`
- F6 `high` `invalidity`:
  - summary: domain package 不得拥有 canonical React hook family 或 pure projection family
  - evidence: `A2 + A3 + A4 delta`
  - status: `merged`
- F7 `medium` `ambiguity`:
  - summary: runtime/02 只需补 domain ambition 的负约束，不需重开 hot-path object boundary
  - evidence: `A2 + A3 + A4 delta`
  - status: `merged`

### Counter Proposals

- P3:
  - summary: `更远大目标下扩大 Form local surface`
  - why_better: `更像完整框架`
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
- P4:
  - summary: `SYN-23 spine-first logic complement freeze`
  - why_better: `把 Logix“逻辑半边”目标压成 single spine，再把 Form 压成该 spine 的 domain kit`
  - overturns_assumptions: `A1, A2, A3, A4, A5`
  - resolves_findings: `F4, F5, F6, F7`
  - supersedes_proposals: `P2`
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

- `P4` -> `adopted`
- runtime/01、runtime/05、runtime/08、runtime/10 与两份 ADR 进入 authority 组
- Form final contract 重写为 derived freeze

## Adoption

- adopted_candidate: `SYN-23 spine-first logic complement freeze`
- lineage: `P2 + A2-ALT-03 + A3-ALT-03 + A4-DELTA-ALT-1 + DELTA-A1-spine-first-freeze`
- rejected_alternatives: `P1, P3`
- rejection_reason: `form-local maximal freeze 与扩大 Form local surface 都会让更大目标误落成第二 system、第二 host truth 与第二 assembly law`
- dominance_verdict: `SYN-23 在 concept-count、public-surface、proof-strength、future-headroom 上形成直接改进，并通过 Ramanujan / Kolmogorov / Godel 三重 gate`

### Freeze Record

- adopted_summary: `把更远大的“React 的逻辑半边”目标冻结成 single logic-complement spine：core 持有 `Logic / Program / Runtime / React host law`，领域包只做 program-first / service-first 投影。Form 最终用户 contract 只保留领域 DSL、returned `FormProgram`、effectful `FormHandle` 与 `FormState` truth。`
- kernel_verdict: `通过。更远大的目标要求更统一的 owner law 与更少的 public route，不要求更大的 Form local surface。`
- frozen_decisions:
  - React host exact law 由 core runtime 持有
  - domain package 不得拥有 canonical host family 或 pure projection family
  - `Form.make` 只作为 core assembly law 的领域 specialization 理解
  - `FormProgram` 只作为 core `Program` 的领域 refinement 理解
  - Form exact authority 只持有 domain DSL、effectful `FormHandle` 与 `FormState` truth
  - `form/05` 退为 route boundary
  - `form/09` 退为 reopen gate
  - quicklook 不再代持 exact shape
  - runtime/02 只补 domain ambition 的负约束
- non_goals:
  - 本轮不开始实现 code cutover
  - 本轮不让 `@logixjs/form/react` 回到 canonical truth
  - 本轮不把 residue export 清单重新升格成 contract
- allowed_reopen_surface:
  - `Form.make` 与 core `Program.make(...)` 的更强 exact lowering 证明
  - future domain noun 的 promotion proof
  - residue export 的最终删除波次
- proof_obligations:
  - sibling page 不得再代持 core host exact spelling
  - domain package 不得再长第二 host truth 或 pure projection family
  - convenience sugar 只能作为 identity-preserving alias 存在
  - hot-path ambition 不得借领域 facade 长出新 branch
- delta_from_previous_round: `从 form-local final freeze，提升到 spine-first derived freeze`

## Round 3

### Phase

- `converge`

### Input Residual

- `A4 converge 指出 `form/13` 仍在重复书写 core host exact spelling`

### Findings

- F8 `high` `ambiguity`:
  - summary: `form/13` 仍重复代持 core host exact spelling
  - evidence: `A4 converge`
  - status: `closed`

### Counter Proposals

- P5:
  - summary: `把 `form/13` 的 exact host block 压成 owner redirect`
  - why_better: `消掉最后一段跨页重复 exact contract`
  - overturns_assumptions:
  - resolves_findings: `F8`
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

- `form/13` 的 host / projection owner 小节已改成 owner redirect
- A1/A2/A3/A4 converge 全部回到 `无 unresolved findings`

## Consensus

- reviewers: `A1, A2, A3, A4`
- adopted_candidate: `SYN-23 spine-first logic complement freeze`
- final_status: `closed`
- stop_rule_satisfied: `true`
- residual_risk:
  - 当前共识只覆盖文档 authority；源码导出面与实现 residue 仍需在后续 implementation cutover 中继续清理
  - 若未来尝试恢复 Form-owned canonical React hook family，需要按本 ledger 的 reopen bar 重新立案
