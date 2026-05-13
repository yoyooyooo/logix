# C2A3 Core Runtime Adjunct Review Ledger

## Meta

- target:
  - `docs/proposals/core-runtime-adjunct-escape-hatch-contract.md`
- targets:
  - `docs/proposals/core-runtime-adjunct-escape-hatch-contract.md`
  - `docs/ssot/runtime/01-public-api-spine.md`
  - `docs/ssot/runtime/11-toolkit-layer.md`
  - `docs/standards/logix-api-next-guardrails.md`
  - `packages/logix-core/src/{MatchBuilder,ScopeRegistry,Root,Env,Platform,Middleware,EffectOp}.ts`
  - `packages/logix-core/src/internal/InternalContracts.ts`
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
  - `target_claim: MatchBuilder / ScopeRegistry / Root / Env / Platform / Middleware / InternalContracts / EffectOp 是否还存在任何 public survivor`
  - `non_default_overrides: 除北极星外，其余点全部允许被挑战；尤其是 maintainer escape hatch 的公开合理性`
- review_object_manifest:
  - `source_inputs: C2A3 proposal + runtime/01 + toolkit-layer + guardrails + runtime adjunct source/tests`
  - `materialized_targets: docs/proposals/core-runtime-adjunct-escape-hatch-contract.md`
  - `authority_target: docs/proposals/core-runtime-adjunct-escape-hatch-contract.md`
  - `bound_docs: docs/proposals/public-api-surface-inventory-and-disposition-plan.md`
  - `derived_scope: C2A3 only; no implementation patch`
  - `allowed_classes: ambiguity / invalidity / controversy`
  - `blocker_classes: false escape-hatch survival / stale maintainer convenience / second host truth risk`
  - `ledger_target: docs/review-plan/runs/2026-04-18-c2a3-core-runtime-adjunct-review.md`
- challenge_scope:
  - `open`
- reviewer_set:
  - `Ramanujan`
  - `McClintock`
  - `Dewey`
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
  - `只有更小、更一致、且不引入第二 authority 的 public-zero 方案才可 adoption`
- reopen_bar:
  - `必须证明至少一个 runtime adjunct object 对 public core 不可替代`
- ledger_path:
  - `docs/review-plan/runs/2026-04-18-c2a3-core-runtime-adjunct-review.md`
- writable:
  - `yes`

## Assumptions

- A1:
  - summary:
    - `MatchBuilder / ScopeRegistry / Root / Env / Platform / Middleware / InternalContracts / EffectOp` 至少会有一部分继续停在 public core
  - status:
    - `overturned`
  - resolution_basis:
    - reviewer 一致给出 public survivor set 为零
- A2:
  - summary:
    - `ScopeRegistry / Root / Platform` 因为多 root、子树 override、host lifecycle，所以默认应继续公开
  - status:
    - `overturned`
  - resolution_basis:
    - 它们的概念可回收到 host local transport internal、RootContext 与 host adapter internal
- A3:
  - summary:
    - `MatchBuilder / Env / Middleware / InternalContracts / EffectOp` 里至少会有一项作为 maintainer 入口继续公开
  - status:
    - `overturned`
  - resolution_basis:
    - reviewer 一致认为这组都只是 maintainer 或 in-repo 契约，应统一 internalize

## Round 1

### Phase

- `challenge`

### Input Residual

- `none`

### Findings

- F1 `high` `invalidity`:
  - 这组 runtime adjunct / escape hatch 没有任何一项被证明是不可替代的 public core truth
- F2 `high` `controversy`:
  - `ScopeRegistry / Root / Platform` 是 hardest case，但 reviewer 仍判断应 internalize
- F3 `medium` `ambiguity`:
  - 未来若真要 DX 入口，owner 更接近 toolkit，而非 core

### Counter Proposals

- P1:
  - summary:
    - `C2A3 Public-Zero Runtime Adjunct Contract`
  - why_better:
    - 它把 maintainer convenience 和 runtime adjunct 从 public core 全部归零，避免继续长 escape hatch
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
  - `C2A3 Public-Zero Runtime Adjunct Contract`
- lineage:
  - `runtime adjunct candidate -> public-zero runtime adjunct contract`
- rejected_alternatives:
  - `任何 runtime adjunct / escape hatch 继续 public 存活的方案`
- rejection_reason:
  - `这组对象没有独立 owner truth，继续公开只会保留维护者便利壳层与未审查 escape hatch`
- dominance_verdict:
  - `public-zero` 在 `concept-count / public-surface / proof-strength / future-headroom` 上严格更强

### Freeze Record

- adopted_summary:
  - `C2A3` 冻结为 public-zero runtime adjunct contract，8 项 runtime adjunct / escape hatch 全部退出 public core
- kernel_verdict:
  - `Ramanujan gate` 通过，因为它压掉了整层 escape hatch
  - `Kolmogorov gate` 通过，因为它显著降低 `concept-count` 与 `public-surface`
  - `Godel gate` 通过，因为它把 host local transport、RootContext、host adapter 与 maintainer helper 都收回到 internal，避免第二 host truth
- frozen_decisions:
  - `MatchBuilder / ScopeRegistry / Root / Env / Platform / Middleware / InternalContracts / EffectOp` 全部退出 public core
  - `ScopeRegistry` 概念回收到 host local transport internal
  - `Root` 概念回收到 `RootContext + app assembly + proof helper`
  - `Platform` 概念回收到 core internal platform 与各 host adapter internal
  - `MatchBuilder / Env / Middleware / InternalContracts / EffectOp` 全部 internalize
  - 若未来真要 DX 入口，统一先走 toolkit reopen
- non_goals:
  - `本轮不开始实现`
  - `本轮不裁 C2B`
- allowed_reopen_surface:
  - `只有在能证明至少一项 runtime adjunct object 对 public core 不可替代时，才允许 reopen`
- proof_obligations:
  - `后续实现时必须同步回写 toolkit reopen bucket、host docs、root barrel、exports 与 witness tests`
- delta_from_previous_round:
  - `从 runtime adjunct candidate 转为 public-zero`

## Consensus

- reviewers:
  - `Ramanujan`
  - `McClintock`
  - `Dewey`
- adopted_candidate:
  - `C2A3 Public-Zero Runtime Adjunct Contract`
- final_status:
  - `adopted`
- stop_rule_satisfied:
  - `yes`
- residual_risk:
  - `多 root、子树 override、host lifecycle 的显式 proof path 会变窄；若未来真实 bridge 场景回潮，局部 helper 可能重新长出未审查的第二 host truth`
