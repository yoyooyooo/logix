# I18n Literal Token Authoring Contract Review Ledger

## Meta

- target: `docs/proposals/i18n-literal-token-authoring-contract.md`
- targets:
  - `docs/proposals/i18n-literal-token-authoring-contract.md`
  - `docs/ssot/form/13-exact-surface-contract.md`
  - `docs/ssot/runtime/08-domain-packages.md`
- source_kind: `file-spec`
- reviewer_count: `4`
- reviewer_model: `gpt-5.4`
- reviewer_reasoning: `xhigh`
- challenge_scope: `open`
- consensus_status: `reached`

## Bootstrap

- target_complete: `true`
- review_contract:
  - artifact_kind: `ssot-contract`
  - review_goal: `zero-unresolved`
  - target_claim: `引入 I18nLiteralToken，使 canonical message carrier 从单一 I18nMessageToken 升成 I18nMessageToken | I18nLiteralToken；raw string 只在窄 authoring edge 作为 sugar 出现，并立刻 lower 成 literal token`
  - non_default_overrides:
    - `reviewer_count=4`
    - `challenge_scope=open`
- review_object_manifest:
  - source_inputs:
    - `user concern: token-only authoring 对无 i18n 项目过于烦`
    - `question: I18nMessageToken | I18nLiteralToken 是否合理`
  - materialized_targets:
    - `docs/proposals/i18n-literal-token-authoring-contract.md`
  - authority_target:
    - `docs/proposals/i18n-literal-token-authoring-contract.md`
  - bound_docs:
    - `docs/ssot/form/13-exact-surface-contract.md`
    - `docs/ssot/runtime/08-domain-packages.md`
    - `packages/i18n/src/internal/token/token.ts`
  - derived_scope: `single contract proposal`
  - allowed_classes:
    - `message carrier shape`
    - `authoring sugar boundary`
    - `render contract`
    - `single-truth risk`
    - `non-i18n DX`
  - blocker_classes:
    - `string re-enters canonical state`
    - `second authority`
    - `render/authoring t confusion`
    - `unbounded sugar positions`
  - ledger_target:
    - `docs/review-plan/runs/2026-04-17-i18n-literal-token-authoring-review.md`
- challenge_scope: `open`
- reviewer_set:
  - `A1`
  - `A2`
  - `A3`
  - `A4`
- kernel_council:
  - `Ramanujan`
  - `Kolmogorov`
  - `Godel`
- dominance_axes:
  - `concept-count`
  - `public-surface`
  - `compat-budget`
  - `migration-cost`
  - `proof-strength`
  - `future-headroom`
- stop_rule: `Ramanujan gate + Kolmogorov gate + Godel gate`
- reopen_bar: `only if a smaller and stronger contract directly dominates the adopted candidate`
- ledger_path: `docs/review-plan/runs/2026-04-17-i18n-literal-token-authoring-review.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `I18nLiteralToken` 不会把 carrier 重新打成第二系统
  - status: `overturned`
  - resolution_basis: `本轮冻结结论明确不采纳公共 literal union carrier`
- A2:
  - summary: `raw string -> literal token` 的 authoring sugar 比 token-only 更值得引入
  - status: `deferred`
  - resolution_basis: `保留为 future reopen surface，但当前不在公共 carrier 层采纳`
- A3:
  - summary: render side 同时支持 semantic token 与 literal token，不会造成不可接受的 contract 扩张
  - status: `overturned`
  - resolution_basis: `当前 freeze 不改 i18n 公共 carrier 与 render contract`
- A4:
  - summary: 允许窄 authoring sugar 比坚持 token-only 更符合当前目标函数
  - status: `kept`
  - resolution_basis: `作为 future reopen 方向保留，但只允许落在窄 authoring edge 讨论`

## Round 1

### Phase

- challenge

### Input Residual

- none

### Findings

- F1 `high` `invalidity`: 公共 `I18nMessageToken | I18nLiteralToken` union 会把具体 variant 外溢到领域包，增加第二层公开合同
- F2 `high` `invalidity`: `I18nLiteralToken.text` 会把最终展示文本重新带回 canonical truth
- F3 `high` `ambiguity`: raw string sugar allowlist 未闭合，`Form.Error.leaf(...)` 等 expert 路径会跟着被打宽
- F4 `medium` `invalidity`: literal variant 缺少与 semantic token 对称的 budget / canonicalization law
- F5 `high` `invalidity`: 当前证据只覆盖 Form builtin message DX，目标函数不该直接扩大到整个 i18n carrier / render contract

### Counter Proposals

- P1:
  - why_better: 保持 i18n 公共 canonical carrier 不变，避免引入第二公开变体合同
  - overturns_assumptions:
    - `A1`
    - `A3`
  - resolves_findings:
    - `F1`
    - `F2`
    - `F4`
  - supersedes_proposals:
    - none
  - dominance: `dominates`
  - axis_scores:
    - concept-count: `better`
    - public-surface: `better`
    - compat-budget: `same`
    - migration-cost: `same`
    - proof-strength: `better`
    - future-headroom: `better`
- P2:
  - why_better: 若 future 要做 non-i18n DX，只在窄 authoring edge reopen sugar，不先升级公共 carrier
  - overturns_assumptions:
    - `A2`
    - `A4`
  - resolves_findings:
    - `F3`
    - `F5`
  - supersedes_proposals:
    - none
  - dominance: `dominates`
  - axis_scores:
    - concept-count: `better`
    - public-surface: `better`
    - compat-budget: `same`
    - migration-cost: `same`
    - proof-strength: `better`
    - future-headroom: `same`

### Resolution Delta

- `F1` `closed`
- `F2` `closed`
- `F3` `closed`
- `F4` `closed`
- `F5` `closed`
- `P1` `adopted`
- `P2` `adopted`

## Adoption

- adopted_candidate: `reject-public-literal-union-and-keep-sugar-discussion-narrow`
- lineage:
  - `baseline union proposal`
  - `P1`
  - `P2`
- rejected_alternatives:
  - `public I18nMessageToken | I18nLiteralToken carrier`
  - `literal text as public canonical carrier variant`
  - `raw string sugar on Form.Error.leaf/manual error paths`
- rejection_reason:
  - `expands public carrier too early, weakens single truth, and overshoots the proven pain surface`
- dominance_verdict:
  - `adopted candidate dominates on concept-count, public-surface, and proof-strength`

### Freeze Record

- adopted_summary:
  - 当前不采纳把公共 canonical carrier 升成 `I18nMessageToken | I18nLiteralToken`
  - 当前不采纳把 literal 文本直接抬成公共 canonical carrier variant
  - 若 future 要降低 non-i18n 项目的 authoring friction，优先只在窄 authoring edge reopen sugar
  - 在没有单独证明前，不改 i18n 的公共 carrier 与 render contract
- kernel_verdict:
  - `Ramanujan`: 拒绝更大的公共 union，保留更小的 freeze
  - `Kolmogorov`: 不增 noun / union / render branch，压低概念数
  - `Godel`: 拒绝第二 carrier 公开合同与 raw string 回流 canonical truth
- frozen_decisions:
  - `FormErrorLeaf.message` 继续按 `I18nMessageToken` 理解
  - i18n public carrier 与 render contract 当前不改
  - non-i18n DX 若要继续讨论，只能在窄 authoring edge reopen
- non_goals:
  - `public literal token carrier`
  - `global raw string authoring sugar`
  - `Form.Error.leaf/manual error path raw string sugar`
- allowed_reopen_surface:
  - `Form builtin message authoring sugar`
  - `i18n-owned single-noun umbrella contract if future proof emerges`
- proof_obligations:
  - `living SSoT must explicitly reject public literal union for now`
  - `consumed proposal must not keep old candidate in active contract voice`
- delta_from_previous_round:
  - `public union candidate -> rejected`
  - `narrow authoring-edge reopen -> kept as future surface`

## Consensus

- reviewers:
  - `Arendt`
  - `Socrates`
  - `Fermat`
  - `Bohr`
- adopted_candidate:
  - `reject-public-literal-union-and-keep-sugar-discussion-narrow`
- final_status:
  - `已达成共识`
- stop_rule_satisfied:
  - `true`
- residual_risk:
  - future reopen 若再讨论窄 authoring sugar，仍需单独证明 sugar 位置边界、lowering law 与测试门禁
  - consumed proposal 仍保留候选分析过程，后续阅读必须继续以 `Adopted Delta` 和 living SSoT 为准
  - future reopen 若再讨论窄 authoring sugar，仍需单独证明 sugar 位置边界、lowering law 与测试门禁
  - consumed proposal 仍保留较完整候选分析过程，后续阅读必须以 `Adopted Delta` 和 living SSoT 为准
