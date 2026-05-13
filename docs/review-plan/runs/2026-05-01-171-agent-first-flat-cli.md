# 171 Agent-first Flat CLI Plan Optimality Loop

## Meta

- `target`: `specs/171-agent-live-runtime-bridge/proposals/agent-first-flat-cli.md`
- `targets`:
  - `specs/171-agent-live-runtime-bridge/proposals/agent-first-flat-cli.md`
  - `specs/171-agent-live-runtime-bridge/spec.md`
  - `specs/171-agent-live-runtime-bridge/discussion.md`
  - `docs/ssot/runtime/15-cli-agent-first-control-plane.md`
  - `docs/ssot/runtime/09-verification-control-plane.md`
  - `docs/ssot/runtime/14-dvtools-internal-workbench.md`
  - `docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md`
- `source_kind`: `file-plan`
- `reviewers`: `A1`, `A2`, `A3`, `A4`
- `round_count`: 2
- `challenge_scope`: `open`
- `consensus_status`: `superseded-by-public-live-namespace`

## Current Authority Override

本 ledger 前半段记录的是 Round 1 历史结论，不再是当前 CLI authority。用户随后明确要求 public CLI 承接 runtime/server communication。当前冻结结论以本文件的 Round 2、`docs/ssot/runtime/15-cli-agent-first-control-plane.md`、`specs/171-agent-live-runtime-bridge/spec.md` 为准：verification lane 是 `logix check / trial --mode startup / compare`，live lane 是 `logix live <task>`。`zero public live commands`、`public live/debug/evidence command set remains empty`、`final public CLI stays check/trial/compare` 均只保留为 superseded history。

## Bootstrap

- `target_complete`: true
- `alignment_gate`:
  - `policy`: `auto`
  - `status`: `inferred`
  - `resolved_points`: user explicitly invoked `$plan-optimality-loop`; target file exists; scope is CLI command design planning; docs and ledger updates are allowed; implementation code is out of scope.
  - `open_questions`: none
  - `confirmation_basis`: superseded Round 1 basis. The proposal labels itself exploratory, preserved then-current 171 zero public live commands, and asked future CLI owner planning to challenge flat task commands before defaulting to `logix live ...` or `logix runtime ...`.
- `review_contract`:
  - `artifact_kind`: `ssot-contract`
  - `review_goal`: `design-closure`
  - `target_claim`: Future Logix public CLI live/debug/evidence workflow should prefer task-oriented top-level commands only if that shape strictly improves Agent/developer selection, proof strength, and authority clarity over namespaces, while preserving current `check / trial / compare` control-plane authority and preventing a second report, evidence, session, operation, or runtime truth.
  - `target_refs`: see `targets`
  - `non_default_overrides`:
    - `scope_fence`: superseded Round 1 basis. Challenge flat command goal function, command count, name choices, namespace strategy, public/internal boundary, output authority, future reopen bar, and adoption criteria; at that time preserve 171 zero public live commands; do not start implementation.
    - `stop_condition`: `consensus`
    - `write_policy`: main agent may update the proposal, `discussion.md`, and this ledger; `15` may only receive future-owner intake language if needed, not a current public CLI surface change.
- `review_object_manifest`:
  - `source_inputs`: user request, `agent-first-flat-cli.md`, 171 Batch 1 to Batch 7 decisions, `15`, `09`, `14`, `16`
  - `materialized_targets`: proposal file, `discussion.md`, this ledger
  - `authority_target`: `specs/171-agent-live-runtime-bridge/proposals/agent-first-flat-cli.md`
  - `bound_docs`: `15-cli-agent-first-control-plane.md`, `09-verification-control-plane.md`, `14-dvtools-internal-workbench.md`, `16-agent-self-verification-scenario-matrix.md`, `specs/171-agent-live-runtime-bridge/spec.md`
  - `derived_scope`: future public CLI live/debug/evidence command-shape candidate after 171 internal bridge dogfood and `15` owner rewrite.
  - `allowed_classes`: command naming, command grouping, command count, read-only versus mutation command staging, no-verdict output law, canonical evidence handoff, help/discovery shape, future reopen bar
  - `blocker_classes`: changing 171 current public CLI surface, adding public live commands now, CLI-owned report truth, CLI-owned evidence envelope, CLI-owned live session truth, command output that bypasses `VerificationControlPlaneReport`, operation command before safety proof, top-level command count growth without proof
  - `ledger_target`: this file
- `challenge_scope`: `open`
- `reviewer_set`:
  - `A1`: structure purity and minimal command algebra
  - `A2`: compression, token economy, maintenance surface
  - `A3`: public/internal boundary and anti-second-authority consistency
  - `A4`: target function challenge and stronger alternatives
- `active_advisors`:
  - `A4 target function challenge`
- `activation_reason`: future CLI command surface is a public contract and long-term governance decision.
- `max_reviewer_count`: 4
- `kernel_council`: `Ramanujan`, `Kolmogorov`, `Godel`
- `dominance_axes`: `concept-count`, `public-surface`, `compat-budget`, `migration-cost`, `proof-strength`, `future-headroom`
- `stop_rule`: consensus after adopted freeze, proposal write-back, and residual review.
- `reopen_bar`: a future public live/debug CLI surface must strictly improve proof strength or Agent/developer task success while not increasing second-truth risk, not weakening `15`, and not growing command count beyond a proven selection budget.
- `ledger_path`: `docs/review-plan/runs/2026-05-01-171-agent-first-flat-cli.md`
- `writable`: true

## Assumptions

- `A-FCLI-001`
  - `summary`: Flat top-level task commands are likely a better future public CLI shape than `logix live ...` or `logix runtime ...`.
  - `status`: `overturned`
  - `resolution_basis`: A1/A2/A3/A4 all found flat-first unproven. Flat commands are fully disposed for the current public CLI surface and may only re-enter as future `15` reopen candidates after dogfood, command-count, misuse, authority, output-protocol, and no-second-truth proof.
- `A-FCLI-002`
  - `summary`: First public live/debug reopen, if any, should start from `status / capture / export`.
  - `status`: `overturned`
  - `resolution_basis`: reviewers found `status` and `export` are high-risk second-truth entry points. If a future public route is required, read-only capture-only is the smaller fallback.
- `A-FCLI-003`
  - `summary`: `trigger` is a better eventual mutation command name than `dispatch`.
  - `status`: `deferred`
  - `resolution_basis`: reviewers found readable naming cannot replace operation admission semantics. Future mutation command spelling must 1:1 map to core-owned `dispatch.declaredAction` admission, denial, and failure taxonomy.
- `A-FCLI-004`
  - `summary`: A help grouping such as `logix help debug` may support discoverability without becoming a command namespace.
  - `status`: `deferred`
  - `resolution_basis`: discovery remains package-local static schema artifact plus docs SSoT. Any executable help/discovery route must separately prove it does not become a fourth public contract surface.

## Rounds

### Round 1 Challenge

Findings:

- `F-FCLI-001`
  - `severity`: `blocker`
  - `class`: `invalidity`
  - `summary`: `flat-first` reversed the proof burden.
  - `evidence`: the proposal required evidence to overturn flat commands, while `15` and `171` require future public live commands to prove command-count, misuse, authority, output-protocol, no-second-truth, and dogfood strength before reopening.
  - `status`: `closed`
- `F-FCLI-002`
  - `severity`: `blocker`
  - `class`: `invalidity`
  - `summary`: the six-command flat family grows current public CLI from 3 to 9 top-level commands without proof.
  - `evidence`: proposal listed `status / capture / snapshot / trigger / wait / export`; current `15` only freezes `check / trial / compare`.
  - `status`: `closed`
- `F-FCLI-003`
  - `severity`: `high`
  - `class`: `ambiguity`
  - `summary`: flat commands mix discovery, evidence, operation admission, and handoff authority without a per-command authority map.
  - `evidence`: reviewers flagged `status` target truth risk, `capture/snapshot/export` evidence truth risk, and `trigger/wait` operation truth risk.
  - `status`: `closed`
- `F-FCLI-004`
  - `severity`: `high`
  - `class`: `invalidity`
  - `summary`: `export --session` can imply CLI-owned session or evidence handoff authority.
  - `evidence`: DVTools and CLI laws only allow canonical evidence package, selection manifest as hint, target coordinates, artifact refs, evidence gaps, and budget markers as durable handoff.
  - `status`: `closed`
- `F-FCLI-005`
  - `severity`: `high`
  - `class`: `controversy`
  - `summary`: `trigger` is unsafe as an early public mutation verb.
  - `evidence`: current operation taxonomy is core-owned `dispatch.declaredAction` with Batch 6 admission, permission, budget, redaction, no-mutation denial, and post-commit evidence requirements.
  - `status`: `closed`
- `F-FCLI-006`
  - `severity`: `medium`
  - `class`: `ambiguity`
  - `summary`: help/discovery grouping could become a fourth public contract surface.
  - `evidence`: `15` rejects public `describe`, `--describe-json`, and human help text as machine-readable discovery authority.
  - `status`: `closed`

Counter proposals:

- `CP-FCLI-001`
  - `summary`: `Proof-first Public CLI Contract`
  - `why_better`: freezes the complete current public CLI in `15` as `check / trial --mode startup / compare`, preserves C171-G, and fully disposes flat commands as rejected/deferred current-surface candidates.
  - `overturns_assumptions`: `A-FCLI-001`, `A-FCLI-002`; defers `A-FCLI-003`, `A-FCLI-004`
  - `resolves_findings`: `F-FCLI-001` to `F-FCLI-006`
  - `supersedes_proposals`: flat-first six-command family as public CLI contract
  - `dominance`: `dominates`
  - `axis_scores`:
    - `concept-count`: better
    - `public-surface`: better
    - `compat-budget`: better
    - `migration-cost`: better
    - `proof-strength`: better
    - `future-headroom`: better
  - `status`: `adopted`
- `CP-FCLI-002`
  - `summary`: `Read-only Capture-only Public Fallback`
  - `why_better`: if future proof shows a public live command is necessary, one read-only evidence outcome command is smaller than six flat commands and avoids mutation/session authority.
  - `overturns_assumptions`: `A-FCLI-002`, `A-FCLI-003`
  - `resolves_findings`: `F-FCLI-002`, `F-FCLI-004`, `F-FCLI-005`
  - `supersedes_proposals`: `status / capture / export` first reopen slate
  - `dominance`: `partial`
  - `axis_scores`:
    - `concept-count`: better than flat
    - `public-surface`: better than flat
    - `compat-budget`: better than flat
    - `migration-cost`: better than flat
    - `proof-strength`: pending dogfood
    - `future-headroom`: medium
  - `status`: `deferred`
- `CP-FCLI-003`
  - `summary`: `Namespace Fallback`
  - `why_better`: if flat fails authority clarity, a limited `logix live <task>` or `logix debug <task>` namespace can isolate non-report operations from `check / trial / compare`.
  - `overturns_assumptions`: `A-FCLI-001`
  - `resolves_findings`: `F-FCLI-003`
  - `supersedes_proposals`: flat root family only if future comparison proves authority clarity matters more than one extra token
  - `dominance`: `partial`
  - `axis_scores`:
    - `concept-count`: worse than zero-command, better than flat root family in mental grouping
    - `public-surface`: medium
    - `compat-budget`: medium
    - `migration-cost`: medium
    - `proof-strength`: pending dogfood
    - `future-headroom`: high
  - `status`: `deferred`

Resolution delta:

- Rewrote `agent-first-flat-cli.md` from flat-first naming proposal into absorbed initial proposal record.
- Updated `15-cli-agent-first-control-plane.md` to include the complete final public CLI contract, rejected/deferred live command disposition, reserved `trial --mode scenario`, and future reopen comparison gate.
- The initial flat commands are now fully classified rather than left as an unresolved proposal.

## Adoption

- `adopted_candidate`: `CP-FCLI-001 Proof-first Public CLI Contract`
- `lineage`: synthesized from A1 structure-purity review, A2 compression review, A3 authority-boundary review, and A4 target-function review.
- `rejected_alternatives`:
  - flat-first six-command family
  - first reopen as `status / capture / export`
  - early public `trigger`
  - public `export --session`
  - executable help/discovery as contract authority
- `rejection_reason`: each rejected alternative failed at least one of command-count, public-surface, authority, output-protocol, operation-safety, or discovery-boundary gates.
- `dominance_verdict`: superseded history. Round 2 replaces this with `check / trial / compare + logix live <task>` under the public live namespace contract.

### Freeze Record

- `adopted_summary`: superseded history. Current complete public CLI contract is frozen in `15`: `logix check`, `logix trial --mode startup`, `logix compare`, and `logix live <task>`.
- `kernel_verdict`: superseded history for command count. Current kernel verdict accepts one `live` namespace because it has lower concept count than flat roots and preserves `09`, `14`, `15`, `16`, and `171` owner boundaries through `LiveCommandResult` and core-owned semantics.
- `frozen_decisions`:
  - `flat-first` is not adopted.
  - Superseded Round 1 decision: public live/debug/evidence command set remains empty.
  - The proposal is now an absorbed initial proposal record, not current CLI authority.
  - `15-cli-agent-first-control-plane.md` is the authority for final public CLI.
  - Future public live/debug/evidence surface must compare zero-command, capture-only, namespace fallback, and flat candidates.
  - First reopen default budget is at most one new public live/debug/evidence command unless dogfood proves a larger command count.
  - `status`, `export`, `snapshot`, `wait`, and `trigger` are not first-release public commands.
  - `capture` is the strongest deferred single-command fallback, only after dogfood proof.
  - Public input must not accept bare session truth.
  - Mutation-capable public verbs must 1:1 map to core-owned `dispatch.declaredAction` admission, denial, and failure taxonomy.
  - Help grouping and executable discovery cannot become machine-readable command authority without a future `15` reopen.
- `non_goals`:
  - changing `15` current public command surface
  - adding public live commands in 171
  - defining live stdout protocol
  - defining CLI-owned session, evidence, report, finding, operation, or runtime truth
- `allowed_reopen_surface`:
  - future `15` owner rewrite after live bridge dogfood proof
  - capture-only public command proof
  - limited namespace fallback proof
  - flat command proof only if it strictly beats the above candidates across dominance axes
- `proof_obligations`:
  - dogfood proof
  - candidate comparison proof
  - command-count proof
  - misuse proof
  - authority proof
  - output-protocol proof
  - safety proof for mutation
  - discovery proof for any executable help or discovery route
- `delta_from_previous_round`: flat-first proposal converted into absorbed record; final public CLI contract added to `15`.

## Consensus

- `status`: `superseded`
- `basis`: this first-pass consensus rejected flat root commands and zero-command live surface under the older target function. The user later clarified that public CLI live/runtime-server communication is required.
- `superseded_by`: `Round 2 Public Live Namespace Reopen`
- `residual_risk`: the adopted namespace still needs implementation dogfood proof, live output protocol tests, and no-second-truth guards.

## Round 2 Public Live Namespace Reopen

### Trigger

用户明确要求：功能必须做，且必须给出 Public CLI 形态。`agent-react-devtools` 式 persistent daemon / runtime-server communication 的核心思路应进入 Logix CLI。

### New Target Claim

Logix public CLI 必须同时提供：

- verification lane: `logix check / trial / compare`
- live runtime collaboration lane: `logix live <task>`

`logix live` 必须吸收 flat 初始提案中的任务能力，但不得把 `status / capture / snapshot / wait / export` 做成顶层 root，也不得使用 `trigger` 作为 mutation verb。

### Findings

- `F-FCLI-R2-001`
  - `severity`: `blocker`
  - `class`: `invalidity`
  - `summary`: zero public live commands 不满足最新目标函数。
  - `evidence`: 用户明确要求 Public CLI 形态；`agent-react-devtools` 参考证明 persistent daemon + CLI 查询面是 Agent 获取运行时信息的有效路径。
  - `status`: `closed`
- `F-FCLI-R2-002`
  - `severity`: `high`
  - `class`: `controversy`
  - `summary`: flat root commands 会污染 verification root surface。
  - `evidence`: `status / capture / snapshot / wait / export` 与 `check / trial / compare` 不同类；它们是 live target/capture/operation/evidence handoff tasks。
  - `status`: `closed`
- `F-FCLI-R2-003`
  - `severity`: `high`
  - `class`: `invalidity`
  - `summary`: `CommandResult` 不能作为 live stdout envelope。
  - `evidence`: `CommandResult.primaryReportOutputKey` 必须指向 `VerificationControlPlaneReport` artifact；live command 成功结果不是 report。
  - `status`: `closed`
- `F-FCLI-R2-004`
  - `severity`: `medium`
  - `class`: `ambiguity`
  - `summary`: `trigger` 会偏离 core operation admission 词汇。
  - `evidence`: 171 Batch 6 冻结 mutation-capable operation 为 `dispatch.declaredAction`。
  - `status`: `closed`

### Adopted Candidate

`CP-FCLI-R2 Public Live Namespace Contract`

```text
public CLI =
  verification:
    logix check
    logix trial --mode startup
    logix compare

  live:
    logix live start
    logix live stop
    logix live status
    logix live targets
    logix live inspect
    logix live capture
    logix live snapshot
    logix live wait
    logix live dispatch
    logix live profile start|stop|summary
    logix live export evidence
```

### Dominance

| axis | verdict |
| --- | --- |
| concept-count | `logix live` 增加一个 root，比 flat root family 更小 |
| public-surface | live namespace 与 verification roots 分离，比六个 root commands 更稳 |
| compat-budget | forward-only，无旧 root alias |
| migration-cost | 实现集中在一个 parser namespace 和一个 live envelope |
| proof-strength | 每个 live task 映射 171 core-owned capability；`LiveCommandResult` 避免伪造 report |
| future-headroom | 后续可增加 live 子命令，不重开 root surface |

### Freeze Record

- `flat-first` 仍不采纳。
- `zero public live commands` 被 supersede。
- Public live root 固定为 `logix live`。
- Flat root commands `logix status/capture/snapshot/wait/export` 不存在。
- `trigger` 不进入 public CLI；mutation command 固定为 `logix live dispatch`。
- `CommandResult` 继续只服务 `check / trial / compare`。
- `LiveCommandResult` 服务 `logix live`，但不拥有 report、stage、verdict、session、runtime identity、operation authority 或 evidence envelope。
- `logix live export evidence` 只能输出 canonical evidence package ref、artifact refs、budget markers 或 evidence gaps。

### Write-back

- `docs/ssot/runtime/15-cli-agent-first-control-plane.md`
- `docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md`
- `specs/171-agent-live-runtime-bridge/spec.md`
- `specs/171-agent-live-runtime-bridge/discussion.md`
- `specs/171-agent-live-runtime-bridge/plan.md`
- `specs/171-agent-live-runtime-bridge/tasks.md`
- `specs/171-agent-live-runtime-bridge/quickstart.md`
- `specs/171-agent-live-runtime-bridge/proposals/agent-first-flat-cli.md`
