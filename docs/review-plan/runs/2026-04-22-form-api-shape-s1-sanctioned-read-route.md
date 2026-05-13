# S1 Sanctioned Companion Read Route Review Ledger

## Meta

- target: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/155-form-api-shape/challenge-s1-sanctioned-read-route.md`
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
- activation_reason: `S1 聚焦 public read route、对外可理解性与不长第二 read family`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan / Kolmogorov / Godel`
- dominance_axes: `concept-count / public-surface / compat-budget / migration-cost / proof-strength / future-headroom`
- stop_rule: `只有通过 Ramanujan / Kolmogorov / Godel gate，且在 read-route 目标函数上形成严格改进，才允许替换当前 S1 基线`
- reopen_bar: `不得重开 owner split、field-only、slot inventory、exact ui path deferred；除非 reviewer 先证明 S1 目标在这些冻结前提下不可成立`
- ledger_path: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-22-form-api-shape-s1-sanctioned-read-route.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `S1` 只审 sanctioned companion read route，不重开 `AC3.3` 总骨架
  - status: `kept`
  - resolution_basis: `parent candidate 与 spec 已把 S1 定义为 authority promotion 的独立缺口`
- A2:
  - summary: canonical read route target 继续是 `useModule + useSelector(handle, selectorFn)`
  - status: `kept`
  - resolution_basis: `155/spec.md` 已冻结这条主线，只允许在其附近寻找 sanctioned read story
- A3:
  - summary: exact `ui` path encoding 在 S1 内继续 deferred
  - status: `kept`
  - resolution_basis: `S1` 的目标是 read route，不是 landing grammar
- A4:
  - summary: 若当前不存在 strictly better candidate，本轮也可以以 no-better verdict 收口
  - status: `kept`
  - resolution_basis: `plan-optimality-loop` 明确允许 no strictly better candidate 作为有效结论

## Round 1

### Phase

- challenge

### Input Residual

- residual: sanctioned companion read route

### Findings

- F1 `critical` `controversy`:
  - summary: 任何新 helper noun、slot helper、path grammar、token 或 `fieldValue` 扩写都会长第二 read family
  - evidence: `A1/A2/A3/A4` 交集
  - status: `adopted`
- F2 `high` `ambiguity`:
  - summary: 当前缺的不是再起 noun，而是 canonical selector route 下对 companion fact 的可教学 read law
  - evidence: `A2/A3/A4` 交集
  - status: `adopted`
- F3 `medium` `ambiguity`:
  - summary: `nested list / row identity` 下的 selector recipe 仍未闭合
  - evidence: `A1/A2/A4` 交集
  - status: `deferred`

### Counter Proposals

- P1:
  - summary: `S1.1 selector-only, helper-deferred sanctioned law`
  - why_better: 在不新增第二 read family的前提下，把 S1 收成一条可冻结 route law
  - overturns_assumptions: `none`
  - resolves_findings: `F1 F2`
  - supersedes_proposals: `none`
  - dominance: `dominates`
  - axis_scores: `concept-count +2 / public-surface +2 / compat-budget +1 / migration-cost +1 / proof-strength +2 / future-headroom +1`
  - status: `adopted`
- P2:
  - summary: `selector-only companion projection contract`
  - why_better: 通过冻结 `field.companion` 级读取面提高可教学性
  - overturns_assumptions: `none`
  - resolves_findings: `F2 F3`
  - supersedes_proposals: `none`
  - dominance: `partial`
  - axis_scores: `concept-count -1 / public-surface -1 / compat-budget 0 / migration-cost 0 / proof-strength +2 / future-headroom 0`
  - status: `rejected`

### Resolution Delta

- `F1 F2 -> adopted`
- `F3 -> deferred as residual risk`
- `P1 -> adopted as S1.1`
- `P2 -> rejected for freezing projection bucket too early`

## Adoption

- adopted_candidate: `S1.1 selector-only, helper-deferred sanctioned law`
- lineage: `S1 brief -> P1`
- rejected_alternatives:
  - `companion.read(slot)` / slot helper family
  - `fieldValue(path)` expansion for companion reads
  - exact `ui` path / token / opaque descriptor route
  - selector-only companion projection contract as current authority target
- rejection_reason: `要么新增第二 read family，要么过早冻结 projection bucket / fieldHandle-like semantics`
- dominance_verdict: `current S1 baseline is dominated by P1`

### Freeze Record

- adopted_summary: `S1 当前只冻结一条 sanctioned read law：companion facts 若未来进入公开 read story，必须沿 canonical selector route 读取；helper、path、token、exact contract 一律 deferred`
- kernel_verdict: `通过 Ramanujan / Kolmogorov / Godel gate；压缩 noun 与 public surface，同时提高 proof-strength`
- frozen_decisions:
  - sanctioned read route 继续只认 `useModule + useSelector(handle, selectorFn)`
  - 当前不新增 helper noun、slot helper、path grammar、token、fieldHandle family
  - 当前不冻结 exact companion read contract
  - companion 读侧不得暴露 `ui` 内部 path
  - companion 读侧不得把逻辑打回组件 glue
- non_goals:
  - 现在就冻结 selector recipe
  - 现在就冻结 nested list / row identity read contract
  - 为 S1 顺手重开 `list/root companion`
- allowed_reopen_surface:
  - canonical selector route 下 companion selector recipe
  - nested list / row identity read proof
  - diagnostics causal chain 与 read law 的耦合点
- proof_obligations:
  - 证明 selector-only route 在 W1-W4 下足够可教学
  - 证明 row-heavy witness 不逼出第二 read family
  - 证明 diagnostics 不需要 companion 专属 helper
- delta_from_previous_round:
  - from open question to frozen route law

## Round 2

### Phase

- converge

### Input Residual

- residual: selector recipe under canonical selector route remains deferred

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- `selector-only, helper-deferred sanctioned law -> confirmed`
- `selector recipe` remains residual risk, not unresolved finding

## Consensus

- reviewers: `A1/A2/A3/A4`
- adopted_candidate: `S1.1 selector-only, helper-deferred sanctioned law`
- final_status: `consensus reached with residual risk`
- stop_rule_satisfied: `true`
- residual_risk:
  - canonical selector route 下的 sanctioned selector recipe 仍未冻结
  - `nested list / row identity` 仍是主要 reopen trigger
  - diagnostics causal chain 仍需后续 witness 补证据
