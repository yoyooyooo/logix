# T4 Devtools Appendix Review Ledger

## Meta

- target:
  - `docs/proposals/devtools-appendix-surface-contract.md`
- targets:
  - `docs/proposals/devtools-appendix-surface-contract.md`
  - `docs/ssot/runtime/01-public-api-spine.md`
  - `docs/ssot/runtime/09-verification-control-plane.md`
  - `packages/logix-devtools-react/package.json`
  - `packages/logix-devtools-react/src/{index,LogixDevtools,DevtoolsLayer,FieldGraphView}.tsx`
- source_kind:
  - `file-spec`
- reviewer_count:
  - `3`
- reviewer_model:
  - `gpt-5.4`
- reviewer_reasoning:
  - `xhigh`
- challenge_scope:
  - `open`
- consensus_status:
  - `adopted`

## Bootstrap

- target_complete:
  - `yes`
- review_contract:
  - `artifact_kind: ssot-contract`
  - `review_goal: design-closure`
  - `target_claim: @logixjs/devtools-react 是否还存在任何 exact public survivor set`
  - `non_default_overrides: 除北极星外，其余点全部允许被挑战；尤其是 root side effect、FieldGraphView deep coupling 与 wildcard`
- review_object_manifest:
  - `source_inputs: T4 proposal + runtime/01 + runtime/09 + devtools package exports + internal tests`
  - `materialized_targets: docs/proposals/devtools-appendix-surface-contract.md`
  - `authority_target: docs/proposals/devtools-appendix-surface-contract.md`
  - `bound_docs: docs/proposals/public-api-surface-inventory-and-disposition-plan.md`
  - `derived_scope: T4 only; no implementation patch`
  - `allowed_classes: ambiguity / invalidity / controversy`
  - `blocker_classes: false appendix survival / root side effect leak / wildcard leak / deep coupling publicization`
  - `ledger_target: docs/review-plan/runs/2026-04-18-t4-devtools-appendix-review.md`
- challenge_scope:
  - `open`
- reviewer_set:
  - `Newton`
  - `Sartre`
  - `Euler`
- kernel_council:
  - `Ramanujan / Kolmogorov / Godel`
- dominance_axes:
  - `concept-count`
  - `public-surface`
  - `compat-budget`
  - `migration-cost`
  - `proof-strength`
  - `future-headroom`
- stop_rule:
  - `只有更小、更一致、且不让 deep coupling 继续外露的方案才可 adoption`
- reopen_bar:
  - `必须证明至少一个 devtools appendix object 对 exact public surface 不可替代`
- ledger_path:
  - `docs/review-plan/runs/2026-04-18-t4-devtools-appendix-review.md`
- writable:
  - `yes`

## Assumptions

- A1:
  - summary:
    - `@logixjs/devtools-react` 至少会有一部分 exact public survivor
  - status:
    - `overturned`
  - resolution_basis:
    - reviewer 一致给出 public survivor set 为零
- A2:
  - summary:
    - root 样式副作用仍可接受
  - status:
    - `overturned`
  - resolution_basis:
    - reviewer 一致要求删除 root side effect
- A3:
  - summary:
    - `FieldGraphView` 因为 graph 可视化价值，所以默认应继续公开
  - status:
    - `overturned`
  - resolution_basis:
    - reviewer 认定它与 internal graph owner 深耦合，不配继续公开

## Round 1

### Phase

- `challenge`

### Input Residual

- `none`

### Findings

- F1 `high` `invalidity`:
  - devtools appendix 没有任何一项被证明是不可替代的 exact public surface
- F2 `high` `controversy`:
  - `FieldGraphView` 是 hardest case，但 reviewer 仍判断应 internalize
- F3 `medium` `ambiguity`:
  - root side effect 与 wildcard 都会继续放大未审 public 面

### Counter Proposals

- P1:
  - summary:
    - `Zero-Surface Devtools Appendix Contract`
  - why_better:
    - 它把 devtools appendix 从 exact public surface 彻底归零，避免 deep coupling 和 side effect 继续外露
  - overturns_assumptions:
    - `A1`
    - `A2`
    - `A3`
  - resolves_findings:
    - `F1`
    - `F2`
    - `F3`
  - supersedes_proposals:
    - `none`
  - dominance:
    - `dominates`
  - axis_scores:
    - `concept-count: better`
    - `public-surface: better`
    - `compat-budget: same_or_better`
    - `migration-cost: slightly_worse`
    - `proof-strength: better`
    - `future-headroom: better`

### Resolution Delta

- `A1 -> overturned`
- `A2 -> overturned`
- `A3 -> overturned`
- `P1 adopted`

## Adoption

- adopted_candidate:
  - `Zero-Surface Devtools Appendix Contract`
- lineage:
  - `devtools appendix candidate -> zero-surface appendix`
- rejected_alternatives:
  - `保留任何 root/subpath survivor`
- rejection_reason:
  - 这些对象都会继续让 deep coupling、root side effect 与 wildcard leak 停在公开面
- dominance_verdict:
  - `Zero-Surface Devtools Appendix Contract` 在 `concept-count / public-surface / proof-strength / future-headroom` 上严格更强

### Freeze Record

- adopted_summary:
  - `T4` 冻结为零公开面的 devtools appendix contract
- kernel_verdict:
  - `Ramanujan gate` 通过，因为它压掉了整个 appendix roster
  - `Kolmogorov gate` 通过，因为它显著降低 `concept-count` 与 `public-surface`
  - `Godel gate` 通过，因为它阻止 internal graph/debug/evidence 被重新包装成第二公开契约
- frozen_decisions:
  - `@logixjs/devtools-react` root 退出 exact public surface
  - `./LogixDevtools / ./DevtoolsLayer / ./FieldGraphView / ./*` 全部退出 exact public surface
  - root 样式副作用删除
  - 若未来还要 DX 入口，统一先走 toolkit devtools helper 或 recipe
- non_goals:
  - `本轮不开始实现`
- allowed_reopen_surface:
  - `只有在能证明至少一个 devtools appendix object 对 exact public surface 不可替代时，才允许 reopen`
- proof_obligations:
  - `后续实现时必须同步回写 package exports、styles、tests 与依赖方 imports`
- delta_from_previous_round:
  - `从 appendix exact surface 候选转为 zero-surface appendix`

## Consensus

- reviewers:
  - `Newton`
  - `Sartre`
  - `Euler`
- adopted_candidate:
  - `Zero-Surface Devtools Appendix Contract`
- final_status:
  - `adopted`
- stop_rule_satisfied:
  - `yes`
- residual_risk:
  - `若 internal graph/debug/evidence API 继续半公开存活，外部可能再包一层视图把它们伪装成公共契约`
