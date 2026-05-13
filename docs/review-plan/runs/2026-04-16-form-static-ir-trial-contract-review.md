# Form Static IR And Trial Contract Review Ledger

## Meta

- target: `docs/proposals/form-static-ir-trial-contract.md`
- targets:
  - `docs/proposals/form-static-ir-trial-contract.md`
  - `docs/ssot/form/02-gap-map-and-target-direction.md`
  - `docs/ssot/form/03-kernel-form-host-split.md`
  - `docs/ssot/form/06-capability-scenario-api-support-map.md`
  - `docs/ssot/form/07-kernel-upgrade-opportunities.md`
  - `docs/ssot/runtime/09-verification-control-plane.md`
  - `docs/ssot/runtime/06-form-field-kernel-boundary.md`
- source_kind: `file-ssot-contract`
- reviewers: `A1, A2, A3, A4`
- round_count: `2`
- challenge_scope: `open`
- consensus_status: `closed`

## Bootstrap

- target_complete: `authority target=form static IR and trial contract; bound docs cover Form problem contract, owner split, witness map, kernel grammar, runtime verification control plane, and runtime/form boundary`
- review_contract:
  - artifact_kind: `ssot-contract`
  - review_goal: `zero-unresolved`
  - target_claim: `under zero-user and forward-only assumptions, Form should converge on the smallest future-facing static declaration contract and verification contract that lets runtime.check / runtime.trial / runtime.compare share one declaration-witness-evidence coordinate system without growing a second IR family or a second reason truth`
  - non_default_overrides: `challenge scope=open; kernel/control-plane upgrades may be assumed if they directly reduce planning object count and proof fragmentation`
- review_object_manifest:
  - source_inputs:
    - `docs/proposals/form-static-ir-trial-contract.md`
    - `docs/ssot/form/02-gap-map-and-target-direction.md`
    - `docs/ssot/form/03-kernel-form-host-split.md`
    - `docs/ssot/form/06-capability-scenario-api-support-map.md`
    - `docs/ssot/form/07-kernel-upgrade-opportunities.md`
    - `docs/ssot/runtime/06-form-field-kernel-boundary.md`
    - `docs/ssot/runtime/07-standardized-scenario-patterns.md`
    - `docs/ssot/runtime/09-verification-control-plane.md`
    - `docs/ssot/runtime/01-public-api-spine.md`
    - `packages/logix-form/src/internal/form/README.md`
    - `packages/logix-form/src/internal/form/artifacts.ts`
    - `packages/logix-core/src/internal/reflection-api.ts`
    - `packages/logix-core/src/ControlPlane.ts`
  - materialized_targets:
    - `docs/proposals/form-static-ir-trial-contract.md`
    - `docs/ssot/form/02-gap-map-and-target-direction.md`
    - `docs/ssot/form/03-kernel-form-host-split.md`
    - `docs/ssot/form/06-capability-scenario-api-support-map.md`
    - `docs/ssot/form/07-kernel-upgrade-opportunities.md`
    - `docs/ssot/runtime/09-verification-control-plane.md`
    - `docs/ssot/runtime/06-form-field-kernel-boundary.md`
  - authority_target: `form-static-ir-trial-contract@2026-04-16`
  - bound_docs:
    - `docs/ssot/runtime/07-standardized-scenario-patterns.md`
    - `docs/ssot/runtime/01-public-api-spine.md`
    - `packages/logix-form/src/internal/form/README.md`
    - `packages/logix-form/src/internal/form/artifacts.ts`
    - `packages/logix-core/src/internal/reflection-api.ts`
    - `packages/logix-core/src/ControlPlane.ts`
  - derived_scope: `Form internal static declaration contract and runtime verification coordinate contract only`
  - allowed_classes:
    - `declaration carrier`
    - `kernel primitive vs derived slice split`
    - `witness ownership`
    - `evidence coordinate law`
    - `stage coordinate matrix`
    - `compare digest contract`
    - `local repair coordinates`
    - `cutover carrier table`
  - blocker_classes:
    - `second IR family`
    - `second reason truth`
    - `runtime.trial acting as structure inference engine`
    - `form-owned scenario plan`
    - `artifact inflation`
    - `static authority split`
  - ledger_target: `docs/review-plan/runs/2026-04-16-form-static-ir-trial-contract-review.md`
- challenge_scope: `open`
- reviewer_set: `A1, A2, A3, A4`
- active_advisors: `A4`
- activation_reason: `目标涉及 Form internal contract、kernel grammar、verification control plane 与长期治理，需要直接挑战目标函数与对象分层`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan, Kolmogorov, Godel`
- dominance_axes: `concept-count, public-surface, compat-budget, migration-cost, proof-strength, future-headroom`
- stop_rule:
  - `Ramanujan gate`: 至少压掉一个并列 IR 对象、一个重复 contract、或一条 Form-owned special-case verification path
  - `Kolmogorov gate`: `concept-count / public-surface / compat-budget` 不能整体变差；若核心轴不变，必须在 `proof-strength` 或 `future-headroom` 上形成严格改进
  - `Godel gate`: 不得引入第二 verification control plane、第二 reason truth、第二 static coordinate system、或未解释矛盾
- reopen_bar: `只有出现更小更强且能同时压掉对象分层和 authority 分裂的候选时，才允许 reopen`
- ledger_path: `docs/review-plan/runs/2026-04-16-form-static-ir-trial-contract-review.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `Form internal static IR 需要五个并列顶层对象才能完整闭环`
  - status: `overturned`
  - resolution_basis: `A1/A2/A3/A4 交集都要求把并列 IR 压回单一 declaration contract，加上 runtime-owned witness 与 shared evidence law。`
- A2:
  - summary: `ScenarioWitnessPlan 应属于 Form internal IR family`
  - status: `overturned`
  - resolution_basis: `四个 reviewer 一致要求 scenario 计划继续归 runtime control plane；Form 只提供 declaration anchors 和 witness read points。`
- A3:
  - summary: `ReasonEnvelopeContract 必须独立成 Form artifact`
  - status: `overturned`
  - resolution_basis: `reviewers 一致要求保留 kernel-owned canonical evidence envelope 为唯一 evidence authority；Form 只保留 reasonProjection slice。`
- A4:
  - summary: `compare 主轴可以把 artifact digest 当成正式坐标`
  - status: `overturned`
  - resolution_basis: `A1/A2/A3/A4 都要求 compare 主轴固定为 declarationDigest / witnessDigest / evidenceSummaryDigest，artifact digest 只作附属材料。`
- A5:
  - summary: `digest 足够支撑 repair loop，不需要稳定 local coordinates`
  - status: `overturned`
  - resolution_basis: `A1/A3/A4 都要求冻结 declSliceId / reasonSlotId / witnessStepId / sourceRef 这组局部坐标。`
- A6:
  - summary: `现有 RulesManifest / StaticIr / ModuleManifest.digest / TrialReport 可以长期并列，通过解释消解冲突`
  - status: `overturned`
  - resolution_basis: `reviewers 一致要求先冻结 cutover table，明确唯一 declaration carrier 与各现有 carrier 的终局角色。`

## Round 1

### Phase

- `challenge`

### Input Residual

- none

### Findings

- F1 `critical` `invalidity`:
  - summary: proposal 引入五个并列顶层 IR，对象数过多，并和现有 declaration/static carriers 形成第二 static authority 风险
  - evidence: `A1 + A2 + A3 + A4`
  - status: `merged`
- F2 `critical` `invalidity`:
  - summary: `ScenarioWitnessPlan` 被纳入 Form IR family，和 runtime control plane 已冻结的 scenario owner 冲突
  - evidence: `A1 + A2 + A3 + A4`
  - status: `merged`
- F3 `high` `invalidity`:
  - summary: `ReasonEnvelopeContract` 与 kernel `canonical evidence envelope` 重复，逼近第二 reason truth
  - evidence: `A1 + A2 + A3 + A4`
  - status: `merged`
- F4 `high` `ambiguity`:
  - summary: compare 主轴把 artifact digest 混进来，和 evidence 坐标闭环冲突
  - evidence: `A1 + A3 + A4`
  - status: `merged`
- F5 `high` `ambiguity`:
  - summary: repair loop 只有 digest，没有 local coordinates，proof strength 不够
  - evidence: `A1 + A3 + A4`
  - status: `merged`
- F6 `medium` `invalidity`:
  - summary: `runtime.trial` 的 startup / scenario 坐标消费合同未拆开，保留了 mode 级模糊地带
  - evidence: `A1 + A4`
  - status: `merged`

### Counter Proposals

- P1:
  - summary: `保持五层 IR，只补 wording`
  - why_better: `改动最小`
  - overturns_assumptions:
  - resolves_findings:
  - supersedes_proposals:
  - dominance: `none`
  - axis_scores:
    - concept-count: `worse`
    - public-surface: `same`
    - compat-budget: `same`
    - migration-cost: `same`
    - proof-strength: `worse`
    - future-headroom: `worse`
  - status: `rejected`
- P2:
  - summary: `SYN-IR-1 single declaration contract + runtime-owned witness + shared evidence law`
  - why_better: `把五层 IR 压回单一 declaration contract，把 scenario 计划压回 runtime control plane，把 reason law 压回 canonical evidence envelope，并补上阶段矩阵与 local coordinates`
  - overturns_assumptions: `A1, A2, A3, A4, A5, A6`
  - resolves_findings: `F1, F2, F3, F4, F5, F6`
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

- `IR-A ~ IR-E` 压回单一 `FormDeclarationContract`
- `ScenarioWitnessPlan` 退出 Form IR family
- `ReasonEnvelopeContract` 压回 `reasonProjectionSlice`
- compare 主轴收口到 `declarationDigest / witnessDigest / evidenceSummaryDigest`
- environment fingerprint 升为 compare admissibility gate
- `declSliceId / reasonSlotId / witnessStepId / sourceRef` 进入局部稳定坐标
- 补出 cutover table 与阶段条件化坐标矩阵

## Adoption

- adopted_candidate: `SYN-IR-1 single declaration contract + runtime-owned witness + shared evidence law`
- lineage: `A1 ALT-01 + A2 ALT-02 + A3 ALT-1 + A4 ALT-1`
- rejected_alternatives: `P1`
- rejection_reason: `五层 IR 与 artifact inflation 会同时拉高对象数、authority 分裂和第二 reason truth 风险，不满足终局收口要求`
- dominance_verdict: `SYN-IR-1 在 concept-count, public-surface, proof-strength, future-headroom 上形成直接改进，并通过 Ramanujan / Kolmogorov / Godel 三重 gate`

### Freeze Record

- adopted_summary: `Form 内部静态合同只保留一个 FormDeclarationContract；active-shape / settlement / reason-projection 只做 declaration slices；runtime-owned ScenarioPlan 退出 Form IR family；kernel canonical evidence envelope 继续做唯一 evidence authority；runtime.check / trial / compare 共享 declaration-witness-evidence 三坐标并按 stage 条件化消费；repair loop 依赖 declSliceId / reasonSlotId / witnessStepId / sourceRef。`
- kernel_verdict: `通过。当前最强方案是继续压掉对象和 owner 分叉，让 declaration、witness、evidence 各回单一 owner。`
- frozen_decisions:
  - `FormDeclarationContract` 是 Form 唯一 declaration authority
  - `activeShapeSlice / settlementSlice / reasonProjectionSlice` 只作为 declaration slices 存在
  - runtime-owned `ScenarioPlan` 不进入 Form IR family
  - `canonical evidence envelope` 继续做唯一 evidence authority
  - compare 主轴固定为 `declarationDigest / witnessDigest / evidenceSummaryDigest`
  - environment fingerprint 不同，compare 默认 `INCONCLUSIVE`
  - report 必须能表达 `declSliceId / reasonSlotId / witnessStepId / sourceRef`
  - cutover table 必须明确 `RulesManifest / StaticIr / ModuleManifest.digest / TrialReport / VerificationControlPlaneReport` 的终局角色
- non_goals:
  - 本轮不决定 `RulesManifest` 与 `FormDeclarationContract` 的最终命名
  - 本轮不决定 local coordinates 走 `artifacts[]` 还是单独 ref 字段
  - 本轮不开始实现 cutover
- allowed_reopen_surface:
  - `RulesManifest` 与 `FormDeclarationContract` 的最终命名关系
  - local coordinates 的 report 承载方式
  - core `StaticIr` 与 declaration contract 的最终切边
- proof_obligations:
  - SSoT 不得再出现 Form-owned scenario artifact
  - SSoT 不得再出现独立 `ReasonEnvelopeContract`
  - compare 主轴不得重新引入 artifact digest
  - 任何 declaration carrier 方案都必须先过 cutover table
- delta_from_previous_round: `从五层 IR + artifact 扩张，压到单一 declaration contract + 阶段矩阵 + local coordinates`

## Round 2

### Phase

- `converge`

### Input Residual

- proposal 中残留旧词表

### Findings

- F7 `medium` `ambiguity`:
  - summary: proposal 仍有旧 contract 名称残留，和 adopted freeze record 冲突
  - evidence: `A1 + A3 + A4 residual`
  - status: `closed`

### Counter Proposals

- none

### Resolution Delta

- 清掉 proposal 中旧的 `ReasonEnvelopeContract + ScenarioWitnessPlan`
- 清掉旧的 `IR digest` 与 `artifact / evidence summary digest` 表述
- proposal 与已回写 SSoT 完全对齐 adopted freeze record

## Consensus

- reviewers: `A1, A2, A3, A4`
- adopted_candidate: `SYN-IR-1 single declaration contract + runtime-owned witness + shared evidence law`
- final_status: `closed`
- stop_rule_satisfied: `true`
- residual_risk:
  - `RulesManifest` 与 `FormDeclarationContract` 的最终命名归并若处理不干净，仍可能把单一 declaration carrier 拉回双重语义
  - local coordinates 若在实现阶段落到新的 report object，也可能重新长出第二 contract；当前只冻结“必须能表达”
  - core `StaticIr` 与 declaration contract 的最终切边若处理不严，expert 投影噪声仍可能回流
