# T3 Sandbox Surface Review Ledger

## Meta

- target:
  - `docs/proposals/sandbox-surface-contract.md`
- targets:
  - `docs/proposals/sandbox-surface-contract.md`
  - `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`
  - `docs/ssot/runtime/09-verification-control-plane.md`
  - `packages/logix-sandbox/package.json`
  - `packages/logix-sandbox/src/{index,Client,Protocol,Service,Types,Vite}.ts`
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
  - `target_claim: @logixjs/sandbox 的最小 exact survivor set 与 browser-trial owner 边界是什么`
  - `non_default_overrides: 除北极星外，其余点全部允许被挑战；尤其是 Client、worker ABI、Vite/vite 双入口的继续公开资格`
- review_object_manifest:
  - `source_inputs: T3 proposal + runtime/04 + runtime/09 + sandbox package exports + browser/client tests`
  - `materialized_targets: docs/proposals/sandbox-surface-contract.md`
  - `authority_target: docs/proposals/sandbox-surface-contract.md`
  - `bound_docs: docs/proposals/public-api-surface-inventory-and-disposition-plan.md`
  - `derived_scope: T3 only; no implementation patch`
  - `allowed_classes: ambiguity / invalidity / controversy`
  - `blocker_classes: false browser-trial survival / duplicated trial route / worker ABI leak / bundling route drift`
  - `ledger_target: docs/review-plan/runs/2026-04-18-t3-sandbox-surface-review.md`
- challenge_scope:
  - `open`
- reviewer_set:
  - `Cicero`
  - `Lovelace`
  - `Nash`
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
  - `只有更小、更一致、且不让 sandbox 代持 runtime.trial 的方案才可 adoption`
- reopen_bar:
  - `必须证明 Client、worker ABI 或大写 Vite 对 public sandbox surface 不可替代`
- ledger_path:
  - `docs/review-plan/runs/2026-04-18-t3-sandbox-surface-review.md`
- writable:
  - `yes`

## Assumptions

- A1:
  - summary:
    - `Client` 至少应继续作为 root public surface 保留
  - status:
    - `overturned`
  - resolution_basis:
    - reviewer converge 认为它会复制 `Runtime.trial` 概念，改成 root 只留 host wiring 更小
- A2:
  - summary:
    - `Protocol / Service / Types` 至少应保留一部分公开存在
  - status:
    - `overturned`
  - resolution_basis:
    - reviewer 一致认为 worker ABI 与适配壳应 internalize
- A3:
  - summary:
    - `Vite / vite` 双入口至少保留双写
  - status:
    - `overturned`
  - resolution_basis:
    - converge 只保留小写 `vite` 作为唯一宿主接线子路径

## Round 1

### Phase

- `challenge`

### Input Residual

- `none`

### Findings

- F1 `high` `invalidity`:
  - sandbox package 当前把 browser host wiring、worker ABI、service adapter、bundling bridge 混成一个过宽 surface
- F2 `high` `controversy`:
  - `Client` 是否继续公开会直接影响 sandbox 是否在复制 `Runtime.trial`
- F3 `medium` `ambiguity`:
  - `Vite / vite` 双入口是否都该继续存在

### Counter Proposals

- P1:
  - summary:
    - `Sandbox Host Wiring + vite Contract`
  - why_better:
    - 它把 sandbox 收回最薄 browser host wiring，并把 worker ABI 与 duplicated trial route 全部下沉
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
  - `Sandbox Host Wiring + vite Contract`
- lineage:
  - `mixed sandbox facade -> host-wiring minimal root`
- rejected_alternatives:
  - `保留完整 Client family`
  - `保留 Protocol / Service / Types`
  - `保留大写 Vite`
- rejection_reason:
  - 这些方案都会让 sandbox 继续持有 duplicated trial route、worker ABI leak 或过宽 bundling bridge
- dominance_verdict:
  - `Sandbox Host Wiring + vite Contract` 在 `concept-count / public-surface / proof-strength / future-headroom` 上严格更强

### Freeze Record

- adopted_summary:
  - `T3` 冻结为最小 browser host wiring contract：root 只留 `SandboxClientTag / SandboxClientLayer`，子路径只留 `vite`
- kernel_verdict:
  - `Ramanujan gate` 通过，因为它压掉了 worker ABI、service adapter 与完整 client facade
  - `Kolmogorov gate` 通过，因为它显著降低 `concept-count` 与 `public-surface`
  - `Godel gate` 通过，因为它把 browser trial host wiring 与 core `Runtime.trial` 真相重新分开
- frozen_decisions:
  - `Client / Protocol / Service / Types / Vite` 全部退出独立 public surface
  - `SandboxClientTag / SandboxClientLayer` 保留
  - `vite` 保留为唯一公开子路径
  - `Protocol / Types / Client.trial / RunResult` 全部 internalize
  - 若未来还要更多 bundling DX，优先走 toolkit recipe
- non_goals:
  - `本轮不开始实现`
- allowed_reopen_surface:
  - `只有在能证明 Client、worker ABI 或大写 Vite 对 public sandbox surface 不可替代时，才允许 reopen`
- proof_obligations:
  - `后续实现时必须同步回写 runtime/04、runtime/09、package exports、browser/client tests`
- delta_from_previous_round:
  - `从 mixed sandbox facade 收缩到 host wiring + vite`

## Consensus

- reviewers:
  - `Cicero`
  - `Lovelace`
  - `Nash`
- adopted_candidate:
  - `Sandbox Host Wiring + vite Contract`
- final_status:
  - `adopted`
- stop_rule_satisfied:
  - `yes`
- residual_risk:
  - `现有 browser playground 与 SandboxClientLayer 一类宿主接线会短期失去更宽的承载点；若后续不补最小 browser host contract，接线迁移成本会上升`
