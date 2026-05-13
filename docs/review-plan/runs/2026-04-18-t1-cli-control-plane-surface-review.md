# T1 CLI Control Plane Surface Review Ledger

## Meta

- target:
  - `docs/proposals/cli-control-plane-surface-contract.md`
- targets:
  - `docs/proposals/cli-control-plane-surface-contract.md`
  - `docs/ssot/runtime/09-verification-control-plane.md`
  - `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`
  - `docs/standards/logix-api-next-guardrails.md`
  - `packages/logix-cli/package.json`
  - `packages/logix-cli/src/{index,Commands}.ts`
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
  - `target_claim: @logixjs/cli 的最小公开 route 与 archived residue 去向是什么`
  - `non_default_overrides: 除北极星外，其余点全部允许被挑战；runtime/09 只作 authority input，不作 exact authority`
- review_object_manifest:
  - `source_inputs: T1 proposal + runtime/09 + runtime/04 + cli package exports + bin/tests`
  - `materialized_targets: docs/proposals/cli-control-plane-surface-contract.md`
  - `authority_target: docs/proposals/cli-control-plane-surface-contract.md`
  - `bound_docs: docs/proposals/public-api-surface-inventory-and-disposition-plan.md`
  - `derived_scope: T1 only; no implementation patch`
  - `allowed_classes: ambiguity / invalidity / controversy`
  - `blocker_classes: false route survival / archived residue leakage / second CLI truth`
  - `ledger_target: docs/review-plan/runs/2026-04-18-t1-cli-control-plane-surface-review.md`
- challenge_scope:
  - `open`
- reviewer_set:
  - `Bohr`
  - `Hegel`
  - `Harvey`
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
  - `只有更小、更一致、且不让 CLI 再长第二程序化真相的方案才可 adoption`
- reopen_bar:
  - `必须证明 Commands、extra bins 或 archived 命令对公开 CLI surface 不可替代`
- ledger_path:
  - `docs/review-plan/runs/2026-04-18-t1-cli-control-plane-surface-review.md`
- writable:
  - `yes`

## Assumptions

- A1:
  - summary:
    - `runtime/09` 足以直接承接 T1 exact review
  - status:
    - `overturned`
  - resolution_basis:
    - runtime/09 只承接 control-plane truth，不承接 CLI exact survivor set
- A2:
  - summary:
    - `Commands / ./Commands` 至少有一条应继续保留
  - status:
    - `overturned`
  - resolution_basis:
    - reviewer 一致认为它们把 route、程序化入口与 residue 混成一层
- A3:
  - summary:
    - archived 命令与 `logix-devserver` 至少应保留一部分公开存活位
  - status:
    - `overturned`
  - resolution_basis:
    - reviewer 一致要求它们退出公开 CLI surface

## Round 1

### Phase

- `challenge`

### Input Residual

- `none`

### Findings

- F1 `high` `invalidity`:
  - CLI exact public route 过宽，混入 `Commands`、extra bins 与 archived residue
- F2 `high` `controversy`:
  - `Commands / ./Commands` 作为程序化入口与 `runtime control plane` owner 冲突
- F3 `medium` `ambiguity`:
  - archived 命令与 `logix-devserver` 是否还存在任何公开存活理由

### Counter Proposals

- P1:
  - summary:
    - `Route-Minimal Runtime CLI Contract`
  - why_better:
    - 它把公开 CLI 面压回 `logix check / trial / compare`，同时把程序化真相收回 core control-plane 与 internal verification
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
  - `Route-Minimal Runtime CLI Contract`
- lineage:
  - `runtime/09 authority input -> dedicated CLI exact contract -> route-minimal CLI`
- rejected_alternatives:
  - `保留 Commands / ./Commands`
  - `保留 logix-devserver`
  - `保留 describe / ir.* / anchor.* / contract-suite.run / transform.module`
- rejection_reason:
  - 这些对象都会让 CLI 同时持有 route、程序化入口、archived residue 三层真相
- dominance_verdict:
  - `Route-Minimal Runtime CLI Contract` 在 `concept-count / public-surface / proof-strength / future-headroom` 上严格更强

### Freeze Record

- adopted_summary:
  - `T1` 冻结为 route-minimal CLI contract，公开 surface 只保留 `bin: logix` 与 `check / trial / compare`
- kernel_verdict:
  - `Ramanujan gate` 通过，因为它压掉了 Commands、extra bins 与 archived 命令面
  - `Kolmogorov gate` 通过，因为它显著降低 `concept-count` 与 `public-surface`
  - `Godel gate` 通过，因为它把 CLI route 与 core control-plane 程序化真相重新分开了
- frozen_decisions:
  - `Commands` 与 `./Commands` 全部退出公开 CLI surface
  - `logix-devserver` 退出公开面
  - `describe / ir.* / anchor.* / contract-suite.run / transform.module` 全部退出公开 CLI surface
  - 若未来还保留，它们只配 expert route 或仓内维护入口
- non_goals:
  - `本轮不开始实现`
- allowed_reopen_surface:
  - `只有在能证明 Commands、extra bins 或 archived 命令对公开 CLI surface 不可替代时，才允许 reopen`
- proof_obligations:
  - `后续实现时必须同步回写 runtime/09、package exports、bin、CLI integration tests`
- delta_from_previous_round:
  - `从 Commands+bin+archived 混合面收缩到 route-minimal CLI`

## Consensus

- reviewers:
  - `Bohr`
  - `Hegel`
  - `Harvey`
- adopted_candidate:
  - `Route-Minimal Runtime CLI Contract`
- final_status:
  - `adopted`
- stop_rule_satisfied:
  - `yes`
- residual_risk:
  - `删掉 ./Commands 后，少量把 CLI 当库调用的自动化脚本会失去入口，短期需要用子进程调用 logix 或等待更小程序化 facade`
