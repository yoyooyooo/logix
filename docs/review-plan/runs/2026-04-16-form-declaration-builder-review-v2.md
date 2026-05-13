# Form Declaration Builder Review V2 Ledger

## Meta

- target: `docs/proposals/form-declaration-builder-contract.md`
- source_kind: `file-ssot-contract`
- reviewers: `A1, A2, A3, A4`
- round_count: `0`
- challenge_scope: `open`
- consensus_status: `open`

## Bootstrap

- target_complete: `anchor=docs/proposals/form-declaration-builder-contract.md; bound surface=docs/ssot/form/13-exact-surface-contract.md, docs/ssot/runtime/06-form-field-kernel-boundary.md, docs/ssot/runtime/03-canonical-authoring.md, docs/ssot/form/09-operator-slot-design.md, docs/internal/form-api-quicklook.md`
- review_contract:
  - artifact_kind: `ssot-contract`
  - review_goal: `design-closure`
  - target_claim: `under zero-user and forward-only assumptions, form declaration layer should choose the strongest professional external API contract among builder-vs-config and logic-vs-declare-vs-positional-builder`
  - non_default_overrides: `compat-budget and migration-cost are near-zero by baseline; external API quality and kernel backpressure are first-order goals`
- review_object_manifest:
  - source_inputs: `docs/proposals/form-declaration-builder-contract.md`
  - materialized_targets: `docs/proposals/form-declaration-builder-contract.md`
  - authority_target: `docs/proposals/form-declaration-builder-contract.md`
  - bound_docs: `docs/ssot/form/13-exact-surface-contract.md, docs/ssot/runtime/06-form-field-kernel-boundary.md, docs/ssot/runtime/03-canonical-authoring.md, docs/ssot/form/09-operator-slot-design.md, docs/internal/form-api-quicklook.md`
  - derived_scope: `form declaration layer only`
  - allowed_classes: `builder-vs-config, phase naming, authoring ergonomics, scope expression, external API quality, kernel backpressure`
  - blocker_classes: `phase ambiguity, second authoring model, leaked IR, inability to express nested scope cleanly, professional API regression`
  - ledger_target: `docs/review-plan/runs/2026-04-16-form-declaration-builder-review-v2.md`
- challenge_scope: `open`
- reviewer_set: `A1, A2, A3, A4`
- active_advisors: `A4`
- activation_reason: `用户明确重置背景为 zero-user / forward-only / professional-grade external API first，这会改变 declaration contract 的目标函数`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan, Kolmogorov, Godel`
- dominance_axes: `concept-count, public-surface, compat-budget, migration-cost, proof-strength, future-headroom`
- stop_rule:
  - `Ramanujan gate`: 至少压掉一个 authoring object、一个 phase 歧义、或一段重复 contract
  - `Kolmogorov gate`: 在当前 zero-user 前提下，`compat-budget / migration-cost` 默认接近零，不得被用作保守拒绝主因；若核心轴不变，必须在 `proof-strength` 或 `future-headroom` 上形成严格改进
  - `Godel gate`: 不得引入第二 authoring model、第二 phase contract、或未闭合矛盾
- reopen_bar: `在当前零存量用户前提下，只要新候选在 external API 质量、概念压缩或 kernel backpressure 上形成直接支配，就允许 reopen`
- ledger_path: `docs/review-plan/runs/2026-04-16-form-declaration-builder-review-v2.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `函数体 builder` 继续应作为 form declaration 的默认 carrier
  - status: `kept`
  - resolution_basis: `四位 reviewer 都没有给出普通配置字段优于 builder 的支配性方案`
- A2:
  - summary: `logic` 这个词在 form 侧仍是当前最强外部 API 选择
  - status: `overturned`
  - resolution_basis: `三位 reviewer 认为 `logic` 应退出 form declaration surface；继续保留的证据不够强`
- A3:
  - summary: `declare` 与位置参数 builder 目前都未形成对现基线的直接支配
  - status: `overturned`
  - resolution_basis: `reviewers 交集认为位置参数 builder 已经形成更强主候选；`declare` 只保留为 fallback`

## Round 1

### Phase

- `challenge`

### Input Residual

- none

### Findings

- F1 `critical` `invalidity`:
  - summary: 当前 proposal 仍以 `logic / declare` 的局部 rename 为主问题，但真正更强的问题是 declaration carrier 是否继续藏在 config key 里
  - evidence: A3/A4 明确指出位置参数 builder 已是更强候选，继续把主问题收窄成 rename 会遮蔽更优解
  - status: `merged`
- F2 `high` `invalidity`:
  - summary: form 侧继续沿用 `logic` 会保留同一 token 的多重 phase 含义，长期教学和 LLM 路由成本偏高
  - evidence: A2/A3/A4 都指出 `Module.logic` 与 form declaration `logic` 的 contract 差异已经超出单纯词面相似
  - status: `merged`
- F3 `high` `ambiguity`:
  - summary: `declare` 作为 config-key fallback 可以成立，但它不是当前最强候选
  - evidence: A2 支持 `declare` 胜过 `logic`，但 A3/A4 一致认为位置参数 builder 仍更小更稳
  - status: `merged`
- F4 `medium` `ambiguity`:
  - summary: 普通配置对象没有支配 builder 的证据，应降为被拒绝候选
  - evidence: 四位 reviewer 都没有给出配置对象优于 builder 的证明，且多位 reviewer 明确指出它会重新暴露 IR 或第二 contract
  - status: `merged`

### Counter Proposals

- P1:
  - summary: 继续采用 `logic` config-key builder
  - why_better: 改动最小
  - overturns_assumptions:
  - resolves_findings:
  - supersedes_proposals:
  - dominance: `none`
  - axis_scores:
    - concept-count: `worse`
    - public-surface: `worse`
    - compat-budget: `same`
    - migration-cost: `same`
    - proof-strength: `worse`
    - future-headroom: `worse`
  - status: `rejected`
- P2:
  - summary: 采用 `declare` config-key builder
  - why_better: 删掉 `logic` 的 phase 歧义，同时保留 builder 作用域
  - overturns_assumptions: `A2`
  - resolves_findings: `F2`
  - supersedes_proposals:
  - dominance: `partial`
  - axis_scores:
    - concept-count: `same`
    - public-surface: `same`
    - compat-budget: `same`
    - migration-cost: `same`
    - proof-strength: `better`
    - future-headroom: `same`
  - status: `deferred`
- P3:
  - summary: `SYN-16`。保留函数体 builder，但把 declaration callback 提升为 `Form.make(id, config, ($) => { ... })` 的位置参数，删除 `logic` config-key
  - why_better: 同时保留 builder 的局部作用域优势，删掉误导性的 phase noun，也把 static config 与 declaration carrier 直接分层
  - overturns_assumptions: `A2, A3`
  - resolves_findings: `F1, F2, F3, F4`
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

- `A1` -> `kept`
- `A2` -> `overturned`
- `A3` -> `overturned`
- `P3` -> `adopted`
- `logic` config-key 这轮不再作为主候选
- `declare` 留作 fallback
- 配置对象 AST 降为 rejected candidate
- proposal 已改写为 position-argument-builder 主候选

## Adoption

- adopted_candidate: `SYN-16 positional builder beats logic-key builder`
- lineage: `P3`
- rejected_alternatives: `P1`
- rejection_reason: `继续沿用 logic config-key 会永久保留 phase 例外说明，且比位置参数 builder 更大更弱`
- dominance_verdict: `SYN-16 在 concept-count, public-surface, proof-strength, future-headroom 上对基线 proposal 形成严格改进，并通过 Ramanujan / Kolmogorov / Godel 三重 gate`

### Freeze Record

- adopted_summary: `form 侧继续采用函数体 builder，但 declaration carrier 从 config-key 提升为 `Form.make(id, config, ($) => { ... })` 的位置参数；logic 退出 declaration surface，declare 只保留为 fallback`
- kernel_verdict: `通过。builder 仍保持为 S1 declaration carrier；本轮不要求改变 kernel 或 scope contract`
- frozen_decisions:
  - form 侧继续保留函数体 builder
  - `logic` 退出 form declaration surface
  - declaration callback 提升为 `Form.make` 的位置参数
  - `declare` 不进入主候选，只保留为 fallback
  - 普通配置对象 AST 不进入 exact surface
- non_goals:
  - 本轮不决定 fallback 方案是否最终需要保留
  - 本轮不重写 kernel 或 submit contract
  - 本轮不处理实现层 `extend` 的去留
- allowed_reopen_surface:
  - 若位置参数 builder 在类型或签名层证明不稳，可回退比较 `declare` fallback
  - 若未来有更强 carrier 方案支配位置参数 builder，可 reopen carrier
- proof_obligations:
  - writeback 时必须补齐所有受影响的 exact surface、boundary、walkthrough 和 internal residue
  - 任何 future rename 都不得重新引入第二 declaration carrier
  - declaration builder 继续不得暴露 public IR / lowering bundle
- delta_from_previous_round: `从 logic-vs-declare-vs-config 的发散搜索面，压缩到 keep builder + positional builder 主候选，并把 declare 降为 fallback`

## Consensus

- reviewers: `A1, A2, A3, A4`
- adopted_candidate: `SYN-16 positional builder beats logic-key builder`
- final_status: `closed`
- stop_rule_satisfied: `true`
- residual_risk:
  - “当前真实 API” 对照段与实现 residue 仍会保留旧 `Form.from(...).logic(...)` 痕迹，后续实现 cutover 时需继续以 13 为单点口径防止回流
  - 若未来第三参数被重新名词化，或 `declare` 被重新提升为 exact noun，需要 reopen declaration contract
