## Meta

- target: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/form-authority-drift-writeback-contract.md`
- source_kind: `file-plan`
- reviewer_count: `4`
- reviewer_model: `gpt-5.4`
- reviewer_reasoning: `xhigh`
- round_count: `3`
- challenge_scope: `open`
- consensus_status: `closed`

## Bootstrap

- target_complete: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/form-authority-drift-writeback-contract.md`
- challenge_scope: `open`
- reviewer_set: `A1, A2, A3, A4`
- kernel_council: `Ramanujan, Kolmogorov, Godel`
- dominance_axes: `concept-count, public-surface, compat-budget, migration-cost, proof-strength, future-headroom`
- stop_rule: `只接受能压缩 owner/writeback 结构、且不引入第二 authority 的改进`
- reopen_bar: `必须提供 active authority 冲突、live witness 失真或 retrieval quarantine 失败的直接证据`
- ledger_path: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-21-form-authority-drift-writeback-review.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `target-candidates + Drift Matrix + Planning Slices` 分开维护，仍不会制造新的 drift
  - status: `overturned`
  - resolution_basis: `Round 1 reviewer 交集要求压成 owner-map-first matrix`
- A2:
  - summary: `Pending / Hold` 只写局部重开条件即可，不需要 proposal 级 reopen gate
  - status: `overturned`
  - resolution_basis: `Round 1 reviewer 交集要求补 Reopen Gate`
- A3:
  - summary: 当前工件天然应继续停在 `docs/proposals/**`
  - status: `merged`
  - resolution_basis: `保留 proposal lane，但必须显式写 lane decision / consume gate`
- A4:
  - summary: `rg + git diff --check` 足以证明 authority drift closure
  - status: `overturned`
  - resolution_basis: `Round 1 reviewer 交集要求 claim-proof matrix 与更强 acceptance`
- A5:
  - summary: stale planning 只要暂不批量 supersede，就不会继续污染 active retrieval
  - status: `deferred`
  - resolution_basis: `只保留最小 retrieval quarantine；全量 stale governance 后置`

## Round 1

### Phase

- `challenge`

### Input Residual

- none

### Findings

- F1 `high` `invalidity`:
  - summary: 当前 proposal 仍可能长成 shadow authority，缺少 `claim -> owner -> mirror -> proof -> consume gate` 的单表结构
  - evidence: A1/A2/A3/A4 reviewer 交集
  - status: `merged`
- F2 `high` `ambiguity`:
  - summary: proposal lane 身份、consume gate 与转 `docs/next/**` 的门槛未写清
  - evidence: A3 reviewer + A1/A4 的治理收口意见
  - status: `merged`
- F3 `high` `controversy`:
  - summary: proposal 级 `Reopen Gate` 缺失，后续容易把 `F1` survivor set 或 owner redesign 带回本页
  - evidence: A1/A2/A4 reviewer 交集
  - status: `merged`
- F4 `medium` `invalidity`:
  - summary: proof obligation 过弱，只能证明文本被改，不能证明 authority route 已闭环
  - evidence: A1/A2/A3/A4 reviewer 交集
  - status: `merged`
- F5 `medium` `controversy`:
  - summary: stale-plan 处理需要拆成 blocking 的 retrieval quarantine 和 non-blocking 的 parked housekeeping
  - evidence: A1/A2/A3/A4 reviewer 交集
  - status: `merged`

### Counter Proposals

- P1:
  - summary: `owner-map-first writeback contract`
  - why_better: 用单一 matrix 承接 claim、owner、mirror、proof、consume gate，直接压掉自体 drift
  - overturns_assumptions: `A1, A4`
  - resolves_findings: `F1, F4`
  - supersedes_proposals: `none`
  - dominance: `dominates`
  - axis_scores: `concept-count=+, public-surface=0, compat-budget=0, migration-cost=+, proof-strength=++, future-headroom=++`
- P2:
  - summary: `proposal-level reopen gate + lane decision`
  - why_better: 把 survivor set / owner split / stale governance 的争议导流到正确工件
  - overturns_assumptions: `A2, A3`
  - resolves_findings: `F2, F3`
  - supersedes_proposals: `none`
  - dominance: `dominates`
  - axis_scores: `concept-count=+, public-surface=0, compat-budget=0, migration-cost=+, proof-strength=++, future-headroom=+`
- P3:
  - summary: `minimal retrieval quarantine + parked stale-plan housekeeping`
  - why_better: 保留小体量，同时解决 active retrieval 冲突
  - overturns_assumptions: `A5`
  - resolves_findings: `F5`
  - supersedes_proposals: `none`
  - dominance: `partial`
  - axis_scores: `concept-count=0, public-surface=0, compat-budget=0, migration-cost=+, proof-strength=+, future-headroom=+`
- P4:
  - summary: `直接升到 docs/next/**` 
  - why_better: 进一步压掉 proposal lane 的 shadow authority 风险
  - overturns_assumptions: `A3`
  - resolves_findings: `F2`
  - supersedes_proposals: `none`
  - dominance: `none`
  - axis_scores: `concept-count=0, public-surface=+, compat-budget=0, migration-cost=-, proof-strength=+, future-headroom=+`

### Resolution Delta

- `P1 + P2 + P3` 合成为 adopted candidate
- `P4` 保留为 open challenge，不在 Round 1 采用
- `A1, A2, A4` overturned
- `A3` merged
- `A5` deferred

## Adoption

- adopted_candidate: `owner-map-first writeback contract + proposal-level reopen gate + minimal retrieval quarantine`
- lineage: `baseline -> P1 -> P1+P2 -> P1+P2+P3`
- rejected_alternatives: `P4 直接升到 docs/next/**`
- rejection_reason: `当前仍有 consume gate 与 retrieval quarantine 的定义工作，直接升 lane 会把未收口治理转移到 next topic`
- dominance_verdict: `P1+P2+P3` 在不显著增加迁移成本的前提下，提升了 proof-strength、future-headroom，并压缩了 shadow authority 风险

### Freeze Record

- adopted_summary: `把 proposal 改成 owner-map-first writeback contract。用 Authority Classes / Owner Map + Claim / Writeback / Proof Matrix 承接 adopted claims；补 Lane Decision、Reopen Gate、minimal retrieval quarantine，并把 stale-plan 处理拆成 blocking quarantine 与 non-blocking parked housekeeping。`
- kernel_verdict: `通过 Round 1 freeze。新候选压缩了结构，避免第二 authority，并把 reopen 约束收回单点 gate。`
- frozen_decisions:
  - `保留 proposal lane`
  - `不重开 F1 survivor set`
  - `必须采用 claim-proof matrix`
  - `必须采用 proposal-level reopen gate`
  - `stale-plan 处理拆成 blocking 与 non-blocking`
- non_goals:
  - `不做 runtime implementation`
  - `不做 example / manifest residue cutover`
  - `不做 P0 semantic closure`
  - `不做全量 stale-plan supersede governance`
- allowed_reopen_surface:
  - `是否继续停在 proposal lane`
  - `minimal retrieval quarantine 的最小预算`
  - `AH1~AH3` 的 proof-based hold 细节
- proof_obligations:
  - `owner page synced`
  - `supporting route synced`
  - `inventory mirror synced`
  - `proposal lane indexed`
  - `lane decision / consume gate recorded`
  - `no stale contradictory sentence in active docs`
  - `high-conflict stale hazard 已 quarantine 或显式 parked`
- delta_from_previous_round:
  - `新增 Lane Decision`
  - `新增 Authority Classes / Owner Map`
  - `新增 Claim / Writeback / Proof Matrix`
  - `新增 Reopen Gate`
  - `新增 minimal retrieval quarantine`

## Round 2

### Phase

- `converge`

### Input Residual

- `proposal 是否已具备无 unresolved findings 的 freezeable 结构`

### Findings

- F6 `medium` `ambiguity`:
  - summary: `runtime/08` 尚未进入 owner map，matrix owner coverage 不完整
  - evidence: A2 reviewer
  - status: `closed`
- F7 `medium` `ambiguity`:
  - summary: `target-candidates` 与 proof anchor 的关系不够明确
  - evidence: A2 reviewer
  - status: `closed`
- F8 `medium` `invalidity`:
  - summary: matrix `proof` 词表与 freeze record proof obligations 未完全统一
  - evidence: A2 reviewer
  - status: `closed`

### Counter Proposals

- P5:
  - summary: `补 proof anchors + owner coverage + fixed proof vocabulary`
  - why_better: 只做小 patch，就能把 converge 阶段剩余的自体漂移压掉
  - overturns_assumptions: `none`
  - resolves_findings: `F6, F7, F8`
  - supersedes_proposals: `none`
  - dominance: `dominates`
  - axis_scores: `concept-count=0, public-surface=0, compat-budget=0, migration-cost=0, proof-strength=+, future-headroom=+`

### Resolution Delta

- 增加 `Writeback Targets And Proof Anchors`
- 在 owner map 中补 `runtime/08`
- matrix proof 列切到固定词表

## Round 3

### Phase

- `converge`

### Input Residual

- `F6-F8`

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- all residual findings `closed`

## Consensus

- reviewers: `A1, A2, A3, A4`
- adopted_candidate: `owner-map-first writeback contract + proposal-level reopen gate + minimal retrieval quarantine`
- final_status: `closed`
- stop_rule_satisfied: `yes`
- residual_risk: `执行阶段仍需控制 proof obligations、owner map 与 retrieval quarantine 的同步，避免重新长出轻度术语漂移`

## Execution Status

- `runtime/06` 已明确 root exact helper 固定为 `Form.make / Form.Rule / Form.Error`
- routing / inventory mirror 已切到当前 proposal / next 路由
- 两份高冲突 stale proposal 已补 superseded / stale hazard 提示
