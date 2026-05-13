# C1 Core Canonical Spine Review Ledger

## Meta

- target:
  - `docs/proposals/core-canonical-spine-final-shape-contract.md`
- targets:
  - `docs/proposals/core-canonical-spine-final-shape-contract.md`
  - `docs/ssot/runtime/01-public-api-spine.md`
  - `docs/ssot/runtime/03-canonical-authoring.md`
  - `packages/logix-core/package.json`
  - `packages/logix-core/src/index.ts`
  - `packages/logix-core/test/Contracts/CoreRootBarrel.allowlist.test.ts`
  - `packages/logix-core/test/Logix/Logix.test.ts`
  - `packages/logix-core/test/Contracts/KernelBoundary.test.ts`
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
  - `target_claim: C1 应冻结为最小 canonical spine，而非与 C2 合并的大块 residual review`
  - `non_default_overrides: 除北极星外，其余点全部允许被挑战；包括现有 SSoT 句子、分块方式、proposal 自身目标论点`
- review_object_manifest:
  - `source_inputs: C1 proposal + runtime/01 + runtime/03 + core package exports + root barrel + witness tests`
  - `materialized_targets: docs/proposals/core-canonical-spine-final-shape-contract.md`
  - `authority_target: docs/proposals/core-canonical-spine-final-shape-contract.md`
  - `bound_docs: docs/proposals/public-api-surface-inventory-and-disposition-plan.md; docs/standards/logix-api-next-guardrails.md`
  - `derived_scope: C1 only; no C2 residual freeze; no implementation patch`
  - `allowed_classes: ambiguity / invalidity / controversy`
  - `blocker_classes: mixed owner law / false canonical status / witness overreach / stale mainline`
  - `ledger_target: docs/review-plan/runs/2026-04-18-c1-core-canonical-spine-review.md`
- challenge_scope:
  - `open`
- reviewer_set:
  - `Tesla`
  - `Hume`
  - `Dalton`
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
  - `只有更小、更一致、且不引入第二 authority 的方案才可 adoption`
- reopen_bar:
  - `必须证明比 adopted candidate 更小，且不能让 C1 与 C2 再次混合`
- ledger_path:
  - `docs/review-plan/runs/2026-04-18-c1-core-canonical-spine-review.md`
- writable:
  - `yes`

## Assumptions

- A1:
  - summary:
    - `C1` 可以和 `C2` 合并冻结，因为 root barrel 当前是一个物理单元
  - status:
    - `overturned`
  - resolution_basis:
    - `runtime/01` 与 `runtime/03` 已先把 canonical mainline 和 expert/evidence residual 分成两套 owner law；物理混放不构成合并 review 的理由
- A2:
  - summary:
    - `ModuleTag / Bound / Handle / State / Actions / Action` 既然已被总清单放进 C1，就默认属于 canonical spine
  - status:
    - `overturned`
  - resolution_basis:
    - live SSoT 只稳定承认 `Module / Logic / Program / Runtime` 主链；其余对象缺 `why-mainline / why-root / why-not-C2`
- A3:
  - summary:
    - root `Logic` namespace 与 `Module.logic(...)` 应视为同一 canonical noun
  - status:
    - `overturned`
  - resolution_basis:
    - 在 north-star-only freeze 下，`Module.logic(...)` 已足够承接 logic authoring；额外 root noun 会形成同义公开面
- A4:
  - summary:
    - `ModuleTag` 因为 host law 使用它，所以应继续留在 C1 mainline
  - status:
    - `overturned`
  - resolution_basis:
    - `ModuleTag` 的 authority 在 React host lookup，而不在 core canonical spine 本身

## Round 1

### Phase

- `challenge`

### Input Residual

- `none`

### Findings

- F1 `high` `invalidity`:
  - `C1` 与 `C2` owner law 混在一起；canonical mainline 与 expert residual 没切开
  - evidence:
    - `docs/ssot/runtime/01-public-api-spine.md`
    - `docs/ssot/runtime/03-canonical-authoring.md`
    - `packages/logix-core/src/index.ts`
- F2 `high` `ambiguity`:
  - `ModuleTag / Bound / Handle / State / Actions / Action` 被打包进 C1，但缺独立 authority witness
  - evidence:
    - `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`
    - `packages/logix-core/package.json`
    - `packages/logix-core/src/index.ts`
- F3 `medium` `controversy`:
  - `Logic` 是不是还该保留独立 root noun，和 `Module.logic(...)` 是否重复
  - evidence:
    - `docs/ssot/runtime/03-canonical-authoring.md`
    - `packages/logix-core/src/Logic.ts`
    - `packages/logix-core/src/Module.ts`

### Counter Proposals

- P1:
  - summary:
    - `5 noun exact contract`，即 `Module / Logic / Program / Runtime / ModuleTag`
  - why_better:
    - 比现状更小，同时保留现有 host lookup 直觉
  - overturns_assumptions:
    - `A1`
    - `A2`
  - resolves_findings:
    - `F1`
    - `F2`
  - supersedes_proposals:
    - `none`
  - dominance:
    - `partial`
  - axis_scores:
    - `concept-count: better`
    - `public-surface: better`
    - `compat-budget: same_or_better`
    - `migration-cost: same_or_better`
    - `proof-strength: better`
    - `future-headroom: better`
- P2:
  - summary:
    - `MPR-3 Spine`，即 root canonical noun 只保留 `Module / Program / Runtime`，`Logic` 只留在 `Module.logic(...)` 方法位
  - why_better:
    - 比 `5 noun exact contract` 更小，且更贴合已写死的 authoring formula
  - overturns_assumptions:
    - `A1`
    - `A2`
    - `A3`
    - `A4`
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
    - `migration-cost: slightly_worse`
    - `proof-strength: better`
    - `future-headroom: better`
- P3:
  - summary:
    - `single-track canonical spine contract`，先把 witness 集收纯到 exports + root barrel + positive/negative tests
  - why_better:
    - 能防止 implementation phase 再把 C1 与 C2 混回去
  - overturns_assumptions:
    - `A1`
  - resolves_findings:
    - `F1`
  - supersedes_proposals:
    - `none`
  - dominance:
    - `partial`
  - axis_scores:
    - `concept-count: same`
    - `public-surface: same`
    - `compat-budget: same`
    - `migration-cost: same`
    - `proof-strength: better`
    - `future-headroom: better`

### Resolution Delta

- `A1 -> overturned`
- `A2 -> overturned`
- `A3 -> open`
- `A4 -> open`
- `P1 open`
- `P2 open`
- `P3 open`

## Round 2

### Phase

- `converge`

### Input Residual

- `A vs B`
  - `A = 5 noun exact contract`
  - `B = MPR-3 Spine`

### Findings

- F4 `high` `controversy`:
  - `Logic` 独立 namespace 是否仍有 mainline 必要性
  - evidence:
    - `docs/ssot/runtime/03-canonical-authoring.md`
    - `packages/logix-core/src/Logic.ts`
    - reviewer converge output
- F5 `high` `controversy`:
  - `ModuleTag` 是否仍应留在 C1 mainline
  - evidence:
    - `docs/ssot/runtime/10-react-host-projection-boundary.md`
    - `docs/ssot/runtime/07-standardized-scenario-patterns.md`
    - reviewer converge output

### Counter Proposals

- P4:
  - summary:
    - `adopt B = MPR-3 Spine`
  - why_better:
    - 它把 canonical spine 压到最小公开公式，同时把 host lookup owner 与 core mainline 切开
  - overturns_assumptions:
    - `A3`
    - `A4`
  - resolves_findings:
    - `F4`
    - `F5`
  - supersedes_proposals:
    - `P1`
    - `P2`
    - `P3`
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

- `A3 -> overturned`
- `A4 -> overturned`
- `P1 rejected`
- `P2 merged`
- `P3 merged`
- `P4 adopted`
- `all residual findings -> closed`

## Adoption

- adopted_candidate:
  - `MPR-3 Spine`
- lineage:
  - `quartet-first draft -> 5 noun exact contract candidate -> MPR-3 Spine`
- rejected_alternatives:
  - `5 noun exact contract`
- rejection_reason:
  - `Logic` root noun 与 `Module.logic(...)` 重叠，`ModuleTag` 的 authority 落在 host law，继续把两者留在 C1 mainline 会增加概念数并模糊 owner`
- dominance_verdict:
  - `MPR-3 Spine` 在 `concept-count / public-surface / proof-strength / future-headroom` 上严格更强，满足 adoption gate

### Freeze Record

- adopted_summary:
  - `C1` 冻结为 `MPR-3 Spine`。canonical mainline 公式固定为 `Module.logic(...) -> Program.make(...) -> Runtime.make(...)`；root canonical noun 固定为 `Module / Program / Runtime`。
- kernel_verdict:
  - `Ramanujan gate` 通过，因为它压掉了一个独立 root noun 和一圈被误挂 mainline 的 support adjacency。
  - `Kolmogorov gate` 通过，因为 `concept-count` 与 `public-surface` 继续下降，`migration-cost` 只增加在 witness rewrite，不伤核心轴。
  - `Godel gate` 通过，因为它把 host lookup authority 从 core canonical spine 中切开，避免双重 owner。
- frozen_decisions:
  - `C1` 单独冻结，不与 `C2` 合并
  - canonical mainline 只承认 `Module.logic(...) -> Program.make(...) -> Runtime.make(...)`
  - root canonical noun 只承认 `Module / Program / Runtime`
  - `Logix.Logic` / `./Logic` 退出 `C1` canonical-mainline 身份
  - `ModuleTag` 退出 `C1` mainline，authority 改挂 React host law / 后续 residual owner
  - `Bound / Handle / State / Actions / Action` 全部退出 `C1`
  - `C1` implementation 只允许收 exports、barrel、witness 集，不允许顺手吞掉 `C2`
- non_goals:
  - `不在本轮决定 C2 residual 的最终去向`
  - `不在本轮开始实现`
  - `不在本轮重写 React host law`
- allowed_reopen_surface:
  - `只有在能证明 root Logic noun 或 ModuleTag mainline 会进一步降低概念数、且不重建双 owner 时，才允许 reopen`
- proof_obligations:
  - `implementation plan 必须把 package exports、root barrel、CoreRootBarrel、KernelBoundary、Logix positive witness 绑成单轨门禁`
  - `implementation 前必须把总提案中的 C1 status 回写完整`
- delta_from_previous_round:
  - `从 quartet-first draft 收紧为 MPR-3 Spine`

## Consensus

- reviewers:
  - `Tesla`
  - `Hume`
  - `Dalton`
- adopted_candidate:
  - `MPR-3 Spine`
- final_status:
  - `adopted`
- stop_rule_satisfied:
  - `yes`
- residual_risk:
  - `live SSoT、root barrel 和 tests 当前还把 Logic / ModuleTag 当主链 witness；下一步 implementation planning 必须先收 witness authority，再动代码`
