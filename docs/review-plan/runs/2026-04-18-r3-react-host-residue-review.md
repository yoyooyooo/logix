# R3 React Host Residue Review Ledger

## Meta

- target: `docs/proposals/react-expert-host-residue-contract.md`
- targets:
  - `docs/proposals/react-expert-host-residue-contract.md`
  - `docs/proposals/orchestration-existence-challenge.md`
  - `docs/review-plan/runs/2026-04-18-k1-orchestration-fate-review.md`
  - `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`
  - `docs/ssot/runtime/10-react-host-projection-boundary.md`
  - `docs/ssot/runtime/07-standardized-scenario-patterns.md`
  - `docs/standards/logix-api-next-guardrails.md`
  - `packages/logix-react/README.md`
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
  - `authority target=docs/proposals/react-expert-host-residue-contract.md`
  - `bound docs=docs/proposals/orchestration-existence-challenge.md,docs/review-plan/runs/2026-04-18-k1-orchestration-fate-review.md,docs/proposals/public-api-surface-inventory-and-disposition-plan.md,docs/ssot/runtime/10-react-host-projection-boundary.md,docs/ssot/runtime/07-standardized-scenario-patterns.md,docs/standards/logix-api-next-guardrails.md,packages/logix-react/README.md`
  - `source inputs=packages/logix-react/src/{ExpertHooks,ReactPlatform,Platform}.ts + packages/logix-react/src/internal/hooks/useProcesses.ts + packages/logix-react/src/internal/platform/ReactPlatformLayer.ts + packages/logix-react/test/ReactPlatform/ReactPlatform.test.tsx + packages/logix-react/test/Platform/*.test.ts* + packages/logix-react/test/Hooks/useProcesses.test.tsx + examples/logix-react/src/demos/ProcessSubtreeDemo.tsx + examples/logix-react/src/demos/SessionModuleLayout.tsx + packages/logix-react/README.md + apps/docs/content/docs/api/react/use-processes*.md + apps/docs/content/docs/guide/essentials/react-integration*.md + apps/docs/content/docs/guide/recipes/react-integration*.md`
- review_contract:
  - `artifact_kind=ssot-contract`
  - `review_goal=zero-unresolved`
  - `target_claim=在 K1 已冻结的上游约束下，继续收口 R3 fate。当前 semantic row 候选是：useProcesses、ReactPlatform、ReactPlatformLayer 全部默认 delete。任何 surviving candidate 都必须直接支配这版 delete-first 候选，否则不允许保留。carrier reach 只作为 same-fate shell，不单独占行。`
  - `non_default_overrides=reviewers:4,challenge_scope:open,A4:enabled,residual_only:false`
- review_object_manifest:
  - `source_inputs=react residue contract + K1 upstream constraints + code/tests/examples/docs witnesses`
  - `materialized_targets=docs/proposals/react-expert-host-residue-contract.md,docs/proposals/orchestration-existence-challenge.md,docs/review-plan/runs/2026-04-18-k1-orchestration-fate-review.md,docs/proposals/public-api-surface-inventory-and-disposition-plan.md,docs/ssot/runtime/10-react-host-projection-boundary.md,docs/ssot/runtime/07-standardized-scenario-patterns.md,docs/standards/logix-api-next-guardrails.md,packages/logix-react/README.md,apps/docs/content/docs/api/react/use-processes.md,apps/docs/content/docs/api/react/use-processes.cn.md,apps/docs/content/docs/guide/essentials/react-integration.md,apps/docs/content/docs/guide/essentials/react-integration.cn.md,apps/docs/content/docs/guide/recipes/react-integration.md,apps/docs/content/docs/guide/recipes/react-integration.cn.md`
  - `authority_target=docs/proposals/react-expert-host-residue-contract.md`
  - `bound_docs=docs/proposals/orchestration-existence-challenge.md,docs/review-plan/runs/2026-04-18-k1-orchestration-fate-review.md,docs/proposals/public-api-surface-inventory-and-disposition-plan.md,docs/ssot/runtime/10-react-host-projection-boundary.md,docs/ssot/runtime/07-standardized-scenario-patterns.md,docs/standards/logix-api-next-guardrails.md,packages/logix-react/README.md`
  - `derived_scope=R3 fate closure for semantic rows useProcesses / ReactPlatform / ReactPlatformLayer, plus same-fate carrier shells and inherited constraints`
  - `allowed_classes=fate-closure,row-sheet,carrier-normalization,why-not-delete,semantic-disposition,delete-path,upstream-constraint-inheritance,future-authority,owner-boundary,de-sugared-mapping,override-matrix`
  - `blocker_classes=host-residue-as-proof,compat-aggregator-bias,second-host-truth,implicit-platform-survival,README-demo-bias`
  - `ledger_target=docs/review-plan/runs/2026-04-18-r3-react-host-residue-review.md`
- challenge_scope: `open`
- reviewer_set:
  - `A1 structure-purity`
  - `A2 token-economy`
  - `A3 dominance-search`
  - `A4 goal-function-challenge`
- active_advisors:
  - `A4`
- activation_reason: `目标是继续打掉 React host residue，必须显式比较 delete-first 候选与任何 surviving bridge`
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
- stop_rule:
  - `新 proposal 或 reopen 必须同时通过 Ramanujan/Kolmogorov/Godel 三个 gate`
- reopen_bar:
  - `只有在 dominance axes 上形成严格改进，或在核心轴不恶化前提下显著提高 proof-strength，才允许 reopen`
- ledger_path: `docs/review-plan/runs/2026-04-18-r3-react-host-residue-review.md`
- writable: `true`

## Assumptions

- `A1`:
  - `summary=delete-first 是当前更强候选，ExpertHooks/useProcesses/ReactPlatform 默认都不应保留`
  - `status=open`
  - `resolution_basis=待 review`
- `A2`:
  - `summary=ReactPlatform 是兼容聚合器，不享有独立保留资格`
  - `status=open`
  - `resolution_basis=待 review`
- `A3`:
  - `summary=若 ReactPlatformLayer 真有独立价值，它也只能作为 delete 默认位上的 reopen-eligible bridge row 存活`
  - `status=open`
  - `resolution_basis=待 review`

## Inherited Facts

- `F-A4`:
  - `summary=R3 必须继承 K1 的 upstream constraint packet，不能用 useProcesses 反证 Process family 该保留`
  - `resolution_basis=K1 已冻结为上游约束，本轮只负责机械继承，不重审`

## Row Sheet Snapshot

| surface | carrier-reach | candidate-disposition | delete-path / constraint | decision-owner | future-authority |
| --- | --- | --- | --- | --- | --- |
| `useProcesses` | `./ExpertHooks` | `delete` | 从公开 host residue 删除；root import promise 无效；docs 只影响 cleanup cost；若未来保留，只能改造成机械回解到 canonical host law 的更小 contract | `R3` | `pending` |
| `ReactPlatform` | `root .`、`./ReactPlatform` | `delete` | 删除兼容聚合器；`Provider / useModule / useSelector / useDispatch` 回到 canonical host law；`createRoot(runtime)` 退糖为 `<RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>` 薄组件工厂 | `R3` | `pending` |
| `ReactPlatformLayer` | `root . via Platform export`、`./Platform` | `delete` | 默认删除；若未来翻案，必须先补 `surface-owner / entrypoint-shell / trigger-surface / de-sugared mapping / future-authority / single delete-path owner` 六列 bridge packet；若不翻案，lifecycle bridge internalize | `R3` | `pending` |

## Round 1

### Phase

- `challenge`

### Input Residual

- `none`

### Findings

- `F1` `critical` `invalidity`:
  - `summary=R3 还在把 carrier shell 与 semantic surface 混写，导致 ghost-shell 风险与 review 面膨胀`
  - `evidence=A1/A2 一致要求把 `ExpertHooks / Platform` 降成 carrier_reach，不再独立占行`
  - `status=adopted`
- `F2` `high` `invalidity`:
  - `summary=ReactPlatformLayer 被预授“still alive 候选”气味，但 bridge contract 尚未闭合`
  - `evidence=A1/A3/A4 都指出当前它只有注册面，没有闭合的公开 trigger contract`
  - `status=adopted`
- `F3` `high` `invalidity`:
  - `summary=README / apps/docs / guides 的活跃 promise 尚未机械收成 override matrix`
  - `evidence=A1/A2/A3/A4 都指出 README-demo-bias 仍会形成第二 authority`
  - `status=adopted`
- `F4` `medium` `ambiguity`:
  - `summary=K1 的 upstream constraint packet 仍被当作 open assumption 重审`
  - `evidence=A1/A2 都要求把 A4 降成 inherited fact`
  - `status=adopted`
- `F5` `medium` `ambiguity`:
  - `summary=ReactPlatform 的 root/subpath/member reach 没有完全机械入表，`createRoot` 退糖还不够显式`
  - `evidence=A4 明确指出 root 直达路径与 `createRoot` 是当前 delete-first contract 的关键缺口`
  - `status=adopted`

### Counter Proposals

- `P1`:
  - `summary=semantic row sheet + carrier normalization`
  - `why_better=把 decision object 压到最小公理集，消掉 carrier row 的重复预算`
  - `overturns_assumptions=A1`
  - `resolves_findings=F1,F5`
  - `supersedes_proposals=carrier row and semantic row mixed model`
  - `dominance=dominates`
  - `axis_scores=concept-count:+4, public-surface:+2, compat-budget:0, migration-cost:0, proof-strength:+4, future-headroom:+2`
  - `status=adopted`
- `P2`:
  - `summary=override matrix + witness-owner cleanup contract`
  - `why_better=把 README/apps/docs/guide/tests/examples 从活跃 promise 降成可执行 cleanup 约束`
  - `overturns_assumptions=A1,A4`
  - `resolves_findings=F3,F4`
  - `supersedes_proposals=generic challenge override bullet`
  - `dominance=dominates`
  - `axis_scores=concept-count:+2, public-surface:+1, compat-budget:0, migration-cost:+1, proof-strength:+5, future-headroom:+3`
  - `status=adopted`
- `P3`:
  - `summary=ReactPlatformLayer bridge contract or delete`
  - `why_better=取消预授权存活偏置，把它压回 delete 默认位，只有补齐完整 bridge packet 才允许 reopen`
  - `overturns_assumptions=A3`
  - `resolves_findings=F2`
  - `supersedes_proposals=still-alive candidate framing`
  - `dominance=dominates`
  - `axis_scores=concept-count:+2, public-surface:+2, compat-budget:0, migration-cost:0, proof-strength:+4, future-headroom:+3`
  - `status=adopted`

### Resolution Delta

- `F1` `adopted`
- `F2` `adopted`
- `F3` `adopted`
- `F4` `adopted`
- `F5` `adopted`
- `P1` `adopted`
- `P2` `adopted`
- `P3` `adopted`

## Adoption

- adopted_candidate:
  - `SYN-R3-1 delete-first semantic row sheet`
- lineage:
  - `P1`
  - `P2`
  - `P3`
- rejected_alternatives:
  - `carrier shell 与 semantic surface 混审`
  - `把 A4 继续挂成 open assumption`
  - `让 ReactPlatformLayer 先拿 why-not-delete 特权`
  - `让 README/apps/docs/guide 继续以泛 witness 方式说话`
- rejection_reason:
  - `这些方向都会留下第二 authority、ghost-shell 风险或预授权存活偏置`
- dominance_verdict:
  - `SYN-R3-1 在 concept-count、proof-strength、future-headroom 上严格优于 baseline，并通过 Ramanujan/Kolmogorov/Godel 三重 gate`

### Freeze Record

- adopted_summary:
  - `R3 采用 delete-first semantic row sheet：useProcesses、ReactPlatform、ReactPlatformLayer 三条 semantic row；carrier shell 退成 same-fate reach；K1 upstream constraint packet 作为 inherited fact；README/apps/docs/guide/tests/examples 全部降为 witness-only cleanup；ReactPlatformLayer 改成 bridge contract or delete`
- kernel_verdict:
  - `通过。新方案压掉了 carrier/semantic 混写、README-demo-bias、A4 重审与 ReactPlatformLayer 预授权存活`
- frozen_decisions:
  - `delete-first 是当前唯一默认位`
  - `useProcesses` 默认 `delete`
  - `ReactPlatform` 默认 `delete`
  - `ReactPlatformLayer` 默认 `delete`
  - `ReactPlatformLayer` 若要存活，只能走 bridge contract reopen`
  - `carrier reach 不再单独占 fate row`
  - `A4 已降为 inherited fact`
- non_goals:
  - `本轮不直接改实现代码`
  - `本轮不直接回写 live SSoT`
  - `本轮不开始实现`
- allowed_reopen_surface:
  - `是否存在严格支配 delete-first 的更小 React host bridge contract`
  - `future-authority` 最终回写 owner 是否仍可继续压缩`
  - `cleanup owner` 在真正 docs cutover 时是否还需更细颗粒度`
- proof_obligations:
  - `README/apps/docs/guide 只能影响 cleanup cost`
  - `ReactPlatform.createRoot` 的退糖必须保持机械明确`
  - `Platform` 与 `ReactPlatformLayer` 的 same-fate import-shape 必须继续维持`
  - `R3 不得重审 K1 upstream constraint packet`
- delta_from_previous_round:
  - `从 wide residue proposal 压成 semantic row-sheet contract`

## Round 2

### Phase

- `converge`

### Input Residual

- `semantic row 粒度是否已统一`
- `override matrix 是否已机械化`
- `A4 是否已降为 inherited fact`
- `ReactPlatformLayer 是否已改成 bridge contract or delete`
- `root/subpath/member reach 与 createRoot 退糖是否已显式化`

### Findings

- `无 unresolved findings`

### Counter Proposals

- `none`

### Resolution Delta

- `all round-1 residuals closed`

## Consensus

- `consensus_status=closed`
- `all_reviewers=无 unresolved findings`
- `stale_results=none`
- `residual_risk=后续 live SSoT/README/apps docs 真正回写时，必须严格按 override matrix、same-fate carrier 规则与 witness-only cleanup 规则落盘；否则可能重新长出文档漂移，但这不再构成本轮 R3 contract 的 unresolved finding`
