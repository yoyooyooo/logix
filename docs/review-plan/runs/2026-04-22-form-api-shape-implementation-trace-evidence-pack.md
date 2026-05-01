# Implementation Trace Evidence Pack Review Ledger

## Meta

- target: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/155-form-api-shape/challenge-implementation-trace-evidence-pack.md`
- source_kind: `file-spec`
- reviewers: `A1/A2/A3`
- round_count: `2`
- challenge_scope: `frozen`
- consensus_status: `consensus`

## Bootstrap

- target_complete: `true`
- challenge_scope: `frozen`
- reviewer_set: `A1/A2/A3`
- active_advisors: `Turing / von Neumann`
- activation_reason: `contract layer 已冻结到 TRACE-S5，当前要把 implementation gap 拆成顺序 residual chain`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan / Kolmogorov / Godel`
- dominance_axes: `concept-count / public-surface / compat-budget / migration-cost / proof-strength / future-headroom`
- stop_rule: `只有形成 split verdict 或明确 no-better verdict，本轮才算完成`
- reopen_bar: `不得重开 AC3.3 public contract、S1/S2/C003 law、TRACE-S1..S5；本轮只裁决 implementation phase parent challenge 是否需要 split`
- ledger_path: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-22-form-api-shape-implementation-trace-evidence-pack.md`
- writable: `true`

## Assumptions

- A1:
  - summary: contract ambiguity 已基本出清，当前剩余问题落在 implementation proof
  - status: `kept`
  - resolution_basis: `TRACE-S1 .. TRACE-S5` 已冻结
- A2:
  - summary: benchmark 只能复用 execution carrier，不应先于 executable witness gate
  - status: `kept`
  - resolution_basis: verification control plane 与 `TRACE-S4` 已冻结 reuse 边界
- A3:
  - summary: implementation phase parent challenge 可以退回 umbrella router
  - status: `kept`
  - resolution_basis: 当前父页已经跨 execution、correctness、perf 三层

## Round 1

### Phase

- challenge

### Input Residual

- residual: implementation trace evidence design for AC3.3

### Findings

- F1 `critical` `invalidity`:
  - summary: 当前缺少可执行 scenario substrate，witness pack 还无法进入 runtime control plane
  - evidence: `A1/A4` 交集
  - status: `adopted`
- F2 `critical` `invalidity`:
  - summary: 当前缺少 canonical `runtime.compare` 与三 digest 主轴，witness 还无法形成回归 gate
  - evidence: `A4` 主导，`A1` 支持
  - status: `adopted`
- F3 `high` `ambiguity`:
  - summary: row-heavy 轴还缺 `byRowId after reorder` 这一类 projection theorem witness，现 pack 只能算半闭合
  - evidence: `A3`
  - status: `adopted`
- F4 `high` `ambiguity`:
  - summary: `causal-links` 还没有 canonical summary law，`evidenceSummaryDigest` 与 `focusRef` 还不稳定
  - evidence: `A1/A4` 交集
  - status: `adopted`
- F5 `medium` `ambiguity`:
  - summary: compare 还缺 terminal/stale negative assertion atoms，无法证明 clear/retire/cleanup 后旧 truth 已退出
  - evidence: `A2`
  - status: `adopted`

### Counter Proposals

- P1:
  - summary: `not-ready until scenario/compare/evidence substrate exists`
  - why_better: 直接把当前阻塞点从 API/law 问题切换为 runtime substrate 问题
  - overturns_assumptions: `none`
  - resolves_findings: `F1 F2 F3 F4 F5`
  - supersedes_proposals: `none`
  - dominance: `dominates`
  - axis_scores: `concept-count +1 / public-surface +1 / compat-budget +1 / migration-cost +1 / proof-strength +2 / future-headroom +2`
  - status: `adopted`

### Resolution Delta

- `F1 F2 F3 F4 F5 -> adopted`
- `P1 -> adopted as not-ready verdict`

## Round 2

### Phase

- split

### Input Residual

- residual: contract layer 已冻结到 TRACE-S5 后，implementation phase parent challenge 是否应继续单页推进

### Findings

- F6 `high` `ambiguity`:
  - summary: 当前父页仍同时承接 witness pack 设计、execution route、benchmark evidence，已经跨三层产物
  - status: `adopted`
- F7 `high` `ambiguity`:
  - summary: 当前 active gap 应按 `implementation witness execution -> benchmark evidence` 排成顺序 residual chain
  - status: `adopted`

### Counter Proposals

- P2:
  - summary: `implementation trace evidence pack downgraded to umbrella router`
  - why_better: 保留单一 implementation 主链，同时把 execution proof 与 perf evidence 分开，不再让父页持有 live 设计问答
  - dominance: `dominates`
  - status: `adopted`

### Resolution Delta

- `F6 F7 -> adopted`
- `P2 -> adopted as implementation-phase split verdict`

## Adoption

- adopted_candidate: `implementation trace evidence pack split verdict`
- lineage: `trace evidence pack not-ready -> implementation-phase split`
- rejected_alternatives:
  - benchmark-first
  - keep-single-page
- rejection_reason: `前者缺 truth 基底，后者会继续把 execution 与 perf 堆在同一 success bar`
- dominance_verdict: `split-now is the strongest route`

### Freeze Record

- adopted_summary: `challenge-implementation-trace-evidence-pack.md` 退回 umbrella router；active residual 固定为 implementation witness execution；next residual 固定为 benchmark evidence`
- kernel_verdict: `通过 Ramanujan / Kolmogorov / Godel gate；先把 implementation 主链排成顺序 residual，再继续往下压`
- frozen_decisions:
  - parent challenge 不再承接 witness roster、benchmark gate 细节
  - active residual 固定为 `challenge-runtime-scenario-proof-execution.md`
  - next residual 固定为 `challenge-runtime-benchmark-evidence.md`
  - benchmark 只允许复用 execution carrier，不拥有 perf truth
- non_goals:
  - 现在就冻结 executable witness gate
  - 现在就冻结 benchmark budget / profile

## Consensus

- reviewers: `A1/A2/A3`
- adopted_candidate: `implementation trace evidence pack split verdict`
- final_status: `consensus reached`
- stop_rule_satisfied: `true`
- residual_risk:
  - executable witness gate 仍待进入正式 challenge round
  - benchmark evidence 仍待下游 round 裁决
