# Form React Sugar Factory API Candidate Review Ledger

## Meta

- target:
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/form-react-sugar-factory-api-candidate.md`
- targets:
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/form-react-sugar-factory-api-candidate.md`
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/10-react-host-projection-boundary.md`
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/13-exact-surface-contract.md`
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/internal/form-api-tutorial.md`
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix-react/src/form-support.ts`
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/Path.ts`
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/Error.ts`
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
  - `authority target=docs/proposals/form-react-sugar-factory-api-candidate.md; bound docs=docs/ssot/runtime/10-react-host-projection-boundary.md, docs/ssot/form/13-exact-surface-contract.md, docs/internal/form-api-tutorial.md, examples/logix-react/src/form-support.ts, packages/logix-form/src/Path.ts, packages/logix-form/src/Error.ts`
- review_contract:
  - `artifact_kind=ssot-contract`
  - `review_goal=zero-unresolved`
  - `target_claim=最优 exact candidate 是 core-owned、field/meta only、hook-free split builders；最终 hook 留在 consumer-local`
  - `non_default_overrides=reviewer_count=4,A4=enabled`
- review_object_manifest:
  - `source_inputs=proposal file path + bound docs`
  - `materialized_targets=none`
  - `authority_target=docs/proposals/form-react-sugar-factory-api-candidate.md`
  - `bound_docs=docs/ssot/runtime/10-react-host-projection-boundary.md,docs/ssot/form/13-exact-surface-contract.md,docs/internal/form-api-tutorial.md,examples/logix-react/src/form-support.ts,packages/logix-form/src/Path.ts,packages/logix-form/src/Error.ts`
  - `derived_scope=exact optional helper API candidate`
  - `allowed_classes=ambiguity,invalidity,controversy`
  - `blocker_classes=second-host-truth,owner-drift,concrete-hook-family,internal-import-required,path-read-dependency-leak,premature-list-binder,monolithic-factory-regression`
  - `ledger_target=docs/review-plan/runs/2026-04-17-form-react-sugar-factory-api-review.md`
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
  - `必须删除一段 helper 结构或 owner 歧义，且不得引入第二 host truth`
- ledger_path:
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-17-form-react-sugar-factory-api-review.md`
- writable:
  - `true`

## Assumptions

- A1:
  - summary:
    - `split builders` 比总工厂更稳
  - status:
    - `kept`
  - resolution_basis:
    - `reviewer 全体同意继续拒绝总工厂与官方 concrete hook family`
- A2:
  - summary:
    - `readPath` 注入可以作为反 internal import 的最小合同
  - status:
    - `overturned`
  - resolution_basis:
    - `A1/A2/A3/A4 全部认为它形成 path-read-dependency-leak`
- A3:
  - summary:
    - `createFieldProjection / createMetaProjection / createFieldEvents` 三件套是当前最优 exact candidate
  - status:
    - `overturned`
  - resolution_basis:
    - `A2/A4 直接否掉 createFieldEvents；A1/A3 也要求继续收窄`

## Round 1

### Phase

- challenge

### Input Residual

- none

### Findings

- F1 `high` `invalidity`:
  - owner 已收住，但 exact candidate 仍然过大，helper noun 和 config 过多
- F2 `blocker` `invalidity`:
  - `ReadPath` 形成 `path-read-dependency-leak`
- F3 `high` `invalidity`:
  - `createFieldEvents` 收益过薄，目标函数过大
- F4 `high` `invalidity`:
  - field-ui leaf shape 被提前写进 helper 合同
- F5 `high` `invalidity`:
  - error precedence 从 `Form.Error` 漂移到 core helper
- F6 `high` `invalidity`:
  - `summary / canSubmit / isValid / isPristine / snapshot` 提前冻结了聚合 view
- F7 `medium` `controversy`:
  - exact API 目标页与文档回写面过多

### Counter Proposals

- P1:
  - summary:
    - `projection-only / read-only surface`
  - why_better:
    - 删掉写侧 builder 与聚合 view，目标函数更小
  - overturns_assumptions:
    - `A3`
  - resolves_findings:
    - `F3`
    - `F6`
  - supersedes_proposals:
    - `createFieldEvents`
  - dominance:
    - `dominates`
  - axis_scores:
    - `concept-count +2`
    - `public-surface +2`
    - `compat-budget 0`
    - `migration-cost +1`
    - `proof-strength +2`
    - `future-headroom +1`
- P2:
  - summary:
    - `descriptor-first field value only`
  - why_better:
    - 删掉 `ReadPath`、field-ui 假设和 helper-side error policy
  - overturns_assumptions:
    - `A2`
    - `A3`
  - resolves_findings:
    - `F2`
    - `F4`
    - `F5`
  - supersedes_proposals:
    - `createFieldProjection + readPath + errorOrder + touchedKey + dirtyKey`
  - dominance:
    - `dominates`
  - axis_scores:
    - `concept-count +2`
    - `public-surface +2`
    - `compat-budget 0`
    - `migration-cost 0`
    - `proof-strength +3`
    - `future-headroom +2`
- P3:
  - summary:
    - `raw $form only`
  - why_better:
    - 删掉 summary getter 面，只保留 exact state truth 的 raw meta
  - overturns_assumptions:
    - `A3`
  - resolves_findings:
    - `F6`
  - supersedes_proposals:
    - `summary/canSubmit/isValid/isPristine`
  - dominance:
    - `dominates`
  - axis_scores:
    - `concept-count +1`
    - `public-surface +1`
    - `compat-budget 0`
    - `migration-cost 0`
    - `proof-strength +2`
    - `future-headroom +1`

### Resolution Delta

- `F1` -> `adopted`
- `F2` -> `adopted`
- `F3` -> `adopted`
- `F4` -> `adopted`
- `F5` -> `adopted`
- `F6` -> `adopted`
- `F7` -> `adopted`
- `A2` `overturned`
- `A3` `overturned`
- `P1` `adopted`
- `P2` `adopted`
- `P3` `adopted`

## Adoption

- adopted_candidate:
  - `R1: minimal read-only contract`
- lineage:
  - `proposal baseline`
  - `P1`
  - `P2`
  - `P3`
- rejected_alternatives:
  - `总工厂`
  - `官方 concrete hook family`
  - `readPath 注入`
  - `createFieldEvents`
  - `summary / snapshot / canSubmit / isValid / isPristine`
- rejection_reason:
  - `都会增加第二 host truth、隐藏 ABI 或聚合 view 回潮风险`
- dominance_verdict:
  - `P1 + P2 + P3 在不恶化核心轴的前提下，对 baseline proposal 形成严格改进`

### Freeze Record

- adopted_summary:
  - `当前最小可证明的 sugar-factory API 只剩 read-only：field value projection builder 加 raw $form meta projection builder；field error、field ui meta、写侧 adapter 和 list sugar 全部后置。`
- kernel_verdict:
  - `通过 Ramanujan/Kolmogorov/Godel 三重 gate`
- frozen_decisions:
  - `当前只冻结 read-only helper`
  - `当前只保留两类 builder：field value projection builder、raw $form meta projection builder`
  - `createFieldEvents` 退出本轮
  - `ReadPath` 退出本轮
  - `errorOrder` 退出本轮
  - `summary / snapshot / canSubmit / isValid / isPristine` 退出本轮
  - `field error selector` 继续由 `Form.Error` future selector primitive 承接
  - `field ui meta` 继续等待单独合同
- non_goals:
  - `当前不冻结 import path`
  - `当前不冻结 field error selector exact spelling`
  - `当前不冻结 write-side sugar`
  - `当前不冻结 list sugar`
- allowed_reopen_surface:
  - `field error selector primitive`
  - `field-ui projection contract`
  - `write-side adapter`
  - `list sugar`
- proof_obligations:
  - `完全可回解到 useModule + useSelector + direct handle`
  - `不依赖 internal import`
  - `不改变 Form.Error owner`
  - `不重新长出 summary / snapshot / useX family`
- delta_from_previous_round:
  - `删掉 createFieldEvents`
  - `删掉 ReadPath`
  - `删掉 errorOrder`
  - `删掉 touchedKey / dirtyKey`
  - `删掉 summary / snapshot / canSubmit / isValid / isPristine`
  - `把 meta builder 压成单一 raw $form query`

## Round 2

### Phase

- converge

### Input Residual

- `检查 minimal read-only contract 是否仍有 unresolved blocker`

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- `A1: 无 unresolved findings`
- `A3: 无 unresolved findings`
- `A4: 无 unresolved findings`
- `A2: 继续要求把 raw meta builder 压成单一 meta() query`

## Round 3

### Phase

- converge

### Input Residual

- `A2 residual: raw meta builder 是否仍然过宽`

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- `meta builder 已压成单一 meta() query`
- `all residual findings closed`

## Consensus

- reviewers:
  - `A1: 无 unresolved findings`
  - `A2: 无 unresolved findings`
  - `A3: 无 unresolved findings`
  - `A4: 无 unresolved findings`
- adopted_candidate:
  - `R1`
- final_status:
  - `consensus-reached`
- stop_rule_satisfied:
  - `true`
- residual_risk:
  - `后续若把 field value projection 扩到 error/ui，或把 raw $form meta builder 扩到 summary/canSubmit 等派生聚合，就需要 reopen`
