# ReadQuery Selector Law Internalization Contract Review Ledger

## Meta

- target:
  - `docs/proposals/read-query-selector-law-internalization-contract.md`
- targets:
  - `docs/proposals/read-query-selector-law-internalization-contract.md`
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
  - `target_claim: ReadQuery 应完整回收到 selector law internal owner，repo consumer 级主名词退出，React host 与 helper 只保留 selector input 心智。`
  - `non_default_overrides: reviewer_count=4; active_advisors=A4; challenge_scope=open`
- review_object_manifest:
  - `source_inputs: docs/proposals/read-query-selector-law-internalization-contract.md`
  - `materialized_targets: docs/proposals/read-query-selector-law-internalization-contract.md`
  - `authority_target: docs/proposals/read-query-selector-law-internalization-contract.md`
  - `bound_docs: docs/proposals/read-query-external-store-resource-final-owner-map-contract.md; docs/proposals/core-read-projection-protocol-contract.md; docs/ssot/runtime/01-public-api-spine.md; docs/ssot/runtime/10-react-host-projection-boundary.md; docs/standards/logix-api-next-guardrails.md`
  - `derived_scope: single-file contract with bound authority docs`
  - `allowed_classes: owner-map closure; public-surface closure; repo-internal fate; helper contract; verification gates; docs writeback target`
  - `blocker_classes: living planning anchor; stale ReadQuery noun residue; dual authority; fake closed repo-internal route; unverifiable closure`
  - `ledger_target: docs/review-plan/runs/2026-04-20-read-query-selector-law-internalization-review.md`
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
  - `docs/review-plan/runs/2026-04-20-read-query-selector-law-internalization-review.md`
- writable:
  - `true`

## Assumptions

- A1:
  - summary:
    - `ReadQuery` 当前目标工件属于 `ssot-contract`，且本轮目标是 `zero-unresolved`
  - status:
    - `kept`
  - resolution_basis:
    - `用户明确要求用 plan-optimality-loop 打磨提案；目标文件是结构化 contract proposal`
- A2:
  - summary:
    - `challenge_scope` 取 `open`，允许 reviewer 直接挑战目标函数、owner 边界与更小替代方案
  - status:
    - `overturned`
  - resolution_basis:
    - `reviewer 交集证明原目标文本把 zero-unresolved 写成了活分支 contract，必须改写 adopted candidate`
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
  - `repo-internal fate` 仍是活分叉，和 `review_goal = zero-unresolved` 冲突
  - evidence:
    - 原稿同时允许 “直接 internalize / selector-specific repo contract” 两条路
    - reviewer 交集确认 `read-contracts` 与 `InternalContracts` 都仍可能把 `ReadQuery` 暴露给 workspace consumer
  - status:
    - `merged`
- F2 `high` `ambiguity`:
  - helper contract 与 React host exact contract 重叠，并引入 `selector descriptor` 词层
  - evidence:
    - 原稿重复重写 `useSelector` 公式与 helper 叙事
    - `runtime/10` 已单点冻结 helper exact noun、import shape 与 owner
  - status:
    - `merged`
- F3 `high` `invalidity`:
  - 验证门只有正向行为 witness，没有 negative closure proof
  - evidence:
    - 原稿未覆盖 exports boundary、repo-internal allowlist、public d.ts noun residue、docs/examples/test residue
  - status:
    - `merged`
- F4 `medium` `controversy`:
  - 文档回写目标不足，旧 proposal authority 与 stale noun residue 仍可继续活着
  - evidence:
    - `core-residual-surface-contract`、`core-residual-adjunct-contract`、`form-react-sugar-factory-api-candidate` 仍保留旧 `ReadQuery` 口径
  - status:
    - `merged`

### Counter Proposals

- P1:
  - summary:
    - `closure-first delta contract`
  - why_better:
    - 把页面压成单权威 delta contract，删掉重复 host 叙事，收紧成单值终局
  - overturns_assumptions:
    - `A2`
    - `A4`
  - resolves_findings:
    - `F1`
    - `F2`
    - `F3`
  - supersedes_proposals:
    - none
  - dominance:
    - `dominates`
  - axis_scores:
    - `concept-count: +3`
    - `public-surface: +1`
    - `compat-budget: 0`
    - `migration-cost: 0`
    - `proof-strength: +3`
    - `future-headroom: +2`
- P2:
  - summary:
    - `proof-matrix rewrite`
  - why_better:
    - 把验证门改成 closure obligation matrix，直接证明 noun extinction 与 repo-internal closure
  - overturns_assumptions:
    - `A4`
  - resolves_findings:
    - `F3`
    - `F4`
  - supersedes_proposals:
    - none
  - dominance:
    - `dominates`
  - axis_scores:
    - `concept-count: +2`
    - `public-surface: +1`
    - `compat-budget: +1`
    - `migration-cost: +1`
    - `proof-strength: +3`
    - `future-headroom: +1`

### Resolution Delta

- `A2` -> `overturned`
- `A4` -> `overturned`
- `F1..F4` -> `merged`
- `P1 + P2` -> `adopted-candidate input`

## Adoption

- adopted_candidate:
  - `ReadQuery Closure-First Delta Contract`
- lineage:
  - `baseline + P1 + P2`
- rejected_alternatives:
  - `保留 selector-specific repo contract 作为本页 authority 选项`
- rejection_reason:
  - `不满足 zero-unresolved；会把 repo-internal fate 留成活分支`
- dominance_verdict:
  - `adopted candidate dominates baseline on concept-count / proof-strength / future-headroom, while keeping compat-budget stable`

### Freeze Record

- adopted_summary:
  - `把本页压成单权威 delta contract，只保留 noun extinction、repo-internal exact closure、helper public type ban、closure proof matrix 与 writeback targets`
- kernel_verdict:
  - `通过 Ramanujan gate`
  - `通过 Kolmogorov gate`
  - `通过 Godel gate`
- frozen_decisions:
  - `ReadQuery 不保留任何 workspace repo-internal survivor`
  - `helper exact noun / import shape / owner 继续由 runtime/10 单点持有`
  - `helper 公开面不得暴露 ReadQuery noun，也不得新增 descriptor family`
  - `验证门改成 positive capability witness + negative closure proof`
  - `旧 active proposal residue 必须进入去权威或改口径清单`
- non_goals:
  - `不处理 ExternalStore`
  - `不处理 Resource`
  - `不冻结内部目录或当前测试家族名`
- allowed_reopen_surface:
  - `只有在 repo-internal bridge 被证明不可避免，且能绑定 exact path / sole consumers / sunset gate 时，才允许 reopen`
- proof_obligations:
  - `exports boundary`
  - `repo-internal allowlist closure`
  - `public d.ts noun extinction`
  - `docs/examples/tests residue closure`
  - `semantic capability continuity`
- delta_from_previous_round:
  - `baseline page rewritten to closure-first delta contract`

## Round 2

### Phase

- converge

### Input Residual

- `repo-internal fate`
- `helper authority overlap`
- `negative closure proof`
- `planning residue cleanup`

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- `F1` -> `closed`
- `F2` -> `closed`
- `F3` -> `closed`
- `F4` -> `closed`

## Consensus

- reviewers:
  - `A1`
  - `A2`
  - `A3`
  - `A4`
- adopted_candidate:
  - `ReadQuery Closure-First Delta Contract`
- final_status:
  - `closed`
- stop_rule_satisfied:
  - `true`
- residual_risk:
  - `执行阶段仍需按 Closure Proof Matrix 真正完成 exports、repo-internal、public d.ts、docs/examples/tests residue 的落盘与验证`
