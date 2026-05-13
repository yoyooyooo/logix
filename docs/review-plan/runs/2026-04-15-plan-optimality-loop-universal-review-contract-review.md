# Plan Optimality Loop Universal Review Contract Review Ledger

## Meta

- target: `docs/next/2026-04-15-plan-optimality-loop-universal-review-contract.md`
- source_kind: `file-plan`
- reviewer_count: `4`
- reviewer_model: `gpt-5.4`
- reviewer_reasoning: `xhigh`
- challenge_scope: `open`
- consensus_status: `closed`

## Bootstrap

- target_complete: `anchor=docs/next/2026-04-15-plan-optimality-loop-universal-review-contract.md; bound surface=/Users/yoyo/.codex/skills/plan-optimality-loop/SKILL.md, /Users/yoyo/.codex/skills/plan-optimality-loop/references/workflow.md, /Users/yoyo/.codex/skills/plan-optimality-loop/references/ledger-schema.md, /Users/yoyo/.codex/skills/plan-optimality-loop/references/reviewer-prompts.md`
- challenge_scope: `open`
- reviewer_set: `A1, A2, A3, A4`
- active_advisors: `A4`
- activation_reason: `目标涉及 skill 目标函数、模式切分、workflow 权威与 ledger contract，需要目标函数挑战`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan, Kolmogorov, Godel`
- dominance_axes: `concept-count, public-surface, compat-budget, migration-cost, proof-strength, future-headroom`
- stop_rule:
  - `Ramanujan gate`: 至少压掉一个多余 route 轴、一个第二 workflow、或一个第二 ledger contract
  - `Kolmogorov gate`: `concept-count / public-surface / compat-budget` 不整体变差；若核心轴不变，必须在 `proof-strength` 或 `future-headroom` 上形成严格改进
  - `Godel gate`: 不得引入第二套 route basis、第二套 workflow、第二套 ledger authority、或未闭合矛盾
- reopen_bar: `只有当 adopted candidate 在 dominance axes 上被更优方案直接支配，且通过三重 gate，才允许 reopen`
- ledger_path: `docs/review-plan/runs/2026-04-15-plan-optimality-loop-universal-review-contract-review.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `四个 artifact mode 并列是最小划分`
  - status: `overturned`
  - resolution_basis: `phase 1 已压成双 mode 内核，doc-family 与 zero-unresolved 改由 review_goal、manifest 与派生 matrix 表达`
- A2:
  - summary: `可以在不改骨架的前提下把 recognize/normalize/materialize/ledger-normalize 设成固定九步链路`
  - status: `overturned`
  - resolution_basis: `这些步骤已收为 preflight/postflight wrapper，五阶段继续是唯一公开 workflow`
- A3:
  - summary: `可以新增多种 ledger 语义而不破坏单一 review ledger`
  - status: `overturned`
  - resolution_basis: `phase 1 明确继续只允许一份 review ledger，zero-unresolved 只在单 ledger 内新增 closure 结论`
- A4:
  - summary: `独立 policy 与 lens 开关值得作为 phase 1 public contract`
  - status: `overturned`
  - resolution_basis: `phase 1 已改成 derived legality matrix 加 `non_default_overrides``
- A5:
  - summary: `materialize 落点本身就足以保证 reviewer 审到正确对象`
  - status: `overturned`
  - resolution_basis: `phase 1 新增单一 review_object_manifest，显式绑定 review / authority / ledger 三类对象`

## Round 1

### Phase

- `challenge`

### Input Residual

- none

### Findings

- F1 `critical` `invalidity`:
  - summary: `artifact_mode` 混入工件类型、范围形状与收口阶段，形成第二套路由基
  - evidence: A1/A2/A3/A4 都指出 `doc-family-closure`、`zero-unresolved-audit` 与 `scope_shape`、`closure_level` 重复编码
  - status: `closed`
- F2 `critical` `invalidity`:
  - summary: 九步动作链会长出第二套 workflow
  - evidence: A1/A3/A4 都指出现有五阶段已是单点权威
  - status: `closed`
- F3 `high` `invalidity`:
  - summary: 文档把 ledger 推成第二类目标工件体系
  - evidence: A1/A3 指出 `drift / closure / bound ledger` 的写法会冲击单一 ledger contract
  - status: `closed`
- F4 `high` `ambiguity`:
  - summary: materialize-before-review 未闭合到单一可审对象
  - evidence: A1/A2/A3 都要求显式绑定 review、authority、ledger 三者
  - status: `closed`
- F5 `medium` `ambiguity`:
  - summary: 独立 policy 与 lens 开关会长出隐性规则表
  - evidence: A1/A2 都要求压成派生 legality matrix 与极小 override 面
  - status: `closed`
- F6 `medium` `ambiguity`:
  - summary: 目标 claim 与 phase 1 采用门槛不一致
  - evidence: A4 指出 adoption gate 实际只证明双 mode 内核
  - status: `closed`

### Counter Proposals

- P1:
  - summary: 保留四个 artifact mode，再补合法组合约束
  - why_better: 保留更强表达力
  - overturns_assumptions: `A1`
  - resolves_findings: `F1`
  - supersedes_proposals:
  - dominance: `partial`
  - axis_scores:
    - concept-count: `partial`
    - public-surface: `partial`
    - compat-budget: `same`
    - migration-cost: `same`
    - proof-strength: `partial`
    - future-headroom: `partial`
  - status: `rejected`
- P2:
  - summary: phase 1 压成双 mode 内核，doc-family 与 zero-unresolved 改为派生语义
  - why_better: 直接消掉重复 route 轴与 adoption 过大 claim
  - overturns_assumptions: `A1, A4`
  - resolves_findings: `F1, F6`
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
  - summary: 把 materialize 收进 preflight/postflight，并冻结 `review_object_manifest`
  - why_better: 保住五阶段单点权威，同时闭合 review 对象
  - overturns_assumptions: `A2, A5`
  - resolves_findings: `F2, F4`
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
  - summary: 继续保持单一 review ledger，policy 与 lens 改为 derived legality matrix
  - why_better: 消掉第二 ledger contract 与隐性规则表
  - overturns_assumptions: `A3, A4`
  - resolves_findings: `F3, F5`
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

- `F1~F6` -> `closed`
- `P2/P3/P4` -> `adopted`
- 目标文档已重写为 phase 1 双 mode 内核 contract

## Round 2

### Phase

- `converge`

### Input Residual

- `zero-unresolved` 是否仍会被读成第二类 ledger

### Findings

- F7 `medium` `ambiguity`:
  - summary: `zero-unresolved` 仍残留“新增 closure ledger”的读法
  - evidence: converge reviewer 指出正文与单一 ledger contract 自相矛盾
  - status: `closed`

### Counter Proposals

- P5:
  - summary: 把 `zero-unresolved` 收成“单一 ledger 内的 closure 结论记录”
  - why_better: 彻底关掉第二类 ledger 的读法
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

### Resolution Delta

- `F7` -> `closed`
- `P5` -> `adopted`
- `zero-unresolved` 已改成单 ledger 内的 closure 记录

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

- all four reviewers returned `无 unresolved findings`
- latest target text stayed within freeze record
- no reopen survived the final residual review

## Adoption

- adopted_candidate: `SYN-13 phase-1 dual-mode universal review kernel`
- lineage: `P2 + P3 + P4 + P5`
- rejected_alternatives: `P1`
- rejection_reason: `四 mode 并列会继续制造重复 route 轴与 adoption claim 膨胀`
- dominance_verdict: `SYN-13 在 concept-count, public-surface, compat-budget, proof-strength, future-headroom 上对 baseline 形成严格改进，并通过 Ramanujan / Kolmogorov / Godel 三重 gate`

### Freeze Record

- adopted_summary: `phase 1 只冻结 implementation-plan 与 ssot-contract 双 mode 内核；doc-family 与 zero-unresolved 改由 review_goal、review_object_manifest 与 derived legality matrix 表达；五阶段 workflow 与单一 review ledger 继续保持唯一权威`
- kernel_verdict: `通过。新方案压掉了第二套路由基、第二套 workflow 与第二类 ledger contract`
- frozen_decisions:
  - `artifact_kind` 只保留 `implementation-plan / ssot-contract`
  - `review_goal` 只保留 `design-closure / implementation-ready / zero-unresolved`
  - 所有 review 先冻结成单一 `review_object_manifest`
  - `recognize / normalize / materialize` 只作为 preflight wrapper
  - `ledger-normalize` 只作为 postflight housekeeping
  - review ledger 继续只有一份
  - policy 与 lens 不再作为 phase 1 public 开关，统一由 derived legality matrix 与 `non_default_overrides` 表达
- non_goals:
  - 本轮不开始改 skill 实现
  - 本轮不升格更多 mode
  - 本轮不把代码 review、PR 收口、CI 排障并进 skill
- allowed_reopen_surface:
  - `review_object_manifest` 与 ledger schema 的接线是否仍不够闭合
  - derived legality matrix 是否仍需要更小抽象
  - phase 1 是否仍遗漏 implementation plan 或 ssot contract 的关键合法对象
- proof_obligations:
  - 五阶段 workflow 必须继续是唯一公开 workflow
  - review ledger 必须继续只有一份
  - phase 1 不得重新引入四 mode 并列
  - overrides 必须保持极小且需要 justification
- delta_from_previous_round: `从四 mode + 九步链 + 多种 ledger 语义，压缩到双 mode + preflight/postflight wrapper + 单一 ledger`

## Consensus

- reviewers: `A1, A2, A3, A4`
- adopted_candidate: `SYN-13 phase-1 dual-mode universal review kernel`
- final_status: `closed`
- stop_rule_satisfied: `true`
- residual_risk:
  - 后续若未把 `review_object_manifest`、derived legality matrix 与 ledger schema 收进单点权威，仍可能出现实现层漂移
  - 若团队后续想升格更多 mode，必须先证明它没有重新制造第二套路由基
