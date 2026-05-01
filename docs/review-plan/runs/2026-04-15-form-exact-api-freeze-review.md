# Form Exact API Freeze Review Ledger

## Meta

- target: `docs/proposals/form-exact-api-freeze-candidate.md`
- source_kind: `file-plan`
- reviewer_count: `4`
- reviewer_model: `gpt-5.4`
- reviewer_reasoning: `xhigh`
- challenge_scope: `open`
- consensus_status: `closed`

## Bootstrap

- target_complete: `anchor=docs/proposals/form-exact-api-freeze-candidate.md; bound surface=docs/ssot/form/03-kernel-form-host-split.md, docs/ssot/form/04-convergence-direction.md, docs/ssot/form/05-public-api-families.md, docs/ssot/form/06-capability-scenario-api-support-map.md, docs/ssot/form/07-kernel-upgrade-opportunities.md, docs/ssot/form/09-operator-slot-design.md, docs/ssot/form/13-exact-surface-contract.md, docs/ssot/runtime/06-form-field-kernel-boundary.md, docs/internal/form-api-quicklook.md, packages/logix-form/src/index.ts, packages/logix-form/src/Form.ts, packages/logix-form/src/FormView.ts, packages/logix-form/src/internal/form/impl.ts, packages/logix-form/src/internal/form/commands.ts, packages/logix-form/src/react/useForm.ts, packages/logix-form/src/react/useField.ts, packages/logix-form/src/react/useFieldArray.ts, packages/logix-form/src/react/useFormState.ts`
- challenge_scope: `open`
- reviewer_set: `A1, A2, A3, A4`
- active_advisors: `A4`
- activation_reason: `目标涉及 exact public API surface、route/slot/noun 精确冻结、用户视角 walkthrough 对齐，以及必要时反推整个 kernel，需要目标函数挑战`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan, Kolmogorov, Godel`
- dominance_axes: `concept-count, public-surface, compat-budget, migration-cost, proof-strength, future-headroom`
- stop_rule:
  - `Ramanujan gate`: 至少压掉一个 public boundary、一个重复 noun、或一段多余 contract
  - `Kolmogorov gate`: `concept-count / public-surface / compat-budget` 不整体变差；若核心轴不变，必须在 `proof-strength` 或 `future-headroom` 上形成严格改进
  - `Godel gate`: 不得引入第二套 authority、第二套 exact surface、第二套 walkthrough contract、或未闭合矛盾
- reopen_bar: `只有当 adopted candidate 在 dominance axes 上被更优方案直接支配，且通过三重 gate，才允许 reopen`
- ledger_path: `docs/review-plan/runs/2026-04-15-form-exact-api-freeze-review.md`
- writable: `true`
- edit_policy: `allow-edit-target-and-bound-surface`
- residual_only: `false`

## Assumptions

- A1:
  - summary: `docs/proposals/form-exact-api-freeze-candidate.md` 足以作为 exact API freeze 的主锚点
  - status: `kept`
  - resolution_basis: `reviewers 一致要求 exact freeze 只能有单 authority artifact；proposal 继续保留，但 walkthrough 与后续 SSoT 必须从它派生`
- A2:
  - summary: `$.logic(($) => { ... })` 应取代 `logic({ rules })` 成为 canonical day-one authoring surface
  - status: `overturned`
  - resolution_basis: `reviewers 交集进一步要求删掉 `Form.from`，把 canonical authoring 收口到 `Form.make(..., { logic: ($) => ... })` 这一条 act`
- A3:
  - summary: root projection family 应冻结为 `FormView.summary / path / explain`
  - status: `overturned`
  - resolution_basis: `reviewers 交集要求先冻结 projection acquisition 与 contract，再决定 nested selector noun；root exact acquisition 改成单 entry`
- A4:
  - summary: runtime command route 应同时保留 `submit()` 与 `handleSubmit(...)`
  - status: `overturned`
  - resolution_basis: `reviewers 一致要求 submit lane 只保留一个 runtime noun，`handleSubmit` 下沉为 host sugar / alias`
- A5:
  - summary: list mutation exact surface 应扩到 `insert / update / replace / byId`
  - status: `overturned`
  - resolution_basis: `insert / update / replace` 被保留；`byId` 因 row token contract 未冻结而退出 exact surface`
- A6:
  - summary: react projection route 继续只保留 `useForm / useField / useFieldArray / useFormState`
  - status: `kept`
  - resolution_basis: `四个 hook 暂时保留，但角色改写为 host manifestation / host sugar，不再被视作第三条 peer authority`
- A7:
  - summary: 当前 kernel grammar 与 owner split 可以作为 exact API freeze 的固定前提
  - status: `overturned`
  - resolution_basis: `scope 放开后，reviewers 一致要求比较更小 kernel grammar；当前 grammar 只保留基线地位，不再是固定前提`

## Round 1

### Phase

- `challenge`

### Input Residual

- none

### Findings

- F1 `critical` `invalidity`:
  - summary: exact surface 没有单 authority artifact，proposal、walkthrough 与后续目标页会并行手写 noun，freeze 后必然固化 drift
  - evidence: A2 直接指出候选稿与 walkthrough 已出现 `Form.make / Form.from / handleSubmit / list / submit` 等 exact noun 分叉
  - status: `merged`
- F2 `critical` `invalidity`:
  - summary: authoring 仍是双入口甚至三层构造，`Form.make`、`Form.from`、`logic spec` 同时存活，和 canonical authoring 的单 act 原则冲突
  - evidence: A1/A2/A3/A4 都指出 schema 双写、中间 lowering bundle 公共泄漏与 `Form.from` transport role 问题
  - status: `merged`
- F3 `critical` `invalidity`:
  - summary: submit lane 仍保留双 noun 和 bridge residue，`submit` / `handleSubmit` / `Form.commands` 同时升格会制造双 authority
  - evidence: A1/A2/A3/A4 都要求 submit 只保留一个 runtime noun，并把 `Form.commands` 降为 bridge residue 或 internal packaging exception
  - status: `merged`
- F4 `high` `invalidity`:
  - summary: React 仍被当成第三条 peer authority，但 hooks 已直接承接 mutation sugar，authority model 未闭合
  - evidence: A3 明确要求改成“两条 authority + 一个 host manifestation package”；A1/A4 也要求先冻结真实 handle boundary
  - status: `merged`
- F5 `high` `ambiguity`:
  - summary: projection noun 冻结过早；proposal 先命名 `summary/path/explain`，但 projection contract 与 reason envelope 还未被证明足够 exact
  - evidence: A2/A3/A4 都要求先冻结 projection acquisition 与 data contract，再考虑 helper noun
  - status: `merged`
- F6 `high` `ambiguity`:
  - summary: exact freeze 漏掉 type surface，当前只列 value export，会留下大量隐式 public contract
  - evidence: A4 明确指出 `export type *` 与 `Form.ts` 类型导出还未进入 freeze
  - status: `merged`
- F7 `high` `controversy`:
  - summary: kernel grammar 尚未证明最小；当前三段 grammar 仍可继续压成两个 primitive 加共享 receipt format
  - evidence: A1/A2/A4 都要求在 exact surface freeze 前重新比较更小 kernel grammar，并把 `reason` 从 peer grammar 降成 derived projection law
  - status: `merged`
- F8 `medium` `ambiguity`:
  - summary: `byId(rowId)` 过早升格到 exact list mutation surface，但 row token contract 尚未冻结
  - evidence: A3 要求先冻结 row token contract，否则 `byId` 继续留在 unnamed/alias 层
  - status: `merged`

### Counter Proposals

- P1:
  - summary: 保持当前候选，只做局部补字眼
  - why_better: 改动面最小
  - overturns_assumptions:
  - resolves_findings:
  - supersedes_proposals:
  - dominance: `none`
  - axis_scores:
    - concept-count: `worse`
    - public-surface: `worse`
    - compat-budget: `same`
    - migration-cost: `better`
    - proof-strength: `worse`
    - future-headroom: `worse`
  - status: `rejected`
- P2:
  - summary: `SYN-A`。exact freeze 只允许一个 authority artifact；walkthrough 与后续 SSoT 只能从 proposal 派生，不再并行手写 noun
  - why_better: 直接切掉 drift 的来源，满足 Godel 单 authority 门
  - overturns_assumptions: `A1`
  - resolves_findings: `F1`
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
  - summary: `SYN-B`。canonical authoring 收口到单 act `Form.make(id, { values, initialValues, logic: ($) => { ... } })`；`Form.from` 退出 canonical surface
  - why_better: 删除 schema 双写、删除 lowering bundle 泄漏、删除 acquisition 中转层
  - overturns_assumptions: `A2`
  - resolves_findings: `F2`
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
- P4:
  - summary: `SYN-C`。authority model 改成两条 authority 加一个 host manifestation package；React 不再是第三条 peer authority
  - why_better: 直接消除 hooks mutation 与 runtime mutation 的双重 authority
  - overturns_assumptions: `A6`
  - resolves_findings: `F4`
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
  - summary: `SYN-D`。submit 只保留一个 runtime noun `submit(options?)`；`handleSubmit` 下沉为 host sugar / alias；`Form.commands` 降到 bridge residue
  - why_better: 删掉同一 lane 下的双 noun 和 bridge residue 升格
  - overturns_assumptions: `A4`
  - resolves_findings: `F3`
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
- P6:
  - summary: `SYN-E`。exact freeze 显式拆成 value surface 与 type surface 两张表
  - why_better: 消掉类型面的隐式 public contract
  - overturns_assumptions:
  - resolves_findings: `F6`
  - supersedes_proposals:
  - dominance: `dominates`
  - axis_scores:
    - concept-count: `same`
    - public-surface: `same`
    - compat-budget: `same`
    - migration-cost: `same`
    - proof-strength: `better`
    - future-headroom: `better`
  - status: `adopted`
- P7:
  - summary: `SYN-F`。projection 先冻结 acquisition 与 contract；`summary/path/explain` 只作为 nested selectors，不再额外升格为多个 root noun
  - why_better: 先锁 authority，再锁 helper，降低 projection helper 过早冻结的回撤风险
  - overturns_assumptions: `A3`
  - resolves_findings: `F5`
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
- P8:
  - summary: `SYN-G`。kernel grammar 进入更小比较：`shape executor + task executor + shared receipt format`，`reason` 退回 derived projection law
  - why_better: 让 exact surface 不再被更大的中间 grammar 反向绑死
  - overturns_assumptions: `A7`
  - resolves_findings: `F7`
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
- P9:
  - summary: `SYN-H`。`byId(rowId)` 暂不进入 exact surface，等 row token contract 先冻结
  - why_better: 删除一条未闭合的 list mutation commitment
  - overturns_assumptions: `A5`
  - resolves_findings: `F8`
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

### Resolution Delta

- `A1` -> `kept`
- `A2` -> `overturned`
- `A3` -> `overturned`
- `A4` -> `overturned`
- `A5` -> `overturned`
- `A6` -> `kept`
- `A7` -> `overturned`
- `P2~P9` -> `adopted`
- `docs/proposals/form-exact-api-freeze-candidate.md` 已按新的 synthesized candidate 重写
- `docs/internal/form-api-quicklook.md` 已按 proposal 单 authority 口径重写

## Adoption

- adopted_candidate: `SYN-13 single-authority exact surface`
- lineage: `P2 + P3 + P4 + P5 + P6 + P7 + P8 + P9`
- rejected_alternatives: `P1`
- rejection_reason: `维持旧候选会继续保留双入口 authoring、双 submit noun、第三条 peer authority 与多账本 drift`
- dominance_verdict: `SYN-13 在 concept-count, public-surface, proof-strength, future-headroom 上对旧候选形成严格改进，并通过 Ramanujan / Kolmogorov / Godel 三重 gate`

### Freeze Record

- adopted_summary: `exact freeze 当前收口到一个单 authority proposal artifact；authoring 收敛为单 act，authority model 收敛为两条 authority 加一个 host manifestation package，submit 只保留一个 runtime noun，projection 先冻结 acquisition 与 contract，exact surface 显式拆成 value/type 两张表，kernel 候选同步压向 shape executor + task executor + shared receipt format`
- kernel_verdict: `通过。kernel 不再是 exact surface 的固定前提，后续只承认更小 grammar 与单 receipt 链`
- frozen_decisions:
  - exact freeze 只允许一个 authority artifact，walkthrough 与后续 SSoT 必须从 proposal 派生
  - canonical authoring act 固定为 `Form.make(id, { values, initialValues, logic: ($) => { ... } })`
  - `Form.from` 退出 canonical user surface
  - authority model 改成 `authoring + runtime + host manifestation`
  - runtime exact submit 只保留一个 noun：`submit(options?)`
  - `handleSubmit` 下沉为 host sugar / alias
  - exact freeze 显式拆成 value surface 与 type surface
  - projection 先冻结 acquisition 与 contract，不再额外升格多个 root noun
  - `byId(rowId)` 暂不进入 exact surface
  - kernel grammar 进入更小比较：`shape executor + task executor + shared receipt format`
- non_goals:
  - 本轮不回写 SSoT
  - 本轮不实现代码
  - 本轮不承诺 host sugar noun 已最终不可变
- allowed_reopen_surface:
  - `shape executor + task executor + shared receipt format` 是否还可继续压缩
  - `Form.commands` 是否最终完全退出用户可见 packaging
- proof_obligations:
  - 任何后续 exact noun 都必须明确 value surface / type surface 落位
  - 不得重新引入 `Form.from`、`handleSubmit` 或 `Form.commands` 的 canonical user 地位
  - React 不得再次被写成第三条 peer authority
  - 任何 projection noun 都不得绕开单一 projection acquisition
  - kernel 压缩不得引入第二 truth 或第二 verification control plane
- delta_from_previous_round: `从多账本、双入口、双 submit noun、三 authority 候选，压到单 authority artifact、单 authoring act、单 submit noun、双表面 ledger 与更小 kernel 比较`

## Round 2

### Phase

- `converge`

### Input Residual

- proposal 是否已消除旧尾部冲突
- projection acquisition 是否已唯一化
- type surface 是否已补齐 builder contract
- freeze record 是否已同步最新收口状态

### Findings

- F9 `high` `ambiguity`:
  - summary: proposal 舍弃旧候选后的单一一致文本还没写完，尾部残留旧 exact noun
  - evidence: converge review 指出 proposal 尾部同时保留新 freeze 与旧候选两套文本
  - status: `closed`
- F10 `high` `ambiguity`:
  - summary: projection acquisition 仍以 `Form.view(form)` 与 `form.view()` 双写存在
  - evidence: converge review 指出 exact proposal 与 freeze record 的“单一 projection acquisition”要求未闭合
  - status: `closed`
- F11 `high` `ambiguity`:
  - summary: type surface 未把 `FormLogicBuilder / FormFieldBuilder` 落账
  - evidence: converge review 指出 exact authoring 已公开 builder contract，但 type surface 表未承接
  - status: `closed`
- F12 `high` `ambiguity`:
  - summary: freeze record 仍保留已经收口的问题作为 reopen 面
  - evidence: converge review 指出 latest proposal 与 walkthrough 已闭合，但 ledger 仍残留旧 residual
  - status: `closed`

### Counter Proposals

- P10:
  - summary: 清掉 proposal 尾部旧候选，保持单一一致文本
  - why_better: 消掉单 authority artifact 的机械冲突
  - overturns_assumptions:
  - resolves_findings: `F9`
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
- P11:
  - summary: 把 projection acquisition 唯一化为 `form.view()`
  - why_better: 满足单 acquisition proof obligation
  - overturns_assumptions:
  - resolves_findings: `F10`
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
- P12:
  - summary: 把 `FormLogicBuilder / FormFieldBuilder` 加入 type surface 表
  - why_better: 关闭 exact authoring 的隐式类型 contract
  - overturns_assumptions:
  - resolves_findings: `F11`
  - supersedes_proposals:
  - dominance: `dominates`
  - axis_scores:
    - concept-count: `same`
    - public-surface: `same`
    - compat-budget: `same`
    - migration-cost: `same`
    - proof-strength: `better`
    - future-headroom: `better`
  - status: `adopted`
- P13:
  - summary: 同步 freeze record 的 allowed_reopen_surface 到最新 proposal
  - why_better: 让 proposal、walkthrough、ledger 重新闭合
  - overturns_assumptions:
  - resolves_findings: `F12`
  - supersedes_proposals:
  - dominance: `dominates`
  - axis_scores:
    - concept-count: `same`
    - public-surface: `same`
    - compat-budget: `same`
    - migration-cost: `same`
    - proof-strength: `better`
    - future-headroom: `same`
  - status: `adopted`

### Resolution Delta

- `F9` -> `closed`
- `F10` -> `closed`
- `F11` -> `closed`
- `F12` -> `closed`
- `P10~P13` -> `adopted`
- proposal、walkthrough、freeze record 已重新闭合
- all four reviewers returned `无 unresolved findings`
- no reopen survived the final residual review

## Consensus

- reviewers: `A1, A2, A3, A4`
- adopted_candidate: `SYN-13 single-authority exact surface`
- final_status: `closed`
- stop_rule_satisfied: `true`
- residual_risk:
  - `shape executor + task executor + shared receipt format` 是否还能继续压缩，留待后续有更强证据时 reopen
  - `Form.commands` 是否最终完全退出用户可见 packaging，留待后续 cutover 与 export 收口时 reopen
