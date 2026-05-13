# Runtime Lifecycle Authoring Surface Review Ledger

## Meta

- target: `specs/170-runtime-lifecycle-authoring-surface`
- targets:
  - `specs/170-runtime-lifecycle-authoring-surface/spec.md`
  - `specs/170-runtime-lifecycle-authoring-surface/discussion.md`
  - `specs/011-upgrade-lifecycle/spec.md`
  - `specs/136-declare-run-phase-contract/spec.md`
  - `docs/ssot/runtime/01-public-api-spine.md`
  - `docs/ssot/runtime/03-canonical-authoring.md`
  - `docs/ssot/runtime/05-logic-composition-and-override.md`
  - `docs/ssot/runtime/README.md`
  - `docs/standards/logix-api-next-guardrails.md`
  - `skills/logix-best-practices/references/agent-first-api-generation.md`
- source_kind: `file-ssot-contract`
- reviewers: `A1 Dalton`, `A2 Ptolemy`, `A3 Peirce`, `A4 Herschel`
- round_count: 2
- challenge_scope: `open`
- consensus_status: `consensus-after-converge`

## Bootstrap

- target_complete: yes
- alignment_gate:
  - policy: `auto`
  - status: `inferred`
  - resolved_points:
    - 用户要求新建生命周期优化 spec。
    - 用户要求只写 `spec.md`，并把当前想法放入 `discussion.md`。
    - 用户明确要求使用 `$plan-optimality-loop` 打磨到底。
    - 用户要求冻结点回写到其他规划产物。
  - open_questions: none
  - confirmation_basis: 用户明确授权 subagent / 多 reviewer，并明确要求落盘。
- review_contract:
  - artifact_kind: `ssot-contract`
  - review_goal: `design-closure`
  - target_claim: `170` 应移除 lifecycle 作为 public authoring noun，只保留 runtime-owned lifecycle substrate 与 Logic 的 singleton readiness contribution；旧 `$.lifecycle.*` family 不再作为 public surface。
  - target_refs:
    - `docs/ssot/runtime/01-public-api-spine.md`
    - `docs/ssot/runtime/03-canonical-authoring.md`
    - `docs/ssot/runtime/05-logic-composition-and-override.md`
    - `docs/ssot/runtime/09-verification-control-plane.md`
    - `docs/ssot/runtime/10-react-host-projection-boundary.md`
    - `specs/011-upgrade-lifecycle/spec.md`
    - `specs/136-declare-run-phase-contract/spec.md`
    - `specs/158-runtime-hmr-lifecycle/spec.md`
  - non_default_overrides:
    - stop_condition: `consensus`
    - write_policy: main agent may edit target spec, discussion, bound SSoT, standards, skill guidance, and ledger.
- review_object_manifest:
  - source_inputs:
    - user lifecycle surface question and requested direction
    - initial 170 spec/discussion
    - public API spine and canonical authoring SSoT
    - 011 / 136 / 158 predecessor specs
  - materialized_targets:
    - `specs/170-runtime-lifecycle-authoring-surface/spec.md`
    - `specs/170-runtime-lifecycle-authoring-surface/discussion.md`
  - authority_target: `specs/170-runtime-lifecycle-authoring-surface/spec.md`
  - bound_docs:
    - `docs/ssot/runtime/01-public-api-spine.md`
    - `docs/ssot/runtime/03-canonical-authoring.md`
    - `docs/ssot/runtime/05-logic-composition-and-override.md`
    - `docs/standards/logix-api-next-guardrails.md`
    - `skills/logix-best-practices/references/agent-first-api-generation.md`
    - `specs/011-upgrade-lifecycle/spec.md`
    - `specs/136-declare-run-phase-contract/spec.md`
  - derived_scope: lifecycle authoring SSoT contract and bound public authoring docs
  - allowed_classes:
    - SSoT contract correction
    - predecessor supersession notice
    - public API shape freeze
    - skill guidance writeback
    - ledger write
  - blocker_classes:
    - implementation code changes
    - compatibility layer design
    - new public lifecycle family
    - new public host signal family
  - ledger_target: `docs/review-plan/runs/2026-04-30-runtime-lifecycle-authoring-surface-optimality-loop.md`
- challenge_scope: `open`
- reviewer_set:
  - A1: structure purity and minimal axiom set
  - A2: compression and duplicate authority
  - A3: dominance alternatives and public/internal consistency
  - A4: target-function challenge
- kernel_council: `Ramanujan`, `Kolmogorov`, `Godel`
- dominance_axes:
  - `concept-count`
  - `public-surface`
  - `compat-budget`
  - `migration-cost`
  - `proof-strength`
  - `future-headroom`
- stop_rule: consensus after adopted freeze record and target text update
- reopen_bar:
  - readiness cannot be expressed by singleton public method
  - returned run effect cannot replace old `onStart` class
  - Scope cannot cover ordinary cleanup class
  - Runtime / Provider / diagnostics cannot replace per-logic lifecycle error observer
  - Platform / host carrier cannot cover host signal ownership
- ledger_path: `docs/review-plan/runs/2026-04-30-runtime-lifecycle-authoring-surface-optimality-loop.md`
- writable: yes

## Assumptions

- A170-001:
  - summary: Old `011` / `136` specs can coexist as authority without supersession.
  - status: `overturned`
  - resolution_basis: `170` now carries a supersession contract; `011` and `136` carry supersession notices.
- A170-002:
  - summary: `$.startup.require(...)` is the minimum public API.
  - status: `overturned`
  - resolution_basis: adopted candidate is root method `$.readyAfter(effect, { id?: string })`.
- A170-003:
  - summary: `options?` can remain open until implementation.
  - status: `overturned`
  - resolution_basis: option bag is sealed to `{ id?: string }`.
- A170-004:
  - summary: RuntimeProvider error observation is obviously observation-only.
  - status: `overturned`
  - resolution_basis: spec now states Provider `onError` is only an observation sink and does not decide recovery, retry, suppress policy, or instance lifetime.
- A170-005:
  - summary: Returned run effect automatically replaces `onStart` without a scheduling rule.
  - status: `overturned`
  - resolution_basis: spec now states returned run effect enters run path after readiness succeeds and does not block readiness.
- A170-006:
  - summary: Discussion can safely repeat owner truth if it says it is non-authoritative.
  - status: `overturned`
  - resolution_basis: discussion was reduced to review result, closed decisions, rejected alternatives, and reopen evidence.

## Round 1

### Phase

- challenge

### Input Residual

- none

### Findings

- F1 `critical` `invalidity`:
  - summary: `011` and `136` carried old public lifecycle authority without supersession.
  - evidence: initial `170` imported both as authority while removing public `$.lifecycle.*`.
  - status: `closed`
- F2 `critical` `controversy`:
  - summary: target function centered on replacing `$.lifecycle`, while stronger target is removing lifecycle as public authoring noun.
  - evidence: A4 target-function challenge.
  - status: `closed`
- F3 `high` `controversy`:
  - summary: `$.startup.require(...)` could become a new public phase namespace.
  - evidence: A1/A3/A4 identified `startup` sibling risk.
  - status: `closed`
- F4 `high` `ambiguity`:
  - summary: `options?` could carry fatal, timeout, ordering, retry, or policy.
  - evidence: initial discussion left Q170-002 open.
  - status: `closed`
- F5 `high` `ambiguity`:
  - summary: returned run effect scheduling relative to readiness was implicit.
  - evidence: A3 finding on run-after-ready.
  - status: `closed`
- F6 `medium` `ambiguity`:
  - summary: Provider error observation could be read as second lifecycle policy authority.
  - evidence: A3 finding on Provider observation lane.
  - status: `closed`
- F7 `medium` `ambiguity`:
  - summary: old lifecycle text sweep classification was repeated and lacked one owner.
  - evidence: A2 compression finding.
  - status: `closed`

### Counter Proposals

- P1:
  - summary: No public lifecycle noun plus singleton readiness contribution.
  - why_better: Removes old authoring noun and prevents replacement namespace expansion.
  - overturns_assumptions: A170-002
  - resolves_findings: F2, F3
  - supersedes_proposals: keep full lifecycle family, keep only `$.lifecycle.onInitRequired`, adopt `$.startup.require`
  - dominance: `dominates`
  - axis_scores:
    - concept-count: +2
    - public-surface: +2
    - compat-budget: +1
    - migration-cost: 0
    - proof-strength: +1
    - future-headroom: +1
  - status: `adopted`
- P2:
  - summary: Adopt root readiness method, currently spelled `$.readyAfter(effect, { id?: string })`.
  - why_better: Avoids `startup` namespace and leaves only a single builder method.
  - overturns_assumptions: A170-002, A170-003
  - resolves_findings: F3, F4
  - supersedes_proposals: `$.startup.require`, `$.ready.require`
  - dominance: `dominates`
  - axis_scores:
    - concept-count: +2
    - public-surface: +2
    - compat-budget: 0
    - migration-cost: 0
    - proof-strength: +1
    - future-headroom: +1
  - status: `adopted`
- P3:
  - summary: Supersession contract for `011` / `136` / `158`.
  - why_better: Keeps useful runtime substrate facts while closing old public spelling authority.
  - overturns_assumptions: A170-001
  - resolves_findings: F1
  - supersedes_proposals: direct import of older lifecycle specs as equal authority
  - dominance: `dominates`
  - axis_scores:
    - concept-count: +1
    - public-surface: +1
    - compat-budget: +1
    - migration-cost: 0
    - proof-strength: +3
    - future-headroom: +2
  - status: `adopted`
- P4:
  - summary: Single routing table plus single old-name classification rule.
  - why_better: Removes repeated owner lane rules and gives text sweep one authority.
  - overturns_assumptions: A170-006
  - resolves_findings: F7
  - supersedes_proposals: repeated owner lane bullets across spec sections
  - dominance: `dominates`
  - axis_scores:
    - concept-count: +2
    - public-surface: +1
    - compat-budget: 0
    - migration-cost: +1
    - proof-strength: +1
    - future-headroom: +1
  - status: `adopted`
- P5:
  - summary: Run-after-ready and Provider observation-only closure rules.
  - why_better: Prevents readiness/run and Provider/error lanes from becoming second lifecycle authorities.
  - overturns_assumptions: A170-004, A170-005
  - resolves_findings: F5, F6
  - supersedes_proposals: implicit scheduling and implicit observation semantics
  - dominance: `dominates`
  - axis_scores:
    - concept-count: 0
    - public-surface: 0
    - compat-budget: 0
    - migration-cost: 0
    - proof-strength: +2
    - future-headroom: +1
  - status: `adopted`

### Resolution Delta

- `170/spec.md`: rewrote target function, added supersession contract, routing table, old-name classification rule, sealed `$.readyAfter`, run-after-ready rule, Provider observation-only rule, and updated FR/SC.
- `170/discussion.md`: downgraded to review scratchpad, closed must-close questions, recorded rejected alternatives.
- `011/spec.md`: added supersession notice.
- `136/spec.md`: added supersession notice.
- `01/03/05` SSoT pages: added `$.readyAfter`, no public lifecycle noun, run-after-ready, and no replacement family rules.
- `logix-api-next-guardrails.md`: added guardrails for lifecycle authoring removal and sealed readiness method.
- `runtime/README.md`: marked relevant SSoT owner specs as `122 + 170`.
- `agent-first-api-generation.md`: added generation rule for `$.readyAfter` and forbidden old/replacement families.

## Round 2

### Phase

- converge

### Input Residual

- F1-F7 after Round 1 writeback.

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- All reviewers returned `无 unresolved findings`.
- Residual risk recorded for future sweep: `011` / `136` and verification / host lifecycle pages still contain historical or internal lifecycle vocabulary; implementation planning must classify them under the Old Lifecycle Mention Classification Rule.

## Adoption

- adopted_candidate: `No public lifecycle noun + $.readyAfter(effect, { id?: string })`
- lineage:
  - initial single-method readiness idea
  - A4 target-function challenge
  - A1 root-method compression
  - A2 authority compression
  - A3 dominance closure
- rejected_alternatives:
  - full public `$.lifecycle.*`
  - `$.lifecycle.onInitRequired(...)` only
  - `$.startup.require(...)`
  - `$.ready.require(...)`
  - public `$.resources.onDispose(...)`
  - public `$.signals.*`
  - public `$.errors.onUnhandled(...)`
- rejection_reason:
  - rejected alternatives either preserve lifecycle authoring noun, create replacement phase families, duplicate Effect Scope, duplicate Runtime / Provider observation, or move host ownership into ordinary Logic.
- dominance_verdict:
  - adopted candidate improves `concept-count`, `public-surface`, `proof-strength`, and `future-headroom` without increasing compatibility burden under the repository forward-only policy.
- freeze_record:
  - adopted_summary: public authoring has no lifecycle noun; Logic readiness contribution is `$.readyAfter(effect, { id?: string })`; all former lifecycle concerns route through the owner table.
  - kernel_verdict: passes Ramanujan, Kolmogorov, and Godel gates.
  - frozen_decisions:
    - public lifecycle authoring noun removed
    - readiness method is root-level singleton `$.readyAfter`
    - option bag sealed to `{ id?: string }`
    - no `$.startup.*`, `$.ready.*`, `$.resources.*`, or `$.signals.*`
    - returned run effect starts after readiness succeeds and does not block readiness
    - Provider error callback is observation-only
    - old lifecycle mentions use one classification rule
  - non_goals:
    - implementation patch plan
    - HMR internals
    - Platform signal implementation
    - Scope implementation
    - compatibility shim
  - allowed_reopen_surface:
    - only evidence listed in `170/spec.md` Reopen Bar
  - proof_obligations:
    - text sweep classification
    - public example and skill sweep
    - readiness diagnostics witness
    - perf baseline before runtime substrate changes
  - delta_from_previous_round:
    - closed all Round 1 findings

## Consensus

- status: `reached`
- reviewer_results:
  - A1: 无 unresolved findings
  - A2: 无 unresolved findings
  - A3: 无 unresolved findings
  - A4: 无 unresolved findings
- residual_risk:
  - Historical `$.lifecycle.*` references remain in predecessor specs and internal/evidence docs. They are accepted only under supersession and classification rules. Implementation planning must run the full text sweep before claiming cutover complete.
