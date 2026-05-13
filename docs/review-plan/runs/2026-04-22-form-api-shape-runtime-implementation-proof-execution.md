# Runtime Implementation Witness Execution Review Ledger

## Meta

- target: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/155-form-api-shape/challenge-runtime-scenario-proof-execution.md`
- source_kind: `file-spec`
- reviewers: `A1/A2/A3/A4`
- round_count: `2`
- challenge_scope: `frozen`
- consensus_status: `consensus`

## Bootstrap

- target_complete: `true`
- challenge_scope: `frozen`
- reviewer_set: `A1/A2/A3/A4`
- active_advisors: `Turing / von Neumann`
- activation_reason: `implementation phase 已 split，当前先补 executable witness gate`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan / Kolmogorov / Godel`
- dominance_axes: `concept-count / public-surface / compat-budget / migration-cost / proof-strength / future-headroom`
- stop_rule: `只有形成 executable witness gate contract 或明确 blocker，本轮才算完成`
- reopen_bar: `不得重开 AC3.3 public contract、S1/S2/C003 law、TRACE-S1..S5；本轮只补 implementation witness execution`
- ledger_path: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-22-form-api-shape-runtime-implementation-proof-execution.md`
- writable: `true`

## Assumptions

- A1:
  - summary: 本轮只审 executable witness gate，不修改 public API
  - status: `kept`
  - resolution_basis: implementation parent 已完成 split
- A2:
  - summary: witness gate 必须先于 benchmark evidence
  - status: `kept`
  - resolution_basis: benchmark 只复用 execution carrier
- A3:
  - summary: compare truth 继续停在已冻结 contract layer
  - status: `kept`
  - resolution_basis: `TRACE-S5` 已冻结
- A4:
  - summary: 若当前仍不足以形成 executable gate，本轮可以以 blocker 收口
  - status: `kept`
  - resolution_basis: 不能用伪 witness 代替真实执行证据

## Round 1

### Phase

- challenge

### Input Residual

- residual: active `implementation witness execution` 是否足够 freeze

### Findings

- F1 `high` `ambiguity`:
  - summary: 还缺 implementation wiring law
  - evidence: `A1`
  - status: `adopted`
- F2 `high` `ambiguity`:
  - summary: 还缺唯一 canonical witness roster
  - evidence: `A1/A2`
  - status: `adopted`
- F3 `high` `ambiguity`:
  - summary: 还缺 ref emit / compare admission / benchmark-admissible 的 acceptance matrix
  - evidence: `A1/A3`
  - status: `adopted`
- F4 `medium` `ambiguity`:
  - summary: row-heavy 四项覆盖与 `noContribution` 还没写进 hard gate
  - evidence: `A2`
  - status: `adopted`

### Counter Proposals

- P1:
  - summary: `implementation wiring law`
  - why_better: 把 route entry、shared kernel、run session、feed handoff 固定为单一 wiring contract
  - resolves_findings: `F1`
  - dominance: `dominates`
  - status: `adopted`
- P2:
  - summary: `canonical witness roster`
  - why_better: 把 `W1 .. W5` 收成唯一名单，并固定 row-heavy / negative proof 分工
  - resolves_findings: `F2 F4`
  - dominance: `dominates`
  - status: `adopted`
- P3:
  - summary: `ref emit / admission / benchmark-admissible matrix`
  - why_better: 一次收口 compare hook 与 execution whitelist，不让 benchmark 提前长成 perf truth
  - resolves_findings: `F3 F4`
  - dominance: `dominates`
  - status: `adopted`

### Resolution Delta

- `F1 F2 F3 F4 -> adopted`
- `P1 P2 P3 -> adopted as refinement delta`
- current verdict remains `needs-refinement`

## Current Status

- verdict：`superseded by Round 2 freeze`
- reason：refinement delta 已被下一轮 freeze check 全量吸收

## Round 2

### Phase

- freeze-check

### Input Residual

- residual: refined `implementation witness execution` 是否可冻结为 implementation-phase 的下一条 law

### Findings

- none blocking

### Counter Proposals

- P4:
  - summary: `TRACE-I1 implementation witness execution law`
  - why_better: refined contract 已把 wiring、canonical witness roster、row-heavy hard gate、compare hook 与 benchmark-admissible whitelist 一次收口
  - resolves_findings: `F1 F2 F3 F4`
  - dominance: `dominates`
  - status: `adopted`

### Resolution Delta

- `needs-refinement -> freeze-ready`
- `P4 -> adopted as TRACE-I1`

## Adoption

- adopted_candidate: `TRACE-I1 implementation witness execution law`
- lineage: `implementation-phase split -> witness execution refinement -> TRACE-I1`
- rejected_alternatives:
  - benchmark-first
  - second witness roster
  - perf truth 提前进入 execution gate
- rejection_reason: `这些方向都会削弱 executable witness 的唯一 truth 基底`
- dominance_verdict: `refined witness execution law is ready`

### Freeze Record

- adopted_summary: `implementation witness execution` 现已可按单一路由、单一 witness roster、单一 compare hook 与 execution whitelist 冻结`
- kernel_verdict: `通过 Ramanujan / Kolmogorov / Godel gate；implementation wiring、row-heavy hard gate 与 compare hook 已闭合`
- frozen_decisions:
  - 单一路由固定为 `trialRunModule -> proofKernel -> ScenarioCompiledPlan + ScenarioRunSession -> ScenarioCarrierEvidenceFeed -> runtime.compare`
  - `W1 .. W5` 固定为唯一 canonical witness roster
  - row-heavy hard gate 固定覆盖 `reorder / replace / byRowId / active exit`
  - negative proof 固定为 `noLiveHead / noContribution / staleRef / reasonSlotMustNotLink`
  - compare hook 固定跑到已冻结 `TRACE-S5` pipeline
  - benchmark handoff 只冻结 execution whitelist 与 `invalidationReason[]`
  - benchmark 仍不拥有 perf truth
- non_goals:
  - 冻结 benchmark budget / profile
  - 冻结 exact internal type shape
  - 开始实现代码

## Consensus

- reviewers: `A1/A2/A3`
- adopted_candidate: `TRACE-I1 implementation witness execution law`
- final_status: `consensus reached`
- stop_rule_satisfied: `true`
- residual_risk:
  - benchmark evidence 仍待下游冻结
  - 实际代码实现与 benchmark run 仍待实现期验证
