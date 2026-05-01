# Form Validation Funnel And Export Contract Review Ledger

## Meta

- target: `docs/proposals/form-validation-funnel-export-contract.md`
- targets:
  - `docs/proposals/form-validation-funnel-export-contract.md`
  - `docs/ssot/form/02-gap-map-and-target-direction.md`
  - `docs/ssot/form/03-kernel-form-host-split.md`
  - `docs/ssot/form/06-capability-scenario-api-support-map.md`
  - `docs/proposals/README.md`
- source_kind: `file-ssot-contract`
- reviewers: `A1, A2, A3, A4`
- round_count: `2`
- challenge_scope: `open`
- consensus_status: `closed`

## Bootstrap

- target_complete: `authority target=form validation funnel and export boundary; bound docs cover validation direction, static IR / trial, rule x i18n, runtime control plane, and current logix-form bridge drift`
- review_contract:
  - artifact_kind: `ssot-contract`
  - review_goal: `zero-unresolved`
  - target_claim: `在 forward-only、零存量用户、Effect-first 前提下，form validation 应继续把 schema bridge 压成 submit-only 的 decode-origin canonical bridge，并把 diagnostics / trial / repair 对 Form truth 的读取压成 runtime control plane owned 的 materializer admissibility，从而避免第二 schema world、第二 parse/result contract、第二 issue noun、第二 report object 与错位 writeback`
  - non_default_overrides: `challenge scope=open; open scope includes decode gate、bridge law、materializer admissibility、capability naming、residue/cutover、writeback routing`
- review_object_manifest:
  - source_inputs:
    - `docs/proposals/form-validation-funnel-export-contract.md`
    - `docs/proposals/form-validation-api-direction.md`
    - `docs/proposals/form-static-ir-trial-contract.md`
    - `docs/proposals/form-rule-i18n-message-contract.md`
    - `docs/ssot/form/02-gap-map-and-target-direction.md`
    - `docs/ssot/form/03-kernel-form-host-split.md`
    - `docs/ssot/form/06-capability-scenario-api-support-map.md`
    - `docs/ssot/runtime/09-verification-control-plane.md`
    - `packages/logix-form/src/internal/schema/SchemaPathMapping.ts`
    - `packages/logix-form/src/internal/schema/SchemaErrorMapping.ts`
    - `packages/logix-form/src/internal/form/commands.ts`
    - `packages/logix-form/src/internal/form/errors.ts`
  - materialized_targets:
    - `docs/proposals/form-validation-funnel-export-contract.md`
    - `docs/ssot/form/02-gap-map-and-target-direction.md`
    - `docs/ssot/form/03-kernel-form-host-split.md`
    - `docs/ssot/form/06-capability-scenario-api-support-map.md`
    - `docs/proposals/README.md`
  - authority_target: `form-validation-funnel-export-contract@2026-04-16`
  - bound_docs:
    - `docs/ssot/form/13-exact-surface-contract.md`
    - `docs/ssot/runtime/09-verification-control-plane.md`
  - derived_scope: `form validation future planning only`
  - allowed_classes:
    - `submit-only decode gate`
    - `decode-origin canonical bridge`
    - `control-plane materializer admissibility`
    - `capability-level naming`
    - `residue/cutover`
    - `writeback routing`
  - blocker_classes:
    - `second schema world`
    - `second parse/result contract`
    - `second issue noun`
    - `second report object`
    - `proposal-only exact authority`
    - `exact-surface reopen without proof`
    - `runtime/form duplicated verification law`
  - ledger_target: `docs/review-plan/runs/2026-04-16-form-validation-funnel-export-contract-review.md`
- challenge_scope: `open`
- reviewer_set: `A1, A2, A3, A4`
- active_advisors: `A4`
- activation_reason: `目标涉及 public contract、authority split、control-plane 邻接与成功标准挑战，需要直接否定错误目标函数`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan, Kolmogorov, Godel`
- dominance_axes: `concept-count, public-surface, compat-budget, migration-cost, proof-strength, future-headroom`
- stop_rule:
  - `Ramanujan gate`: 至少压掉一个多余 noun、一个多余 gate、或一层 proposal-only exact contract
  - `Kolmogorov gate`: `concept-count / public-surface / compat-budget` 不能整体变差；若核心轴不变，必须在 `proof-strength` 或 `future-headroom` 上形成严格改进
  - `Godel gate`: 不得引入第二 authority、第二 report object、第二 issue truth、第二 parse/result contract、或未解释矛盾
- reopen_bar: `只有出现更小更强，且能同时压掉 materializer 双轨与 gate 二义性的候选时，才允许 reopen`
- ledger_path: `docs/review-plan/runs/2026-04-16-form-validation-funnel-export-contract-review.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `Form 需要自己冻结 export row/profile contract，runtime control plane 之后再理解也不会形成双重 authority`
  - status: `overturned`
  - resolution_basis: `A1/A3/A4 一致要求把 export exactness 收成 control-plane materializer admissibility，删除 Form 侧 profile noun。`
- A2:
  - summary: `root structural decode 可以在 submit 之外再挂一个 canonical gate，而无需 declaration/witness/lifetime 补证`
  - status: `overturned`
  - resolution_basis: `A1/A3/A4 一致要求 gate 收紧到 submit lane only。`
- A3:
  - summary: `schema bridge 想写到 exact，必须保留多段 stage 表与重复 owner 叙述`
  - status: `overturned`
  - resolution_basis: `A2 要求压成单一 bridge law，主 owner split 只保留在 03。`
- A4:
  - summary: `issue` 仍然是描述 error/pending/cleanup/stale 这组视图的最佳 planning noun`
  - status: `overturned`
  - resolution_basis: `A4 明确指出名词失配；A1/A3 也要求把 noun 收回到 capability/materializer 层。`
- A5:
  - summary: `verification 坐标与 compare 主轴需要在 form 页重复整段重写，页面才算自洽`
  - status: `overturned`
  - resolution_basis: `A2 一致要求 generic verification law 回链 runtime/09，Form 页只保留 domain bindings。`
- A6:
  - summary: `surviving helper name 可以直接作为 planning noun 写入主 SSoT，不会带来 public/internal 绑定压力`
  - status: `overturned`
  - resolution_basis: `A3 要求 capability-level naming 与 surviving helper name 分离，并补 residue/cutover 表。`

## Round 1

### Phase

- `challenge`

### Input Residual

- none

### Findings

- F1 `critical` `invalidity`:
  - summary: proposal 把 export/issue/profile 冻成 Form 侧 exact contract，owner/writeback 断裂，形成 proposal-only exact authority
  - evidence: `A1 + A3 + A4`
  - status: `merged`
- F2 `high` `invalidity`:
  - summary: structural decode gate 同时保留 submit 与显式 root route，形成第二 attempt noun 与 fallback 二义性
  - evidence: `A1 + A3 + A4`
  - status: `merged`
- F3 `high` `invalidity`:
  - summary: bridge exact law 被拆成过多 stage/owner/profile prose，压缩不足
  - evidence: `A2`
  - status: `merged`
- F4 `high` `invalidity`:
  - summary: verification law 在 form 与 runtime 多点重复，逼近 runtime/form 双重 truth
  - evidence: `A2`
  - status: `merged`
- F5 `medium` `controversy`:
  - summary: surviving helper name 与实现 residue 没有明确 tombstone，future cutover 不可核对
  - evidence: `A2 + A3`
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
  - summary: `SYN-FUNNEL-1 submit-only decode bridge + control-plane materializer admissibility`
  - why_better: `把 root structural decode gate 压到 submit lane only，把 bridge 收成单 law，把 export exactness 收成 admissibility，把 verification law 回链 runtime/09，并补 capability naming 与 residue table`
  - overturns_assumptions: `A1, A2, A3, A4, A5, A6`
  - resolves_findings: `F1, F2, F3, F4, F5`
  - supersedes_proposals:
    - `A1 ALT-1`
    - `A1 ALT-2`
    - `A1 ALT-3`
    - `A2 ALT-01`
    - `A2 ALT-02`
    - `A2 ALT-03`
    - `A2 ALT-04`
    - `A3 ALT-A3-2`
    - `A3 ALT-A3-3`
    - `A4 ALT-A4-01`
    - `A4 ALT-A4-02`
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

- 删除 Form 侧 `issue noun` 与 `summary/repair profile` 冻结
- canonical structural decode gate 收紧到 submit lane only
- schema bridge 压成单一 decode-origin canonical bridge law
- generic verification matrix / compare 主轴 / environment gate 回链 runtime/09
- 主 SSoT 名词层改成 capability-level naming
- proposal 新增 residue / cutover table
- 02/03/06 完成实际 writeback

## Round 2

### Phase

- `converge`

### Input Residual

- 检查 export/issue/profile noun 是否真的退出 Form planning
- 检查 gate 是否真的收紧到 submit lane only
- 检查 verification law 是否已回链 runtime/09
- 检查 capability naming 与 residue table 是否已实际落盘

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- reviewers A1/A2/A3/A4 全部返回 `无 unresolved findings`

## Adoption

- adopted_candidate: `SYN-FUNNEL-1 submit-only decode bridge + control-plane materializer admissibility`
- lineage: `A1 ALT-1/2/3 + A2 ALT-01/02/03/04 + A3 ALT-A3-2/3 + A4 ALT-A4-01/02`
- rejected_alternatives: `P1`
- rejection_reason: `原 proposal 同时存在 proposal-only exact authority、issue noun/profile 过度冻结、decode gate 二义性、verification law 重复与 residue 不可核对，无法满足 zero-unresolved`
- dominance_verdict: `SYN-FUNNEL-1 在 concept-count、public-surface、migration-cost、proof-strength、future-headroom 上形成直接改进，并通过 Ramanujan / Kolmogorov / Godel 三重 gate`

### Freeze Record

- adopted_summary: `Form validation 的这轮 future closure 只保留三条 law：submit-only structural decode gate、decode-origin canonical bridge、runtime control plane owned materializer admissibility。Form 只负责 truth 与坐标可投影，不再冻结 issue noun、row/profile contract 或第二报告对象。`
- kernel_verdict: `通过。当前最强方案是继续压掉 issue/profile noun、root-side second decode gate、proposal-only exact authority 与 helper-name leakage。`
- frozen_decisions:
  - structural decode gate 在 Form canonical planning 中先固定为 `submit lane only`
  - decode-origin canonical bridge 只冻结 normalized decode facts、path-first lowering、submit fallback
  - diagnostics / trial explain / repair 对 Form truth 的读取只冻结为 control-plane materializer admissibility
  - `issue list` 只允许作为 consumer label，不进入 Form planning noun
  - generic verification matrix / compare 主轴 / environment gate 统一回链 `runtime/09`
  - capability-level contract 与 surviving helper name 分离
  - residue / cutover table 作为本轮 cutover obligation 冻结
- non_goals:
  - 本轮不 reopen exact surface
  - 本轮不冻结 runtime control plane materializer 的 exact object shape
  - 本轮不开始实现 cutover
- allowed_reopen_surface:
  - 若 control plane 未来要冻结 materializer / report exact shape，可单独 reopen `runtime/09`
  - 若 future 需要 pre-submit structural decode route，必须先补 declaration anchor、witness anchor、clear trigger
- proof_obligations:
  - `02` 必须写入 submit-only decode gate、decode-origin canonical bridge、control-plane materializer admissibility、capability naming corollary
  - `03` 必须写入 decode-origin canonical bridge owner split 与 control-plane materializer owner split
  - `06` 必须写入 submit-only decode gate、decode fallback、materializer admissibility witness
  - `docs/proposals/README.md` 必须记录 proposal 已 consumed
  - proposal 必须保留 residue / cutover table
- delta_from_previous_round: `从“schema bridge exact funnel + export profile”压到“submit-only decode bridge + control-plane materializer admissibility + capability naming + residue table”`

## Consensus

- reviewers: `A1, A2, A3, A4`
- adopted_candidate: `SYN-FUNNEL-1 submit-only decode bridge + control-plane materializer admissibility`
- final_status: `closed`
- stop_rule_satisfied: `true`
- residual_risk:
  - `runtime/09` 侧 materializer / report exact shape 仍是宽合同；若未来要冻结对象形状，必须在 runtime control plane 单点收口
  - 实现层的 `SchemaError=unknown`、raw writeback、`errors.$schema`、string leaf counting 仍是代码 residue；若 cutover table 没被真正执行，文档与实现会再次漂移
  - `reasonProjectionSlice` 仍是相对宽的 declaration slice 桶，后续 exact surface / implementation cutover 需要继续防止 helper residue 回流成 planning noun
