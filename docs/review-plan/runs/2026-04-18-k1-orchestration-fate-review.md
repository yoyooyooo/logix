# K1 Orchestration Fate Review Ledger

## Meta

- target: `docs/proposals/orchestration-existence-challenge.md`
- targets:
  - `docs/proposals/orchestration-existence-challenge.md`
  - `docs/review-plan/runs/2026-04-18-k1-orchestration-existence-review.md`
  - `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`
  - `docs/ssot/runtime/01-public-api-spine.md`
  - `docs/ssot/runtime/03-canonical-authoring.md`
  - `docs/ssot/runtime/10-react-host-projection-boundary.md`
  - `docs/standards/logix-api-next-guardrails.md`
  - `docs/standards/logix-api-next-postponed-naming-items.md`
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
  - `authority target=docs/proposals/orchestration-existence-challenge.md`
  - `bound docs=docs/review-plan/runs/2026-04-18-k1-orchestration-existence-review.md,docs/proposals/public-api-surface-inventory-and-disposition-plan.md,docs/ssot/runtime/01-public-api-spine.md,docs/ssot/runtime/03-canonical-authoring.md,docs/ssot/runtime/10-react-host-projection-boundary.md,docs/standards/logix-api-next-guardrails.md,docs/standards/logix-api-next-postponed-naming-items.md`
  - `source inputs=packages/logix-core/src/{Workflow,Process,Flow,Link,Program}.ts + packages/logix-react/src/{ExpertHooks}.ts + packages/logix-react/src/internal/hooks/useProcesses.ts + examples/logix/src/runtime/root.program.ts + examples/logix/src/scenarios/workflow-codegen-ir.ts + examples/logix/src/scenarios/cross-module-link.ts + examples/logix/src/scenarios/expert-process-app-scope.ts + examples/logix/src/scenarios/expert-process-instance-scope.ts + examples/logix-react/src/demos/ProcessSubtreeDemo.tsx + current docs witnesses`
- review_contract:
  - `artifact_kind=ssot-contract`
  - `review_goal=zero-unresolved`
  - `target_claim=在已冻结的 K1 cluster contract 上，继续收口真正的 fate。当前候选是：Workflow noun、Program.config.workflows、Flow、Link、旧 process link 公开入口、旧声明式 process link 公开入口、旧 process 定义入口、旧 process 定义读取辅助、旧 process metadata 读取辅助、旧 process metadata 写入辅助、Program.config.processes 全部默认 delete；useProcesses 不在 K1 内拿最终 fate，只对 `R3 upstream constraint packet` 输出上游删除约束。任何 surviving candidate 都必须直接支配这版全删默认位，否则不允许保留。`
  - `non_default_overrides=reviewers:4,challenge_scope:open,A4:enabled,residual_only:false`
- review_object_manifest:
  - `source_inputs=K1 cluster contract + current fate row sheet + source code + explicit example witnesses + docs witnesses`
  - `materialized_targets=docs/proposals/orchestration-existence-challenge.md,docs/review-plan/runs/2026-04-18-k1-orchestration-existence-review.md,docs/proposals/public-api-surface-inventory-and-disposition-plan.md,docs/ssot/runtime/01-public-api-spine.md,docs/ssot/runtime/03-canonical-authoring.md,docs/ssot/runtime/10-react-host-projection-boundary.md,docs/standards/logix-api-next-guardrails.md,docs/standards/logix-api-next-postponed-naming-items.md`
  - `authority_target=docs/proposals/orchestration-existence-challenge.md`
  - `bound_docs=docs/review-plan/runs/2026-04-18-k1-orchestration-existence-review.md,docs/proposals/public-api-surface-inventory-and-disposition-plan.md,docs/ssot/runtime/01-public-api-spine.md,docs/ssot/runtime/03-canonical-authoring.md,docs/ssot/runtime/10-react-host-projection-boundary.md,docs/standards/logix-api-next-guardrails.md,docs/standards/logix-api-next-postponed-naming-items.md`
  - `derived_scope=K1 fate closure for Workflow noun, Program.config.workflows, 旧 process 定义入口, Process metadata helpers, Program.config.processes, plus alias-collapse default-closed lane and `R3 upstream constraint packet``
  - `allowed_classes=fate-closure,row-sheet,why-not-delete,semantic-disposition,delete-path,dependent-witness-constraint,future-authority,owner-boundary,de-sugared-mapping,override-matrix`
  - `blocker_classes=expert-parking-lot,slot-survives-after-noun-delete,host-residue-as-proof,implicit-replacement-story,hidden-second-phase`
  - `ledger_target=docs/review-plan/runs/2026-04-18-k1-orchestration-fate-review.md`
- challenge_scope: `open`
- reviewer_set:
  - `A1 structure-purity`
  - `A2 token-economy`
  - `A3 dominance-search`
  - `A4 goal-function-challenge`
- active_advisors:
  - `A4`
- activation_reason: `目标是继续挑战尚未冻结的 orchestration fate，必须显式比较全删默认位与任何 surviving candidate`
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
- ledger_path: `docs/review-plan/runs/2026-04-18-k1-orchestration-fate-review.md`
- writable: `true`

## Assumptions

- `A1`:
  - `summary=当前更强候选应是全删默认位，而不是预留一个更小 Process contract`
  - `status=kept`
  - `resolution_basis=reviewers 未提出能直接支配全删默认位的 surviving candidate`
- `A2`:
  - `summary=若 Workflow noun 删除，Program.config.workflows 也应同步删除`
  - `status=merged`
  - `resolution_basis=已收进 cluster invariant：删 noun 不能默认留 slot`
- `A3`:
  - `summary=若 旧 process 定义入口 删除，Program.config.processes 也应同步删除`
  - `status=merged`
  - `resolution_basis=已收进 cluster invariant：删 noun 不能默认留 slot`
- `A4`:
  - `summary=useProcesses 在 K1 内只产出 `R3 upstream constraint packet`，最终 semantic_disposition 由 R3 持有，这就是当前冻结的 owner 切分`
  - `status=kept`
  - `resolution_basis=proposal 已把它收成 dependent witness + constraint packet；R3 持有最终 fate`

## Row Sheet Snapshot

| surface | candidate-disposition | delete-path / constraint | decision-owner | future-authority |
| --- | --- | --- | --- | --- |
| `Workflow noun` | `delete` | 删除公开 noun；若未来重开，必须另证不可替代静态 contract | `K1` | `pending` |
| `Program.config.workflows` | `delete` | 从公开 assembly surface 移除 | `K1` | `pending` |
| `旧 process 定义入口` | `delete` | `Program.config.processes@app-scope` 删除；`Program.config.processes@instance-scope` 删除；host subtree 只输出到 `R3 upstream constraint packet`；runtime 若仍需能力，只能 internalize 后另文重开 | `K1` | `pending` |
| `旧 process 定义读取辅助` | `delete` | 与 `旧 process 定义入口` 同 fate 删除 | `K1` | `pending` |
| `旧 process metadata 读取辅助` | `delete` | 与 `旧 process 定义入口` 同 fate 删除 | `K1` | `pending` |
| `旧 process metadata 写入辅助` | `delete` | 与 `旧 process 定义入口` 同 fate 删除 | `K1` | `pending` |
| `Program.config.processes` | `delete` | 从公开 assembly surface 移除；internal runtime 若仍需入口，转 internal assembly path | `K1` | `pending` |
| `旧 process link 公开入口` | `delete` | 与 `Link` 同 fate 删除 | `K1` | `pending` |
| `旧声明式 process link 公开入口` | `delete` | 与 `Link` 同 fate 删除 | `K1` | `pending` |
| `Flow` | `delete` | root/subpath 同 fate 删除 | `K1` | `pending` |
| `Link` | `delete` | root/subpath 同 fate 删除；`旧 link 别名入口*` 与 `旧 process link 公开入口*` 同 fate | `K1` | `pending` |
| `useProcesses` | `out-of-scope-final-fate` | `R3 upstream constraint packet`：不得生成新的 public process noun；不得绕开 canonical host law；不得单独证明 `Process` 应保留；不得形成新的 host-owned assembly slot | `R3` | `R3` |

## Round 1

### Phase

- `challenge`

### Input Residual

- `none`

### Findings

- `F1` `critical` `invalidity`:
  - `summary=全删默认位若不覆盖 Program 装配槽位、host witness、root/subpath fate，就会留下第二行为相位侧门`
  - `evidence=A1/A3/A4 一致指出 four-noun challenge 不足以封口；必须升级成 orchestration surface cluster contract`
  - `status=adopted`
- `F2` `high` `invalidity`:
  - `summary=Process 不是单一结构对象；若直接给 Process 预设存活资格，会把 link residue 一起打包留下`
  - `evidence=A1/A3/A4 都要求把 旧 process 定义入口、旧 process link 公开入口、旧声明式 process link 公开入口 拆开审`
  - `status=adopted`
- `F3` `high` `invalidity`:
  - `summary=Flow / Link / 旧 process link 公开入口 / 旧声明式 process link 公开入口 更像 alias-collapse lane，不该占主辩场预算`
  - `evidence=A1/A2/A4 都要求把它们压到 default-closed lane`
  - `status=adopted`
- `F4` `high` `invalidity`:
  - `summary=delete-path 若只写成模糊替代叙事，会把举证责任偷渡回 delete 一侧`
  - `evidence=A1/A4 都要求把 delete-path 拆成明确 lane，并保持 proof burden 单向稳定`
  - `status=adopted`
- `F5` `medium` `ambiguity`:
  - `summary=useProcesses 必须只作为 dependent witness，对 R3 输出上游约束，不能在 K1 内继续代持 owner split`
  - `evidence=A1/A2/A4 都指出 host residue 不能反证 core orchestration surface 应保留`
  - `status=adopted`
- `F6` `medium` `ambiguity`:
  - `summary=proposal 与 ledger 需要同时压成 row-wise contract，避免多处并行叙事`
  - `evidence=A2 明确指出当前文本结构会持续抬高 converge 成本`
  - `status=adopted`

### Counter Proposals

- `P1`:
  - `summary=升级成 orchestration surface cluster contract，并把 noun、slot、host witness、root/subpath 同 fate 一并纳入`
  - `why_better=一次性堵住删 noun 留 slot、删 slot 靠 host residue 回流的侧门`
  - `overturns_assumptions=A2,A3`
  - `resolves_findings=F1,F5`
  - `supersedes_proposals=four-noun-only fate review`
  - `dominance=dominates`
  - `axis_scores=concept-count:+1, public-surface:+2, compat-budget:0, migration-cost:0, proof-strength:+4, future-headroom:+3`
  - `status=adopted`
- `P2`:
  - `summary=Process 语义单元拆分 + alias-collapse lane + delete-first`
  - `why_better=消除 Process 特许通道与 Flow/Link 的无效预算占用`
  - `overturns_assumptions=A1`
  - `resolves_findings=F2,F3`
  - `supersedes_proposals=single Process survivor candidate`
  - `dominance=dominates`
  - `axis_scores=concept-count:+2, public-surface:+2, compat-budget:+1, migration-cost:0, proof-strength:+3, future-headroom:+2`
  - `status=adopted`
- `P3`:
  - `summary=单向 proof burden + explicit delete-path + witness-only rule for examples/README/current usage`
  - `why_better=把目标函数挑战从态度收成硬门禁`
  - `overturns_assumptions=A1,A4`
  - `resolves_findings=F4,F5`
  - `supersedes_proposals=implicit replacement story / popularity-backed survival`
  - `dominance=dominates`
  - `axis_scores=concept-count:+1, public-surface:+1, compat-budget:0, migration-cost:0, proof-strength:+4, future-headroom:+2`
  - `status=adopted`
- `P4`:
  - `summary=authority target 与 ledger 同时收成 row-wise contract`
  - `why_better=降低 second maintenance，后续 converge 只对 row 做 diff`
  - `overturns_assumptions=A4`
  - `resolves_findings=F6`
  - `supersedes_proposals=multi-layer prose mirroring`
  - `dominance=dominates`
  - `axis_scores=concept-count:+3, public-surface:0, compat-budget:0, migration-cost:+1, proof-strength:+3, future-headroom:+2`
  - `status=adopted`

### Resolution Delta

- `F1` `adopted`
- `F2` `adopted`
- `F3` `adopted`
- `F4` `adopted`
- `F5` `adopted`
- `F6` `adopted`
- `P1` `adopted`
- `P2` `adopted`
- `P3` `adopted`
- `P4` `adopted`

## Adoption

- adopted_candidate:
  - `SYN-FATE-1 delete-first row-sheet cluster`
- lineage:
  - `P1`
  - `P2`
  - `P3`
  - `P4`
- rejected_alternatives:
  - `保留 Process 预设幸存资格`
  - `把 Flow/Link 继续放在主辩场`
  - `让 examples/README/current usage 继续当 survival proof`
  - `让 proposal 与 ledger 平行写 fate`
- rejection_reason:
  - `这些方向都会保留 expert parking lot、second maintenance 或举证责任回摆`
- dominance_verdict:
  - `SYN-FATE-1 在 proof-strength、public-surface closure 与 future-headroom 上严格优于 baseline，并通过 Ramanujan/Kolmogorov/Godel 三重 gate`

### Freeze Record

- adopted_summary:
  - `K1 fate review 采用 delete-first row-sheet cluster：Workflow noun、Program.config.workflows、旧 process 定义入口、Process metadata helpers、Program.config.processes 进入 fate row；Flow/Link/旧 process link 公开入口/旧声明式 process link 公开入口 进入 alias-collapse default-closed lane；useProcesses 只作为 dependent witness，并由 R3 upstream constraint packet 接走 owner 约束；examples/README/current usage 只算 witness`
- kernel_verdict:
  - `通过。新方案压掉了 Process 特许通道、implicit replacement story、host residue 侧门和多处平行编码`
- frozen_decisions:
  - `delete-first 是当前唯一默认位`
  - `没有 surviving candidate 可以靠“当前有人在用”“README 还在写”“内部已有实现”获保留资格`
  - `useProcesses` 不在 K1 内拿最终 semantic_disposition`
  - `A2/A3 已降为 cluster invariant`
  - `A4 已降为 owner 切分事实`
- non_goals:
  - `本轮不直接改实现代码`
  - `本轮不直接回写 live SSoT`
  - `本轮不开始实现`
- allowed_reopen_surface:
  - `是否存在严格支配全删默认位的最小 Process contract`
  - `R3 upstream constraint packet 是否仍需压缩`
  - `examples cleanup owner 是否还需更显式绑定`
- proof_obligations:
  - `proposal 与 ledger 必须都维持 row-sheet contract`
  - `Process public subpath 不得留下 ghost metadata surface`
  - `delete-path 不得写成模糊替代叙事`
  - `examples/README/current usage 只能影响 migration-cost`
- delta_from_previous_round:
  - `从 cluster contract 进一步压成 delete-first fate row sheet`

## Round 2

### Phase

- `converge`

### Input Residual

- `Process public subpath 是否已通过 metadata helper rows 闭合`
- `旧 process 定义入口` 的 delete-path 是否已从模糊替代叙事收成单值 lane`
- `useProcesses -> R3` 的 owner 切分与约束包是否已冻结`
- `authority target 与 ledger 是否都拥有同构 row-sheet 视图`

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
- `residual_risk=后续若 authority target 的 row 集或列语义继续变化，必须同步回写 Row Sheet Snapshot；另外 R3 materialize 时必须严格继承 R3 upstream constraint packet，不能把 README/demo/current usage 重新抬成 survival proof`
