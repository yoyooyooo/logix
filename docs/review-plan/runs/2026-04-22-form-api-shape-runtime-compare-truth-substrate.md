# Runtime Compare Truth Substrate Review Ledger

## Meta

- target: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/155-form-api-shape/challenge-runtime-compare-truth-substrate.md`
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
- activation_reason: `TRACE-S4 scenario execution carrier law 已冻结，compare truth substrate 成为 active residual`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan / Kolmogorov / Godel`
- dominance_axes: `concept-count / public-surface / compat-budget / migration-cost / proof-strength / future-headroom`
- stop_rule: `只有形成最小 compare truth contract 或明确 blocker，本轮才算完成`
- reopen_bar: `不得重开 AC3.3 public contract、S1/S2/C003 law、TRACE-S1/S2/S3；本轮只补 compare truth substrate`
- ledger_path: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-22-form-api-shape-runtime-compare-truth-substrate.md`
- writable: `true`

## Assumptions

- A1:
  - summary: 本轮只审 compare truth substrate，不修改 public API
  - status: `kept`
  - resolution_basis: TRACE parent 已明确 next residual owner
- A2:
  - summary: compare 只认 admitted stable fields，不把 raw trace 推成 truth
  - status: `kept`
  - resolution_basis: verification control plane 与 TRACE-S1/S2/S3 已冻结主轴
- A3:
  - summary: `bundlePatchRef constructor / sourceReceiptRef digest admissibility / sourceRef priority` 在本轮一并裁决
  - status: `kept`
  - resolution_basis: 这一组都属于 compare truth admission
- A4:
  - summary: 本页当前是 active residual，直接消费上游 `ScenarioCarrierEvidenceFeed`
  - status: `kept`
  - resolution_basis: `TRACE-S4` 已冻结

## Round 1

### Phase

- challenge

### Input Residual

- residual: active `compare truth substrate` 是否足够 freeze

### Findings

- F1 `high` `ambiguity`:
  - summary: 当前 brief 还没把 `runtime.compare` 的最小执行阶段写成 law
  - evidence: `A1`
  - status: `adopted`
- F2 `high` `ambiguity`:
  - summary: 当前 brief 还没把 compare 的 machine-readable result contract 写回单一 `VerificationControlPlaneReport`
  - evidence: `A1/A3`
  - status: `adopted`
- F3 `high` `ambiguity`:
  - summary: 当前 brief 还没把 `ScenarioCarrierEvidenceFeed` 的 stable admission 与 `bundlePatchRef / sourceReceiptRef / sourceRef priority` 一次收口
  - evidence: `A1/A2`
  - status: `adopted`
- F4 `medium` `ambiguity`:
  - summary: 当前 brief 还缺 `source owner conservation` 与 `no second pending/blocker/verdict system` 的显式边界句
  - evidence: `A3`
  - status: `adopted`

### Counter Proposals

- P1:
  - summary: `compare execution pipeline law`
  - why_better: 把 `stableAdmissionGate -> digestAssembly -> rowKeyJoinAndDiff -> firstProjectableSelection -> reportProjection -> drillDownLinking` 写成明确阶段序列
  - resolves_findings: `F1`
  - dominance: `dominates`
  - status: `adopted`
- P2:
  - summary: `single-report compare result contract`
  - why_better: 把 compare-specific machine-readable outputs 压回单一 `VerificationControlPlaneReport`
  - resolves_findings: `F2 F4`
  - dominance: `dominates`
  - status: `adopted`
- P3:
  - summary: `feed admission + stable source locus default exclusion law`
  - why_better: 一次收口 `ScenarioCarrierEvidenceFeed` admission、`bundlePatchRef / sourceReceiptRef` exclusion、`rowChain` 优先级
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

- residual: refined `compare truth substrate` 是否可冻结为下一条 `TRACE` law

### Findings

- none blocking

### Counter Proposals

- P4:
  - summary: `TRACE-S5 compare truth substrate law`
  - why_better: refined contract 已把 compare pipeline、single-report result contract、stable admission、stable source locus 与 control-plane 壳层一次收口
  - resolves_findings: `F1 F2 F3 F4`
  - dominance: `dominates`
  - status: `adopted`

### Resolution Delta

- `needs-refinement -> freeze-ready`
- `P4 -> adopted as TRACE-S5`

## Adoption

- adopted_candidate: `TRACE-S5 compare truth substrate law`
- lineage: `TRACE-S4 -> compare truth substrate refinement -> TRACE-S5`
- rejected_alternatives:
  - compare-local verdict grammar
  - compare-local blocker taxonomy
  - compare-local pending system
  - compare-specific second report shell
- rejection_reason: `这些方向都会长第二 control-plane truth`
- dominance_verdict: `refined compare truth law is ready`

### Freeze Record

- adopted_summary: `runtime.compare` 现已可按单一 compare truth substrate 冻结；输入只认 admitted stable fields，输出继续挂回单一 VerificationControlPlaneReport`
- kernel_verdict: `通过 Ramanujan / Kolmogorov / Godel gate；compare owner、artifact linking 与 source locus 边界已闭合`
- frozen_decisions:
  - compare pipeline 固定为 `stableAdmissionGate -> digestAssembly -> rowKeyJoinAndDiff -> firstProjectableSelection -> reportProjection -> drillDownLinking`
  - `ScenarioCarrierEvidenceFeed` 的 compare-side admission 固定为 `admitted / excluded / drill-down-only`
  - compare 主轴继续只认 `declarationDigest / witnessDigest / evidenceSummaryDigest`
  - row-heavy 下 `focusRef.sourceRef` 主锚点固定为 `rowChain:<canonicalRowIdChainDigest>`
  - `bundlePatchRef / sourceReceiptRef / derivationReceiptRef` 默认不进入 compare truth 的 key / ordering / digest / focus
  - compare 继续只回到单一 `VerificationControlPlaneReport`
  - compare-specific machine-readable outputs 只允许通过 `artifacts[] + outputKey` 暴露
  - `repairHints[].relatedArtifactOutputKeys` 只允许引用 `artifacts[]` 中的 `outputKey`
  - 一旦 `firstProjectableDiffRef` 存在，至少一个 `repairHints.focusRef` 必须绑定到它
  - `INCONCLUSIVE` gate 已闭合，当前唯一 `nextRecommendedStage = "trial"`
  - compare 不重开 public API、scenario carrier、source owner split，也不新增第二 report / blocker / pending / verdict system
- non_goals:
  - 冻结 exact internal type shape
  - 允许 `bundlePatchRef / sourceReceiptRef` 进入 compare truth
  - 开始实现 compare route code

## Consensus

- reviewers: `A1/A2/A3`
- adopted_candidate: `TRACE-S5 compare truth substrate law`
- final_status: `consensus reached`
- stop_rule_satisfied: `true`
- residual_risk:
  - actual compare route code、witness pack execution 与 benchmark evidence 仍待实现期验证
  - exact internal type shape 继续 deferred
