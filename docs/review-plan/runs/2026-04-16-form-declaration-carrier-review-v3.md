# Form Declaration Carrier Review V3 Ledger

## Meta

- target: `docs/ssot/form/13-exact-surface-contract.md`
- targets:
  - `docs/ssot/form/00-north-star.md`
  - `docs/ssot/form/13-exact-surface-contract.md`
  - `docs/ssot/runtime/06-form-field-kernel-boundary.md`
- source_kind: `file-ssot-contract`
- reviewers: `A1, A2, A3, A4`
- round_count: `1`
- challenge_scope: `open`
- consensus_status: `closed`

## Bootstrap

- target_complete: `authority target=form declaration carrier only; bound evidence=packages/logix-form/src/internal/form/impl.ts, packages/logix-form/src/index.ts, packages/logix-form/src/internal/dsl/logic.ts, packages/logix-form/src/internal/dsl/rules.ts, packages/logix-form/test/Form/Form.CanonicalAuthoringPath.test.ts, packages/logix-form/test/Form/Form.RulesManifest.Contract.test.ts, docs/review-plan/runs/2026-04-16-form-composition-model-challenge.md`
- review_contract:
  - artifact_kind: `ssot-contract`
  - review_goal: `design-closure`
  - target_claim: `under zero-user and forward-only assumptions, Form should expose exactly one declaration carrier; candidates are builder-first only, from+logic carrier, or an explicit dual-carrier hybrid`
  - non_default_overrides: `public composition law is already frozen separately; this round only compares declaration carriers and their leakage into public contract`
- review_object_manifest:
  - source_inputs:
    - `docs/ssot/form/00-north-star.md`
    - `docs/ssot/form/13-exact-surface-contract.md`
    - `docs/ssot/runtime/06-form-field-kernel-boundary.md`
    - `docs/review-plan/runs/2026-04-16-form-composition-model-challenge.md`
  - materialized_targets:
    - `docs/ssot/form/00-north-star.md`
    - `docs/ssot/form/13-exact-surface-contract.md`
    - `docs/ssot/runtime/06-form-field-kernel-boundary.md`
  - authority_target: `form-declaration-carrier@2026-04-16`
  - bound_docs:
    - `packages/logix-form/src/internal/form/impl.ts`
    - `packages/logix-form/src/index.ts`
    - `packages/logix-form/src/internal/dsl/logic.ts`
    - `packages/logix-form/src/internal/dsl/rules.ts`
    - `packages/logix-form/test/Form/Form.CanonicalAuthoringPath.test.ts`
    - `packages/logix-form/test/Form/Form.RulesManifest.Contract.test.ts`
    - `docs/internal/form-api-quicklook.md`
  - derived_scope: `Form declaration carrier only`
  - allowed_classes:
    - `declaration carrier`
    - `from+logic leakage`
    - `config.logic leakage`
    - `builder lowering cost`
    - `carrier determinism`
    - `public/internal mismatch`
  - blocker_classes:
    - `second declaration carrier`
    - `fake-closed authoring act`
    - `logic-public leak into carrier`
    - `agent-hostile authoring ambiguity`
  - ledger_target: `docs/review-plan/runs/2026-04-16-form-declaration-carrier-review-v3.md`
- challenge_scope: `open`
- reviewer_set: `A1, A2, A3, A4`
- active_advisors: `A4`
- activation_reason: `目标涉及 public contract、authoring determinism 与长期治理，必须允许直接挑战 builder-first 是否真该成为唯一声明载体`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan, Kolmogorov, Godel`
- dominance_axes: `concept-count, public-surface, compat-budget, migration-cost, proof-strength, future-headroom`
- stop_rule:
  - `Ramanujan gate`: 至少压掉一个 declaration carrier、一个重复 authoring contract、或一段隐藏 lowering 解释
  - `Kolmogorov gate`: `concept-count / public-surface / compat-budget` 不能整体变差；若核心轴不变，必须在 `proof-strength` 或 `future-headroom` 上形成严格改进
  - `Godel gate`: 不得引入第二 declaration carrier、第二 authoring contract、或未解释矛盾
- reopen_bar: `freeze 之后只有在 dominance axes 上被更小更强方案直接支配，且通过三重 gate 时才允许 reopen`
- ledger_path: `docs/review-plan/runs/2026-04-16-form-declaration-carrier-review-v3.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `builder-first` 应成为唯一声明载体
  - status: `kept`
  - resolution_basis: `A1/A2/A3/A4 的交集都支持 single-slot declaration closure on Form.make。`
- A2:
  - summary: `Form.from(...).logic` 不应继续停留在 surviving public carrier
  - status: `kept`
  - resolution_basis: `A1/A2/A3 都认为这条链若继续占用 canonical/public authority，就会成为第二 declaration carrier。`
- A3:
  - summary: `config.logic` 应被视为 leak 而不是合法备用 carrier
  - status: `kept`
  - resolution_basis: `A1/A2/A3 都把 config.logic 视为第二 carrier 的注入缝。`
- A4:
  - summary: declaration carrier 的目标函数应优先最小化 authoring ambiguity，再看 lowering 解释是否够短
  - status: `kept`
  - resolution_basis: `A4 要求 authoring-determinism 先过硬门，lowering 只保留为次级 proof obligation。`

## Round 1

### Phase

- `challenge`

### Input Residual

- none

### Findings

- F1 `critical` `invalidity`:
  - summary: 当前候选集没有先做结构归一，`builder-first` 与 `from+logic` 不在同一层级
  - evidence: `A1 + A4`
  - status: `merged`
- F2 `critical` `invalidity`:
  - summary: `Form.from(...).logic`、`config.logic`、`FormLogicSpec` 仍占用 canonical/public authority，单一 declaration carrier 尚未闭合
  - evidence: `A1 + A2 + A3`
  - status: `merged`
- F3 `high` `ambiguity`:
  - summary: `builder-first` 若不补单一 declaration IR / residue 边界，会形成 fake-closed authoring act
  - evidence: `A1 + A2 + A4`
  - status: `merged`
- F4 `high` `invalidity`:
  - summary: declaration carrier 的目标函数应优先最小化 authoring ambiguity，lowering 不能作为并列主目标
  - evidence: `A2 + A4`
  - status: `merged`
- F5 `medium` `invalidity`:
  - summary: dual-carrier hybrid 在本轮是预设 blocker，不应继续保留为常规 finalist
  - evidence: `A2 + A3`
  - status: `merged`

### Counter Proposals

- P1:
  - summary: `from+logic carrier`
  - why_better: `更贴近当前 live substrate`
  - overturns_assumptions:
  - resolves_findings:
  - supersedes_proposals:
  - dominance: `none`
  - axis_scores:
    - concept-count: `worse`
    - public-surface: `worse`
    - compat-budget: `same`
    - migration-cost: `partial`
    - proof-strength: `partial`
    - future-headroom: `worse`
  - status: `rejected`
- P2:
  - summary: `explicit dual-carrier hybrid`
  - why_better: `更诚实现状`
  - overturns_assumptions:
  - resolves_findings:
  - supersedes_proposals:
  - dominance: `none`
  - axis_scores:
    - concept-count: `worse`
    - public-surface: `worse`
    - compat-budget: `same`
    - migration-cost: `same`
    - proof-strength: `partial`
    - future-headroom: `worse`
  - status: `rejected`
- P3:
  - summary: `SYN-20 single-slot declaration closure on Form.make`
  - why_better: `公开面只承认 Form.make(..., declarationSlot) 这一条 carrier；from+logic/config.logic 全部降为 residue 或 falsification evidence`
  - overturns_assumptions:
  - resolves_findings: `F1, F2, F3, F4, F5`
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

- `A1/A2/A3/A4` 当前全部转为 `kept`
- `P3` -> `adopted`
- `from+logic carrier` 与 `dual-carrier hybrid` 退出 finalist 集合
- winner 改写为 `single-slot declaration closure`，builder 只作为 slot 内 grammar 的当前 exact spelling

## Adoption

- adopted_candidate: `SYN-20 single-slot declaration closure on Form.make`
- lineage: `ALT-A1-1 + ALT-A2-1 + ALT-A4-1`
- rejected_alternatives: `P1, P2`
- rejection_reason: `from+logic 与 hybrid 都会让 canonical/public authority 持续分叉，无法通过 Godel gate`
- dominance_verdict: `SYN-20 在 concept-count, public-surface, proof-strength, future-headroom 上形成直接改进，并通过 Ramanujan / Kolmogorov / Godel 三重 gate`

### Freeze Record

- adopted_summary: `Form 当前最强 declaration carrier 是 Form.make(..., declarationSlot) 这一条单 slot 闭包。builder 是 slot 内 grammar 的当前 exact spelling；from+logic/config.logic 不再属于 surviving public carrier。`
- kernel_verdict: `通过。当前应优先最小化 authoring ambiguity；lowering 只保留为 proof-strength 与 residue 边界问题。`
- frozen_decisions:
  - `Form.make(id, config, declarationSlot)` 是唯一 surviving public declaration carrier
  - `Form.from(...).logic(...)` 退出 surviving public carrier
  - `config.logic` 退出 surviving public carrier
  - `FormLogicSpec` 只允许停在 internal lowering residue 或 falsification evidence
  - dual-carrier hybrid 直接拒绝
- non_goals:
  - 本轮不决定 builder grammar 的最终 helper 明细
  - 本轮不开始实现删除 root export / tests / comments 中的 from+logic
  - 本轮不处理 composition law，本轴只审 carrier
- allowed_reopen_surface:
  - builder grammar 的具体 helper 细化
  - single internal declaration IR 的最终定义
  - from+logic residue 的最终保留层级
- proof_obligations:
  - root export、注释、测试名、canonical wording 必须同步把 `Form.from(...).logic(...)` 去 public 化
  - builder 只允许 lower 到一个未公开 declaration IR；若多于一个 lowering surface，视为 carrier 失败
  - 任何 future challenger 都必须先证明不会重新引入第二 declaration carrier
- delta_from_previous_round: `从 carrier 候选混杂，压到 Form.make(..., declarationSlot) 的单 slot 闭包`

## Consensus

- reviewers: `A1, A2, A3, A4`
- adopted_candidate: `SYN-20 single-slot declaration closure on Form.make`
- final_status: `closed`
- stop_rule_satisfied: `true`
- residual_risk:
  - 当前实现、barrel、DSL 注释、canonical tests 仍把 `from+logic` 当 live path；若不继续 cutover，会继续制造“冻结 law 与活体证据不一致”的噪声
  - builder grammar 细项还没单独收口，但这不改变当前单 slot carrier 裁决
