# Form Bridge And Receipt Residual Review Ledger

## Meta

- target: `docs/proposals/form-bridge-receipt-residual-cut.md`
- source_kind: `file-plan`
- reviewer_count: `4`
- reviewer_model: `gpt-5.4`
- reviewer_reasoning: `xhigh`
- challenge_scope: `open`
- consensus_status: `closed`

## Bootstrap

- target_complete: `anchor=docs/proposals/form-bridge-receipt-residual-cut.md; bound surface=docs/ssot/form/07-kernel-upgrade-opportunities.md, docs/ssot/form/13-exact-surface-contract.md, docs/ssot/runtime/06-form-field-kernel-boundary.md, docs/ssot/form/03-kernel-form-host-split.md, packages/logix-form/src/index.ts, packages/logix-form/package.json`
- challenge_scope: `open`
- reviewer_set: `A1, A2, A3, A4`
- active_advisors: `A4`
- activation_reason: `目标只剩 bridge packaging 与 receipt grammar 两条 residual，需要目标函数挑战`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan, Kolmogorov, Godel`
- dominance_axes: `concept-count, public-surface, compat-budget, migration-cost, proof-strength, future-headroom`
- stop_rule:
  - `Ramanujan gate`: 至少压掉一个 bridge、一个 grammar object、或一段重复 contract
  - `Kolmogorov gate`: `concept-count / public-surface / compat-budget` 不整体变差；若核心轴不变，必须在 `proof-strength` 或 `future-headroom` 上形成严格改进
  - `Godel gate`: 不得引入第二 authority、第二 receipt chain、第二 packaging contract、或未闭合矛盾
- reopen_bar: `只有当 adopted candidate 在 dominance axes 上被更优方案直接支配，且通过三重 gate，才允许 reopen`
- ledger_path: `docs/review-plan/runs/2026-04-15-form-bridge-receipt-residual-review.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `Form.commands` 仍值得保留在 root export 作为长期 packaging bridge
  - status: `overturned`
  - resolution_basis: `reviewers 交集要求先把问题收成 root authority closure；默认候选改成 root-zero-bridge-noun`
- A2:
  - summary: 当前 `participation-delta / settlement-task / canonical evidence envelope` 仍是最小 kernel grammar
  - status: `kept`
  - resolution_basis: `reviewers 交集认为 challenger 目前没有 strict dominance proof；默认维持 07 现状，grammar residual 改成 proof-first gate`

## Round 1

### Phase

- `challenge`

### Input Residual

- none

### Findings

- F1 `high` `ambiguity`:
  - summary: 当前 proposal 把 `commands` closure 混成 path-level packaging 与 symbol-level authority 的混合问题，success bar 过粗
  - evidence: A1/A2/A4 都指出 `package.json` 不决定 symbol 级 `commands` 去留，`06/12/13` 也仍在重复解释 bridge 状态
  - status: `merged`
- F2 `high` `invalidity`:
  - summary: `commands` 若继续留在 root barrel，就无法稳定宣称“只是 internal bridge”
  - evidence: A1/A2/A3 都指出 root 一旦导出，它就已经构成用户可见 packaging contract
  - status: `merged`
- F3 `high` `invalidity`:
  - summary: grammar residual 目前只提出了更短的新词表，没有证明 strict dominance
  - evidence: A1/A2/A4 都指出 `shape executor + task executor + shared receipt format` 目前只展示 naming 变化，没有删 assumption / 删 boundary / 增 proof 的闭合证据
  - status: `merged`
- F4 `medium` `ambiguity`:
  - summary: 即便 grammar challenger 成立，也不应同时改写 03/07/08/runtime-06 四页词表
  - evidence: A2/A4 都要求 grammar 命名只在 07 裁决，其他页只回链 07
  - status: `merged`

### Counter Proposals

- P1:
  - summary: 继续把两条 residual 绑成“一次收口”
  - why_better: proposal 更少
  - overturns_assumptions:
  - resolves_findings:
  - supersedes_proposals:
  - dominance: `none`
  - axis_scores:
    - concept-count: `worse`
    - public-surface: `same`
    - compat-budget: `same`
    - migration-cost: `worse`
    - proof-strength: `worse`
    - future-headroom: `worse`
  - status: `rejected`
- P2:
  - summary: `RG-A`。把 proposal 改成双 gate：Gate A 只收 `commands` root authority closure；Gate B 只收 grammar challenger 的 proof-first gate
  - why_better: 把不同层级的问题按不同证据门槛切开，避免 surface closure 被 grammar reopen 拖住
  - overturns_assumptions:
  - resolves_findings: `F1`
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
  - summary: `RG-B`。`commands` 默认裁成 root-zero-bridge-noun；只有能点名 surviving consumer 时才 reopening packaging exception
  - why_better: 直接删掉 root bridge noun 的公开 contract 幻觉
  - overturns_assumptions: `A1`
  - resolves_findings: `F2`
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
- P4:
  - summary: `RG-C`。grammar residual 改成 strict dominance gate；在没有删 assumption / 删 boundary / 增 proof 的证据前，维持 07 现状并关闭 rename
  - why_better: 避免把 naming churn 误当 grammar 压缩
  - overturns_assumptions:
  - resolves_findings: `F3, F4`
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

### Resolution Delta

- `A1` -> `overturned`
- `A2` -> `kept`
- `P2~P4` -> `adopted`
- `docs/proposals/form-bridge-receipt-residual-cut.md` 已改成 dual-gate proposal

## Adoption

- adopted_candidate: `SYN-14 dual-gate residual closure`
- lineage: `P2 + P3 + P4`
- rejected_alternatives: `P1`
- rejection_reason: `把 surface closure 与 grammar challenger 绑成同一 success bar 会增加词表与证明链的混乱度`
- dominance_verdict: `SYN-14 在 concept-count, public-surface, migration-cost, proof-strength 上对 baseline proposal 形成严格改进，并通过 Ramanujan / Kolmogorov / Godel 三重 gate`

### Freeze Record

- adopted_summary: `residual proposal 改成 dual-gate：Gate A 只处理 commands root authority closure，默认候选为 root-zero-bridge-noun；Gate B 只处理 grammar challenger 的 strict dominance gate，在没有硬证据前维持 07 现状`
- kernel_verdict: `通过。当前不直接推进 grammar rename；先要求更小候选满足 07 reopen gate 与 08 change gate`
- frozen_decisions:
  - `commands` residual 先按 root authority closure 处理
  - `commands` 默认从 root barrel 删除
  - grammar residual 先按 proof-first gate 处理
  - 没有 strict dominance 证据前，07 保持现状
  - 即便 grammar challenger 成立，命名裁决也只在 07 落盘；03/08/runtime-06 只回链 07
- non_goals:
  - 本轮不实现代码删除
  - 本轮不直接改写 07/03/08/runtime-06 grammar 词表
  - 本轮不判断 host sugar 命名
- allowed_reopen_surface:
  - `commands` 是否存在点名 surviving consumer，足以保留 packaging exception
  - grammar challenger 是否补齐 strict dominance matrix
- proof_obligations:
  - `commands` 的决策面只看 root barrel、12、13、runtime-06
  - `package.json` 不作为 symbol-level authority
  - grammar challenger 必须显式给出删 assumption / 删 boundary / 增 proof 三项证据
  - grammar rename 若成立，只允许 07 做词表裁决，其他页只回链
- delta_from_previous_round: `从“一次收口两条 residual”压缩到 dual-gate residual closure`

## Round 2

### Phase

- `converge`

### Input Residual

- Gate A 是否已改成 root-zero-bridge-noun 并回写事实页
- Gate B 是否已改成 strict dominance gate 并回写 07/08 的 proof-first 口径

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- all four reviewers returned `无 unresolved findings`
- dual-gate proposal 已被消费到目标页
- no reopen survived the residual converge

## Consensus

- reviewers: `A1, A2, A3, A4`
- adopted_candidate: `SYN-14 dual-gate residual closure`
- final_status: `closed`
- stop_rule_satisfied: `true`
- residual_risk:
  - 若未来出现可点名的 `commands` surviving consumer，需要按 Gate A 重开 packaging exception
  - 若未来 grammar challenger 补齐 strict dominance matrix，需要按 Gate B 重开 07 的命名裁决
