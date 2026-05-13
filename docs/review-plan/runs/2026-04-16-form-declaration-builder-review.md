# Form Declaration Builder Review Ledger

## Meta

- target: `docs/proposals/form-declaration-builder-contract.md`
- source_kind: `file-ssot-contract`
- reviewers: `A1, A2, A3, A4`
- round_count: `0`
- challenge_scope: `open`
- consensus_status: `open`

## Bootstrap

- target_complete: `anchor=docs/proposals/form-declaration-builder-contract.md; bound surface=docs/ssot/form/13-exact-surface-contract.md, docs/ssot/runtime/06-form-field-kernel-boundary.md, docs/ssot/runtime/03-canonical-authoring.md, packages/logix-form/src/internal/dsl/logic.ts, packages/logix-form/src/internal/dsl/from.ts, docs/internal/form-api-quicklook.md`
- review_contract:
  - artifact_kind: `ssot-contract`
  - review_goal: `design-closure`
  - target_claim: `form declaration layer should choose the strongest contract among builder-vs-config and logic-vs-declare, then freeze it`
  - non_default_overrides: `open scope allows challenging the currently frozen exact surface if the declaration contract is provably stronger`
- review_object_manifest:
  - source_inputs: `docs/proposals/form-declaration-builder-contract.md`
  - materialized_targets: `docs/proposals/form-declaration-builder-contract.md`
  - authority_target: `docs/proposals/form-declaration-builder-contract.md`
  - bound_docs: `docs/ssot/form/13-exact-surface-contract.md, docs/ssot/runtime/06-form-field-kernel-boundary.md, docs/ssot/runtime/03-canonical-authoring.md, packages/logix-form/src/internal/dsl/logic.ts, packages/logix-form/src/internal/dsl/from.ts, docs/internal/form-api-quicklook.md`
  - derived_scope: `form declaration layer only`
  - allowed_classes: `builder-vs-config, phase naming, authoring ergonomics, scope expression, public contract clarity`
  - blocker_classes: `phase ambiguity, second authoring model, leaked IR, inability to express nested scope cleanly`
  - ledger_target: `docs/review-plan/runs/2026-04-16-form-declaration-builder-review.md`
- challenge_scope: `open`
- reviewer_set: `A1, A2, A3, A4`
- active_advisors: `A4`
- activation_reason: `目标涉及 declaration phase contract 与 public naming，存在长期教学和 LLM 误导风险，需要目标函数挑战`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan, Kolmogorov, Godel`
- dominance_axes: `concept-count, public-surface, compat-budget, migration-cost, proof-strength, future-headroom`
- stop_rule:
  - `Ramanujan gate`: 至少压掉一个 authoring object、一个 phase 歧义、或一段重复 contract
  - `Kolmogorov gate`: `concept-count / public-surface / compat-budget` 不整体变差；若核心轴不变，必须在 `proof-strength` 或 `future-headroom` 上形成严格改进
  - `Godel gate`: 不得引入第二 authoring model、第二 phase contract、或未闭合矛盾
- reopen_bar: `只有当 adopted candidate 在 dominance axes 上被更优方案直接支配，且通过三重 gate，才允许 reopen`
- ledger_path: `docs/review-plan/runs/2026-04-16-form-declaration-builder-review.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `builder 不是问题，真正的问题只是名字 logic`
  - status: `overturned`
  - resolution_basis: `reviewers 交集认为本轮 proposal 尚不足以证明 rename 支配已冻结基线；当前最强共识是先维持 baseline，并把 declaration-only subset 解释写清楚`
- A2:
  - summary: `函数体 builder` 比普通配置字段更适合 form authoring
  - status: `kept`
  - resolution_basis: `四位 reviewer 都没有给出普通配置字段优于 builder 的支配性方案`
- A3:
  - summary: `logic` 这个名字仍可接受，不会长期制造严重歧义
  - status: `kept`
  - resolution_basis: `虽存在歧义风险，但本轮 rename 候选未满足 reopen bar；当前更优收口是补 declaration-only subset invariant，而不是立即换名`

## Round 1

### Phase

- `challenge`

### Input Residual

- none

### Findings

- F1 `critical` `invalidity`:
  - summary: 当前 proposal 未证明本次 reopen 已通过上一轮 exact surface freeze 的 reopen bar
  - evidence: reviewers A2/A3/A4 一致指出 proposal 没有给出 `logic -> declare` 或更强候选对已冻结基线的 6 轴支配证明
  - status: `merged`
- F2 `high` `ambiguity`:
  - summary: 候选空间不完整；在 open scope 下，位置参数 builder 是比 `logic / declare` 二选一更强的压缩型候选
  - evidence: A3 明确提出 `Form.make(id, config, ($) => { ... })` 的更强候选；当前 proposal 未纳入比较
  - status: `merged`
- F3 `high` `ambiguity`:
  - summary: `declare` 作为新 noun 没有通过 10 的 promotion proof，也没有补齐 full write set
  - evidence: A1/A2/A4 都指出 `declare` 目前更像同 slot 改名，没有 `deleted_boundary / proof_ref / authority_source` 的完整证明
  - status: `merged`
- F4 `medium` `ambiguity`:
  - summary: builder vs 配置对象被放大成了过大的对决，但当前基线已经把 builder 作为 exact carrier 冻结
  - evidence: A1/A2/A4 一致认为配置对象没有证明自己能同时保住单 act、局部作用域与隐藏 IR
  - status: `merged`
- F5 `medium` `ambiguity`:
  - summary: `logic` 的歧义目前主要停在解释层，还不足以压过已冻结 exact surface 的稳定性
  - evidence: A1/A4 认为 `logic` 可通过 shared invariant 吸收；A2/A3 虽支持 rename，但也都要求先补齐 reopen proof
  - status: `merged`

### Counter Proposals

- P1:
  - summary: 直接采用 `declare`
  - why_better: 词面 phase 更清楚
  - overturns_assumptions:
  - resolves_findings: `F5`
  - supersedes_proposals:
  - dominance: `partial`
  - axis_scores:
    - concept-count: `same`
    - public-surface: `same`
    - compat-budget: `worse`
    - migration-cost: `worse`
    - proof-strength: `partial`
    - future-headroom: `partial`
  - status: `rejected`
- P2:
  - summary: 采用位置参数 builder
  - why_better: 可能进一步压缩 declaration slot
  - overturns_assumptions:
  - resolves_findings: `F2, F5`
  - supersedes_proposals:
  - dominance: `partial`
  - axis_scores:
    - concept-count: `better`
    - public-surface: `better`
    - compat-budget: `same`
    - migration-cost: `worse`
    - proof-strength: `partial`
    - future-headroom: `better`
  - status: `deferred`
- P3:
  - summary: `SYN-15`。维持函数体 builder 与 `logic` 基线，不 reopen exact noun；仅补一条 shared invariant，明确 form `logic` 是 declaration-only subset
  - why_better: 不引入新 noun，不破坏已冻结 exact surface，同时把当前真实歧义收敛到最小解释面
  - overturns_assumptions: `A1`
  - resolves_findings: `F1, F3, F4, F5`
  - supersedes_proposals:
  - dominance: `dominates`
  - axis_scores:
    - concept-count: `better`
    - public-surface: `better`
    - compat-budget: `better`
    - migration-cost: `better`
    - proof-strength: `better`
    - future-headroom: `same`
  - status: `adopted`

### Resolution Delta

- `A1` -> `overturned`
- `A2` -> `kept`
- `A3` -> `kept`
- `P3` -> `adopted`
- `declare` 与配置对象这轮不升格
- `位置参数 builder` 留作未来可重开的 open-scope challenger
- `13 / runtime-06 / internal walkthrough` 已补 declaration-only subset invariant

## Adoption

- adopted_candidate: `SYN-15 keep builder + keep logic + add declaration-only subset invariant`
- lineage: `P3`
- rejected_alternatives: `P1`
- rejection_reason: `declare 当前没有通过 reopen bar 与 promotion proof，直接 rename 会形成第二份 contract`
- dominance_verdict: `SYN-15 在 concept-count, public-surface, compat-budget, migration-cost, proof-strength 上对当前 proposal 形成严格改进，并通过 Ramanujan / Kolmogorov / Godel 三重 gate`

### Freeze Record

- adopted_summary: `form 侧继续采用函数体 builder，并继续沿用 logic 这个词；当前通过补 declaration-only subset invariant 吸收 phase 歧义，不重开 exact rename`
- kernel_verdict: `通过。builder 仍保持为 S1 declaration carrier；本轮不要求改变 kernel 或 scope contract`
- frozen_decisions:
  - form 侧继续保留函数体 builder
  - form 侧继续沿用 `logic`
  - `logic` 在 form 侧固定解释为 declaration-only subset
  - `declare` 本轮不进入 exact surface
  - 配置对象 AST 本轮不进入 exact surface
- non_goals:
  - 本轮不改 exact noun
  - 本轮不做全量 rename cut
  - 本轮不重开 builder carrier 形式
- allowed_reopen_surface:
  - 若未来能补齐 rename 的 6 轴支配证明，可 reopen `logic -> declare`
  - 若未来能把位置参数 builder 做成更强 challenger，可 reopen builder carrier
- proof_obligations:
  - 任何 future rename 必须通过 10 的 promotion proof 与 13 的 reopen gate
  - 任何 future carrier change 必须证明不引入第二 IR / lowering contract
  - form `logic` 的 declaration-only subset 解释必须在权威页持续一致
- delta_from_previous_round: `从 declaration builder vs declare/open config 的发散 proposal，压缩到 keep builder + keep logic 的稳定基线，并补 shared invariant`

## Consensus

- reviewers: `A1, A2, A3, A4`
- adopted_candidate: `SYN-15 keep builder + keep logic + add declaration-only subset invariant`
- final_status: `closed`
- stop_rule_satisfied: `true`
- residual_risk:
  - 若未来能补齐 rename 的 6 轴支配证明，仍可 reopen `logic -> declare`
  - 若未来能证明位置参数 builder 直接支配当前 config-key builder，仍可 reopen carrier 形式
