# React Host Specialized API Cut Review Ledger

## Meta

- target: `docs/proposals/react-host-specialized-api-cut-contract.md`
- targets:
  - `docs/proposals/react-host-specialized-api-cut-contract.md`
  - `docs/ssot/runtime/01-public-api-spine.md`
  - `docs/ssot/runtime/03-canonical-authoring.md`
  - `docs/ssot/runtime/07-standardized-scenario-patterns.md`
  - `docs/ssot/runtime/10-react-host-projection-boundary.md`
  - `docs/ssot/runtime/11-toolkit-layer.md`
  - `docs/ssot/runtime/12-toolkit-candidate-intake.md`
  - `docs/standards/logix-api-next-guardrails.md`
  - `packages/logix-react/README.md`
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
  - `authority target=docs/proposals/react-host-specialized-api-cut-contract.md`
  - `bound docs=runtime/01, runtime/03, runtime/07, runtime/10, runtime/11, runtime/12, guardrails, packages/logix-react/README.md`
  - `source inputs include useLocalModule/useLayerModule/ModuleScope/useModule implementations and public package surface`
- review_contract:
  - `artifact_kind=ssot-contract`
  - `review_goal=zero-unresolved`
  - `target_claim=冻结 React host specialized residue 的去向裁决，切掉 useLocalModule/useLayerModule/ModuleScope family/useModule(ModuleImpl) 这组 public route 残留，只允许明确绑定 authority 的未来 reopen`
  - `non_default_overrides=reviewers:4,challenge_scope:open,A4:enabled`
- review_object_manifest:
  - `source_inputs=proposal + runtime ssot + toolkit authority + guardrails + logix-react public surface + implementations`
  - `materialized_targets=docs/proposals/react-host-specialized-api-cut-contract.md`
  - `authority_target=docs/proposals/react-host-specialized-api-cut-contract.md`
  - `bound_docs=docs/ssot/runtime/01-public-api-spine.md,docs/ssot/runtime/03-canonical-authoring.md,docs/ssot/runtime/07-standardized-scenario-patterns.md,docs/ssot/runtime/10-react-host-projection-boundary.md,docs/ssot/runtime/11-toolkit-layer.md,docs/ssot/runtime/12-toolkit-candidate-intake.md,docs/standards/logix-api-next-guardrails.md,packages/logix-react/README.md`
  - `derived_scope=react host specialized API cut contract`
  - `allowed_classes=public contract closure,toolkit boundary,specialized residue disposition,reopen authority,export/doc alignment`
  - `blocker_classes=second host law,second assembly route,preserved historical noun,ambiguous delete/downgrade boundary,duplicated authority,stale public reachability,adjacent consumer law bleed`
  - `ledger_target=docs/review-plan/runs/2026-04-18-react-host-specialized-api-cut-review.md`
- challenge_scope: `open`
- reviewer_set:
  - `A1 structure-purity`
  - `A2 token-economy`
  - `A3 dominance-search`
  - `A4 goal-function-challenge`
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
- ledger_path: `docs/review-plan/runs/2026-04-18-react-host-specialized-api-cut-review.md`
- writable: `true`

## Assumptions

- `AS1`:
  - `summary=只要清掉 root barrel，就等于 specialized residue 已退出 public contract`
  - `status=overturned`
  - `resolution_basis=A3/A4 一致要求 closure 升级为 full public reachability，包括 export map、subpath、aggregator object`
- `AS2`:
  - `summary=useModule(ModuleImpl) 可以停在公开降级或 expert 路径`
  - `status=overturned`
  - `resolution_basis=A1/A3/A4 一致要求它退出一切 sanctioned public contract，只允许 internal/test residue`
- `AS3`:
  - `summary=ModuleScope.make(...) 足以代表 ModuleScope 整个裁决对象`
  - `status=overturned`
  - `resolution_basis=A1/A4 认定真正的残留对象是 ModuleScope family，不只是一条 make`
- `AS4`:
  - `summary=本 proposal 可以自带 future toolkit reopen gate`
  - `status=overturned`
  - `resolution_basis=A2/A3 一致要求 future reopen 全部回到 runtime/12 单点 authority`
- `AS5`:
  - `summary=本 proposal 可以顺手冻结 useDispatch、ModuleRuntime/ModuleRef consumer route 与 adjunct helper`
  - `status=overturned`
  - `resolution_basis=A2/A3 一致要求收窄 authority，只裁决这组 residue`

## Round 1

### Phase

- `challenge`

### Input Residual

- `none`

### Findings

- `F1` `blocker` `invalidity`:
  - `summary=proposal 过长，重复承载现有 SSoT 基线与本地 reopen 规则，形成准 authority 与第二门禁`
  - `evidence=A2,A3`
  - `status=adopted`
- `F2` `blocker` `invalidity`:
  - `summary=closure 标准过窄，只盯 root surface，未覆盖 full public reachability`
  - `evidence=A3,A4`
  - `status=adopted`
- `F3` `blocker` `invalidity`:
  - `summary=useModule(ModuleImpl) 去向未单值化，仍保留公开降级活口`
  - `evidence=A1,A3,A4`
  - `status=adopted`
- `F4` `high` `invalidity`:
  - `summary=ModuleScope 需要按 family 级别裁决，当前只审 make 粒度过小`
  - `evidence=A1,A4`
  - `status=adopted`
- `F5` `high` `invalidity`:
  - `summary=proposal 夹带冻结相邻 consumer surface，authority 越界`
  - `evidence=A2,A3`
  - `status=adopted`

### Counter Proposals

- `P1`:
  - `summary=把 proposal 压成短 delta contract，只保留 claim、disposition matrix、future authority、writeback matrix`
  - `why_better=消掉准 authority 膨胀，降低 drift`
  - `overturns_assumptions=AS4,AS5`
  - `resolves_findings=F1,F5`
  - `supersedes_proposals=long-form mixed proposal`
  - `dominance=dominates`
  - `axis_scores=concept-count ++, public-surface +, compat-budget +, migration-cost +, proof-strength ++, future-headroom ++`
  - `status=adopted`
- `P2`:
  - `summary=把 closure 标准升级为 @logixjs/react 全 public reachability cut`
  - `why_better=封住 root barrel 之外的公开侧门`
  - `overturns_assumptions=AS1`
  - `resolves_findings=F2`
  - `supersedes_proposals=root-surface-only cut`
  - `dominance=dominates`
  - `axis_scores=concept-count +, public-surface ++, compat-budget +, migration-cost 0, proof-strength ++, future-headroom ++`
  - `status=adopted`
- `P3`:
  - `summary=把 useModule(ModuleImpl) 冻结为 delete-current-route + internal/test-only residue + core-reopen-only`
  - `why_better=消掉公开半开状态`
  - `overturns_assumptions=AS2`
  - `resolves_findings=F3`
  - `supersedes_proposals=downgrade-from-root/expert-keep`
  - `dominance=dominates`
  - `axis_scores=concept-count ++, public-surface ++, compat-budget +, migration-cost 0, proof-strength ++, future-headroom ++`
  - `status=adopted`
- `P4`:
  - `summary=把 ModuleScope 升级为 family-level cut contract，并移除任何本地 future bucket`
  - `why_better=封住 family 结构与 transport 语义回流`
  - `overturns_assumptions=AS3`
  - `resolves_findings=F4`
  - `supersedes_proposals=make-only cut`
  - `dominance=dominates`
  - `axis_scores=concept-count ++, public-surface ++, compat-budget +, migration-cost 0, proof-strength ++, future-headroom ++`
  - `status=adopted`
- `P5`:
  - `summary=把 future toolkit reopen authority 全部委托给 runtime/12；本页只保留 residue disposition`
  - `why_better=消掉第二套 toolkit 准入规则`
  - `overturns_assumptions=AS4`
  - `resolves_findings=F1`
  - `supersedes_proposals=local reopen gate`
  - `dominance=dominates`
  - `axis_scores=concept-count ++, public-surface +, compat-budget +, migration-cost +, proof-strength ++, future-headroom ++`
  - `status=adopted`
- `P6`:
  - `summary=本页 authority 收窄到这组 residue，不再冻结相邻 consumer route`
  - `why_better=防止 cut contract 长成新的 exact-surface authority`
  - `overturns_assumptions=AS5`
  - `resolves_findings=F5`
  - `supersedes_proposals=mixed residue + consumer contract`
  - `dominance=dominates`
  - `axis_scores=concept-count ++, public-surface +, compat-budget 0, migration-cost +, proof-strength ++, future-headroom +`
  - `status=adopted`

### Resolution Delta

- `F1` `adopted`
- `F2` `adopted`
- `F3` `adopted`
- `F4` `adopted`
- `F5` `adopted`
- `AS1` `overturned`
- `AS2` `overturned`
- `AS3` `overturned`
- `AS4` `overturned`
- `AS5` `overturned`
- `P1` `adopted`
- `P2` `adopted`
- `P3` `adopted`
- `P4` `adopted`
- `P5` `adopted`
- `P6` `adopted`

## Adoption

- adopted_candidate:
  - `C': delta contract with full-public-reachability cut, single-value future authority, and family-level ModuleScope deletion`
- lineage:
  - `P1`
  - `P2`
  - `P3`
  - `P4`
  - `P5`
  - `P6`
- rejected_alternatives:
  - `keep specialized routes in root`
  - `move existing nouns unchanged into toolkit`
  - `ModuleImpl public downgrade/expert keep`
  - `ModuleScope.make-only cut`
  - `local toolkit reopen rules inside proposal`
  - `mixed residue + adjacent consumer exact freeze`
- rejection_reason:
  - `这些方向都会保留第二 host law、第二装配入口、第二 toolkit gate 或新的 exact-surface authority`
- dominance_verdict:
  - `C' 在 concept-count、public-surface、proof-strength、future-headroom 上严格优于 baseline 与第一版 proposal，在零存量用户前提下 migration-cost 不构成阻碍`

### Freeze Record

- adopted_summary:
  - `本轮只冻结这组 residue 的公开去向：它们退出 @logixjs/react 全 public contract；仅 useLocalModule(module/tag, options) 保留 unnamed toolkit-intake future authority，useModule(ModuleImpl) 保留 core-reopen-only future authority，其余对象不保留 sanctioned public future bucket`
- kernel_verdict:
  - `通过 Ramanujan/Kolmogorov/Godel 三重 gate`
- frozen_decisions:
  - `proposal 收成短 delta contract`
  - `closure 标准升级为 full public reachability`
  - `future toolkit reopen authority 统一回到 runtime/12`
  - `useModule(ModuleImpl) 退出一切 sanctioned public contract`
  - `ModuleScope 以 family 级别裁决，不给本地 future bucket`
  - `本页不冻结相邻 consumer route`
- non_goals:
  - `顺手重写 useDispatch 或 ModuleRuntime/ModuleRef consumer contract`
  - `在本页给 future toolkit helper 命名`
  - `为历史 noun 保留 expert public 停车位`
- allowed_reopen_surface:
  - `useLocalModule(module/tag, options) 对应的 unnamed local-program recipe，且必须走 runtime/12`
  - `useModule(ModuleImpl) 的单独 core reopen`
  - `任何和 ScopeRegistry/cross-root transport 相关的新 owner contract`
- proof_obligations:
  - `清理 root/export map/subpath/aggregator/README/examples/SSoT/standards reachability`
  - `清理 ModuleImpl 公开 overload`
  - `清理 ModuleScope family 的标准场景残留`
  - `不在本页之外继续长第二 authority`
- delta_from_previous_round:
  - `proposal 从长叙事改为 delta contract`
  - `closure 从 root-surface-only 升级为 full public reachability`
  - `ModuleImpl 从 downgrade 改为 internal-only residue`
  - `ModuleScope 从 make-only 改为 family-level cut`

## Round 2

### Phase

- `converge`

### Input Residual

- `check C' 是否仍有 unresolved findings`

### Findings

- `none`

### Counter Proposals

- `none`

### Resolution Delta

- `A1/A2/A3/A4 all returned 无 unresolved findings`
- `no reopen accepted`

## Consensus

- status: `closed`
- adopted_candidate: `C'`
- frozen_decisions:
  - `closure 按 full public reachability 判断`
  - `useLayerModule 与 useLocalModule(factory) 不保留 public future bucket`
  - `useLocalModule(module/tag, options) 只保留 unnamed toolkit-intake future authority`
  - `ModuleScope 以 family 级别删除，且本页不给 future bucket`
  - `useModule(ModuleImpl) 只保留 core-reopen-only future authority`
  - `本页不裁决相邻 consumer route`
- residual_risk:
  - `执行期若没有按 writeback matrix 同步清理 export map、subpath、aggregator、README、SSoT 与 standards，会出现 contract 已闭合但 public reachability 仍残留的漂移`
