# Runtime Scenario Execution Carrier Review Ledger

## Meta

- target: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/155-form-api-shape/challenge-runtime-scenario-execution-carrier.md`
- source_kind: `file-spec`
- reviewers: `A1/A2/A3/A4`
- round_count: `2`
- challenge_scope: `frozen`
- consensus_status: `consensus`

## Bootstrap

- target_complete: `true`
- challenge_scope: `frozen`
- reviewer_set: `A1/A2/A3/A4`
- active_advisors: `Turing / Shannon`
- activation_reason: `TRACE parent 已 split，当前先补 runtime.trial(mode=\"scenario\") execution carrier`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan / Kolmogorov / Godel`
- dominance_axes: `concept-count / public-surface / compat-budget / migration-cost / proof-strength / future-headroom`
- stop_rule: `只有形成可执行 scenario carrier contract 或明确 blocker，本轮才算完成`
- reopen_bar: `不得重开 AC3.3 public contract、S1/S2/C003 law、TRACE-S1/S2/S3；本轮只补 scenario execution carrier`
- ledger_path: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-22-form-api-shape-runtime-scenario-execution-carrier.md`
- writable: `true`

## Assumptions

- A1:
  - summary: 本轮只审 scenario execution carrier，不修改 public API
  - status: `kept`
  - resolution_basis: TRACE parent 已完成 split，当前 active residual 已单点化
- A2:
  - summary: carrier 必须直接服务 witness 生产与 benchmark 复用，不长第二 scenario authoring lane
  - status: `kept`
  - resolution_basis: verification control plane 已冻结 scenario 输入协议
- A3:
  - summary: compare truth 不在本轮重开
  - status: `kept`
  - resolution_basis: 顺序 residual chain 已固定
- A4:
  - summary: 若当前仍不足以形成 execution carrier contract，本轮可以以 blocker 收口
  - status: `kept`
  - resolution_basis: 不能用半成品 carrier 代替真实 owner contract

## Round 1

### Phase

- challenge

### Input Residual

- residual: 当前 `scenario execution carrier` brief 是否足够 freeze

### Findings

- F1 `high` `ambiguity`:
  - summary: brief 还没把 stable compiled plan 与 run-local session 分开，导致 benchmark reuse、失效条件、emit boundary 混在同一个 carrier 名下
  - evidence: `A1`
  - status: `adopted`
- F2 `high` `ambiguity`:
  - summary: carrier 缺最小 machine-readable handoff contract；它不应输出 compare-ready normalized summary，也不能只输出 raw observations
  - evidence: `A3`
  - status: `adopted`
- F3 `high` `ambiguity`:
  - summary: row-heavy identity 仍停在 success bar，尚未变成可验收 law
  - evidence: `A2`
  - status: `adopted`
- F4 `medium` `ambiguity`:
  - summary: benchmark reuse 需要限定为执行载体复用，不能被读成 carrier 持有 perf truth
  - evidence: `A2/A3`
  - status: `adopted`

### Counter Proposals

- P1:
  - summary: `ScenarioExecutionCarrier = ScenarioCompiledPlan + ScenarioRunSession`
  - why_better: 切开 stable plan 与 run-local session，使 witness owner、benchmark reuse 与 evidence emit boundary 可解释
  - resolves_findings: `F1 F4`
  - dominance: `dominates`
  - status: `adopted`
- P2:
  - summary: `ScenarioCarrierEvidenceFeed`
  - why_better: 给 scenario carrier 到 compare truth 的内部 handoff 一个最小 feed，同时禁止 carrier 输出 compare result truth
  - resolves_findings: `F2`
  - dominance: `dominates`
  - status: `adopted`
- P3:
  - summary: `FixtureIdentityTable + row-heavy acceptance law`
  - why_better: 将 row-heavy identity 从 success bar 提升为 proof failure / pass law
  - resolves_findings: `F3`
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

- residual: refined `scenario execution carrier` 是否可冻结成 `TRACE-S4`

### Findings

- none blocking

### Counter Proposals

- P4:
  - summary: `TRACE-S4 scenario execution carrier law`
  - why_better: 全量吸收 Round 1 的 stable/run-local 分层、producer feed、row-heavy identity law 与 benchmark reuse 边界
  - resolves_findings: `F1 F2 F3 F4`
  - dominance: `dominates`
  - status: `adopted`

### Resolution Delta

- `needs-refinement -> freeze-ready`
- `P4 -> adopted as TRACE-S4`

## Adoption

- adopted_candidate: `TRACE-S4 scenario execution carrier law`
- lineage: `TRACE parent split -> scenario execution carrier refinement -> TRACE-S4`
- rejected_alternatives:
  - carrier 输出 compare-ready normalized summary
  - carrier 只输出 raw observations
  - benchmark reuse 变成 perf truth owner
- rejection_reason: `这些方向会长第二 report truth、第二 compare truth 或第二 perf scene`
- dominance_verdict: `refined carrier law is ready`

### Freeze Record

- adopted_summary: `ScenarioExecutionCarrier = ScenarioCompiledPlan + ScenarioRunSession；scenario carrier 只产 ScenarioCarrierEvidenceFeed，compare truth 继续后置`
- kernel_verdict: `通过 Ramanujan / Kolmogorov / Godel gate；producer 与 compare truth 分层清楚`
- frozen_decisions:
  - runtime control plane 单独持有 scenario execution carrier
  - `ScenarioCompiledPlan` 是 stable half
  - `ScenarioRunSession` 是 run-local half，每次 trial / benchmark run 都新建
  - `sourceReceiptRef / derivationReceiptRef / bundlePatchRef` 当前属于 run session，不跨 run 复用
  - `ScenarioCarrierEvidenceFeed` 是唯一 handoff packet
  - carrier 不输出 `rowStableKey / rowComparablePayload / evidenceSummaryDigest / firstDiff / firstProjectableDiff / repairHints.focusRef / sourceRef priority`
  - row-heavy identity 主锚点为 `ownerRef + canonicalRowIdChainDigest`
  - benchmark 只复用 execution carrier，不承接 perf truth
- non_goals:
  - 冻结 compare truth contract
  - 冻结 exact internal type shape
  - 开始实现 runtime carrier

## Consensus

- reviewers: `A1/A2/A3`
- adopted_candidate: `TRACE-S4 scenario execution carrier law`
- final_status: `consensus reached`
- stop_rule_satisfied: `true`
- residual_risk:
  - `compare truth substrate` 仍未冻结
  - exact internal type shape 继续 deferred
  - implementation substrate 仍需后续代码与 benchmark 验证
