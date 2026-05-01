# C2 Core Residual Surface Review Ledger

## Meta

- target:
  - `docs/proposals/core-residual-surface-contract.md`
- targets:
  - `docs/proposals/core-residual-surface-contract.md`
  - `docs/ssot/runtime/01-public-api-spine.md`
  - `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`
  - `docs/ssot/runtime/09-verification-control-plane.md`
  - `docs/ssot/runtime/10-react-host-projection-boundary.md`
  - `docs/ssot/runtime/11-toolkit-layer.md`
  - `packages/logix-core/package.json`
  - `packages/logix-core/src/index.ts`
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
  - `target_claim: C2 是否还适合作为单一 residual chunk 冻结`
  - `non_default_overrides: 除北极星外，其余点全部允许被挑战；包括分块方式、现行 expert route 句子、root/subpath witness`
- review_object_manifest:
  - `source_inputs: C2 proposal + runtime/01 + runtime/04 + runtime/09 + runtime/11 + core package exports + root barrel`
  - `materialized_targets: docs/proposals/core-residual-surface-contract.md`
  - `authority_target: docs/proposals/core-residual-surface-contract.md`
  - `bound_docs: docs/proposals/public-api-surface-inventory-and-disposition-plan.md; docs/standards/logix-api-next-guardrails.md`
  - `derived_scope: C2 meta-split only; no implementation patch`
  - `allowed_classes: ambiguity / invalidity / controversy`
  - `blocker_classes: oversized chunk / mixed owner law / false root survival / stale residual grouping`
  - `ledger_target: docs/review-plan/runs/2026-04-18-c2-core-residual-surface-review.md`
- challenge_scope:
  - `open`
- reviewer_set:
  - `Feynman`
  - `Kant`
  - `Archimedes`
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
  - `只有更小、更一致、且不引入第二 authority 的 split 才可 adoption`
- reopen_bar:
  - `必须证明单块 C2 比 split 更小，且不会继续混 owner`
- ledger_path:
  - `docs/review-plan/runs/2026-04-18-c2-core-residual-surface-review.md`
- writable:
  - `yes`

## Assumptions

- A1:
  - summary:
    - `C2` 仍适合保持为单一 chunk
  - status:
    - `overturned`
  - resolution_basis:
    - reviewer 一致指出当前 `C2` 混了 carry-over support、read/projection、runtime adjunct、verification/evidence 多种 owner law
- A2:
  - summary:
    - 当前 residual family 可以一起冻结，再在实现时慢慢拆
  - status:
    - `overturned`
  - resolution_basis:
    - 这会把结构问题拖到实现期，违反 stop rule
- A3:
  - summary:
    - control-plane/evidence family 应与其余 residual 放在同一 review 面
  - status:
    - `overturned`
  - resolution_basis:
    - `runtime/04` 与 `runtime/09` 已形成独立 owner law

## Round 1

### Phase

- `challenge`

### Input Residual

- `none`

### Findings

- F1 `high` `invalidity`:
  - `C2` 当前 chunk 过大，混合了至少两套 owner law
- F2 `high` `controversy`:
  - `ControlPlane / Debug / Observability / Reflection / Kernel` 的 owner 与其余 residual 明显不同
- F3 `medium` `ambiguity`:
  - `C1` carry-over surfaces 是否都该与 verification/evidence surfaces 一起审

### Counter Proposals

- P1:
  - summary:
    - `C2 Two-Cut Split Contract`
  - why_better:
    - 先按 owner law 拆开，再分别狠裁，比单块冻结更小也更稳
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
    - `public-surface: same_or_better`
    - `compat-budget: same`
    - `migration-cost: same_or_better`
    - `proof-strength: better`
    - `future-headroom: better`

### Resolution Delta

- `A1 -> overturned`
- `A2 -> overturned`
- `A3 -> overturned`
- `P1 adopted`

## Adoption

- adopted_candidate:
  - `C2 Two-Cut Split Contract`
- lineage:
  - `single C2 residual contract -> C2 split contract`
- rejected_alternatives:
  - `single C2 chunk`
- rejection_reason:
  - `单块 C2 混 owner，继续审只会得到保守又模糊的折中答案`
- dominance_verdict:
  - `split contract` 在 `concept-count / proof-strength / future-headroom` 上严格更强

### Freeze Record

- adopted_summary:
  - `C2` 先拆成 `C2A Core Residual Adjunct Contract` 与 `C2B Core Verification And Evidence Surface Contract`
- kernel_verdict:
  - `Ramanujan gate` 通过，因为它压掉了一个 oversized review object
  - `Kolmogorov gate` 通过，因为它没有增加 public surface，却显著提高 proof strength
  - `Godel gate` 通过，因为它把不同 owner law 分开，减少单页自相矛盾
- frozen_decisions:
  - `C2` 不再作为单一 chunk 继续 review
  - `C2A` 负责 carry-over support、read/projection、runtime adjunct residual
  - `C2B` 负责 control-plane / evidence / kernel residual
  - `ControlPlane + Observability + Reflection` 是同一 owner family 的强候选
  - `Debug` 与 `Kernel` 不并入上面这组
  - `ControlPlane / Debug / Observability / Reflection / Kernel` 全部先退出 root 是强方向候选
- non_goals:
  - `本轮不替 C2A / C2B 做最终 disposition`
  - `本轮不开始实现`
- allowed_reopen_surface:
  - `只有在能证明单块 C2 比 split 更小且不混 owner 时，才允许 reopen`
- proof_obligations:
  - `materialize C2A / C2B authority targets`
  - `回写总提案 chunk 表、进展和建议顺序`
- delta_from_previous_round:
  - `从单块 C2 改为双切面 freeze`

## Consensus

- reviewers:
  - `Feynman`
  - `Kant`
  - `Archimedes`
- adopted_candidate:
  - `C2 Two-Cut Split Contract`
- final_status:
  - `adopted`
- stop_rule_satisfied:
  - `yes`
- residual_risk:
  - `C2A 与 C2B 的边界还需下一轮各自 freeze 时再压到更小；当前只是先终止单块 C2 的错误分组`
