# D1 Domain Exact Surface Review Ledger

## Meta

- target:
  - `docs/proposals/domain-exact-surface-contract.md`
- targets:
  - `docs/proposals/domain-exact-surface-contract.md`
  - `docs/ssot/runtime/08-domain-packages.md`
  - `docs/standards/logix-api-next-guardrails.md`
  - `packages/domain/package.json`
  - `packages/domain/src/index.ts`
  - `packages/domain/src/Crud.ts`
  - `packages/domain/src/internal/crud/Crud.ts`
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
  - `target_claim: @logixjs/domain 的最小 exact survivor set是什么`
  - `non_default_overrides: 除北极星外，其余点全部允许被挑战；尤其是 root type barrel、./Crud 与 wildcard 的继续公开资格`
- review_object_manifest:
  - `source_inputs: D1 proposal + runtime/08 + domain package exports + boundary tests`
  - `materialized_targets: docs/proposals/domain-exact-surface-contract.md`
  - `authority_target: docs/proposals/domain-exact-surface-contract.md`
  - `bound_docs: docs/proposals/public-api-surface-inventory-and-disposition-plan.md`
  - `derived_scope: D1 only; no implementation patch`
  - `allowed_classes: ambiguity / invalidity / controversy`
  - `blocker_classes: wildcard leak / overwide type barrel / false kit survival / domain-toolkit owner blur`
  - `ledger_target: docs/review-plan/runs/2026-04-18-d1-domain-exact-surface-review.md`
- challenge_scope:
  - `open`
- reviewer_set:
  - `Carson`
  - `Einstein`
  - `Peirce`
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
  - `只有更小、更一致、且不让 domain 与 toolkit owner 再次混淆的方案才可 adoption`
- reopen_bar:
  - `必须证明 root barrel 或过宽类型面对 domain exact surface 不可替代`
- ledger_path:
  - `docs/review-plan/runs/2026-04-18-d1-domain-exact-surface-review.md`
- writable:
  - `yes`

## Assumptions

- A1:
  - summary:
    - `runtime/08-domain-packages.md` 已足以直接承接 D1 exact review
  - status:
    - `overturned`
  - resolution_basis:
    - runtime/08 只给 route budget，不承接 exact root / `./Crud` / wildcard 争议
- A2:
  - summary:
    - `@logixjs/domain` root 应继续保留 thin type barrel
  - status:
    - `overturned`
  - resolution_basis:
    - reviewer 认为 root barrel 只会扩大 exact 面，当前不具备独立价值
- A3:
  - summary:
    - `./Crud` 应继续作为完整 exact program kit 公开，含 commands handle 等宽类型
  - status:
    - `overturned`
  - resolution_basis:
    - reviewer 只保留 `make / CrudProgram / CrudSpec / CrudApi`，其余宽类型退出

## Round 1

### Phase

- `challenge`

### Input Residual

- `none`

### Findings

- F1 `high` `invalidity`:
  - `./*` wildcard 会把任意顶层文件自动抬成未审 public API
- F2 `high` `controversy`:
  - `./Crud` 是否还配继续作为 exact program kit 公开存在
- F3 `medium` `ambiguity`:
  - root thin type barrel 与 `CrudCommandsHandle` 等宽类型是否仍应继续留在 exact surface

### Counter Proposals

- P1:
  - summary:
    - `D1 Rootless Crud Minimal Contract`
  - why_better:
    - 它把 root 归零、删掉 wildcard，并把 domain 的 exact public 面压到单一 `./Crud` 入口
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
  - `D1 Rootless Crud Minimal Contract`
- lineage:
  - `runtime/08 route budget -> dedicated domain exact proposal -> rootless CRUD entry`
- rejected_alternatives:
  - `继续保留 root thin type barrel`
  - `继续保留 wildcard`
  - `继续保留过宽 CRUD 类型面`
- rejection_reason:
  - 这些方案都会扩大 public surface，并把 domain 与 toolkit 的 owner split 再次搞混
- dominance_verdict:
  - `Rootless Crud Minimal Contract` 在 `concept-count / public-surface / proof-strength / future-headroom` 上严格更强

### Freeze Record

- adopted_summary:
  - `D1` 冻结为 rootless CRUD contract：只保留 `@logixjs/domain/Crud`，root 与 wildcard 全部退出
- kernel_verdict:
  - `Ramanujan gate` 通过，因为它压掉了 root barrel 与 wildcard
  - `Kolmogorov gate` 通过，因为它显著降低 `concept-count` 与 `public-surface`
  - `Godel gate` 通过，因为它把 domain 与 toolkit 的 owner split 明确分开了
- frozen_decisions:
  - `@logixjs/domain` root 退出 exact public surface
  - `./*` 删除
  - `./Crud` 继续保留，但只保留 `make / CrudProgram / CrudSpec / CrudApi`
  - `CrudCommandsHandle / CrudHandleExt` 退出 exact public surface
  - domain 只持有 CRUD 语义、DSL、默认行为与最小 kit contract
  - toolkit 只持有未来跨领域 commands sugar、recipe、preset、wrapper
- non_goals:
  - `本轮不开始实现`
- allowed_reopen_surface:
  - `只有在能证明 root barrel、wildcard 或被移出的宽类型面对 exact public surface 不可替代时，才允许 reopen`
- proof_obligations:
  - `后续实现时必须同步回写 runtime/08、package exports、root surface tests、Crud boundary tests`
- delta_from_previous_round:
  - `从 root + ./Crud + wildcard 收缩到 rootless ./Crud`

## Consensus

- reviewers:
  - `Carson`
  - `Einstein`
  - `Peirce`
- adopted_candidate:
  - `D1 Rootless Crud Minimal Contract`
- final_status:
  - `adopted`
- stop_rule_satisfied:
  - `yes`
- residual_risk:
  - `若 toolkit 迟迟没有提供足够密度的 CRUD recipe 替身，Agent 在典型 CRUD 场景下会短期回退到重复手写 Program 模板`
