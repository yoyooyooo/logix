# Form SSoT Surface Review Ledger

## Meta

- target: `docs/ssot/form/04-convergence-direction.md (+ bound form SSoT surface)`
- source_kind: `file-plan`
- reviewer_count: `4`
- reviewer_model: `gpt-5.4`
- reviewer_reasoning: `xhigh`
- challenge_scope: `open`
- consensus_status: `closed`

## Bootstrap

- target_complete: `anchor=docs/ssot/form/04-convergence-direction.md; bound surface=docs/ssot/form/00-north-star.md, docs/ssot/form/01-current-capability-map.md, docs/ssot/form/02-gap-map-and-target-direction.md, docs/ssot/form/03-kernel-form-host-split.md, docs/ssot/form/04-convergence-direction.md, docs/ssot/runtime/06-form-field-kernel-boundary.md`
- challenge_scope: `open`
- reviewer_set: `A1, A2, A3, A4`
- active_advisors: `A4`
- activation_reason: `目标涉及 form 北极星、public contract、owner split、长期治理与实现前的单点事实源，需要目标函数挑战`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan, Kolmogorov, Godel`
- dominance_axes: `concept-count, public-surface, compat-budget, migration-cost, proof-strength, future-headroom`
- stop_rule:
  - `Ramanujan gate`: 至少压掉一个 assumption、一个 public boundary、或一段重复 contract
  - `Kolmogorov gate`: `concept-count / public-surface / compat-budget` 不整体变差；若核心轴不变，必须在 `proof-strength` 或 `future-headroom` 上形成严格改进
  - `Godel gate`: 不得引入第二套 authority、第二套 workflow、第二套 contract、或未闭合矛盾
- reopen_bar: `只有当 adopted candidate 在 dominance axes 上被更优方案直接支配，且通过三重 gate，才允许 reopen`
- ledger_path: `docs/review-plan/runs/2026-04-15-form-ssot-surface-review.md`
- writable: `true`
- edit_policy: `allow-edit-target-and-bound-surface`
- residual_only: `false`

## Assumptions

- A1:
  - summary: `form 相关 SSoT，而不是 implementation plan，是当前语义裁决的唯一主对象`
  - status: `kept`
  - resolution_basis: `四位 reviewer 均未挑战该前提；adopted candidate 继续把 implementation plan 降为 DAG 的下游展开`
- A2:
  - summary: `00/01/02/03/04 + runtime/06` 是当前最小但足够完整的 form review surface`
  - status: `deferred`
  - resolution_basis: `完整性被保留；最小性被 reviewer A2 质疑，但本轮未走 full matrix 路线，后续若要继续压缩文档 topology 再 reopen`
- A3:
  - summary: `04` 仍是高层方向锚点，但可以被 review 结果压缩、改写，且能牵动其他绑定页一起修订
  - status: `kept`
  - resolution_basis: `本轮 adopted candidate 已把 04 压成 thin page，并同时改写 00/02/03/06`
- A4:
  - summary: `implementation plan 只是已冻结 SSoT 的下游展开，不承担语义本体裁决`
  - status: `kept`
  - resolution_basis: `A1/A3 converge 后均确认 04 不再承接独立切波 authority`
- A5:
  - summary: `scope=open` 允许挑战既有任一点，包括北极星、现状判断、真缺口、owner split、boundary 与 convergence`
  - status: `kept`
  - resolution_basis: `本轮实际改写了 00/01/02/03/04/06 的多个既有点，scope=open 生效`

## Round 1

### Phase

- `challenge`

### Input Residual

- none

### Findings

- F1 `critical` `invalidity`:
  - summary: form SSoT 存在 cross-page authority 分叉，root grammar 在 `00/02/03/04/06` 之间重复冻结
  - evidence: reviewer A1/A2/A3 均指出根分解 grammar、owner、wave/plan authority、boundary 叙述存在双轨
  - status: `merged`
- F2 `high` `invalidity`:
  - summary: `reason / evidence / blocking` 没有单点 authority，被拆进 `$form`、submit gate、path explain、trial feed 多处冻结
  - evidence: reviewer A3/A4 都把这点视为 Godel gate 风险
  - status: `merged`
- F3 `high` `ambiguity`:
  - summary: `04` 作为高层方向页，仍长成半个 implementation plan，排序 authority 过重
  - evidence: reviewer A2/A3 都要求把 `04` 收成 thin page / dependency DAG
  - status: `merged`
- F4 `high` `controversy`:
  - summary: `$form` 被抬成核心 control plane 目标，和最小 verdict summary、verification authority 混线
  - evidence: reviewer A4 明确要求把 `$form` 降成最小 verdict summary；A1 也要求它不再作为独立根对象
  - status: `merged`
- F5 `medium` `ambiguity`:
  - summary: `03` 与 `runtime/06` 之间仍有 owner / public boundary 的双读双改风险
  - evidence: reviewer A2 要求二者合并或正交化；A3 也要求在 `04` 用 internal invariant checklist 守住 boundary
  - status: `merged`
- F6 `medium` `ambiguity`:
  - summary: 公开面压缩已经写成硬门，但缺少可执行的 surface budget
  - evidence: reviewer A4 明确要求给 root namespace、commands、react 子路径建立显式 budget
  - status: `merged`

### Counter Proposals

- P1:
  - summary: full matrix。把 `00 + 01 + 02 + 04` 压成一份 canonical contract matrix
  - why_better: 极限压缩 cross-page authority
  - overturns_assumptions: `A2`
  - resolves_findings: `F1, F3`
  - supersedes_proposals:
  - dominance: `partial`
  - axis_scores:
    - concept-count: `better`
    - public-surface: `better`
    - compat-budget: `better`
    - migration-cost: `worse`
    - proof-strength: `better`
    - future-headroom: `better`
  - status: `rejected`
- P2:
  - summary: two semantic lanes + one reason contract
  - why_better: 把 `6 gaps -> 4 bundles` 压成单一 grammar，且保留足够清晰的 owner split
  - overturns_assumptions: `A2`
  - resolves_findings: `F1, F2, F4`
  - supersedes_proposals:
  - dominance: `dominates`
  - axis_scores:
    - concept-count: `better`
    - public-surface: `better`
    - compat-budget: `same`
    - migration-cost: `better`
    - proof-strength: `better`
    - future-headroom: `better`
  - status: `adopted`
- P3:
  - summary: thin 04。把 `04` 收成 `invariants + dependency DAG + freeze gate`
  - why_better: 消掉 direction doc 和 implementation plan 的排序 authority 竞争
  - overturns_assumptions: `A3`
  - resolves_findings: `F3`
  - supersedes_proposals:
  - dominance: `dominates`
  - axis_scores:
    - concept-count: `better`
    - public-surface: `better`
    - compat-budget: `same`
    - migration-cost: `better`
    - proof-strength: `better`
    - future-headroom: `same`
  - status: `adopted`
- P4:
  - summary: `$form` 降成最小 verdict summary
  - why_better: 删除 form 内部第二控制面错读，统一回到 `reason contract`
  - overturns_assumptions: `A2`
  - resolves_findings: `F2, F4`
  - supersedes_proposals:
  - dominance: `dominates`
  - axis_scores:
    - concept-count: `better`
    - public-surface: `better`
    - compat-budget: `better`
    - migration-cost: `same`
    - proof-strength: `better`
    - future-headroom: `better`
  - status: `adopted`
- P5:
  - summary: `03` 只做 semantic owner，`06` 只做 package/public boundary，并补 surface budget
  - why_better: 把 owner split 和 package boundary 正交化，减少双读双改
  - overturns_assumptions:
  - resolves_findings: `F5, F6`
  - supersedes_proposals:
  - dominance: `dominates`
  - axis_scores:
    - concept-count: `better`
    - public-surface: `better`
    - compat-budget: `better`
    - migration-cost: `better`
    - proof-strength: `better`
    - future-headroom: `better`
  - status: `adopted`

### Resolution Delta

- `A2` -> `overturned`
- `04` anchor 被保留，但已失去独立排序 authority
- `00/01/02/03/04/06` 已按 `SYN-2` 回写

## Adoption

- adopted_candidate: `SYN-2 lane-based form contract surface`
- lineage: `P2 + P3 + P4 + P5`
- rejected_alternatives: `P1`
- rejection_reason: `full matrix 压缩更极端，但当前迁移成本和文档改写面过大；SYN-2 已能在不增加 surface 的前提下压掉双轨 grammar 与 plan authority`
- dominance_verdict: `SYN-2 在 concept-count, public-surface, proof-strength 上对当前 baseline 形成严格改进，并通过 Ramanujan / Kolmogorov / Godel 三重 gate`

### Freeze Record

- adopted_summary: `form SSoT 统一按 active-shape lane / settlement lane / reason contract 三件事冻结；$form 降为最小 verdict summary；04 只保留 invariants + dependency DAG + freeze gate；03/06 正交化`
- kernel_verdict: `通过。新方案压掉了双轨 grammar、reason authority 分裂与 04 的半计划化排序权，同时保留了足够清晰的 owner split`
- frozen_decisions:
  - canonical grammar 固定为 `active-shape lane / settlement lane / reason contract`
  - `decoded payload` 仅作为 submit-lane output，不进入第五状态树
  - `$form` 只保留最小 verdict summary
  - `04` 不再固定 wave，只冻结 invariants、dependency DAG、freeze gate
  - `03` 只承接 semantic owner
  - `06` 只承接 package/public surface 与 lowering boundary
  - public surface budget 固定为 `root namespace / commands family / @logixjs/form/react`
  - active set 决定 validation、blocking、explain universe
- non_goals:
  - 本轮不启动 implementation plan
  - 不把 full matrix 作为当前 adopted 文档形态
  - 不把 host sugar 拉回主缺口
- allowed_reopen_surface:
  - canonical grammar 是否还能继续压缩
  - `reason contract` 是否仍存在多点 authority
  - public surface budget 是否仍有漏口
  - `03/06` 正交化是否仍不彻底
- proof_obligations:
  - downstream implementation plan 只能展开 DAG，不得改写 grammar
  - reason / evidence / blocking 必须继续保持单点 authority
  - `$form` 不得重新膨胀成第二控制面
  - host sugar 新增必须走 surface budget/reopen
- delta_from_previous_round: `从单页 04 的 contract-first thin page，升级到整组 form SSoT 的 lane-based contract surface`

## Round 2

### Phase

- `converge`

### Input Residual

- `SYN-2` 是否已满足 freeze record
- 是否仍存在能直接支配 `SYN-2` 的更小方案

### Findings

- F7 `medium` `ambiguity`:
  - summary: `04` 仍残留旧 wave authority 与旧排序总结
  - evidence: A1 converge 指出 `Wave A` 与结尾旧排序口径未完全删净
  - status: `closed`

### Counter Proposals

- P6:
  - summary: 删除 `04` 中 residual wave wording，只保留纯 DAG 口径
  - why_better: 让 `04` 完全对齐 thin-page freeze record
  - overturns_assumptions:
  - resolves_findings: `F7`
  - supersedes_proposals:
  - dominance: `dominates`
  - axis_scores:
    - concept-count: `better`
    - public-surface: `same`
    - compat-budget: `same`
    - migration-cost: `same`
    - proof-strength: `better`
    - future-headroom: `same`
  - status: `adopted`

### Resolution Delta

- `F7` -> `closed`
- `P6` -> `adopted`
- `04-convergence-direction.md` 已去掉 residual wave authority

## Round 3

### Phase

- `converge`

### Input Residual

- none

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- all residual findings `closed`
- all reviewers returned `无 unresolved findings`

## Consensus

- reviewers: `A1, A2, A3, A4`
- adopted_candidate: `SYN-2 lane-based form contract surface`
- final_status: `closed`
- stop_rule_satisfied: `true`
- residual_risk:
  - `verification-feed` 的“每个实施阶段”表述，后续 implementation plan 不能重新抬成第二排序 authority
  - `03/06` 的正交化若后续又长出重复 prose，需要按 reopen bar 回到 SSoT review
  - 若后续还要继续压缩 docs topology，`A2` 保留的 full matrix 路线属于可重开但当前未采纳的更激进方案
