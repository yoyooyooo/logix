# Form Sugar Helper Contract Closure Review Ledger

## Meta

- target: `docs/ssot/runtime/10-react-host-projection-boundary.md`
- targets:
  - `docs/ssot/runtime/10-react-host-projection-boundary.md`
  - `docs/ssot/form/13-exact-surface-contract.md`
  - `docs/ssot/form/05-public-api-families.md`
  - `docs/internal/form-api-tutorial.md`
- source_kind: `file-ssot-contract`
- reviewer_count: `4`
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
  - `authority target=docs/ssot/runtime/10-react-host-projection-boundary.md`
  - `bound docs=docs/ssot/form/13-exact-surface-contract.md,docs/ssot/form/05-public-api-families.md,docs/internal/form-api-tutorial.md`
  - `source inputs=docs/proposals/form-react-sugar-factory-boundary.md,docs/proposals/form-react-sugar-factory-api-candidate.md,docs/proposals/form-read-projection-naming-contract.md,docs/proposals/form-error-selector-primitive-contract.md,packages/logix-react/src/FormProjection.ts,packages/logix-form/src/Error.ts,examples/logix-react/src/form-support.ts`
- review_contract:
  - `artifact_kind=ssot-contract`
  - `review_goal=zero-unresolved`
  - `target_claim=把 Form sugar/helper/factory 的最终公开 contract 彻底闭合，决定最终应提供的公开 adjunct object、owner、禁止项与 reopen surface`
  - `non_default_overrides=reviewers:4,challenge_scope:open,A4:enabled`
- review_object_manifest:
  - `source_inputs=proposal docs + implementation landing + example residue`
  - `materialized_targets=docs/ssot/runtime/10-react-host-projection-boundary.md,docs/ssot/form/13-exact-surface-contract.md,docs/ssot/form/05-public-api-families.md,docs/internal/form-api-tutorial.md`
  - `authority_target=docs/ssot/runtime/10-react-host-projection-boundary.md`
  - `bound_docs=docs/ssot/form/13-exact-surface-contract.md,docs/ssot/form/05-public-api-families.md,docs/internal/form-api-tutorial.md`
  - `derived_scope=form sugar/helper/factory exact contract across core host law and form companion primitives`
  - `allowed_classes=owner boundary,public helper contract,helper noun freeze,companion primitive boundary,teaching corollary,reopen surface`
  - `blocker_classes=living planning anchor,unresolved helper noun ambiguity,second-authority risk,fake closure between docs and implementation,residue treated as canonical`
  - `ledger_target=docs/review-plan/runs/2026-04-18-form-sugar-helper-contract-closure.md`
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
- ledger_path: `docs/review-plan/runs/2026-04-18-form-sugar-helper-contract-closure.md`
- writable: `true`

## Assumptions

- `A1`:
  - `summary=current target function 仍需要围绕 sugar factory / builder 形态组织讨论`
  - `status=overturned`
  - `resolution_basis=A4/A1/A2/A3 一致指出最终应冻结的是闭合后的公开 contract，不是 factory 产品形态`
- `A2`:
  - `summary=helper exact contract 同时由 runtime page、form exact page、families page 持有不会形成第二 authority`
  - `status=overturned`
  - `resolution_basis=A2 指出重复持有会形成双重维护与第二 authority 风险；adopted candidate 改为单点收口到 runtime page`
- `A3`:
  - `summary=identity-preserving wrapper family 可以在 authority 中被预授权`
  - `status=overturned`
  - `resolution_basis=A3 指出这会保留第二选择面；adopted candidate 只允许 residue，不再预承诺 wrapper family`
- `A4`:
  - `summary=future convenience reopen 可以直接挂在 authority 正文里，不会影响 zero-unresolved`
  - `status=overturned`
  - `resolution_basis=A4/A1/A2 都指出 future wording 与宽 reopen 菜单会构成 living planning anchor`
- `A5`:
  - `summary=example-local wrappers 不会污染 authority 读取路径`
  - `status=overturned`
  - `resolution_basis=A1/A2/A4 都把 examples/logix-react/src/form-support.ts 视为需要显式 quarantine 的 residue`

## Round 1

### Phase

- `challenge`

### Input Residual

- `none`

### Findings

- `F1` `blocker` `invalidity`:
  - `summary=authority 仍保留 factory / builder / sugar 等活词表，exact contract 没有闭合`
  - `evidence=docs/ssot/runtime/10-react-host-projection-boundary.md,docs/ssot/form/13-exact-surface-contract.md,docs/internal/form-api-tutorial.md`
  - `status=adopted`
- `F2` `high` `invalidity`:
  - `summary=Form.Error.field(path) 已落地，但 runtime authority 仍把它写成 future item，形成假闭合`
  - `evidence=docs/ssot/runtime/10-react-host-projection-boundary.md,docs/ssot/form/13-exact-surface-contract.md,packages/logix-form/src/Error.ts`
  - `status=adopted`
- `F3` `high` `controversy`:
  - `summary=official convenience wrapper family 仍被 authority 预留活口，会制造 helper vs wrapper 的第二选择面`
  - `evidence=docs/ssot/runtime/10-react-host-projection-boundary.md,docs/ssot/form/13-exact-surface-contract.md,docs/ssot/form/05-public-api-families.md`
  - `status=adopted`
- `F4` `high` `invalidity`:
  - `summary=helper contract 在多个 authority sibling page 重复持有，形成第二 authority 风险`
  - `evidence=docs/ssot/runtime/10-react-host-projection-boundary.md,docs/ssot/form/13-exact-surface-contract.md,docs/ssot/form/05-public-api-families.md`
  - `status=adopted`
- `F5` `medium` `ambiguity`:
  - `summary=tutorial 仍用未来规划态时态，reopen 菜单也过宽，削弱 zero-unresolved`
  - `evidence=docs/internal/form-api-tutorial.md,docs/ssot/runtime/10-react-host-projection-boundary.md,docs/ssot/form/13-exact-surface-contract.md`
  - `status=adopted`
- `F6` `medium` `controversy`:
  - `summary=example residue 已提供 useForm* family，若不显式 quarantine，容易被 Agent 或人当成准官方 contract`
  - `evidence=examples/logix-react/src/form-support.ts,examples/logix-react/src/demos/form/**`
  - `status=adopted`

### Counter Proposals

- `P1`:
  - `summary=把最终公开 contract 冻结成 canonical route + two core read helpers + one Form companion primitive + forbidden set`
  - `why_better=直接压掉 factory 伪问题，把公开对象收成已存在且可证明的最小集合`
  - `overturns_assumptions=A1,A3,A4`
  - `resolves_findings=F1,F2,F3,F5`
  - `supersedes_proposals=public factory noun,official wrapper family`
  - `dominance=dominates`
  - `axis_scores=concept-count ++, public-surface ++, compat-budget +, migration-cost +, proof-strength ++, future-headroom +`
  - `status=adopted`
- `P2`:
  - `summary=helper exact contract 单点收口到 runtime host boundary；Form exact page 与 families page 只保留 owner/boundary/corollary`
  - `why_better=消掉 sibling page 双重维护与第二 authority 风险`
  - `overturns_assumptions=A2`
  - `resolves_findings=F4,F5`
  - `supersedes_proposals=multi-page duplicated helper contract`
  - `dominance=dominates`
  - `axis_scores=concept-count +, public-surface +, compat-budget 0, migration-cost +, proof-strength ++, future-headroom 0`
  - `status=adopted`
- `P3`:
  - `summary=reopen 改成 primitive-first，只保留 field-ui leaf contract、list row identity public projection contract、Form.Error additional selector primitive`
  - `why_better=保留 future headroom，同时切断 convenience-first 的活规划锚点`
  - `overturns_assumptions=A4`
  - `resolves_findings=F5`
  - `supersedes_proposals=field-ui helper,write-side helper,derived meta helper,list sugar as convenience reopen`
  - `dominance=dominates`
  - `axis_scores=concept-count +, public-surface +, compat-budget +, migration-cost +, proof-strength ++, future-headroom +`
  - `status=adopted`
- `P4`:
  - `summary=建立 residue quarantine：repo-local useForm* / list wrapper 与 examples/logix-react/src/form-support.ts 只算 demo-local residue`
  - `why_better=阻断 example abstraction 回流成 authority`
  - `overturns_assumptions=A5`
  - `resolves_findings=F6`
  - `supersedes_proposals=implicit residue tolerance`
  - `dominance=dominates`
  - `axis_scores=concept-count +, public-surface +, compat-budget 0, migration-cost +, proof-strength ++, future-headroom 0`
  - `status=adopted`

### Resolution Delta

- `F1` `adopted`
- `F2` `adopted`
- `F3` `adopted`
- `F4` `adopted`
- `F5` `adopted`
- `F6` `adopted`
- `A1` `overturned`
- `A2` `overturned`
- `A3` `overturned`
- `A4` `overturned`
- `A5` `overturned`
- `P1` `adopted`
- `P2` `adopted`
- `P3` `adopted`
- `P4` `adopted`

## Adoption

- adopted_candidate:
  - `R1: closed adjunct contract with core read helpers + Form companion primitive + forbidden set + residue quarantine`
- lineage:
  - `P1`
  - `P2`
  - `P3`
  - `P4`
- rejected_alternatives:
  - `public factory noun`
  - `official wrapper family`
  - `host-level fieldError helper`
  - `wide convenience reopen`
- rejection_reason:
  - `这些方向都会增加第二选择面、第二 authority 或活规划锚点，未通过 Ramanujan/Kolmogorov/Godel 三重 gate`
- dominance_verdict:
  - `R1 在 concept-count、public-surface 与 proof-strength 上严格优于 baseline；compat-budget 与 migration-cost 未恶化到不可接受范围`

### Freeze Record

- adopted_summary:
  - `最终公开 contract 只冻结 canonical host law、两枚 core-owned read helpers、一枚 Form-owned companion primitive，再加显式 forbidden set 与 residue quarantine；公开讨论不再围绕 factory 形态组织`
- kernel_verdict:
  - `通过 Ramanujan/Kolmogorov/Godel 三重 gate`
- frozen_decisions:
  - `canonical route 只认 Form.make(...) -> useModule(formProgram, options?) -> useSelector(handle, selector, equalityFn?) -> direct FormHandle mutations`
  - `sanctioned optional read helpers 只认 fieldValue(valuePath) 与 rawFormMeta()`
  - `Form.Error.field(path) 已冻结为平行 companion primitive，owner 固定在 Form.Error`
  - `helper exact contract 单点收口到 docs/ssot/runtime/10-react-host-projection-boundary.md`
  - `docs/ssot/form/13-exact-surface-contract.md 只保留 Form owner 边界、Form.Error.field corollary 与 primitive-first reopen`
  - `docs/ssot/form/05-public-api-families.md 只保留 route boundary，不再预承诺 factory / builder / wrapper family`
  - `docs/internal/form-api-tutorial.md 改成 current-tense canonical walkthrough`
  - `repo-local useForm* / list wrapper 以及 examples/logix-react/src/form-support.ts 都只算 residue`
- non_goals:
  - `public factory noun`
  - `official wrapper family`
  - `useField / useMeta / useList`
  - `helper-side error precedence`
  - `field-ui helper`
  - `write-side helper`
  - `derived meta helper`
  - `list sugar`
  - `namespace import`
  - `independent public subpath freeze`
- allowed_reopen_surface:
  - `field-ui leaf contract`
  - `list row identity public projection contract`
  - `Form.Error additional selector primitive`
- proof_obligations:
  - `完全可回解到 useModule + useSelector + direct handle`
  - `不依赖 internal import`
  - `不重新长出 helper vs wrapper 的第二选择面`
  - `任何 reopen 都必须先证明缺失的是 primitive contract，不是 convenience 包装`
- delta_from_previous_round:
  - `删掉 authority 中的 factory / builder / future wording`
  - `把 Form.Error.field(path) 从 fake-future 改成 landed companion primitive`
  - `把 helper authority 从多页重复持有压成 runtime host boundary 单点`
  - `把 tutorial 从 planning tone 改成 current-tense walkthrough`
  - `加入 residue quarantine`

## Round 2

### Phase

- `converge`

### Input Residual

- `检查 adopted freeze record 与最新 authority docs 是否还有 unresolved findings`

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
  - `R1: closed adjunct contract with core read helpers + Form companion primitive + forbidden set + residue quarantine`
- final_status: `closed`
- stop_rule_satisfied: `true`
- residual_risk:
  - `repo-local residue 仍真实存在，尤其是 examples/logix-react/src/form-support.ts 及其 demos 引用，需要继续保持 quarantine`
  - `若未来要 reopen，只允许 primitive-first：field-ui leaf contract、list row identity public projection contract、Form.Error additional selector primitive`
