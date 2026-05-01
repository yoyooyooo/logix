# Readiness API Naming Review Ledger

## Meta

- target: `specs/170-runtime-lifecycle-authoring-surface/readiness-api-naming-proposal.md`
- targets:
  - `specs/170-runtime-lifecycle-authoring-surface/readiness-api-naming-proposal.md`
  - `specs/170-runtime-lifecycle-authoring-surface/spec.md`
  - `specs/170-runtime-lifecycle-authoring-surface/plan.md`
- source_kind: `file-ssot-contract`
- reviewers: `A1 Poincare`, `A2 Peirce`, `A3 Russell`, `A4 Godel`, `A4 Nietzsche`, `A1 Ampere`, `A2 Lagrange`, `A3 Pauli`, `A4 Kant`
- round_count: 2
- challenge_scope: `open`
- consensus_status: `consensus-after-converge`

## Bootstrap

- target_complete: yes
- alignment_gate:
  - policy: `auto`
  - status: `inferred`
  - resolved_points:
    - 用户要求给 readiness gate 命名单独起一个小提案。
    - 用户明确要求走 `$plan-optimality-loop`。
    - 用户需要稳定可挑选的至少前三个名字。
    - 固定语义来自 `170-runtime-lifecycle-authoring-surface`，本轮只挑战命名。
  - open_questions: none
  - confirmation_basis: 用户明确授权 subagent / 多 reviewer，并要求产出可选 shortlist。
- review_contract:
  - artifact_kind: `ssot-contract`
  - review_goal: `design-closure`
  - target_claim: `170` 的唯一 public readiness gate 方法需要稳定 top-three 命名 shortlist，语义固定为 root builder method、同步登记、startup 执行、per instance once、失败阻断 acquisition、returned run effect 后启、不阻塞 ready、option bag 只允许 `{ id?: string }`。
  - target_refs:
    - `specs/170-runtime-lifecycle-authoring-surface/spec.md`
    - `specs/170-runtime-lifecycle-authoring-surface/plan.md`
  - non_default_overrides:
    - stop_condition: `consensus`
    - write_policy: main agent may edit naming proposal and ledger only; implementation code is out of scope.
    - scope_fence: fixed semantics cannot be reopened; only naming objective, candidate quality, ranking, rejection reasons, and shortlist stability are in scope.
- review_object_manifest:
  - source_inputs:
    - user feedback that `$.requireReady` feels awkward
    - `170` spec fixed semantics
    - naming proposal candidate set
  - materialized_targets:
    - `specs/170-runtime-lifecycle-authoring-surface/readiness-api-naming-proposal.md`
  - authority_target: `specs/170-runtime-lifecycle-authoring-surface/readiness-api-naming-proposal.md`
  - bound_docs:
    - `specs/170-runtime-lifecycle-authoring-surface/spec.md`
    - `specs/170-runtime-lifecycle-authoring-surface/plan.md`
  - derived_scope: public readiness gate method naming
  - allowed_classes:
    - naming objective correction
    - candidate shortlist update
    - rejection reason clarification
    - ledger write
  - blocker_classes:
    - implementation code changes
    - reopening fixed readiness semantics
    - public namespace family
    - lifecycle / startup / signals replacement family
  - ledger_target: `docs/review-plan/runs/2026-04-30-readiness-api-naming-optimality-loop.md`
- challenge_scope: `open`
- reviewer_set:
  - A1: structure purity and minimal axiom mapping
  - A2: compression and documentation burden
  - A3: dominance alternatives and public/internal consistency
  - A4: target-function challenge
- active_advisors:
  - A4 replacement `Nietzsche`
- activation_reason:
  - Original A4 timed out twice and was closed as stale. Replacement A4 preserved the target-function challenge view.
- kernel_council: `Ramanujan`, `Kolmogorov`, `Godel`
- dominance_axes:
  - `concept-count`
  - `public-surface`
  - `compat-budget`
  - `migration-cost`
  - `proof-strength`
  - `future-headroom`
- stop_rule: consensus after adopted shortlist freeze and proposal / ledger update
- reopen_bar:
  - a candidate strictly improves required gate clarity without adding namespace pressure
  - a candidate strictly improves Agent generation stability without weakening acquisition failure semantics
  - a candidate exposes a hidden second-authority risk in the adopted shortlist
- ledger_path: `docs/review-plan/runs/2026-04-30-readiness-api-naming-optimality-loop.md`
- writable: yes

## Assumptions

- A170-NAME-001:
  - summary: Human first-read smoothness can rank above failure-blocking contract precision.
  - status: `overturned`
  - resolution_basis: A1, A2, A3, and A4 all rejected `beforeReady`; A4 made acquisition failure clarity the primary ranking criterion.
- A170-NAME-002:
  - summary: The method name should encode startup timing, per-instance once, returned run ordering, and non-worker / non-cleanup / non-observer boundaries by itself.
  - status: `overturned`
  - resolution_basis: A2 and A3 compressed the objective to root readiness gate registration; the remaining semantics stay in the contract and tests.
- A170-NAME-003:
  - summary: `ready` and `readiness` are equivalent naming atoms.
  - status: `overturned`
  - resolution_basis: A1, A3, and A4 argued `readiness` maps better to the SSoT entity and diagnostics vocabulary.
- A170-NAME-004:
  - summary: Timing names are safe if the method remains root-level.
  - status: `overturned`
  - resolution_basis: All reviewers flagged `beforeReady` as hook grammar with sibling-family gravity.

## Round 1

### Phase

- challenge

### Input Residual

- The proposal ranked `ensureReady`, `beforeReady`, and `requireReady` before review.

### Findings

- F1 `high` `controversy`:
  - summary: `beforeReady` should not remain in the top-three shortlist.
  - evidence: A1, A2, A3, and A4 independently flagged timing-hook grammar and `afterReady` family pressure.
  - status: `closed`
- F2 `high` `ambiguity`:
  - summary: The initial naming objective over-weighted first-read smoothness and under-weighted acquisition failure.
  - evidence: A4 target-function challenge and A2 compression finding.
  - status: `closed`
- F3 `medium` `ambiguity`:
  - summary: Candidate set missed names that directly reuse SSoT terminology.
  - evidence: A1 proposed `requireReadiness`; A3 proposed `readinessRequirement` and `readinessGate`; A4 proposed `requireReadiness` and `readinessRequirement`.
  - status: `closed`
- F4 `medium` `controversy`:
  - summary: `ensureReady` is readable but can imply repair or author-side readiness authority.
  - evidence: A1, A3, and A4 warnings.
  - status: `kept`

### Counter Proposals

- P1:
  - summary: Reject `beforeReady` from top three.
  - why_better: Removes timing-hook grammar and sibling-family pressure.
  - overturns_assumptions: A170-NAME-001, A170-NAME-004
  - resolves_findings: F1
  - supersedes_proposals: initial `beforeReady` ranking
  - dominance: `dominates`
  - axis_scores:
    - concept-count: +1
    - public-surface: +1
    - compat-budget: 0
    - migration-cost: 0
    - proof-strength: +2
    - future-headroom: +2
  - status: `adopted`
- P2:
  - summary: Make the naming objective "root readiness gate registration".
  - why_better: Keeps the name focused on readiness and required gate semantics while leaving startup execution and per-instance once to the contract.
  - overturns_assumptions: A170-NAME-002
  - resolves_findings: F2
  - supersedes_proposals: over-broad naming goal
  - dominance: `dominates`
  - axis_scores:
    - concept-count: +2
    - public-surface: 0
    - compat-budget: 0
    - migration-cost: 0
    - proof-strength: +1
    - future-headroom: +1
  - status: `adopted`
- P3:
  - summary: Add readiness-term candidates to the stable shortlist.
  - why_better: Aligns public name with SSoT entity and diagnostics vocabulary.
  - overturns_assumptions: A170-NAME-003
  - resolves_findings: F3
  - supersedes_proposals: ready-only candidate set
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

- Added `Optimality Loop Result` to the proposal.
- Frozen top-three shortlist:
  1. `$.requireReadiness(effect, { id?: string })`
  2. `$.ensureReady(effect, { id?: string })`
  3. `$.readinessRequirement(effect, { id?: string })`
- Demoted `$.beforeReady(...)` to rejected.
- Kept `$.readinessGate(...)` and `$.requireReady(...)` as close-but-not-top-three.

## Round 2

### Phase

- converge

### Input Residual

- Check whether the frozen top-three shortlist is still directly dominated by a smaller or stronger proposal.
- Check whether Round 1 findings around `beforeReady`, failure-gate clarity, readiness terminology, and target-function priority are resolved.

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- A1 Ampere: `无 unresolved findings`; residual risk is `ensureReady` repair / author-side readiness authority ambiguity.
- A2 Lagrange: `无 unresolved findings`; residual risk is avoiding documentation burden by keeping startup, per-instance once, and run ordering in contract / tests.
- A3 Pauli: `无 unresolved findings`; residual risk is `ensureReady` repair ambiguity, mitigated by its human-first classification.
- A4 Kant: `无 unresolved findings`; residual risk is `ensureReady` has the weakest failure-gate signal and needs spec / diagnostics / test reinforcement if chosen.

## Adoption

- adopted_candidate: top-three naming shortlist for user selection
- lineage:
  - initial proposal: `ensureReady`, `beforeReady`, `requireReady`
  - reviewer convergence: reject `beforeReady`, add readiness-term candidates, strengthen failure-gate criterion
  - synthesized shortlist: `requireReadiness`, `ensureReady`, `readinessRequirement`
- rejected_alternatives:
  - `$.beforeReady(...)`
  - `$.prepare(...)`
  - `$.readyWhen(...)`
  - `$.gateReady(...)`
- rejection_reason:
  - timing hook grammar, excessive breadth, dynamic ready-state ambiguity, or internal vocabulary overfit
- dominance_verdict:
  - The adopted shortlist keeps public surface and concept count unchanged while improving proof strength and future headroom over the preliminary shortlist.
- freeze_record:
  - adopted_summary: Stable top three are `requireReadiness`, `ensureReady`, and `readinessRequirement`; user still chooses the final public spelling.
  - kernel_verdict:
    - Ramanujan: one root method remains the minimum generator.
    - Kolmogorov: the naming objective is compressed to root readiness gate registration.
    - Godel: no candidate introduces a namespace or second lifecycle authority.
  - frozen_decisions:
    - `beforeReady` is not a top-three candidate.
    - `requireReadiness` is the contract-first recommendation.
    - `ensureReady` is the human-first recommendation.
    - `readinessRequirement` is the SSoT-term recommendation.
    - startup execution, per-instance once, and returned run ordering stay in contract / tests, not in the name.
  - non_goals:
    - no implementation code change
    - no reopening fixed readiness semantics
    - no new namespace family
  - allowed_reopen_surface:
    - a name with strictly stronger failure-gate clarity and no family pressure
    - user preference after comparing the frozen top three
  - proof_obligations:
    - final chosen name must be propagated to `spec.md`, `plan.md`, contracts, tasks, quickstart, SSoT pages, and skills before implementation
    - diagnostics must explain acquisition failure for the final name
  - delta_from_previous_round:
    - preliminary top-three replaced with stable top-three

## Consensus

- status: consensus-after-converge
- residual_risk:
  - `ensureReady` remains readable but less precise.
  - `readinessRequirement` remains precise but verbose.
  - `requireReadiness` is the current synthesis default but should be confirmed by user preference before global writeback.

## User Follow-Up

- status: `current-planning-selection`
- selected_spelling: `$.readyAfter(effect, { id?: string })`
- rationale:
  - User judged the reviewer shortlist too contract-heavy and insufficiently expressive of module instance ready state.
  - User wants a better balance between human understanding and Agent understanding.
  - `readyAfter` describes the scenario directly: ready after this effect succeeds.
- adoption_state:
  - Written back to active planning artifacts after user confirmed: "先按这样来计划".
  - Changeable only by a later explicit naming decision.
- completed_writeback:
  - Replaced placeholder spelling across `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/README.md`, `quickstart.md`, `tasks.md`, SSoT pages, standards, skills, and supersession notices.
  - Added first-use wording: `readyAfter` registers a readiness requirement; the instance is ready after the effect succeeds; failure fails acquisition.
  - Guarded against `beforeReady`, `afterReady`, `ready.*`, or lifecycle-like sibling APIs.
