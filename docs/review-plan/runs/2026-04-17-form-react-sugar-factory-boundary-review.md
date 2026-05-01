# Form React Sugar Factory Boundary Review Ledger

## Meta

- target:
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/form-react-sugar-factory-boundary.md`
- targets:
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/form-react-sugar-factory-boundary.md`
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/05-public-api-families.md`
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/13-exact-surface-contract.md`
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/10-react-host-projection-boundary.md`
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/internal/form-api-tutorial.md`
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
  - `authority target=docs/proposals/form-react-sugar-factory-boundary.md; bound docs=docs/ssot/form/05-public-api-families.md, docs/ssot/form/13-exact-surface-contract.md, docs/ssot/runtime/10-react-host-projection-boundary.md, docs/internal/form-api-tutorial.md`
- review_contract:
  - `artifact_kind=ssot-contract`
  - `review_goal=zero-unresolved`
  - `target_claim=允许官方提供 factory sugar，但它只能是 core host law 的 optional builder；不能回到 form-owned canonical hook family；优先 field/meta sugar，list sugar 需要更高证据门`
  - `non_default_overrides=reviewer_count=4,A4=enabled`
- review_object_manifest:
  - `source_inputs=proposal file path + bound docs`
  - `materialized_targets=none`
  - `authority_target=docs/proposals/form-react-sugar-factory-boundary.md`
  - `bound_docs=docs/ssot/form/05-public-api-families.md,docs/ssot/form/13-exact-surface-contract.md,docs/ssot/runtime/10-react-host-projection-boundary.md,docs/internal/form-api-tutorial.md`
  - `derived_scope=public contract boundary / owner split / optional sugar route`
  - `allowed_classes=ambiguity,invalidity,controversy`
  - `blocker_classes=second-host-truth,double-authority,owner-drift,internal-import-dependent-sugar,premature-list-binder`
  - `ledger_target=docs/review-plan/runs/2026-04-17-form-react-sugar-factory-boundary-review.md`
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
  - `必须明确删掉一段 boundary 或 authority，且不引入第二 host truth`
- ledger_path:
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-17-form-react-sugar-factory-boundary-review.md`
- writable:
  - `true`

## Assumptions

- A1:
  - summary:
    - `factory sugar` 与 concrete hooks 可以在 authority 上被清晰分离
  - status:
    - `kept`
  - resolution_basis:
    - `只保留 hook-free split builders；拒绝官方 concrete hooks`
- A2:
  - summary:
    - sugar 若存在，owner 更适合跟随 core host law，而不是回到 form route
  - status:
    - `kept`
  - resolution_basis:
    - `reviewer A1/A2/A3/A4 全部要求 owner 单点闭合在 core`
- A3:
  - summary:
    - `field/meta` 与 `list` sugar 的证据门应分离
  - status:
    - `kept`
  - resolution_basis:
    - `list sugar 从 base scope 移出，单独设 reopen gate`

## Round 1

### Phase

- challenge

### Input Residual

- none

### Findings

- F1 `high` `invalidity`:
  - owner 仍未单点闭合，proposal 保留了 form-side fallback，形成 `owner-drift / double-authority`
- F2 `high` `invalidity`:
  - proposal 同时承载边界裁决和 exact noun 搜索，helper noun 过多，收敛成本偏高
- F3 `high` `controversy`:
  - 候选 factory 直接展示 `useField / useMeta / useList`，仍像官方 concrete hook family，`second-host-truth` 风险未闭合
- F4 `high` `invalidity`:
  - list sugar 被过早纳入 allowed scope，触发 `premature-list-binder`
- F5 `medium` `ambiguity`:
  - tutorial 被拿来承接 optional cookbook，形成 docs 双维护面
- F6 `medium` `controversy`:
  - “删除 example-local 重复封装”被放进核心成功标准，目标函数偏向 DRY，偏离 authority / proof 主轴

### Counter Proposals

- P1:
  - summary:
    - `host-owned optional binder contract`
  - why_better:
    - 单 owner、单抽象类目、更少 noun、更少 docs 写回面
  - overturns_assumptions:
    - `A2`
  - resolves_findings:
    - `F1`
    - `F2`
    - `F6`
  - supersedes_proposals:
    - `form-side owner fallback`
  - dominance:
    - `dominates`
  - axis_scores:
    - `concept-count +2`
    - `public-surface +2`
    - `compat-budget 0`
    - `migration-cost +2`
    - `proof-strength +2`
    - `future-headroom +1`
- P2:
  - summary:
    - `primitive-first / hook-free split builders`
  - why_better:
    - 复用能力可沉淀，但不把最终 hook 形状升格成官方 host family
  - overturns_assumptions:
    - `A1`
  - resolves_findings:
    - `F2`
    - `F3`
  - supersedes_proposals:
    - `createFormSugar -> useField/useMeta/useList`
  - dominance:
    - `dominates`
  - axis_scores:
    - `concept-count +1`
    - `public-surface +2`
    - `compat-budget 0`
    - `migration-cost 0`
    - `proof-strength +2`
    - `future-headroom +1`
- P3:
  - summary:
    - `field/meta only; list reopen later`
  - why_better:
    - 先收住高频 sugar，把 row identity 与 locality 的证明面后置
  - overturns_assumptions:
    - `A3`
  - resolves_findings:
    - `F4`
  - supersedes_proposals:
    - `useList / createListBinder / selectListIds`
  - dominance:
    - `dominates`
  - axis_scores:
    - `concept-count +1`
    - `public-surface +1`
    - `compat-budget 0`
    - `migration-cost +1`
    - `proof-strength +2`
    - `future-headroom +2`

### Resolution Delta

- `F1` -> `adopted`
- `F2` -> `adopted`
- `F3` -> `adopted`
- `F4` -> `adopted`
- `F5` -> `adopted`
- `F6` -> `adopted`
- `A1` `kept`
- `A2` `kept`
- `A3` `kept`
- `P1` `adopted`
- `P2` `adopted`
- `P3` `adopted`

## Adoption

- adopted_candidate:
  - `C1: core-owned optional host sugar factory; hook-free split builders only; field/meta only; list reopen later`
- lineage:
  - `proposal baseline`
  - `P1`
  - `P2`
  - `P3`
- rejected_alternatives:
  - `A: 不提供官方 sugar`
  - `B: 官方直接提供 concrete hooks`
  - `C0: 当前 proposal 的 form-side fallback + exact sugar noun + list sugar 同轮冻结`
- rejection_reason:
  - `A` 过于保守，无法沉淀可复用能力
  - `B` 直接长成第二套 host truth
  - `C0` 未闭合 owner、noun、list scope 三个 blocker
- dominance_verdict:
  - `P1 + P2 + P3` 在不恶化核心轴的前提下，对 baseline proposal 形成严格改进

### Freeze Record

- adopted_summary:
  - `允许官方提供 factory sugar，但它只能是 core-owned optional host helper，当前只承认 field/meta 的 hook-free split builders；Form 不拥有 React sugar factory，list sugar 延后到单独 reopen gate。`
- kernel_verdict:
  - `通过 Ramanujan/Kolmogorov/Godel 三重 gate`
- frozen_decisions:
  - `owner 单点固定为 core-owned optional host helper layer`
  - `@logixjs/form 只保留 domain primitive，不承接 React sugar factory`
  - `authority 文本不再冻结 exact sugar noun`
  - `官方不返回 concrete useX family`
  - `当前 base scope 只承认 field/meta sugar`
  - `list sugar 明确移出本轮 scope`
  - `optional sugar 不进入 canonical tutorial 主线`
- non_goals:
  - `当前不冻结 createFormSugar / createFieldBinder 等 exact noun`
  - `当前不落地实现`
  - `当前不开放 list sugar`
- allowed_reopen_surface:
  - `field/meta sugar 的最小 binder contract`
  - `field/meta policy injection contract`
  - `list sugar 的单独 reopen`
- proof_obligations:
  - `可完全反解到 useModule + useSelector + direct handle`
  - `零 internal import`
  - `零 canonical doc 漂移`
  - `零新的 form route owner`
  - `list sugar 需要 row identity 公共 projection primitive + locality proof`
- delta_from_previous_round:
  - `删掉 form-side owner fallback`
  - `删掉 exact sugar noun 候选`
  - `删掉 official useX 形状`
  - `删掉 list sugar 当前轮 allowed wording`
  - `tutorial 从 potential cookbook 退回 canonical-only`

## Round 2

### Phase

- converge

### Input Residual

- `检查 adopted freeze record 是否仍被更优方案直接支配`

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- `all residual findings closed`

## Consensus

- reviewers:
  - `A1: 无 unresolved findings`
  - `A2: 无 unresolved findings`
  - `A3: 无 unresolved findings`
  - `A4: 无 unresolved findings`
- adopted_candidate:
  - `C1`
- final_status:
  - `consensus-reached`
- stop_rule_satisfied:
  - `true`
- residual_risk:
  - `后续实现或 optional cookbook 若重新长出稳定 useX family，或让 list binder 提前回流 authority 页面，需要 reopen`
