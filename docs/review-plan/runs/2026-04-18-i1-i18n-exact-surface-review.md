# I1 I18n Exact Surface Review Ledger

## Meta

- target:
  - `docs/proposals/i18n-exact-surface-contract.md`
- targets:
  - `docs/proposals/i18n-exact-surface-contract.md`
  - `docs/ssot/runtime/08-domain-packages.md`
  - `docs/standards/logix-api-next-guardrails.md`
  - `packages/i18n/package.json`
  - `packages/i18n/src/{index,I18n,Token}.ts`
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
  - `target_claim: @logixjs/i18n root 与 subpath 的最小 exact survivor set是什么`
  - `non_default_overrides: 除北极星外，其余点全部允许被挑战；旧 consumed i18n proposals 不再作为 authority target`
- review_object_manifest:
  - `source_inputs: I1 proposal + runtime/08 + i18n package exports + root surface tests`
  - `materialized_targets: docs/proposals/i18n-exact-surface-contract.md`
  - `authority_target: docs/proposals/i18n-exact-surface-contract.md`
  - `bound_docs: docs/proposals/public-api-surface-inventory-and-disposition-plan.md`
  - `derived_scope: I1 only; no implementation patch`
  - `allowed_classes: ambiguity / invalidity / controversy`
  - `blocker_classes: stale authority target / wildcard leak / overwide root exact surface`
  - `ledger_target: docs/review-plan/runs/2026-04-18-i1-i18n-exact-surface-review.md`
- challenge_scope:
  - `open`
- reviewer_set:
  - `Hypatia`
  - `Anscombe`
  - `Descartes`
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
  - `只有更小、更一致、且不引入 wildcard 或第二 exact truth 的方案才可 adoption`
- reopen_bar:
  - `必须证明某个被移出的 root noun 或 subpath 对 i18n exact surface 不可替代`
- ledger_path:
  - `docs/review-plan/runs/2026-04-18-i1-i18n-exact-surface-review.md`
- writable:
  - `yes`

## Assumptions

- A1:
  - summary:
    - `runtime/08` 已足以直接充当 I1 authority target
  - status:
    - `overturned`
  - resolution_basis:
    - runtime/08 只给 route budget，不足以承接 exact root / subpath / wildcard 争议
- A2:
  - summary:
    - `./I18n`、`./Token` 与 `./*` 至少会保留一部分
  - status:
    - `overturned`
  - resolution_basis:
    - reviewer 一致要求删掉所有 subpath 与 wildcard
- A3:
  - summary:
    - `I18nSnapshotSchema`、`InvalidI18nMessageTokenError` 等对象应继续停在 root
  - status:
    - `overturned`
  - resolution_basis:
    - reviewer 判断它们都不属于最小 service-first root

## Round 1

### Phase

- `challenge`

### Input Residual

- `none`

### Findings

- F1 `high` `invalidity`:
  - I1 不能直接审 `runtime/08`，必须 materialize 单独 exact contract
- F2 `high` `controversy`:
  - root exact surface 过宽，`I18nSnapshotSchema` 与 error class 未证明必须继续停在 root
- F3 `high` `invalidity`:
  - wildcard `./*` 与 `./I18n`、`./Token` 会破坏 exact surface 收口

### Counter Proposals

- P1:
  - summary:
    - `I1 I18n-Tag-Token Minimal Contract`
  - why_better:
    - 它把 i18n root 压到最小 service-first contract，并彻底清掉 wildcard 与重复 subpath
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
  - `I1 I18n-Tag-Token Minimal Contract`
- lineage:
  - `runtime/08 route budget -> dedicated exact proposal -> minimal i18n root`
- rejected_alternatives:
  - `继续把 runtime/08 当 authority target`
  - `保留 ./I18n / ./Token / ./*`
- rejection_reason:
  - 这些路径都会保留过宽 exact surface、重复作者决策分叉或 wildcard leak
- dominance_verdict:
  - `I18n-Tag-Token Minimal Contract` 在 `concept-count / public-surface / proof-strength / future-headroom` 上严格更强

### Freeze Record

- adopted_summary:
  - `I1` 冻结为最小 service-first contract：root 只留 `I18n / I18nTag / token(...)` 与 token contract types
- kernel_verdict:
  - `Ramanujan gate` 通过，因为它压掉了过宽 root types 与全部 subpath/wildcard
  - `Kolmogorov gate` 通过，因为它显著降低 `concept-count` 与 `public-surface`
  - `Godel gate` 通过，因为它终止了 runtime/08 与 consumed proposals 的 authority 漂移
- frozen_decisions:
  - `I18n / I18nTag / token(...)` 与 token contract types 保留
  - `I18nSnapshotSchema`、`InvalidI18nMessageTokenError`、driver/snapshot/error helper 类型退出 exact public surface
  - `./I18n`、`./Token`、`./*` 全部退出 public surface
- non_goals:
  - `本轮不开始实现`
  - `本轮不重开 consumed literal-token 或 catalog-registration proposal`
- allowed_reopen_surface:
  - `只有在能证明某个被移出的 root noun 或 subpath 对 i18n exact surface 不可替代时，才允许 reopen`
- proof_obligations:
  - `后续实现时必须同步回写 runtime/08、package exports、root surface tests、type tests`
- delta_from_previous_round:
  - `从 route budget 收缩为 dedicated exact contract`

## Consensus

- reviewers:
  - `Hypatia`
  - `Anscombe`
  - `Descartes`
- adopted_candidate:
  - `I1 I18n-Tag-Token Minimal Contract`
- final_status:
  - `adopted`
- stop_rule_satisfied:
  - `yes`
- residual_risk:
  - `未来如果 service setup 类型还需再压，可能还要在 I18nDriver 是否继续公开上再做一轮更窄 review；不影响本轮去掉 wildcard 与过宽 root types`
