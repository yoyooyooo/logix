# Q1 Query Exact Surface Review Ledger

## Meta

- target:
  - `docs/proposals/query-exact-surface-contract.md`
- targets:
  - `docs/proposals/query-exact-surface-contract.md`
  - `docs/ssot/runtime/08-domain-packages.md`
  - `docs/standards/logix-api-next-guardrails.md`
  - `packages/logix-query/package.json`
  - `packages/logix-query/src/index.ts`
  - `packages/logix-query/src/{Query,Engine,TanStack}.ts`
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
  - `target_claim: @logixjs/query root 的最小 exact survivor set是什么`
  - `non_default_overrides: 除北极星外，其余点全部允许被挑战；尤其是 Engine 与 TanStack 的 root 合理性`
- review_object_manifest:
  - `source_inputs: Q1 proposal + runtime/08 + query package exports + root surface tests`
  - `materialized_targets: docs/proposals/query-exact-surface-contract.md`
  - `authority_target: docs/proposals/query-exact-surface-contract.md`
  - `bound_docs: docs/proposals/public-api-surface-inventory-and-disposition-plan.md`
  - `derived_scope: Q1 only; no implementation patch`
  - `allowed_classes: ambiguity / invalidity / controversy`
  - `blocker_classes: false root survival / stale integration route / second query truth`
  - `ledger_target: docs/review-plan/runs/2026-04-18-q1-query-exact-surface-review.md`
- challenge_scope:
  - `open`
- reviewer_set:
  - `Linnaeus`
  - `Ohm`
  - `Galileo`
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
  - `只有更小、更一致、且不让 query 失去真实 integration 能力的方案才可 adoption`
- reopen_bar:
  - `必须证明 make-only 或 make+Engine 之外还有更小且不伤 owner 的方案`
- ledger_path:
  - `docs/review-plan/runs/2026-04-18-q1-query-exact-surface-review.md`
- writable:
  - `yes`

## Assumptions

- A1:
  - summary:
    - `TanStack` 应继续停在 query root
  - status:
    - `overturned`
  - resolution_basis:
    - reviewer 一致认定它只是具体 provider adapter，应回收到 query owner 内部
- A2:
  - summary:
    - `Engine` 也可以一起退出，query root 只留 `make`
  - status:
    - `overturned`
  - resolution_basis:
    - 在当前架构下，若没有 `Engine` 公开壳层，query 会失去对真实后端与 custom engine 的最小 integration 能力

## Round 1

### Phase

- `challenge`

### Input Residual

- `none`

### Findings

- F1 `high` `controversy`:
  - `Engine` 是否还配继续公开
- F2 `high` `invalidity`:
  - `TanStack` 作为 root exact surface 过宽
- F3 `medium` `ambiguity`:
  - 若 `Engine` 与 `TanStack` 都退出，query root 是否还具备真实 integration 能力

### Counter Proposals

- P1:
  - summary:
    - `make only`
  - why_better:
    - public 面更小
  - overturns_assumptions:
    - `A1`
  - resolves_findings:
    - `F2`
  - supersedes_proposals:
    - `none`
  - dominance:
    - `partial`
  - axis_scores:
    - `concept-count: better`
    - `public-surface: better`
    - `compat-budget: same`
    - `migration-cost: slightly_better`
    - `proof-strength: worse`
    - `future-headroom: worse`
- P2:
  - summary:
    - `Q1 Make-Engine Minimal Contract`
  - why_better:
    - 压掉了 `TanStack`，同时保留 query 仍可接真实 engine 的最小 integration 壳层
  - overturns_assumptions:
    - `A1`
    - `A2`
  - resolves_findings:
    - `F1`
    - `F2`
    - `F3`
  - supersedes_proposals:
    - `P1`
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
- `P2 adopted`

## Adoption

- adopted_candidate:
  - `Q1 Make-Engine Minimal Contract`
- lineage:
  - `make/Engine/TanStack candidate -> make+Engine minimal root`
- rejected_alternatives:
  - `make only`
  - `make + Engine + TanStack`
- rejection_reason:
  - `make only` 会让 query root 失去最小 integration 能力；保留 `TanStack` 又会把具体 adapter 锁进 exact root
- dominance_verdict:
  - `make + Engine` 在 `concept-count / public-surface / proof-strength / future-headroom` 上取得最稳平衡

### Freeze Record

- adopted_summary:
  - `Q1` 冻结为 `make + Engine` 的最小 root contract，`TanStack` 退出 public root
- kernel_verdict:
  - `Ramanujan gate` 通过，因为它压掉了一个具体 adapter root noun
  - `Kolmogorov gate` 通过，因为它在降低 public surface 的同时保住了 query integration 能力
  - `Godel gate` 通过，因为它避免让 query 同时持有 domain act、capability shell 和具体 adapter 三层公开真相
- frozen_decisions:
  - `make` 保留
  - `Engine` 保留
  - `TanStack` 退出 public root
  - `TanStack` 回收到 query internal owner
- non_goals:
  - `本轮不开始实现`
- allowed_reopen_surface:
  - `只有在能证明 Engine 也可无损退出或 TanStack 必须回 root 时，才允许 reopen`
- proof_obligations:
  - `后续实现时必须同步回写 runtime/08、package exports、root barrel、boundary tests`
- delta_from_previous_round:
  - `从 make/Engine/TanStack 三件套收缩到 make+Engine`

## Consensus

- reviewers:
  - `Linnaeus`
  - `Ohm`
  - `Galileo`
- adopted_candidate:
  - `Q1 Make-Engine Minimal Contract`
- final_status:
  - `adopted`
- stop_rule_satisfied:
  - `yes`
- residual_risk:
  - `若未来存在多个后端适配器长期共存，Engine 这层 integration capability 可能还需再压成更小合同；但这不影响本轮把 TanStack 赶出 exact root`
