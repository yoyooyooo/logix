# Form API Shape Companion Carrier Principle Review

## Meta

- target: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/155-form-api-shape/candidate-ac3.3.md`
- source_kind: `file-spec`
- reviewers: `A1/A2/A3/A4`
- round_count: `2`
- challenge_scope: `open`
- consensus_status: `consensus reached`

## Bootstrap

- target_complete: `true`
- challenge_scope: `open`
- reviewer_set: `A1/A2/A3/A4`
- kernel_council: `Ramanujan / Kolmogorov / Godel`
- dominance_axes: `concept-count / public-surface / compat-budget / migration-cost / proof-strength / future-headroom`
- stop_rule: `只有通过 Ramanujan / Kolmogorov / Godel gate 且在 dominance axes 上形成严格改进的 proposal 才允许 reopen`
- reopen_bar: `必须证明 carrier principle 在不引入第二 authority / 第二 diagnostics truth / 第二 read family 的前提下形成严格改进`
- ledger_path: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-22-form-api-shape-companion-carrier-principle-review.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `本轮只审 companion carrier principle，不重开 AC3.3 顶层骨架`
  - status: `kept`
  - resolution_basis: `用户明确只想先确定原则，再继续开 plan-optimality-loop 打磨`
- A2:
  - summary: `monolithic object return 当前最值得挑战，但 challenge 目标是 principle，不是立即选定新 exact carrier`
  - status: `kept`
  - resolution_basis: `四位 reviewer 都把“冻结 principle，defer exact shape”作为交集`
- A3:
  - summary: `hard law / soft recipe / optional sugar` 三层仍然有效，但在 carrier 问题上缺一条更硬的 admissibility / atomicity law`
  - status: `kept`
  - resolution_basis: `A1/A3/A4 都要求补 carrier-level hard law`

## Round 1

### Phase

- challenge

### Input Residual

- none

### Findings

- F1 `critical` `invalidity`:
  - summary: `candidate-ac3.3.md` 仍把 `lower(): CompanionLeaf | undefined` 与 `sealed direct-slot object` 写成事实上的 hard contract
  - evidence: `A1/A2/A3/A4` 交集；都指出 monolithic return object 仍在 candidate identity 中占位
  - status: `adopted`
- F2 `high` `ambiguity`:
  - summary: 当前原则方向对，但还缺一条 carrier-level hard law，无法阻止 slot-local resolver / builder-style shape 把 deferred complexity 带回公开面
  - evidence: `A1/A3/A4` 交集
  - status: `adopted`
- F3 `high` `controversy`:
  - summary: 现在不应直接冻结 slot-local resolver；它只配作为 future carrier bias，而不是当前 authority
  - evidence: `A1/A2/A3` 交集；都认为 slot-local 还会重开 per-slot deps、partial merge、diagnostics grain
  - status: `adopted`
- F4 `medium` `ambiguity`:
  - summary: discussion / lineage 仍把 `sealed direct-slot object` 写进历史主线，造成治理口径漂移
  - evidence: `A2/A3` 交集
  - status: `adopted`

### Counter Proposals

- P1:
  - summary: `carrier-neutral single-frame atomic bundle law`
  - why_better: 冻结 semantic lane，不冻结 JS return encoding；压掉 monolithic object 的半 authority 地位
  - overturns_assumptions: `monolithic object is part of hard contract`
  - resolves_findings: `F1 F2`
  - supersedes_proposals: `sealed direct-slot object as candidate identity`
  - dominance: `dominates`
  - axis_scores: `concept-count +1 / public-surface +2 / compat-budget +1 / migration-cost +1 / proof-strength +3 / future-headroom +2`
- P2:
  - summary: `exact carrier deferred, no half-freeze`
  - why_better: 把 shape 从 hard law 里剥出来，同时保留当前 implementation baseline sketch
  - overturns_assumptions: `must pick a new concrete carrier now`
  - resolves_findings: `F1 F3 F4`
  - supersedes_proposals: `freeze slot-local resolver now`
  - dominance: `dominates`
  - axis_scores: `concept-count +2 / public-surface +2 / compat-budget +1 / migration-cost +2 / proof-strength +1 / future-headroom +2`
- P3:
  - summary: `current bundle-return lower stays as recipe / implementation baseline only`
  - why_better: 不需要立刻引入更厚的 emitter / per-slot carrier，也不让当前 sketch继续冒充 authority
  - overturns_assumptions: `bundle-return lower must remain contract core`
  - resolves_findings: `F1 F3`
  - supersedes_proposals: `slot-local resolver as current freeze`
  - dominance: `dominates`
  - axis_scores: `concept-count +1 / public-surface +1 / compat-budget +1 / migration-cost +2 / proof-strength +1 / future-headroom +1`

### Resolution Delta

- `F1 F2 F3 F4 -> adopted`
- `P1 P2 P3 -> adopted lineage`

## Adoption

- adopted_candidate: `carrier-neutral single-frame atomic bundle law + exact carrier deferred`
- lineage: `P1 + P2 + P3`
- rejected_alternatives: `freeze slot-local resolver now`, `keep monolithic return object inside hard contract`, `open a new top-level carrier noun`
- rejection_reason: `都未通过 strict-dominance gate；要么会提前冻结 shape，要么只换 carrier spelling，不删规则`
- dominance_verdict: `当前最优动作是冻结 principle，不冻结 exact carrier shape`

### Freeze Record

- adopted_summary: `hard law 只冻结 carrier-neutral single-frame atomic bundle semantics；monolithic return object 退出 hard contract；当前 companion({ lower }) 只保留为 implementation baseline sketch / recipe；exact carrier deferred`
- kernel_verdict: `通过 Ramanujan / Kolmogorov / Godel gate；压掉了 monolithic object 的半 authority 地位，同时不引入更厚的新 carrier`
- frozen_decisions:
  - `field(path)` 继续只拥有一个 local-soft-fact derivation lane
  - input authority 继续只认 `value / deps / source?`
  - day-one slot 继续只认 `availability / candidates`
  - semantic result 继续只认 `clear` 或 `bundle`
  - commit 继续只认单次 owner-local atomic bundle revision
  - `clear` 语义与具体 JS 编码解耦
  - exact carrier 继续 deferred
  - slot-local resolver 只保留为 future carrier bias，不进入当前 hard contract
- non_goals:
  - 现在冻结 slot-local resolver
  - 现在冻结 emitter carrier
  - 打开第二 read family、第二 diagnostics grain、第二 patch family
- allowed_reopen_surface:
  - 只有当某个 exact carrier 能在不引入第二系统的前提下，严格支配当前 principle，才允许重开
  - 单纯换 noun、换 callback、换 JS encoding 不构成 reopen
- proof_obligations:
  - spec.md 必须承接 hard law
  - candidate-ac3.3.md 必须把 current bundle-return lower 降为 implementation baseline sketch / recipe
  - discussion.md 必须移除 `sealed direct-slot object` 的准 authority 语气
- delta_from_previous_round: `从 hard law / recipe / sugar 三层，进一步补出 carrier-level hard law，并把 monolithic return object 降格`

## Round 2

### Phase

- converge

### Input Residual

- adopted freeze record `carrier-neutral single-frame atomic bundle law + exact carrier deferred`

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- all residual findings `closed`

## Consensus

- reviewers: `A1/A2/A3/A4`
- adopted_candidate: `carrier-neutral single-frame atomic bundle law + exact carrier deferred`
- final_status: `consensus reached`
- stop_rule_satisfied: `true`
- residual_risk: `principle 已收平，但 exact carrier 仍 deferred；后续 residual 风险继续留在 implementation evidence、sanctioned read route、row-heavy witness、diagnostics causal chain 与 future exact carrier compare。`
