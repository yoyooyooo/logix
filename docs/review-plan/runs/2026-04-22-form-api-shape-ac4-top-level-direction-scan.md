# AC4 Top-Level Direction Scan Review Ledger

## Meta

- target: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/155-form-api-shape/challenge-ac4-top-level-direction-scan.md`
- source_kind: `file-spec`
- reviewers: `A1/A2/A3/A4/A5`
- round_count: `2`
- challenge_scope: `open`
- consensus_status: `consensus`

## Bootstrap

- target_complete: `true`
- challenge_scope: `open`
- reviewer_set: `A1/A2/A3/A4/A5`
- active_advisors: `Feynman / Hamming`
- activation_reason: `本轮目标是顶层候选发散，需要 public contract 可理解性与目标函数重要性排序`
- max_reviewer_count: `5`
- kernel_council: `Ramanujan / Kolmogorov / Godel`
- dominance_axes: `concept-count / public-surface / compat-budget / migration-cost / proof-strength / future-headroom`
- stop_rule: `只有给出完整 AC4 顶层候选，并通过 strict-dominance bar，才允许替换 AC3.3 主线`
- reopen_bar: `不得复活已拒绝方向；不得只用局部 ergonomics / spelling / helper 便利性挑战 AC3.3`
- ledger_path: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-22-form-api-shape-ac4-top-level-direction-scan.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `AC3.3` 仍是当前主候选，但本轮允许顶层发散
  - status: `kept`
  - resolution_basis: 用户明确要求寻找一批 `AC*` 新顶层候选
- A2:
  - summary: `S1 / S2 / C003` 冻结出的 law 应作为所有 AC4 候选的复用约束
  - status: `kept`
  - resolution_basis: 这些 law 多数跨顶层方向可复用
- A3:
  - summary: 新候选不能只改名，必须给完整 contract sketch
  - status: `kept`
  - resolution_basis: strict-dominance 需要可比较 public contract
- A4:
  - summary: rejected directions 不能换名复活
  - status: `kept`
  - resolution_basis: `155/spec.md` 已稳定拒绝这些方向

## Round 1

### Phase

- challenge

### Input Residual

- residual: does any new AC4 top-level direction strictly dominate AC3.3

### Findings

- F1 `critical` `ambiguity`:
  - summary: diagnostics / read-route / owner-scope 视角都能产出新顶层 challenger，但当前都还没有形成对 `AC3.3` 的 strict dominance
  - evidence: `A1/A2/A3/A4/A5` 交集
  - status: `adopted`
- F2 `high` `controversy`:
  - summary: 最像样的新方向主要有三条：field-fact-lane、field capability block、no-public-companion-program-lowered
  - evidence: `A1/A2/A3/A4/A5` 合成
  - status: `adopted`
- F3 `high` `ambiguity`:
  - summary: 新方向的共同风险都在于 owner law 会变松、guardrail 会变弱、或者 internal second-system 风险上升
  - evidence: `A1/A2/A3/A4/A5` 合成
  - status: `adopted`

### Counter Proposals

- P1:
  - summary: `AC4.1 field-fact-lane`
  - why_better: 让 authoring / read / diagnostics 都围绕 field-local facts 对齐
  - overturns_assumptions: `none`
  - resolves_findings: `F2`
  - supersedes_proposals: `none`
  - dominance: `partial`
  - axis_scores: `concept-count +0 / public-surface +0 / compat-budget +0 / migration-cost +0 / proof-strength +1 / future-headroom +1`
  - status: `parked`
- P2:
  - summary: `AC4.2 field capability block`
  - why_better: 把 source/companion/rule 收到同一 field attachment unit
  - overturns_assumptions: `none`
  - resolves_findings: `F2`
  - supersedes_proposals: `none`
  - dominance: `partial`
  - axis_scores: `concept-count +0 / public-surface +0 / compat-budget +0 / migration-cost +0 / proof-strength +0 / future-headroom +1`
  - status: `parked`
- P3:
  - summary: `AC4.3 no-public-companion-program-lowered`
  - why_better: public-surface 最小，直接对齐现有 exact authority 方向
  - overturns_assumptions: `none`
  - resolves_findings: `F2`
  - supersedes_proposals: `none`
  - dominance: `partial`
  - axis_scores: `concept-count +1 / public-surface +1 / compat-budget +0 / migration-cost +0 / proof-strength +1 / future-headroom +0`
  - status: `parked`
- P4:
  - summary: `AC4.2 policy-slice / AC4.2 owner-view-lane / AC4.2 capability object / AC4.2 host-adjunct-derived-affordance`
  - why_better: 各自试图从 settlement、projection、bag object、host 派生挑战 AC3.3
  - overturns_assumptions: `none`
  - resolves_findings: `none`
  - supersedes_proposals: `none`
  - dominance: `none`
  - axis_scores: `concept-count -1 / public-surface -1 / compat-budget 0 / migration-cost 0 / proof-strength -1 / future-headroom -1`
  - status: `rejected`

### Resolution Delta

- `F1 F2 F3 -> adopted`
- `AC3.3 remains active candidate`
- `AC4.1 / AC4.2 / AC4.3 -> parked challengers`
- `policy-slice / owner-view-lane / capability-object / host-adjunct-derived-affordance -> rejected`

## Adoption

- adopted_candidate: `AC3.3 remains active candidate after AC4 scan`
- lineage:
  - `AC3.3 companion-residual-closed`
  - `AC4.1 field-fact-lane`
  - `AC4.2 field capability block`
  - `AC4.3 no-public-companion-program-lowered`
- rejected_alternatives:
  - `AC4.2 policy-slice`
  - `AC4.2 owner-view-lane`
  - `AC4.2 capability object`
  - `AC4.2 host-adjunct-derived-affordance`
- rejection_reason: `要么越权侵蚀 owner split，要么增大 second-system 风险，要么 strict-dominance 证据不足`
- dominance_verdict: `AC4 scan did not yet produce a strictly better main candidate`

### Freeze Record

- adopted_summary: `AC4 扫描完成，当前没有严格支配 AC3.3 的顶层方向；保留三条停车候选供后续独立压测`
- kernel_verdict: `通过 Ramanujan / Kolmogorov / Godel gate；保留发散结果，但不提前替换主线`
- frozen_decisions:
  - `AC3.3` 继续作为 active candidate
  - `AC4.1 field-fact-lane` 保留为 parked challenger
  - `AC4.2 field capability block` 保留为 parked challenger
  - `AC4.3 no-public-companion-program-lowered` 保留为 parked challenger
  - 其余 AC4 方向当前拒绝
- non_goals:
  - 现在就替换 AC3.3 主线
  - 现在就把 parked challenger 升成 authority candidate
  - 用命名对齐或 DX 便利性单独推翻 AC3.3
- allowed_reopen_surface:
  - `AC4.1 field-fact-lane`
  - `AC4.2 field capability block`
  - `AC4.3 no-public-companion-program-lowered`
- proof_obligations:
  - 证明新 challenger 在 owner law / diagnostics / read-route 三线同时更强
  - 证明 parked challenger 不会放大 second-system 风险
  - 证明 parked challenger 能吸收 `S1 / S2 / C003` law 而不变松
- delta_from_previous_round:
  - from single active candidate to active candidate plus parked challengers

## Consensus

- reviewers: `A1/A2/A3/A4/A5`
- adopted_candidate: `AC3.3 remains active candidate after AC4 scan`
- final_status: `consensus reached with parked challengers`
- stop_rule_satisfied: `true`
- residual_risk:
  - parked challengers 仍可能在后续独立压测中变强
  - `field-fact-lane` 的边界过宽风险
  - `field capability block` 的 owner/attachment 混淆风险
  - `no-public-companion-program-lowered` 的 internal second-system 风险

## Round 3

### Phase

- post-pressure-update

### Input Residual

- residual: outcome after AC4.1 / AC4.3 / AC4.4 pressure tests

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- `AC4.1 field-fact-lane -> parked, downgraded after boundary pressure`
- `AC4.3 no-public-companion-program-lowered -> rejected`
- `AC4.4 field-slot-projection-lane -> rejected`
- `AC4.2 field capability block -> rejected`
- `AC3.3 remains active candidate`

## Final AC4 State

- active_candidate: `AC3.3 companion-residual-closed`
- parked_challenger:
  - `AC4.1 field-fact-lane`
- rejected_challengers:
  - `AC4.2 field capability block`
  - `AC4.3 no-public-companion-program-lowered`
  - `AC4.4 field-slot-projection-lane`
- residual_risk:
  - `AC4.1` can only reopen after proving fact boundary is no weaker than companion boundary

## Round 2

### Phase

- expansion-wave-2

### Input Residual

- residual: whether new AC4 top-level directions beyond AC4.1/2/3 deserve parking

### Findings

- F1 `high` `ambiguity`:
  - summary: wave 2 继续产出新的顶层 challenger，但都未严格支配 AC3.3
  - evidence: `A1/A2/A3/A4/A5` 合成
  - status: `adopted`
- F2 `high` `controversy`:
  - summary: 最值得保留的新方向是 projection-lane family；其余多为 patch-lane / affordance-lane / capability-shell 的变体
  - evidence: `A1/A2/A3/A4/A5` 合成
  - status: `adopted`

### Counter Proposals

- P1:
  - summary: `AC4.4 field-slot-projection-lane`
  - why_better: 比 AC4.1 更窄，且比 AC3.3 更贴近 read law 与 diagnostics language
  - overturns_assumptions: `none`
  - resolves_findings: `F2`
  - supersedes_proposals: `none`
  - dominance: `partial`
  - axis_scores: `concept-count +0 / public-surface +0 / compat-budget +0 / migration-cost +0 / proof-strength +1 / future-headroom +1`
  - status: `parked`
- P2:
  - summary: `derive-soft-lane / field-affordance-lane / field-slice-patch / field-bundle-patch-lane / field-local-capability-shell`
  - why_better: 分别从 operator、capability、verifier-first 等角度挑战 AC3.3
  - overturns_assumptions: `none`
  - resolves_findings: `none`
  - supersedes_proposals: `none`
  - dominance: `none`
  - axis_scores: `concept-count -1 / public-surface -1 / compat-budget 0 / migration-cost 0 / proof-strength +0 / future-headroom +0`
  - status: `rejected`

### Resolution Delta

- `F1 F2 -> adopted`
- `AC4.4 -> parked challenger`
- other wave 2 AC4 variants -> rejected

## Addendum

- wave2_summary: `AC4.4 field-slot-projection-lane` is the only new parked challenger from expansion wave 2
