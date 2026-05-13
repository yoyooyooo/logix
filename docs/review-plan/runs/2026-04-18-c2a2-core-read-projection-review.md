# C2A2 Core Read Projection Review Ledger

## Meta

- target:
  - `docs/proposals/core-read-projection-protocol-contract.md`
- targets:
  - `docs/proposals/core-read-projection-protocol-contract.md`
  - `docs/ssot/runtime/01-public-api-spine.md`
  - `docs/ssot/runtime/11-toolkit-layer.md`
  - `docs/standards/logix-api-next-guardrails.md`
  - `packages/logix-core/src/{ReadQuery,ExternalStore,Resource}.ts`
  - `packages/logix-core/package.json`
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
  - `target_claim: ReadQuery / ExternalStore / Resource 是否还存在任何 public survivor`
  - `non_default_overrides: 除北极星外，其余点全部允许被挑战；尤其是 protocol 这个分组与 subpath 保留资格`
- review_object_manifest:
  - `source_inputs: C2A2 proposal + runtime/01 + toolkit-layer + guardrails + ReadQuery/ExternalStore/Resource source + package exports`
  - `materialized_targets: docs/proposals/core-read-projection-protocol-contract.md`
  - `authority_target: docs/proposals/core-read-projection-protocol-contract.md`
  - `bound_docs: docs/proposals/public-api-surface-inventory-and-disposition-plan.md`
  - `derived_scope: C2A2 only; no implementation patch`
  - `allowed_classes: ambiguity / invalidity / controversy`
  - `blocker_classes: false protocol survival / stale subpath witness / owner drift`
  - `ledger_target: docs/review-plan/runs/2026-04-18-c2a2-core-read-projection-review.md`
- challenge_scope:
  - `open`
- reviewer_set:
  - `Halley`
  - `Kierkegaard`
  - `Kepler`
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
  - `必须证明至少一个 read/projection object 对 public core 不可替代`
- ledger_path:
  - `docs/review-plan/runs/2026-04-18-c2a2-core-read-projection-review.md`
- writable:
  - `yes`

## Assumptions

- A1:
  - summary:
    - `ReadQuery / ExternalStore / Resource` 至少会有一部分继续停在 public core
  - status:
    - `overturned`
  - resolution_basis:
    - reviewer 一致给出 public survivor set 为零
- A2:
  - summary:
    - `ReadQuery` 因为可诊断性与静态读描述符，所以默认应继续公开
  - status:
    - `overturned`
  - resolution_basis:
    - 它的概念可回收到统一 selector law 与内部 selector compile / strict gate
- A3:
  - summary:
    - `ExternalStore / Resource` 至少应保留一项作为 protocol surface
  - status:
    - `overturned`
  - resolution_basis:
    - 两者都没有独立 owner truth；未来 DX 入口分别只配去 toolkit 或 query owner

## Round 1

### Phase

- `challenge`

### Input Residual

- `none`

### Findings

- F1 `high` `invalidity`:
  - `ReadQuery / ExternalStore / Resource` 没有被证明是不可替代的 public core protocol
- F2 `high` `controversy`:
  - `ReadQuery` 是 hardest case，但 reviewer 仍判断应 internalize
- F3 `medium` `ambiguity`:
  - `ExternalStore / Resource` 若未来要活，owner 已明显偏向 toolkit / query，而非 core

### Counter Proposals

- P1:
  - summary:
    - `C2A2 Public-Zero Read Projection Cut Contract`
  - why_better:
    - 它把 read/projection protocol 从 public core 全部归零，避免再长出第二读侧真相
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
  - `C2A2 Public-Zero Read Projection Cut Contract`
- lineage:
  - `read protocol candidate -> public-zero read projection contract`
- rejected_alternatives:
  - `任何 ReadQuery / ExternalStore / Resource 继续 public 存活的方案`
- rejection_reason:
  - `这三者没有独立 owner truth，继续公开只会保留读侧第二真相与历史壳层`
- dominance_verdict:
  - `public-zero` 在 `concept-count / public-surface / proof-strength / future-headroom` 上严格更强

### Freeze Record

- adopted_summary:
  - `C2A2` 冻结为 public-zero read projection contract，3 项 read/projection protocol 全部退出 public core
- kernel_verdict:
  - `Ramanujan gate` 通过，因为它压掉了整层读侧协议对象
  - `Kolmogorov gate` 通过，因为它显著降低 `concept-count` 与 `public-surface`
  - `Godel gate` 通过，因为它把 selector law、ingest/install 协议、query owner 重新归位，避免第二读侧真相
- frozen_decisions:
  - `ReadQuery / ExternalStore / Resource` 全部退出 public core
  - `ReadQuery` 概念回收到统一 selector law与内部 selector compile / strict gate
  - `ExternalStore` 未来 DX 入口只配去 toolkit
  - `Resource` 未来 DX 入口优先去 query owner
- non_goals:
  - `本轮不开始实现`
  - `本轮不裁 C2A3 / C2B`
- allowed_reopen_surface:
  - `只有在能证明至少一项 read/projection object 对 public core 不可替代时，才允许 reopen`
- proof_obligations:
  - `后续实现时必须同步回写 selector law、toolkit/router 口径、query owner docs 与 witness tests`
- delta_from_previous_round:
  - `从 read protocol 候选转为 public-zero`

## Consensus

- reviewers:
  - `Halley`
  - `Kierkegaard`
  - `Kepler`
- adopted_candidate:
  - `C2A2 Public-Zero Read Projection Cut Contract`
- final_status:
  - `adopted`
- stop_rule_satisfied:
  - `yes`
- residual_risk:
  - `极端静态读描述符场景可能短期失去最短表达，这属于未来 toolkit 或更窄 helper reopen 范围，不影响本轮 freeze`
