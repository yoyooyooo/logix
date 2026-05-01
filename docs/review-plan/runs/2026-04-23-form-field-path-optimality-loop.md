# Form Field Path Optimality Loop Ledger

## Meta

- target: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/157-form-field-path/plan.md`
- source_kind: `file-plan`
- reviewers: `A1/A2/A3/A4`
- round_count: `2`
- challenge_scope: `open`
- consensus_status: `consensus-reached`

## Bootstrap

- target_complete: `true`
- challenge_scope: `open`
- reviewer_set: `A1/A2/A3/A4`
- active_advisors: `none`
- activation_reason: `open scope + public contract + long-term API governance`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan / Kolmogorov / Godel`
- dominance_axes: `concept-count / public-surface / compat-budget / migration-cost / proof-strength / future-headroom`
- stop_rule: `只有通过 Ramanujan / Kolmogorov / Godel gate 且在 dominance axes 上形成严格改进的 proposal 才允许 reopen`
- reopen_bar: `必须证明比 adopted candidate 更小或 proof-strength 更强，且不引入第二 authority / 第二 workflow / 第二 contract`
- ledger_path: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-23-form-field-path-optimality-loop.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `specs/157-form-field-path/plan.md` 是本轮唯一目标工件；`spec.md / discussion.md / tasks.md / 13 / 06 / 09 / 10 / 05` 只作支持上下文
  - status: `kept`
  - resolution_basis: `用户明确要求用 plan-optimality-loop 评估 157 计划工件`
- A2:
  - summary: `challenge_scope=open`，允许 reviewer 直接挑战目标函数、边界、成功标准与 supporting artifact 角色分工
  - status: `kept`
  - resolution_basis: `skill 默认 open；用户显式要求多 reviewer challenge`
- A3:
  - summary: `157` 可以在 helper noun / selector primitive 仍未冻结时完成 sanctioned read route 闭合
  - status: `overturned`
  - resolution_basis: `A1/A3/A4` 交集认为这会把 read authority 放进实现期自由裁量
- A4:
  - summary: `discussion.md` 可以同时承担 reopen evidence 与 implementation ledger
  - status: `overturned`
  - resolution_basis: `A2` 证明这会制造双重维护并降低 proof-strength

## Round 1

### Phase

- challenge

### Input Residual

- none

### Findings

- F1 `critical` `invalidity`:
  - summary: read route authority 未冻结。当前 plan 把 sanctioned read route 设成闭合门，同时把 helper noun / exact carrier / exact landing path 留到实现期开放分支
  - evidence: `A1/A3/A4` 交集；`plan/tasks/discussion` 同时允许 adjunct helper 与后补 authority
  - status: `adopted`
- F2 `high` `invalidity`:
  - summary: verification 没有对齐 `runtime control plane`，proof chain 退化成包内散测与 demo gate
  - evidence: `A1/A4` 交集；`09` 已冻结 `runtime.check / runtime.trial / runtime.compare` 主干
  - status: `adopted`
- F3 `high` `invalidity`:
  - summary: plan 自造 proof 词表与 structural/public type 预算，扩大了概念面
  - evidence: `A1/A3` 交集；`W1..W6` 与 `155` 的 `WF*/W*` 撞号，`public types` 写法也提前升格 deferred noun
  - status: `adopted`
- F4 `high` `ambiguity`:
  - summary: plan / tasks / discussion / quickstart 的角色分工重叠，execution ledger 与 verification ledger 分散
  - evidence: `A2` 主发现，且被主 agent 复核成立
  - status: `adopted`
- F5 `medium` `controversy`:
  - summary: examples 在 authority freeze 之前被赋予过高权重，容易反向塑形 contract
  - evidence: `A1/A4` 交集；spec 仍要求 example alignment，但不要求它先于 authority freeze
  - status: `adopted`

### Counter Proposals

- P1:
  - summary: `recipe-only selector law freeze`
  - why_better: 先压平 read route authority，只证明 canonical selector law 能承接 companion，不提前放行 helper/public primitive
  - overturns_assumptions: `A3`
  - resolves_findings: `F1 F5`
  - supersedes_proposals: `none`
  - dominance: `dominates`
  - axis_scores: `concept-count +3 / public-surface +3 / compat-budget 0 / migration-cost +1 / proof-strength +2 / future-headroom +2`
- P2:
  - summary: `control-plane-first verification spine`
  - why_better: 把 companion proof 拉回 `runtime.check -> runtime.trial(startup) -> runtime.trial(scenario)`，包内测试与 browser evidence 退回 supporting evidence
  - overturns_assumptions: `none`
  - resolves_findings: `F2`
  - supersedes_proposals: `none`
  - dominance: `dominates`
  - axis_scores: `concept-count +1 / public-surface 0 / compat-budget 0 / migration-cost -1 / proof-strength +3 / future-headroom +3`
- P3:
  - summary: `single-ledger contract + tasks-led execution`
  - why_better: `plan.md` 只保留 freeze contract，`tasks.md` 成为唯一执行/proof ledger，`discussion.md` 只留 reopen evidence
  - overturns_assumptions: `A4`
  - resolves_findings: `F4`
  - supersedes_proposals: `none`
  - dominance: `dominates`
  - axis_scores: `concept-count +2 / public-surface 0 / compat-budget 0 / migration-cost +2 / proof-strength +1 / future-headroom +1`
- P4:
  - summary: `WF/W-only coverage map + structural-type budget compression`
  - why_better: 取消新 proof 编号，structural nouns 默认 internal/opaque，避免 deferred noun 被提前推成 authority
  - overturns_assumptions: `none`
  - resolves_findings: `F3`
  - supersedes_proposals: `none`
  - dominance: `dominates`
  - axis_scores: `concept-count +3 / public-surface +2 / compat-budget +1 / migration-cost +1 / proof-strength +1 / future-headroom +2`

### Resolution Delta

- `A3 -> overturned`
- `A4 -> overturned`
- `F1 F2 F3 F4 F5 -> adopted`
- `P1 P2 P3 P4 -> adopted lineage`

## Adoption

- adopted_candidate: `AC1 recipe-only selector law + control-plane-first proof spine + single-ledger contract + WF/W-only coverage map`
- lineage: `P1 + P2 + P3 + P4`
- rejected_alternatives: `helper optional mainline`, `multi-ledger discussion execution log`, `157-specific W1..W6 scenario proof family`, `day-one public type promotion`
- rejection_reason: `这些方案都会增加公开面或双重 authority，且未在 proof-strength 上形成严格改进`
- dominance_verdict: `baseline plan is dominated`

### Freeze Record

- adopted_summary: `157 只关闭 authoring/lowering、recipe-only selector admissibility、control-plane proof、post-freeze example alignment；helper noun、public selector primitive、exact read carrier 与 structural type promotion 全部继续 reopen-gated`
- kernel_verdict: `通过 Ramanujan / Kolmogorov / Godel 三重 gate；概念更少、authority 更单一、proof 链更强`
- frozen_decisions:
  - `157` mainline 固定为 recipe-only `useModule + useSelector(handle, selectorFn)`，零新增 public helper
  - `runtime.check -> runtime.trial(startup) -> runtime.trial(scenario)` 是 companion proof 主干；`runtime.compare` 只按需升级
  - `plan.md` 是静态 contract；`tasks.md` 是唯一 execution/proof ledger；`discussion.md` 只保留 reopen evidence
  - `157` 不自造新的 `W1..Wn`；只回链 `155` 的 `WF* / W*`
  - `CompanionLowerContext / CompanionBundle` 默认停在 internal 或 opaque structural type
  - examples 必须在 authority freeze 后对齐，不先于 authority 塑形
  - writeback 采用显式矩阵；`10` / `05` 只有 authority 真变化时更新，否则记录 no-change rationale
- non_goals:
  - 在 `157` 主线内发明 helper noun 或 selector primitive
  - 提前冻结 exact read carrier noun / exact `ui` landing path
  - 让 `discussion.md` 继续承接执行台账
  - 让 retained demos 先于 authority freeze
- allowed_reopen_surface:
  - recipe-only read proof 无法在不暴露 raw path 的前提下闭合
  - exact read carrier / exact landing path 出现 irreducible proof
  - structural type public promotion 形成 strict-dominance 证据
- proof_obligations:
  - 证明 canonical selector law 足以消费 companion
  - 证明 control-plane proof 可解释 `source -> companion -> rule / submit`
  - 证明 row-heavy 下 `field-only companion` 仍足够
  - 证明 examples 只是消费 frozen contract，不反向制造第二口径
- delta_from_previous_round: `从“helper optional + multi-ledger + custom proof numbering”压回“recipe-only + control-plane-first + single-ledger + WF/W mapping”`

## Round 2

### Phase

- converge

### Input Residual

- adopted freeze record `AC1 recipe-only selector law + control-plane-first proof spine + single-ledger contract + WF/W-only coverage map`

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- `A1`: `无 unresolved findings`
- `A2`: `无 unresolved findings`
- `A3(retry)`: `无 unresolved findings`
- `A4`: `无 unresolved findings`
- all residual findings `closed`

## Consensus

- reviewers: `A1/A2/A3(retry) / A4`
- adopted_candidate: `AC1 recipe-only selector law + control-plane-first proof spine + single-ledger contract + WF/W-only coverage map`
- final_status: `consensus reached`
- stop_rule_satisfied: `true`
- residual_risk: `当前只剩条件性 reopen 风险：若 recipe-only route 无法在不暴露 raw path 的前提下闭合，若出现要求 exact read carrier / exact landing path 的 irreducible proof，或若 structural type public promotion 能在 dominance axes 上形成 strict-dominance 且维持单一 authority，才允许 reopen`
