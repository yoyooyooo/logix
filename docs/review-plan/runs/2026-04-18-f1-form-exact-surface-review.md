# F1 Form Exact Surface Review Ledger

## Meta

- target:
  - `docs/ssot/form/13-exact-surface-contract.md`
- targets:
  - `docs/ssot/form/13-exact-surface-contract.md`
  - `docs/ssot/form/05-public-api-families.md`
  - `docs/ssot/runtime/10-react-host-projection-boundary.md`
  - `docs/ssot/runtime/08-domain-packages.md`
  - `packages/logix-form/package.json`
  - `packages/logix-form/src/index.ts`
- source_kind:
  - `file-ssot-contract`
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
  - `target_claim: F1 应直接审 13 exact authority，收口 form root exact surface、Form.Error companion、field-ui companion、builtin message sugar 与 locales`
  - `non_default_overrides: 除北极星外，其余点全部允许被挑战；旧 consumed proposal 不再作为 authority target`
- review_object_manifest:
  - `source_inputs: form 13 exact surface contract + form 05 route budget + runtime/10 host law + runtime/08 domain packages + logix-form exports/tests`
  - `materialized_targets: docs/ssot/form/13-exact-surface-contract.md`
  - `authority_target: docs/ssot/form/13-exact-surface-contract.md`
  - `bound_docs: docs/ssot/form/05-public-api-families.md,docs/ssot/runtime/10-react-host-projection-boundary.md,docs/ssot/runtime/08-domain-packages.md,docs/proposals/public-api-surface-inventory-and-disposition-plan.md`
  - `derived_scope: F1 only; no implementation patch`
  - `allowed_classes: ambiguity / invalidity / controversy`
  - `blocker_classes: stale authority target / second exact truth / overwide exact root / supporting residue drift`
  - `ledger_target: docs/review-plan/runs/2026-04-18-f1-form-exact-surface-review.md`
- challenge_scope:
  - `open`
- reviewer_set:
  - `Turing`
  - `Heisenberg`
  - `Gibbs`
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
  - `只有更小、更一致、且不引入第二 exact truth 的方案才可 adoption`
- reopen_bar:
  - `必须证明某个被移出的 exact noun 对 root exact surface 不可替代`
- ledger_path:
  - `docs/review-plan/runs/2026-04-18-f1-form-exact-surface-review.md`
- writable:
  - `yes`

## Assumptions

- A1:
  - summary:
    - `form-exact-api-freeze-candidate.md` 仍能作为 F1 authority target
  - status:
    - `overturned`
  - resolution_basis:
    - 该 proposal 已 `consumed`；唯一 exact authority 已落到 `13-exact-surface-contract.md`
- A2:
  - summary:
    - `Form.Path / SchemaPathMapping / SchemaErrorMapping` 继续属于 root exact surface
  - status:
    - `overturned`
  - resolution_basis:
    - reviewer 给出的最小 survivor set只保留 `Form.make / Form.Rule / Form.Error`
- A3:
  - summary:
    - `field-ui` 与 builtin message sugar 应整体继续停在 exact surface
  - status:
    - `overturned`
  - resolution_basis:
    - reviewer 只保留 field-ui 的 boundary 结论与 builtin message 的窄 allowlist

## Round 1

### Phase

- `challenge`

### Input Residual

- `none`

### Findings

- F1 `high` `invalidity`:
  - F1 的 authority target 不能再回退到 consumed proposal，必须直接审 `13-exact-surface-contract.md`
- F2 `high` `controversy`:
  - root exact surface 过宽；`Form.Path / SchemaPathMapping / SchemaErrorMapping` 未证明必须继续停在 root
- F3 `high` `ambiguity`:
  - supporting residue 仍有 drift：`Form.Error companion`、field-ui、builtin message sugar、`./locales` 还没完全定死

### Counter Proposals

- P1:
  - summary:
    - `SYN-17 core-first contract contraction`
  - why_better:
    - 它把 root exact surface 压到最小，同时把 supporting residue 控制在 companion primitive、boundary 结论与 plain locale assets
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
  - `SYN-17 core-first contract contraction`
- lineage:
  - `consumed proposal candidate -> live exact authority contraction`
- rejected_alternatives:
  - `继续沿用 consumed proposal`
  - `继续保留过宽 root exact surface`
- rejection_reason:
  - `这两条路都会保留第二 exact truth或过大的 root noun 面`
- dominance_verdict:
  - `SYN-17` 在 `concept-count / public-surface / proof-strength / future-headroom` 上严格更强

### Freeze Record

- adopted_summary:
  - `F1` 冻结为更小的 core-first exact contract：root 只留 `Form.make / Form.Rule / Form.Error`，`./locales` 只留 optional plain locale assets
- kernel_verdict:
  - `Ramanujan gate` 通过，因为它压掉了 3 个过宽的 root exact noun
  - `Kolmogorov gate` 通过，因为它显著降低 `concept-count` 与 `public-surface`
  - `Godel gate` 通过，因为它终止了 consumed proposal 与 live SSoT 的双 authority 风险
- frozen_decisions:
  - `13-exact-surface-contract.md` 是唯一 authority target
  - root exact surface 只保留 `Form.make / Form.Rule / Form.Error`
  - `./locales` 继续保留，但只作为 optional plain locale asset subpath
  - `Form.Error.field(path)` 是唯一 exact companion primitive
  - field-ui 只保留 companion boundary 结论，不保留 leaf shape或 helper family
  - builtin message sugar 只保留窄 authoring edge allowlist
  - `Form.Path / SchemaPathMapping / SchemaErrorMapping` 退出 root exact surface
- non_goals:
  - `本轮不开始实现`
  - `本轮不裁 supporting pages 的全文重写`
- allowed_reopen_surface:
  - `只有在能证明某个被移出 root 的 exact noun 不可替代时，才允许 reopen`
- proof_obligations:
  - `后续实现时必须同步回写 13、05、package exports、root barrel 与相关 witness tests`
- delta_from_previous_round:
  - `从过宽 root exact surface 收缩为 core-first exact contract`

## Consensus

- reviewers:
  - `Turing`
  - `Heisenberg`
  - `Gibbs`
- adopted_candidate:
  - `SYN-17 core-first contract contraction`
- final_status:
  - `adopted`
- stop_rule_satisfied:
  - `yes`
- residual_risk:
  - `field-ui leaf shape 与 supporting pages 的更细 spelling 仍需后续单独 reopen；这不影响本轮 exact surface freeze`
