# Form Builtin Message Authoring Sugar Contract Review Ledger

## Meta

- target: `docs/proposals/form-builtin-message-authoring-sugar-contract.md`
- targets:
  - `docs/proposals/form-builtin-message-authoring-sugar-contract.md`
  - `docs/ssot/form/13-exact-surface-contract.md`
  - `docs/ssot/runtime/08-domain-packages.md`
- source_kind: `file-spec`
- reviewer_count: `4`
- reviewer_model: `gpt-5.4`
- reviewer_reasoning: `xhigh`
- challenge_scope: `open`
- consensus_status: `reached`

## Bootstrap

- target_complete: `true`
- review_contract:
  - artifact_kind: `ssot-contract`
  - review_goal: `zero-unresolved`
  - target_claim: `只在 Form builtin message 输入位允许 string | I18nMessageToken；raw string 在 authoring edge 立刻 lower；公共 canonical carrier 继续不变`
  - non_default_overrides:
    - `reviewer_count=4`
    - `challenge_scope=open`
- review_object_manifest:
  - source_inputs:
    - `user concern: token-only 对无 i18n 项目太烦`
    - `previous freeze: reject public I18nLiteralToken union`
    - `new target: smaller authoring-only sugar candidate`
  - materialized_targets:
    - `docs/proposals/form-builtin-message-authoring-sugar-contract.md`
  - authority_target:
    - `docs/proposals/form-builtin-message-authoring-sugar-contract.md`
  - bound_docs:
    - `docs/ssot/form/13-exact-surface-contract.md`
    - `docs/ssot/runtime/08-domain-packages.md`
    - `docs/review-plan/runs/2026-04-17-i18n-literal-token-authoring-review.md`
  - derived_scope: `single contract proposal`
  - allowed_classes:
    - `authoring input shape`
    - `allowlist boundary`
    - `lowering law`
    - `public contract invariance`
    - `non-i18n DX`
  - blocker_classes:
    - `string enters canonical state`
    - `global sugar creep`
    - `second authoring route`
    - `implicit public carrier change`
  - ledger_target:
    - `docs/review-plan/runs/2026-04-17-form-builtin-message-authoring-sugar-review.md`
- challenge_scope: `open`
- reviewer_set:
  - `A1`
  - `A2`
  - `A3`
  - `A4`
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
- stop_rule: `Ramanujan gate + Kolmogorov gate + Godel gate`
- reopen_bar: `only if a smaller and stronger contract directly dominates the adopted candidate`
- ledger_path: `docs/review-plan/runs/2026-04-17-form-builtin-message-authoring-sugar-review.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `builtin message input widening` 比继续坚持 token-only 更值得引入
  - status: `kept`
  - resolution_basis: `采纳更小的 authoring-only sugar 候选`
- A2:
  - summary: raw string sugar 只停在 builtin message 输入位，就足够闭口
  - status: `kept`
  - resolution_basis: `采用 closed allowlist + lowering invariant`
- A3:
  - summary: lower 后 canonical carrier 保持不变，可以不改 i18n 公共 contract
  - status: `kept`
  - resolution_basis: `adopted candidate 明确保持公共 carrier 不变`
- A4:
  - summary: bare string shorthand 对 required/email 与 object message 对数值类 / pattern 的分层是当前最小可用面
  - status: `merged`
  - resolution_basis: `v1 采用更小的 direct slot + Rule.make(required/email) 分层`

## Round 1

### Phase

- challenge

### Input Residual

- none

### Findings

- F1 `high` `invalidity`: `Rule.make({ required/email: "..." })` 与 direct message slot 混在一起，target claim 与 allowlist 不一致
- F2 `high` `invalidity`: lowering law 只有方向句，没有 exact owner、边界与结果不变量
- F3 `medium` `ambiguity`: allowlist 用 name-based 枚举且带开放尾巴，未来 builtin 容易偷扩面
- F4 `medium` `controversy`: teaching order 未冻结，容易把 sugar 误教成主路径

### Counter Proposals

- P1:
  - why_better: 把候选缩回真正的 authoring-only sugar，并保持 canonical carrier 不变
  - overturns_assumptions:
    - `A1`
  - resolves_findings:
    - `F1`
    - `F2`
  - supersedes_proposals:
    - none
  - dominance: `dominates`
  - axis_scores:
    - concept-count: `better`
    - public-surface: `same`
    - compat-budget: `same`
    - migration-cost: `same`
    - proof-strength: `better`
    - future-headroom: `better`
- P2:
  - why_better: 用 closed allowlist、shape-first law 和 teaching order 压掉 sugar creep
  - overturns_assumptions:
    - `A2`
    - `A4`
  - resolves_findings:
    - `F3`
    - `F4`
  - supersedes_proposals:
    - none
  - dominance: `dominates`
  - axis_scores:
    - concept-count: `better`
    - public-surface: `same`
    - compat-budget: `same`
    - migration-cost: `same`
    - proof-strength: `better`
    - future-headroom: `same`

### Resolution Delta

- `F1` `closed`
- `F2` `closed`
- `F3` `closed`
- `F4` `closed`
- `P1` `adopted`
- `P2` `adopted`

## Adoption

- adopted_candidate: `builtin-message-slot-sugar-with-hard-lowering-boundary`
- lineage:
  - `baseline narrow sugar proposal`
  - `P1`
  - `P2`
- rejected_alternatives:
  - `direct builder bare string positional shorthand`
  - `open-ended Rule.make string shorthand`
  - `soft lowering with unspecified result contract`
- rejection_reason:
  - `too wide, too implicit, or too weak to pass zero-unresolved`
- dominance_verdict:
  - `adopted candidate dominates on concept-count and proof-strength`

### Freeze Record

- adopted_summary:
  - raw string sugar 只允许停在显式 `message` slot 与 `Form.Rule.make` 的 `required/email` shorthand
  - direct builder 不开放 bare string positional shorthand
  - lowering 只发生在 Form authoring edge
  - raw string 不越过 builtin parser 边界
  - lower 后 compare / reason / diagnostics 继续只看到既有 canonical carrier
  - docs 顺序固定为：零参数 builtin > token override > raw string sugar
- kernel_verdict:
  - `Ramanujan`: 继续保持问题只落在已证明的最小痛点面
  - `Kolmogorov`: 不改公共 carrier，不增 i18n render branch
  - `Godel`: 拒绝第二 authoring route 与 raw string 回流 canonical state
- frozen_decisions:
  - canonical carrier 继续不变
  - v1 allowlist 为闭集
  - `Rule.make` string shorthand 只限 `required` 与 `email`
- non_goals:
  - `global raw string sugar`
  - `Form.Error.leaf/manual error raw string`
  - `public i18n carrier change`
- allowed_reopen_surface:
  - `future builtin family expansion`
  - `direct builder positional shorthand if future evidence emerges`
- proof_obligations:
  - exact TS input matrix must be frozen
  - lowering invariant must be testable
  - tutorial ordering must keep token-first main path
- delta_from_previous_round:
  - `broader sugar candidate -> smaller closed allowlist candidate`

## Consensus

- reviewers:
  - `Kuhn`
  - `Avicenna`
  - `McClintock`
  - `Rawls`
- adopted_candidate:
  - `builtin-message-slot-sugar-with-hard-lowering-boundary`
- final_status:
  - `已达成共识`
- stop_rule_satisfied:
  - `true`
- residual_risk:
  - 实施时仍需用类型与测试门禁锁死 lowering invariant 和 closed allowlist
  - 若未来新增 builtin family 或新的 Rule.make shorthand，需要单独 reopen，不能沿用这轮 sugar 结论自动扩面
