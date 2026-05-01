# S1-R1 Canonical Selector Recipe Review Ledger

## Meta

- target: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/155-form-api-shape/challenge-s1-r1-selector-recipe.md`
- source_kind: `file-spec`
- reviewers: `A1/A2/A3/A4`
- round_count: `2`
- challenge_scope: `frozen`
- consensus_status: `consensus`

## Bootstrap

- target_complete: `true`
- challenge_scope: `frozen`
- reviewer_set: `A1/A2/A3/A4`
- active_advisors: `Feynman`
- activation_reason: `S1-R1 聚焦 selector teaching、对外可理解性与不偷渡新 read contract`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan / Kolmogorov / Godel`
- dominance_axes: `concept-count / public-surface / compat-budget / migration-cost / proof-strength / future-headroom`
- stop_rule: `只有通过 Ramanujan / Kolmogorov / Godel gate，且在 selector recipe 目标函数上形成严格改进，才允许替换当前 S1-R1 基线`
- reopen_bar: `不得重开 S1.1 的 route law、owner split、field-only、slot inventory、exact ui path deferred；除非 reviewer 先证明 selector recipe 目标在这些冻结前提下不可成立`
- ledger_path: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-22-form-api-shape-s1-r1-selector-recipe.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `S1-R1` 只审 canonical selector recipe，不重开 `S1.1` read-route law
  - status: `kept`
  - resolution_basis: `S1.1` 已经把 route law 冻结，当前剩余缺口只在 selector recipe
- A2:
  - summary: 本轮不能新增 helper noun、token、path grammar、fieldHandle family
  - status: `kept`
  - resolution_basis: `S1.1 freeze record` 已明确这些对象继续 deferred
- A3:
  - summary: row-heavy 场景必须纳入 witness，否则 selector recipe 不成立
  - status: `kept`
  - resolution_basis: `S1` 的主要 reopen trigger 已锁定为 nested list / row identity
- A4:
  - summary: 若当前还不该冻结 selector recipe，本轮也可以以 no-better verdict 收口
  - status: `kept`
  - resolution_basis: `plan-optimality-loop` 允许 no strictly better candidate 作为有效结论

## Round 1

### Phase

- challenge

### Input Residual

- residual: canonical selector recipe under S1.1 route law

### Findings

- F1 `critical` `ambiguity`:
  - summary: 当前 residual 的真正缺口是 selector 内缺少统一 owner 绑定法则
  - evidence: `A1/A2/A3/A4` 交集
  - status: `adopted`
- F2 `critical` `controversy`:
  - summary: 冻结 `field.companion` 一类 projection bucket 会过早冻结 deferred read contract
  - evidence: `A1/A3/A4` 交集
  - status: `adopted`
- F3 `high` `ambiguity`:
  - summary: row-heavy witness 下，recipe 必须坚持 canonical `rowId` 绑定，否则会退回 index/path teaching
  - evidence: `A2/A3/A4` 交集
  - status: `adopted`
- F4 `medium` `ambiguity`:
  - summary: diagnostics 需要 owner-local atomic bundle 与 `(ownerRef, slot)` backlink，但不需要 companion 专属 helper
  - evidence: `A1/A3/A4` 交集
  - status: `adopted`

### Counter Proposals

- P1:
  - summary: `S1-R1.1 owner-first slot projection law`
  - why_better: 不新增公开 noun，却把 selector recipe 从纯 deferred 提升为可教学、可审计、row-heavy 可覆盖的 law
  - overturns_assumptions: `none`
  - resolves_findings: `F1 F2 F3 F4`
  - supersedes_proposals: `none`
  - dominance: `dominates`
  - axis_scores: `concept-count +1 / public-surface +1 / compat-budget +1 / migration-cost +1 / proof-strength +3 / future-headroom +1`
  - status: `adopted`
- P2:
  - summary: `field.companion projection bucket`
  - why_better: 通过冻结 bucket 提高可教学性
  - overturns_assumptions: `none`
  - resolves_findings: `F1 F3`
  - supersedes_proposals: `none`
  - dominance: `partial`
  - axis_scores: `concept-count -1 / public-surface -1 / compat-budget 0 / migration-cost 0 / proof-strength +2 / future-headroom 0`
  - status: `rejected`

### Resolution Delta

- `F1 F2 F3 F4 -> adopted`
- `P1 -> adopted as S1-R1.1`
- `P2 -> rejected for freezing projection bucket too early`

## Adoption

- adopted_candidate: `S1-R1.1 owner-first slot projection law`
- lineage: `S1.1 -> S1-R1 -> P1`
- rejected_alternatives:
  - `field.companion` projection bucket
  - helper noun / selector builder / token / path grammar
  - index-based or path-based row-heavy teaching
- rejection_reason: `要么新增 read surface，要么过早冻结 deferred contract`
- dominance_verdict: `current S1-R1 baseline is dominated by P1`

### Freeze Record

- adopted_summary: `selector recipe 当前只冻结一条 law：selector 先 resolve current owner，再从 owner-local atomic companion bundle 读取 sanctioned slots；row-heavy 场景只允许 canonical rowId 链式重入；不冻结 bucket、helper、token、path grammar`
- kernel_verdict: `通过 Ramanujan / Kolmogorov / Godel gate；不加 noun、不加 surface，显著提升 proof-strength`
- frozen_decisions:
  - selector 必须先 resolve owner，再读 companion fact
  - 单字段 owner 由 canonical field path 唯一确定
  - list / nested list owner 只允许经 canonical `rowId` 链式重入定位
  - selector 当前只投影 sanctioned slots：`availability / candidates`
  - diagnostics 当前只要求 `(ownerRef, slot)` backlink 与 atomic bundle 语义
  - 当前不冻结 projection bucket、helper noun、token、path grammar、fieldHandle family
- non_goals:
  - 现在就冻结 exact selector API spelling
  - 现在就冻结 row-heavy owner binding carrier 的 exact 载体
  - 现在就冻结 companion 专属 diagnostics helper
- allowed_reopen_surface:
  - row-heavy owner binding carrier
  - diagnostics causal chain 的更细 host-side witness
  - roster-level companion aggregation 是否需要更强 read story
- proof_obligations:
  - 证明 owner-first / slot-only / rowId-first law 在 W1-W4 下足够可教学
  - 证明 row-heavy 场景不逼出 helper noun 或 path grammar
  - 证明 diagnostics 只靠 backlink 与 bundle trace 就足够
- delta_from_previous_round:
  - from deferred selector recipe to frozen selector law

## Round 2

### Phase

- converge

### Input Residual

- residual: row-heavy owner binding carrier remains deferred

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- `owner-first slot projection law -> confirmed`
- row-heavy owner binding carrier remains residual risk, not unresolved finding

## Consensus

- reviewers: `A1/A2/A3/A4`
- adopted_candidate: `S1-R1.1 owner-first slot projection law`
- final_status: `consensus reached with residual risk`
- stop_rule_satisfied: `true`
- residual_risk:
  - row-heavy owner binding carrier 的 exact 载体仍未冻结
  - diagnostics causal chain 的 host-side witness 仍需补证据
  - roster-level companion aggregation 是否需要更强 read story，仍待 witness
