# ExternalStore Runtime Seam Cutover Contract Review Ledger

## Meta

- target:
  - `docs/proposals/external-store-runtime-seam-cutover-contract.md`
- targets:
  - `docs/proposals/external-store-runtime-seam-cutover-contract.md`
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
  - `target_claim: ExternalStore 应完整回收到 runtime / field / React seam internal，repo consumer 级主名词退出，仓内 grouped repo-internal contract 拆散，若未来有 sugar 只允许进 toolkit。`
  - `non_default_overrides: reviewer_count=4; active_advisors=A4; challenge_scope=open`
- review_object_manifest:
  - `source_inputs: docs/proposals/external-store-runtime-seam-cutover-contract.md`
  - `materialized_targets: docs/proposals/external-store-runtime-seam-cutover-contract.md`
  - `authority_target: docs/proposals/external-store-runtime-seam-cutover-contract.md`
  - `bound_docs: docs/proposals/read-query-external-store-resource-final-owner-map-contract.md; docs/proposals/core-read-projection-protocol-contract.md; docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md; docs/ssot/runtime/10-react-host-projection-boundary.md; docs/ssot/runtime/11-toolkit-layer.md; docs/standards/logix-api-next-guardrails.md`
  - `derived_scope: single-file contract with runtime-seam authority docs`
  - `allowed_classes: owner-map closure; runtime seam boundary; repo-internal dismantling; toolkit gate; verification gates; docs writeback target`
  - `blocker_classes: living planning anchor; stale ExternalStore noun residue; dual authority; fake closed repo-internal route; unverifiable seam closure`
  - `ledger_target: docs/review-plan/runs/2026-04-20-external-store-runtime-seam-review.md`
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
  - `docs/review-plan/runs/2026-04-20-external-store-runtime-seam-review.md`
- writable:
  - `true`

## Assumptions

- A1:
  - summary:
    - `ExternalStore` 当前目标工件属于 `ssot-contract`，且本轮目标是 `zero-unresolved`
  - status:
    - `kept`
  - resolution_basis:
    - `用户明确要求用 plan-optimality-loop 打磨提案；目标文件是结构化 contract proposal`
- A2:
  - summary:
    - `challenge_scope` 取 `open`，允许 reviewer 直接挑战 seam owner、repo-internal fate、toolkit gate 与更小替代方案
  - status:
    - `kept`
  - resolution_basis:
    - `skill 默认 open；目标涉及 runtime seam、public contract 与长期治理，自动启用 A4`
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
    - `kept`
  - resolution_basis:
    - `用户要求打磨提案；未设置只读限制`

## Round 1

### Phase

- challenge

### Input Residual

- none

### Findings

- F1 `blocker` `controversy`:
  - workspace `repo-internal` closure 仍是假闭合，只处理了 `read-contracts`，漏掉 `InternalContracts`
  - evidence:
    - reviewer 交集确认 `ExternalStore` 仍可通过 `read-contracts` 与 `InternalContracts` 两条 workspace 路线暴露
  - status:
    - `merged`
- F2 `blocker` `invalidity`:
  - seam invariants 错把当前 `from*` lineage 当终局公理集，其中 `fromModule` 还保留对 `ReadQuery` noun 的活依赖
  - evidence:
    - reviewer 交集要求把 invariant 收成中性语义 obligations，不再冻结 exact constructor lineage
  - status:
    - `merged`
- F3 `high` `invalidity`:
  - 验证门缺负向闭合证明，无法证明 noun extinction、repo-internal dismantling 与 docs/examples/tests residue closure
  - evidence:
    - 原稿只有行为测试，没有 boundary / allowlist / residue scan / public type closure
  - status:
    - `merged`
- F4 `high` `ambiguity`:
  - authoring / injection exact boundary 未冻结，后续仍可能长出新 capability slot / provider / hook family
  - evidence:
    - reviewer 交集要求写死只允许 `capabilities.services` 或 runtime scope overlay 进入 runtime
  - status:
    - `merged`
- F5 `high` `controversy`:
  - toolkit gate 过宽，没有写成 exact reopen 条件
  - evidence:
    - 原稿只说“若未来有 sugar 只允许进 toolkit”，未绑定 `runtime/12` intake 与 de-sugared mapping
  - status:
    - `merged`
- F6 `medium` `ambiguity`:
  - 文档存在双 authority 与 stale planning anchor
  - evidence:
    - 原稿重复持有 umbrella / host / toolkit 叙事，且 writeback target 未覆盖旧 proposal authority
  - status:
    - `merged`

### Counter Proposals

- P1:
  - summary:
    - `closure-first delta contract`
  - why_better:
    - 把页面压成单权威 delta contract，只保留 noun extinction、workspace repo-internal closure、authoring boundary、toolkit gate 与 proof matrix
  - overturns_assumptions:
    - `A2`
    - `A4`
  - resolves_findings:
    - `F1`
    - `F2`
    - `F3`
    - `F4`
    - `F5`
    - `F6`
  - supersedes_proposals:
    - none
  - dominance:
    - `dominates`
  - axis_scores:
    - `concept-count: +3`
    - `public-surface: +2`
    - `compat-budget: 0`
    - `migration-cost: 0`
    - `proof-strength: +3`
    - `future-headroom: +2`

### Resolution Delta

- `F1..F6` -> `merged`
- `P1` -> `adopted-candidate input`

## Adoption

- adopted_candidate:
  - `ExternalStore Closure-First Delta Contract`
- lineage:
  - `baseline + P1`
- rejected_alternatives:
  - `保留 read-contracts-only dismantling`
  - `冻结 from* lineage 为终局 contract`
- rejection_reason:
  - `会留下假闭合 repo-internal route、活的跨 proposal 依赖与过宽 toolkit gate`
- dominance_verdict:
  - `adopted candidate dominates baseline on concept-count / public-surface / proof-strength / future-headroom`

### Freeze Record

- adopted_summary:
  - `把本页压成单权威 delta contract，只保留 noun extinction、workspace repo-internal closure、authoring / injection exact boundary、toolkit reopen gate 与 closure proof matrix`
- kernel_verdict:
  - `通过 Ramanujan gate`
  - `通过 Kolmogorov gate`
  - `通过 Godel gate`
- frozen_decisions:
  - `任何 workspace repo-internal export 都不得再暴露 ExternalStore noun`
  - `authoring / injection 只允许经由 capabilities.services 或 runtime scope overlay 进入 runtime`
  - `React 侧不新增 ExternalStore 专属 provider / hook / capability slot`
  - `seam invariants 只保留中性语义 obligations，不冻结 from* lineage`
  - `future sugar 只能按 runtime/12 + toolkit gate 重开`
- non_goals:
  - `不冻结当前 constructor/helper 名`
  - `不冻结当前内部目录或测试家族名`
  - `不处理 ReadQuery 与 Resource`
- allowed_reopen_surface:
  - `只有在 workspace repo-internal bridge 被证明不可避免，或 toolkit reopen 满足 runtime/12 + de-sugared mapping 条件时，才允许 reopen`
- proof_obligations:
  - `public export boundary`
  - `workspace repo-internal allowlist closure`
  - `public type closure`
  - `docs/examples/tests residue closure`
  - `semantic seam continuity`
- delta_from_previous_round:
  - `baseline page rewritten to closure-first delta contract`

## Round 2

### Phase

- converge

### Input Residual

- `workspace repo-internal closure`
- `neutral seam invariants`
- `authoring / injection exact boundary`
- `toolkit reopen gate`
- `closure proof matrix`

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
- `F6` -> `closed`

## Consensus

- reviewers:
  - `A1`
  - `A2`
  - `A3`
  - `A4`
- adopted_candidate:
  - `ExternalStore Closure-First Delta Contract`
- final_status:
  - `closed`
- stop_rule_satisfied:
  - `true`
- residual_risk:
  - `执行阶段仍需按 Closure Proof Matrix 真正完成 workspace allowlist、public type、docs/examples/tests residue 与行为 witness 的落盘与验证`
