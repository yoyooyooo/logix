---
name: logix-capability-planning-loop
description: Use when planning Logix API shape from scenarios or capability atoms, managing proposal portfolios, running capability projection reviews, coordinating sub-agent planning packets, promoting repeated collisions into principles, or preparing implementation-ready plans from Logix capability SSoT documents.
---

# logix-capability-planning-loop

## Overview

Use this skill to move from Logix scenarios and capability atoms to API planning proposals, collision review, principle promotion, and implementation-ready planning without letting local proposals become hidden authority.

Core rule: `06 / domain scenario SSoT` owns scenarios, `capability/01` owns global workflow, domain `08` owns domain projection, proposal portfolio owns active proposals, exact authority pages own final API shape.

This skill must keep two loops connected:

- local slice loop: one scenario / capability / projection gets drafted, reviewed, collided, proven, and written back
- global shape loop: all accepted local deltas are checked against the total API shape for concept count, public surface, coverage, proof strength, and authority consistency

Do not let local proof success imply global API closure. A probe can improve confidence, but only the Global API Shape Closure Gate can declare the total shape ready.

Pressure work must actively challenge the frozen shape. A `CAP-PRESS-*` slice that only proves the existing shape still works is incomplete unless it has also generated plausible counter-shapes, rejected them through the decision policy, and carried the status quo burden of proof.

Human acceptance, first-read friction, and API taste are legitimate pressure lanes after capability coverage is plausible. They must be evaluated through `references/taste.md` so taste can challenge the shape without bypassing Agent-first, P0 laws, concept-count control, public-surface containment, or proof obligations.

## Default Execution Topology

Once the user enters this skill, default execution topology is `multi-agent`.

This topology applies inside the skill only. Repo-level default execution outside this skill stays unchanged.

Default responsibilities:

- main agent: coordinator and control-plane writer only
- planning sub-agent: drafts the proposal / collision / principle / proof / snapshot delta for one slice
- review sub-agent: challenges the draft, pressure-tests generator efficiency and boundary clarity, and produces review findings
- probe sub-agent: optional lane for proof design or implementation-pressure checks when executable evidence is needed

The main agent should:

- load sources
- choose the next work item
- prepare the Slice Manifest
- dispatch the smallest planning packet
- synthesize returned deltas
- update run-state, portfolio, proposal, collision, and feedback control documents
- decide next action and blockers

The main agent should not author the planning argument itself when sub-agent execution is available. If sub-agents are unavailable, the main agent may execute the blocked step locally and must record the fallback reason in the control plane.

## Required Sources

Read these before doing any planning:

1. `docs/ssot/capability/01-planning-harness.md`
2. `docs/ssot/capability/02-api-projection-decision-policy.md`
3. Domain planning harness, for Form: `docs/ssot/form/08-capability-decomposition-api-planning-harness.md`
4. Domain scenario matrix, for Form: `docs/ssot/form/06-capability-scenario-api-support-map.md`
5. Current run state: `docs/next/logix-api-planning/run-state.md`
6. Active portfolio: `docs/next/logix-api-planning/proposal-portfolio.md`
7. Proposal workspace: `docs/proposals/logix-api/README.md`
8. Shape snapshot when the user asks what API currently looks like: `docs/next/logix-api-planning/shape-snapshot.md`
9. Surface candidate registry: `docs/next/logix-api-planning/surface-candidate-registry.md`
10. Housekeeping rules: `docs/next/logix-api-planning/housekeeping.md`
11. API implementation gap ledger: `docs/next/logix-api-planning/api-implementation-gap-ledger.md`

If exact surface might change, also read the relevant authority targets named by `PROJ-*`, usually `05`, `09`, `13`, `runtime/09`, `runtime/10`, or `specs/155`.

## Sub-workflow Reuse

This skill owns the Logix capability planning workflow. It reuses `plan-optimality-loop` only as a review and convergence sub-workflow.

Because entering this skill is explicit authorization for sub-agent work, default multi-agent execution does not need extra permission inside the skill.

Use `plan-optimality-loop` when the active review step needs structured reviewer convergence, adversarial comparison, or the user names `$plan-optimality-loop`.

Allowed reuse points:

- proposal review
- cross-proposal collision review
- principle promotion review
- harness / skill evolution review
- implementation-ready plan review

Do not treat `plan-optimality-loop` as the top-level execution owner. The skill stays responsible for slice selection, packet routing, synthesis, control-plane writeback, and stop conditions.

## Default Main Flow

When the user invokes this skill without extra task detail, run this default flow. Treat any short phrase from the user as a generic request to continue the planning loop, not as a special command string.

1. Load Required Sources.
2. Inspect run state in `docs/next/logix-api-planning/run-state.md`.
3. Inspect portfolio status in `docs/next/logix-api-planning/proposal-portfolio.md`.
4. Pick the next work item by priority:
   - zero: if run state is `paused` and the only remaining item is deferred `authority-intake`, do not start it from a generic continue request; route to skill feedback, housekeeping, stale snapshot refresh, or stay paused
   - first: blocked or open `COL-*` with clear owner and proof gate
   - second: uncovered or weakly proven `CAP-*` needed by current high-pressure scenarios
   - third: surface candidates that cover many caps but lack proof, collision, or authority state
   - fourth: `PROJ-*` under-pressure with high generator-efficiency upside
   - fifth: stale `docs/next/logix-api-planning/shape-snapshot.md`
   - sixth: stale or missing implementation status in `docs/next/logix-api-planning/api-implementation-gap-ledger.md`
   - seventh: global closure check when all high-pressure slices appear covered
   - eighth: reusable skill feedback waiting in `feedback/ledger.md`
5. Build a Slice Manifest for that one work item.
6. Dispatch at least one planning sub-agent for the slice.
7. Dispatch at least one review sub-agent for the returned draft. If the review step needs structured convergence, route that step through `plan-optimality-loop`.
8. Dispatch a probe sub-agent only when the active work item needs executable evidence for proof or collision closure.
9. Synthesize one proposal, collision, principle candidate, proof-wave, snapshot, or skill feedback decision from the returned deltas.
10. Update the relevant control document.
11. If the wave freezes, closes, lands authority writeback, lands implementation-ready conversion, or changes implementation/proof/type status, update `docs/next/logix-api-planning/api-implementation-gap-ledger.md`.
12. Update `docs/next/logix-api-planning/run-state.md` before stopping.
13. If a wave closed or paused, apply `docs/next/logix-api-planning/housekeeping.md`.
14. Stop with next action and validation status.

Default mode is planning only. Runtime code may be changed only in the Implementation Probe Lane or after converting an `implementation-ready` proposal set into an implementation plan and executing it.

Implementation Probe Lane is allowed only when the active phase is `proof` and the proof gate cannot be judged from documents alone. Probe edits must be minimal, internal, test-backed, and marked `probe-local` until an authority writeback or principle promotion adopts the result. A probe must not create public API, exact surface, compare truth, report truth, or authoring semantics.

Probe code is allowed to exist as temporary scaffolding for test growth, but it must have an explicit lifecycle. Do not let scenario-specific proof names silently become the final implementation vocabulary.

Final assets must stay open-source readable. Production code and formal test file names should be named after final behavior, boundary, or contract, not after temporary planning packets. Keep capability and pressure identifiers in comments, test metadata, and planning docs for traceability, but do not let them dominate the main code-reading path.

## Paused / Deferred Authority-intake Guard

When `run-state.md` says `active_phase=paused`, a generic continue request may resume only if the paused cursor names a concrete non-deferred next work item.

If the only remaining work item is `deferred` or `authority-intake`, and it requires explicit productization or owner authority request, generic continue must not start it.

Allowed actions in this state:

- keep the loop paused and report the blocked condition
- run housekeeping if the control plane is stale
- refresh a stale shape snapshot from the surface registry
- process accepted skill feedback that improves future routing
- wait for the user to explicitly request the deferred authority intake

Forbidden actions in this state:

- coding a deferred productization route
- opening public surface from a deferred task
- converting admissibility-only proof into authority intake
- treating the word continue as productization approval

## Workflow

### 1. Select Slice

Create a Slice Manifest before asking any sub-agent or reviewer to reason.

Required fields:

- `target_scenarios`
- `target_caps`
- `related_projections`
- `related_collisions`
- `required_proofs`
- `coverage_kernel`
- `decision_policy`
- `non_claims`
- `generator_hypothesis`

When the work item is `CAP-PRESS-*`, risk pressure, global closure challenge, or the user asks to pressure-test the frozen shape, the Slice Manifest must also include:

- `pressure_mode`
- `capability_bundle`
- `cross_pressure_axes`
- `current_shape_under_attack`
- `forced_counter_shapes`
- `status_quo_burden`
- `implementation_friction_probe`
- `concept_admission_gate`
- `dual_audience_pressure`
- `overfit_underfit_guard`
- `human_status_quo_burden`
- `taste_rubric`
- `decision_latch`
- `final_asset_hygiene`
- `process_name_leak_check`
- `fixture_boundary`

Do not give any sub-agent the full matrix by default. Give the smallest slice that can answer the task.

### 2. Run Adversarial Pressure Mode

Use this mode for `CAP-PRESS-*`, risk lanes, frozen-shape challenge, or any review step that claims no public API change after high-risk capability pressure.

Pressure must be multi-axis:

- Bundle at least three interacting atoms or obligations when the matrix has enough relevant material.
- Include at least two distinct owner or truth lanes, such as source plus submit, row plus selector, rule plus evidence, verification plus report.
- Build local witnesses from existing `SC-*` rows. Do not create new scenario ids unless the domain scenario SSoT is updated.
- State the exact interaction that could break the current shape, not only the single atom under test.

Pressure must include forced counter-shape lanes:

- Treat the frozen shape as one candidate, not the only candidate.
- Generate at least two plausible alternate API directions for high-risk pressure. Examples include a public owner primitive, list/root companion, explicit receipt read route, selector wrapper family, public settlement noun, public reason noun, or scenario protocol surface.
- Each counter-shape must include public surface delta, owner/truth placement, first-read impact, generator impact, implementation sketch, proof requirement, and rejection or adoption reason.
- If a sub-agent cannot find two plausible counter-shapes, it must explain why and ask the reviewer to attack that failure.

Pressure that touches human acceptance, first-read friction, or design taste must also use the taste reference:

- Read `references/taste.md`.
- Separate `agent_cost`, `human_cost`, and `taste_cost`.
- Record the tie-breaker when Agent-first and human acceptance pull in different directions.
- Score candidate and counter-shapes on taste axes: symmetry, locality, name honesty, route count, concept density, progressive disclosure, negative space, error recoverability, and example integrity.
- Run the overfit / underfit guard before changing public shape for taste.
- If no public change is accepted, carry a human status quo burden.
- Close with a decision latch that states what evidence can reopen the argument.

No public change carries a burden of proof:

- Existing API use must stay readable for the combined witness.
- Internal implementation must not require a hidden second truth, second report object, second evidence envelope, or second read route.
- Proof must cover the combined interaction, not only independent happy paths.
- Probe code must not rely on scenario-specific names as reusable internal vocabulary without lifecycle review.
- If proof assets become final contracts, their file names must be behavior-first and trace planning ids through comments or metadata instead of process-oriented names.
- Surface registry, implementation gap ledger, and authority targets must remain coherent after the no-change decision.
- Human-facing no-change decisions must prove the current route remains teachable and readable, or route remaining friction to docs, examples, diagnostics, or a later authority review.

Use Implementation Friction Probe when documents cannot honestly decide the pressure:

- Probe friction signals include excessive special cases, duplicate coordinates, test-only bridges, hidden public semantics, raw internal path leakage, or scenario-specific helpers becoming reusable.
- Probe results can justify `implementation-task`, `PRIN-*`, `COL-*`, or authority writeback.
- Probe success alone cannot close a high-risk pressure slice unless the status quo burden or counter-shape rejection record is also written.

New public concept admission is allowed only when at least one gate is met:

- The frozen shape cannot express a claimed matrix scenario or required capability bundle.
- The frozen shape can express it only with authoring that is materially worse for first-read clarity or agent generation stability.
- The internal route would need a hidden second truth or persistent special substrate to simulate the missing concept.
- The same gap recurs across multiple pressure slices or collisions.
- The new concept replaces multiple local patches and lowers total concept count or public surface over the global shape.

Every admitted or rejected counter-shape must still pass P0 laws, concept-count control, public-surface containment, and authority ownership.

Allowed pressure decisions:

- `no-change-proven`
- `no-change-human-burden-met`
- `docs-or-example-task`
- `diagnostic-task`
- `internal-law`
- `implementation-task`
- `COL-*`
- `PRIN-*`
- `authority-writeback`
- `reopen-frozen-shape`

### 3. Draft Proposal

Every proposal must use the template in `references/templates.md`.

Minimum fields:

- `Target`
- `Decision Policy Check`
- `Shape`
- `Coverage`
- `Collision`
- `Proof`
- `Principle Candidates`
- `Review`

The proposal can contain code-like sketches, but mark them as `snapshot` or `planning-only` unless exact authority already owns them.

### 4. Review Proposal

Default review is still multi-agent. Use `plan-optimality-loop` when the review lane needs structured convergence or adversarial comparison.

Default review contract:

- `artifact_kind`: `ssot-contract` for harness docs, `implementation-plan` for implementation-ready plans
- `review_goal`: `design-closure` for proposal shape, `implementation-ready` for plan conversion
- `challenge_scope`: `open` until a freeze record exists, then `frozen`

For pressure work, review must attack both sides:

- challenge the frozen-shape no-change proof
- challenge every counter-shape for concept count, public surface, owner law, and proof cost
- challenge human-facing decisions for overfit, underfit, taste-rubric misuse, and weak decision latch
- reject a pressure packet that contains only status quo validation
- require an implementation friction probe if both sides depend on undocumented implementation assumptions

### 5. Admit To Portfolio

Only admitted proposals update `docs/next/logix-api-planning/proposal-portfolio.md`.

Portfolio admission requires:

- claimed caps and excluded caps
- touched projections
- touched collisions
- required proofs
- review ledger
- next action

If a proposal introduces or modifies a public concept candidate, also update `docs/next/logix-api-planning/surface-candidate-registry.md`. The registry tracks mechanical convergence; `shape-snapshot.md` stays human-readable.

### 6. Collide

Open or update `COL-*` when:

- two proposals cover the same `CAP-*`
- two proposals touch the same `PROJ-*`
- a proposal weakens a P1 preference
- a proof gate changes a capability owner or invariant

Collision records need close predicate and required proof. A collision without a close predicate is not ready for adoption.

### 7. Promote Principles

Use the Principle Promotion Lane when the same conflict repeats across proposals or lanes.

Sub-agents may submit `principle_candidate`; only the main agent can promote it to authority and write the control-plane result.

Promotion requires:

- source collisions
- principle statement
- affected caps and projections
- authority target
- proof obligations
- rejected alternatives
- backpropagation record

### 8. Freeze Planning Projection

A `PROJ-*` can become planning baseline only through Adoption / Freeze Gate in the domain harness.

Never freeze exact API spelling in this skill. If exact surface changes, write an authority writeback request for the owner file.

### 9. Refresh Snapshot

When the user asks to see current API shape, update `docs/next/logix-api-planning/shape-snapshot.md`.

Snapshot rules:

- scenario-first
- short key snippets only
- every snippet cites proposal / projection / collision status
- multiple candidates can appear side by side
- no new authority statements

Also check `docs/next/logix-api-planning/surface-candidate-registry.md` before writing snippets. Snapshot text must not invent a candidate absent from the registry unless the snapshot explicitly labels it as exploratory and opens a registry follow-up.

### 10. Track Surface Candidates

Surface candidate tracking is mandatory whenever a proposal, collision, proof wave, or principle changes the apparent public API shape.

The registry must record:

- candidate id
- public concept or concept family
- covered `CAP-* / SC-*`
- owning `PROJ-*`
- source proposals / collisions / proof ledgers
- public surface delta
- generator verdict
- proof state
- authority target
- status: `candidate`, `under-review`, `frozen`, `rejected`, `authority-linked`, `superseded`

Registry status does not freeze exact spelling. Exact surface still belongs to owner authority pages.

### 10A. Track Implementation Status

Implementation status tracking is mandatory whenever a frozen point, authority-linked candidate, implementation-ready conversion, task close, pressure follow-up, or direct implementation changes the practical state of a public API item.

Use `docs/next/logix-api-planning/api-implementation-gap-ledger.md` as the single control-plane ledger for:

- which frozen API items are already implemented
- which are implemented-with-gap
- which are planning-open
- which are deferred-authority
- which are theoretical blockers under the current shape

The ledger must record at least:

- api item
- authority status
- runtime status
- type status
- proof status
- gap kind
- current gap
- next route

Do not leave a newly frozen or newly landed API point without an implementation-state row. If a row already exists, update it instead of creating a parallel row.

### 11. Implementation Probe Lane

Use this lane when proof, collision closure, or global shape closure needs executable pressure before implementation-ready conversion.

Allowed probe properties:

- scoped to internal modules or tests
- tied to a `PF-* / VOB-*` gate
- has a review ledger
- records `probe-local` status
- states what it proves and what it does not prove
- records naming scope and whether names are scenario-specific, verification-only, or generalizable
- records cleanup trigger and degeneration path
- feeds back into proposal, collision, proof, surface registry, or skill feedback

Forbidden probe outcomes:

- public API addition
- exact surface freeze
- authority law promotion without explicit writeback
- second runtime truth
- second diagnostics or report truth
- compare truth admission without compare gate

Probe completion must choose one:

- `discard`: proof pressure failed or overfit
- `keep-probe-local`: useful internal evidence, no authority effect
- `promote-to-principle`: repeated boundary needs `PRIN-*`
- `promote-to-authority-request`: exact authority owner must decide
- `convert-to-implementation-task`: implementation-ready set may consume it

Probe artifact lifecycle must choose one state before a wave can close:

- `probe-local`: temporary verification code, safe to keep only while the proof gap is active
- `retained-harness`: kept as dedicated test harness for a named proof gate
- `generalized-internal`: renamed or moved into a reusable internal substrate after review
- `demoted-test-fixture`: moved out of production internals and kept only as test fixture
- `deleted`: removed after proof is consumed or superseded
- `promoted-authority-request`: ready for owner authority review, still not public until accepted

Probe lifecycle review is mandatory when:

- a probe file survives more than one wave
- a probe name contains scenario / witness / local packet language
- another proof wants to reuse the probe helper
- the probe starts influencing surface registry or implementation plan
- global closure is being evaluated

Lifecycle review must answer:

- keep, generalize, demote, or delete
- whether naming should be changed before reuse
- whether tests should remain as contract tests or move to fixtures
- which authority or harness owns the final form
- whether any production `src/**` name still leaks probe, witness, pressure, `CAP-PRESS`, or task vocabulary
- whether any formal test file name is still process-oriented after the proof has become a final contract
- whether matrix ids are preserved in comments, test metadata, or docs links without controlling the main file name

### 11A. Final Asset Hygiene Gate

Run this gate before closing any pressure wave, implementation probe, global closure check, or implementation-ready conversion that touched code or tests.

The gate enforces open-source readability:

- production code must use final runtime, domain, verification, or host semantics as names
- production `src/**` must not retain process-oriented names such as `Probe`, `Witness`, `Pressure`, `CAP-PRESS`, packet ids, or task ids unless a stable product concept with that name has authority approval
- formal test files must be named by behavior, boundary, contract, or guard
- test bodies may keep `covers: CAP-* / PF-* / SC-* / TASK-*` comments or metadata for traceability
- fixture-only or harness-only files must live under clear `fixtures`, `support`, or `harness` paths and record lifecycle plus cleanup trigger
- temporary probe names may remain only while a proof gap is active; after consumption they must be deleted, demoted to fixture, or renamed to a final behavior-first contract
- docs, proof commands, run-state, implementation gap ledger, and pressure packets must be updated when file names change

Allowed hygiene outcomes:

- `clean-final`: no process naming remains in code or formal test file names
- `fixture-isolated`: process naming remains only in fixture/support/harness files with lifecycle
- `renamed-final-contract`: consumed proof test was renamed to behavior-first contract naming
- `deleted-superseded`: temporary artifact was removed after proof consumption
- `blocked-by-authority`: final naming depends on an authority decision and the artifact stays quarantined

Do not close a wave as final if formal code or test names still read like iteration scaffolding without one of these outcomes.

### 12. Global API Shape Closure Gate

Run this gate before declaring that the current API shape covers the scenario matrix, or when all active rows look locally closed.

Closure requires:

- every `SC-*` in the scenario SSoT is `covered`, or explicitly deferred with owner and reopen bar
- every required `CAP-* / VOB-*` is covered by one owner lane, or explicitly excluded from the claimed shape
- every active `PROJ-*` is `baseline`, `rejected`, `deferred`, or has an owner and close predicate
- every open `COL-*` is closed, or deferred with owner, close predicate, and proof gate
- every required `PF-* / VOB-*` is `executable`, `planned-with-blocker`, or explicitly out of scope
- every adopted principle has backpropagation records
- every surface candidate is `frozen`, `rejected`, `authority-linked`, or `superseded`
- every frozen or authority-linked public API point has a current row in `docs/next/logix-api-planning/api-implementation-gap-ledger.md`
- every high-risk pressure slice has either a counter-shape rejection record or an explicit reason why counter-shape generation was impossible
- every no-public-change pressure decision has a status quo burden record
- final asset hygiene is clean, fixture-isolated, or explicitly blocked with owner and reopen bar
- authority writeback targets are known and either landed or queued
- `shape-snapshot.md` reflects the registry and cites status
- housekeeping has removed consumed or superseded control-plane noise

Failure of this gate does not block local work. It defines the next work item.

### 13. Convert To Implementation Plan

Only `implementation-ready` proposal sets can become an implementation plan.

Readiness gate:

- all claimed scenarios map to covered caps
- open collisions have owner and close predicate
- required principles are adopted or rejected
- required proofs are executable, planned with blocker, or out of scope
- authority writeback targets are known
- single adoption freeze record exists
- surface candidates affected by the set are frozen, rejected, authority-linked, or explicitly scoped out
- probe-local evidence consumed by the plan has a promotion or discard decision
- implementation gap ledger rows touched by the set are updated
- pressure decisions consumed by the plan include counter-shape rejection and status quo burden records
- final asset hygiene has no unowned process-name leaks in production code or formal test file names

### 14. Feed Skill Learnings Back

When a sub-agent discovers a reusable boundary, principle, prompt gap, recurring failure mode, or missing template field, collect it as a Skill Feedback Packet. Sub-agents must not edit this skill directly.

The main agent can promote feedback into:

- SSoT patch
- skill patch
- template patch
- rejected feedback with reason

Promotion requires evidence from at least one proposal, collision, proof failure, or review ledger. If the feedback only describes a one-off preference, keep it out of the skill.

Skill changes use champion / challenger evolution. The current skill is champion. A proposed patch is challenger. Keep the champion unless the challenger passes the immutable judge core and improves at least one scored axis without weakening P0 clarity, public-surface containment, or concept-count control.

Read `references/evolution.md` and `references/fitness.md` before applying non-trivial skill feedback.

## Agent Proposal Delta Contract

Every sub-agent proposal must include:

- `claimed_caps`
- `excluded_caps`
- `scenario_coverage`
- `projection_delta`
- `enabler_delta`
- `collision_delta`
- `proof_delta`
- `status_delta`
- `boundary_impact`
- `authority_touchpoints`
- `dominance_delta`
- `generator_efficiency`
- `assumptions`
- `non_claims`
- `rejected_alternatives`
- `adoption_request`
- `surface_candidate_delta`
- `implementation_gap_delta`
- `implementation_probe_delta`
- `probe_artifact_lifecycle_delta`
- `pressure_delta`
- `counter_shape_delta`
- `status_quo_burden_delta`
- `dual_audience_pressure_delta`
- `human_status_quo_burden_delta`
- `taste_rubric_delta`
- `overfit_underfit_delta`
- `decision_latch_delta`
- `final_asset_hygiene_delta`
- `process_name_leak_delta`
- `fixture_boundary_delta`
- `global_closure_delta`
- `residual_risks`
- `skill_feedback`

Reject outputs missing these fields, or return them for normalization before synthesis. For non-pressure work, the pressure-specific fields may be `not-applicable` with a reason. For pressure work, they must be substantive.

## Skill Feedback Packet

Reusable insights discovered during proposal or collision work should be returned in this shape:

- `feedback_id`
- `source_context`
- `observed_gap`
- `proposed_skill_change`
- `affected_files`
- `evidence`
- `reuse_scope`
- `risk_if_added`
- `risk_if_ignored`
- `recommended_status`

Allowed `recommended_status` values:

- `candidate`
- `promote-to-skill`
- `promote-to-ssot`
- `promote-to-template`
- `reject`

Only the main agent may apply promoted feedback. Apply it with `apply_patch`, then run the static checks listed below.

Record accepted and rejected feedback in `feedback/ledger.md`. Periodically compress repeated lessons into `feedback/active-learnings.md`; active learnings guide future edits but do not override the immutable judge core.

## Decision Policy

Apply `docs/ssot/capability/02-api-projection-decision-policy.md` in this order:

1. P0 hard laws
2. `concept-count`
3. `public-surface`
4. generator efficiency
5. `proof-strength`
6. `future-headroom`
7. first-read clarity
8. agent generation stability
9. spelling taste

For human-facing or taste pressure, also read `references/taste.md`. Taste can decide between otherwise viable options, expose underfit friction, and create docs / diagnostics / authority follow-ups. It must not outrank P0 laws, concept count, public surface, Agent-first generation stability, or proof obligations.

Domain-local baselines, including Form companion-like baselines, do not become P0 automatically. They can only become hard law through principle promotion.

## Common Mistakes

| mistake | correction |
| --- | --- |
| giving every sub-agent the full matrix | prepare a Slice Manifest |
| freezing exact API in a proposal | use `PROJ-*` and authority writeback |
| treating a domain baseline as P0 | promote only owner / truth / evidence / verification principles |
| adding one API per capability | search for a minimal generator first |
| treating a probe as authority | keep probe-local until promotion or authority writeback |
| keeping probe code without lifecycle | record keep / generalize / demote / delete decision |
| letting scenario names become final internals | run probe naming review before reuse |
| leaving final code or formal test files named after planning packets | run Final Asset Hygiene Gate and rename to behavior-first contract / boundary / guard naming |
| deleting planning ids from tests entirely | keep ids in comments, metadata, or docs links for traceability while keeping file names clean |
| treating pressure as status quo regression testing | run Adversarial Pressure Mode with capability bundle, counter-shapes, and status quo burden |
| accepting no public change without proof burden | require combined-witness readability, no hidden second truth, and executable proof or probe plan |
| using taste as a shortcut to add a nicer noun | run `references/taste.md`, overfit / underfit guard, human status quo burden, and concept admission gate |
| using Agent-first to ignore repeated human confusion | record human status quo burden or open docs, diagnostics, `COL-*`, or authority follow-up |
| reopening taste disputes with the same argument | use decision latch and require new evidence before reopening |
| adding a new concept after one awkward case | require concept admission gate and counter-shape comparison |
| using shape snapshot as mechanical registry | update surface candidate registry first |
| freezing or landing API points without implementation-state writeback | update api implementation gap ledger in the same wave |
| declaring coverage without global closure | run the Global API Shape Closure Gate |
| leaving collision open without close predicate | add close predicate and required proof |
| hiding uncovered caps | put them in `excluded_caps` or `residual_risks` |
| refreshing code examples without proposal source | cite proposal / projection / collision status |
| letting the main agent draft proposal content while sub-agent execution is available | keep the main agent on coordination and synthesize returned deltas |
| sub-agent discovers a reusable rule and edits skill directly | return a Skill Feedback Packet for main-agent promotion |

## Skill Patch Checks

After changing this skill or its references:

- run `rg` for forbidden wording in the touched files
- run `git diff --check`
- run `jq empty .codex/skills/logix-capability-planning-loop/evals/evals.json`
- update `references/templates.md` if the required packet shape changes
- update `references/taste.md` if human-facing pressure or taste rubric changes
- update related SSoT if the change affects workflow authority
- update `docs/next/logix-api-planning/surface-candidate-registry.md` if surface candidate state changes
- update `docs/next/logix-api-planning/api-implementation-gap-ledger.md` if implementation/proof/type status of a frozen API point changes
- update `feedback/ledger.md` for accepted or rejected feedback
- update `feedback/active-learnings.md` only when the same lesson recurs or affects future skill use
- update planning workspace files if a wave close changes active state or archive status

## References

- `references/workflow.md`
- `references/templates.md`
- `references/evolution.md`
- `references/fitness.md`
- `references/taste.md`
- `feedback/ledger.md`
- `feedback/active-learnings.md`
- `evals/evals.json`
