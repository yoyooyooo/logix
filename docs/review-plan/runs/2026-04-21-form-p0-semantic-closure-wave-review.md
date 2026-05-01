## Meta

- target: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/form-p0-semantic-closure-wave-plan.md`
- source_kind: `file-plan`
- reviewer_count: `4`
- reviewer_model: `gpt-5.4`
- reviewer_reasoning: `xhigh`
- round_count: `3`
- challenge_scope: `open`
- consensus_status: `closed`

## Bootstrap

- target_complete: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/form-p0-semantic-closure-wave-plan.md`
- challenge_scope: `open`
- reviewer_set: `A1, A2, A3, A4`
- kernel_council: `Ramanujan, Kolmogorov, Godel`
- dominance_axes: `concept-count, public-surface, compat-budget, migration-cost, proof-strength, future-headroom`
- stop_rule: `只接受能压缩 wave contract、去掉 post-P0 shadow authority、并增强 proof bundle 的改进`
- reopen_bar: `只因 wave slicing、owner mapping、proof bundle 问题而重开`
- ledger_path: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-21-form-p0-semantic-closure-wave-review.md`
- writable: `true`

## Assumptions

- A1:
  - summary: adopted claim、Wave Order、Planning Matrix、Suggested Verification 分开维护，仍不会形成 second planning authority
  - status: `overturned`
  - resolution_basis: `reviewer 交集要求 claim-indexed / wave-ledger-first`
- A2:
  - summary: post-P0 reopen 可以和 P0 三波主计划共存于同一份 proposal
  - status: `overturned`
  - resolution_basis: `reviewer 交集要求把 Wave D 降成 external routing`
- A3:
  - summary: 06/07/09 可以直接当 main owner page 使用
  - status: `overturned`
  - resolution_basis: `reviewer 交集要求 owner / witness / proof / enabler 拆列`
- A4:
  - summary: item-level hold 足以替代 proposal-level reopen bar / consume gate
  - status: `overturned`
  - resolution_basis: `reviewer 交集要求 lane / reopen / consume gate`
- A5:
  - summary: rg + diff-check 足以证明每波都已形成 verification-feed
  - status: `overturned`
  - resolution_basis: `reviewer 交集要求 wave proof bundle`

## Round 1

### Phase

- `challenge`

### Input Residual

- none

### Findings

- F1 `high` `invalidity`:
  - summary: 计划主轴偏“排波次”，没有收成 claim-indexed closure ledger
  - evidence: A1/A2/A4 reviewer 交集
  - status: `merged`
- F2 `high` `invalidity`:
  - summary: `Wave D` 与 `PH*` 代持 post-P0 reopen，污染主波次
  - evidence: A1/A2/A3/A4 reviewer 交集
  - status: `merged`
- F3 `high` `ambiguity`:
  - summary: owner / witness / proof / enabler / consumer 路由混写
  - evidence: A1/A2/A3/A4 reviewer 交集
  - status: `merged`
- F4 `medium` `controversy`:
  - summary: proposal lane 身份、reopen bar、consume gate 缺失
  - evidence: A1/A2/A4 reviewer 交集
  - status: `merged`
- F5 `medium` `invalidity`:
  - summary: verification 只停在句法级，未升级成 wave proof bundle
  - evidence: A1/A2/A3/A4 reviewer 交集
  - status: `merged`

### Counter Proposals

- P1:
  - summary: `claim-indexed P0 closure ledger`
  - why_better: 把成功标准从排波次改成 claim 的收敛路径
  - overturns_assumptions: `A1, A5`
  - resolves_findings: `F1, F5`
  - supersedes_proposals: `none`
  - dominance: `dominates`
  - axis_scores: `concept-count=+, public-surface=0, compat-budget=0, migration-cost=+, proof-strength=++, future-headroom=++`
- P2:
  - summary: `Three-Wave Core Plan + Post-P0 Reopen Routing`
  - why_better: 把 Wave D 与 PH* 从主计划剥离
  - overturns_assumptions: `A2`
  - resolves_findings: `F2`
  - supersedes_proposals: `none`
  - dominance: `dominates`
  - axis_scores: `concept-count=+, public-surface=0, compat-budget=0, migration-cost=+, proof-strength=++, future-headroom=+`
- P3:
  - summary: `Wave Owner Ledger + Reopen/Consume Gate`
  - why_better: 把 owner/witness/proof/enabler/consumer 拆清，并冻结 proposal lane 的边界
  - overturns_assumptions: `A3, A4`
  - resolves_findings: `F3, F4`
  - supersedes_proposals: `none`
  - dominance: `dominates`
  - axis_scores: `concept-count=+, public-surface=0, compat-budget=0, migration-cost=0, proof-strength=++, future-headroom=++`

### Resolution Delta

- adopted candidate 选择 `P1 + P2 + P3`
- `A1-A5` overturned

## Adoption

- adopted_candidate: `claim-indexed P0 closure ledger + Wave Ledger + Post-P0 external routing + proposal-level reopen/consume gate`
- lineage: `baseline -> P1 -> P1+P2 -> P1+P2+P3`
- rejected_alternatives: `继续让 Wave D / PH* 留在主波次`
- rejection_reason: `会形成 post-P0 shadow authority，并污染 P0 stop rule`
- dominance_verdict: `新候选压缩了结构，移除了第二套 reopen 系统，并提升了 proof strength`

### Freeze Record

- adopted_summary: `本页收成 claim-indexed P0 closure contract。主计划只保留 Wave A/B/C；Wave D 与 PH* 改成 Post-P0 Reopen Routing；用单一 Wave Ledger 承接 owner、witness、proof、writeback、reopen-route；并新增 proposal 级 Lane Decision、Reopen Bar、Consume Gate 与 wave proof bundle。`
- kernel_verdict: `通过 Round 1 freeze`
- frozen_decisions:
  - `主计划只保留 A/B/C`
  - `Wave D 退出主波次`
  - `06/07/09 不再被写成 main owner page`
  - `proof obligation 升级成 wave proof bundle`
- non_goals:
  - `不持有 exact noun freeze`
  - `不持有 toolkit intake policy`
  - `不持有 host adjunct import shape`
- allowed_reopen_surface:
  - `wave slicing`
  - `owner / witness / proof routing`
  - `wave proof bundle`
- proof_obligations:
  - `declaration parity`
  - `witness parity`
  - `evidence parity`
  - `compare proof`
  - `consume decision recorded`
- delta_from_previous_round:
  - `新增 claim-indexed Wave Closure Ledger`
  - `新增 Wave Owner Ledger`
  - `新增 Post-P0 Reopen Routing`
  - `新增 Lane Decision / Reopen Bar / Consume Gate`

## Round 2

### Phase

- `converge`

### Input Residual

- `Lane Decision` 的唯一真实 residual
- `Post-P0 Reopen Routing` 是否已成为单一外部 routing 账本
- `Wave Ledger` 是否足以替代双表与重复 prose

### Findings

- `存在 residual findings`

### Counter Proposals

- `none beyond tighten patch`

### Resolution Delta

- `Lane Decision` 现时化
- `Pending/Hold` 退出主块
- `Post-P0 Reopen Routing` 并入单一外部 routing 账本
- 双表波次压成单一 `Wave Ledger`

## Round 3

### Phase

- `converge`

### Input Residual

- `Lane Decision` 的最终 lane verdict

### Findings

- `none`

### Counter Proposals

- `none`

### Resolution Delta

- `all residual findings closed`

## Consensus

- reviewers: `A1, A2, A3, A4`
- adopted_candidate: `claim-indexed P0 closure ledger + Wave Ledger + Post-P0 external routing + proposal-level reopen/consume gate`
- final_status: `closed`
- stop_rule_satisfied: `yes`
- residual_risk: `仅剩文档治理动作层风险：何时从 docs/proposals/** 转入 docs/next/** 或在后续关闭后直接 consumed`

## Execution Status

- `Wave A` store-mode `replace(nextItems)` 已按 roster replacement 处理
- `Wave B` submit gate 已有最小 `submitAttempt` snapshot
- `Wave C` submit summary / compare feed 已共用 `reasonSlotId`
