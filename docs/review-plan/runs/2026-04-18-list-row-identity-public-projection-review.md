# List Row Identity Public Projection Review Ledger

## Meta

- target: `specs/149-list-row-identity-public-projection/spec.md`
- targets:
  - `specs/149-list-row-identity-public-projection/spec.md`
  - `specs/149-list-row-identity-public-projection/plan.md`
  - `specs/149-list-row-identity-public-projection/checklists/requirements.md`
  - `docs/ssot/form/03-kernel-form-host-split.md`
  - `docs/ssot/form/06-capability-scenario-api-support-map.md`
  - `docs/ssot/form/13-exact-surface-contract.md`
  - `docs/ssot/runtime/10-react-host-projection-boundary.md`
  - `docs/ssot/form/01-current-capability-map.md`
  - `docs/ssot/form/02-gap-map-and-target-direction.md`
  - `docs/internal/toolkit-candidate-ledger.md`
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
  - `authority target=specs/149-list-row-identity-public-projection/spec.md`
  - `bound docs=specs/149-list-row-identity-public-projection/plan.md,specs/149-list-row-identity-public-projection/checklists/requirements.md,docs/ssot/form/03-kernel-form-host-split.md,docs/ssot/form/06-capability-scenario-api-support-map.md,docs/ssot/form/13-exact-surface-contract.md,docs/ssot/runtime/10-react-host-projection-boundary.md,docs/ssot/form/01-current-capability-map.md,docs/ssot/form/02-gap-map-and-target-direction.md,docs/internal/toolkit-candidate-ledger.md`
  - `source inputs=examples/logix-react/src/form-support.ts,packages/logix-form/test/internal/Internal.RowId.test.ts,packages/logix-form/test/Form/Form.FieldArray.ExactSurface.test.ts`
- review_contract:
  - `artifact_kind=ssot-contract`
  - `review_goal=zero-unresolved`
  - `target_claim=把 list row identity public projection 收成下一条最强的 core probe：probe selection basis 可机械复核，row roster projection 不长第二 identity，projection legality 封住 render-only loophole，required witness set 与 non-goals 清晰且不抢跑 exact noun/import shape`
  - `non_default_overrides=reviewers:4,challenge_scope:open,A4:enabled`
- review_object_manifest:
  - `source_inputs=form-support residue + rowId tests + exact fieldArray surface test`
  - `materialized_targets=specs/149-list-row-identity-public-projection/spec.md,specs/149-list-row-identity-public-projection/plan.md,specs/149-list-row-identity-public-projection/checklists/requirements.md,docs/ssot/form/03-kernel-form-host-split.md,docs/ssot/form/06-capability-scenario-api-support-map.md,docs/ssot/form/13-exact-surface-contract.md,docs/ssot/runtime/10-react-host-projection-boundary.md,docs/ssot/form/01-current-capability-map.md,docs/ssot/form/02-gap-map-and-target-direction.md,docs/internal/toolkit-candidate-ledger.md`
  - `authority_target=specs/149-list-row-identity-public-projection/spec.md`
  - `bound_docs=specs/149-list-row-identity-public-projection/plan.md,specs/149-list-row-identity-public-projection/checklists/requirements.md,docs/ssot/form/03-kernel-form-host-split.md,docs/ssot/form/06-capability-scenario-api-support-map.md,docs/ssot/form/13-exact-surface-contract.md,docs/ssot/runtime/10-react-host-projection-boundary.md,docs/ssot/form/01-current-capability-map.md,docs/ssot/form/02-gap-map-and-target-direction.md,docs/internal/toolkit-candidate-ledger.md`
  - `derived_scope=probe selection dominance + row roster projection theorem + projection legality + required witness set`
  - `allowed_classes=selection basis,owner tuple,row roster theorem,projection legality,residue classification,required witness set,non-goals,reopen bar`
  - `blocker_classes=double authority,field-ui dominance gap,render-only second identity,trackBy missing loophole,missing witness set,hidden helper family commitment`
  - `ledger_target=docs/review-plan/runs/2026-04-18-list-row-identity-public-projection-review.md`
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
- ledger_path: `docs/review-plan/runs/2026-04-18-list-row-identity-public-projection-review.md`
- writable: `true`

## Assumptions

- `A1`:
  - `summary=spec.md 可以同时做 authority target，并在冲突时继续让外部 live authority 自动获胜`
  - `status=overturned`
  - `resolution_basis=spec.md 已改成 probe closure 单点，bound docs 只作 imported axioms`
- `A2`:
  - `summary=row identity 优先于 field-ui 只要能讲清楚就够，不需要显式 dominance basis`
  - `status=overturned`
  - `resolution_basis=spec.md 已新增 Dominance Table 与 Selection Basis`
- `A3`:
  - `summary=pure(rowId) 是自明概念，不需要 legality 定义也能关掉 render-only second identity`
  - `status=overturned`
  - `resolution_basis=spec.md 已新增 Projection Legality 与 admissibility rules`
- `A4`:
  - `summary=当前内部 rowId tests 与 exact handle test 已足以支撑公开 projection theorem`
  - `status=overturned`
  - `resolution_basis=spec.md 与 plan.md 已显式列出 Required Witness Set 与 landing gate`

## Round 1

### Phase

- `challenge`

### Input Residual

- `none`

### Findings

- `F1` `blocker` `invalidity`:
  - `summary=authority target 自降级，形成双重 authority`
  - `evidence=spec authority split + bound docs`
  - `status=adopted`
- `F2` `blocker` `invalidity`:
  - `summary=row identity 相对 field-ui 的 dominance proof 缺失`
  - `evidence=spec + exact surface + current ledger`
  - `status=adopted`
- `F3` `high` `invalidity`:
  - `summary=render-only id loophole 未封口，pure(rowId) 未定义`
  - `evidence=spec theorem + form-support residue + internal rowId fallback tests`
  - `status=adopted`
- `F4` `high` `invalidity`:
  - `summary=verification proof 只到 witness 名称，未绑定 required witness set`
  - `evidence=spec edge cases + existing tests`
  - `status=adopted`
- `F5` `medium` `controversy`:
  - `summary=queue authority 写进 spec，未来排序变化会让 theorem contract 漂移`
  - `evidence=spec FR/SC + gap map + ledger`
  - `status=adopted`

### Counter Proposals

- `P1`:
  - `summary=把 spec.md 收成 probe closure 单点 authority，bound docs 只作 imported axioms`
  - `why_better=消掉双重 authority 与假闭合`
  - `overturns_assumptions=A1`
  - `resolves_findings=F1`
  - `supersedes_proposals=spec defers to external authority`
  - `dominance=dominates`
  - `axis_scores=concept-count +, public-surface 0, compat-budget 0, migration-cost 0, proof-strength ++, future-headroom +`
  - `status=adopted`
- `P2`:
  - `summary=新增 Probe Selection Dominance，显式比较 row identity 与 field-ui`
  - `why_better=把选题从口头偏好收成可复核证据`
  - `overturns_assumptions=A2`
  - `resolves_findings=F2`
  - `supersedes_proposals=selection rationale only`
  - `dominance=dominates`
  - `axis_scores=concept-count 0, public-surface 0, compat-budget 0, migration-cost 0, proof-strength ++, future-headroom +`
  - `status=adopted`
- `P3`:
  - `summary=新增 Projection Legality，显式区分 legal projection、residue fallback、proof failure`
  - `why_better=封住 render-only second identity 与 fallback loophole`
  - `overturns_assumptions=A3`
  - `resolves_findings=F3`
  - `supersedes_proposals=pure(rowId) as implicit notion`
  - `dominance=dominates`
  - `axis_scores=concept-count 0, public-surface 0, compat-budget 0, migration-cost 0, proof-strength +++, future-headroom ++`
  - `status=adopted`
- `P4`:
  - `summary=把 witness 绑定成 Required Witness Set，并在 plan 里写 Future Landing Gate`
  - `why_better=proof 从 witness 名称升级成 landing gate`
  - `overturns_assumptions=A4`
  - `resolves_findings=F4`
  - `supersedes_proposals=edge cases only`
  - `dominance=dominates`
  - `axis_scores=concept-count 0, public-surface 0, compat-budget 0, migration-cost 0, proof-strength +++, future-headroom +`
  - `status=adopted`
- `P5`:
  - `summary=把“当前下一条 probe” authority 留在 gap map 与 ledger，spec 只持有为何被选中的理由`
  - `why_better=减少 theorem contract 的队列漂移面`
  - `overturns_assumptions=A2`
  - `resolves_findings=F5`
  - `supersedes_proposals=queue ranking in spec FR/SC`
  - `dominance=dominates`
  - `axis_scores=concept-count +, public-surface 0, compat-budget 0, migration-cost 0, proof-strength +, future-headroom ++`
  - `status=adopted`

### Resolution Delta

- `F1` `adopted`
- `F2` `adopted`
- `F3` `adopted`
- `F4` `adopted`
- `F5` `adopted`
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
  - `R1: single-authority row identity probe closure with dominance basis, legality matrix, required witness set, and queue authority externalized`
- lineage:
  - `P1`
  - `P2`
  - `P3`
  - `P4`
  - `P5`
- rejected_alternatives:
  - `keep spec as pointer page`
  - `leave field-ui comparison implicit`
  - `leave pure(rowId) undefined`
  - `treat internal fallback as witness`
- rejection_reason:
  - `这些方向都会降低 proof-strength，或重新长出 render-only second identity 与 authority drift`
- dominance_verdict:
  - `R1 在 proof-strength 与 future-headroom 上严格优于 baseline，同时不增加 public surface`

### Freeze Record

- adopted_summary:
  - `spec.md 单点持有 probe closure；dominance basis 明确说明 row identity 为何先于 field-ui；Projection Legality 封住 render-only loophole；Required Witness Set 与 Future Landing Gate 收口证明义务；queue authority 继续留在 gap map 与 ledger`
- kernel_verdict:
  - `通过 Ramanujan/Kolmogorov/Godel 三重 gate`
- frozen_decisions:
  - `row identity probe closure 固定为 single-authority spec`
  - `field-ui 当前继续 deferred`
  - `render-only local id 不得进入 public witness`
  - `internal fallback 与 example residue 继续只算 residue 或 proof failure`
  - `queue ordering 不进入 spec FR/SC authority`
- non_goals:
  - `exact noun`
  - `import shape`
  - `完整 useFormList helper family`
  - `field-ui reopen`
  - `公开 helper 立即 landing`
- allowed_reopen_surface:
  - `exact noun`
  - `import shape`
  - `lawful projection 若要进一步放宽的 admissibility`
  - `required witness set 扩充`
  - `field-ui 未来独立 reopen`
- proof_obligations:
  - `不得重新长出第二 identity truth`
  - `不得把 residue fallback 升成 witness`
  - `必须能按 dominance basis 复核 row identity > field-ui`
  - `后续 landing 前必须补齐 required witness set`
- delta_from_previous_round:
  - `authority target 从指针页压成单点 closure`
  - `新增 dominance table`
  - `新增 legality matrix`
  - `新增 required witness set`
  - `把 queue authority 压回 gap map 与 ledger`

## Round 2

### Phase

- `converge`

### Input Residual

- `检查 authority target、dominance basis、projection legality、required witness set 与 queue authority externalization 是否全部闭合`

### Findings

- `none`

### Counter Proposals

- `none`

### Resolution Delta

- `spec.md 已成为 single-authority probe closure`
- `row identity > field-ui 的 dominance basis 已显式化`
- `render-only fallback 已归入 residue 或 proof failure`
- `required witness set 与 future landing gate 已绑定`
- `queue authority 已留在 gap map 与 ledger`
- `reviewers A1/A2/A3/A4 converged to no unresolved findings`

## Consensus

- reviewers:
  - `A1`
  - `A2`
  - `A3`
  - `A4`
- adopted_candidate:
  - `R1`
- final_status:
  - `closed`
- stop_rule_satisfied:
  - `true`
- residual_risk:
  - `Required Witness Set 仍是后续 landing 门禁，当前并不等于公开 helper 已有完整证明。`
