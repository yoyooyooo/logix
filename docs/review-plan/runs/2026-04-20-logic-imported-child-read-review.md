# Logic Imported Child Read Contract Review Ledger

## Meta

- target:
  - `docs/proposals/logic-imported-child-read-contract.md`
- targets:
  - `docs/proposals/logic-imported-child-read-contract.md`
- source_kind:
  - `file-ssot-contract`
- reviewer_count:
  - `4`
- reviewer_model:
  - `gpt-5.4`
- reviewer_reasoning:
  - `xhigh`
- challenge_scope:
  - `open`
- round_count:
  - `2`
- consensus_status:
  - `closed`

## Bootstrap

- target_complete:
  - `true`
- review_contract:
  - `artifact_kind: ssot-contract`
  - `review_goal: zero-unresolved`
  - `target_claim: Logic imported-child read 的 canonical 路径应冻结为 $.imports.get(tag) -> child.read(selector)，不回潮到 $.use / $.root.resolve / $.select / $.imports.select，并与 Program.imports、parent-scope child resolution、selector law 保持同一主链。`
  - `non_default_overrides: reviewer_count=4; active_advisors=A4; challenge_scope=open`
- review_object_manifest:
  - `source_inputs: docs/proposals/logic-imported-child-read-contract.md`
  - `materialized_targets: docs/proposals/logic-imported-child-read-contract.md`
  - `authority_target: docs/proposals/logic-imported-child-read-contract.md`
  - `bound_docs: docs/ssot/runtime/03-canonical-authoring.md; docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md; docs/ssot/runtime/07-standardized-scenario-patterns.md; docs/ssot/runtime/10-react-host-projection-boundary.md; docs/standards/logix-api-next-guardrails.md; docs/proposals/read-query-selector-law-internalization-contract.md; docs/proposals/external-store-runtime-seam-cutover-contract.md; docs/proposals/resource-query-owner-relocation-contract.md`
  - `derived_scope: single-file contract with imported-child read authority docs`
  - `allowed_classes: imports owner; child resolution boundary; selector-law read; phase rule; single-truth closure; future sugar gate; proof obligations; docs writeback`
  - `blocker_classes: living planning anchor; second read formula; root/service path relapse; fake phase safety; unverifiable closure`
  - `ledger_target: docs/review-plan/runs/2026-04-20-logic-imported-child-read-review.md`
- challenge_scope:
  - `open`
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
  - `必须同时通过 Ramanujan / Kolmogorov / Godel gate，且 reviewer 无 unresolved findings`
- reopen_bar:
  - `只有在 dominance axes 上形成严格改进，或在核心轴不恶化的前提下显著提高 proof-strength / future-headroom，才允许 reopen`
- ledger_path:
  - `docs/review-plan/runs/2026-04-20-logic-imported-child-read-review.md`
- writable:
  - `true`

## Assumptions

- A1:
  - summary:
    - `Logic Imported Child Read Contract` 当前目标工件属于 `ssot-contract`，且本轮目标是 `zero-unresolved`
  - status:
    - `kept`
  - resolution_basis:
    - `用户要求在编码前把提案层完全自我对齐；该文件是结构化 contract proposal`
- A2:
  - summary:
    - `challenge_scope` 取 `open`，允许 reviewer 直接挑战 split-path 是否是最优 canonical
  - status:
    - `overturned`
  - resolution_basis:
    - `reviewer 交集证明 baseline 仍存在 second read formula 风险、重复 proof row 与 future sugar gate 缺口，必须改写 adopted candidate`
- A3:
  - summary:
    - `ledger` 允许写入 `docs/review-plan/runs/`
  - status:
    - `kept`
  - resolution_basis:
    - `用户未禁止；仓内路径存在且可写`
- A4:
  - summary:
    - `主 agent 可直接改目标 proposal 文本以吸收 adopted candidate`
  - status:
    - `overturned`
  - resolution_basis:
    - `保留“可直接改文件”这个执行权限，但原始 baseline 假设已被 adopted candidate 替换`

## Round 1

### Phase

- challenge

### Input Residual

- none

### Findings

- F1 `blocker` `ambiguity`:
  - baseline 仍把实现层现状写进 terminal contract，形成 living planning anchor
  - evidence:
    - reviewer 交集要求删掉 risk taxonomy，下沉到 ledger
  - status:
    - `merged`
- F2 `blocker` `controversy`:
  - baseline 冻结了第二类型 authority 与过宽的 `$.select` 读面
  - evidence:
    - reviewer 交集要求删掉示意接口类型，并把 `$.select` 收成 imported-child handle projection 的 exact thin alias
  - status:
    - `merged`
- F3 `high` `invalidity`:
  - proof matrix 缺少 imports owner / parent-scope single-binding / negative path closure / phase denial witness
  - evidence:
    - reviewer 交集要求把这些 closure obligation 补回 proof matrix
  - status:
    - `merged`
- F4 `high` `ambiguity`:
  - future sugar gate 的 authority 与 mechanical mapping 不够精确
  - evidence:
    - reviewer 交集要求绑定 `runtime/12 + toolkit gate + mechanical mapping`
  - status:
    - `merged`
- F5 `medium` `controversy`:
  - writeback target 过宽，缺少 superseded authorities / residue cleanup
  - evidence:
    - reviewer 交集要求分成 `Live authority + Superseded Authorities`
  - status:
    - `merged`

### Counter Proposals

- P1:
  - summary:
    - `Logic imported-child read closure-first delta contract`
  - why_better:
    - 把页面压成 delta-only，只保留 split path、phase rule、single-truth、future sugar gate 与最小 proof closure
  - overturns_assumptions:
    - `A2`
    - `A4`
  - resolves_findings:
    - `F1`
    - `F2`
    - `F3`
    - `F4`
    - `F5`
  - supersedes_proposals:
    - none
  - dominance:
    - `dominates`
  - axis_scores:
    - `concept-count: +3`
    - `public-surface: +1`
    - `compat-budget: 0`
    - `migration-cost: +1`
    - `proof-strength: +2`
    - `future-headroom: +2`

### Resolution Delta

- `A2` -> `overturned`
- `A4` -> `overturned`
- `F1..F5` -> `merged`
- `P1` -> `adopted-candidate input`

## Adoption

- adopted_candidate:
  - `Logic Imported Child Read Closure-First Delta Contract`
- lineage:
  - `baseline + P1`
- rejected_alternatives:
  - `service-path canonical`
  - `root-path canonical`
  - `fused-path canonical`
  - `generic $.select(runtime, selector) 由本页一并冻结`
- rejection_reason:
  - `会引入 second read formula、second child-resolution family 或 living planning anchor`
- dominance_verdict:
  - `adopted candidate dominates baseline on concept-count / proof-strength / future-headroom while keeping compat-budget stable`

### Freeze Record

- adopted_summary:
  - `把本页压成 delta-only contract，只保留 $.imports.get(tag) -> child.read(selector) 的 split path、run-phase only、single-truth closure、future sugar gate 与最小 proof closure`
- kernel_verdict:
  - `通过 Ramanujan gate`
  - `通过 Kolmogorov gate`
  - `通过 Godel gate`
- frozen_decisions:
  - `Program 负责组合，scope 负责解析，selector 负责读取`
  - `$.imports.get(tag) -> child.read(selector)` 是 canonical imported-child read pairing
  - `child.read(selector)` 只表达 selector-based projection 的对象方法写法，不恢复 ./Handle，也不把 Handle 重新立成 core canonical/support family noun
  - `$.use / $.root.resolve / $.select / $.imports.select / $.imports.ref` 不进入 canonical
  - `future sugar 只允许按 runtime/12 + toolkit gate + mechanical mapping 重开`
- non_goals:
  - `不冻结 exact type name`
  - `不冻结 generic read(selector) family`
  - `不引入第二 child-resolution family`
- allowed_reopen_surface:
  - `只有在 imported-child read pairing、本页 future sugar gate、或 generic read family 被证明有严格改进时，才允许 reopen`
- proof_obligations:
  - `imports owner closure`
  - `parent-scope child resolution`
  - `split-path closure`
  - `phase safety`
  - `single-truth closure`
  - `path-relapse closure`
  - `future sugar gate`
- delta_from_previous_round:
  - `baseline page rewritten to closure-first delta contract`

## Consensus

- reviewers:
  - `A1`
  - `A2`
  - `A3`
  - `A4`
- adopted_candidate:
  - `Logic Imported Child Read Closure-First Delta Contract`
- final_status:
  - `closed`
- stop_rule_satisfied:
  - `true`
- residual_risk:
  - `执行阶段仍需按 proof matrix 真正完成 duplicate-child fail-fast、path-relapse residue closure、future sugar mechanical mapping、以及 child.read(selector) 与 public type/doc 文案的一致性 witness 的落盘与验证`

## Round 2

### Phase

- converge

### Input Residual

- `parent-scope single-binding closure`
- `child.read` 与 Handle noun 的边界
- `future sugar gate`
- `path-relapse closure`
- `phase denial witness`

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- `F1` -> `closed`
- `F2` -> `closed`
- `F3` -> `closed`
- `F4` -> `closed`
- `F5` -> `closed`
