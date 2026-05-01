# Form Kernel Upgrade Review Ledger

## Meta

- target: `docs/ssot/form/07-kernel-upgrade-opportunities.md`
- source_kind: `file-plan`
- reviewer_count: `4`
- reviewer_model: `gpt-5.4`
- reviewer_reasoning: `xhigh`
- challenge_scope: `open`
- consensus_status: `closed`

## Bootstrap

- target_complete: `anchor=docs/ssot/form/07-kernel-upgrade-opportunities.md; bound surface=docs/ssot/form/00-north-star.md, docs/ssot/form/02-gap-map-and-target-direction.md, docs/ssot/form/03-kernel-form-host-split.md, docs/ssot/form/04-convergence-direction.md, docs/ssot/form/05-public-api-families.md, docs/ssot/form/06-capability-scenario-api-support-map.md, docs/ssot/form/07-kernel-upgrade-opportunities.md, docs/ssot/runtime/06-form-field-kernel-boundary.md`
- challenge_scope: `open`
- reviewer_set: `A1, A2, A3, A4`
- active_advisors: `A4`
- activation_reason: `目标涉及 kernel 可升级位、API 反推约束、长期治理与 breaking design window，需要目标函数挑战`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan, Kolmogorov, Godel`
- dominance_axes: `concept-count, public-surface, compat-budget, migration-cost, proof-strength, future-headroom`
- stop_rule:
  - `Ramanujan gate`: 至少压掉一个 assumption、一个 public boundary、或一段重复 contract
  - `Kolmogorov gate`: `concept-count / public-surface / compat-budget` 不整体变差；若核心轴不变，必须在 `proof-strength` 或 `future-headroom` 上形成严格改进
  - `Godel gate`: 不得引入第二套 authority、第二套 workflow、第二套 contract、或未闭合矛盾
- reopen_bar: `只有当 adopted candidate 在 dominance axes 上被更优方案直接支配，且通过三重 gate，才允许 reopen`
- ledger_path: `docs/review-plan/runs/2026-04-15-form-kernel-upgrade-review.md`
- writable: `true`
- edit_policy: `allow-edit-target-and-bound-surface`
- residual_only: `false`

## Assumptions

- A1:
  - summary: `这轮允许直接挑战既有 kernel 设计，只要它能让 form lane、public API 与 verification-feed 更一致`
  - status: `kept`
  - resolution_basis: `reviewers 一致接受 open scope，可直接推翻既有 kernel 候选`
- A2:
  - summary: `K1~K5` 是当前最小但足够完整的 kernel upgrade 候选集`
  - status: `overturned`
  - resolution_basis: `A1/A3 明确指出 K1~K5 过度拆分且 K5 越界，存在更小 grammar`
- A3:
  - summary: `07-kernel-upgrade-opportunities.md` 足以作为 kernel upgrade 的主锚点`
  - status: `kept`
  - resolution_basis: `在改写为 frozen grammar contract、closure matrix 与 excluded contracts 后，07 继续保留为主锚点`
- A4:
  - summary: `Tier 1 / Tier 2` 的当前优先级切法是正确的`
  - status: `overturned`
  - resolution_basis: `A1/A3 均指出 Tier 切法与既有 DAG 冲突，应移除`
- A5:
  - summary: `kernel upgrade` 继续只作为 enabling constraint，而不反向长成第二条 roadmap`
  - status: `kept`
  - resolution_basis: `adopted candidate 改写后只保留 frozen grammar contract，不再维护第二条 roadmap`

## Round 1

### Phase

- `challenge`

### Input Residual

- none

### Findings

- F1 `critical` `invalidity`:
  - summary: `K5 submit verdict kernel contract` 越界，把 Form 自己拥有的 derived contract 拉回 kernel
  - evidence: A1/A3 都指出 submit/decode/verdict 不该进入 kernel authority
  - status: `merged`
- F2 `high` `invalidity`:
  - summary: `K1~K5` 过度拆分，`K1/K2` 与 `K3/K4` 的抽象层级混杂，没有形成最小 kernel grammar
  - evidence: A1/A3 都要求把现有清单压成更小的 authority 轴
  - status: `merged`
- F3 `high` `ambiguity`:
  - summary: `Tier 1 / Tier 2` 切法与既有 dependency DAG 冲突
  - evidence: A1/A3 都指出 tier 写法会制造第二条 priority roadmap
  - status: `merged`
- F4 `medium` `ambiguity`:
  - summary: 07 当前只有候选清单与优先级，没有 witness / proof gap / freeze gate 约束，不足以单独做主锚点
  - evidence: A1/A3 都要求把 07 改成 authority 轴 + reverse matrix / proof gap 结构
  - status: `merged`

### Counter Proposals

- P1:
  - summary: 最小修补。保留 `K1~K5`，只删 `K5`
  - why_better: 改动面更小
  - overturns_assumptions: `A2`
  - resolves_findings: `F1`
  - supersedes_proposals:
  - dominance: `partial`
  - axis_scores:
    - concept-count: `partial`
    - public-surface: `same`
    - compat-budget: `same`
    - migration-cost: `better`
    - proof-strength: `partial`
    - future-headroom: `partial`
  - status: `rejected`
- P2:
  - summary: 三条 kernel authority 轴。把 07 压成 `ownership / remap canonicality`、`task / stale canonicality`、`reason / evidence canonicality`
  - why_better: 直接复用现有 grammar 与 boundary authority，消掉 `K1~K5 + Tier`
  - overturns_assumptions: `A2, A4`
  - resolves_findings: `F1, F2, F3`
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
- P3:
  - summary: 在 07 中新增 reverse matrix、excluded contracts、verification proof 约束
  - why_better: 让 07 真正有资格成为 kernel upgrade 主锚点
  - overturns_assumptions: `A3`
  - resolves_findings: `F4`
  - supersedes_proposals:
  - dominance: `dominates`
  - axis_scores:
    - concept-count: `better`
    - public-surface: `same`
    - compat-budget: `same`
    - migration-cost: `same`
    - proof-strength: `better`
    - future-headroom: `better`
  - status: `adopted`

### Resolution Delta

- `A2` -> `overturned`
- `A4` -> `overturned`
- `07-kernel-upgrade-opportunities.md` 已按 `SYN-6` 重写

## Adoption

- adopted_candidate: `SYN-6 two kernels plus evidence envelope`
- lineage: `P2 + P3`
- rejected_alternatives: `P1`
- rejection_reason: `只删 K5 仍会保留 K1~K5 + Tier 这层第二 taxonomy，不足以通过压缩门`
- dominance_verdict: `SYN-6 在 concept-count, proof-strength, future-headroom 上对 baseline 形成严格改进，并通过 Ramanujan / Kolmogorov / Godel 三重 gate`

### Freeze Record

- adopted_summary: `07 仅保留 participation-delta kernel、settlement-task kernel 与 shared canonical evidence envelope 的 frozen grammar contract；submit/decode/verdict/projection contract 继续归 Form`
- kernel_verdict: `通过。新方案压掉了 K1~K5 + Tier 的第二 taxonomy，把越界的 submit verdict 从 kernel 中移出，并把 evidence 收回 shared output law`
- frozen_decisions:
  - kernel primitive grammar 只保留 `participation-delta kernel` 与 `settlement-task kernel`
  - `canonical evidence envelope` 只作为 shared output law，不作为第三个 admission class
  - kernel 不拥有 decoded payload、submit verdict、submit callback contract、$form summary、path explain、public verification helper
  - `07` 继续作为 form-facing kernel grammar 主锚点，但只承接 frozen grammar、closure matrix、excluded contracts 与 reopen gate
  - kernel discussion 继续只作为 enabling constraint，不形成第二条 roadmap
- non_goals:
  - 本轮不冻结 internal naming
  - 本轮不启动实现
  - 本轮不把 kernel 变成 public API owner
- allowed_reopen_surface:
  - 两个 primitive kernel 是否还能继续压缩
  - shared evidence law 是否还能继续变薄
  - 是否仍存在越界的 Form-owned contract
  - closure matrix 或 excluded contracts 是否仍有遗漏
- proof_obligations:
  - future kernel 候选必须先归入 `participation-delta kernel` 或 `settlement-task kernel`
  - `canonical evidence envelope` 只能作为 shared output law，不得重新升格为独立 primitive
  - downstream 不能重新发明 `K*` taxonomy
  - verification-feed 继续只从 canonical evidence 出发
  - submit / decode / verdict / projection contract 继续留在 Form
- delta_from_previous_round: `从 K1~K5 候选清单，压缩到两个 primitive kernel + shared evidence law`

## Round 2

### Phase

- `converge`

### Input Residual

- `SYN-6` 是否已满足更小 kernel grammar 的 freeze 要求

### Findings

- F5 `medium` `ambiguity`:
  - summary: `canonical evidence envelope` 还被写成第三个 admission class
  - evidence: reviewer A2 converge 指出它应继续收回 shared output law
  - status: `closed`

### Counter Proposals

- P4:
  - summary: 把 `canonical evidence envelope` 从 admission class 收回 shared output law
  - why_better: 让 `SYN-6` 真正保持 two kernels
  - overturns_assumptions:
  - resolves_findings: `F5`
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

- `F5` -> `closed`
- `P4` -> `adopted`
- `07-kernel-upgrade-opportunities.md` 已把 evidence envelope 收回 shared output law

## Round 3

### Phase

- `converge`

### Input Residual

- `07` 是否还保留 live planning anchor

### Findings

- F6 `medium` `ambiguity`:
  - summary: `07` 的页面角色与 freeze record 仍残留 `upgrade / proof gap / planning anchor` 语气
  - evidence: closure review 指出 07 与 README 仍会把 frozen grammar contract 误读成 live kernel planning queue
  - status: `closed`

### Counter Proposals

- P5:
  - summary: 把 `07` 收成 pure frozen grammar contract，并把 README 与 freeze record 一起改成 closure wording
  - why_better: 消掉 form SSoT 内最后一个 live kernel planning anchor
  - overturns_assumptions:
  - resolves_findings: `F6`
  - supersedes_proposals:
  - dominance: `dominates`
  - axis_scores:
    - concept-count: `better`
    - public-surface: `better`
    - compat-budget: `same`
    - migration-cost: `same`
    - proof-strength: `better`
    - future-headroom: `better`
  - status: `adopted`

### Resolution Delta

- `F6` -> `closed`
- `P5` -> `adopted`
- `07` 与 `README` 已统一改成 frozen grammar contract 口径

## Consensus

- reviewers: `A1, A2, A3, A4`
- adopted_candidate: `SYN-6 two primitive kernels with shared evidence law`
- final_status: `closed`
- stop_rule_satisfied: `true`
- residual_risk:
  - 若 implementation plan 把 `canonical evidence envelope` 重新展开成独立 primitive 或 wave，需要立即 reopen
  - submit / decode / verdict / projection contract 只要再次下沉进 kernel，就必须回到 SSoT review
