# Logix Capability Planning Loop Workflow

## Purpose

This reference expands the skill workflow for future agents. It keeps proposal planning, portfolio management, principle promotion, and implementation readiness in one controlled loop.

## Source Hierarchy

| layer | files | role |
| --- | --- | --- |
| global harness | `docs/ssot/capability/01-planning-harness.md` | cross-domain workflow and kernel |
| decision policy | `docs/ssot/capability/02-api-projection-decision-policy.md` | priority stack for API projection |
| domain scenario | domain `06` or equivalent | scenario source |
| domain planning | domain `08` or equivalent | domain capability decomposition |
| run state | `docs/next/logix-api-planning/run-state.md` | current cursor for resume |
| portfolio | `docs/next/logix-api-planning/proposal-portfolio.md` | active proposal control plane |
| proposal workspace | `docs/proposals/logix-api/README.md` | proposal file directory |
| snapshot | `docs/next/logix-api-planning/shape-snapshot.md` | human-readable current API view |
| surface registry | `docs/next/logix-api-planning/surface-candidate-registry.md` | mechanical public concept candidate ledger |
| implementation gap ledger | `docs/next/logix-api-planning/api-implementation-gap-ledger.md` | frozen API items vs runtime/type/proof implementation status |
| housekeeping | `docs/next/logix-api-planning/housekeeping.md` | lifecycle, budgets, archive triggers |
| taste pressure | `references/taste.md` | human first-read, adoption friction, and API taste rubric |
| authority | `05 / 09 / 13 / runtime/* / specs/*` | exact API and runtime authority |

## Default Execution Topology

Entering this workflow activates `multi-agent` mode by default.

- main agent: coordinator and control-plane writer
- planning sub-agent: produces the first artifact delta for one slice
- review sub-agent: challenges the returned delta and produces review findings
- probe sub-agent: optional lane for proof or implementation-pressure checks

The main agent chooses the slice, prepares the Slice Manifest, routes packets, synthesizes results, updates control-plane docs, and decides the next cursor. The main agent should stay out of direct planning-argument authoring when sub-agent execution is available.

## Sub-workflow Reuse

`plan-optimality-loop` is a review sub-workflow, not the top-level owner.

Reuse it when the review lane needs structured reviewer convergence or adversarial comparison.

Allowed reuse points:

- proposal review
- cross-proposal collision review
- principle promotion review
- harness or skill evolution review
- implementation-ready plan review

## Loop

### Default Main Flow

If the user invokes the skill without extra task detail, run:

1. Load source hierarchy.
2. Inspect run state.
3. Inspect proposal portfolio.
4. Inspect surface candidate registry.
5. Check paused / deferred authority-intake guard.
6. Select one next work item by priority.
7. Build Slice Manifest.
8. Dispatch a planning sub-agent for one artifact delta.
9. Dispatch a review sub-agent for the returned draft.
10. Dispatch a probe sub-agent only if proof or collision closure needs executable evidence.
11. Synthesize one planning delta.
12. Update control document.
13. Update run state.
14. Apply housekeeping if the wave paused or closed.
15. Report next action.

Paused guard:

- if `run-state.md` has `active_phase=paused` and the only remaining queue item is deferred authority-intake, generic continue must not start it
- allowed next work is housekeeping, stale snapshot refresh, skill feedback processing, or staying paused
- deferred authority-intake starts only when the user explicitly requests that authority intake or productization

Priority order:

0. paused guard handling
1. open collision with owner and proof gate
2. uncovered or weakly proven capability for high-pressure scenario
3. surface candidate with high cap coverage and weak proof / authority state
4. projection with generator-efficiency upside
5. stale shape snapshot
6. global closure check when local rows appear closed
7. skill feedback candidate

This default flow stays in planning mode.

## Adversarial Pressure Mode

Use this mode for `CAP-PRESS-*`, risk-lane refreshes, global frozen-shape challenges, or any no-public-change claim under high-risk capability pressure.

The purpose is to challenge the frozen shape rather than only validate it. A pressure packet is incomplete if it says the current API still works but does not produce plausible alternate directions and reject them through the decision policy.

Required pressure shape:

- `capability_bundle`: at least three interacting `CAP-* / VOB-*` when relevant material exists
- `cross_pressure_axes`: at least two owner or truth lanes, such as source, submit, row, selector, evidence, verification, report, or host
- `current_shape_under_attack`: the exact frozen public surface or internal law being challenged
- `forced_counter_shapes`: at least two plausible alternate API directions for A-grade or high-risk pressure
- `status_quo_burden`: proof that no public change remains readable, generatable, internally honest, and testable
- `implementation_friction_probe`: executable probe plan when document reasoning cannot decide
- `concept_admission_gate`: fixed criteria for accepting any new public concept

Counter-shape lane:

- treat frozen shape as one candidate
- generate alternate shapes even if the likely final answer is no change
- describe public surface delta, owner/truth placement, first-read impact, generator impact, implementation sketch, proof cost, and rejection or adoption reason
- record rejected counter-shapes so repeated rejected reasons can become `PRIN-*`

Status quo burden:

- combined witness authoring must remain understandable
- agent generation path must stay stable
- internal implementation must avoid hidden second truth, second report object, second evidence envelope, and second read route
- proof must cover combined interactions, not isolated happy paths
- probe-local names and helpers must pass lifecycle review before reuse
- consumed proof assets must pass final asset hygiene before they are treated as final code or formal test contracts

New public concept admission requires at least one of:

- frozen shape cannot express a claimed scenario or required capability bundle
- frozen shape can express it only with materially worse first-read clarity or agent generation stability
- internal support would require a hidden second truth or persistent special substrate
- the gap recurs across multiple pressure slices or collisions
- the new concept replaces multiple local patches and lowers total concept count or public surface

Pressure review must attack both the no-change proof and every counter-shape. If both sides depend on undocumented implementation assumptions, route to Implementation Probe Lane.

## Dual-Audience And Taste Pressure

Use this lane when capability coverage appears closed but the user asks about human acceptance, first-read resistance, teaching burden, or API taste.

Read `references/taste.md` before drafting the pressure packet.

Required additions:

- separate `agent_cost`, `human_cost`, and `taste_cost`
- record the Agent-first versus human-acceptance conflict
- apply the tie-breaker from the taste reference
- score frozen shape and counter-shapes on taste rubric axes
- run overfit / underfit guard before changing public shape
- if no public change is accepted, write a human status quo burden
- close with a decision latch so the same taste argument does not reopen without new evidence

Allowed outputs:

- `no-change-human-burden-met`
- `docs-or-example-task`
- `diagnostic-task`
- `implementation-friction-probe`
- `counter-shape-rejected`
- `COL-*`
- `PRIN-*`
- `authority-writeback`
- `reopen-frozen-shape`

Taste can expose underfit friction or decide between otherwise viable shapes. It cannot bypass P0 laws, concept-count, public-surface containment, Agent-first stability, proof obligations, concept admission, or authority ownership.

## Full Loop

1. Select `SC-* / CAP-*` slice.
2. Build Slice Manifest.
3. Draft proposal from template.
4. Run proposal review.
5. Admit reviewed proposal to portfolio.
6. Run collision review for overlapping proposals.
7. Promote repeated collision into `PRIN-*` when needed.
8. Backpropagate adopted principle into domain harness and authority targets.
9. Freeze planning projection only after adoption gate.
10. Update surface candidate registry for every public concept candidate.
11. Update implementation gap ledger for every frozen / authority-linked API item whose runtime, type, or proof status changed.
12. Refresh shape snapshot from registry state.
13. Run Implementation Probe Lane only when a proof gate needs executable pressure.
14. Run Final Asset Hygiene Gate before closing proof code, pressure waves, or implementation-ready conversion.
15. Run Global API Shape Closure Gate before claiming total API shape readiness.
16. Collect reusable skill feedback.
17. Promote accepted feedback into SSoT, skill, or templates.
18. Update run state.
19. Apply housekeeping.
20. Convert implementation-ready set into spec / plan.

## Surface Candidate Registry

`shape-snapshot.md` is for human reading. It cannot serve as the mechanical ledger for public concept convergence.

Use `docs/next/logix-api-planning/surface-candidate-registry.md` whenever a proposal, collision, proof wave, or principle changes the apparent public API shape.

Required registry fields:

- candidate id
- public concept or concept family
- owning projection
- covered scenarios and caps
- source proposals, collisions, and proof ledgers
- public surface delta
- generator verdict
- proof state
- authority target
- status

Allowed statuses:

- `candidate`
- `under-review`
- `frozen`
- `rejected`
- `authority-linked`
- `superseded`

Registry state can drive snapshot text, portfolio decisions, global closure, and implementation plan conversion. Registry state cannot freeze exact API spelling.

## API Implementation Gap Ledger

`api-implementation-gap-ledger.md` is the single control-plane ledger for implementation state after public shape freeze.

Use it whenever:

- an authority writeback freezes or clarifies a public API point
- a task or pressure follow-up lands implementation
- a type-safety implementation closes or reopens a gap
- a proof closure changes whether an API item is still partial
- an implementation-ready conversion consumes or reroutes a residual

Minimum row fields:

- api item
- authority status
- runtime status
- type status
- proof status
- gap kind
- current gap
- next route

The ledger must not become a second authority page. It only answers “implemented yet or not, and what gap remains”.

## Implementation Probe Lane

Use this lane when a proof or collision cannot be honestly judged from documents alone.

Probe rules:

- probe must be tied to a `PF-* / VOB-*`
- probe must stay internal and minimal
- probe must have tests or an explicit blocker
- probe ledger must state what it proves and what it leaves open
- probe status starts as `probe-local`
- probe completion must produce `discard`, `keep-probe-local`, `promote-to-principle`, `promote-to-authority-request`, or `convert-to-implementation-task`
- probe artifact lifecycle must be recorded before the wave closes

Probe output must update at least one control object:

- proof harness
- proposal portfolio
- surface candidate registry
- collision ledger
- skill feedback ledger

## Probe Artifact Lifecycle

Temporary verification code can be useful. It must not silently become final implementation vocabulary.

Allowed lifecycle states:

- `probe-local`
- `retained-harness`
- `generalized-internal`
- `demoted-test-fixture`
- `deleted`
- `promoted-authority-request`

Run lifecycle review when:

- a probe file survives more than one planning wave
- a probe name is scenario-specific, witness-specific, or packet-specific
- another proof wants to reuse the helper
- a probe affects the surface candidate registry
- global closure is being evaluated

Lifecycle review must decide:

- whether to keep, generalize, demote, or delete the artifact
- whether the artifact name remains acceptable
- whether the artifact belongs in production internals or test fixtures
- which SSoT or authority owns the eventual generalized form
- what tests must remain after demotion or deletion

If a probe is generalized, update the ledger that consumed it and record the old name as superseded. If a probe is deleted or demoted, keep the proof ledger and tests that preserve the learning.

## Final Asset Hygiene Gate

Run this gate when pressure, probe, global closure, or implementation-ready work touched production code or tests.

The goal is clean open-source readability while preserving planning traceability.

Checks:

- production `src/**` names use final runtime, domain, verification, or host semantics
- production names do not retain `Probe`, `Witness`, `Pressure`, `CAP-PRESS`, packet ids, or task ids unless authority has accepted that exact concept
- formal test file names are behavior-first, boundary-first, contract-first, or guard-first
- matrix ids stay available through test comments, metadata, `describe` notes, or docs links
- fixture-only artifacts live under `fixtures`, `support`, or `harness`
- fixture-only artifacts record lifecycle state, cleanup trigger, and public-surface non-claim
- consumed probe tests are renamed, demoted, or deleted before a wave closes as final
- docs, proof commands, run-state, and implementation gap ledger point to current paths after any rename

Allowed outcomes:

- `clean-final`
- `fixture-isolated`
- `renamed-final-contract`
- `deleted-superseded`
- `blocked-by-authority`

If the outcome is `blocked-by-authority`, record owner, reopen bar, and why a clean final name would create false authority.

## Global API Shape Closure Gate

Run this gate when local proposal rows look closed, when the user asks whether the current API shape is ready, or before converting a proposal set into broad implementation planning.

Closure requires:

- all claimed scenarios are covered or explicitly deferred
- all required caps and VOBs have owner lanes
- all active projections are baseline, rejected, deferred, or have close predicates
- all open collisions are closed or explicitly deferred
- all required proofs are executable, planned with blocker, or out of scope
- all surface candidates have terminal or authority-linked status
- all frozen or authority-linked public API points have current implementation-gap rows
- all high-risk pressure slices have counter-shape rejection records or explicit counter-shape impossibility reasons
- all no-public-change pressure decisions have status quo burden records
- final asset hygiene has a terminal or explicitly blocked outcome
- authority writeback targets are landed or queued
- adopted principles have backpropagation records
- shape snapshot is generated from current registry state
- housekeeping removed consumed or superseded control-plane noise

Failure becomes the next work item.

## Stop Conditions

Stop before implementation if:

- run state is paused and the only remaining item is deferred authority-intake without explicit productization request
- a proposal claims a scenario without capability coverage
- a proposal touches exact surface without authority target
- a collision lacks close predicate
- a proof gate is missing for a claimed capability
- a proposal adds public API for one capability without generator efficiency proof
- a pressure packet validates only the frozen shape and skips counter-shapes
- a no-public-change pressure decision lacks status quo burden
- a counter-shape is accepted without concept admission gate
- a surface candidate has no owner projection or authority target
- a probe tries to promote itself without principle or authority writeback
- a probe artifact lacks lifecycle state
- scenario-specific probe naming is reused without naming review
- production code or formal test file names still expose process-oriented probe / witness / pressure vocabulary after proof consumption
- global closure is claimed while any registry row remains candidate or under-review
- a promoted principle lacks backpropagation plan
- a skill feedback item would turn a one-off local preference into global workflow rule
- reviewer loop still has blocker findings

## Ledger Discipline

- Each proposal review gets one `docs/review-plan/runs/*` ledger.
- Each portfolio adoption gets one freeze record.
- Principle promotion gets explicit backpropagation records.
- Surface candidate changes update the registry before snapshot prose.
- Probe ledgers keep probe-local evidence separate from authority law.
- Probe artifacts get lifecycle decisions before reuse or wave closure.
- Final asset hygiene keeps production code and formal test names behavior-first while preserving matrix ids in comments or docs links.
- Skill feedback promotion gets explicit evidence and accepted/rejected status.
- Shape snapshots never serve as ledger.
- Implementation gap ledger is updated in the same wave as any freeze, authority writeback, implementation-ready conversion, or implementation status change.
- Run state is updated before stopping any planning session.
- Housekeeping is run when a wave closes, pauses, or consumes artifacts.

## Recovery Protocol

When resuming after interruption:

1. Read `docs/next/logix-api-planning/run-state.md`.
2. Read the active portfolio row.
3. Read `docs/next/logix-api-planning/surface-candidate-registry.md`.
4. Read active proposal or collision file if present.
5. Read latest review ledger if present.
6. Rebuild Slice Manifest.
7. Continue one next action only.
8. Update run state before stopping.
9. Apply housekeeping if the recovered step consumes or supersedes artifacts.

## Skill Feedback Promotion

Sub-agents may discover reusable rules while reviewing proposals. Treat these as candidates, not instructions.

Promotion gate:

1. The feedback cites proposal, collision, proof failure, or review ledger evidence.
2. The feedback changes future behavior across more than one proposal or domain slice.
3. The feedback does not conflict with Coverage Kernel or Decision Policy.
4. The feedback has a clear landing target: SSoT, skill, template, or reject.
5. The main agent records accepted or rejected status.

Patch targets:

- SSoT-level rule: `docs/ssot/capability/*`
- Process instruction: `.codex/skills/logix-capability-planning-loop/SKILL.md`
- Packet shape: `.codex/skills/logix-capability-planning-loop/references/templates.md`
- Active queue: `docs/next/logix-api-planning/proposal-portfolio.md`

## Implementation Plan Conversion

When converting to implementation:

- Use only `implementation-ready` proposal sets.
- Check Global API Shape Closure Gate for the affected scope.
- Check surface candidate registry for terminal or authority-linked status.
- Copy proof gates into validation plan.
- Copy authority writebacks into docs tasks.
- Copy open collisions into residual risk.
- Copy generator efficiency verdicts into the decision summary.
- Copy probe-local evidence only after a promotion, discard, or conversion decision.
- Keep proposal links in the implementation plan.
