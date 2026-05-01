# I18n Catalog Registration Contract Review Ledger

## Meta

- target: `docs/proposals/i18n-catalog-registration-contract.md`
- targets:
  - `docs/proposals/i18n-catalog-registration-contract.md`
  - `docs/proposals/form-rule-builtin-i18n-catalog-contract.md`
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
  - target_claim: `catalog registration owner 固定为 app bootstrap；form 只导出 plain locale assets；i18n core 不新增注册 helper；merge precedence 为 app overrides last-wins；locale bucket key 由应用解释`
  - non_default_overrides:
    - `reviewer_count=4`
    - `challenge_scope=open`
- review_object_manifest:
  - source_inputs:
    - `user request: 这块也去提案 + $plan-optimality-loop 冻结下`
    - `current discussion around @logixjs/form/locales registration`
  - materialized_targets:
    - `docs/proposals/i18n-catalog-registration-contract.md`
  - authority_target:
    - `docs/proposals/i18n-catalog-registration-contract.md`
  - bound_docs:
    - `docs/proposals/form-rule-builtin-i18n-catalog-contract.md`
    - `docs/ssot/runtime/08-domain-packages.md`
    - `packages/i18n/src/internal/driver/i18n.ts`
  - derived_scope: `single cross-domain proposal`
  - allowed_classes:
    - `registration owner`
    - `registration timing`
    - `merge law`
    - `bucket mapping law`
    - `helper boundary`
  - blocker_classes:
    - `second core registration API`
    - `form owning driver adapter policy`
    - `runtime-after-boot registration path`
    - `unfrozen precedence`
  - ledger_target:
    - `docs/review-plan/runs/2026-04-17-i18n-catalog-registration-review.md`
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
- ledger_path: `docs/review-plan/runs/2026-04-17-i18n-catalog-registration-review.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `i18n core 当前不应拥有资源注册模型`
  - status: `kept`
  - resolution_basis: `adopted candidate 明确拒绝 i18n core registration API`
- A2:
  - summary: `form locale assets 只应是 plain dictionary，不携带 runtime metadata`
  - status: `merged`
  - resolution_basis: `本 proposal 不再定义 generic shape，只回指领域 asset contract，并冻结 plain asset 的负边界`
- A3:
  - summary: `app catalog 覆盖 form defaults 是默认 merge law`
  - status: `kept`
  - resolution_basis: `adopted candidate 固定 app override layer last-wins`
- A4:
  - summary: `locale export noun 与 driver bucket key 应解耦`
  - status: `kept`
  - resolution_basis: `adopted candidate 固定 export noun 与 bucket key 解耦，bucket mapping owner 停在 application bootstrap`

## Round 1

### Phase

- challenge

### Input Residual

- none

### Findings

- F1 `high` `invalidity`: `bucket mapping owner` 仍有双口径；提案一处写 app owner，一处写 app 或 adapter 解释，形成软双 authority
- F2 `medium` `ambiguity`: `current problem` 把 `app direct merge` 写成漂移，但 adopted candidate 又以 app bootstrap merge 为 canonical path，正文自撞
- F3 `medium` `invalidity`: proposal 额外长出 generic catalog shape，和 form proposal 的 asset contract 重复
- F4 `high` `invalidity`: `zero-unresolved` 下缺失跨领域 default catalogs 的 collision law，默认 merge 顺序会偷偷变成语义来源
- F5 `medium` `ambiguity`: local helper 的合法边界还不够正式，容易让 adapter-local helper 偷带 policy
- F6 `medium` `controversy`: plain locale asset 的 portability 边界未显式写明，容易被误解成任意 driver 直接可注册

### Counter Proposals

- P1:
  - why_better: `application bootstrap` 收成 registration、merge order、bucket mapping 的唯一 owner，压掉软双 authority
  - overturns_assumptions:
    - `A1`
    - `A4`
  - resolves_findings:
    - `F1`
    - `F5`
  - supersedes_proposals:
    - none
  - dominance: `dominates`
  - axis_scores:
    - concept-count: `better`
    - public-surface: `same`
    - compat-budget: `same`
    - migration-cost: `same`
    - proof-strength: `better`
    - future-headroom: `better`
- P2:
  - why_better: 增加 cross-domain default collision law，避免 merge 顺序变成隐式 owner
  - overturns_assumptions:
    - `A3`
  - resolves_findings:
    - `F4`
  - supersedes_proposals:
    - none
  - dominance: `dominates`
  - axis_scores:
    - concept-count: `same`
    - public-surface: `same`
    - compat-budget: `same`
    - migration-cost: `same`
    - proof-strength: `better`
    - future-headroom: `better`
- P3:
  - why_better: 删除 generic catalog noun，只保留 registration law 与 negative boundary，压掉影子合同
  - overturns_assumptions:
    - `A2`
  - resolves_findings:
    - `F3`
    - `F6`
  - supersedes_proposals:
    - none
  - dominance: `dominates`
  - axis_scores:
    - concept-count: `better`
    - public-surface: `same`
    - compat-budget: `same`
    - migration-cost: `same`
    - proof-strength: `better`
    - future-headroom: `better`

### Resolution Delta

- `F1` `open`
- `F2` `open`
- `F3` `open`
- `F4` `open`
- `F5` `open`
- `F6` `open`
- `P1` `open`
- `P2` `open`
- `P3` `open`

## Adoption

- adopted_candidate: `application-bootstrap-single-owner registration law`
- lineage:
  - `baseline proposal`
  - `P1`
  - `P2`
  - `P3`
- rejected_alternatives:
  - `i18n core register helper`
  - `form install helper`
  - `adapter-owned mapping policy`
  - `merge-order-based domain default resolution`
- rejection_reason:
  - `violates single owner or introduces second contract`
- dominance_verdict:
  - `through Ramanujan/Kolmogorov/Godel gates`

### Freeze Record

- adopted_summary:
  - `application bootstrap` 是 registration、merge order、bucket mapping 的唯一 owner
  - domain default catalogs 必须使用稳定且互不冲突的 namespace
  - cross-domain default collision 视为 authoring error
  - app override layer 固定 last-wins
  - local helper 只允许 mechanical lowering，不得拥有 policy
  - portability 继续是 non-goal
- kernel_verdict:
  - `Ramanujan`: 压掉 adapter-owner 与 generic catalog noun
  - `Kolmogorov`: 不增 public surface，同时提高 proof strength
  - `Godel`: 去掉软双 authority 与影子合同
- frozen_decisions:
  - `@logixjs/form/locales` 只导出 plain locale assets
  - `I18n.layer(driver)` 继续只吃 driver
  - `@logixjs/i18n` core 不新增 catalog registration API
  - `@logixjs/form` 不新增 install helper
- non_goals:
  - `render boundary`
  - `driver-specific adapter implementation`
  - `lazy loading / code splitting`
  - `per-locale subpath`
- allowed_reopen_surface:
  - `application-owned mechanical helper`
  - `bucket key freeze with cross-driver proof`
  - `shared asset contract after multiple domain packages`
- proof_obligations:
  - `updated proposal text must remove owner drift`
  - `updated proposal text must remove generic catalog noun`
  - `updated proposal text must add cross-domain collision law and helper legality`
- delta_from_previous_round:
  - `baseline -> adopted candidate via P1/P2/P3`

## Consensus

- reviewers:
  - `Tesla`
  - `Peirce`
  - `Plato`
  - `Pauli`
- adopted_candidate:
  - `application-bootstrap-single-owner registration law`
- final_status:
  - `已达成共识`
- stop_rule_satisfied:
  - `true`
- residual_risk:
  - `cross-domain default collision` 的静态检测、报错落点与实施期验证门仍需后续 SSoT 和实现层补齐
  - `application bootstrap` 单一 owner、`authoring error` collision law 与 `mechanical lowering` 边界在后续 SSoT、tutorial、examples 回写时仍需保持一致
