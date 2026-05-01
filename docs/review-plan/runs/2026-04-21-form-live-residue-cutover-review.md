## Meta

- target: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/form-live-residue-cutover-plan.md`
- source_kind: `file-plan`
- reviewer_count: `4`
- reviewer_model: `gpt-5.4`
- reviewer_reasoning: `xhigh`
- round_count: `3`
- challenge_scope: `open`
- consensus_status: `closed`

## Bootstrap

- target_complete: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/form-live-residue-cutover-plan.md`
- challenge_scope: `open`
- reviewer_set: `A1, A2, A3, A4`
- kernel_council: `Ramanujan, Kolmogorov, Godel`
- dominance_axes: `concept-count, public-surface, compat-budget, migration-cost, proof-strength, future-headroom`
- stop_rule: `只接受能压缩 route coverage 与 owner/writeback 结构、且不引入第二 authority 的改进`
- reopen_bar: `只因 active teaching route 冲突、manifest truth 失真、retrieval quarantine 失败而重开`
- ledger_path: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-21-form-live-residue-cutover-review.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `target-candidates + adopted claim + Residue Matrix + Planning Slices` 分开维护，仍不会制造新的 drift
  - status: `overturned`
  - resolution_basis: `reviewer 交集要求 claim-indexed live residue ledger`
- A2:
  - summary: 当前 target 集足以覆盖 blocking live residue
  - status: `overturned`
  - resolution_basis: `modules/**`, `examples/logix-form-poc/**`, `docs/internal/README.md` 被补入 coverage`
- A3:
  - summary: proposal 级 reopen gate 与 lane decision 可以后置
  - status: `overturned`
  - resolution_basis: `reviewer 交集要求 lane / reopen / consume gate`
- A4:
  - summary: grep + diff-check 足以证明 live residue 已闭环
  - status: `overturned`
  - resolution_basis: `reviewer 交集要求 claim proof bundle`
- A5:
  - summary: `examples/logix-form-poc` 可以只挂 hold，不进入 coverage/route budget
  - status: `merged`
  - resolution_basis: `保留为 WQ quarantine，但必须进入 ledger`

## Round 1

### Phase

- `challenge`

### Input Residual

- none

### Findings

- F1 `high` `invalidity`:
  - summary: 缺少 claim-indexed owner/writeback ledger，proposal 有 shadow authority 风险
  - evidence: A1/A2/A4 reviewers 交集
  - status: `merged`
- F2 `high` `ambiguity`:
  - summary: blocking coverage 不完整，`modules/**`、`examples/logix-form-poc/**`、`docs/internal/README.md` 未纳入明确路由
  - evidence: A1/A2/A4 reviewers 交集
  - status: `merged`
- F3 `medium` `controversy`:
  - summary: lane decision / consume gate / proposal-level reopen gate 缺失
  - evidence: A1/A3/A4 reviewers 交集
  - status: `merged`
- F4 `medium` `invalidity`:
  - summary: proof obligation 过弱，grep 模式存在 false negative
  - evidence: A1/A2/A4 reviewers 交集
  - status: `merged`
- F5 `medium` `ambiguity`:
  - summary: `examples/logix-form-poc` 与 cookbook helper 需要明确 quarantine / parked 分层
  - evidence: A1/A2/A3/A4 reviewers 交集
  - status: `merged`

### Counter Proposals

- P1:
  - summary: `claim-indexed live residue ledger`
  - why_better: 把 owner、writeback、proof 收到同一张表
  - overturns_assumptions: `A1, A4`
  - resolves_findings: `F1, F4`
  - supersedes_proposals: `none`
  - dominance: `dominates`
  - axis_scores: `concept-count=+, public-surface=0, compat-budget=0, migration-cost=+, proof-strength=++, future-headroom=++`
- P2:
  - summary: `W1/W2/WQ split`
  - why_better: 把 blocking live route 与 retrieval quarantine 拆开
  - overturns_assumptions: `A2, A5`
  - resolves_findings: `F2, F5`
  - supersedes_proposals: `none`
  - dominance: `dominates`
  - axis_scores: `concept-count=+, public-surface=0, compat-budget=0, migration-cost=+, proof-strength=+, future-headroom=+`
- P3:
  - summary: `lane decision + reopen gate + consume gate`
  - why_better: 把 proposal lane 的角色与停止条件写死
  - overturns_assumptions: `A3`
  - resolves_findings: `F3`
  - supersedes_proposals: `none`
  - dominance: `dominates`
  - axis_scores: `concept-count=+, public-surface=0, compat-budget=0, migration-cost=0, proof-strength=++, future-headroom=+`

### Resolution Delta

- adopted candidate 选择 `P1 + P2 + P3`
- `A1-A4` overturned
- `A5` merged

## Adoption

- adopted_candidate: `owner-map-first live residue contract + W1/W2/WQ split + lane/reopen/consume gate`
- lineage: `baseline -> P1 -> P1+P2 -> P1+P2+P3`
- rejected_alternatives: `直接转入 docs/next/**`
- rejection_reason: `当前仍需冻结 lane 与 quarantine 边界，尚未纯执行化`
- dominance_verdict: `新候选压缩了结构并提高了 proof strength，不引入第二 authority`

### Freeze Record

- adopted_summary: `本页改成 claim-indexed live residue contract。用 Live Residue Ledger 承接 claim、authority-owner、live-target、mirror-target、proof 与 reopen-route；用 W1/W2/WQ 切 blocking cutover 与 retrieval quarantine；用 proposal 级 lane / reopen / consume gate 限制边界。`
- kernel_verdict: `通过 Round 1 freeze`
- frozen_decisions:
  - `保留 proposal lane`
  - `modules/**` 进入 coverage`
  - `examples/logix-form-poc/**` 进入 WQ quarantine`
  - `demo-local helper 不再作为 sanctioned route`
- non_goals:
  - `不处理 error/decode/render owner truth`
  - `不处理 P0 semantic closure`
  - `不处理 exact noun freeze`
- allowed_reopen_surface:
  - `lane 决策`
  - `retrieval quarantine 最小预算`
  - `LH1~LH3` 的 proof-based hold 粒度
- proof_obligations:
  - `owner parity`
  - `live route parity`
  - `internal mirror parity`
  - `manifest parity`
  - `quarantine parity`
  - `consume decision recorded`
- delta_from_previous_round:
  - `新增 Live Residue Ledger`
  - `新增 Lane Decision / Consume Gate / Reopen Gate`
  - `新增 W1/W2/WQ`

## Round 2

### Phase

- `converge`

### Input Residual

- `Lane Decision` 的过期理由
- `WQ/LR5` 的最小 quarantine 预算
- `LR5/LH2` 的双重维护

### Findings

- `存在 residual findings`

### Counter Proposals

- `none beyond tighten patch`

### Resolution Delta

- `Lane Decision` 现时化
- `LR5/WQ` 固定最小 contract
- `LH2` 删除，POC quarantine 单点化

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
- adopted_candidate: `owner-map-first live residue contract + W1/W2/WQ split + lane/reopen/consume gate`
- final_status: `closed`
- stop_rule_satisfied: `yes`
- residual_risk: `仅剩执行期风险：WQ 实际落盘时，是否按 LR5/WQ 的最小 contract 达成 quarantine parity 与 consume decision recorded`

## Execution Status

- `W1` active demos / modules 已从 `useForm* / withFormDsl` 切走
- `W1` 旧 `examples/logix-react/src/form-support.ts` 已删除
- `W1` 旧 `form-cases` 案例集与 `demo-runtime.ts` 已删除
- `W1` sandbox active preset 已改到 `Form.make(..., define)`
- `W2` package manifest 已去掉 React route 误导
- `WQ` POC README 已补 historical / quarantine banner
