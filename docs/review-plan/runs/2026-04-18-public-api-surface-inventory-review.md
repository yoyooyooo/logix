# Public API Surface Inventory Review Ledger

## Meta

- target: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`
- targets:
  - `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`
  - `docs/proposals/react-host-specialized-api-cut-contract.md`
  - `docs/proposals/README.md`
  - `docs/ssot/runtime/01-public-api-spine.md`
  - `docs/ssot/runtime/03-canonical-authoring.md`
  - `docs/ssot/runtime/08-domain-packages.md`
  - `docs/ssot/runtime/10-react-host-projection-boundary.md`
  - `docs/ssot/runtime/11-toolkit-layer.md`
  - `docs/ssot/form/05-public-api-families.md`
  - `docs/ssot/form/13-exact-surface-contract.md`
  - `docs/standards/logix-api-next-guardrails.md`
- source_kind: `file-ssot-contract`
- reviewers:
  - `A1`
  - `A2`
  - `A3`
  - `A4`
- reviewer_model: `gpt-5.4`
- reviewer_reasoning: `xhigh`
- round_count: `2`
- challenge_scope: `open`
- consensus_status: `closed`

## Bootstrap

- target_complete:
  - `authority target=docs/proposals/public-api-surface-inventory-and-disposition-plan.md`
  - `bound docs=docs/proposals/react-host-specialized-api-cut-contract.md,docs/proposals/README.md,docs/ssot/runtime/01-public-api-spine.md,docs/ssot/runtime/03-canonical-authoring.md,docs/ssot/runtime/08-domain-packages.md,docs/ssot/runtime/10-react-host-projection-boundary.md,docs/ssot/runtime/11-toolkit-layer.md,docs/ssot/form/05-public-api-families.md,docs/ssot/form/13-exact-surface-contract.md,docs/standards/logix-api-next-guardrails.md`
  - `source inputs=package export manifests + root barrels + package README + inventory evidence for core/react/form/query/i18n/domain/cli/test/sandbox/devtools`
- review_contract:
  - `artifact_kind=ssot-contract`
  - `review_goal=design-closure`
  - `target_claim=冻结一份面向未来的全仓 public surface 总清单：当前每个公开 entrypoint 都必须绑定 internal chain、authority docs 与 review chunk；旧 API 默认不享有保留资格，任何 static-first 历史概念都必须重新证明自己在 Agent first runtime 下仍有价值，其中 workflow 也属于待挑战概念，不是默认保留概念。`
  - `non_default_overrides=reviewers:4,challenge_scope:open,A4:enabled`
- review_object_manifest:
  - `source_inputs=package.json exports/bin + root barrels + package top-level public files + current authority docs + react specialized sub-proposal + query/i18n live packages`
  - `materialized_targets=docs/proposals/public-api-surface-inventory-and-disposition-plan.md,docs/proposals/react-host-specialized-api-cut-contract.md,docs/proposals/README.md,docs/ssot/runtime/01-public-api-spine.md,docs/ssot/runtime/03-canonical-authoring.md,docs/ssot/runtime/08-domain-packages.md,docs/ssot/runtime/10-react-host-projection-boundary.md,docs/ssot/runtime/11-toolkit-layer.md,docs/ssot/form/05-public-api-families.md,docs/ssot/form/13-exact-surface-contract.md,docs/standards/logix-api-next-guardrails.md`
  - `authority_target=docs/proposals/public-api-surface-inventory-and-disposition-plan.md`
  - `bound_docs=docs/proposals/react-host-specialized-api-cut-contract.md,docs/proposals/README.md,docs/ssot/runtime/01-public-api-spine.md,docs/ssot/runtime/03-canonical-authoring.md,docs/ssot/runtime/08-domain-packages.md,docs/ssot/runtime/10-react-host-projection-boundary.md,docs/ssot/runtime/11-toolkit-layer.md,docs/ssot/form/05-public-api-families.md,docs/ssot/form/13-exact-surface-contract.md,docs/standards/logix-api-next-guardrails.md`
  - `derived_scope=owner-complete public surface inventory + row-wise manifest + internal chain audit + chunking for future API disposition review`
  - `allowed_classes=surface-inventory,entrypoint-taxonomy,row-wise-manifest,owner-boundary,internal-chain-binding,chunking,semantic-disposition,decision-owner,future-authority,related-proposal-binding,review-order,challenge-override-set`
  - `blocker_classes=second-authority,grandfathered-legacy-presumption,missing-public-entrypoint,missing-internal-owner,wildcard-unbounded-surface,docs-code-test drift,hidden-static-first premise`
  - `ledger_target=docs/review-plan/runs/2026-04-18-public-api-surface-inventory-review.md`
- challenge_scope: `open`
- reviewer_set:
  - `A1 structure-purity`
  - `A2 token-economy`
  - `A3 dominance-search`
  - `A4 goal-function-challenge`
- active_advisors:
  - `A4`
- activation_reason: `目标涉及 public contract、长期治理、legacy API 取舍与目标函数重判，必须显式挑战“默认保留旧概念”的前提`
- max_reviewer_count: `4`
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
- stop_rule:
  - `新 proposal 或 reopen 必须同时通过 Ramanujan/Kolmogorov/Godel 三个 gate`
- reopen_bar:
  - `只有在 dominance axes 上形成严格改进，或在核心轴不恶化前提下显著提高 proof-strength，才允许 reopen`
- ledger_path: `docs/review-plan/runs/2026-04-18-public-api-surface-inventory-review.md`
- writable: `true`

## Assumptions

- `A1`:
  - `summary=第一轮先按 package/chunk 冻结总清单，比先逐 noun 细审更利于收敛`
  - `status=overturned`
  - `resolution_basis=必须先有 G0 inventory-normalize gate 与 row-wise manifest，chunk-first 才成立`
- `A2`:
  - `summary=react specialized residue 的局部细判可绑定既有 proposal，不必在总清单里重写`
  - `status=overturned`
  - `resolution_basis=只对已被 specialized cut contract 覆盖的对象成立；剩余 React adjunct/transport residue 必须另开块`
- `A3`:
  - `summary=当前总清单应覆盖 tooling/test/sandbox，而不是只看 core/react/form/domain`
  - `status=merged`
  - `resolution_basis=方向保留，但 package universe 必须扩到 query/i18n，不能只补 tooling/test/sandbox`
- `A4`:
  - `summary=旧 API 默认不享有保留资格；任何 static-first 历史概念都应先被挑战`
  - `status=kept`
  - `resolution_basis=reviewers 一致要求把它写成更硬的 contract：challenge-override + proof gate + default delete 起点`
- `A5`:
  - `summary=workflow 不该因为曾是静态化设想的一部分，就自动保留为公开概念`
  - `status=kept`
  - `resolution_basis=reviewers 一致要求前置为 K1 existence challenge，并显式降格旧 authority 为 witness`

## Round 1

### Phase

- `challenge`

### Input Residual

- `none`

### Findings

- `F1` `blocker` `invalidity`:
  - `summary=authority target 自称“全仓 public surface 总清单”，但缺失 @logixjs/query 与 @logixjs/i18n，missing-public-entrypoint 已成立`
  - `evidence=A1/A2/A4 全部指出 query/i18n 已有 live package exports，却仍被排除在主清单外`
  - `status=adopted`
- `F2` `high` `invalidity`:
  - `summary=disposition vocabulary 混入 routing state，语义 fate 与 decision owner/future authority 没有分轴`
  - `evidence=A1/A2/A4 都指出 hold-by-related-proposal 不属于最终去向，当前 bucket 体系会制造第二 authority`
  - `status=adopted`
- `F3` `high` `invalidity`:
  - `summary=workflow/process/flow/link 的挑战只停在口头目标函数，没有写成 challenge-override 与前置 gate`
  - `evidence=A3/A4 都指出旧 expert-family authority 仍会把 workflow 拉回默认保留位`
  - `status=adopted`
- `F4` `high` `ambiguity`:
  - `summary=C4 把已被 react specialized 子提案覆盖的对象与未覆盖的 React adjunct/transport residue 混在一起`
  - `evidence=A2/A4 都指出当前 C4 范围与 bound proposal 不对齐，会制造重复审查`
  - `status=adopted`
- `F5` `medium` `invalidity`:
  - `summary=当前 proposal 还只是 package 级清单，不是 row-wise manifest，无法兑现“每个 entrypoint 都绑定 internal chain/authority/chunk”的 target claim`
  - `evidence=A3/A4 都要求把 authority target 升成行式 manifest`
  - `status=adopted`
- `F6` `medium` `ambiguity`:
  - `summary=C5/C6/C7 的大包裹结构会制造假聚合与二次审查，治理问题应前置成 G0 gate 或内嵌 checklist`
  - `evidence=A2/A3 都指出当前 chunk topology 收敛成本偏高`
  - `status=adopted`
- `F7` `medium` `ambiguity`:
  - `summary=README / tests 被当成默认证据，但 witness 集没有在 manifest 或 ledger 中显式 materialize`
  - `evidence=A2 指出 target-candidates 与 materialized_targets 不足以支撑 README/test drift 的证明链`
  - `status=adopted`

### Counter Proposals

- `P1`:
  - `summary=owner-complete inventory。补入 Query/I18n，并把顶层 review units 直接按真实 authority 拆开`
  - `why_better=直接消除 missing-public-entrypoint，避免 C5/C6 的假聚合`
  - `overturns_assumptions=A1,A3`
  - `resolves_findings=F1,F6`
  - `supersedes_proposals=package-limited inventory`
  - `dominance=dominates`
  - `axis_scores=concept-count:+1, public-surface:+2, compat-budget:+1, migration-cost:0, proof-strength:+3, future-headroom:+2`
  - `status=adopted`
- `P2`:
  - `summary=row-wise manifest + semantic_disposition/decision_owner/future_authority 三轴分离`
  - `why_better=把 fate、路由、落地方向拆开，减少第二次编码与第二 authority`
  - `overturns_assumptions=A2`
  - `resolves_findings=F2,F5,F7`
  - `supersedes_proposals=single-bucket disposition vocabulary`
  - `dominance=dominates`
  - `axis_scores=concept-count:+3, public-surface:0, compat-budget:0, migration-cost:+1, proof-strength:+3, future-headroom:+2`
  - `status=adopted`
- `P3`:
  - `summary=G0 inventory-normalize gate + K1 orchestration existence challenge + challenge override set`
  - `why_better=先做 blocker sweep，再回答 workflow/process/flow/link 是否还配继续存在`
  - `overturns_assumptions=A1,A4,A5`
  - `resolves_findings=F1,F3,F6`
  - `supersedes_proposals=governance-last / workflow-late-review`
  - `dominance=dominates`
  - `axis_scores=concept-count:+2, public-surface:+2, compat-budget:+1, migration-cost:0, proof-strength:+3, future-headroom:+3`
  - `status=adopted`
- `P4`:
  - `summary=React residue 拆成 R2 bound block 与 R3 adjunct/transport residue`
  - `why_better=让 related proposal 绑定变成可验证事实，避免同块里混审已覆盖对象与未覆盖对象`
  - `overturns_assumptions=A2`
  - `resolves_findings=F4`
  - `supersedes_proposals=single wide C4`
  - `dominance=dominates`
  - `axis_scores=concept-count:+1, public-surface:0, compat-budget:0, migration-cost:+1, proof-strength:+2, future-headroom:+1`
  - `status=adopted`

### Resolution Delta

- `A1` `overturned`
- `A2` `overturned`
- `A3` `merged`
- `A4` `kept`
- `A5` `kept`
- `F1` `adopted`
- `F2` `adopted`
- `F3` `adopted`
- `F4` `adopted`
- `F5` `adopted`
- `F6` `adopted`
- `F7` `adopted`
- `P1` `adopted`
- `P2` `adopted`
- `P3` `adopted`
- `P4` `adopted`

## Adoption

- adopted_candidate:
  - `SYN-1 owner-complete inventory + row-wise manifest + gate-first challenge topology`
- lineage:
  - `P1`
  - `P2`
  - `P3`
  - `P4`
- rejected_alternatives:
  - `维持 package-limited inventory`
  - `把 routing state 混进 disposition bucket`
  - `把 workflow/process/flow/link 继续放到宽 expert 块里后置处理`
  - `让 React bound proposal 覆盖一整个宽 C4`
- rejection_reason:
  - `这些方向都会保留 second authority、漏项 inventory、workflow 默认保留前提或重复审查成本`
- dominance_verdict:
  - `SYN-1 在 proof-strength、future-headroom 与 public-surface closure 上严格优于 baseline，并通过 Ramanujan/Kolmogorov/Godel 三重 gate`

### Freeze Record

- adopted_summary:
  - `总 proposal 改成 owner-complete inventory，并补入 Query/I18n；每条 surface 改成 row-wise manifest；semantic_disposition / decision_owner / future_authority 三轴分离；前置 G0 inventory-normalize gate 与 K1 orchestration existence challenge；React residue 拆成 R2 bound block 与 R3 adjunct/transport residue`
- kernel_verdict:
  - `通过。新方案压掉了 inventory 漏项、bucket 混轴、workflow 默认保留前提与 C4 范围漂移`
- frozen_decisions:
  - `当前 package universe 必须包含 core/react/form/query/i18n/domain/cli/test/sandbox/devtools`
  - `Query/I18n 不再允许留在“未来包”说明里`
  - `总 proposal 必须使用 row-wise manifest`
  - `disposition 只承接语义 fate；routing 与 authority 去向必须分轴`
  - `G0` 是所有 chunk 的前置 gate`
  - `K1` 必须先于 domain/toolkit 相关块`
  - `workflow/process/flow/link` 的旧保留语句在对应 chunk 完成前只算 witness`
  - `React specialized 子提案只覆盖已明示对象，剩余 React adjunct/transport residue 另开块`
- non_goals:
  - `本轮不冻结具体 API patch`
  - `本轮不直接改 live SSoT`
  - `本轮不开始实现`
- allowed_reopen_surface:
  - `row-wise manifest 是否还缺列`
  - `README/test witness 是否已经显式绑定到各块`
  - `Query/I18n inventory 是否仍有漏项`
  - `K1 与 C2 的边界是否还可继续压缩`
- proof_obligations:
  - `每个 entrypoint 都必须落成 manifest row`
  - `每个 row 都必须有 witnesses`
  - `legacy/static-first family 若不是 delete，必须给出 why-not-delete 证明`
  - `related proposal 只允许出现在 decision-owner，不得回流到 semantic disposition`
- delta_from_previous_round:
  - `从 package-level summary 升级为 owner-complete manifest-first review contract`

## Round 2

### Phase

- `converge`

### Input Residual

- `Query/I18n 是否已补入 owner-complete inventory`
- `semantic_disposition / decision_owner / future_authority 是否已分轴`
- `workflow/process/flow/link 的 challenge override 与 K1 前置是否已落盘`
- `React R2/R3 是否已按 bound block 与 adjunct residue 拆开`
- `manifest row 是否已达到 entrypoint 级`
- `witnesses 是否已显式落到文件路径`

### Findings

- `无 unresolved findings`

### Counter Proposals

- `none`

### Resolution Delta

- `all round-1 residuals closed`

## Consensus

- `consensus_status=closed`
- `all_reviewers=无 unresolved findings`
- `stale_results=none`
- `residual_risk=执行阶段仍需把 G0 做成可核对事实，把 K1 的 why-not-delete 证明做扎实，并继续约束单一 entrypoint 内的 family 边界`
