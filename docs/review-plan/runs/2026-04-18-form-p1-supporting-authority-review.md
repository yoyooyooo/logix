# Form P1 Supporting Authority Review

## Meta

- target: `docs/proposals/form-p1-supporting-authority-contract.md`
- targets:
  - `docs/proposals/form-p1-supporting-authority-contract.md`
  - `docs/ssot/form/README.md`
  - `docs/ssot/form/02-gap-map-and-target-direction.md`
  - `docs/ssot/form/03-kernel-form-host-split.md`
  - `docs/ssot/form/06-capability-scenario-api-support-map.md`
  - `docs/ssot/runtime/09-verification-control-plane.md`
  - `docs/ssot/runtime/10-react-host-projection-boundary.md`
  - `docs/ssot/form/13-exact-surface-contract.md`
- source_kind: `file-spec`
- reviewers: `4`
- round_count: `2`
- challenge_scope: `open`
- consensus_status: `reached`

## Bootstrap

- target_complete: `true`
- review_contract:
  - artifact_kind: `ssot-contract`
  - review_goal: `zero-unresolved`
  - target_claim: `Form 的 P1 不应该回到单页 authority；它应保持 supporting authority family，并按 owner/split、witness/proof、exact adjunct 三束主轴分布到 03、06、runtime/09、runtime/10、13、README；02 只允许保留摘要索引。`
  - non_default_overrides:
    - `reviewer_count=4`
    - `reviewer_model=gpt-5.4`
    - `reviewer_reasoning=xhigh`
    - `challenge_scope=open`
    - `A4 enabled`
- review_object_manifest:
  - source_inputs:
    - `user request: 继续一样的方式打磨 P1`
    - `materialized proposal: docs/proposals/form-p1-supporting-authority-contract.md`
  - materialized_targets:
    - `docs/proposals/form-p1-supporting-authority-contract.md`
  - authority_target:
    - `docs/proposals/form-p1-supporting-authority-contract.md`
  - bound_docs:
    - `docs/ssot/form/02-gap-map-and-target-direction.md`
    - `docs/ssot/form/03-kernel-form-host-split.md`
    - `docs/ssot/form/06-capability-scenario-api-support-map.md`
    - `docs/ssot/runtime/09-verification-control-plane.md`
    - `docs/ssot/runtime/10-react-host-projection-boundary.md`
    - `docs/ssot/form/13-exact-surface-contract.md`
    - `docs/ssot/form/README.md`
  - derived_scope: `doc-family-contract`
  - allowed_classes:
    - `P1 family routing`
    - `authority split`
    - `proof owner split`
    - `adjunct exact placement`
    - `README/02 indexing law`
    - `family-vs-single-hub choice`
    - `target-function critique`
  - blocker_classes:
    - `second authority hub`
    - `P1 leaking back into 02`
    - `exact/public duplication`
    - `proof/owner duplication`
    - `host sugar creep`
    - `hidden fourth root`
  - ledger_target:
    - `docs/review-plan/runs/2026-04-18-form-p1-supporting-authority-review.md`
- challenge_scope: `open`
- reviewer_set:
  - `A1`
  - `A2`
  - `A3`
  - `A4`
- active_advisors:
  - none
- activation_reason:
  - `A4 作为 reviewer 启用，因为目标涉及长期治理、authority family 与 public/supporting boundary。`
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
- stop_rule: `Ramanujan gate + Kolmogorov gate + Godel gate`
- reopen_bar: `只有在 adopted candidate 被更小、更强方案直接支配时才允许 reopen`
- ledger_path: `docs/review-plan/runs/2026-04-18-form-p1-supporting-authority-review.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `P1 需要一个新的 family-level authority contract 或 manifest 层。`
  - status: `overturned`
  - resolution_basis: `A2/A4 一致认为这会新增元 authority 对象。`
- A2:
  - summary: `README 不能持有唯一 routing law，必须让 02 或 proposal 一起分担。`
  - status: `overturned`
  - resolution_basis: `A2/A4/A3 都要求 README 成为唯一 routing manifest。`
- A3:
  - summary: `03、06、runtime/09、runtime/10、13 的主落点仍是开放问题。`
  - status: `overturned`
  - resolution_basis: `A2/A4 认为这些边界已大体裁决，当前只剩 wording 与 routing freeze。`
- A4:
  - summary: `exact adjunct` 可以视作单一主轴，并近似压给 13。`
  - status: `overturned`
  - resolution_basis: `A1/A3/A4 一致要求拆成 runtime/10 与 13 两个单点 owner。`
- A5:
  - summary: `P1` 适合继续作为长期治理名词保留在 docs family 中。`
  - status: `overturned`
  - resolution_basis: `A4 认定这会形成 hidden fourth root。`

## Round 1

### Phase

- challenge

### Input Residual

- none

### Findings

- F1 `critical` `invalidity`: proposal 试图新增 family-level authority / manifest，对 supporting family 重新长第二 hub。
- F2 `high` `invalidity`: README 与 02 同时承担 P1 摘要索引，routing owner 不单点。
- F3 `high` `invalidity`: 多组已裁决路由被重新列成开放问题，形成 stale planning anchor。
- F4 `high` `invalidity`: `exact adjunct` 被写成单轴并近似压到 13，和 `runtime/10` 现有 exact host adjunct contract 冲突。
- F5 `medium` `ambiguity`: `03` 与 `runtime/10` 被写成单选题，semantic owner 与 exact host boundary 混叠。

### Counter Proposals

- P1:
  - summary: `README` 成为唯一 supporting routing manifest，`02` 只保留 P0 index / fence。
  - why_better: `删掉 proposal / 02 / README 三处并列 routing，压掉第二 hub。`
  - overturns_assumptions:
    - `A1`
    - `A2`
  - resolves_findings:
    - `F1`
    - `F2`
  - supersedes_proposals:
    - none
  - dominance: `dominates`
  - axis_scores:
    - concept-count: `better`
    - public-surface: `same`
    - compat-budget: `same`
    - migration-cost: `better`
    - proof-strength: `better`
    - future-headroom: `better`
- P2:
  - summary: `03 / 06 / runtime/09 / runtime/10 / 13` 的 supporting roles 只做 frozen mapping，不再做 open question。`
  - why_better: `把已裁决边界从讨论对象改回 imported fact。`
  - overturns_assumptions:
    - `A3`
  - resolves_findings:
    - `F3`
    - `F5`
  - supersedes_proposals:
    - none
  - dominance: `dominates`
  - axis_scores:
    - concept-count: `better`
    - public-surface: `same`
    - compat-budget: `same`
    - migration-cost: `better`
    - proof-strength: `better`
    - future-headroom: `same_or_better`
- P3:
  - summary: `exact adjunct` 拆成 `runtime/10 = host-owned adjunct exact/import/prohibition` 与 `13 = Form-owned exact surface + companion primitive`。`
  - why_better: `消掉 13/runtime10 双 authority 风险。`
  - overturns_assumptions:
    - `A4`
  - resolves_findings:
    - `F4`
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
- P4:
  - summary: `P1` 不再写成长期治理名词，只在本轮 review ledger 里存在；长期 docs 只保留 concrete routing law 与 page role。`
  - why_better: `压掉 hidden fourth root 风险。`
  - overturns_assumptions:
    - `A5`
  - resolves_findings:
    - `F1`
    - `F3`
  - supersedes_proposals:
    - none
  - dominance: `dominates`
  - axis_scores:
    - concept-count: `better`
    - public-surface: `same`
    - compat-budget: `same`
    - migration-cost: `same_or_better`
    - proof-strength: `better`
    - future-headroom: `better`

### Resolution Delta

- `F1` `merged`
- `F2` `merged`
- `F3` `merged`
- `F4` `merged`
- `F5` `merged`
- `P1` `adopted`
- `P2` `adopted`
- `P3` `adopted`
- `P4` `adopted`

## Adoption

- adopted_candidate: `supporting-routing-contract-freeze`
- lineage:
  - `P1`
  - `P2`
  - `P3`
  - `P4`
- rejected_alternatives:
  - `new P1 single-page authority`
  - `new family-level manifest object`
  - `README + 02 dual index`
  - `13-only exact adjunct`
- rejection_reason:
  - `会引入第二 authority hub、hidden fourth root、或 exact/public duplication`
- dominance_verdict:
  - `adopted candidate dominates on concept-count, proof-strength and future-headroom`

### Freeze Record

- adopted_summary:
  - `P1` 不进入长期 authority 词表
  - `README` 持唯一 supporting routing manifest
  - `02` 继续只做 `P0` index / fence
  - `03` 持 owner split / semantic obligation
  - `06 + runtime/09` 持 witness / proof / control-plane feed
  - `runtime/10` 持 host-owned adjunct exact contract
  - `13` 持 Form-owned exact surface 与 companion primitive
  - proposal 只作为 review 物料，消费后退出长期 docs tree
- kernel_verdict:
  - `Ramanujan`: 通过，压掉了 P1 元 authority 和双索引面
  - `Kolmogorov`: 通过，核心轴不恶化，routing 更短更清楚
  - `Godel`: 通过，消除了 second hub、hidden fourth root 与 exact duplication
- frozen_decisions:
  - `不新增 P1 manifest 页面`
  - `README 是唯一 routing manifest`
  - `02 不承接 P1 细节`
  - `03/06/runtime09/runtime10/13` 只补 page role，不重复彼此正文
  - `runtime/10` 与 `13` 显式双落点承接 exact adjunct`
- non_goals:
  - `把 P1 做成长期治理对象`
  - `在 02 回写 P1 supporting detail`
  - `重审已裁决的 owner split`
- allowed_reopen_surface:
  - `若未来能删除 supporting docs 页面数量`
  - `若 README 失去 routing manifest 资格`
- proof_obligations:
  - `README 必须显式写出唯一 routing law`
  - `02 必须只保留 P0 fence`
  - `03/06/runtime09/runtime10/13` 必须各自补一句 supporting role`
  - `proposal 退出长期 docs tree`
- delta_from_previous_round:
  - `从 supporting authority family 提案，压到 supporting routing contract freeze`

## Round 2

### Phase

- converge

### Input Residual

- `README 是否已成为唯一 routing manifest`
- `02 是否已退回 P0 index / fence`
- `runtime/10` 与 `13` 的双落点是否已写实

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- `round1 unresolved` `closed`
- `README single routing owner` `closed`
- `runtime10/13 exact adjunct split` `closed`

## Consensus

- reviewers:
  - `A1`
  - `A2`
  - `A3`
  - `A4`
- adopted_candidate:
  - `supporting-routing-contract-freeze`
- final_status:
  - `已达成共识`
- stop_rule_satisfied:
  - `true`
- residual_risk:
  - `后续若 README 的 routing manifest、02 的 P0 fence、或 runtime/10 与 13 的 exact adjunct 双落点再次被改写，authority 漂移会重新出现`
