# T2 Test Harness Surface Review Ledger

## Meta

- target:
  - `docs/proposals/test-harness-surface-contract.md`
- targets:
  - `docs/proposals/test-harness-surface-contract.md`
  - `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`
  - `docs/ssot/runtime/09-verification-control-plane.md`
  - `packages/logix-test/package.json`
  - `packages/logix-test/src/index.ts`
  - `packages/logix-test/src/{TestRuntime,TestProgram,Execution,Assertions,Vitest,Act}.ts`
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
  - `target_claim: @logixjs/test 的最小 exact harness survivor set 是什么`
  - `non_default_overrides: 除北极星外，其余点全部允许被挑战；尤其是 Act 的公开资格与 root/subpath roster`
- review_object_manifest:
  - `source_inputs: T2 proposal + runtime/04 + runtime/09 + test package exports + harness tests`
  - `materialized_targets: docs/proposals/test-harness-surface-contract.md`
  - `authority_target: docs/proposals/test-harness-surface-contract.md`
  - `bound_docs: docs/proposals/public-api-surface-inventory-and-disposition-plan.md`
  - `derived_scope: T2 only; no implementation patch`
  - `allowed_classes: ambiguity / invalidity / controversy`
  - `blocker_classes: false harness survival / Act leak / overwide roster / second test truth`
  - `ledger_target: docs/review-plan/runs/2026-04-18-t2-test-harness-surface-review.md`
- challenge_scope:
  - `open`
- reviewer_set:
  - `Franklin`
  - `Meitner`
  - `Locke`
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
  - `只有更小、更一致、且不保留 escape hatch 的方案才可 adoption`
- reopen_bar:
  - `必须证明 TestRuntime、Execution、Vitest 或 Act 对 exact public harness 不可替代`
- ledger_path:
  - `docs/review-plan/runs/2026-04-18-t2-test-harness-surface-review.md`
- writable:
  - `yes`

## Assumptions

- A1:
  - summary:
    - `runtime/04` 或 `runtime/09` 足以直接承接 T2 exact review
  - status:
    - `overturned`
  - resolution_basis:
    - 两页都只给 owner law，不承接 harness roster 的 exact survivor set
- A2:
  - summary:
    - `Act` 至少应继续留作公开 escape hatch
  - status:
    - `overturned`
  - resolution_basis:
    - reviewer 一致认为它只是 `InternalContracts` 薄透传
- A3:
  - summary:
    - `TestRuntime / Execution / Vitest` 至少会有一部分继续停在 exact public surface
  - status:
    - `overturned`
  - resolution_basis:
    - converge 结果把 exact survivor set压到只剩 `TestProgram`

## Round 1

### Phase

- `challenge`

### Input Residual

- `none`

### Findings

- F1 `high` `invalidity`:
  - `Act` 明显牵到 `InternalContracts`，不该继续停在 exact public surface
- F2 `high` `controversy`:
  - `TestRuntime / Execution / Vitest` 是否还应继续公开
- F3 `medium` `ambiguity`:
  - root 与 subpath 双 roster 是否仍有必要

### Counter Proposals

- P1:
  - summary:
    - `T2 Root-Minimized TestProgram Harness Contract`
  - why_better:
    - 它把 harness surface 压到单一 noun，同时把 escape hatch 与 supporting residue 全部移出
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
  - `T2 Root-Minimized TestProgram Harness Contract`
- lineage:
  - `owner law only -> dedicated harness contract -> single-noun public harness`
- rejected_alternatives:
  - `保留 TestRuntime / Execution / Vitest`
  - `保留 Act`
  - `保留全部 subpath`
- rejection_reason:
  - 这些对象都会让 test harness 同时持有 escape hatch、supporting residue 与多重 roster
- dominance_verdict:
  - `Root-Minimized TestProgram Harness Contract` 在 `concept-count / public-surface / proof-strength / future-headroom` 上严格更强

### Freeze Record

- adopted_summary:
  - `T2` 冻结为 root-minimized harness contract，公开面只保留 root `TestProgram`
- kernel_verdict:
  - `Ramanujan gate` 通过，因为它压掉了整层 harness roster 与 Act leak
  - `Kolmogorov gate` 通过，因为它显著降低 `concept-count` 与 `public-surface`
  - `Godel gate` 通过，因为它把 harness truth 与 core/internal escape hatch 重新分开
- frozen_decisions:
  - `TestProgram` 保留
  - `TestRuntime / Execution / Assertions / Vitest / Act` 全部退出 exact public surface
  - 所有公开 subpath 全部退出
  - `Act` 回收到 core testkit 或 internal helper
  - `Execution` consumer helper 并回 `TestProgram` consumer law
  - `Vitest` 只配 supporting residue
- non_goals:
  - `本轮不开始实现`
- allowed_reopen_surface:
  - `只有在能证明 TestRuntime / Execution / Vitest / Act 对 exact public harness 不可替代时，才允许 reopen`
- proof_obligations:
  - `后续实现时必须同步回写 runtime/04、runtime/09、package exports、root barrel、examples/tests imports`
- delta_from_previous_round:
  - `从过宽 harness roster 收缩到单一 TestProgram`

## Consensus

- reviewers:
  - `Franklin`
  - `Meitner`
  - `Locke`
- adopted_candidate:
  - `T2 Root-Minimized TestProgram Harness Contract`
- final_status:
  - `adopted`
- stop_rule_satisfied:
  - `yes`
- residual_risk:
  - `删掉 Execution 与 TestRuntime 后，部分现有外部测试样例会失去直接入口，短期需要改写到 TestProgram 或等待更小 facade`
