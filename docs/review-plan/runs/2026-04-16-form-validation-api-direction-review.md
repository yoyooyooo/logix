# Form Validation API Direction Review Ledger

## Meta

- target: `docs/proposals/form-validation-api-direction.md`
- targets:
  - `docs/proposals/form-validation-api-direction.md`
  - `docs/ssot/form/02-gap-map-and-target-direction.md`
  - `docs/ssot/form/03-kernel-form-host-split.md`
  - `docs/ssot/form/06-capability-scenario-api-support-map.md`
- source_kind: `file-ssot-contract`
- reviewers: `A1, A2, A3, A4`
- round_count: `2`
- challenge_scope: `open`
- consensus_status: `closed`

## Bootstrap

- target_complete: `authority target=form validation API direction; bound docs cover semantic closure, static IR / trial, rule x i18n, RHF harvest, react host law, and local form validation implementation evidence`
- review_contract:
  - artifact_kind: `ssot-contract`
  - review_goal: `zero-unresolved`
  - target_claim: `under zero-user and forward-only assumptions, form validation should converge on an Effect-first ownership overlay where Effect Schema owns structural validation authority, Form owns form-specific rule semantics, and a narrow schema bridge lowers decode outputs into canonical form validation truth without inventing a second schema world, second parse/result contract, second transform contract, or second host truth`
  - non_default_overrides: `challenge scope=open; open scope includes current drift snapshot, validation routing law, schema bridge, effectful rule lowering, annotation routing, and writeback routing`
- review_object_manifest:
  - source_inputs:
    - `docs/proposals/form-validation-api-direction.md`
    - `docs/proposals/form-semantic-closure-contract.md`
    - `docs/proposals/form-static-ir-trial-contract.md`
    - `docs/proposals/form-rule-i18n-message-contract.md`
    - `docs/proposals/form-rhf-capability-harvest.md`
    - `docs/ssot/runtime/10-react-host-projection-boundary.md`
    - `packages/logix-form/src/Rule.ts`
    - `packages/logix-form/src/internal/validators/index.ts`
    - `packages/logix-form/src/internal/schema/SchemaErrorMapping.ts`
    - `packages/logix-form/src/internal/form/commands.ts`
    - `packages/logix-form/src/internal/form/errors.ts`
  - materialized_targets:
    - `docs/proposals/form-validation-api-direction.md`
    - `docs/ssot/form/02-gap-map-and-target-direction.md`
    - `docs/ssot/form/03-kernel-form-host-split.md`
    - `docs/ssot/form/06-capability-scenario-api-support-map.md`
  - authority_target: `form-validation-api-direction@2026-04-16`
  - bound_docs:
    - `docs/ssot/form/01-current-capability-map.md`
    - `docs/ssot/form/13-exact-surface-contract.md`
    - `docs/ssot/runtime/10-react-host-projection-boundary.md`
  - derived_scope: `form validation current assessment + future planning only`
  - allowed_classes:
    - `current drift snapshot`
    - `validation routing law`
    - `schema bridge`
    - `effectful rule lowering`
    - `annotation routing`
    - `writeback routing`
  - blocker_classes:
    - `second schema world`
    - `second parse/result contract`
    - `second transform contract`
    - `second validation truth`
    - `second taxonomy`
    - `exact-surface reopen without proof`
    - `competitor survey bloat`
    - `effect-capable features duplicated in Form`
  - ledger_target: `docs/review-plan/runs/2026-04-16-form-validation-api-direction-review.md`
- challenge_scope: `open`
- reviewer_set: `A1, A2, A3, A4`
- active_advisors: `A4`
- activation_reason: `目标涉及 public contract、长期治理、Effect-first 边界、validation 架构与 authority bucket，需要直接挑战目标函数和成功标准`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan, Kolmogorov, Godel`
- dominance_axes: `concept-count, public-surface, compat-budget, migration-cost, proof-strength, future-headroom`
- stop_rule:
  - `Ramanujan gate`: 至少压掉一个重复 contract、一个错位 authority、或一段 competitor-survey 冗余
  - `Kolmogorov gate`: `concept-count / public-surface / compat-budget` 不能整体变差；若核心轴不变，必须在 `proof-strength` 或 `future-headroom` 上形成严格改进
  - `Godel gate`: 不得引入第二 authority、第二 workflow、第二 schema world、第二 error/result contract、或未解释矛盾
- reopen_bar: `只有出现更小更强且能同时压掉第二 taxonomy 与第二 contract 风险的候选时，才允许 reopen`
- ledger_path: `docs/review-plan/runs/2026-04-16-form-validation-api-direction-review.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `competitor baseline 与五轴评估本身就能充当 adoption target`
  - status: `overturned`
  - resolution_basis: `A2/A4 一致要求 assessment 退到 drift snapshot，核心权威改成 adoption gate + delta。`
- A2:
  - summary: `Schema lane / Rule lane / Bridge lane 需要作为新顶层 taxonomy 写入 planning`
  - status: `overturned`
  - resolution_basis: `A2/A3/A4 一致要求把它收成附着于既有 root grammar 的 validation ownership overlay。`
- A3:
  - summary: `ValidationIssue` 需要作为独立 noun 才能服务 diagnostics / trial / repair / export`
  - status: `overturned`
  - resolution_basis: `A1/A2/A3/A4 一致要求删掉独立 issue noun，只允许从既有 truth 纯派生 issue 视图。`
- A4:
  - summary: `effectful rule contract 可以先写成 sync | Effect 联合返回`
  - status: `overturned`
  - resolution_basis: `A2/A4 一致要求 effectful rule 只冻结 lowering law，同步写法只是 sugar lift。`
- A5:
  - summary: `Form 需要维护自己的 validation annotations 字段清单`
  - status: `overturned`
  - resolution_basis: `A1/A2 一致要求 D5 改成 routing law，Form 新增 annotation noun 数量为 0。`
- A6:
  - summary: `01-current-capability-map 可以顺手承接 drift`
  - status: `overturned`
  - resolution_basis: `A3/A4 一致要求 01 只保留 snapshot，drift 和 future delta 只进 02/03/06。`

## Round 1

### Phase

- `challenge`

### Input Residual

- none

### Findings

- F1 `critical` `invalidity`:
  - summary: proposal 缺少 adoption gate，仍停在“成熟度评估 + peer baseline 解释力”层
  - evidence: `A4 + A2`
  - status: `merged`
- F2 `high` `invalidity`:
  - summary: `Schema lane / Rule lane / Bridge lane` 写成新顶层 taxonomy，威胁既有 root grammar
  - evidence: `A2 + A3 + A4`
  - status: `merged`
- F3 `high` `invalidity`:
  - summary: `ValidationIssue` 与 `RuleOutcome / RuleEffect` 正在形成第二 validation truth 与第二执行合同
  - evidence: `A1 + A2 + A3 + A4`
  - status: `merged`
- F4 `high` `invalidity`:
  - summary: schema interop funnel 仍让 bridge 感知多种外部 schema / parse vocabulary
  - evidence: `A1`
  - status: `merged`
- F5 `medium` `invalidity`:
  - summary: writeback routing 把 drift 与开放问题写向 snapshot / exact authority
  - evidence: `A1 + A3 + A4`
  - status: `merged`

### Counter Proposals

- P1:
  - summary: `保留原始 validation proposal，只做 wording 修补`
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
  - summary: `SYN-VAL-1 effect-first validation ownership overlay`
  - why_better: `把 proposal 压成 drift snapshot + adoption gate + ownership overlay + schema bridge funnel + effectful lowering law + routing law，并删掉第二 noun 与第二 taxonomy`
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

- 删除 `Peer Baselines` 与五轴矩阵
- 新增 `Validation Adoption Gate`
- `Schema / Rule / Bridge` 改写成 validation ownership overlay
- 删除独立 `ValidationIssue`
- D3 改成 effectful rule lowering law
- D5 改成 annotation routing law
- writeback 只保留 `02 / 03 / 06`

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

- adopted_candidate: `SYN-VAL-1 effect-first validation ownership overlay`
- lineage: `ALT-A1-01 + ALT-A1-02 + ALT-A1-03 + ALT-A1-04 + ALT-A2-01 + ALT-A2-02 + ALT-A2-03 + ALT-A2-04 + ALT-A2-05 + A3 counter proposal + A4 ALT-1/2/3/4`
- rejected_alternatives: `P1`
- rejection_reason: `原始 proposal 同时存在 competitor-survey 冗余、第二 taxonomy、第二 issue/result contract 与错位 writeback，无法满足 zero-unresolved`
- dominance_verdict: `SYN-VAL-1 在 concept-count, public-surface, migration-cost, proof-strength, future-headroom 上形成直接改进，并通过 Ramanujan / Kolmogorov / Godel 三重 gate`

### Freeze Record

- adopted_summary: `form validation 的 future direction 只保留一条 Effect-first planning law：Effect Schema 继续持有 structural validation authority，Form 继续持有 form-specific rule semantics，schema bridge 继续只做 decode-origin lowering；effectful rule 只作为既有 settlement contributor 的 lowering law，任何 diagnostics/export 需要的 issue 视图都只能从既有 truth 纯派生。`
- kernel_verdict: `通过。当前最强方案是继续压掉第二 schema world、第二 issue/result contract、第二 taxonomy 和错位 authority writeback。`
- frozen_decisions:
  - validation 只允许作为既有 root grammar 的 ownership overlay 存在
  - structural schema authority 默认优先由 Effect Schema 承接
  - schema bridge funnel 固定为 `external schema -> adapter -> Effect Schema contract -> schema bridge`
  - effectful rule 只冻结 lowering law，不新增 outcome noun
  - derived issue projection 只允许从既有 truth 纯派生
  - Form 新增 annotation noun 数量固定为 0
  - writeback 只允许进入 `02 / 03 / 06`
- non_goals:
  - 本轮不 reopen exact surface
  - 本轮不 reopen react exact host law
  - 本轮不把 current drift 写回 snapshot authority
- allowed_reopen_surface:
  - 若未来需要 law-level schema adapter contract，可单独 reopen schema bridge exact shape
  - 若未来需要 control-plane export issue shape，可单独 reopen export projection
- proof_obligations:
  - `02` 必须写入 validation ownership overlay、schema bridge funnel、effectful rule lowering law、annotation routing law
  - `03` 必须只写 owner split corollary，不新增 validating 或 evidence owner
  - `06` 必须写入 schema bridge、effectful rule、derived issue projection witness
  - 不得重新引入 `ValidationIssue` noun
  - 不得把 `Schema/Rule/Bridge` 写成第二套 root grammar
- delta_from_previous_round: `从 validation API survey 风格 proposal，压到 effect-first ownership overlay 与单一 lowering law`

## Consensus

- reviewers: `A1, A2, A3, A4`
- adopted_candidate: `SYN-VAL-1 effect-first validation ownership overlay`
- final_status: `closed`
- stop_rule_satisfied: `true`
- residual_risk:
  - 写回 02/03/06 时若把 overlay 写成新 grammar，或把 derived issue projection 写成 canonical truth，会触发 reopen
  - schema bridge funnel 若在未来实现时重新接受多种 parse/result vocabulary，也会触发 reopen
