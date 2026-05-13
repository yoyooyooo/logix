# S2 Row-Heavy Witness Pack Review Ledger

## Meta

- target: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/155-form-api-shape/challenge-s2-row-heavy-proof-pack.md`
- source_kind: `file-spec`
- reviewers: `A1/A2/A3/A4`
- round_count: `2`
- challenge_scope: `frozen`
- consensus_status: `consensus`

## Bootstrap

- target_complete: `true`
- challenge_scope: `frozen`
- reviewer_set: `A1/A2/A3/A4`
- active_advisors: `von Neumann`
- activation_reason: `S2 聚焦 row-heavy 复杂 witness、replace/reorder/cleanup 失败域与 owner-scope reopen bar`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan / Kolmogorov / Godel`
- dominance_axes: `concept-count / public-surface / compat-budget / migration-cost / proof-strength / future-headroom`
- stop_rule: `只有通过 Ramanujan / Kolmogorov / Godel gate，且在 row-heavy witness 目标函数上形成严格改进，才允许替换当前 S2 基线`
- reopen_bar: `不得重开 source boundary、slot inventory、S1 已冻结 read-side laws；除非 reviewer 先证明 row-heavy witness 在这些冻结前提下不可成立`
- ledger_path: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-22-form-api-shape-s2-row-heavy-proof-pack.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `S2` 只审 row-heavy witness pack，不重开 `S1` 已冻结的 read-side law
  - status: `kept`
  - resolution_basis: 当前另一条核心缺口是 row-heavy witness 证据
- A2:
  - summary: 只有在出现 irreducible witness 时，才允许考虑 `list/root companion`
  - status: `kept`
  - resolution_basis: `AC3.3` 当前以 `field-only` 为最小 owner scope
- A3:
  - summary: 所有 row-heavy witness 都必须回链 `149 / 151 / 152 / 153 / 154`
  - status: `kept`
  - resolution_basis: 复杂 witness 不能绕开既有 owner map
- A4:
  - summary: 若当前仍无 irreducible witness，本轮也可以以 no-better verdict 收口
  - status: `kept`
  - resolution_basis: plan-optimality-loop 允许 no strictly better candidate 作为有效结论

## Round 1

### Phase

- challenge

### Input Residual

- residual: row-heavy witness pack against `field-only companion`

### Findings

- F1 `critical` `ambiguity`:
  - summary: 当前 witness 暴露的是证据强度缺口，不是 owner scope 失配
  - evidence: `A1/A2/A3/A4` 交集
  - status: `adopted`
- F2 `critical` `controversy`:
  - summary: `149 / 151 / 152 / 153 / 154` 已分别承接 row truth、cleanup、settlement、reason、remote boundary，直接重开 `list/root companion` 只会多一层 soft truth
  - evidence: `A1/A2/A3/A4` 交集
  - status: `adopted`
- F3 `high` `ambiguity`:
  - summary: 现有最强 reopen trigger 是不可分解的 roster-level soft fact，不是 ergonomics 或 perf 猜测
  - evidence: `A1/A3/A4` 交集
  - status: `adopted`

### Counter Proposals

- P1:
  - summary: `S2.1 no irreducible owner-scope witness`
  - why_better: 不扩大 owner scope，却把当前 no-better verdict 和 reopen trigger 收成稳定 freeze record
  - overturns_assumptions: `none`
  - resolves_findings: `F1 F2 F3`
  - supersedes_proposals: `none`
  - dominance: `dominates`
  - axis_scores: `concept-count +2 / public-surface +2 / compat-budget +1 / migration-cost +1 / proof-strength +2 / future-headroom +1`
  - status: `adopted`

### Resolution Delta

- `F1 F2 F3 -> adopted`
- `P1 -> adopted as S2.1`

## Adoption

- adopted_candidate: `S2.1 no irreducible owner-scope witness`
- lineage: `AC3.3 -> S2 -> P1`
- rejected_alternatives:
  - immediate `list().companion`
  - immediate `root().companion`
  - row-heavy convenience-driven owner-scope expansion
- rejection_reason: `当前只有 witness 缺口，没有 owner-level 失配证据`
- dominance_verdict: `current S2 baseline is dominated by P1`

### Freeze Record

- adopted_summary: `当前 row-heavy witness 仍不足以证明必须重开 list/root 级 companion；field-only companion + list DSL + source + rule + submit 仍是最小且足够的 owner map`
- kernel_verdict: `通过 Ramanujan / Kolmogorov / Godel gate；不扩大 public surface，却提高 proof-strength`
- frozen_decisions:
  - 当前不重开 `list().companion`
  - 当前不重开 `root().companion`
  - `reorder / replace / nested list / cleanup / async source / async rule / submit gate` 继续优先回链 `149 / 151 / 152 / 153 / 154`
  - ergonomics 或 perf 猜测不构成 owner-level reopen 证据
- non_goals:
  - 现在就冻结 `list/root companion` exact contract
  - 用组件 glue 或 host selector convenience 代替 owner-level 证据
  - 为单个 witness 长专用 noun family
- allowed_reopen_surface:
  - `list().companion`
  - `root().companion`
  - roster-level soft fact 是否不可分解
- proof_obligations:
  - 给出不可分解的 roster-level soft fact witness
  - 证明 `field-only` 重复下沉会造成原子性、diagnostics backlink 或可测性能失真
  - 证明 reopen 不会复制第二 row truth / cleanup truth / remote truth
- delta_from_previous_round:
  - from open row-heavy doubt to no-better freeze

## Round 2

### Phase

- converge

### Input Residual

- residual: irreducible roster-level soft fact still absent

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- `no irreducible owner-scope witness -> confirmed`
- row-heavy witness gap remains residual risk, not unresolved finding

## Consensus

- reviewers: `A1/A2/A3/A4`
- adopted_candidate: `S2.1 no irreducible owner-scope witness`
- final_status: `consensus reached with residual risk`
- stop_rule_satisfied: `true`
- residual_risk:
  - 不可分解的 roster-level soft fact witness 仍未出现
  - `availability / candidates` 若长期分离 deps/source receipt 且出现可测成本，可能要求重开 owner scope
  - list/root 级 soft slice 若被证明无法拆回 field-only，仍可能要求重开
