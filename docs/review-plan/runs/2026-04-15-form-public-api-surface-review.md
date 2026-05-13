# Form Public API Surface Review Ledger

## Meta

- target: `docs/ssot/form/05-public-api-families.md (+ bound API surface docs)`
- source_kind: `file-plan`
- reviewer_count: `4`
- reviewer_model: `gpt-5.4`
- reviewer_reasoning: `xhigh`
- challenge_scope: `open`
- consensus_status: `closed`

## Bootstrap

- target_complete: `anchor=docs/ssot/form/05-public-api-families.md; bound surface=docs/ssot/form/00-north-star.md, docs/ssot/form/02-gap-map-and-target-direction.md, docs/ssot/form/03-kernel-form-host-split.md, docs/ssot/form/04-convergence-direction.md, docs/ssot/form/05-public-api-families.md, docs/ssot/form/06-capability-scenario-api-support-map.md, docs/ssot/runtime/06-form-field-kernel-boundary.md`
- challenge_scope: `open`
- reviewer_set: `A1, A2, A3, A4`
- active_advisors: `A4`
- activation_reason: `目标涉及未来公开 API、场景链路、surface budget 与长期治理，需要目标函数挑战`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan, Kolmogorov, Godel`
- dominance_axes: `concept-count, public-surface, compat-budget, migration-cost, proof-strength, future-headroom`
- stop_rule:
  - `Ramanujan gate`: 至少压掉一个 assumption、一个 public boundary、或一段重复 contract
  - `Kolmogorov gate`: `concept-count / public-surface / compat-budget` 不整体变差；若核心轴不变，必须在 `proof-strength` 或 `future-headroom` 上形成严格改进
  - `Godel gate`: 不得引入第二套 authority、第二套 workflow、第二套 contract、或未闭合矛盾
- reopen_bar: `只有当 adopted candidate 在 dominance axes 上被更优方案直接支配，且通过三重 gate，才允许 reopen`
- ledger_path: `docs/review-plan/runs/2026-04-15-form-public-api-surface-review.md`
- writable: `true`
- edit_policy: `allow-edit-target-and-bound-surface`
- residual_only: `false`

## Assumptions

- A1:
  - summary: `未来公开 API 继续只允许生长在 root namespace / commands / @logixjs/form/react 三个 family 内`
  - status: `overturned`
  - resolution_basis: `adopted candidate 已收紧为 authoring route / runtime command route / react projection route`
- A2:
  - summary: `场景 -> root grammar -> API family -> kernel support -> explain/verification` 是未来 form API 设计的正确正向链路`
  - status: `overturned`
  - resolution_basis: `06 已降格为 witness / acceptance map；场景不再反向生成 public noun`
- A3:
  - summary: `05-public-api-families.md` 足以作为未来公开 API 的主锚点，`06` 作为场景链路映射辅助页
  - status: `kept`
  - resolution_basis: `05 现已成为唯一 family law；06 只做 witness，不再冻结 public noun`
- A4:
  - summary: `surface budget` 的当前三组定义已经是正确的最小公开面预算`
  - status: `overturned`
  - resolution_basis: `surface budget 已改成 authority route 口径，不再沿用旧 package bucket`
- A5:
  - summary: `公开 API 设计先走 family 收口，再讨论 operator 级清单，是当前更优顺序`
  - status: `kept`
  - resolution_basis: `05 已删除 future operator noun，operator 命名继续后置`

## Round 1

### Phase

- `challenge`

### Input Residual

- none

### Findings

- F1 `critical` `invalidity`:
  - summary: `05` 与 `06` 同时冻结 future public noun、future holes 与场景到 API 映射，形成双重 authority
  - evidence: A2/A3/A4 都指出 `05` 不能单独充当主锚，`06` 也在生成新的 public noun
  - status: `merged`
- F2 `high` `ambiguity`:
  - summary: `commands` 被定义成动作面，却继续吞入 inspect / verdict / decode 一类读面
  - evidence: A1/A3/A4 都要求把 commands 限定为 effectful runtime actions
  - status: `merged`
- F3 `high` `ambiguity`:
  - summary: 当前 family budget 混用了 package root、runtime handle、React subpath，不是同层 contract
  - evidence: A1/A2/A4 都要求把 budget 改成 authority route 或同层 contract slot
  - status: `merged`
- F4 `high` `controversy`:
  - summary: `FormView` 已公开，但在 family law 中处于漂浮状态
  - evidence: A2/A3 都指出 `FormView` 已导出、已被场景页使用，却未在 `05` 中被正式归族
  - status: `merged`
- F5 `medium` `invalidity`:
  - summary: `05` 声称先 family 再 operator，正文却提前冻结 operator inventory
  - evidence: A1/A2/A3/A4 都要求删掉 operator noun 和 future API 形状
  - status: `merged`
- F6 `medium` `ambiguity`:
  - summary: `06` 当前仍按“场景 -> grammar -> API family”生成公开心智，场景反向驱动 API
  - evidence: A1/A2/A4 都要求把 `06` 改成 witness / acceptance map
  - status: `merged`

### Counter Proposals

- P1:
  - summary: 保守修复。保留三 family 大框架，只删 operator noun 与 future holes
  - why_better: 迁移面更小
  - overturns_assumptions: `A3, A5`
  - resolves_findings: `F1, F5`
  - supersedes_proposals:
  - dominance: `partial`
  - axis_scores:
    - concept-count: `better`
    - public-surface: `better`
    - compat-budget: `same`
    - migration-cost: `better`
    - proof-strength: `partial`
    - future-headroom: `partial`
  - status: `rejected`
- P2:
  - summary: route-first surface contract。把 05 改成唯一 family law，统一成 `authoring / runtime commands / react projection` 三条 authority route
  - why_better: family law 与 export mapping 同层，能直接压掉 `commands` 双重语义与 `FormView` 漂浮
  - overturns_assumptions: `A1, A3, A4`
  - resolves_findings: `F1, F2, F3, F4`
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
- P3:
  - summary: `06` 降成 witness / acceptance map，不再新增 public noun 或 future holes
  - why_better: 让场景页只承担覆盖证明，不再和 grammar/family 页竞争 authority
  - overturns_assumptions: `A2, A3, A5`
  - resolves_findings: `F1, F5, F6`
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
- P4:
  - summary: pure projection 回 root，commands 只保留 effectful actions
  - why_better: 删除读写混面，`decode`、`inspect`、`FormView` 的归属重新闭合
  - overturns_assumptions: `A1, A4, A5`
  - resolves_findings: `F2, F4, F5`
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

### Resolution Delta

- `A1` -> `overturned`
- `A2` -> `overturned`
- `A3` -> `overturned`
- `A4` -> `overturned`
- `A5` -> `overturned`
- `05/06` 已按 `SYN-4` 重写

## Adoption

- adopted_candidate: `SYN-4 route-first public surface contract`
- lineage: `P2 + P3 + P4`
- rejected_alternatives: `P1`
- rejection_reason: `保守修复仍保留 family 与 scenario 页之间的双 authority，不足以消掉 commands 读写混面`
- dominance_verdict: `SYN-4 在 concept-count, public-surface, proof-strength 上对 baseline 形成严格改进，并通过 Ramanujan / Kolmogorov / Godel 三重 gate`

### Freeze Record

- adopted_summary: `05 作为唯一 family law；06 作为 witness / acceptance map；public surface 统一按 authoring / runtime commands / react projection 三条 authority route 冻结；pure projection 回 root，commands 只保留 effectful actions`
- kernel_verdict: `通过。新方案压掉了 05/06 双 authority、commands 读写混面和 operator noun 提前冻结，同时保持 future API 继续可压缩`
- frozen_decisions:
  - `05` 是唯一 future public API 规范页
  - `06` 不新增 public noun，只证明覆盖与暴露未覆盖 slot
  - public surface 统一按 `authoring route / runtime command route / react projection route`
  - `Form.commands` 只是 runtime command route 的 bootstrap bridge
  - `FormView` 归 authoring route 的 pure projection
  - commands route 只承接 effectful runtime actions
  - operator noun 只能在 route 与 slot 已冻结之后再决议
- non_goals:
  - 本轮不冻结 future operator noun
  - 本轮不进入 implementation plan
  - 本轮不把场景页变成 API 待办表
- allowed_reopen_surface:
  - authority route 是否还可继续压缩
  - `Form.commands` 与 root export 是否仍存在双 authority
  - `06` 的 witness 角色是否仍有越界
  - future operator algebra 的具体 naming
- proof_obligations:
  - downstream 文档不得在 `06` 新增 public noun
  - future operator 只能在已冻结 route/slot 下命名
  - pure projection 与 effectful action 必须继续分面
  - `FormView`、decode、inspect 等对象不得重新漂浮到 family 之外
- delta_from_previous_round: `从 family + scenario 的松散 API 草图，收缩到 route-first 的单点 public surface contract`

## Round 2

### Phase

- `converge`

### Input Residual

- `SYN-4` 是否已满足 freeze record
- 是否仍存在能直接支配 `SYN-4` 的更小方案

### Findings

- F7 `medium` `ambiguity`:
  - summary: `02` 与 `runtime/06` 仍残留旧 package-bucket budget 口径
  - evidence: reviewers A1/A2/A4 converge 指出 route-first budget 尚未在 bound surface 全量切换
  - status: `closed`
- F8 `medium` `ambiguity`:
  - summary: `inspect` 仍残留在 runtime command route
  - evidence: reviewer A2 converge 指出读写混面未完全收干净
  - status: `closed`

### Counter Proposals

- P5:
  - summary: 把 `02` 与 `runtime/06` 回写成 route-first budget 口径
  - why_better: 让 `05` 真正成为唯一 surface contract
  - overturns_assumptions:
  - resolves_findings: `F7`
  - supersedes_proposals:
  - dominance: `dominates`
  - axis_scores:
    - concept-count: `better`
    - public-surface: `better`
    - compat-budget: `same`
    - migration-cost: `same`
    - proof-strength: `better`
    - future-headroom: `same`
  - status: `adopted`
- P6:
  - summary: 把 `inspect` 从 runtime command route 收回 pure projection
  - why_better: 让 commands route 只保留 effectful actions
  - overturns_assumptions:
  - resolves_findings: `F8`
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

- `F7` -> `closed`
- `F8` -> `closed`
- `P5/P6` -> `adopted`
- `02/03/05/06/runtime/06` 已完成 route-first cutover

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
- adopted_candidate: `SYN-4 route-first public surface contract`
- final_status: `closed`
- stop_rule_satisfied: `true`
- residual_risk:
  - future operator 命名不能绕开 `05-public-api-families.md`
  - `decode / inspect / explain` 若再次跨 route 漂移，必须立即 reopen
  - `06` 若再次新增 public noun 或 future holes，需要回到 SSoT review
