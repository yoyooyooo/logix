# C2B Core Verification And Evidence Review Ledger

## Meta

- target:
  - `docs/proposals/core-verification-evidence-surface-contract.md`
- targets:
  - `docs/proposals/core-verification-evidence-surface-contract.md`
  - `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`
  - `docs/ssot/runtime/09-verification-control-plane.md`
  - `docs/ssot/runtime/11-toolkit-layer.md`
  - `docs/standards/logix-api-next-guardrails.md`
  - `packages/logix-core/src/{ControlPlane,Debug,Observability,Reflection,Kernel}.ts`
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
  - `target_claim: C2B 这组 verification / evidence / kernel residual 是否还存在任何 root 或多 subpath survivor`
  - `non_default_overrides: 除北极星外，其余点全部允许被挑战；尤其是 owner 合并方式、root 保留与 Debug 的公开合理性`
- review_object_manifest:
  - `source_inputs: C2B proposal + runtime/04 + runtime/09 + runtime/11 + guardrails + ControlPlane/Debug/Observability/Reflection/Kernel source/tests`
  - `materialized_targets: docs/proposals/core-verification-evidence-surface-contract.md`
  - `authority_target: docs/proposals/core-verification-evidence-surface-contract.md`
  - `bound_docs: docs/proposals/public-api-surface-inventory-and-disposition-plan.md`
  - `derived_scope: C2B only; no implementation patch`
  - `allowed_classes: ambiguity / invalidity / controversy`
  - `blocker_classes: false verification survival / stale expert route / root residue / owner drift`
  - `ledger_target: docs/review-plan/runs/2026-04-18-c2b-core-verification-evidence-review.md`
- challenge_scope:
  - `open`
- reviewer_set:
  - `Poincare`
  - `Hilbert`
  - `Ampere`
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
  - `只有更小、更一致、且不引入第二 authority 的最小 verification contract 才可 adoption`
- reopen_bar:
  - `必须证明至少一个额外 verification/evidence/kernel object 对 public core 不可替代`
- ledger_path:
  - `docs/review-plan/runs/2026-04-18-c2b-core-verification-evidence-review.md`
- writable:
  - `yes`

## Assumptions

- A1:
  - summary:
    - 这组对象里至少会有一个以上 public survivor
  - status:
    - `overturned`
  - resolution_basis:
    - reviewer 给出的最小 public survivor set只剩 `./ControlPlane`
- A2:
  - summary:
    - `Debug` 因为 sinks / snapshots / trace 能力，所以默认应继续公开
  - status:
    - `overturned`
  - resolution_basis:
    - 这些能力可分别回收到 `Runtime`、`@logixjs/devtools-react` 与 internal debug layer
- A3:
  - summary:
    - `ControlPlane / Observability / Reflection / Kernel` 可以继续按现状分散公开
  - status:
    - `overturned`
  - resolution_basis:
    - reviewer 给出更小 owner 归并：`ControlPlane / Observability / Reflection` 同组，`Kernel` 单独

## Round 1

### Phase

- `challenge`

### Input Residual

- `none`

### Findings

- F1 `high` `invalidity`:
  - 这组 verification / evidence / kernel residual 没有任何对象被证明需要继续停在 root
- F2 `high` `controversy`:
  - `Debug` 是 hardest case，但 reviewer 仍判断应 internalize
- F3 `high` `ambiguity`:
  - 现行多对象公开会把 shared protocol shell、evidence/export expert route、kernel upgrade route 混成多条真相

### Counter Proposals

- P1:
  - summary:
    - `VerificationControlPlane`
  - why_better:
    - 它把公开面压到一条最小 shared protocol shell，同时把 `Debug / Observability / Reflection / Kernel` 全部收回内部或各自 owner
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
  - `VerificationControlPlane`
- lineage:
  - `verification/evidence/kernel residual candidate -> minimal verification contract shell`
- rejected_alternatives:
  - `任何保留 Debug / Observability / Reflection / Kernel 公开面的方案`
- rejection_reason:
  - `继续公开这些对象只会保留多条 expert route、扩大真相面，并阻碍 control-plane owner 收口`
- dominance_verdict:
  - `VerificationControlPlane` 在 `concept-count / public-surface / proof-strength / future-headroom` 上严格更强

### Freeze Record

- adopted_summary:
  - `C2B` 冻结为 `VerificationControlPlane`，root survivor 归零，只保留 `./ControlPlane` 这一条 shared protocol shell
- kernel_verdict:
  - `Ramanujan gate` 通过，因为它压掉了 4 个 residual family，只保留一条最小 protocol shell
  - `Kolmogorov gate` 通过，因为它显著降低 `concept-count` 与 `public-surface`
  - `Godel gate` 通过，因为它把 shared contract、evidence/export、kernel upgrade、runtime debug 的 owner 分清了
- frozen_decisions:
  - `Debug / Observability / Reflection / Kernel` 全部退出 public core
  - `./ControlPlane` 继续公开，但只保留 shared verification contract shell
  - `ControlPlane / Observability / Reflection` 的 owner 统一归 `runtime verification/evidence`
  - `Kernel` 单独归 `runtime upgrade / experimental gate`
  - `Debug` internalize，能力回收到 `Runtime`、`@logixjs/devtools-react` 与 internal debug layer
- non_goals:
  - `本轮不开始实现`
- allowed_reopen_surface:
  - `只有在能证明至少一个额外 verification/evidence/kernel object 对 public core 不可替代时，才允许 reopen`
- proof_obligations:
  - `后续实现时必须同步回写 runtime/04、runtime/09、toolkit-layer、root barrel、exports 与 witness tests`
- delta_from_previous_round:
  - `从 verification/evidence/kernel residual candidate 转为最小 shared protocol shell`

## Consensus

- reviewers:
  - `Poincare`
  - `Hilbert`
  - `Ampere`
- adopted_candidate:
  - `VerificationControlPlane`
- final_status:
  - `adopted`
- stop_rule_satisfied:
  - `yes`
- residual_risk:
  - `第三方自定义观测器的稳定公开扩展点会短期消失；若未来真要开放生态，可能需要重开更小的 observer protocol`
