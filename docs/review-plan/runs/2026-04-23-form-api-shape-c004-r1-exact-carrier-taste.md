# Form API Shape C004-R1 Exact Carrier Taste Review

## Meta

- target: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/155-form-api-shape/challenge-c004-r1-exact-carrier-taste.md`
- source_kind: `file-spec`
- reviewers: `A1/A2/A3/F`
- round_count: `1`
- challenge_scope: `frozen`
- consensus_status: `consensus reached`

## Bootstrap

- target_complete: `true`
- challenge_scope: `frozen`
- reviewer_set: `A1/A2/A3/F`
- active_advisors: `Feynman`
- activation_reason: `本轮聚焦 exact carrier taste、首读可理解性与 Agent-first 默认生成质量`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan / Kolmogorov / Godel`
- dominance_axes: `concept-count / public-surface / compat-budget / migration-cost / proof-strength / future-headroom`
- stop_rule: `只有 exact carrier challenger 在 frozen hard law 下形成 strict-dominance，才允许替换当前 baseline`
- reopen_bar: `不得重开 AC3.3 / P10 / P11 / S1 / S2 / C003 / C004.1；只有 exact carrier 自身形成 strict-dominance，才允许重开`
- ledger_path: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-23-form-api-shape-c004-r1-exact-carrier-taste.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `本轮只审 exact carrier taste，不重开顶层骨架、noun、callback`
  - status: `kept`
  - resolution_basis: `四位 reviewer 全部接受 frozen-scope framing`
- A2:
  - summary: `slot 更显眼，不自动等于更优 carrier`
  - status: `kept`
  - resolution_basis: `A1/A2/A3/F 全部否定这个假设`
- A3:
  - summary: `slot-explicit block` 会自然长成 builder DSL / bag-of-hooks
  - status: `kept`
  - resolution_basis: `四位 reviewer 交集`
- A4:
  - summary: `slot-explicit object methods` 比 block 更自然，但仍会暗示 slot-level subtheory
  - status: `kept`
  - resolution_basis: `A1/A2/A3/F 交集`

## Round 1

### Phase

- challenge

### Input Residual

- residual: exact carrier taste compare

### Findings

- F1 `high` `invalidity`:
  - summary: `B slot-explicit block` 会把 carrier 推成公开 block DSL，天然诱发 bag-of-hooks、builder 扩张和第二 patch family 幻觉
  - evidence: `A1/A2/A3/F` 交集
  - status: `adopted`
- F2 `high` `ambiguity`:
  - summary: `C slot-explicit object methods` 提高了 slot salience，但会把 `single derivation -> bundle` 改写成 `slot methods -> implicit join`
  - evidence: `A1/A2/A3/F` 交集
  - status: `adopted`
- F3 `medium` `taste-gap`:
  - summary: `A` 有审美 scar，主要体现在 slot salience 偏弱与 author attention 容易先落 shape
  - evidence: `A1/A2/F` 交集
  - status: `adopted`
- F4 `medium` `framing`:
  - summary: 当前真正需要优化的是 `A` 的 teaching framing，不是急着换 carrier
  - evidence: `A2/A3/F` 交集
  - status: `adopted`

### Counter Proposals

- P1:
  - summary: `retain A as single-lower atomic-bundle witness`
  - why_better: 保住 single ctx / single lower / single bundle / single commit 的最小结构
  - overturns_assumptions: `slot-explicit is inherently better`
  - resolves_findings: `F3 F4`
  - supersedes_proposals: `replace A immediately`
  - dominance: `dominates`
  - axis_scores: `concept-count +1 / public-surface +1 / compat-budget +1 / migration-cost +1 / proof-strength +2 / future-headroom +1`
- P2:
  - summary: `reject B, park C as weaker counterfactual`
  - why_better: 区分两个 challenger 的风险等级，避免把所有显式 slot carrier 混成同一类
  - overturns_assumptions: `B and C are equivalent challengers`
  - resolves_findings: `F1 F2`
  - supersedes_proposals: `keep B/C equally alive`
  - dominance: `dominates`
  - axis_scores: `concept-count 0 / public-surface +1 / compat-budget 0 / migration-cost +1 / proof-strength +2 / future-headroom +1`
- P3:
  - summary: `tighten reopen bar to third-slot or per-slot divergence evidence`
  - why_better: 把 taste discomfort 收束成可证伪条件，避免无限空转 exact carrier
  - overturns_assumptions: `exact carrier should stay generically open`
  - resolves_findings: `F3 F4`
  - supersedes_proposals: `leave exact carrier residual too vague`
  - dominance: `dominates`
  - axis_scores: `concept-count +1 / public-surface 0 / compat-budget +1 / migration-cost +1 / proof-strength +2 / future-headroom +1`

### Resolution Delta

- `F1 F2 F3 F4 -> adopted`
- `P1 P2 P3 -> adopted lineage`

## Adoption

- adopted_candidate: `C004-R1.1 no strictly better exact carrier yet`
- lineage: `P1 + P2 + P3`
- rejected_alternatives:
  - `B slot-explicit block`
  - immediate promotion of `C slot-explicit object methods`
- rejection_reason: `B 直接触发 builder/bag-of-hooks 风险；C 虽有 taste 竞争力，但没有在 frozen gate 下 strict-dominate A`
- dominance_verdict: `当前最优动作是保留 A，并把 residual 收紧到可证伪 reopen 条件`

### Freeze Record

- adopted_summary: `exact carrier 当前仍无 strictly better challenger。A 继续保留为 single-lower atomic-bundle witness；B 出局；C 仅保留为 weaker counterfactual。`
- kernel_verdict: `通过 Ramanujan / Kolmogorov / Godel gate；没有为审美不适重开第二系统`
- frozen_decisions:
  - current ranking 固定为 `A > C > B`
  - `A` 当前属于 bounded taste scar，不构成设计债
  - `B` 默认拒绝
  - `C` 不冻结，只保留为 parked counterfactual
  - exact carrier 的 teaching framing 应优先讲成 `single-lower atomic-bundle witness`
- non_goals:
  - 现在替换 baseline
  - 现在引入 slot-explicit DSL
  - 现在把 `C` 升成新 baseline
- allowed_reopen_surface:
  - 第三 slot 出现并形成真实 authoring 压力
  - 出现可测的 per-slot deps/source divergence
  - 某个 challenger 在 frozen hard law 下形成 strict-dominance
- proof_obligations:
  - `challenge-c004-r1-exact-carrier-taste.md` 必须改成 freeze-recorded
  - `discussion.md` 必须记录 `A > C > B`
  - `candidate-ac3.3.md` 必须补 exact carrier verdict 与 reopen bar
  - `signoff-brief.md` 必须把 exact carrier residual 收紧
- delta_from_previous_round: `从 open taste compare 收成 no-better exact carrier freeze`

## Consensus

- reviewers: `A1/A2/A3/F`
- adopted_candidate: `C004-R1.1 no strictly better exact carrier yet`
- final_status: `consensus reached`
- stop_rule_satisfied: `true`
- residual_risk:
  - `A` 的可接受性强依赖当前只保留双 slot 与 single bundle law
  - 一旦第三 slot 或 per-slot divergence 出现实证，exact carrier 需要重开
