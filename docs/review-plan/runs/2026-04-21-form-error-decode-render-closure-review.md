## Meta

- target: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/form-error-decode-render-closure-contract.md`
- source_kind: `file-plan`
- reviewer_count: `4`
- reviewer_model: `gpt-5.4`
- reviewer_reasoning: `xhigh`
- round_count: `3`
- challenge_scope: `open`
- consensus_status: `closed`

## Bootstrap

- target_complete: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/form-error-decode-render-closure-contract.md`
- challenge_scope: `open`
- reviewer_set: `A1, A2, A3, A4`
- kernel_council: `Ramanujan, Kolmogorov, Godel`
- dominance_axes: `concept-count, public-surface, compat-budget, migration-cost, proof-strength, future-headroom`
- stop_rule: `只接受能压缩 claim/owner/proof 结构，并减少与 live residue proposal 共管面的改进`
- reopen_bar: `只因 active authority 冲突、live witness 反证、或 witness/control-plane 无法闭环而重开`
- ledger_path: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-21-form-error-decode-render-closure-review.md`
- writable: `true`

## Assumptions

- A1:
  - summary: adopted claim、Current Tensions、Planning Slices 分开维护，仍不会形成 drift
  - status: `overturned`
  - resolution_basis: `reviewer 交集要求 claim-indexed closure ledger`
- A2:
  - summary: demo-local precedence/render residue 可以和 live residue proposal 共管
  - status: `overturned`
  - resolution_basis: `reviewer 交集要求 handoff consumer`
- A3:
  - summary: item-level hold 足以替代 proposal-level reopen gate
  - status: `overturned`
  - resolution_basis: `reviewer 交集要求 Reopen Gate / Dependency Gate`
- A4:
  - summary: concern bucket 足以代表 freezeable waves
  - status: `overturned`
  - resolution_basis: `reviewer 交集要求 blocking waves + parked holds`
- A5:
  - summary: grep + diff-check 足以证明 closure
  - status: `overturned`
  - resolution_basis: `reviewer 交集要求 claim proof bundle`

## Round 1

### Phase

- `challenge`

### Input Residual

- none

### Findings

- F1 `high` `invalidity`:
  - summary: 缺少 claim-indexed owner/proof ledger，proposal 有 shadow authority 风险
  - evidence: A1/A2/A3/A4 reviewer 交集
  - status: `merged`
- F2 `high` `controversy`:
  - summary: demo-local helper precedence / render residue 与 live residue proposal 共管
  - evidence: A1/A3 reviewers 交集
  - status: `merged`
- F3 `medium` `ambiguity`:
  - summary: proposal 级 Reopen Gate / Dependency Gate / lane role 缺失
  - evidence: A1/A2/A3/A4 reviewer 交集
  - status: `merged`
- F4 `medium` `invalidity`:
  - summary: concern bucket 不是 freezeable wave，需要 blocking waves + parked holds
  - evidence: A1/A2/A3/A4 reviewer 交集
  - status: `merged`
- F5 `medium` `invalidity`:
  - summary: proof obligation 过弱，未对齐 declaration / witness / evidence
  - evidence: A2/A4 reviewer 交集
  - status: `merged`

### Counter Proposals

- P1:
  - summary: `claim-indexed closure contract`
  - why_better: 把 owner、mirror、witness、close condition 收到单表
  - overturns_assumptions: `A1, A5`
  - resolves_findings: `F1, F5`
  - supersedes_proposals: `none`
  - dominance: `dominates`
  - axis_scores: `concept-count=+, public-surface=0, compat-budget=0, migration-cost=+, proof-strength=++, future-headroom=++`
- P2:
  - summary: `live residue handoff + dependency gate`
  - why_better: 去掉与 live residue proposal 的共管面
  - overturns_assumptions: `A2`
  - resolves_findings: `F2`
  - supersedes_proposals: `none`
  - dominance: `dominates`
  - axis_scores: `concept-count=+, public-surface=0, compat-budget=0, migration-cost=+, proof-strength=+, future-headroom=++`
- P3:
  - summary: `W1/W2/W3/W4 + Reopen Gate`
  - why_better: 把 concern bucket 压成 blocking waves 与 parked holds
  - overturns_assumptions: `A3, A4`
  - resolves_findings: `F3, F4`
  - supersedes_proposals: `none`
  - dominance: `dominates`
  - axis_scores: `concept-count=+, public-surface=0, compat-budget=0, migration-cost=+, proof-strength=++, future-headroom=+`

### Resolution Delta

- adopted candidate 选择 `P1 + P2 + P3`
- `A1-A5` overturned

## Adoption

- adopted_candidate: `claim-indexed closure contract + live residue handoff + blocking waves + proposal-level reopen/dependency gate`
- lineage: `baseline -> P1 -> P1+P2 -> P1+P2+P3`
- rejected_alternatives: `继续维持大而全的 concern-bucket plan`
- rejection_reason: `会持续制造 shadow authority 与 proposal overlap`
- dominance_verdict: `新候选压缩了结构，减少了共管面，并提高了 proof strength`

### Freeze Record

- adopted_summary: `本页改成 claim-indexed closure contract。用 Authority Classes / Owner Writeback Matrix 与 Claim Closure Ledger 承接 owner truth；demo-local helper precedence / render residue 一律通过 live residue proposal handoff；实施波次改成 W1/W2/W3/W4；并新增 Lane Role、Reopen Gate、Dependency Gate、Consume Gate。`
- kernel_verdict: `通过 Round 1 freeze`
- frozen_decisions:
  - `本页不直接代持 demo-local helper residue`
  - `本页只持有 exact closure、owner truth、consume gate`
  - `E1~E4 不再作为 topic bucket 保留`
- non_goals:
  - `不重开 reason contract 本体`
  - `不做 field-ui exact freeze`
  - `不做 toolkit noun 设计`
- allowed_reopen_surface:
  - `claim ledger 的 owner/writeback 映射`
  - `live residue handoff 的依赖边界`
  - `blocking wave 与 parked hold 的分层粒度`
- proof_obligations:
  - `owner parity`
  - `code surface parity`
  - `witness parity`
  - `scenario proof parity`
  - `consume decision recorded`
  - `no active sanctioned helper precedence route`
- delta_from_previous_round:
  - `新增 Authority Classes / Owner Writeback Matrix`
  - `新增 Claim Closure Ledger`
  - `新增 live residue handoff`
  - `新增 W1/W2/W3/W4`

## Round 2

### Phase

- `converge`

### Input Residual

- `Lane Role` 是否已改成真实未决条件
- handoff consumer 是否已成为单一元数据来源
- wave proof 是否足以覆盖 claim proof
- 重复 adopted claim 是否已压缩

### Findings

- `存在 residual findings`

### Counter Proposals

- `none beyond tighten patch`

### Resolution Delta

- `Lane Role` 现时化
- handoff consumer 进入单一元数据来源
- `W1/W2/W3` 的 proof bundle 覆盖 claim proof
- adopted claim 改成 `EC1-EC5` 索引

## Round 3

### Phase

- `converge`

### Input Residual

- `none beyond final tighten patch verification`

### Findings

- `none`

### Counter Proposals

- `none`

### Resolution Delta

- `all residual findings closed`

## Consensus

- reviewers: `A1, A2, A3, A4`
- adopted_candidate: `claim-indexed closure contract + live residue handoff + blocking waves + proposal-level reopen/dependency gate`
- final_status: `closed`
- stop_rule_satisfied: `yes`
- residual_risk: `仅剩执行期风险：live residue handoff proof 何时满足 consume gate，以及届时这份工件是否转入 docs/next/**`

## Execution Status

- canonical decode leaf 已从 raw string 切到 `FormErrorLeaf`
- exact handle 已移除 `getState` 与 getter 面
- submit gate 已落最小 `$form.submitAttempt.summary / compareFeed`
