# Lightweight Derivation Core Boundary Review Ledger

## Meta

- target: `docs/ssot/runtime/11-toolkit-layer.md`
- targets:
  - `docs/ssot/runtime/11-toolkit-layer.md`
  - `docs/ssot/runtime/12-toolkit-candidate-intake.md`
  - `docs/internal/toolkit-candidate-ledger.md`
  - `docs/ssot/runtime/10-react-host-projection-boundary.md`
  - `docs/ssot/form/05-public-api-families.md`
  - `docs/ssot/form/13-exact-surface-contract.md`
  - `docs/adr/2026-04-18-official-toolkit-layer.md`
  - `specs/147-toolkit-layer-ssot/spec.md`
  - `specs/148-toolkit-form-meta-derivation/spec.md`
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
  - `authority target=docs/ssot/runtime/11-toolkit-layer.md`
  - `bound docs=docs/ssot/runtime/12-toolkit-candidate-intake.md,docs/internal/toolkit-candidate-ledger.md,docs/ssot/runtime/10-react-host-projection-boundary.md,docs/ssot/form/05-public-api-families.md,docs/ssot/form/13-exact-surface-contract.md,docs/adr/2026-04-18-official-toolkit-layer.md,specs/147-toolkit-layer-ssot/spec.md,specs/148-toolkit-form-meta-derivation/spec.md`
  - `source inputs=examples/logix-react/src/form-support.ts,packages/logix-react/src/FormProjection.ts,docs/review-plan/runs/2026-04-18-toolkit-candidate-harvest-review.md,docs/review-plan/runs/2026-04-18-toolkit-form-meta-derivation-review.md`
- review_contract:
  - `artifact_kind=ssot-contract`
  - `review_goal=zero-unresolved`
  - `target_claim=统一冻结这条新边界：凡是建立在已冻结 raw truth 之上的轻量、严格、一跳、policy-free 派生，默认优先回 core adjunct route；toolkit 只吸收经过这道门禁后仍然成立的高阶 DX wrapper/recipe/policy。基于此，把 form meta lightweight derivation 从 toolkit-first-wave 改判为 core-probe，同时保留 isValid/isPristine 与 forbidden set 这组 candidate-local 收窄结果。`
  - `non_default_overrides=reviewers:4,challenge_scope:open,A4:enabled`
- review_object_manifest:
  - `source_inputs=form-support residue + FormProjection + prior harvest/form-meta review ledgers`
  - `materialized_targets=docs/ssot/runtime/11-toolkit-layer.md,docs/ssot/runtime/12-toolkit-candidate-intake.md,docs/internal/toolkit-candidate-ledger.md,docs/ssot/runtime/10-react-host-projection-boundary.md,docs/ssot/form/05-public-api-families.md,docs/ssot/form/13-exact-surface-contract.md,docs/adr/2026-04-18-official-toolkit-layer.md,specs/147-toolkit-layer-ssot/spec.md,specs/148-toolkit-form-meta-derivation/spec.md`
  - `authority_target=docs/ssot/runtime/11-toolkit-layer.md`
  - `bound_docs=docs/ssot/runtime/12-toolkit-candidate-intake.md,docs/internal/toolkit-candidate-ledger.md,docs/ssot/runtime/10-react-host-projection-boundary.md,docs/ssot/form/05-public-api-families.md,docs/ssot/form/13-exact-surface-contract.md,docs/adr/2026-04-18-official-toolkit-layer.md,specs/147-toolkit-layer-ssot/spec.md,specs/148-toolkit-form-meta-derivation/spec.md`
  - `derived_scope=toolkit/core boundary for lightweight strict derivation + candidate reclassification`
  - `allowed_classes=core/toolkit placement,strict-derivation gate,candidate classification,host/form boundary alignment,candidate-local derivation closure,historical supersession`
  - `blocker_classes=second authority,second read-side contract,stale toolkit-first-wave classification,hidden exact surface commitment,proposal-only truth,inconsistent core/toolkit owner`
  - `ledger_target=docs/review-plan/runs/2026-04-18-lightweight-derivation-core-boundary-review.md`
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
- ledger_path: `docs/review-plan/runs/2026-04-18-lightweight-derivation-core-boundary-review.md`
- writable: `true`

## Assumptions

- `A1`:
  - `summary=只要 live ssot 改完，旧 consumed/closed proposal 与 ledger 就不会继续发声`
  - `status=overturned`
  - `resolution_basis=旧 proposal 与旧 review ledger 已显式 historical 化，并通过新 ledger 建立可达 supersession chain`
- `A2`:
  - `summary=shape 只是无害标签，不会继续把 candidate 拖回 helper-first 目标函数`
  - `status=overturned`
  - `resolution_basis=runtime/12 已明确 shape 只描述 residue，不承诺 future helper family`
- `A3`:
  - `summary=同一条 strict-derivation gate 分散在多份可写工件里，不会造成 shadow contract`
  - `status=overturned`
  - `resolution_basis=gate owner 已压回 runtime/12，runtime/10 与 specs/148 只保留各自那一层职责`
- `A4`:
  - `summary=candidate-local closure 可以同时留在 proposal、spec、ledger 与历史 review 中`
  - `status=overturned`
  - `resolution_basis=candidate-local closure 已收口到 specs/148，proposal 退成指针页，ledger 只留活跃 delta`

## Round 1

### Phase

- `challenge`

### Input Residual

- `none`

### Findings

- `F1` `blocker` `invalidity`:
  - `summary=旧 harvest proposal 与旧 review ledger 仍把 form meta derived view 作为 toolkit-first-wave 发声，形成 stale authority`
  - `evidence=historical proposal/review chain vs live ssot and current ledger`
  - `status=adopted`
- `F2` `blocker` `invalidity`:
  - `summary=strict-derivation gate 分散在 toolkit layer、intake、host、form、spec 多处，owner split 不够清晰`
  - `evidence=runtime/11 + runtime/12 + runtime/10 + form/13 + specs/148`
  - `status=adopted`
- `F3` `high` `invalidity`:
  - `summary=internal ledger 继续镜像稳定协议，长成 shadow spec`
  - `evidence=ledger duplicated read rules + closed core surfaces`
  - `status=adopted`
- `F4` `high` `invalidity`:
  - `summary=candidate-local closure 同时存在于 proposal、spec、ledger 与历史 review，中间真相过多`
  - `evidence=toolkit-form-meta proposal + specs/148 + historical review`
  - `status=adopted`
- `F5` `high` `controversy`:
  - `summary=shape label 仍可能暗示 future helper family，隐藏 exact surface 承诺`
  - `evidence=view-helper label on form meta lightweight derivation`
  - `status=adopted`

### Counter Proposals

- `P1`:
  - `summary=把旧 harvest proposal、proposal index 与两份旧 review ledger 全部降格为 explicit historical snapshot，并建立 supersession chain`
  - `why_better=清掉 stale toolkit-first-wave authority，不改写历史主体`
  - `overturns_assumptions=A1`
  - `resolves_findings=F1`
  - `supersedes_proposals=implicit supersession only`
  - `dominance=dominates`
  - `axis_scores=concept-count +, public-surface 0, compat-budget 0, migration-cost +, proof-strength ++, future-headroom +`
  - `status=adopted`
- `P2`:
  - `summary=把通用 strict-derivation gate 压到 runtime/12 单点 owner；runtime/11 只保留层级原则；runtime/10 只保留 owner route；form/13 只做反向引用`
  - `why_better=一条规则对应一条 authority 链`
  - `overturns_assumptions=A2,A3`
  - `resolves_findings=F2`
  - `supersedes_proposals=same gate mirrored across multiple docs`
  - `dominance=dominates`
  - `axis_scores=concept-count ++, public-surface 0, compat-budget 0, migration-cost +, proof-strength ++, future-headroom +`
  - `status=adopted`
- `P3`:
  - `summary=把 internal ledger 收成 active delta，只保留活跃 probe/first-wave/reject 信息，稳定协议统一回链 runtime/12`
  - `why_better=避免 internal 页继续长成 shadow spec`
  - `overturns_assumptions=A3`
  - `resolves_findings=F3`
  - `supersedes_proposals=ledger carries stable rules`
  - `dominance=dominates`
  - `axis_scores=concept-count ++, public-surface 0, compat-budget 0, migration-cost +, proof-strength +, future-headroom +`
  - `status=adopted`
- `P4`:
  - `summary=把 candidate-local closure 压到 specs/148 单点，proposal 退成指针页`
  - `why_better=保留收窄结果，同时消掉多处强约束并行维护`
  - `overturns_assumptions=A4`
  - `resolves_findings=F4`
  - `supersedes_proposals=proposal/spec/ledger/review all carry closure`
  - `dominance=dominates`
  - `axis_scores=concept-count +, public-surface 0, compat-budget 0, migration-cost +, proof-strength ++, future-headroom +`
  - `status=adopted`
- `P5`:
  - `summary=给 shape 增加非承诺约束：它只描述 residue，不得被用来主张 future helper family`
  - `why_better=不新增 taxonomy，也能堵住 helper-first 回流`
  - `overturns_assumptions=A2`
  - `resolves_findings=F5`
  - `supersedes_proposals=add new shape taxonomy`
  - `dominance=dominates`
  - `axis_scores=concept-count +, public-surface 0, compat-budget 0, migration-cost +, proof-strength +, future-headroom +`
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
  - `R1: live authority split + candidate-local single owner + historical supersession for lightweight strict derivation core boundary`
- lineage:
  - `P1`
  - `P2`
  - `P3`
  - `P4`
  - `P5`
- rejected_alternatives:
  - `keep stale first-wave harvest freeze as historical but unsignaled`
  - `add new shape taxonomy`
  - `let internal ledger continue duplicating stable protocol`
  - `let proposal keep candidate-local closure text`
- rejection_reason:
  - `这些方向都会增加第二 authority、shadow spec 或 future helper-first pull`
- dominance_verdict:
  - `R1 在 concept-count、proof-strength 与 future-headroom 上严格优于 baseline，且不增加 public surface`

### Freeze Record

- adopted_summary:
  - `全局 strict-derivation gate 收口到 runtime/12；toolkit layer 只持有层级原则；host boundary 只持有 owner route；form exact surface 只做反向链接；candidate-local closure 收口到 specs/148；历史 proposal/review 明确 superseded`
- kernel_verdict:
  - `通过 Ramanujan/Kolmogorov/Godel 三重 gate`
- frozen_decisions:
  - `轻量、严格、一跳、policy-free derivation 默认优先回 core`
  - `form meta lightweight derivation 当前属于 core-probe`
  - `shape 只描述 residue，不承诺 future helper family`
  - `internal ledger 只保留 active delta`
  - `historical proposal 与 historical review 必须显式退场`
- non_goals:
  - `现在就冻结 exact noun`
  - `现在就冻结 import shape`
  - `新增 shape taxonomy`
  - `重写历史 ledger 主体内容`
- allowed_reopen_surface:
  - `exact noun`
  - `import shape`
  - `更多 truly-derived 字段`
  - `canSubmit 是否获得新的 live-residue 证据`
- proof_obligations:
  - `不得重新长出 toolkit-first-wave authority`
  - `不得重新长出第二 read-side contract`
  - `不得让 shape 暗示 helper family`
  - `历史 supersession chain 必须可达`
- delta_from_previous_round:
  - `旧 harvest 链路退成 historical`
  - `gate owner split 压回 runtime/12`
  - `host/form/spec/ledger 各自缩到单层职责`

## Round 2

### Phase

- `converge`

### Input Residual

- `检查历史 supersession chain、gate owner split 与 candidate-local owner 是否全部闭合`

### Findings

- `none`

### Counter Proposals

- `none`

### Resolution Delta

- `historical proposal 与 historical review 均已显式 superseded`
- `superseded_by 指针已落到本 ledger，可达性闭合`
- `reviewers A1/A2/A3/A4 all returned no unresolved findings`

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
  - `后续若继续给历史 ledger 增加 superseded_by 或其他跨文档指针，仍需保持“写入即校验可达”。`
