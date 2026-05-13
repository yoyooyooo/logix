# Form Scenario Formula Review Ledger

## Meta

- target: `docs/ssot/form/06-capability-scenario-api-support-map.md`
- source_kind: `file-plan`
- reviewer_count: `4`
- reviewer_model: `gpt-5.4`
- reviewer_reasoning: `xhigh`
- challenge_scope: `open`
- consensus_status: `closed`

## Bootstrap

- target_complete: `anchor=docs/ssot/form/06-capability-scenario-api-support-map.md; bound surface=docs/ssot/form/05-public-api-families.md, docs/ssot/form/06-capability-scenario-api-support-map.md, docs/ssot/form/07-kernel-upgrade-opportunities.md, docs/ssot/form/09-operator-slot-design.md`
- challenge_scope: `open`
- reviewer_set: `A1, A2, A3, A4`
- active_advisors: `A4`
- activation_reason: `目标涉及 scenario/composition formula、跨层组合与 case 映射，需要目标函数挑战`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan, Kolmogorov, Godel`
- dominance_axes: `concept-count, public-surface, compat-budget, migration-cost, proof-strength, future-headroom`
- stop_rule:
  - `Ramanujan gate`: 至少压掉一个 assumption、一个 public boundary、或一段重复 contract
  - `Kolmogorov gate`: `concept-count / public-surface / compat-budget` 不整体变差；若核心轴不变，必须在 `proof-strength` 或 `future-headroom` 上形成严格改进
  - `Godel gate`: 不得引入第二套 authority、第二套 workflow、第二套 contract、或未闭合矛盾
- reopen_bar: `只有当 adopted candidate 在 dominance axes 上被更优方案直接支配，且通过三重 gate，才允许 reopen`
- ledger_path: `docs/review-plan/runs/2026-04-15-form-scenario-formula-review.md`
- writable: `true`
- edit_policy: `allow-edit-target-and-bound-surface`
- residual_only: `false`

## Assumptions

- A1:
  - summary: `06-capability-scenario-api-support-map.md` 足以作为 scenario/composition formula 的主锚点
  - status: `kept`
  - resolution_basis: `在收缩成 authority-aligned composition layer 后，11 继续保留为主锚点`
- A2:
  - summary: 当前 `F1~F6` 是最小但足够完整的公式集
  - status: `overturned`
  - resolution_basis: `现稿混合了 family、variant 和 overlay，已压缩成更小 family 集`
- A3:
  - summary: 当前 formula selection rule 已足够强
  - status: `overturned`
  - resolution_basis: `selection rule 已改成先填 formula_stack，再判是否新增`
- A4:
  - summary: current formula-to-case mapping 已经正确
  - status: `overturned`
  - resolution_basis: `mapping 已收成 canonical case registry 内的 formula_stack / primary / variant / overlay`
- A5:
  - summary: 未来场景继续先落公式，再展开到 route/slot/noun/kernel proof
  - status: `kept`
  - resolution_basis: `这轮仍保持先公式再展开，但公式已回收到 authority-aligned family`

## Round 1

### Phase

- `challenge`

### Input Residual

- none

### Findings

- F1 `high` `invalidity`:
  - summary: 11 把三种不同层级混成同一层 authority，公式集并非同构
  - evidence: A3/A4 都指出 `F1~F6` 同时承担基式、变体和 overlay
  - status: `merged`
- F2 `high` `ambiguity`:
  - summary: `F6 Query-Adjacent` 没有贡献新的 form grammar / slot / kernel proof，却被提升为 canonical formula
  - evidence: A4 明确要求把它降成 orthogonal composition modifier
  - status: `merged`
- F3 `medium` `ambiguity`:
  - summary: selection rule 仍按单公式或弱组合判定，mapping 已经是多公式 stack
  - evidence: A3/A4 都要求先写 `formula_stack`
  - status: `merged`
- F4 `medium` `ambiguity`:
  - summary: current formula-to-case mapping 存在 registry 外 witness 与单 witness freeze
  - evidence: A3 明确指出 `FormDemoLayout` 不在 canonical case registry 中
  - status: `merged`

### Counter Proposals

- P1:
  - summary: 保留 `F1~F6`，只补 primary/secondary/modifier 与 witness 规则
  - why_better: 改动面更小
  - overturns_assumptions: `A3, A4`
  - resolves_findings: `F3, F4`
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
  - summary: `B1 / AC-A3-2` 方向。把 formula authority 收到 `F1 Active Shape / F2 Settlement / F3 Projection` 三个 canonical family，并把 `external-adjacency` 降成 overlay law
  - why_better: 直接对齐 05/06/07/09 的 authority，并把 case 组合改成 formula stack
  - overturns_assumptions: `A2, A3, A4`
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

### Resolution Delta

- `A2` -> `overturned`
- `A3` -> `overturned`
- `A4` -> `overturned`
- `06-capability-scenario-api-support-map.md` 已按 `SYN-9` 重写

## Adoption

- adopted_candidate: `SYN-9 authority-aligned scenario formula families`
- lineage: `P2`
- rejected_alternatives: `P1`
- rejection_reason: `保守修补仍保留混层公式集，无法消掉 family/variant/overlay 的双轨 authority`
- dominance_verdict: `SYN-9 在 concept-count, proof-strength, future-headroom 上对 baseline 形成严格改进，并通过 Ramanujan / Kolmogorov / Godel 三重 gate`

### Freeze Record

- adopted_summary: `11 只保留 F1 Active Shape / F2 Settlement / F3 Projection 三个 canonical family，以及 C1 external-adjacency overlay；具体场景统一按 formula_stack 组装`
- kernel_verdict: `通过。新方案压掉了 F1~F6 的混层目录，把公式 authority 收回到与 grammar/slot/kernel proof 同构的组合层`
- frozen_decisions:
  - canonical formula family 只保留 `F1/F2/F3`
  - `C1 external-adjacency` 只作为 overlay law
  - current mapping 统一写成 `formula_stack / primary / variant / overlay`
  - mapping 只允许引用 canonical case registry
- non_goals:
  - 本轮不为单个 case 造公式
  - 本轮不让 query adjacency 升成 form canonical formula
  - 本轮不冻结具体 implementation 步骤
- allowed_reopen_surface:
  - family 集是否还能继续压缩
  - overlay 是否还可继续下沉
  - formula stack 规则是否仍有歧义
- proof_obligations:
  - 未来新场景必须先写 `formula_stack`
  - 组合只允许回链 06/07/09 的已冻结 authority
  - witness 必须来自 canonical case registry
- delta_from_previous_round: `从混层公式目录，压缩到 authority-aligned family + overlay 组合层`

## Round 2

### Phase

- `converge`

### Input Residual

- `SYN-9` 是否已满足 freeze record

### Findings

- F5 `medium` `ambiguity`:
  - summary: 总规则仍残留旧的 `formula_set / modifiers / proof_refs` 词表，authority backlink 也过宽
  - evidence: reviewer A1 converge 指出 freeze 落盘未完全收干净
  - status: `closed`

### Counter Proposals

- P3:
  - summary: 把总规则第 3 条收成 `formula_stack / primary / variant / overlay / proof_refs`，并把 backlink 收窄到 `06/07/09`
  - why_better: 让 11 真正落回 freeze record
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
- `P3` -> `adopted`
- `06-capability-scenario-api-support-map.md` 已去掉 residual 旧词表

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
- adopted_candidate: `SYN-9 authority-aligned scenario formula families`
- final_status: `closed`
- stop_rule_satisfied: `true`
- residual_risk:
  - scenario 层若再次把 overlay 升成 canonical family，需要立即 reopen
  - `formula_stack` 若被改单选或弱组合，必须重开公式层评审
  - case registry 若再次出现 registry 外 witness，需要重新收口
