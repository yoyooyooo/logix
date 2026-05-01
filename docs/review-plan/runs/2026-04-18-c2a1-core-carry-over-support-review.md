# C2A1 Core Carry-Over Support Review Ledger

## Meta

- target:
  - `docs/proposals/core-carry-over-support-contract.md`
- targets:
  - `docs/proposals/core-carry-over-support-contract.md`
  - `docs/ssot/runtime/03-canonical-authoring.md`
  - `docs/ssot/runtime/10-react-host-projection-boundary.md`
  - `docs/standards/logix-api-next-guardrails.md`
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
  - `target_claim: C2A1 这组 carry-over support 是否还存在任何 public survivor`
  - `non_default_overrides: 除北极星外，其余点全部允许被挑战；尤其是 ModuleTag 与 Logic 的残余公开价值`
- review_object_manifest:
  - `source_inputs: C2A1 proposal + runtime/03 + runtime/10 + guardrails + core package exports`
  - `materialized_targets: docs/proposals/core-carry-over-support-contract.md`
  - `authority_target: docs/proposals/core-carry-over-support-contract.md`
  - `bound_docs: docs/proposals/public-api-surface-inventory-and-disposition-plan.md`
  - `derived_scope: C2A1 only; no implementation patch`
  - `allowed_classes: ambiguity / invalidity / controversy`
  - `blocker_classes: false support survival / stale concept carry-over / host-law misownership`
  - `ledger_target: docs/review-plan/runs/2026-04-18-c2a1-core-carry-over-support-review.md`
- challenge_scope:
  - `open`
- reviewer_set:
  - `Arendt`
  - `Nietzsche`
  - `Fermat`
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
  - `必须证明至少一个 carry-over support 对 public core 不可替代`
- ledger_path:
  - `docs/review-plan/runs/2026-04-18-c2a1-core-carry-over-support-review.md`
- writable:
  - `yes`

## Assumptions

- A1:
  - summary:
    - carry-over support 至少会有一部分继续停在 public core
  - status:
    - `overturned`
  - resolution_basis:
    - reviewer 一致给出 public survivor set 为零
- A2:
  - summary:
    - `./ModuleTag` 因为 host law 使用它，所以默认应继续公开
  - status:
    - `overturned`
  - resolution_basis:
    - 它的概念可回收到 host lookup law，不自动等于独立 public surface
- A3:
  - summary:
    - `./Logic` 在 root canonical 退出后仍应作为 support subpath 存活
  - status:
    - `overturned`
  - resolution_basis:
    - 它的概念可回收到 `Module.logic(...)` 方法位

## Round 1

### Phase

- `challenge`

### Input Residual

- `none`

### Findings

- F1 `high` `invalidity`:
  - `Action / Actions / Bound / Handle / State` 没有独立 owner truth，只是 support convenience
- F2 `high` `controversy`:
  - `./ModuleTag` 与 `./Logic` 是 hardest case，但 reviewer 仍判断可回收到 host law 与 `Module.logic(...)`
- F3 `medium` `ambiguity`:
  - 继续公开这组对象只会保留旧 support surface 与理解分叉

### Counter Proposals

- P1:
  - summary:
    - `C2A1 Public-Zero Carry-Over Support Contract`
  - why_better:
    - 它把 carry-over support 从 public core 全部归零，直接压掉一整层残余 vocabulary
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
  - `C2A1 Public-Zero Carry-Over Support Contract`
- lineage:
  - `support adjunct candidate -> public-zero support contract`
- rejected_alternatives:
  - `任何 carry-over support 继续 public 存活的方案`
- rejection_reason:
  - `这组对象没有独立 owner truth，继续公开只会扩大名词面与理解分叉`
- dominance_verdict:
  - `public-zero` 在 `concept-count / public-surface / proof-strength / future-headroom` 上严格更强

### Freeze Record

- adopted_summary:
  - `C2A1` 冻结为 public-zero support contract，7 项 carry-over support 全部退出 public core
- kernel_verdict:
  - `Ramanujan gate` 通过，因为它压掉了整层 support surface
  - `Kolmogorov gate` 通过，因为它显著降低 `concept-count` 与 `public-surface`
  - `Godel gate` 通过，因为它把 `ModuleTag` 与 `Logic` 的概念 owner 分别收回 host law 与 `Module.logic(...)`
- frozen_decisions:
  - `Action / ./Actions / ./Bound / ./Handle / ./Logic / ./ModuleTag / ./State` 全部退出 public core
  - `ModuleTag` 概念回收到 host lookup law
  - `Logic` 概念回收到 `Module.logic(...)`
- non_goals:
  - `本轮不开始实现`
  - `本轮不裁 C2A2 / C2A3`
- allowed_reopen_surface:
  - `只有在能证明某一项 support object 对 public core 不可替代时，才允许 reopen`
- proof_obligations:
  - `后续实现时必须同步回写 host law、authoring docs、root barrel、exports 与 witness tests`
- delta_from_previous_round:
  - `从 carry-over support 候选转为 public-zero`

## Consensus

- reviewers:
  - `Arendt`
  - `Nietzsche`
  - `Fermat`
- adopted_candidate:
  - `C2A1 Public-Zero Carry-Over Support Contract`
- final_status:
  - `adopted`
- stop_rule_satisfied:
  - `yes`
- residual_risk:
  - `真正的实现会同时牵动 core exports 与 host docs；这属于后续 implementation planning 范围，不影响本轮 freeze`
