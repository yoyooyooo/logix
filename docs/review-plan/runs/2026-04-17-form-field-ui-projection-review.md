# Form Field UI Projection Contract Review Ledger

## Meta

- target:
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/form-field-ui-projection-contract.md`
- targets:
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/form-field-ui-projection-contract.md`
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/13-exact-surface-contract.md`
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/10-react-host-projection-boundary.md`
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/form-react-sugar-factory-api-candidate.md`
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix-react/src/form-support.ts`
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/internal/form/reducer.ts`
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
  - `authority target=docs/proposals/form-field-ui-projection-contract.md; bound docs=docs/ssot/form/13-exact-surface-contract.md, docs/ssot/runtime/10-react-host-projection-boundary.md, docs/proposals/form-react-sugar-factory-api-candidate.md, examples/logix-react/src/form-support.ts, packages/logix-form/src/internal/form/reducer.ts`
- review_contract:
  - `artifact_kind=ssot-contract`
  - `review_goal=zero-unresolved`
  - `target_claim=field-ui projection 当前应先冻结 boundary，不急着把 touched/dirty 升成 exact public leaf shape`
  - `non_default_overrides=reviewer_count=4,A4=enabled`
- review_object_manifest:
  - `source_inputs=proposal file path + bound docs`
  - `materialized_targets=none`
  - `authority_target=docs/proposals/form-field-ui-projection-contract.md`
  - `bound_docs=docs/ssot/form/13-exact-surface-contract.md,docs/ssot/runtime/10-react-host-projection-boundary.md,docs/proposals/form-react-sugar-factory-api-candidate.md,examples/logix-react/src/form-support.ts,packages/logix-form/src/internal/form/reducer.ts`
  - `derived_scope=field-ui projection boundary / exact leaf gate`
  - `allowed_classes=ambiguity,invalidity,controversy`
  - `blocker_classes=second-projection-truth,example-local-leaf-assumption,field-ui-owner-drift,premature-exact-leaf,route-creep`
  - `ledger_target=docs/review-plan/runs/2026-04-17-form-field-ui-projection-review.md`
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
  - `必须删除一段 field-ui 歧义或 helper 误读面，且不得引入第二 projection truth`
- ledger_path:
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-17-form-field-ui-projection-review.md`
- writable:
  - `true`

## Assumptions

- A1:
  - summary:
    - `touched / dirty` 已经是 field-ui 最值得优先冻结的 leaf
  - status:
    - `overturned`
  - resolution_basis:
    - `reviewer 全体同意当前只够做 boundary freeze，不够升成 exact leaf`

## Round 1

### Phase

- challenge

### Input Residual

- none

### Findings

- F1 `blocker` `invalidity`:
  - 活候选 `A / B / C` 仍在 authority target 中，形成 living planning anchor
- F2 `high` `invalidity`:
  - `touched / dirty` 被放在正文中心，形成 premature exact leaf 吸引力
- F3 `high` `invalidity`:
  - owner 不够闭合，helper 未来仍可能反向定义 leaf shape
- F4 `high` `invalidity`:
  - route-creep，计划回写面过宽

### Counter Proposals

- P1:
  - summary:
    - `boundary-only freeze`
  - why_better:
    - 只冻结 companion boundary，不再保留 exact leaf 候选
  - overturns_assumptions:
    - `A1`
  - resolves_findings:
    - `F1`
    - `F2`
  - supersedes_proposals:
    - `freeze exact leaf shape`
  - dominance:
    - `dominates`
  - axis_scores:
    - `concept-count +2`
    - `public-surface +1`
    - `compat-budget 0`
    - `migration-cost +1`
    - `proof-strength +3`
    - `future-headroom +1`
- P2:
  - summary:
    - `two-layer owner closure`
  - why_better:
    - 把 leaf truth owner 与 helper consumer owner 分开冻结
  - overturns_assumptions:
    - none
  - resolves_findings:
    - `F3`
  - supersedes_proposals:
    - `owner 继续在 Form state truth`
  - dominance:
    - `dominates`
  - axis_scores:
    - `concept-count +1`
    - `public-surface 0`
    - `compat-budget 0`
    - `migration-cost 0`
    - `proof-strength +2`
    - `future-headroom +2`
- P3:
  - summary:
    - `single authority landing`
  - why_better:
    - exact boundary 只进 13，runtime 只留 corollary，其余只引用
  - overturns_assumptions:
    - none
  - resolves_findings:
    - `F4`
  - supersedes_proposals:
    - `tutorial + sibling proposal 承接正文`
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
- `A1` `overturned`
- `P1` `adopted`
- `P2` `adopted`
- `P3` `adopted`

## Adoption

- adopted_candidate:
  - `U1: boundary-only field-ui contract`
- lineage:
  - `proposal baseline`
  - `P1`
  - `P2`
  - `P3`
- rejected_alternatives:
  - `A: freeze exact leaf shape`
  - `C: keep fully unknown`
  - `多落点 exact boundary`
- rejection_reason:
  - `A` 过早升格 example-local leaf 假设
  - `C` 过于保守，不能提供 companion boundary 证明
  - `多落点` 会形成 route-creep
- dominance_verdict:
  - `P1 + P2 + P3 在不恶化核心轴的前提下，对 baseline proposal 形成严格改进`

### Freeze Record

- adopted_summary:
  - `当前最小可证明的 field-ui 合同是：它先作为 Form canonical state truth 下的 companion boundary 被承认；exact leaf shape 继续后置，touched/dirty 只算现有实现与 example 的观察值。`
- kernel_verdict:
  - `通过 Ramanujan/Kolmogorov/Godel 三重 gate`
- frozen_decisions:
  - `field-ui 是合法 companion boundary`
  - `当前 authority 继续维持 ui: unknown`
  - `field-ui leaf truth 继续归 Form canonical state truth`
  - `未来 helper 若出现，只能是 core-owned optional host helper 的 consumer，不能反向定义 leaf shape`
  - `当前明确不冻结 exact leaf`
  - `touched / dirty` 只算现有实现与 example 的观察值
- non_goals:
  - `当前不冻结 ui.<path>`
  - `当前不冻结 field leaf object`
  - `当前不冻结 touched/dirty`
  - `当前不冻结任何 field-ui helper exact noun`
- allowed_reopen_surface:
  - `field-ui exact leaf shape`
  - `field-ui helper exact noun`
- proof_obligations:
  - `多 consumer 证据`
  - `不是只靠 example-local 观察`
  - `helper 不新增 owner`
  - `leaf shape 比 ui: unknown 明显更强`
  - `不引入第二 projection truth`
- delta_from_previous_round:
  - `删掉 A / C 活候选`
  - `删掉 touched/dirty 在正文中心的地位`
  - `把 owner 收成双层闭合合同`
  - `把落盘策略压成单点 authority`

## Round 2

### Phase

- converge

### Input Residual

- `检查 boundary-only freeze 是否仍有 unresolved blocker`

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
  - `U1`
- final_status:
  - `consensus-reached`
- stop_rule_satisfied:
  - `true`
- residual_risk:
  - `后续若把 touched/dirty 从观察值重新抬成 helper 可依赖的 leaf truth，或让 helper 反向定义 field-ui 语义，需要 reopen`
