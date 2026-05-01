# Form Error Selector Primitive Contract Review Ledger

## Meta

- target:
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/form-error-selector-primitive-contract.md`
- targets:
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/form-error-selector-primitive-contract.md`
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/13-exact-surface-contract.md`
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/05-public-api-families.md`
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/form-react-sugar-factory-api-candidate.md`
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/Error.ts`
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/Path.ts`
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
  - `authority target=docs/proposals/form-error-selector-primitive-contract.md; bound docs=docs/ssot/form/13-exact-surface-contract.md, docs/ssot/form/05-public-api-families.md, docs/proposals/form-react-sugar-factory-api-candidate.md, packages/logix-form/src/Error.ts, packages/logix-form/src/Path.ts`
- review_contract:
  - `artifact_kind=ssot-contract`
  - `review_goal=zero-unresolved`
  - `target_claim=Form.Error 应拥有 descriptor-first 的 field error selector factory，负责 precedence policy，但不直接产出 hook 或 executable selector`
  - `non_default_overrides=reviewer_count=4,A4=enabled`
- review_object_manifest:
  - `source_inputs=proposal file path + bound docs`
  - `materialized_targets=none`
  - `authority_target=docs/proposals/form-error-selector-primitive-contract.md`
  - `bound_docs=docs/ssot/form/13-exact-surface-contract.md,docs/ssot/form/05-public-api-families.md,docs/proposals/form-react-sugar-factory-api-candidate.md,packages/logix-form/src/Error.ts,packages/logix-form/src/Path.ts`
  - `derived_scope=Form.Error selector primitive exact contract`
  - `allowed_classes=ambiguity,invalidity,controversy`
  - `blocker_classes=second-host-truth,owner-drift,executable-selector-overreach,path-read-dependency-leak,error-precedence-drift,route-creep`
  - `ledger_target=docs/review-plan/runs/2026-04-17-form-error-selector-primitive-review.md`
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
  - `必须删除一段 owner 歧义或 helper 膨胀面，且不得引入第二 host truth`
- ledger_path:
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-17-form-error-selector-primitive-review.md`
- writable:
  - `true`

## Assumptions

- A1:
  - summary:
    - `descriptor-first` 优于 `selector-first`
  - status:
    - `kept`
  - resolution_basis:
    - `reviewer 全体支持 non-executable / descriptor-first 主线`

## Round 1

### Phase

- challenge

### Input Residual

- none

### Findings

- F1 `blocker` `invalidity`:
  - 仍保留双候选，authority target 没有收成单一 adopted contract
- F2 `high` `invalidity`:
  - `ErrorSource` 漏掉 `submit`
- F3 `high` `invalidity`:
  - `order` 继续允许调用方改写，precedence owner 未闭合
- F4 `high` `invalidity`:
  - `{ kind, path, order }` 这类 structural descriptor 还不足以让 `Form.Error` 拥有 source resolution 单点 authority
- F5 `high` `controversy`:
  - exact contract 去向过宽，route-creep 风险偏高

### Counter Proposals

- P1:
  - summary:
    - `single adopted descriptor-first contract`
  - why_better:
    - 删掉双候选活正文
  - overturns_assumptions:
    - none
  - resolves_findings:
    - `F1`
  - supersedes_proposals:
    - `selector-first executable route`
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
    - `opaque token + no caller order`
  - why_better:
    - 让 precedence 与 source resolution 都回到 `Form.Error`
  - overturns_assumptions:
    - none
  - resolves_findings:
    - `F2`
    - `F3`
    - `F4`
  - supersedes_proposals:
    - `ErrorSource + options.order + structural descriptor`
  - dominance:
    - `dominates`
  - axis_scores:
    - `concept-count +1`
    - `public-surface +1`
    - `compat-budget 0`
    - `migration-cost 0`
    - `proof-strength +3`
    - `future-headroom +2`
- P3:
  - summary:
    - `single authority landing`
  - why_better:
    - exact shape 只进 `13`，`05` 只留 corollary，其余只做消费说明
  - overturns_assumptions:
    - none
  - resolves_findings:
    - `F5`
  - supersedes_proposals:
    - `tutorial + consumed proposal 一起承接 exact shape`
  - dominance:
    - `dominates`
  - axis_scores:
    - `concept-count +1`
    - `public-surface 0`
    - `compat-budget 0`
    - `migration-cost +2`
    - `proof-strength +1`
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

## Adoption

- adopted_candidate:
  - `E1: field-only opaque companion primitive`
- lineage:
  - `proposal baseline`
  - `P1`
  - `P2`
  - `P3`
- rejected_alternatives:
  - `selector-first executable route`
  - `自由 order`
  - `公开 structural descriptor`
  - `多落点 exact contract`
- rejection_reason:
  - `会重新引入 owner-drift、error-precedence-drift、route-creep`
- dominance_verdict:
  - `P1 + P2 + P3 在不恶化核心轴的前提下，对 baseline proposal 形成严格改进`

### Freeze Record

- adopted_summary:
  - `当前最小可证明的 Form.Error companion primitive 是：Form.Error.field(path) 返回一个由 Form.Error 单点拥有的 opaque、descriptor-first、non-executable token；precedence policy 与 source resolution 都不再外放给调用方。`
- kernel_verdict:
  - `通过 Ramanujan/Kolmogorov/Godel 三重 gate`
- frozen_decisions:
  - `只冻结一条 spelling：Form.Error.field(path)`
  - `返回物是 opaque token`
  - `descriptor-first`
  - `non-executable`
  - `caller 不可改 precedence`
  - `precedence policy 与 source resolution 单点停在 Form.Error`
  - `当前只冻结 field 路线`
  - `root / item / list / submit source` 的 exact spelling 后置
- non_goals:
  - `当前不冻结 source universe 的 exact公开表示`
  - `当前不冻结 root / item / list selector primitive`
  - `当前不冻结 executable selector`
  - `当前不把 exact shape 回写到 tutorial 正文`
- allowed_reopen_surface:
  - `submit source 是否进入 field selector`
  - `root / item / list selector primitive`
  - `source universe 的公开表示`
- proof_obligations:
  - `不引入第二 host truth`
  - `不让 caller 改 precedence`
  - `不让 helper 重写 source-to-path resolution`
  - `不把 descriptor 重新开放成 structural public object`
- delta_from_previous_round:
  - `删掉 selector-first 活正文`
  - `删掉 ErrorSource`
  - `删掉 options.order`
  - `删掉 structural descriptor shape`
  - `把 exact 回写面压回单点 authority`

## Round 2

### Phase

- converge

### Input Residual

- `检查 adopted freeze record 是否仍有 owner / precedence / route-creep residual`

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
  - `E1`
- final_status:
  - `consensus-reached`
- stop_rule_satisfied:
  - `true`
- residual_risk:
  - `后续若重开 submit source、root/item/list selector family 或 descriptor 公开结构，必须重新证明 opaque token、non-executable、precedence owner 三条冻结面不被破坏`
