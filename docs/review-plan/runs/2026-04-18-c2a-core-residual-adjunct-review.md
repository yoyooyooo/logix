# C2A Core Residual Adjunct Review Ledger

## Meta

- target:
  - `docs/proposals/core-residual-adjunct-contract.md`
- targets:
  - `docs/proposals/core-residual-adjunct-contract.md`
  - `docs/ssot/runtime/01-public-api-spine.md`
  - `docs/ssot/runtime/03-canonical-authoring.md`
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
  - `target_claim: C2A 是否还适合作为单一 adjunct chunk 冻结`
  - `non_default_overrides: 除北极星外，其余点全部允许被挑战；包括当前 residual 分组与 public witness`
- review_object_manifest:
  - `source_inputs: C2A proposal + runtime/01 + runtime/03 + runtime/10 + runtime/11 + core package exports + root barrel`
  - `materialized_targets: docs/proposals/core-residual-adjunct-contract.md`
  - `authority_target: docs/proposals/core-residual-adjunct-contract.md`
  - `bound_docs: docs/proposals/public-api-surface-inventory-and-disposition-plan.md`
  - `derived_scope: C2A split only; no implementation patch`
  - `allowed_classes: ambiguity / invalidity / controversy`
  - `blocker_classes: mixed owner law / oversized adjunct chunk / false public survival`
  - `ledger_target: docs/review-plan/runs/2026-04-18-c2a-core-residual-adjunct-review.md`
- challenge_scope:
  - `open`
- reviewer_set:
  - `Aquinas`
  - `Helmholtz`
  - `Hooke`
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
  - `必须证明单块 C2A 比 split 更小且不混 owner`
- ledger_path:
  - `docs/review-plan/runs/2026-04-18-c2a-core-residual-adjunct-review.md`
- writable:
  - `yes`

## Assumptions

- A1:
  - summary:
    - `C2A` 仍适合保持为单一 chunk
  - status:
    - `overturned`
  - resolution_basis:
    - reviewer 一致指出它仍混合 carry-over support、read/projection、runtime adjunct 三种 owner 面
- A2:
  - summary:
    - 至少会有一部分 carry-over support 默认继续留在 public core
  - status:
    - `overturned`
  - resolution_basis:
    - reviewer 给出的最小 survivor set在 public core 上为零

## Round 1

### Phase

- `challenge`

### Input Residual

- `none`

### Findings

- F1 `high` `invalidity`:
  - `C2A` 当前仍过宽，继续单块 review 会把 owner、public existence 与 toolkit/internal 去向混成一题
- F2 `high` `controversy`:
  - carry-over support 当前没有稳定 public survivor
- F3 `medium` `controversy`:
  - `./ModuleTag` 是最难删的一项，但困难来自 host concept witness，不直接等于 public surface 生存权

### Counter Proposals

- P1:
  - summary:
    - `C2A Three-Owner Residual Split Contract`
  - why_better:
    - 先按 owner law 拆开，再逐块狠裁，比单块 freeze 更小也更稳
  - overturns_assumptions:
    - `A1`
    - `A2`
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
    - `compat-budget: same`
    - `migration-cost: same_or_better`
    - `proof-strength: better`
    - `future-headroom: better`

### Resolution Delta

- `A1 -> overturned`
- `A2 -> overturned`
- `P1 adopted`

## Adoption

- adopted_candidate:
  - `C2A Three-Owner Residual Split Contract`
- lineage:
  - `single C2A adjunct contract -> C2A split contract`
- rejected_alternatives:
  - `single C2A chunk`
- rejection_reason:
  - `单块 C2A 仍把三种 owner 混在一起，继续磨只会得到模糊折中`
- dominance_verdict:
  - `split contract` 在 `concept-count / public-surface / proof-strength / future-headroom` 上严格更强

### Freeze Record

- adopted_summary:
  - `C2A` 先拆成 `C2A1 carry-over support`、`C2A2 read projection protocol`、`C2A3 runtime adjunct escape hatch`
- kernel_verdict:
  - `Ramanujan gate` 通过，因为它压掉了一个 oversized adjunct review object
  - `Kolmogorov gate` 通过，因为它没有增加 public surface，却提高了 proof strength
  - `Godel gate` 通过，因为它把三种 owner 面拆开，减少单页矛盾
- frozen_decisions:
  - `C2A` 不再作为单一 chunk 继续 review
  - `C2A1` 承接 `Action / Actions / Bound / Handle / Logic / ModuleTag / State`
  - `C2A2` 承接 `ReadQuery / ExternalStore / Resource`
  - `C2A3` 承接 `MatchBuilder / ScopeRegistry / Root / Env / Platform / Middleware / InternalContracts / EffectOp`
  - `C2A` 当前强方向是 public core survivor set 为零
- non_goals:
  - `本轮不替 C2A1 / C2A2 / C2A3 做最终 disposition`
  - `本轮不开始实现`
- allowed_reopen_surface:
  - `只有在能证明单块 C2A 比 split 更小且不混 owner 时，才允许 reopen`
- proof_obligations:
  - `materialize C2A1 / C2A2 / C2A3 authority targets`
  - `回写总提案 chunk 表、进展和建议顺序`
- delta_from_previous_round:
  - `从单块 C2A 改为三切面 freeze`

## Consensus

- reviewers:
  - `Aquinas`
  - `Helmholtz`
  - `Hooke`
- adopted_candidate:
  - `C2A Three-Owner Residual Split Contract`
- final_status:
  - `adopted`
- stop_rule_satisfied:
  - `yes`
- residual_risk:
  - `三块新 target 的内部边界还需后续各自 freeze 时继续压；当前只是先终止单块 C2A 的错误分组`
