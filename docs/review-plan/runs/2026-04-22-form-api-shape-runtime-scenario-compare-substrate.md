# Runtime Scenario Compare Substrate Review Ledger

## Meta

- target: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/155-form-api-shape/challenge-runtime-scenario-compare-substrate.md`
- source_kind: `file-spec`
- reviewers: `A1/A2/A3`
- round_count: `1`
- challenge_scope: `frozen`
- consensus_status: `consensus`

## Bootstrap

- target_complete: `true`
- challenge_scope: `frozen`
- reviewer_set: `A1/A2/A3`
- active_advisors: `Turing / Shannon`
- activation_reason: `原始 scenario/compare parent challenge 过宽，必须先决定是否 split 再继续推进 TRACE`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan / Kolmogorov / Godel`
- dominance_axes: `concept-count / public-surface / compat-budget / migration-cost / proof-strength / future-headroom`
- stop_rule: `只有形成 split verdict 或明确 no-better verdict，本轮才算完成`
- reopen_bar: `不得重开 AC3.3 public contract、S1/S2/C003 law、TRACE-S1/S2/S3；本轮只裁决 parent challenge 是否需要 split`
- ledger_path: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-22-form-api-shape-runtime-scenario-compare-substrate.md`
- writable: `true`

## Assumptions

- A1:
  - summary: 本轮只裁决 parent challenge 的 scope 与 handoff，不修改 public API
  - status: `kept`
  - resolution_basis: 当前最直接的问题是 parent challenge 自身过宽
- A2:
  - summary: 已冻结子页必须被 parent 吸收，不能形成双重活口径
  - status: `kept`
  - resolution_basis: `TRACE-S1 / TRACE-S2 / TRACE-S3` 已经分别给出 freeze record
- A3:
  - summary: 新 split 必须保留单一 TRACE 主链，不能把 155 打散成平行系统
  - status: `kept`
  - resolution_basis: discussion/spec 继续只认一条 C-TRACE 主线

## Round 1

### Phase

- challenge

### Input Residual

- residual: 当前 `scenario + compare + evidence summary` parent challenge 是否过宽，以及下一刀该如何排序

### Findings

- F1 `critical` `invalidity`:
  - summary: parent challenge 同时承接 `scenario carrier / compare contract / evidence summary / row-heavy fixture / benchmark reuse`，发生 scope drift
  - evidence: `A1/A3` 交集
  - status: `adopted`
- F2 `high` `ambiguity`:
  - summary: `TRACE-S1 / TRACE-S2 / TRACE-S3` 已冻结，但 parent challenge 仍把对应问题保持为 live questions，形成双重活口径
  - evidence: `A1/A3` 交集
  - status: `adopted`
- F3 `high` `ambiguity`:
  - summary: 直接在 `bundlePatch-first` 与 `compare-first` 间二选一，会跳过 parent split，导致 proof ordering 继续混乱
  - evidence: `A2/A3` 交集
  - status: `adopted`

### Counter Proposals

- P1:
  - summary: `TRACE umbrella router + active scenario execution carrier + next compare truth substrate`
  - why_better: 先把 parent challenge 收成 router，再给 TRACE 建立顺序 residual chain，同时吸收两种单线方案的有效部分
  - overturns_assumptions: `none`
  - resolves_findings: `F1 F2 F3`
  - supersedes_proposals: `bundlePatch-first / compare-first as direct next cut`
  - dominance: `dominates`
  - axis_scores: `concept-count +2 / public-surface +1 / compat-budget +1 / migration-cost +1 / proof-strength +3 / future-headroom +3`
  - status: `adopted`

### Resolution Delta

- `F1 F2 F3 -> adopted`
- `P1 -> adopted as TRACE parent split verdict`

## Adoption

- adopted_candidate: `TRACE parent split verdict`
- lineage: `TRACE-S1 -> TRACE-S2 -> TRACE-S3 -> parent split`
- rejected_alternatives:
  - `bundlePatchRef constructor as direct next cut`
  - `runtime.compare execution substrate as direct next cut`
- rejection_reason: `两者都抓到了真实 residual，但都没有先解决 parent challenge 过宽与 owner 混层的问题`
- dominance_verdict: `parent split strictly dominates picking one single branch before fixing the router`

### Freeze Record

- adopted_summary: `challenge-runtime-scenario-compare-substrate.md` 退回 umbrella router；active residual 固定为 `scenario execution carrier`；next residual 固定为 `compare truth substrate`
- kernel_verdict: `通过 Ramanujan / Kolmogorov / Godel gate；先冻结单一 TRACE 主链，再继续往下切`
- frozen_decisions:
  - parent challenge 不再承载 Required Questions
  - `TRACE-S1 / TRACE-S2 / TRACE-S3` 继续作为 closed children
  - `row-heavy fixture / benchmark reuse` 并入 `scenario execution carrier`
  - `bundlePatchRef constructor / sourceReceiptRef digest admissibility / focusRef.sourceRef priority` 并入 `compare truth substrate`
- non_goals:
  - 现在就冻结 compare truth exact contract
  - 现在就冻结 bundlePatch-only constructor page
  - 现在就冻结 scenario implementation details

## Consensus

- reviewers: `A1/A2/A3`
- adopted_candidate: `TRACE parent split verdict`
- final_status: `consensus reached`
- stop_rule_satisfied: `true`
- residual_risk:
  - `scenario execution carrier` 仍待进入正式 challenge round
  - `compare truth substrate` 仍待下游 round 裁决
  - main candidate `AC3.3` 不变
