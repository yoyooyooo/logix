# Form Read Projection Naming Contract Review Ledger

## Meta

- target:
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/form-read-projection-naming-contract.md`
- targets:
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/form-read-projection-naming-contract.md`
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/10-react-host-projection-boundary.md`
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/13-exact-surface-contract.md`
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/form-react-sugar-factory-api-candidate.md`
- source_kind:
  - `file-ssot-contract`
- reviewer_count:
  - `4`
- reviewer_model:
  - `gpt-5.4`
- reviewer_reasoning:
  - `xhigh`
- challenge_scope:
  - `open`
- consensus_status:
  - `closed`

## Bootstrap

- target_complete:
  - `authority target=docs/proposals/form-read-projection-naming-contract.md; bound docs=docs/ssot/runtime/10-react-host-projection-boundary.md, docs/ssot/form/13-exact-surface-contract.md, docs/proposals/form-react-sugar-factory-api-candidate.md`
- review_contract:
  - `artifact_kind=ssot-contract`
  - `review_goal=zero-unresolved`
  - `target_claim=最优 exact candidate 是 core-owned optional subpath @logixjs/react/FormProjection，导出 fieldValue(path) 和 formMeta() 两个纯读侧 builder`
  - `non_default_overrides=reviewer_count=4,A4=enabled`
- review_object_manifest:
  - `source_inputs=proposal file path + bound docs`
  - `materialized_targets=none`
  - `authority_target=docs/proposals/form-read-projection-naming-contract.md`
  - `bound_docs=docs/ssot/runtime/10-react-host-projection-boundary.md,docs/ssot/form/13-exact-surface-contract.md,docs/proposals/form-react-sugar-factory-api-candidate.md`
  - `derived_scope=read-side helper naming/import contract`
  - `allowed_classes=ambiguity,invalidity,controversy`
  - `blocker_classes=second-host-truth,subpath-overreach,noun-bloat,write-side-implied-path,route-creep`
  - `ledger_target=docs/review-plan/runs/2026-04-17-form-read-projection-naming-review.md`
- challenge_scope:
  - `open`
- reviewer_set:
  - `A1(gpt-5.4,xhigh)`
  - `A2(gpt-5.4,xhigh)`
  - `A3(gpt-5.4,xhigh)`
  - `A4(gpt-5.4,xhigh)`
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
  - `只有通过 Ramanujan/Kolmogorov/Godel 三重 gate 的更优方案才允许 reopen`
- reopen_bar:
  - `必须删除一段命名歧义或 subpath 误导面，且不得引入第二 host truth`
- ledger_path:
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-17-form-read-projection-naming-review.md`
- writable:
  - `true`

## Assumptions

- A1:
  - summary:
    - `FormProjection` 比 `FormSelectors` / `FormBinding` 更稳
  - status:
    - `kept`
  - resolution_basis:
    - `reviewer 认可主候选方向，但要求继续压缩活候选与 docs 落点`

## Round 1

### Phase

- challenge

### Input Residual

- none

### Findings

- F1 `blocker` `invalidity`:
  - 活的 import-path 候选仍在，形成 living planning anchor
- F2 `blocker` `invalidity`:
  - subpath promotion 过早进入冻结目标，存在 subpath-overreach
- F3 `high` `invalidity`:
  - namespace import 让 subpath 再长一层 family noun
- F4 `high` `invalidity`:
  - `formMeta()` 对 raw meta 语义过宽
- F5 `high` `invalidity`:
  - exact naming 的 authority 落点过宽，形成 route-creep

### Counter Proposals

- P1:
  - summary:
    - `single adopted contract`
  - why_better:
    - 删掉活候选与多层候选段落
  - overturns_assumptions:
    - none
  - resolves_findings:
    - `F1`
  - supersedes_proposals:
    - `FormSelectors`
    - `FormBinding`
  - dominance:
    - `dominates`
  - axis_scores:
    - `concept-count +2`
    - `public-surface +1`
    - `compat-budget 0`
    - `migration-cost +1`
    - `proof-strength +2`
    - `future-headroom +1`
- P2:
  - summary:
    - `named exports only`
  - why_better:
    - 删除 namespace carrier
  - overturns_assumptions:
    - none
  - resolves_findings:
    - `F3`
  - supersedes_proposals:
    - `import * as FormProjection`
  - dominance:
    - `dominates`
  - axis_scores:
    - `concept-count +1`
    - `public-surface +1`
    - `compat-budget 0`
    - `migration-cost 0`
    - `proof-strength +1`
    - `future-headroom +1`
- P3:
  - summary:
    - `export-only freeze`
  - why_better:
    - 本轮只冻 export noun，subpath promotion 后置
  - overturns_assumptions:
    - none
  - resolves_findings:
    - `F2`
    - `F4`
  - supersedes_proposals:
    - `@logixjs/react/FormProjection` as frozen subpath
    - `formMeta()`
  - dominance:
    - `dominates`
  - axis_scores:
    - `concept-count +2`
    - `public-surface +2`
    - `compat-budget +1`
    - `migration-cost +1`
    - `proof-strength +3`
    - `future-headroom +1`
- P4:
  - summary:
    - `single authority landing`
  - why_better:
    - naming/import 只落 runtime authority，其他页面只留 corollary
  - overturns_assumptions:
    - none
  - resolves_findings:
    - `F5`
  - supersedes_proposals:
    - `public-submodules / consumed proposal 承接 exact naming`
  - dominance:
    - `dominates`
  - axis_scores:
    - `concept-count +1`
    - `public-surface 0`
    - `compat-budget 0`
    - `migration-cost +2`
    - `proof-strength +2`
    - `future-headroom +1`

### Resolution Delta

- `F1` -> `adopted`
- `F2` -> `adopted`
- `F3` -> `adopted`
- `F4` -> `adopted`
- `F5` -> `adopted`
- `P1` `adopted`
- `P2` `adopted`
- `P3` `adopted`
- `P4` `adopted`

## Adoption

- adopted_candidate:
  - `N1: export-only freeze`
- lineage:
  - `proposal baseline`
  - `P1`
  - `P2`
  - `P3`
  - `P4`
- rejected_alternatives:
  - `FormSelectors`
  - `FormBinding`
  - `formMeta()`
  - `namespace import`
  - `independent subpath promotion in this round`
- rejection_reason:
  - `都会增加 noun-bloat、subpath-overreach 或 route-creep`
- dominance_verdict:
  - `P1 + P2 + P3 + P4 在不恶化核心轴的前提下，对 baseline proposal 形成严格改进`

### Freeze Record

- adopted_summary:
  - `当前最小可证明的 naming contract 只冻结两个 export noun：fieldValue(valuePath) 与 rawFormMeta()；canonical import style 固定为 named exports。独立 public subpath promotion 与 namespace import 继续后置。`
- kernel_verdict:
  - `通过 Ramanujan/Kolmogorov/Godel 三重 gate`
- frozen_decisions:
  - `这轮只冻结 export noun`
  - `export noun 固定为 fieldValue(valuePath) 与 rawFormMeta()`
  - `canonical import style 固定为 named exports`
  - `独立 public subpath promotion 继续后置`
  - `namespace import 继续拒绝`
  - `exact naming authority 只落 runtime authority 页`
- non_goals:
  - `当前不冻结独立 public subpath`
  - `当前不冻结 namespace carrier`
  - `当前不在 public-submodules 与 consumed proposal 中承接 exact naming 正文`
- allowed_reopen_surface:
  - `独立 public subpath promotion`
  - `更高层 meta export noun`
- proof_obligations:
  - `独立 entry 必须证明能压低 root canonical noise`
  - `不能放大 projection family 预算`
  - `不能重新长出第二 host truth`
- delta_from_previous_round:
  - `删掉 FormSelectors / FormBinding 活候选`
  - `删掉 formMeta()`
  - `删掉 namespace import canonical 示例`
  - `把 fieldValue(path) 收成 fieldValue(valuePath)`
  - `把 exact naming authority 压回 runtime 页`

## Round 2

### Phase

- converge

### Input Residual

- `检查 export-only freeze 是否仍有 unresolved blocker`

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- `A1: 无 unresolved findings`
- `A2: 无 unresolved findings`
- `A3: 无 unresolved findings`
- `A4: 无 unresolved findings`

## Consensus

- reviewers:
  - `A1: 无 unresolved findings`
  - `A2: 无 unresolved findings`
  - `A3: 无 unresolved findings`
  - `A4: 无 unresolved findings`
- adopted_candidate:
  - `N1`
- final_status:
  - `consensus-reached`
- stop_rule_satisfied:
  - `true`
- residual_risk:
  - `后续若重开独立 public subpath promotion，或尝试把 rawFormMeta() 放宽成 derived meta 入口，需要 reopen`
