# 171 Live Daemon Lifecycle Review Ledger

## Meta

- target: `docs/proposals/live-daemon-lifecycle-architecture-memo.md`
- targets:
  - `docs/proposals/live-daemon-lifecycle-architecture-memo.md`
  - `specs/171-agent-live-runtime-bridge/spec.md`
  - `specs/171-agent-live-runtime-bridge/plan.md`
  - `specs/171-agent-live-runtime-bridge/research.md`
  - `docs/ssot/runtime/15-cli-agent-first-control-plane.md`
- source_kind: `file-plan`
- reviewer_count: `4`
- reviewer_model: `gpt-5.5`
- reviewer_reasoning: `xhigh`
- challenge_scope: `open`
- round_count: `4`
- consensus_status: `closed`

## Bootstrap

- target_complete: `true`
- alignment_gate:
  - policy: `skip`
  - status: `confirmed`
  - resolved_points:
    - `artifact_kind=implementation-plan`
    - `review_goal=design-closure`
    - `challenge_scope=open`
    - `scope_fence=不重开171 owner law，不新增需求，不新增实施方案，不开始代码实现`
    - `stop_condition=consensus`
    - `write_policy=允许改 proposal、ledger 与强绑定引用口径`
  - open_questions: `[]`
  - confirmation_basis: `用户明确要求用 plan-optimality-loop 面向终局打磨该项目级 daemon lifecycle memo`
- review_contract:
  - artifact_kind: `implementation-plan`
  - review_goal: `design-closure`
  - target_claim: `当前 daemon lifecycle memo 是否已经形成面向终局的最强项目级边界，能否吸收 agent-react-devtools 与 agent-remnote 的有效经验，同时不提前冻结 supervisor、public lifecycle grammar 或 second truth`
  - target_refs:
    - `docs/proposals/live-daemon-lifecycle-architecture-memo.md`
    - `specs/171-agent-live-runtime-bridge/spec.md`
    - `specs/171-agent-live-runtime-bridge/plan.md`
    - `specs/171-agent-live-runtime-bridge/research.md`
    - `docs/ssot/runtime/15-cli-agent-first-control-plane.md`
    - `https://github.com/callstackincubator/agent-react-devtools`
    - `/Users/yoyo/Documents/code/personal/agent-remnote`
  - non_default_overrides:
    - `challenge_scope=open`
    - `scope_fence=不重开171 owner law，不讨论立即实现代码`
    - `stop_condition=consensus`
    - `write_policy=proposal+ledger+bound refs writable`
- review_object_manifest:
  - source_inputs:
    - `docs/proposals/live-daemon-lifecycle-architecture-memo.md`
    - `callstackincubator/agent-react-devtools README / daemon / daemon-client / cli / vite-plugin / connect / e2e lifecycle tests`
    - `/Users/yoyo/Documents/code/personal/agent-remnote daemon supervisor / pid-state-log-health / ensure-status-log patterns`
  - materialized_targets:
    - `docs/proposals/live-daemon-lifecycle-architecture-memo.md`
  - authority_target: `docs/proposals/live-daemon-lifecycle-architecture-memo.md`
  - bound_docs:
    - `docs/proposals/README.md`
    - `specs/171-agent-live-runtime-bridge/spec.md`
    - `specs/171-agent-live-runtime-bridge/plan.md`
    - `specs/171-agent-live-runtime-bridge/research.md`
    - `docs/ssot/runtime/15-cli-agent-first-control-plane.md`
  - derived_scope: `repo-level daemon lifecycle architecture memo anchored from 171`
  - allowed_classes:
    - `task`
    - `dependency`
    - `risk`
    - `rollback`
    - `verification backlog`
    - `follow-up gate`
    - `external-reference absorption rule`
  - blocker_classes:
    - `owner law reopen`
    - `second authority`
    - `dev/prod path leakage into live client`
    - `public lifecycle grammar leakage`
    - `proposal that couples process management with live protocol`
    - `daemon metadata promoted to runtime / attachment / evidence / report truth`
  - ledger_target: `docs/review-plan/runs/2026-05-03-171-live-daemon-launcher-supervisor.md`
- challenge_scope: `open`
- reviewer_set:
  - `A1`
  - `A2`
  - `A3`
  - `A4`
- active_advisors:
  - `none`
- activation_reason: `baseline kernel council 足够覆盖结构、压缩、一致性和目标函数挑战`
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
- stop_rule: `workflow.md kernel gates`
- reopen_bar: `只有 dominance axes 明确支配，且不重开171 owner law、不新增需求或实施方案，才允许重开`
- ledger_path: `docs/review-plan/runs/2026-05-03-171-live-daemon-launcher-supervisor.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `daemon launcher / runtime / supervisor` 三层分离是当前最小且长期可维护的结构。
  - status: `overturned`
  - resolution_basis: `第一轮 adopted candidate 不冻结 supervisor 为稳定长期层，只保留 launcher clean cut。`
- A2:
  - summary: `launcher clean cut only` 加非目标列表足以吸收外部 daemon lifecycle 经验。
  - status: `overturned`
  - resolution_basis: `本轮需要补 carrier-local operator snapshot 与 operational evidence gate，防止在“不管 lifecycle”和“复制 supervisor 产品面”之间摇摆。`
- A3:
  - summary: `operator ergonomics` 可以作为 supervisor 进入条件而不污染最小边界。
  - status: `overturned`
  - resolution_basis: `operator ergonomics 过宽，已替换为具体 failure domain gate。`
- A4:
  - summary: pid/socket/log/health/stale cleanup 应作为字段级 daemon state contract 冻结。
  - status: `overturned`
  - resolution_basis: `这些只允许作为 carrier-local operator snapshot 的例子，不是字段全集或 public file contract。`
- A5:
  - summary: public lifecycle grammar 禁表应由 memo 复制维护。
  - status: `overturned`
  - resolution_basis: `public command grammar 继续由 15 持有，memo 只声明不新增 15 之外的 public live task grammar。`

## Round 1

### Phase

- challenge

### Input Residual

- `baseline proposal v1` 是否应冻结 daemon launcher/runtime/supervisor 三层与 future public lifecycle grammar。

### Findings

- F1 `high` `controversy`: 原 proposal 把 daemon 后台管理能力补齐推成主目标，目标函数过宽。
- F2 `high` `invalidity`: 原 proposal 同时保留多组未冻结 route basis，包括 daemon entry 与 future `ensure/restart/...` grammar。
- F3 `high` `invalidity`: 原 proposal 让 daemon-state service 承接 `clients/attachments` 等状态，存在第二 truth 风险。
- F4 `medium` `ambiguity`: 原 proposal 把 `re-exec 当前 CLI` 写成长期 must，而不是当前优选实现方向。
- F5 `medium` `ambiguity`: 原 proposal proof gate 偏弱，没有显式纳入 171 terminal/degraded lifecycle、`LiveCommandResult`、disabled no-op 和 transport replaceability。
- F6 `medium` `controversy`: 原 proposal 过早升格 supervisor、internal names 和 SSoT 回写层级。

### Counter Proposals

- P1:
  - summary: `launcher clean cut only`
  - why_better: 比 “launcher + supervisor 化” 更小、更不易把 future public grammar 和 shadow truth 带进来。
  - overturns_assumptions:
    - `A1`
  - resolves_findings:
    - `F1`
    - `F2`
    - `F3`
    - `F4`
    - `F5`
    - `F6`
  - supersedes_proposals:
    - `baseline proposal v1`
  - dominance: `dominates`
  - axis_scores:
    - `concept-count`: `better`
    - `public-surface`: `better`
    - `compat-budget`: `same`
    - `migration-cost`: `better`
    - `proof-strength`: `better`
    - `future-headroom`: `better`
  - status: `adopted in round 2, superseded by P2 in round 4`

### Resolution Delta

- `A1 open -> overturned`
- `P1 open`
- challenge 结论：需要收窄目标函数，进入 converge

## Round 2

### Phase

- converge

### Input Residual

- `F1-F6` 是否在收窄后的 proposal 中闭合。
- `P1 launcher clean cut only` 是否仍被更小、更强方案直接支配。

### Findings

- `none`

### Counter Proposals

- `none`

### Resolution Delta

- `F1-F6 -> closed`
- `P1 -> adopted`
- converge 结论：无 reviewer 继续提出 unresolved findings。

## Round 3

### Phase

- challenge

### Input Residual

- 用户要求面向终局重新打磨项目级 memo。
- `P1 launcher clean cut only` 是否因反过度设计而过窄。
- 外部参照是否应吸收为 supervisor / public lifecycle grammar / carrier-local gate。

### Findings

- F7 `high` `controversy`: `operator ergonomics` 作为 supervisor 进入条件过宽，容易把 `ensure/restart/logs/stack` 包装成 supervisor 必要性。
- F8 `high` `controversy`: `launcher clean cut only` 作为 immediate implementation boundary 成立，作为项目级终局 memo 缺少 operational robustness 进入条件。
- F9 `medium` `ambiguity`: 外部经验吸收规则只有负向边界，缺少“只吸收为 carrier-local locator/readiness/health/log/stale-cleanup evidence”的正向规则。
- F10 `medium` `ambiguity`: public grammar 与 internal operational robustness 混同；`logs/doctor/restart/ensure` 不应被读成 internal robustness 禁区。
- F11 `low` `ambiguity`: `SSoT 升格` 非目标容易误读为不需要对齐既有 `15` public command contract。
- F12 `low` `ambiguity`: pid/socket/log/health/stale cleanup 允许清单像 future schema seed，可能被误读为规范化文件合同。
- F13 `low` `controversy`: memo 与 ledger 重复维护具体 command 禁表，增加第二 SSoT 风险。

### Counter Proposals

- P2:
  - summary: `launcher clean cut + carrier-local operational gates`
  - why_better: 保留 P1 的小边界，同时吸收 agent-react-devtools 的 persistent daemon/dev entry 可用性经验和 agent-remnote 的 pid/state/log/health/stale cleanup/supervisor failure-domain 经验；它冻结的是重开门槛，不冻结 supervisor、public grammar、pid/log/state schema 或第二 truth。
  - overturns_assumptions:
    - `A2`
    - `A3`
    - `A4`
    - `A5`
  - resolves_findings:
    - `F7`
    - `F8`
    - `F9`
    - `F10`
    - `F11`
    - `F12`
    - `F13`
  - supersedes_proposals:
    - `P1 launcher clean cut only`
  - dominance: `dominates`
  - axis_scores:
    - `concept-count`: `same`
    - `public-surface`: `same`
    - `compat-budget`: `same`
    - `migration-cost`: `same`
    - `proof-strength`: `better`
    - `future-headroom`: `better`
  - status: `adopted`
- P3:
  - summary: `single carrier-local lifecycle authority`
  - why_better: 对 `start/stop/status/readiness/stale cleanup/log locator` 的内部一致性更强。
  - overturns_assumptions:
    - `A2`
  - resolves_findings:
    - `F8`
    - `F9`
  - supersedes_proposals:
    - `none`
  - dominance: `partial`
  - axis_scores:
    - `concept-count`: `worse`
    - `public-surface`: `same`
    - `compat-budget`: `same`
    - `migration-cost`: `worse`
    - `proof-strength`: `slightly-better`
    - `future-headroom`: `mixed`
  - status: `rejected`
- P4:
  - summary: `supervisor now, public lifecycle later`
  - why_better: 更直接覆盖 crash-loop、日志、状态、restart。
  - overturns_assumptions:
    - `none`
  - resolves_findings:
    - `F8`
  - supersedes_proposals:
    - `none`
  - dominance: `none`
  - axis_scores:
    - `concept-count`: `worse`
    - `public-surface`: `worse`
    - `compat-budget`: `worse`
    - `migration-cost`: `worse`
    - `proof-strength`: `mixed`
    - `future-headroom`: `worse`
  - status: `rejected`

### Resolution Delta

- `P1 adopted -> superseded`
- `P2 open -> adopted candidate`
- `P3/P4 rejected`
- proposal 修订为 `launcher clean cut + carrier-local operational gates`

## Adoption

- adopted_candidate:
  - `P2 launcher clean cut + carrier-local operational gates`
- lineage:
  - `baseline proposal v1`
  - `P1 launcher clean cut only`
  - `P2 launcher clean cut + carrier-local operational gates`
- rejected_alternatives:
  - `baseline proposal v1`
  - `P1 launcher clean cut only as final text`
  - `P3 single carrier-local lifecycle authority`
  - `P4 supervisor now, public lifecycle later`
- rejection_reason:
  - `baseline proposal v1`: `目标函数过宽、future public grammar leakage、daemon state / attachment truth 混桶、把当前 CLI re-exec 写成长期 must`
  - `P1 launcher clean cut only as final text`: `作为 implementation boundary 成立，但缺少 external lifecycle 经验的正向吸收规则和 supervisor 重开证据门`
  - `P3 single carrier-local lifecycle authority`: `证明力略强但 concept-count 和 migration-cost 变差，容易把 internal lifecycle owner 过早实体化`
  - `P4 supervisor now, public lifecycle later`: `过早冻结 supervisor，增加 second authority、public surface 和 migration-cost`
- dominance_verdict:
  - `P2 keeps P1 on concept-count/public-surface/compat-budget/migration-cost and strictly improves proof-strength/future-headroom`

### Freeze Record

- adopted_summary:
  - `冻结 repo-level daemon lifecycle 最小边界：live client 不拥有 daemon 启动策略；daemon 只有一个 repo-internal launch authority；本地 daemon 运维材料只作为 carrier-local operator snapshot；未来 supervisor 或 lifecycle product surface 必须先通过 operational evidence gate。`
- kernel_verdict:
  - `Ramanujan`: `保留最小生成元 launcher clean cut，并把外部 operational 经验压成 carrier-local gate，而不是新层级`
  - `Kolmogorov`: `把具体 command 禁表回链 15，把 pid/log/state 降级为 snapshot 示例，减少第二 SSoT`
  - `Godel`: `拒绝 supervisor identity、public lifecycle grammar、daemon metadata truth 和 CLI packaging law`
- frozen_decisions:
  - `live client 不得拥有 daemon 启动策略或进程细节`
  - `daemon 启动只允许一个 repo-internal launch authority`
  - `re-exec 当前 CLI 只是 current preferred implementation direction，不是 permanent law、public contract 或 future packaging must`
  - `daemon metadata 只允许作为 carrier-local operator snapshot`
  - `operator snapshot 可以包含 readiness、health、locator、log、stale cleanup 证据，但不是字段全集或 public file contract`
  - `public command grammar 仍由 15 持有`
  - `外部项目经验只吸收为 persistent carrier、readiness/health/log locator/stale cleanup/dev entry lessons，不平移 supervisor 或 public lifecycle surface`
  - `supervisor 只可在 concrete failure domain 无法由 launcher + daemon runtime + carrier-local operator snapshot 表达时重开`
  - `不把 internal selector/exact filenames 写成长期事实`
- non_goals:
  - `新增需求`
  - `新增实施方案`
  - `新增 15 之外的 public live task grammar`
  - `supervisorization now`
  - `pid/log/state schema`
  - `SSoT now`
  - `exact internal names`
- allowed_reopen_surface:
  - `crash-loop containment 无法解释或收束`
  - `graceful stop / no-restart 语义无法保证`
  - `status/readiness 无法给出 actionable degraded reason`
  - `stale pid/state cleanup 无法保持可诊断`
  - `bounded log observability 缺失导致 Agent 只能读人类日志`
  - `多进程 ownership conflict 无法由单一 launcher authority 表达`
- proof_obligations:
  - `不得新增第二 authority`
  - `不得提前扩 public live task grammar`
  - `不得把 daemon metadata 升级为 runtime / attachment / evidence / report truth`
  - `不得把当前 CLI packaging 形状冻结成长期公理`
  - `必须继续守住 171 terminal/degraded lifecycle、LiveCommandResult、disabled no-op 和 transport replaceability`
- delta_from_previous_round:
  - `把 P1 launcher clean cut only 升级为 P2 launcher clean cut + carrier-local operational gates`

## Round 4

### Phase

- converge

### Input Residual

- `F7-F13` 是否在修订后的 memo 中闭合。
- `P2` 是否仍被更小、更强方案支配。

### Findings

- `none`

### Counter Proposals

- `none`

### Resolution Delta

- `F7-F13 -> closed`
- `P2 -> adopted`
- `P3/P4 -> rejected`
- converge 结论：4 个 reviewer 均返回无 unresolved findings。

## Consensus

- reviewers:
  - `A1 structure purity: no unresolved findings after converge`
  - `A2 compression: no unresolved findings after converge`
  - `A3 dominance / second-authority: no unresolved findings after converge`
  - `A4 objective-function challenge: no unresolved findings after converge`
- adopted_candidate:
  - `P2 launcher clean cut + carrier-local operational gates`
- final_status:
  - `consensus reached`
- stop_rule_satisfied:
  - `true`
- residual_risk:
  - `后续如果把 readiness/health/log/stale cleanup snapshot 字段稳定化为 public file contract，或让 status/readiness 输出越过 LiveCommandResult 和 core attachment projection，会重新触发 second authority 风险。`
  - `后续如果把 bounded log observability、ownership conflict 或 crash-loop gate 直接扩成 public grammar 或 supervisor identity，也必须重新进入 review。`
