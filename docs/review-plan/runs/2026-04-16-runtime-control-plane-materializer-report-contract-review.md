# Runtime Control Plane Materializer Report Contract Review Ledger

## Meta

- target: `docs/proposals/runtime-control-plane-materializer-report-contract.md`
- targets:
  - `docs/proposals/runtime-control-plane-materializer-report-contract.md`
  - `docs/ssot/runtime/09-verification-control-plane.md`
  - `docs/proposals/form-static-ir-trial-contract.md`
  - `docs/proposals/form-validation-funnel-export-contract.md`
  - `docs/proposals/form-rule-i18n-message-contract.md`
  - `docs/proposals/README.md`
- source_kind: `file-ssot-contract`
- reviewers: `A1, A2, A3, A4`
- round_count: `2`
- challenge_scope: `open`
- consensus_status: `closed`

## Bootstrap

- target_complete: `authority target=runtime control plane materializer/report exact shell; bound docs cover static IR/trial, form validation funnel closure, i18n compare law, runtime/09, core ControlPlane contract, CLI emit path, and output-contract tests`
- review_contract:
  - artifact_kind: `ssot-contract`
  - review_goal: `zero-unresolved`
  - target_claim: `在 forward-only、零存量用户、AI Native、Effect-first 前提下，runtime control plane 应把 report exact shape 冻成单一 top-level shell，并通过 coordinate-first repair target 与 artifact-backed linking 承接 domain truth 的 late-bound explain / repair，从而避免第二 report object、第二 issue truth、第二 materializer truth 与 proposal-only exact authority`
  - non_default_overrides: `challenge scope=open; open scope includes single report theorem、repair hint exact contract、materializer linking shell、report naming、exact carrier supersession fence、consumed proposal compression`
- review_object_manifest:
  - source_inputs:
    - `docs/proposals/runtime-control-plane-materializer-report-contract.md`
    - `docs/proposals/form-static-ir-trial-contract.md`
    - `docs/proposals/form-validation-funnel-export-contract.md`
    - `docs/proposals/form-rule-i18n-message-contract.md`
    - `docs/ssot/runtime/09-verification-control-plane.md`
    - `docs/ssot/form/02-gap-map-and-target-direction.md`
    - `docs/ssot/form/03-kernel-form-host-split.md`
    - `docs/ssot/form/06-capability-scenario-api-support-map.md`
    - `packages/logix-core/src/ControlPlane.ts`
    - `packages/logix-cli/src/internal/result.ts`
    - `packages/logix-cli/src/internal/commands/check.ts`
    - `packages/logix-cli/src/internal/commands/trial.ts`
    - `packages/logix-cli/src/internal/commands/compare.ts`
    - `packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts`
    - `packages/logix-cli/test/Integration/output-contract.test.ts`
  - materialized_targets:
    - `docs/proposals/runtime-control-plane-materializer-report-contract.md`
    - `docs/ssot/runtime/09-verification-control-plane.md`
    - `docs/proposals/form-static-ir-trial-contract.md`
    - `docs/proposals/form-validation-funnel-export-contract.md`
    - `docs/proposals/form-rule-i18n-message-contract.md`
    - `docs/proposals/README.md`
  - authority_target: `runtime-control-plane-materializer-report-contract@2026-04-16`
  - bound_docs:
    - `docs/ssot/form/02-gap-map-and-target-direction.md`
    - `docs/ssot/form/03-kernel-form-host-split.md`
    - `docs/ssot/form/06-capability-scenario-api-support-map.md`
  - derived_scope: `runtime control plane exact shell planning only`
  - allowed_classes:
    - `single report theorem`
    - `repair hint exact contract`
    - `materializer linking shell`
    - `report naming`
    - `exact carrier supersession fence`
    - `consumed proposal compression`
  - blocker_classes:
    - `second report object`
    - `top-level rows/issues/materializations`
    - `second materializer authority`
    - `proposal-only exact authority`
    - `runtime/form duplicated verification law`
    - `exact-surface reopen without proof`
  - ledger_target: `docs/review-plan/runs/2026-04-16-runtime-control-plane-materializer-report-contract-review.md`
- challenge_scope: `open`
- reviewer_set: `A1, A2, A3, A4`
- active_advisors: `A4`
- activation_reason: `目标涉及 runtime control plane success criterion、public/internal 边界与 authority split，需要直接挑战错误目标函数`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan, Kolmogorov, Godel`
- dominance_axes: `concept-count, public-surface, compat-budget, migration-cost, proof-strength, future-headroom`
- stop_rule:
  - `Ramanujan gate`: 至少压掉一个多余 noun、一个多余命名轴、或一层 proposal-only exact authority
  - `Kolmogorov gate`: `concept-count / public-surface / compat-budget` 不能整体变差；若核心轴不变，必须在 `proof-strength` 或 `future-headroom` 上形成严格改进
  - `Godel gate`: 不得引入第二 report object、第二 materializer authority、第二 exact carrier、或未解释矛盾
- reopen_bar: `只有出现更小更强，且能同时压掉 repair prose truth、artifact taxonomy 与 exact carrier 双轨的候选时，才允许 reopen`
- ledger_path: `docs/review-plan/runs/2026-04-16-runtime-control-plane-materializer-report-contract-review.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `artifact.role` 是 materializer exact shell 的必要组成
  - status: `overturned`
  - resolution_basis: `A1/A2/A3/A4 一致要求删除 artifact.role，materializer 身份只走 linking law。`
- A2:
  - summary: `focusRef` 需要同时承载局部坐标与 artifact discoverability
  - status: `overturned`
  - resolution_basis: `A1/A4 一致要求 focusRef 改成 coordinate-first；artifact linking 拆到独立字段。`
- A3:
  - summary: `TrialReport` 可长期保持 alias 或 residue 双分支，不影响 single report theorem
  - status: `overturned`
  - resolution_basis: `A1/A2/A3 一致要求冻结单一路径：TrialReport 只允许作为 pure alias。`
- A4:
  - summary: `consumed proposal` 继续保留完整 exact contract，不会形成第二 authority
  - status: `overturned`
  - resolution_basis: `A2/A3 一致要求把相关 consumed proposal 压成 freeze note。`
- A5:
  - summary: `runtime/09` 不需要 single-authority supersession fence
  - status: `overturned`
  - resolution_basis: `A3 明确要求 runtime/09 成为唯一 exact carrier 落点。`

## Round 1

### Phase

- `challenge`

### Input Residual

- none

### Findings

- F1 `high` `invalidity`:
  - summary: `artifact.role` 与 linking 同时存在，形成第二 materializer authority
  - evidence: `A1 + A2 + A3 + A4`
  - status: `merged`
- F2 `high` `invalidity`:
  - summary: `focusRef` 混入 artifact discoverability 与宽口 payload，repair target 还不够纯
  - evidence: `A1 + A4`
  - status: `merged`
- F3 `high` `invalidity`:
  - summary: report naming 仍保留第二命名轴，`TrialReport` fate 也未锁死
  - evidence: `A1 + A2 + A3`
  - status: `merged`
- F4 `high` `invalidity`:
  - summary: consumed proposal 继续持有 exact contract，proposal-only authority 未闭合
  - evidence: `A2 + A3`
  - status: `merged`
- F5 `medium` `invalidity`:
  - summary: verification law 与 focus exactness 在 proposal / SSoT / consumed proposal 多点重复
  - evidence: `A2`
  - status: `merged`

### Counter Proposals

- P1:
  - summary: `保留原 proposal，只做 wording 修补`
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
  - summary: `SYN-CP-1 single report shell + coordinate-first repair target + artifact-backed linking`
  - why_better: `把 artifact role 删掉，把 focusRef 改成 coordinate-first，把 kind 压成单常量，把 TrialReport 固定成 pure alias，并把 consumed proposal 压成 freeze note`
  - overturns_assumptions: `A1, A2, A3, A4, A5`
  - resolves_findings: `F1, F2, F3, F4, F5`
  - supersedes_proposals:
    - `A1 ALT-A1-01`
    - `A1 ALT-A1-02`
    - `A1 ALT-A1-03`
    - `A2 ALT-1`
    - `A2 ALT-2`
    - `A2 ALT-3`
    - `A2 ALT-4`
    - `A3 ALT-01`
    - `A3 ALT-02`
    - `A3 ALT-03`
    - `A4 ALT-1`
    - `A4 ALT-2`
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

- 删除 `artifact.role`
- `focusRef` 改成 coordinate-first，artifact linking 拆到 `relatedArtifactOutputKeys`
- report `kind` 压成单一常量 `VerificationControlPlaneReport`
- `TrialReport` 冻结为 pure alias
- `runtime/09` 加入 single-authority supersession fence
- 三份相关 consumed proposal 压成 freeze note

## Round 2

### Phase

- `converge`

### Input Residual

- 检查 artifact taxonomy 是否真的压掉
- 检查 focusRef 是否真的回到 coordinate-first
- 检查 naming axis 是否真的收成单一
- 检查 consumed proposal 是否真的退出 exact authority

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- reviewers A1/A3/A4 全部返回 `无 unresolved findings`
- A2 在补充“docs 可领先代码”的 authority 前提后返回 `无 unresolved findings`

## Adoption

- adopted_candidate: `SYN-CP-1 single report shell + coordinate-first repair target + artifact-backed linking`
- lineage: `A1 ALT-01/02/03 + A2 ALT-1/2/3/4 + A3 ALT-01/02/03 + A4 ALT-1/2`
- rejected_alternatives: `P1`
- rejection_reason: `原 proposal 同时存在 artifact taxonomy、多条 naming axis、repair prose truth 与 proposal-only exact authority，无法满足 zero-unresolved`
- dominance_verdict: `SYN-CP-1 在 concept-count、public-surface、migration-cost、proof-strength、future-headroom 上形成直接改进，并通过 Ramanujan / Kolmogorov / Godel 三重 gate`

### Freeze Record

- adopted_summary: `runtime control plane 的 exact shell 当前只保留单一 VerificationControlPlaneReport、coordinate-first repairHints.focusRef 与 artifact-backed linking law。artifact taxonomy 退出，report naming axis 收成单一，consumed proposal 不再继续持有 exact carrier contract。`
- kernel_verdict: `通过。当前最强方案是继续压掉 artifact role、repair prose truth、多重 report naming 与 proposal-only exact authority。`
- frozen_decisions:
  - `VerificationControlPlaneReport` 继续只允许作为单一 top-level shell
  - report payload 的 `kind` 压成单一常量 `VerificationControlPlaneReport`
  - `repairHints` 的 machine core 收成 `code / canAutoRetry / upgradeToStage / focusRef`
  - `focusRef` 继续只承载 coordinate-first repair target
  - `relatedArtifactOutputKeys` 成为唯一 artifact linking 字段
  - `artifact.role` 退出 exact contract
  - `TrialReport` 只允许作为 pure alias
  - `runtime/09` 成为 report/materializer exact shell 的唯一 authority
  - 相关 consumed proposal 压成 freeze note
- non_goals:
  - 本轮不开始实现 core/CLI/test cutover
  - 本轮不冻结 domain payload exact row shape
  - 本轮不 reopen form semantic lanes
- allowed_reopen_surface:
  - 若首个真实 materializer consumer 证明 `relatedArtifactOutputKeys` 还能继续压缩，可单独 reopen linking shell
  - 若 future 需要 domain payload exact shape，继续由对应 domain SSoT 单点裁决
- proof_obligations:
  - `runtime/09` 必须写入 single report shell、coordinate-first repair target、artifact-backed linking law、pure alias law、supersession fence
  - `runtime-control-plane-materializer-report-contract.md` 必须压成 consumed freeze note
  - `form-static-ir-trial-contract.md`、`form-validation-funnel-export-contract.md`、`form-rule-i18n-message-contract.md` 必须压成 consumed freeze note
  - `docs/proposals/README.md` 必须记录本 proposal 已 consumed
- delta_from_previous_round: `从“focusRef + artifact role + flexible naming”压到“coordinate-first focusRef + artifact-backed linking + single naming axis + proposal freeze note”`

## Consensus

- reviewers: `A1, A2, A3, A4`
- adopted_candidate: `SYN-CP-1 single report shell + coordinate-first repair target + artifact-backed linking`
- final_status: `closed`
- stop_rule_satisfied: `true`
- residual_risk:
  - `@logixjs/core / cli / tests` 仍未同步到新 report contract，这仍是实现 residual
  - 首个真实 materializer consumer 落地前，`relatedArtifactOutputKeys` 仍可能继续压缩
