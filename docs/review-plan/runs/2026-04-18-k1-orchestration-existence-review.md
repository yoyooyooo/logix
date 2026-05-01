# K1 Orchestration Existence Review Ledger

## Meta

- target: `docs/proposals/orchestration-existence-challenge.md`
- targets:
  - `docs/proposals/orchestration-existence-challenge.md`
  - `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`
  - `docs/ssot/runtime/01-public-api-spine.md`
  - `docs/ssot/runtime/03-canonical-authoring.md`
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
  - `bound docs=docs/proposals/public-api-surface-inventory-and-disposition-plan.md,docs/ssot/runtime/01-public-api-spine.md,docs/ssot/runtime/03-canonical-authoring.md,docs/ssot/runtime/10-react-host-projection-boundary.md,docs/standards/logix-api-next-guardrails.md,docs/standards/logix-api-next-postponed-naming-items.md`
  - `source inputs=packages/logix-core/src/{Workflow,Process,Flow,Link,Program}.ts + packages/logix-react/src/{ExpertHooks}.ts + packages/logix-react/src/internal/hooks/useProcesses.ts + core root barrel`
- review_contract:
  - `artifact_kind=ssot-contract`
  - `review_goal=zero-unresolved`
  - `target_claim=把 K1 从四个 noun 的存在性挑战升级成 orchestration surface cluster contract。当前默认起点是 delete；任何 surviving candidate 都必须先证明 why-not-delete，不能靠旧 expert family、旧 static-first 目标函数、装配槽位残留或 host residue 获得保留资格。这轮要把 noun、assembly slot、root/subpath fate、future authority 与 delete-path 一并挑战到无 unresolved findings；host witness 只作为 dependent witness 读取，并对 R3 输出上游约束，不在 K1 内直接拿最终 fate。`
  - `non_default_overrides=reviewers:4,challenge_scope:open,A4:enabled,residual_only:false`
- review_object_manifest:
  - `source_inputs=core public barrel + Workflow/Process/Flow/Link/Program source + ExpertHooks/useProcesses host witness + current SSoT/guardrails`
  - `materialized_targets=docs/proposals/orchestration-existence-challenge.md,docs/proposals/public-api-surface-inventory-and-disposition-plan.md,docs/ssot/runtime/01-public-api-spine.md,docs/ssot/runtime/03-canonical-authoring.md,docs/ssot/runtime/10-react-host-projection-boundary.md,docs/standards/logix-api-next-guardrails.md,docs/standards/logix-api-next-postponed-naming-items.md`
  - `authority_target=docs/proposals/orchestration-existence-challenge.md`
  - `bound_docs=docs/proposals/public-api-surface-inventory-and-disposition-plan.md,docs/ssot/runtime/01-public-api-spine.md,docs/ssot/runtime/03-canonical-authoring.md,docs/ssot/runtime/10-react-host-projection-boundary.md,docs/standards/logix-api-next-guardrails.md,docs/standards/logix-api-next-postponed-naming-items.md`
  - `derived_scope=orchestration surface cluster contract for Workflow/Process/Flow/Link + Program assembly slots, with dependent host witness constraints for ExpertHooks.useProcesses`
  - `allowed_classes=existence-challenge,cluster-contract,alias-collapse,why-not-delete,owner-boundary,future-authority,de-sugared-mapping,assembly-slot-fate,host-witness-constraint,root-subpath-fate,delete-path`
  - `blocker_classes=legacy-preservation-bias,expert-parking-lot,hidden-static-first-premise,alias-without-independent-value,second-behavior-phase,unbound-assembly-slot,host-owner-split,ghost-root-surface`
  - `ledger_target=docs/review-plan/runs/2026-04-18-k1-orchestration-existence-review.md`
- challenge_scope: `open`
- reviewer_set:
  - `A1 structure-purity`
  - `A2 token-economy`
  - `A3 dominance-search`
  - `A4 goal-function-challenge`
- active_advisors:
  - `A4`
- activation_reason: `目标是挑战旧公开概念是否还应存在，必须显式否定错误目标函数`
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
- ledger_path: `docs/review-plan/runs/2026-04-18-k1-orchestration-existence-review.md`
- writable: `true`

## Assumptions

- `A1`:
  - `summary=K1 只审 旧 orchestration 家族 四个 noun，就足以完成 orchestration surface 的 zero-unresolved 收口`
  - `status=open`
  - `resolution_basis=待 review`
- `A2`:
  - `summary=Link 作为 Process 的别名壳层，不享有独立保留资格`
  - `status=open`
  - `resolution_basis=待 review`
- `A3`:
  - `summary=Flow 作为薄 wrapper，不享有独立保留资格`
  - `status=open`
  - `resolution_basis=待 review`
- `A4`:
  - `summary=Workflow 默认 delete 的直接理由应来自结构重复、第二行为相位风险与 static-first IR 偏置；naming 后撤只算 witness`
  - `status=open`
  - `resolution_basis=待 review`
- `A5`:
  - `summary=Process 不享有预设保留资格；若要存活，必须先拆掉 link/linkDeclarative residue，再证明最小 contract 的 why-not-delete`
  - `status=open`
  - `resolution_basis=待 review`

## Round 1

### Phase

- `challenge`

### Input Residual

- `none`

### Findings

- `F1` `blocker` `invalidity`:
  - `summary=K1 还停在四个 noun 层，未把 Program.config.processes/workflows 纳入同一份 decision contract；host residue 需要改成 dependent witness constraint`
  - `evidence=A1/A2/A3/A4 都指出删 noun 后 slot 仍可让第二行为相位继续存活，而 host residue 不能代持最终 fate`
  - `status=adopted`
- `F2` `high` `invalidity`:
  - `summary=Process 当前不是单一结构单元；若先给它 surviving candidate 特权，会把 link/linkDeclarative residue 一起打包保留`
  - `evidence=A1/A2/A4 都指出 旧 process 定义入口、旧 process link 公开入口、旧声明式 process link 公开入口 至少应拆成独立待裁单元`
  - `status=adopted`
- `F3` `high` `invalidity`:
  - `summary=Flow/Link 作为薄壳与 alias 已接近机械删除，但 proposal 仍给了和 Workflow/Process 接近同等的叙事权重`
  - `evidence=A1/A2/A4 都要求把 Flow/Link 提前收进 alias-collapse 或 default-closed lane`
  - `status=adopted`
- `F4` `high` `invalidity`:
  - `summary=challenge override 只降级了旧 noun 文案，没有把 live docs 中授权 workflows/processes 槽位与 expert API 存活的语句降为 witness`
  - `evidence=A3/A4 都指出 second authority 仍活着`
  - `status=adopted`
- `F5` `medium` `ambiguity`:
  - `summary=Workflow 默认 delete 的证明基座写偏了，naming retreat 只能算 witness，不能单独承担结构删除依据`
  - `evidence=A1/A2/A4 都要求把 A4 改写为结构命题`
  - `status=adopted`
- `F6` `medium` `ambiguity`:
  - `summary=survival proof gate 只定义了 surviving candidate 的补证要求，没有冻结 delete-path`
  - `evidence=A1/A4 都要求补 assembly-slot fate、host-witness fate、root-subpath fate、live-doc owner`
  - `status=adopted`

### Counter Proposals

- `P1`:
  - `summary=把 K1 升级成 row-wise orchestration surface cluster contract，显式覆盖 noun、assembly slot，并把 host residue 改成 dependent witness constraint`
  - `why_better=一次性堵住 noun 删除后靠 slot 继续存活的漏洞，同时避免 K1 与 R3 抢 owner`
  - `overturns_assumptions=A1`
  - `resolves_findings=F1,F4,F6`
  - `supersedes_proposals=four-noun-only existence challenge`
  - `dominance=dominates`
  - `axis_scores=concept-count:+1, public-surface:+2, compat-budget:0, migration-cost:0, proof-strength:+3, future-headroom:+3`
  - `status=adopted`
- `P2`:
  - `summary=split-lane delete-first：Flow/Link default-closed；主战场只留 Workflow、旧 process 定义入口、Program.config.workflows、Program.config.processes、useProcesses`
  - `why_better=先把机械可判定的 alias residue 移出主辩场，把 review 预算留给真正可能 still alive 的对象`
  - `overturns_assumptions=A2,A3`
  - `resolves_findings=F2,F3`
  - `supersedes_proposals=cluster-level A/B/C without alias lane`
  - `dominance=dominates`
  - `axis_scores=concept-count:+2, public-surface:+1, compat-budget:+1, migration-cost:0, proof-strength:+2, future-headroom:+1`
  - `status=adopted`
- `P3`:
  - `summary=把 Process 的 surviving candidate 从 noun 级降到语义单元级，只允许剥离 link/linkDeclarative residue 后再讨论最小 contract`
  - `why_better=消除“极小 Process kernel” parking lot`
  - `overturns_assumptions=A5`
  - `resolves_findings=F2`
  - `supersedes_proposals=Process as pre-authorized survivor`
  - `dominance=dominates`
  - `axis_scores=concept-count:+2, public-surface:+2, compat-budget:+1, migration-cost:0, proof-strength:+3, future-headroom:+2`
  - `status=adopted`
- `P4`:
  - `summary=把 A4 改成结构命题，并增加 admissibility/deletion-path contract`
  - `why_better=把 naming retreat 降为 witness-only，并把 delete-default 变成可执行 contract`
  - `overturns_assumptions=A4`
  - `resolves_findings=F5,F6`
  - `supersedes_proposals=naming-derived delete default`
  - `dominance=dominates`
  - `axis_scores=concept-count:+1, public-surface:+1, compat-budget:0, migration-cost:0, proof-strength:+4, future-headroom:+2`
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
  - `SYN-1 orchestration surface cluster contract + split-lane delete-first`
- lineage:
  - `P1`
  - `P2`
  - `P3`
  - `P4`
- rejected_alternatives:
  - `只审四个 noun`
  - `Process 预设唯一 surviving candidate`
  - `Flow/Link 与 Workflow/Process 同权重审`
  - `只定义 surviving proof，不定义 delete-path`
- rejection_reason:
  - `这些方向都会留下 slot/host residue 侧门、expert parking lot 或命名/结构双系统`
- dominance_verdict:
  - `SYN-1 在 proof-strength、public-surface closure 与 future-headroom 上严格优于 baseline，并通过 Ramanujan/Kolmogorov/Godel 三重 gate`

### Freeze Record

- adopted_summary:
  - `K1 从四个 noun 的存在性挑战升级成 orchestration surface cluster contract；同时审 noun、assembly slot、root/subpath fate；Flow/Link 进入 default-closed lane；Process 不再享有预设保留资格；Workflow 的 delete 默认位回到结构证据；challenge override 扩到 workflows/processes 槽位与 expert API 授权语句；host residue 只作 dependent witness constraint；delete-path 必须显式冻结`
- kernel_verdict:
  - `通过。新方案压掉了 noun-only 审查、Process parking lot、Flow/Link 假主辩题和 naming-derived 结构结论`
- frozen_decisions:
  - `K1 当前审的是 orchestration surface cluster，不只是四个 noun`
  - `Flow` 默认 `delete`
  - `Link` 默认 `delete`
  - `旧 process link 公开入口` 默认 `delete`
  - `旧声明式 process link 公开入口` 默认 `delete`
  - `旧 process 定义入口` 只能在剥离 link residue 后进入 why-not-delete 审查`
  - `Program.config.processes / workflows` 必须与对应 noun 同时审，不得留侧门`
  - `useProcesses` 只算 dependent residue witness，不能单独证明公开 Process 应保留`
  - `useProcesses` 的最终 semantic_disposition 由 R3 持有；K1 只输出上游删除约束`
  - `root/subpath 同 fate`
  - `A4` 的 naming witness 不再代管结构结论`
- non_goals:
  - `本轮不直接改实现代码`
  - `本轮不直接回写 live SSoT`
  - `本轮不开始实现`
- allowed_reopen_surface:
  - `旧 process 定义入口 的最小 surviving contract 是否仍过宽`
  - `Program.config.processes / workflows 是否应直接删除还是交给更小 owner`
  - `K1` 对 `useProcesses` 输出的上游约束是否还可继续压缩`
  - `Flow/Link default-closed lane 是否还需要额外证据矩阵`
- proof_obligations:
  - `必须补一张 row-wise fate matrix`
  - `必须显式写出 delete-path`
  - `必须把 workflows/processes 槽位授权语句降为 witness-only`
  - `必须把 root/subpath 同 fate 写进正文`
  - `Process 若想存活，必须给出剥离 link residue 后的最小 contract`
- delta_from_previous_round:
  - `从 four-noun challenge 升级为 cluster contract，并把 alias-collapse、slot fate、host witness 一起纳入`

## Round 2

### Phase

- `converge`

### Input Residual

- `slot/host witness 是否仍存在 owner split`
- `Process 是否仍享有预设 surviving candidate 特权`
- `Flow/Link 是否仍与 Workflow/Process 混在同一主辩场`
- `A4` 是否仍把 naming witness 当成结构 owner`
- `useProcesses` 的 future authority 是否已闭合`

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
- `residual_risk=下一步仍要在这份已冻结 contract 上继续回答 Workflow noun、Program.config.workflows、旧 process 定义入口、Program.config.processes 的 why-not-delete，以及 R3 对 useProcesses 的最终承接；但这些已不构成当前 K1 review contract 的 reopen`
