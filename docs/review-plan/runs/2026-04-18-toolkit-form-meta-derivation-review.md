# Toolkit Form Meta Derivation Review Ledger

## Historical Status

- `historical_only=true`
- `current_authority=docs/ssot/runtime/11-toolkit-layer.md,docs/ssot/runtime/12-toolkit-candidate-intake.md,docs/ssot/runtime/10-react-host-projection-boundary.md,docs/ssot/form/13-exact-surface-contract.md,specs/148-toolkit-form-meta-derivation/spec.md`
- `superseded_note=this ledger 保留 candidate-local 收窄历史，但 placement authority 已改到 live ssot`
- `superseded_by=docs/review-plan/runs/2026-04-18-lightweight-derivation-core-boundary-review.md`

## Meta

- target: `docs/proposals/toolkit-form-meta-derived-view.md`
- targets:
  - `docs/proposals/toolkit-form-meta-derived-view.md`
  - `docs/internal/toolkit-candidate-ledger.md`
  - `docs/ssot/runtime/11-toolkit-layer.md`
  - `docs/ssot/runtime/12-toolkit-candidate-intake.md`
  - `docs/ssot/runtime/10-react-host-projection-boundary.md`
  - `specs/147-toolkit-layer-ssot/spec.md`
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
  - `authority target=docs/proposals/toolkit-form-meta-derived-view.md`
  - `bound docs=docs/internal/toolkit-candidate-ledger.md,docs/ssot/runtime/11-toolkit-layer.md,docs/ssot/runtime/12-toolkit-candidate-intake.md,docs/ssot/runtime/10-react-host-projection-boundary.md,specs/147-toolkit-layer-ssot/spec.md`
  - `source inputs=examples/logix-react/src/form-support.ts,packages/logix-react/src/FormProjection.ts,docs/internal/form-api-tutorial.md`
- review_contract:
  - `artifact_kind=ssot-contract`
  - `review_goal=zero-unresolved`
  - `target_claim=在不重新长出第二读侧 contract、第二 host law 或过宽 hook family 的前提下，冻结 form meta derivation 的最小 surviving candidate class、derived schema、forbidden set 与 de-sugared mapping`
  - `non_default_overrides=reviewers:4,challenge_scope:open,A4:enabled`
- review_object_manifest:
  - `source_inputs=form-support residue + FormProjection + tutorial`
  - `materialized_targets=docs/proposals/toolkit-form-meta-derived-view.md,docs/internal/toolkit-candidate-ledger.md,docs/ssot/runtime/11-toolkit-layer.md,docs/ssot/runtime/12-toolkit-candidate-intake.md,docs/ssot/runtime/10-react-host-projection-boundary.md,specs/147-toolkit-layer-ssot/spec.md`
  - `authority_target=docs/proposals/toolkit-form-meta-derived-view.md`
  - `bound_docs=docs/internal/toolkit-candidate-ledger.md,docs/ssot/runtime/11-toolkit-layer.md,docs/ssot/runtime/12-toolkit-candidate-intake.md,docs/ssot/runtime/10-react-host-projection-boundary.md,specs/147-toolkit-layer-ssot/spec.md`
  - `derived_scope=toolkit form meta derivation exact candidate`
  - `allowed_classes=candidate class selection,derived schema,forbidden set,de-sugared mapping,core/toolkit split`
  - `blocker_classes=second read-side contract,second host law,hook family overreach,hidden selector/equality contract,raw passthrough repackaging,submit policy leakage`
  - `ledger_target=docs/review-plan/runs/2026-04-18-toolkit-form-meta-derivation-review.md`
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
- ledger_path: `docs/review-plan/runs/2026-04-18-toolkit-form-meta-derivation-review.md`
- writable: `true`

## Assumptions

- `A1`:
  - `summary=这轮必须在 pure projector / read helper / hook family 三者里直接选定一个 API 形状`
  - `status=overturned`
  - `resolution_basis=A2/A3/A4 一致指出这轮应冻结 surviving candidate class、derived schema、forbidden set 与 de-sugared mapping，不必冻结 exact API shape`
- `A2`:
  - `summary=canSubmit 属于 policy-free derived field，可以进入最小候选`
  - `status=overturned`
  - `resolution_basis=A1/A3/A4 一致指出 canSubmit 带有 submit actionability policy，应退出 exact contract`
- `A3`:
  - `summary=pure projector 可以安全吸收 raw meta passthrough 字段`
  - `status=overturned`
  - `resolution_basis=A1/A2/A3/A4 都认为 raw passthrough 会制造第二 read shape，应继续留在 rawFormMeta route`
- `A4`:
  - `summary=focused proposal 为了自包含，需要重复上游 toolkit 门禁与去向信息`
  - `status=overturned`
  - `resolution_basis=A2 明确要求 proposal 退成 candidate-local contract，仅保留本提案自己的最小闭包`

## Round 1

### Phase

- `challenge`

### Input Residual

- `none`

### Findings

- `F1` `blocker` `invalidity`:
  - `summary=proposal 重复持有上游门禁，文档压缩度不够`
  - `evidence=proposal + toolkit leaf + intake + host boundary + ledger`
  - `status=adopted`
- `F2` `blocker` `invalidity`:
  - `summary=三形状并列过宽，当前只剩一个合法候选类`
  - `evidence=proposal + form-support residue + FormProjection`
  - `status=adopted`
- `F3` `blocker` `invalidity`:
  - `summary=canSubmit 带有 actionability policy，不应进入最小 exact contract`
  - `evidence=proposal + form-support residue + tutorial`
  - `status=adopted`
- `F4` `high` `invalidity`:
  - `summary=raw passthrough 字段被重复打包进 projector，会制造第二 read shape`
  - `evidence=proposal + FormProjection`
  - `status=adopted`
- `F5` `high` `controversy`:
  - `summary=proposal 还未显式封死 handle-bound helper、hook noun、selector/equality/cache contract 等危险路线`
  - `evidence=proposal + form-support residue + runtime host boundary`
  - `status=adopted`

### Counter Proposals

- `P1`:
  - `summary=把 proposal 压成 candidate-local contract，只保留目标问题、derived schema、de-sugared mapping、forbidden set、surviving candidate class`
  - `why_better=消掉门禁重复与多余回写说明`
  - `overturns_assumptions=A4`
  - `resolves_findings=F1`
  - `supersedes_proposals=proposal self-contained repetition`
  - `dominance=dominates`
  - `axis_scores=concept-count ++, public-surface ++, compat-budget 0, migration-cost +, proof-strength +`
  - `status=adopted`
- `P2`:
  - `summary=把三形状压成二分法：surviving candidate class 只保留 policy-free pure derivation class；read helper 与 hook family 统一进 forbidden set`
  - `why_better=减少第二读侧 contract 风险`
  - `overturns_assumptions=A1`
  - `resolves_findings=F2,F5`
  - `supersedes_proposals=pure projector/read helper/hook family equal comparison`
  - `dominance=dominates`
  - `axis_scores=concept-count ++, public-surface ++, compat-budget +, migration-cost +, proof-strength ++, future-headroom 0`
  - `status=adopted`
- `P3`:
  - `summary=derived schema 只保留真正 derived 的部分：isValid、isPristine；canSubmit 退出，raw passthrough 留在 rawFormMeta route`
  - `why_better=避免 policy 和 raw passthrough 混进候选`
  - `overturns_assumptions=A2,A3`
  - `resolves_findings=F3,F4`
  - `supersedes_proposals=complete meta view / canSubmit included projector`
  - `dominance=dominates`
  - `axis_scores=concept-count ++, public-surface ++, compat-budget +, migration-cost +, proof-strength ++, future-headroom +`
  - `status=adopted`
- `P4`:
  - `summary=把 zero-unresolved 的成功标准收成四点：surviving class、forbidden set、de-sugared mapping、canSubmit out`
  - `why_better=让 stop rule 真正闭合`
  - `overturns_assumptions=A1,A2`
  - `resolves_findings=F2,F3,F5`
  - `supersedes_proposals=choose exact API shape now`
  - `dominance=dominates`
  - `axis_scores=concept-count +, public-surface +, compat-budget 0, migration-cost +, proof-strength ++, future-headroom 0`
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

## Adoption

- adopted_candidate:
  - `R1: policy-free pure derivation class over RawFormMeta, with derived-only schema and explicit forbidden set`
- lineage:
  - `P1`
  - `P2`
  - `P3`
  - `P4`
- rejected_alternatives:
  - `read helper(handle)`
  - `hook family`
  - `complete meta view projector`
  - `canSubmit in exact contract`
  - `raw passthrough repackaging`
- rejection_reason:
  - `这些方向都会增加第二读侧 contract、第二选择面或把页面 submit policy 混入通用读侧`
- dominance_verdict:
  - `R1 在 concept-count、public-surface 与 proof-strength 上严格优于 baseline；同时避免了 canSubmit 和 raw passthrough 带来的 policy/object inflation`

### Freeze Record

- adopted_summary:
  - `当前只冻结 form meta derivation 的 surviving candidate class、最小 derived schema、de-sugared mapping 与 forbidden set；exact API noun 与 public function shape 后置`
- kernel_verdict:
  - `通过 Ramanujan/Kolmogorov/Godel 三重 gate`
- frozen_decisions:
  - `surviving candidate class 只保留 policy-free pure derivation over RawFormMeta`
  - `exact derived schema 当前只保留 isValid 与 isPristine`
  - `isValid = errorCount === 0`
  - `isPristine = !isDirty`
  - `canSubmit` 当前退出 exact contract，继续停在 recipe / app-local policy`
  - `isSubmitting / isDirty / submitCount / errorCount` 继续留在 rawFormMeta route`
  - `de-sugared mapping 固定为 raw meta -> derivation -> app-local usage`
  - `proposal 不再重复 toolkit 上游门禁与去向说明`
- non_goals:
  - `exact API noun`
  - `public function shape`
  - `read helper(handle)`
  - `hook family`
  - `selector / equalityFn / cache contract`
  - `field-ui`
  - `write-side`
  - `full meta object view`
- allowed_reopen_surface:
  - `是否需要 public noun`
  - `是否需要 public function shape`
  - `canSubmit 是否出现足够稳定的跨场景 residue`
  - `更多 truly-derived 字段是否应进入 schema`
- proof_obligations:
  - `继续只建立在 rawFormMeta() 上`
  - `不得引入 handle-bearing read route`
  - `不得重打包 raw passthrough 字段`
  - `不得把 submit actionability policy 伪装成 derivation`
- delta_from_previous_round:
  - `删掉上游门禁重复`
  - `把三形状压成一个 surviving class 加一组禁止项`
  - `删掉 canSubmit`
  - `删掉 raw passthrough 字段`
  - `把 exact noun 与 public function shape 后置`

## Round 2

### Phase

- `converge`

### Input Residual

- `检查 adopted freeze record 与最新 proposal/ledger/spec 是否还有 unresolved findings`

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
  - `R1: policy-free pure derivation class over RawFormMeta, with derived-only schema and explicit forbidden set`
- final_status: `closed`
- stop_rule_satisfied: `true`
- residual_risk:
  - `后续若重开 public noun、public function shape、canSubmit 或新增 derived 字段，仍必须提供新的 live-residue 证据，并证明不会长出第二读侧 contract`
  - `internal ledger 里的 shape 继续沿用 intake taxonomy，后续不得借该标签把 object view、handle helper、hook family 或 cache contract 带回来`
