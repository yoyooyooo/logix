## Meta

- target: `Form.Companion` public contract and architectural role
- targets:
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/05-public-api-families.md`
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/13-exact-surface-contract.md`
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/capability/03-frozen-api-shape.md`
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/10-react-host-projection-boundary.md`
- source_kind: `ssot-contract`
- reviewer_count: `4`
- reviewer_model: `gpt-5.4`
- reviewer_reasoning: `xhigh`
- challenge_scope: `open`
- consensus_status: `consensus`

## Bootstrap

- target_complete: `yes`
- alignment_gate:
  - policy: `auto`
  - status: `inferred`
  - resolved_points:
    - `artifact_kind=ssot-contract`
    - `review_goal=design-closure`
    - `challenge_scope=open`
    - `scope_fence=只审 Form.Companion 的公开定位、route ownership、truth ownership 与 host consumption 边界`
    - `stop_condition=bounded-rounds`
    - `write_policy=main agent may patch authority docs and bound docs`
  - open_questions: `none`
  - confirmation_basis: `用户显式要求使用 $plan-optimality-loop 打磨该结构化规划议题`
- review_contract:
  - artifact_kind: `ssot-contract`
  - review_goal: `design-closure`
  - target_claim: `当前 SSoT 应把 Form.Companion 定位为 form-owned 的一级公开 data-support namespace / selector primitive family；它可见于 @logixjs/form root export，但不应被视为第三条 route、一级 owner lane、truth owner；companion 的语义 owner 仍是 field(path).companion(...) 这条 authoring act，而其读侧消费继续通过 core host gate useSelector(handle, Form.Companion.*)。`
  - target_refs:
    - `docs/ssot/form/05-public-api-families.md`
    - `docs/ssot/form/13-exact-surface-contract.md`
    - `docs/ssot/capability/03-frozen-api-shape.md`
    - `docs/ssot/runtime/10-react-host-projection-boundary.md`
    - `packages/logix-form/src/index.ts`
    - `packages/logix-form/src/Companion.ts`
  - non_default_overrides:
    - `scope_fence`
    - `stop_condition`
    - `write_policy`
- review_object_manifest:
  - source_inputs: `current SSoT docs plus root barrel / Companion primitive implementation`
  - materialized_targets: `existing files only`
  - authority_target: `05 + 13 doc family, with 03 and runtime/10 as bound docs`
  - bound_docs:
    - `docs/ssot/capability/03-frozen-api-shape.md`
    - `docs/ssot/runtime/10-react-host-projection-boundary.md`
  - derived_scope: `Form.Companion public contract and architectural role`
  - allowed_classes:
    - `namespace role`
    - `selector primitive`
    - `route ownership`
    - `truth ownership`
    - `authoring/read split`
    - `teaching corollary`
  - blocker_classes:
    - `second route`
    - `second owner lane`
    - `truth-owner ambiguity`
    - `root export causing authority drift`
    - `doc contradiction across 05/13/03/runtime-10`
  - ledger_target: `docs/review-plan/runs/2026-04-24-form-companion-role-review.md`
- challenge_scope: `open`
- reviewer_set:
  - `A1 structural purity`
  - `A2 compression`
  - `A3 consistency and dominance`
  - `A4 goal-function challenge`
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
- stop_rule: `must pass Ramanujan / Kolmogorov / Godel gates`
- reopen_bar: `only if a stronger proposal improves dominance axes without adding second authority / route / truth`
- ledger_path: `docs/review-plan/runs/2026-04-24-form-companion-role-review.md`
- writable: `yes`

## Assumptions

- A1:
  - summary: `Form.Companion` root visibility does not imply third route or truth ownership.
  - status: `kept`
  - resolution_basis: `05 + runtime/10 + all reviewers agree`
- A2:
  - summary: `field(path).companion(...)` remains the only authoring act and truth origin for companion semantics.
  - status: `kept`
  - resolution_basis: `13 + A1/A3/A4 reviewer convergence`
- A3:
  - summary: `Form.Companion.*` belongs to selector primitive family and is consumed only through core host gate.
  - status: `kept`
  - resolution_basis: `runtime/10 + 13 + code barrel`

## Round 1

### Phase

- `challenge`

### Input Residual

- `none`

### Findings

- F1 `high` `authority-conflict`:
  - `13` as exact authority gave mutually exclusive root-surface answers for `Form.Companion`.
- F2 `medium` `namespace-drift`:
  - `13` placed companion primitives under `Form.Error` support role, weakening namespace boundary.
- F3 `medium` `owner-lane-ambiguity`:
  - `03` capability coverage could be misread as route owner / truth owner for companion.
- F4 `medium` `negative-space-gap`:
  - `05` lacked an explicit anti-expansion line for `Form.Companion` host hook / helper / projection drift.

### Counter Proposals

- P1:
  - why_better: `keep current target claim, close authority conflict, and compress route/truth/host split into explicit wording`
  - overturns_assumptions:
    - `13 already closed`
    - `root export can be inferred from bound docs without authority writeback`
  - resolves_findings:
    - `F1`
    - `F2`
    - `F3`
    - `F4`
  - supersedes_proposals:
    - `minimal no-op baseline`
    - `reopen Companion as third route`
    - `promote Companion into core host helper family`
  - dominance: `strictly better on proof-strength and consistency with no public-surface increase`
  - axis_scores:
    - `concept-count: improved`
    - `public-surface: unchanged`
    - `compat-budget: unchanged`
    - `migration-cost: low`
    - `proof-strength: improved`
    - `future-headroom: improved`

### Resolution Delta

- `F1 -> open`
- `F2 -> open`
- `F3 -> open`
- `F4 -> open`
- `P1 -> adopted candidate`

## Adoption

- adopted_candidate: `P1 authority-closed companion contract`
- lineage:
  - `A1-ALT-01`
  - `A2-ALT-01`
  - `A3-ALT-01`
  - `A4-ALT-01`
- rejected_alternatives:
  - `reopen Form.Companion as third route`
  - `move Form.Companion into core host helper family`
  - `leave 13 conflict unresolved and rely on bound docs`
- rejection_reason:
  - `fails Godel gate by introducing or tolerating second authority / route ambiguity`
  - `fails Ramanujan gate by adding new owner narrative`
  - `fails Kolmogorov gate by increasing prompt and recovery cost`
- dominance_verdict: `adopted candidate dominates baseline without adding public concepts`

### Freeze Record

- adopted_summary:
  - `Form.Companion` is a root-visible, form-owned data-support namespace / selector primitive family.
  - `field(path).companion({ deps, lower })` remains the only authoring act and truth origin for companion semantics.
  - `Form.Companion.field(path)` and `Form.Companion.byRowId(...)` are read primitives consumed only through `useSelector(handle, ...)`.
  - `Form.Companion` does not create a third route, a first-class owner lane, or a truth owner.
- kernel_verdict:
  - `Ramanujan gate passed`
  - `Kolmogorov gate passed`
  - `Godel gate passed after authority writeback`
- frozen_decisions:
  - `13 root surface must include Form.Companion`
  - `13 must separate Form.Error and Form.Companion support roles`
  - `03 must mark coverage lanes as non-owner, non-truth`
  - `05 must add explicit anti-drift rule for Form.Companion`
- non_goals:
  - `no new route`
  - `no new host helper family`
  - `no change to runtime/10 host gate`
  - `no implementation work`
- allowed_reopen_surface:
  - `only if a stronger contract can reduce concepts further or improve proof-strength without creating second authority`
- proof_obligations:
  - `cross-doc wording consistency`
  - `single-page authority closure in 13`
- delta_from_previous_round:
  - `authority conflict removed`
  - `namespace role clarified`
  - `coverage-lane ambiguity reduced`

## Round 2

### Phase

- `converge`

### Input Residual

- `review adopted freeze record against latest 05 / 13 / 03 writeback`

### Findings

- `none`

### Counter Proposals

- `none`

### Resolution Delta

- `F1 -> closed`
- `F2 -> closed`
- `F3 -> closed`
- `F4 -> closed`
- `all reviewers -> 无 unresolved findings`

## Consensus

- reviewers:
  - `A1: 无 unresolved findings`
  - `A2: 无 unresolved findings`
  - `A3: 无 unresolved findings`
  - `A4: 无 unresolved findings`
- adopted_candidate: `P1 authority-closed companion contract`
- final_status: `consensus reached`
- stop_rule_satisfied: `yes`
- residual_risk:
  - `future cross-doc drift if 05 / 13 / 03 / runtime-10 are edited independently without synchronized writeback`
