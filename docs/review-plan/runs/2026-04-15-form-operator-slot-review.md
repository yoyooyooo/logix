# Form Operator Slot Review Ledger

## Meta

- target: `docs/ssot/form/09-operator-slot-design.md`
- source_kind: `file-plan`
- reviewer_count: `4`
- reviewer_model: `gpt-5.4`
- reviewer_reasoning: `xhigh`
- challenge_scope: `open`
- consensus_status: `closed`

## Bootstrap

- target_complete: `anchor=docs/ssot/form/09-operator-slot-design.md; bound surface=docs/ssot/form/00-north-star.md, docs/ssot/form/02-gap-map-and-target-direction.md, docs/ssot/form/03-kernel-form-host-split.md, docs/ssot/form/04-convergence-direction.md, docs/ssot/form/05-public-api-families.md, docs/ssot/form/06-capability-scenario-api-support-map.md, docs/ssot/form/07-kernel-upgrade-opportunities.md, docs/ssot/form/09-operator-slot-design.md, docs/ssot/runtime/06-form-field-kernel-boundary.md`
- challenge_scope: `open`
- reviewer_set: `A1, A2, A3, A4`
- active_advisors: `A4`
- activation_reason: `目标涉及 future operator slot、slot law、noun 后置策略与 route-slot-grammar 一致性，需要目标函数挑战`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan, Kolmogorov, Godel`
- dominance_axes: `concept-count, public-surface, compat-budget, migration-cost, proof-strength, future-headroom`
- stop_rule:
  - `Ramanujan gate`: 至少压掉一个 assumption、一个 public boundary、或一段重复 contract
  - `Kolmogorov gate`: `concept-count / public-surface / compat-budget` 不整体变差；若核心轴不变，必须在 `proof-strength` 或 `future-headroom` 上形成严格改进
  - `Godel gate`: 不得引入第二套 authority、第二套 workflow、第二套 contract、或未闭合矛盾
- reopen_bar: `只有当 adopted candidate 在 dominance axes 上被更优方案直接支配，且通过三重 gate，才允许 reopen`
- ledger_path: `docs/review-plan/runs/2026-04-15-form-operator-slot-review.md`
- writable: `true`
- edit_policy: `allow-edit-target-and-bound-surface`
- residual_only: `false`

## Assumptions

- A1:
  - summary: `09-operator-slot-design.md` 足以作为 future operator slot 的主锚点
  - status: `kept`
  - resolution_basis: `在改写为 grammar-first closure matrix 后，09 继续保留为主锚点`
- A2:
  - summary: 当前 `A1/A2/A3 + C1/C2/C3/C4 + R1/R2/R3/R4` 是最小但足够完整的 slot 集
  - status: `overturned`
  - resolution_basis: `reviewers 一致认为现稿 slot 既不最小也不闭合`
- A3:
  - summary: 当前 slot law 已足够强，未来 noun 只需在 slot 下命名
  - status: `overturned`
  - resolution_basis: `现稿缺少 canonical slot vocabulary、bridge law、slot freeze gate 与统一映射法`
- A4:
  - summary: slot 与 root grammar 的映射当前已经正确
  - status: `overturned`
  - resolution_basis: `现稿把 field/list 对 reason contract 标成 none，和 active-set / cleanup / reason 公理冲突`
- A5:
  - summary: 未来 noun 继续后置，不需要在本轮提前冻结 operator noun
  - status: `kept`
  - resolution_basis: `本轮 adopted candidate 继续只冻结 slot law，不冻结 future noun`

## Round 1

### Phase

- `challenge`

### Input Residual

- none

### Findings

- F1 `critical` `invalidity`:
  - summary: 09 的 slot 集不闭合，主锚点资格不足
  - evidence: A1/A2/A4 都指出 `05/06/09` 使用了多套 slot vocabulary，遗漏对象和 slot 漂浮同时存在
  - status: `merged`
- F2 `high` `invalidity`:
  - summary: runtime command route 的 closure law 自冲突，commands 仍混入 pure read
  - evidence: A1/A2/A4 都指出 `field().get / fieldArray().get / inspect` 不能继续和 effectful actions 同槽
  - status: `merged`
- F3 `high` `ambiguity`:
  - summary: slot 与 root grammar 的映射表不可判定，且切断了 field/list 对 reason contract 的证据链
  - evidence: A1/A2/A4 都指出 `direct / partial / indirect / none` 这组标签既未定义也未进入 proof
  - status: `merged`
- F4 `medium` `ambiguity`:
  - summary: React slot 仍按当前 hook noun 切分，noun postponement 被文档自己削弱
  - evidence: A1/A2/A4 都要求把 React route 收成单一 projection slot 或 manifestation scope
  - status: `merged`
- F5 `medium` `ambiguity`:
  - summary: `05` 和 `09` 继续双重维护 slot inventory，bridge residue 没有被封边
  - evidence: A1/A2/A4 都要求把 slot inventory authority 收到单页，并给 bridge residue 立规则
  - status: `merged`

### Counter Proposals

- P1:
  - summary: 保守修复。保留当前 route-scoped 11 槽，只补 alias table、bridge residue 与映射 legend
  - why_better: 改动面更小
  - overturns_assumptions: `A2, A4`
  - resolves_findings: `F1, F2, F3`
  - supersedes_proposals:
  - dominance: `partial`
  - axis_scores:
    - concept-count: `partial`
    - public-surface: `partial`
    - compat-budget: `same`
    - migration-cost: `better`
    - proof-strength: `partial`
    - future-headroom: `partial`
  - status: `rejected`
- P2:
  - summary: `BA1`。把 09 改成 grammar-first 的 closure matrix，顶层只保留 `participation / shape-edit / settlement / reason-projection` 四类 semantic obligation，并收成 5 个 canonical slot：`S1 declaration / S2 mutate / S3 validate / S4 submit / S5 project`
  - why_better: 同时消掉 slot 双轨、commands 读写混面、React noun slot 化与映射表不可判定问题
  - overturns_assumptions: `A2, A3, A4`
  - resolves_findings: `F1, F2, F3, F4, F5`
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
- `A3` -> `overturned`
- `A4` -> `overturned`
- `09-operator-slot-design.md` 已按 `BA1` 重写

## Adoption

- adopted_candidate: `SYN-7 grammar-first slot closure matrix`
- lineage: `P2`
- rejected_alternatives: `P1`
- rejection_reason: `保守修复仍保留 route-local slot catalog，无法消掉 grammar 与 manifestation 的双轨 authority`
- dominance_verdict: `SYN-7 在 concept-count, public-surface, proof-strength, future-headroom 上对 baseline 形成严格改进，并通过 Ramanujan / Kolmogorov / Godel 三重 gate`

### Freeze Record

- adopted_summary: `09 仅保留 grammar-first 的 slot law；顶层冻结 4 个 semantic obligation 与 5 个 canonical slot；route 与 hook 只做 manifestation`
- kernel_verdict: `通过。新方案压掉了 route-scoped 11 槽 catalog，收回了 pure read authority，bridge residue 也被显式封边`
- frozen_decisions:
  - 顶层 semantic obligation 固定为 `O1 participation / O2 shape-edit / O3 settlement / O4 reason-projection`
  - canonical slot 固定为 `S1 declaration / S2 mutate / S3 validate / S4 submit / S5 project`
  - React route 只保留单一 host projection manifestation，不再按现有 hook noun 分槽
  - pure read authority 继续回 `S5 project`
  - `getState / dispatch` 继续只作为 bridge residue，不得变成 future noun
- non_goals:
  - 本轮不冻结 future operator noun
  - 本轮不承诺当前 hook 名永久保留
  - 本轮不让 manifestation 反向定义 grammar
- allowed_reopen_surface:
  - 5 个 canonical slot 是否还能继续压缩
  - bridge residue 是否还能继续收缩
  - `05/06/09` 的 slot 词表是否仍有分叉
- proof_obligations:
  - future noun 必须先归入 `S1~S5`
  - runtime route 不得再次混入 pure read authority
  - `06` 的 witness 标签必须继续引用 `09` 的 canonical slot vocabulary
  - `05` 不得再次回收 slot inventory authority
- delta_from_previous_round: `从 route-local slot catalog，压缩到 grammar-first 的 5 槽 closure matrix`

## Round 2

### Phase

- `converge`

### Input Residual

- `SYN-7` 是否已满足 freeze record

### Findings

- F6 `medium` `ambiguity`:
  - summary: `06/08/09` 还未完全闭合到同一 canonical slot vocabulary
  - evidence: reviewers converge 指出 06/08 仍残留旧词表
  - status: `closed`
- F7 `medium` `ambiguity`:
  - summary: `field().get / fieldArray().get` 仍和 bridge residue 混在一起
  - evidence: reviewers converge 指出 pure read authority 尚未完全回收到 `S5`
  - status: `closed`

### Counter Proposals

- P3:
  - summary: 把 `06/08` 的 witness 与假设词表统一回 `O1~O4 + S1~S5`
  - why_better: 让 `09` 的 freeze gate 真正闭合
  - overturns_assumptions:
  - resolves_findings: `F6`
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
- P4:
  - summary: 把 `field().get / fieldArray().get` 收回 pure projection
  - why_better: 让 runtime route 继续保持 effectful-only
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
    - future-headroom: `better`
  - status: `adopted`

### Resolution Delta

- `F6` -> `closed`
- `F7` -> `closed`
- `P3/P4` -> `adopted`
- `06/08/09` 已完成 canonical slot vocabulary 闭合

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
- adopted_candidate: `SYN-7 grammar-first slot closure matrix`
- final_status: `closed`
- stop_rule_satisfied: `true`
- residual_risk:
  - `06` 的 witness 描述若再次漂回旧词表，需要立即 reopen
  - `field().get / fieldArray().get` 若再次被拖回 runtime route，需要重开 slot review
  - future noun 只要绕开 `S1~S5` 命名，必须回到 SSoT review
