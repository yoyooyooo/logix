# Resource Query Owner Relocation Contract Review Ledger

## Meta

- target:
  - `docs/proposals/resource-query-owner-relocation-contract.md`
- targets:
  - `docs/proposals/resource-query-owner-relocation-contract.md`
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
  - `target_claim: Resource 应迁到 @logixjs/query owner，公开 family landing 固定为 Query.Engine.Resource，query root 仍只保留 make + Engine，core 只保留中性执行缝。`
  - `non_default_overrides: reviewer_count=4; active_advisors=A4; challenge_scope=open`
- review_object_manifest:
  - `source_inputs: docs/proposals/resource-query-owner-relocation-contract.md`
  - `materialized_targets: docs/proposals/resource-query-owner-relocation-contract.md`
  - `authority_target: docs/proposals/resource-query-owner-relocation-contract.md`
  - `bound_docs: docs/proposals/read-query-external-store-resource-final-owner-map-contract.md; docs/proposals/query-exact-surface-contract.md; docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md; docs/ssot/runtime/08-domain-packages.md; docs/ssot/runtime/11-toolkit-layer.md; docs/standards/logix-api-next-guardrails.md`
  - `derived_scope: single-file contract with query-owner authority docs`
  - `allowed_classes: owner relocation; exact public surface; injection boundary; core retreat; repo-internal dismantling; verification gates; docs writeback target`
  - `blocker_classes: living planning anchor; fake query-owner closure; dual authority; fake root-minimality; unverifiable relocation`
  - `ledger_target: docs/review-plan/runs/2026-04-20-resource-query-owner-relocation-review.md`
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
  - `docs/review-plan/runs/2026-04-20-resource-query-owner-relocation-review.md`
- writable:
  - `true`

## Assumptions

- A1:
  - summary:
    - `Resource` 当前目标工件属于 `ssot-contract`，且本轮目标是 `zero-unresolved`
  - status:
    - `kept`
  - resolution_basis:
    - `用户明确要求用 plan-optimality-loop 打磨提案；目标文件是结构化 contract proposal`
- A2:
  - summary:
    - `challenge_scope` 取 `open`，允许 reviewer 直接挑战 exact public surface、query owner 形态、root-minimality 与更小替代方案
  - status:
    - `overturned`
  - resolution_basis:
    - `reviewer 交集证明 baseline 存在 fake query-owner closure、fake root-minimality 与 unverifiable relocation，必须改写 adopted candidate`
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

- F1 `blocker` `controversy`:
  - workspace `repo-internal` 收口是假闭合，`read-contracts`、`InternalContracts` 与 query 侧 core lineage 都仍存活
  - evidence:
    - reviewer 交集确认 core repo-internal 与 query 内部都仍通过 `ReadContracts.Resource` 路由持有 owner truth
  - status:
    - `merged`
- F2 `blocker` `ambiguity`:
  - exact public surface 过宽，`Query.Engine.Resource.*` 被写成 support family 永久化，形成假 exactness
  - evidence:
    - reviewer 交集要求把终局页收成 family landing，child members 不在本页一把锁死
  - status:
    - `merged`
- F3 `blocker` `invalidity`:
  - 验证门只有正向行为 witness，没有 relocation closure proof
  - evidence:
    - 原稿缺少 repo-internal closure、query self-host closure、public d.ts exactness、docs/examples residue scan
  - status:
    - `merged`
- F4 `high` `ambiguity`:
  - 注入边界把 layer 注入与 runtime middleware 混成一类，和实际 runtime slot 不一致
  - evidence:
    - reviewer 交集要求把 `Layer` 注入与 `middleware` slot 明确拆开
  - status:
    - `merged`
- F5 `high` `controversy`:
  - 页面重复持有 umbrella / `Q1` / runtime capability 规则，并夹带 living planning anchor
  - evidence:
    - reviewer 交集要求把本页压成 closure-first delta contract，并把 blast radius / 测试桶 / examples 名单下沉
  - status:
    - `merged`
- F6 `medium` `ambiguity`:
  - 缺少 future reopen gate 与 superseded authorities，容易留下双 authority
  - evidence:
    - reviewer 交集要求补 toolkit + intake reopen 条件，以及旧 proposal 去权威清单
  - status:
    - `merged`

### Counter Proposals

- P1:
  - summary:
    - `Resource closure-first delta contract`
  - why_better:
    - 把页面压成单权威 delta contract，只保留 owner、family landing、workspace repo-internal closure、query self-host rule、injection boundary、relocation proof
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
  - `Resource Closure-First Delta Contract`
- lineage:
  - `baseline + P1`
- rejected_alternatives:
  - `把当前 Query.Engine.Resource.* support family 一把锁死为终局 exact surface`
- rejection_reason:
  - `会留下 fake query-owner closure、fake root-minimality 与 unverifiable relocation`
- dominance_verdict:
  - `adopted candidate dominates baseline on concept-count / public-surface / proof-strength / future-headroom`

### Freeze Record

- adopted_summary:
  - `把本页压成单权威 delta contract，只保留 owner、family landing、workspace repo-internal closure、query self-host rule、exact injection boundary、future reopen gate 与 relocation proof matrix`
- kernel_verdict:
  - `通过 Ramanujan gate`
  - `通过 Kolmogorov gate`
  - `通过 Godel gate`
- frozen_decisions:
  - `Resource owner 固定为 @logixjs/query`
  - `query root 继续只保留 make + Engine`
  - `Query.Engine.Resource` 只冻结为 family landing，不在本页一把锁死当前 child members
  - `任何 workspace 级 core repo-internal export 都不得再暴露 Resource noun`
  - `packages/logix-query/src/**` 不得再依赖 core ReadContracts.Resource lineage
  - `资源注入只允许 Program.capabilities.services 或 runtime layer overlay；middleware 单独属于 runtime middleware slot`
- non_goals:
  - `不冻结当前 child members、type family 或 helper lineage`
  - `不冻结当前内部目录、示例名单或测试家族名`
  - `不定义 implementation bridge 细节`
- allowed_reopen_surface:
  - `只有在 family landing 本身、workspace repo-internal bridge、或 toolkit + intake reopen 被证明不可避免时，才允许 reopen`
- proof_obligations:
  - `query root minimality`
  - `workspace repo-internal closure`
  - `query self-host closure`
  - `public landing coherence`
  - `docs/examples/tests residue closure`
  - `behavior continuity`
- delta_from_previous_round:
  - `baseline page rewritten to closure-first delta contract`

## Consensus

- reviewers:
  - `A1`
  - `A2`
  - `A3`
  - `A4`
- adopted_candidate:
  - `Resource Closure-First Delta Contract`
- final_status:
  - `closed`
- stop_rule_satisfied:
  - `true`
- residual_risk:
  - `执行阶段仍需按 Relocation Proof Matrix 真正完成 workspace repo-internal closure、query self-host lineage closure、public d.ts 对齐与 docs/examples/tests residue witness 的落盘与验证`

## Round 2

### Phase

- converge

### Input Residual

- `workspace repo-internal closure`
- `family landing exactness`
- `query self-host closure`
- `exact injection boundary`
- `future reopen gate`
- `relocation proof matrix`

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
