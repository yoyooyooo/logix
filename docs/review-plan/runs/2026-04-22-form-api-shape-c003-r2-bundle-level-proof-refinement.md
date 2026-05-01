# C003-R2 Bundle-Level Witness Refinement Review Ledger

## Meta

- target: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/155-form-api-shape/challenge-c003-r2-bundle-level-proof-refinement.md`
- source_kind: `file-spec`
- reviewers: `A1/A2/A3/A4`
- round_count: `2`
- challenge_scope: `frozen`
- consensus_status: `consensus`

## Bootstrap

- target_complete: `true`
- challenge_scope: `frozen`
- reviewer_set: `A1/A2/A3/A4`
- active_advisors: `von Neumann`
- activation_reason: `C003-R2 聚焦 clear/retire、row-heavy replace/reorder、bundle witness 强度与失败域`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan / Kolmogorov / Godel`
- dominance_axes: `concept-count / public-surface / compat-budget / migration-cost / proof-strength / future-headroom`
- stop_rule: `只有通过 Ramanujan / Kolmogorov / Godel gate，且在 bundle-level witness 目标函数上形成严格改进，才允许替换当前 C003-R2 基线`
- reopen_bar: `不得重开 C003.1 law、C003-R1.1 object verdict、S1 read laws、S2 owner-scope verdict；除非 reviewer 先证明 bundle-level witness 在这些冻结前提下不可成立`
- ledger_path: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-22-form-api-shape-c003-r2-bundle-level-proof-refinement.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `C003-R2` 只审 bundle-level witness refinement，不重开 object 或 law 层冻结
  - status: `kept`
  - resolution_basis: 当前 authority blocker 已收缩到 trace strength
- A2:
  - summary: bundle-level witness 必须继续停在同一 evidence envelope 内
  - status: `kept`
  - resolution_basis: 脱离 evidence envelope 就会长第二 diagnostics truth
- A3:
  - summary: clear / retire / cleanup / stale 只能作为 subordinate backlink
  - status: `kept`
  - resolution_basis: 这些对象当前都不能回到 active truth
- A4:
  - summary: 若当前还不该强化 witness，本轮也可以以 no-better verdict 收口
  - status: `kept`
  - resolution_basis: plan-optimality-loop 允许 no strictly better candidate 作为有效结论

## Round 1

### Phase

- challenge

### Input Residual

- residual: bundle-level witness refinement

### Findings

- F1 `critical` `ambiguity`:
  - summary: 当前缺口是 single live bundle head 如何建立、被 supersede、并被 clear/retire 终止
  - evidence: `A1/A2/A3/A4` 交集
  - status: `adopted`
- F2 `critical` `controversy`:
  - summary: per-slot refs 当前不该放行；在 bundle atomicity 被证伪前，单 bundle 仍是最小真相面
  - evidence: `A1/A2/A4` 交集
  - status: `adopted`
- F3 `high` `ambiguity`:
  - summary: row-scoped bundle 必须强制携带 canonicalRowIdChain，replace/hide/delete/active exit 只允许通过 retire/cleanup 终止旧链
  - evidence: `A1/A2/A3` 交集
  - status: `adopted`

### Counter Proposals

- P1:
  - summary: `C003-R2.1 single-live-bundle-head supersession law`
  - why_better: 不冻结 exact object，却把 bundle-level witness 从“有这些 refs”推进到“这些 refs 构成单链 supersession 证明”
  - overturns_assumptions: `none`
  - resolves_findings: `F1 F2 F3`
  - supersedes_proposals: `none`
  - dominance: `dominates`
  - axis_scores: `concept-count +1 / public-surface +2 / compat-budget +1 / migration-cost +1 / proof-strength +3 / future-headroom +1`
  - status: `adopted`

### Resolution Delta

- `F1 F2 F3 -> adopted`
- `P1 -> adopted as C003-R2.1`

## Adoption

- adopted_candidate: `C003-R2.1 single-live-bundle-head supersession law`
- lineage: `C003.1 -> C003-R2 -> P1`
- rejected_alternatives:
  - per-slot causal refs before bundle atomicity is falsified
  - payload-heavy diagnostics view
  - source turnover directly causing retire
- rejection_reason: `会提早拆开单一 truth，或越过 cleanup/source owner boundary`
- dominance_verdict: `current C003-R2 baseline is dominated by P1`

### Freeze Record

- adopted_summary: `当前只冻结 bundle-level witness 的 law：每个 companion bundle 任一时刻最多一个 live head；write 安装新 head，clear 安装 empty live head，retire 留下 no live head；所有 patch 都必须通过 supersession 关系与 source/derivation/row identity 机械回链`
- kernel_verdict: `通过 Ramanujan / Kolmogorov / Godel gate；在不增加第二 diagnostics 面的前提下显著提高 trace proof-strength`
- frozen_decisions:
  - diagnostics truth 继续只认同一个 evidence envelope
  - row-scoped bundle 的 `canonicalRowIdChain` 为必填
  - `write | clear | retire` patch 必须回链 `sourceReceiptRef? / derivationReceiptRef / bundlePatchRef / supersedesBundlePatchRef? / ownerRef / canonicalRowIdChain?`
  - `write` 安装新的 live head
  - `clear` supersede 当前 live head，并安装 empty live head
  - `retire` supersede 当前 live head，并留下 no live head
  - `cleanupReceiptRef` 只允许终止当前或前一 live head；不得形成继续参与读取或 blocking 的残留 truth
  - source refresh / turnover 只允许触发新的 `write` 或 `clear`；不能单独触发 `retire`
  - `reasonSlotId` 只允许指向当前 live head，或指向终止它的 `clear / retire / cleanup` backlink
  - 在 bundle atomicity 被证伪前，不发放 per-slot diagnostics refs
- non_goals:
  - 现在就冻结 exact object shape
  - 现在就冻结 per-slot causal refs
  - 现在就引入第二 diagnostics family
- allowed_reopen_surface:
  - `derivationReceiptRef` 与 `bundlePatchRef` 的 exact shape
  - split bundle / per-slot causal refs
  - sourceRef 主线分裂
- proof_obligations:
  - 证明 clear/retire/cleanup 在 row-heavy 场景下可唯一解释
  - 证明单一 live head 仍足以解释当前 state
  - 证明若 future 需要 split bundle，现 law 的 failure signal 可机械判定
- delta_from_previous_round:
  - from generic bundle witness gap to supersession law

## Round 2

### Phase

- converge

### Input Residual

- residual: exact witness shape remains deferred

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- `single-live-bundle-head supersession law -> confirmed`
- exact witness shape remains reopen surface, not unresolved finding

## Consensus

- reviewers: `A1/A2/A3/A4`
- adopted_candidate: `C003-R2.1 single-live-bundle-head supersession law`
- final_status: `consensus reached with residual risk`
- stop_rule_satisfied: `true`
- residual_risk:
  - `derivationReceiptRef` 与 `bundlePatchRef` 的 exact shape 仍需更强 witness
  - slot-level diverging patch cadence 或分离的 `sourceRef` 主线，可能要求 split bundle 或 per-slot refs
