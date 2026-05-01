# Form Export Manifest Review Ledger

## Meta

- target: `docs/ssot/form/13-exact-surface-contract.md`
- source_kind: `file-plan`
- reviewer_count: `4`
- reviewer_model: `gpt-5.4`
- reviewer_reasoning: `xhigh`
- challenge_scope: `open`
- consensus_status: `closed`

## Bootstrap

- target_complete: `anchor=docs/ssot/form/13-exact-surface-contract.md; bound surface=docs/ssot/form/05-public-api-families.md, docs/ssot/form/09-operator-slot-design.md, docs/ssot/form/13-exact-surface-contract.md, packages/logix-form/package.json, packages/logix-form/src/index.ts, packages/logix-form/src/react/index.ts`
- challenge_scope: `open`
- reviewer_set: `A1, A2, A3, A4`
- active_advisors: `A4`
- activation_reason: `目标涉及当前导出面与目标导出面的对齐、bridge residue 与 manifestation 边界，需要目标函数挑战`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan, Kolmogorov, Godel`
- dominance_axes: `concept-count, public-surface, compat-budget, migration-cost, proof-strength, future-headroom`
- stop_rule:
  - `Ramanujan gate`: 至少压掉一个 assumption、一个 public boundary、或一段重复 contract
  - `Kolmogorov gate`: `concept-count / public-surface / compat-budget` 不整体变差；若核心轴不变，必须在 `proof-strength` 或 `future-headroom` 上形成严格改进
  - `Godel gate`: 不得引入第二套 authority、第二套 workflow、第二套 contract、或未闭合矛盾
- reopen_bar: `只有当 adopted candidate 在 dominance axes 上被更优方案直接支配，且通过三重 gate，才允许 reopen`
- ledger_path: `docs/review-plan/runs/2026-04-15-form-export-manifest-review.md`
- writable: `true`
- edit_policy: `allow-edit-target-and-bound-surface`
- residual_only: `false`

## Assumptions

- A1:
  - summary: `13-exact-surface-contract.md` 足以作为导出对齐主锚点
  - status: `kept`
  - resolution_basis: `在收缩成 package-boundary drift ledger 后，12 继续保留为主锚点`
- A2:
  - summary: 当前 manifest state vocabulary 已经是最小且足够完整的
  - status: `overturned`
  - resolution_basis: `本地状态词已压回更小的 disposition-only 词表，并在 converge 轮移除了未实例化的 closed`
- A3:
  - summary: 当前 root export / react subpath / runtime bridge 三段切法已经正确
  - status: `overturned`
  - resolution_basis: `runtime bridge 已降为 root bucket 下的 exception / residue，不再单列第三桶`
- A4:
  - summary: 当前 manifest 与 05/09/10 的 authority 对齐已经足够强
  - status: `kept`
  - resolution_basis: `manifest 已改成 authority-backed drift ledger，route/slot/noun authority 继续回链 05/09/10`
- A5:
  - summary: 导出对齐继续只作为 manifest，不会反向长成第二条 grammar 或 noun authority
  - status: `kept`
  - resolution_basis: `manifest 已收成 delta ledger，不再维持第二套 route/noun 语法`

## Round 1

### Phase

- `challenge`

### Input Residual

- none

### Findings

- F1 `high` `invalidity`:
  - summary: `target route` 拼出额外复合词表，形成第二套伪路由文法
  - evidence: reviewers A2/A4 都指出 `authoring route.projection`、`react projection route.host projection` 之类词形与 05/09 重复
  - status: `merged`
- F2 `high` `ambiguity`:
  - summary: `manifest state vocabulary` 混入保留决策、manifestation 判断和 cutover 意图
  - evidence: reviewers A2/A4 都要求把状态压回 disposition-only
  - status: `merged`
- F3 `high` `ambiguity`:
  - summary: `runtime bridge manifest` 把 runtime residue 伪装成第三个 export bucket
  - evidence: reviewers A2/A4 都要求把 bridge 收回 root bucket exception
  - status: `merged`
- F4 `medium` `ambiguity`:
  - summary: 页面自称对齐“当前真实导出面”，但 authority chain 没有说清 package boundary / barrel inventory / normative authorization 的分工
  - evidence: reviewers A2/A4 都要求加 scope fence 与 authority chain
  - status: `merged`

### Counter Proposals

- P1:
  - summary: 保留单页全 surface，但只做小修补
  - why_better: 迁移面更小
  - overturns_assumptions: `A2, A3`
  - resolves_findings: `F2, F3`
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
  - summary: `ALT-A2-1`。把 12 改成 `delta-only export ledger`，只记录真正会漂移的 package surface 与 root bucket exceptions
  - why_better: 直接删掉重复 inventory、伪路由文法和第二状态词体系
  - overturns_assumptions: `A2, A3, A5`
  - resolves_findings: `F1, F2, F3, F4`
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
- `13-exact-surface-contract.md` 已按 `ALT-A2-1` 重写

## Adoption

- adopted_candidate: `SYN-11 delta-only export ledger`
- lineage: `P2`
- rejected_alternatives: `P1`
- rejection_reason: `保守修补仍保留伪 route 词表和第三 bucket`
- dominance_verdict: `SYN-11 在 concept-count, public-surface, proof-strength, future-headroom 上对 baseline 形成严格改进，并通过 Ramanujan / Kolmogorov / Godel 三重 gate`

### Freeze Record

- adopted_summary: `12 只保留 root/react 两个 acquisition bucket；主表只保留 commands 这一条 drift，wildcard passthrough 与 ./package.json 作为显式 exception`
- kernel_verdict: `通过。manifest 已退回 authority-backed drift ledger，不再维护第二套 route / noun / residue 语法`
- frozen_decisions:
  - 12 只承接 package-boundary drift
  - runtime bridge 不再单列第三 bucket
  - disposition 只保留 `authorized / bridge / residue`
  - route / slot / noun authority 继续只回链 05/09/10
- non_goals:
  - 本轮不维护完整 type export inventory
  - 本轮不把 runtime residue 详情写回 12
  - 本轮不让 manifest 反向定义 grammar 或 noun
- allowed_reopen_surface:
  - authority chain 是否仍有遗漏
  - 是否还需要更小的 manifest 形态
  - negative package boundary 是否需要显式 evidence row
- proof_obligations:
  - root/react buckets 之外不得再长新 bucket
  - 12 只能记录 drift，不得回收 route/noun authority
  - wildcard / packaging exception 必须显式落位
- delta_from_previous_round: `从全量 export 对齐表，压缩到 delta-only export ledger`

## Round 2

### Phase

- `converge`

### Input Residual

- `disposition` 词表是否仍偏大
- ledger 是否仍保留重复维护槽位

### Findings

- F5 `medium` `ambiguity`:
  - summary: `closed` 仍作为未实例化状态词残留在 disposition 词表中，后续容易被复制成第二维护负担
  - evidence: A2 指出当前页只有 `authorized / bridge` 活体行，`closed` 没有对应 row，且 `./internal/*: null` 只存在于 `package.json`
  - status: `closed`
- F6 `low` `ambiguity`:
  - summary: ledger 末尾保留一份空白 Adoption / Freeze Record 骨架，形成纯噪声的第二维护槽位
  - evidence: A2 指出同页已经存在一份完整 freeze record，后续空白模板没有信息增益
  - status: `closed`

### Counter Proposals

- P3:
  - summary: 窄 reopen。把 disposition 从 `authorized / bridge / residue / closed` 压成 `authorized / bridge / residue`
  - why_better: 删掉未实例化状态词，继续压缩 12 的本地 contract
  - overturns_assumptions:
  - resolves_findings: `F5`
  - supersedes_proposals:
  - dominance: `dominates`
  - axis_scores:
    - concept-count: `better`
    - public-surface: `same`
    - compat-budget: `same`
    - migration-cost: `better`
    - proof-strength: `better`
    - future-headroom: `same`
  - status: `adopted`
- P4:
  - summary: 删除 ledger 里的空白 Adoption / Freeze Record 骨架，只保留当前有效事实与 final consensus
  - why_better: 消掉纯噪声维护槽位，让 ledger 回到单份闭合记录
  - overturns_assumptions:
  - resolves_findings: `F6`
  - supersedes_proposals:
  - dominance: `dominates`
  - axis_scores:
    - concept-count: `better`
    - public-surface: `same`
    - compat-budget: `same`
    - migration-cost: `better`
    - proof-strength: `better`
    - future-headroom: `same`
  - status: `adopted`

### Resolution Delta

- `F5` -> `closed`
- `F6` -> `closed`
- `P3/P4` -> `adopted`
- `13-exact-surface-contract.md` 已移除未实例化的 `closed`
- ledger 已删除重复骨架并补齐最终 consensus

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

- all reviewers returned `无 unresolved findings`
- latest target text stayed within freeze record
- no reopen survived the final residual check

## Consensus

- reviewers: `A1, A2, A3, A4`
- adopted_candidate: `SYN-11 delta-only export ledger`
- final_status: `closed`
- stop_rule_satisfied: `true`
- residual_risk:
  - `./internal/*: null` 这条 negative package boundary 当前仍主要由 `package.json` 持有；若 exports 变动，必须把它作为同步核对项
  - 若 root/react barrel 新增长出未获 05/09/10 授权的 passthrough，或新增 bucket-external subpath，必须 reopen 12
