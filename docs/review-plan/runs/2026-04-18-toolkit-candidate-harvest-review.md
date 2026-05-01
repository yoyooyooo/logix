# Toolkit Candidate Harvest Review Ledger

## Historical Status

- `historical_only=true`
- `current_authority=docs/ssot/runtime/11-toolkit-layer.md,docs/ssot/runtime/12-toolkit-candidate-intake.md,docs/internal/toolkit-candidate-ledger.md,specs/148-toolkit-form-meta-derivation/spec.md`
- `superseded_note=form meta derived view 曾在本 ledger 中被冻结为 toolkit-first-wave；该 placement 现已改判为 core-probe`
- `superseded_by=docs/review-plan/runs/2026-04-18-lightweight-derivation-core-boundary-review.md`

## Meta

- target: `docs/proposals/toolkit-candidate-harvest-from-examples.md`
- targets:
  - `docs/proposals/toolkit-candidate-harvest-from-examples.md`
  - `specs/147-toolkit-layer-ssot/spec.md`
  - `docs/ssot/runtime/11-toolkit-layer.md`
  - `docs/adr/2026-04-18-official-toolkit-layer.md`
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
  - `authority target=docs/proposals/toolkit-candidate-harvest-from-examples.md`
  - `bound docs=specs/147-toolkit-layer-ssot/spec.md,docs/ssot/runtime/11-toolkit-layer.md,docs/adr/2026-04-18-official-toolkit-layer.md`
  - `source inputs include examples residue, call surfaces, Workflow.ts, Logic.ts, and specs/093`
- review_contract:
  - `artifact_kind=ssot-contract`
  - `review_goal=zero-unresolved`
  - `target_claim=冻结 toolkit candidate harvest 的分类法、closed core surfaces、reject/core-only 集与能冻结的 first-wave 候选，并避免 call 方向长出第二 orchestration truth`
  - `non_default_overrides=reviewers:4,challenge_scope:open,A4:enabled`
- review_object_manifest:
  - `source_inputs=examples/logix-react residue + Workflow.ts + Logic.ts + specs/093`
  - `materialized_targets=docs/proposals/toolkit-candidate-harvest-from-examples.md,specs/147-toolkit-layer-ssot/spec.md,docs/ssot/runtime/11-toolkit-layer.md,docs/adr/2026-04-18-official-toolkit-layer.md`
  - `authority_target=docs/proposals/toolkit-candidate-harvest-from-examples.md`
  - `bound_docs=specs/147-toolkit-layer-ssot/spec.md,docs/ssot/runtime/11-toolkit-layer.md,docs/adr/2026-04-18-official-toolkit-layer.md`
  - `derived_scope=toolkit candidate harvest across examples residue and call surfaces`
  - `allowed_classes=candidate classification,closed-core-surface,core-probe,toolkit-first-wave,reject-residue,call-surface boundary`
  - `blocker_classes=unresolved candidate tiering,second orchestration truth,core/toolkit misplacement,stale draft noun family promoted as truth,proposal/spec duplicated authority`
  - `ledger_target=docs/review-plan/runs/2026-04-18-toolkit-candidate-harvest-review.md`
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
- ledger_path: `docs/review-plan/runs/2026-04-18-toolkit-candidate-harvest-review.md`
- writable: `true`

## Assumptions

- `A1`:
  - `summary=这一轮必须尽量列全 toolkit 候选，穷尽列表本身就是成功标准`
  - `status=overturned`
  - `resolution_basis=A4/A2 一致指出成功标准应收成分类法、closed core surfaces、reject 集与极小 first-wave 候选`
- `A2`:
  - `summary=examples residue 与 core law files 可以直接混在同一个候选池里，只要后面再分类`
  - `status=overturned`
  - `resolution_basis=A4/A3 认为 Workflow.ts 与 Logic.ts 应作为 boundary/exclusion evidence，而非候选来源`
- `A3`:
  - `summary=093 draft 可以直接作为当前 call toolkit 候选的正向证据`
  - `status=overturned`
  - `resolution_basis=A1/A3 指出 093 必须先做 carry-forward disposition，不能继续让旧 toolkit noun family 悬空并行`
- `A4`:
  - `summary=当前 proposal 的平面标签足以支撑 zero-unresolved`
  - `status=overturned`
  - `resolution_basis=A1/A2/A3 都要求把候选 contract 收成更短的 legality matrix`

## Round 1

### Phase

- `challenge`

### Input Residual

- `none`

### Findings

- `F1` `blocker` `invalidity`:
  - `summary=候选分类 contract 未闭合，平面标签把去向、成熟度、冻结状态和计划优先级揉在一起`
  - `evidence=toolkit candidate proposal + specs/147`
  - `status=adopted`
- `F2` `blocker` `invalidity`:
  - `summary=call 方向被提得过快，Workflow.ts/Logic.ts 与 093 draft 被混成候选来源，容易长第二 orchestration truth`
  - `evidence=toolkit candidate proposal + Workflow.ts + Logic.ts + specs/093`
  - `status=adopted`
- `F3` `high` `invalidity`:
  - `summary=proposal/spec/ADR/toolkit leaf 重复持有门禁与规则，形成双重维护面`
  - `evidence=proposal + specs/147 + runtime/11 + ADR`
  - `status=adopted`
- `F4` `high` `controversy`:
  - `summary=错误渲染 helper、query snapshot helper、service call recipe 都被高估为第一波候选，proof strength 不足`
  - `evidence=form-support.ts + I18nDemoLayout.tsx + QuerySearchDemoLayout.tsx + specs/093`
  - `status=adopted`

### Counter Proposals

- `P1`:
  - `summary=把 proposal 压成薄 ledger，只持有候选分类法与候选表，不再重复 toolkit 门禁`
  - `why_better=消掉 authority 重复持有，降低 drift`
  - `overturns_assumptions=A4`
  - `resolves_findings=F1,F3`
  - `supersedes_proposals=flattened candidate list with duplicated rules`
  - `dominance=dominates`
  - `axis_scores=concept-count ++, public-surface ++, compat-budget 0, migration-cost +, proof-strength ++, future-headroom 0`
  - `status=adopted`
- `P2`:
  - `summary=把候选分类冻结成四类：closed-core-surface、core-probe、toolkit-first-wave、reject-residue`
  - `why_better=分类法闭合，便于冻结和回写`
  - `overturns_assumptions=A1,A4`
  - `resolves_findings=F1`
  - `supersedes_proposals=toolkit-strong/toolkit-medium/conditional/recipe-only/core-only/reject`
  - `dominance=dominates`
  - `axis_scores=concept-count ++, public-surface ++, compat-budget +, migration-cost +, proof-strength ++, future-headroom +`
  - `status=adopted`
- `P3`:
  - `summary=新增 Closed Core Surfaces 区，先冻结 host/call canonical nouns；Workflow.ts 与 Logic.ts 只作为 boundary/exclusion evidence`
  - `why_better=先把 core law 压实，再防止 toolkit 误吸收 call surface`
  - `overturns_assumptions=A2`
  - `resolves_findings=F2`
  - `supersedes_proposals=call surfaces as immediate toolkit candidate source`
  - `dominance=dominates`
  - `axis_scores=concept-count ++, public-surface ++, compat-budget +, migration-cost +, proof-strength ++, future-headroom +`
  - `status=adopted`
- `P4`:
  - `summary=对 093 做 carry-forward disposition：保留底层真相，拒绝旧 toolkit noun lineage，recipe 只留 cookbook 素材`
  - `why_better=消掉历史 draft 并行路线`
  - `overturns_assumptions=A3`
  - `resolves_findings=F2`
  - `supersedes_proposals=093 as positive toolkit candidate source`
  - `dominance=dominates`
  - `axis_scores=concept-count ++, public-surface ++, compat-budget +, migration-cost +, proof-strength ++, future-headroom +`
  - `status=adopted`
- `P5`:
  - `summary=缩小 first-wave；当前只保留 form meta derived view，其余高估候选全部后撤`
  - `why_better=proof strength 更高，降低误升格风险`
  - `overturns_assumptions=A1,A3`
  - `resolves_findings=F4`
  - `supersedes_proposals=error render helper/query snapshot helper/service call recipe as first-wave strong candidates`
  - `dominance=dominates`
  - `axis_scores=concept-count +, public-surface +, compat-budget 0, migration-cost +, proof-strength ++, future-headroom 0`
  - `status=adopted`

### Resolution Delta

- `F1` `adopted`
- `F2` `adopted`
- `F3` `adopted`
- `F4` `adopted`
- `A1` `overturned`
- `A2` `overturned`
- `A3` `overturned`
- `A4` `overturned`
- `P1` `adopted`
- `P2` `adopted`
- `P3` `adopted`
- `P4` `adopted`
- `P5` `adopted`

## Adoption

- adopted_candidate:
  - `R1: candidate-ledger with four-way classification + closed-core-surfaces + minimal first-wave`
- lineage:
  - `P1`
  - `P2`
  - `P3`
  - `P4`
  - `P5`
- rejected_alternatives:
  - `open-ended exhaustive candidate list`
  - `call surfaces as direct toolkit candidate source`
  - `093 noun lineage carry-forward`
  - `error render helper/query snapshot helper/service call recipe as first-wave`
- rejection_reason:
  - `这些方向都会增加第二 orchestration truth、双重 authority 或 proof-strength 不足的误升格风险`
- dominance_verdict:
  - `R1 在 concept-count、public-surface 与 proof-strength 上严格优于 baseline；保持 future-headroom 的同时显著压缩了分类与 call 边界`

### Freeze Record

- adopted_summary:
  - `当前阶段冻结分类法、closed core surfaces、093 carry-forward disposition、reject/residue 集，以及极小 first-wave toolkit 候选；call 侧先冻边界，不急着冻 concrete toolkit candidate`
- kernel_verdict:
  - `通过 Ramanujan/Kolmogorov/Godel 三重 gate`
- frozen_decisions:
  - `proposal 只持有薄 ledger，不再重复 toolkit 门禁`
  - `候选分类固定为 closed-core-surface / core-probe / toolkit-first-wave / reject-residue`
  - `host/call canonical nouns 先冻结在 Closed Core Surfaces`
  - `Workflow.ts 与 Logic.ts 只作为 boundary/exclusion evidence，不作为 toolkit candidate 来源`
  - `093 只保留底层真相：control-program service call / callById / $.use(Tag) / serviceId 不复制 / stepKey 稳定显式`
  - `093 的 旧 toolkit noun lineage 当前拒绝继承`
  - `当前 first-wave toolkit 候选只保留 form meta derived view`
  - `错误渲染 helper、query snapshot helper、service call recipe 当前全部退出 first-wave`
- non_goals:
  - `穷尽当前阶段能想到的所有 toolkit 候选`
  - `现在就形成 concrete call toolkit candidate`
  - `把 single-demo / historical-draft 证据直接升格`
- allowed_reopen_surface:
  - `call 侧真实 app residue 出现后的 recipe reopen`
  - `field error 读取 contract`
  - `field-ui 叶子合同`
  - `list row identity public contract`
  - `query 多样本 view normalization`
- proof_obligations:
  - `toolkit candidate 必须有 live-residue 级证据`
  - `任何 call 相关 reopen 必须先证明不会长出第二 orchestration truth`
  - `任何候选都必须能给出 de-sugared mapping`
  - `authority target 不再重复 toolkit leaf 的门禁正文`
- delta_from_previous_round:
  - `把开放式候选收集改成分类法冻结`
  - `增加 Closed Core Surfaces`
  - `把 call 方向从强候选退回边界冻结`
  - `把 093 从候选来源改成 carry-forward disposition`
  - `把 first-wave 缩到单一强候选`

## Round 2

### Phase

- `converge`

### Input Residual

- `检查 adopted freeze record 与最新 proposal/spec 是否还有 unresolved findings`

### Findings

- `none`

### Counter Proposals

- `none`

### Resolution Delta

- `all residual findings closed`
- `reviewers A1/A2/A3/A4 all returned no unresolved findings`

## Consensus

- reviewers:
  - `A1`
  - `A2`
  - `A3`
  - `A4`
- adopted_candidate:
  - `R1: candidate-ledger with four-way classification + closed-core-surfaces + minimal first-wave`
- final_status: `closed`
- stop_rule_satisfied: `true`
- residual_risk:
  - `后续若重开 call、field error、field-ui、list row identity 或 query normalization，仍必须坚持 live-residue 证据和 de-sugared mapping 门禁`
  - `form meta derived view 当前只冻结到候选层，具体 noun 与 API 形状仍属于后续独立裁决面`
