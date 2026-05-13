# Playground Dogfood E2E Coverage Review Ledger

## Meta

- target: `docs/review-plan/proposals/2026-04-29-playground-dogfood-e2e-coverage.md`
- targets:
  - `docs/review-plan/proposals/2026-04-29-playground-dogfood-e2e-coverage.md`
  - `docs/superpowers/plans/2026-04-29-playground-dogfood-e2e-coverage.md`
  - `docs/ssot/runtime/17-playground-product-workbench.md`
  - `docs/review-plan/runs/2026-04-29-playground-runtime-reflection-gap.md`
  - `docs/superpowers/plans/2026-04-29-playground-runtime-evidence-refresh.md`
  - `examples/logix-react/src/playground/registry.ts`
  - `examples/logix-react/test/browser/playground-route-contract.playwright.ts`
- source_kind: `file-plan`
- reviewers:
  - A1 structure purity
  - A2 compression
  - A3 dominance alternatives
- round_count: 4
- reviewer_model: `gpt-5.5`
- reviewer_reasoning: `xhigh`
- challenge_scope: `open`
- consensus_status: `achieved`
- addendum_status: `render-isolation-integrated-after-consensus`

## Bootstrap

- target_complete: true
- alignment_gate:
  - policy: `auto`
  - status: `inferred`
  - resolved_points:
    - User explicitly requested `$plan-optimality-loop`.
    - User explicitly requested a proposal first, then optimality review, then `$writing-plans`.
    - User clarified `docs/superpowers/plans/2026-04-29-playground-runtime-evidence-refresh.md` is being handled in another session and must be assumed implemented.
    - This loop must not implement code.
  - open_questions: none
  - confirmation_basis: User said the runtime evidence implementation plan should be assumed complete and this session should plan and polish against that future state.
- review_contract:
  - artifact_kind: `implementation-plan`
  - review_goal: `implementation-ready`
  - target_claim: `Based on completed runtime evidence refresh, every examples/logix-react /playground/:id Demo must have registry-indexed Playwright dogfooding coverage proving visible affordances align with runtime reflection, ProjectSnapshot, operation events, Check/Trial reports, Trace, Snapshot projection, and React host render isolation.`
  - target_refs:
    - `docs/review-plan/proposals/2026-04-29-playground-dogfood-e2e-coverage.md`
    - `docs/ssot/runtime/17-playground-product-workbench.md`
    - `docs/review-plan/runs/2026-04-29-playground-runtime-reflection-gap.md`
    - `docs/superpowers/plans/2026-04-29-playground-runtime-evidence-refresh.md`
    - `examples/logix-react/src/playground/registry.ts`
    - `examples/logix-react/test/browser/playground-route-contract.playwright.ts`
  - non_default_overrides:
    - alignment_policy: `auto`
    - scope_fence: `Challenge E2E coverage strategy, proof matrix, case metadata, assertion granularity, verification gates, and docs writeback only. Do not reopen runtime-evidence-refresh implementation.`
    - stop_condition: `consensus`
    - write_policy: `Update proposal, ledger, implementation plan, and SSoT proof law only; do not implement test code.`
- review_object_manifest:
  - source_inputs:
    - User request and clarification.
    - Existing runtime evidence refresh ledger and plan as completed premise.
    - Initial proposal text.
    - A1/A2/A3 reviewer outputs.
  - materialized_targets:
    - `docs/review-plan/proposals/2026-04-29-playground-dogfood-e2e-coverage.md`
    - `docs/superpowers/plans/2026-04-29-playground-dogfood-e2e-coverage.md`
  - authority_target: `docs/review-plan/proposals/2026-04-29-playground-dogfood-e2e-coverage.md`
  - bound_docs:
    - `docs/ssot/runtime/17-playground-product-workbench.md`
    - `docs/review-plan/runs/2026-04-29-playground-runtime-reflection-gap.md`
    - `docs/superpowers/plans/2026-04-29-playground-runtime-evidence-refresh.md`
    - `docs/superpowers/plans/2026-04-29-playground-dogfood-e2e-coverage.md`
  - derived_scope:
    - registry coverage
    - route-level Playwright dogfooding
    - proof recipe metadata boundary
    - capability/facet proof packs
    - evidence coordinate oracle
    - pressure visual capacity separation
    - service source edit closure
    - kernel gap harvest
    - active boundary probes
    - React host render isolation
    - state ownership and subscription boundary
    - docs writeback boundary
  - allowed_classes:
    - task
    - dependency
    - verification backlog
    - docs writeback boundary
    - proof matrix compression
  - blocker_classes:
    - live task ambiguity
    - unbound dependency
    - unsealed verification gate
    - dual project metadata
    - weak evidence correlation
    - pressure mock/runtime authority confusion
    - silent fallback masking kernel gap
    - passive-only gap harvest
    - render isolation not proven
    - broad subscription masking owning region boundaries
  - ledger_target: `docs/review-plan/runs/2026-04-29-playground-dogfood-e2e-coverage.md`
- challenge_scope: `open`
- reviewer_set:
  - A1 structure purity
  - A2 compression
  - A3 dominance alternatives
- active_advisors: none
- activation_reason: `Baseline reviewers cover metadata purity, compression, and authority consistency.`
- max_reviewer_count: 3
- kernel_council:
  - Ramanujan
  - Kolmogorov
  - Godel
- dominance_axes:
  - concept-count
  - public-surface
  - compat-budget
  - migration-cost
  - proof-strength
  - future-headroom
- stop_rule:
  - Ramanujan gate: candidate must remove an assumption, public boundary, or duplicate contract.
  - Kolmogorov gate: concept-count, public-surface, and compat-budget must not worsen overall; if unchanged, proof-strength or future-headroom must strictly improve.
  - Godel gate: candidate must not introduce dual authority, dual workflow, dual contract, or unexplained contradiction.
- reopen_bar: `Reopen only if a candidate strictly dominates the adopted recipe/pack/coordinate structure without reopening runtime evidence refresh.`
- ledger_path: `docs/review-plan/runs/2026-04-29-playground-dogfood-e2e-coverage.md`
- writable: true

## Assumptions

- id: A1
  - summary: `A rich PlaygroundRouteProofCase can safely hold route, required files, tabs, regions, runtime checks, and visual checks.`
  - status: `overturned`
  - resolution_basis: `All reviewers found this creates second project metadata. Adopted recipe keeps only projectId, reportLabel, proofPackIds, and assertDemoProof.`
- id: A2
  - summary: `Registry-derived proof cases can derive proof intent from registry alone.`
  - status: `overturned`
  - resolution_basis: `Registry provides project set and metadata; proof intent is a minimal test recipe indexed by registry id.`
- id: A3
  - summary: `Visible text and project id/revision/digest partial matches are enough to prove evidence alignment.`
  - status: `overturned`
  - resolution_basis: `Adopted proposal requires assertEvidenceCoordinate across result/diagnostics/trace/snapshot.`
- id: A4
  - summary: `Pressure rows can represent runtime authority.`
  - status: `overturned`
  - resolution_basis: `Adopted proposal separates pressureVisualCapacity from runtimeEvidenceProbe.`
- id: A5
  - summary: `E2E body text sweep can be the main source-regex authority gate.`
  - status: `overturned`
  - resolution_basis: `Package-level product path sweep remains the main gate; E2E only provides route-level negative smoke and positive runtime manifest authority proof.`
- id: A6
  - summary: `SSoT should copy the route-by-route Demo matrix.`
  - status: `overturned`
  - resolution_basis: `SSoT only records dogfooding route proof law; executable matrix lives in test support.`
- id: A7
  - summary: `Dogfooding E2E only needs to prove happy-path visible/runtime alignment.`
  - status: `overturned`
  - resolution_basis: `User clarified Playground should be used to squeeze kernel boundaries and gaps. Proposal now adopts Kernel Gap Harvest Law and gapHarvest pack.`
- id: A8
  - summary: `Postcheck-only gapHarvest is enough to squeeze kernel boundaries and gaps.`
  - status: `overturned`
  - resolution_basis: `Targeted converge found passive gap classification insufficient. Proposal now adds Active Boundary Probe Contract with owner-specific triggers and existing failure faces.`
- id: A9
  - summary: `Runtime evidence coordinate coverage is sufficient for Playground dogfood proof.`
  - status: `overturned`
  - resolution_basis: `Post-consensus addendum found React host state ownership is also part of dogfooding. Proposal and plan now add renderIsolationProbe and React Host Render Isolation Law.`
- id: A10
  - summary: `Render fanout issues should be deferred to a separate UI optimization plan.`
  - status: `overturned`
  - resolution_basis: `The same Playground route proof must validate visible runtime authority and the host subscription boundary that makes the workbench a credible dogfood surface. Core selector API changes remain out of scope.`

## Round 1

### Phase

- challenge

### Input Residual

- Initial proposal used Option B with a relatively thick `PlaygroundRouteProofCase`.
- Reviewers were allowed to challenge E2E coverage strategy and proof matrix shape.

### Findings

- id: F1
  - severity: critical
  - class: invalidity
  - summary: `PlaygroundRouteProofCase duplicated project metadata and risked becoming a second authority.`
  - evidence: `Initial proposal included route, requiredFiles, expectedInitialTabs, requiredRegions, runtimeChecks, visualPressureChecks.`
  - status: adopted
- id: F2
  - severity: high
  - class: ambiguity
  - summary: `registry-derived wording was inaccurate because proof intent is not derivable from registry alone.`
  - evidence: `Initial proposal mixed registry-derived case generation with a hand-written test support map.`
  - status: adopted
- id: F3
  - severity: critical
  - class: invalidity
  - summary: `Visible assertions did not prove a single runtime evidence envelope.`
  - evidence: `Initial proposal allowed project id, revision, or source digest partial alignment and only required Trace event names.`
  - status: adopted
- id: F4
  - severity: high
  - class: invalidity
  - summary: `Runtime evidence public assertions were not faceted by optional capabilities.`
  - evidence: `drivers, scenarios and serviceFiles are optional project metadata, but initial public runtime assertions applied broad affordances.`
  - status: adopted
- id: F5
  - severity: high
  - class: invalidity
  - summary: `Pressure mock data and runtime authority were mixed.`
  - evidence: `trace-heavy and diagnostics-dense pressure rows were described as runtime operation or control-plane proof.`
  - status: adopted
- id: F6
  - severity: medium
  - class: ambiguity
  - summary: `Source-regex authority gate was too weak in E2E and duplicated package sweep.`
  - evidence: `Initial proposal used body text negative checks as proof of no fallback authority.`
  - status: adopted
- id: F7
  - severity: medium
  - class: ambiguity
  - summary: `Docs writeback could duplicate executable matrix in SSoT and verification notes.`
  - evidence: `Initial proposal required SSoT and verification note updates without limiting copied content.`
  - status: adopted
- id: F8
  - severity: high
  - class: ambiguity
  - summary: `Initial adopted candidate did not explicitly require Playground E2E to harvest kernel gaps instead of only testing happy path.`
  - evidence: `User clarified the Playground should be treated as a real dogfooding scenario that can squeeze out kernel boundaries or gaps.`
  - status: adopted

### Counter Proposals

- id: CP1
  - summary: `Keep Option B but shrink proof case fields.`
  - why_better: `Lower migration cost than a full proof pack split.`
  - overturns_assumptions:
    - A1
  - resolves_findings:
    - F1
  - supersedes_proposals: []
  - dominance: partial
  - axis_scores:
    - concept-count: `improves`
    - public-surface: `unchanged`
    - compat-budget: `unchanged`
    - migration-cost: `low`
    - proof-strength: `partial`
    - future-headroom: `partial`
  - status: rejected
- id: CP2
  - summary: `Capability proof packs with executable matrix as authority.`
  - why_better: `Compresses schema and removes docs/test duplicated matrix.`
  - overturns_assumptions:
    - A1
    - A2
    - A6
  - resolves_findings:
    - F1
    - F2
    - F4
    - F7
  - supersedes_proposals:
    - CP1
  - dominance: partial
  - axis_scores:
    - concept-count: `lower`
    - public-surface: `unchanged`
    - compat-budget: `unchanged`
    - migration-cost: `medium`
    - proof-strength: `higher`
    - future-headroom: `higher`
  - status: merged
- id: CP3
  - summary: `Registry-indexed recipes plus facet-derived packs plus evidence coordinate oracle plus kernel gap harvest and active boundary probes.`
  - why_better: `Combines metadata compression with a single machine-checkable runtime alignment predicate, no-silent-fallback gap harvesting, and active boundary probing.`
  - overturns_assumptions:
    - A1
    - A2
    - A3
    - A4
    - A5
    - A6
    - A7
    - A8
  - resolves_findings:
    - F1
    - F2
    - F3
    - F4
    - F5
    - F6
    - F7
    - F8
    - F9
  - supersedes_proposals:
    - CP1
    - CP2
  - dominance: dominates
  - axis_scores:
    - concept-count: `lower than Option B because route/files/tabs/regions/checks are derived`
    - public-surface: `unchanged`
    - compat-budget: `unchanged`
    - migration-cost: `medium`
    - proof-strength: `strictly higher through assertEvidenceCoordinate, gapHarvest owner classification, and active boundary probes`
    - future-headroom: `strictly higher through exact registry coverage and packs`
  - status: adopted

### Resolution Delta

- Rewrote proposal around adopted CP3.
- Replaced thick `PlaygroundRouteProofCase` with minimal `PlaygroundRouteProofRecipe`.
- Added all-route invariants, facet-derived packs and demo-specific recipes.
- Added evidence coordinate oracle.
- Split pressure visual capacity from runtime evidence probe.
- Added Kernel Gap Harvest Law and gapHarvest proof pack.
- Added Active Boundary Probe Contract and boundaryProbe pack.
- Narrowed source-regex gate and docs writeback.

## Adoption

- adopted_candidate: `CP3 registry-indexed recipes plus facet-derived proof packs plus evidence coordinate oracle plus kernel gap harvest and active boundary probes`
- lineage:
  - Initial Option B
  - A1/A2/A3 findings
  - CP2 capability packs
  - CP3 coordinate oracle merge
- rejected_alternatives:
  - `CP1 shrink thick cases only`
  - `Option C one spec per Demo`
- rejection_reason:
  - `CP1` leaves weak evidence correlation.
  - `Option C` duplicates common assertions and increases browser/server overhead.
- dominance_verdict: `CP3 dominates baseline on concept-count, proof-strength and future-headroom while keeping public-surface and compat-budget unchanged. The gap harvest and boundary probe extensions strictly improve proof-strength without adding public surface.`
- freeze_record:
  - adopted_summary: `Use minimal registry-indexed proof recipes, derive metadata from project declarations and fixtures, run capability/facet proof packs, assert all live operations through a single evidence coordinate oracle, harvest kernel gaps through existing evidence gap/control-plane/transport failure faces, and actively probe representative kernel boundaries.`
  - kernel_verdict:
    - Ramanujan: `Removes duplicate project metadata from proof cases.`
    - Kolmogorov: `Compresses repeated matrix rules into packs and executable recipes.`
    - Godel: `Avoids second registry authority, separates pressure mock rows from runtime evidence, forbids UI fallback from masking missing authority, and keeps ownerClass as test attribution rather than a new gap taxonomy.`
  - frozen_decisions:
    - Proof recipes may only contain `projectId`, `reportLabel`, `proofPackIds`, and optional `assertDemoProof`.
    - Route/files/capabilities/drivers/scenarios/serviceFiles/pressure metadata are derived.
    - `assertEvidenceCoordinate` is the single runtime alignment predicate.
    - Pressure rows prove visual capacity only.
    - `gapHarvest` runs as a pack/postcheck and must expose owner class for missing authority, unavailable capability, transport/compile/runtime failure, and projection gaps.
    - `boundaryProbe` actively triggers representative owner classes through existing UI or Playwright test harness and expects existing failure faces.
    - `renderIsolationProbe` is part of the same dogfood quality gate and checks region commit/remount fanout for local UI controls.
    - Render isolation restructuring must happen before evidence coordinate wiring so locators and owning regions are stable.
    - SSoT does not copy route-by-route matrix.
  - non_goals:
    - Do not reimplement runtime evidence refresh here.
    - Do not add public selector APIs or nested dirty evidence diagnostics in this plan.
    - Do not add production project metadata only for tests.
    - Do not add a second public test DSL.
    - Do not create a second gap taxonomy outside existing runtime evidence gap/control-plane/transport/projection categories.
    - Do not turn ownerClass into new runtime gap codes.
  - allowed_reopen_surface:
    - A stricter evidence coordinate shape if implementation exposes better stable fields.
    - Pack naming if implementation needs fewer names with same proof strength.
    - Owner class names if implementation exposes a stricter existing classification.
    - Boundary probe triggers if a more stable trigger covers the same owner class through the same existing failure face.
    - Render isolation thresholds if React StrictMode or async evidence creates bounded extra commits, as long as unrelated region remounts remain forbidden.
  - proof_obligations:
    - Exact registry coverage test.
    - Browser E2E route proof for all project ids.
    - Local-counter full runtime chain.
    - Service-source edit closure.
    - Pressure visual capacity plus runtimeEvidenceProbe separation.
    - Gap harvest postcheck on all routes with no silent fallback.
    - Active boundary probes covering all owner classes through existing failure faces.
    - Render isolation probes covering Inspector tab, bottom tab, file selection, Run/Check/Trial and Reset fanout on selected routes.
    - SSoT proof law and verification note writeback.
  - delta_from_previous_round: `All round 1 findings incorporated into proposal; user clarification added Kernel Gap Harvest Law; targeted converge added Active Boundary Probe Contract.`

## Round 2

### Phase

- converge

### Input Residual

- User clarified that Playground should be treated as a real dogfooding scenario that can squeeze out kernel boundaries or gaps.

### Findings

- id: F8
  - severity: high
  - class: ambiguity
  - summary: `Happy-path alignment was not enough; E2E must harvest kernel gaps and ensure no silent UI fallback.`
  - evidence: `User clarification during review.`
  - status: adopted
- id: F9
  - severity: high
  - class: ambiguity
  - summary: `Postcheck-only gapHarvest was still passive and did not require active boundary probes.`
  - evidence: `Targeted converge reviewer found conditional wording and postcheck-only flow insufficient for squeezing boundaries.`
  - status: adopted

### Counter Proposals

- id: CP4
  - summary: `Add Kernel Gap Harvest Law, gapHarvest proof pack, and Active Boundary Probe Contract without introducing a second gap taxonomy.`
  - why_better: `Preserves adopted recipe/pack/coordinate structure while making Playground an active boundary-finding dogfood surface.`
  - overturns_assumptions:
    - A7
    - A8
  - resolves_findings:
    - F8
    - F9
  - supersedes_proposals: []
  - dominance: dominates
  - axis_scores:
    - concept-count: `small increase, bounded to one proof pack, one law, and one boundary probe table`
    - public-surface: `unchanged`
    - compat-budget: `unchanged`
    - migration-cost: `low`
    - proof-strength: `strictly higher`
    - future-headroom: `higher`
  - status: adopted

### Resolution Delta

- Proposal now includes `Kernel Gap Harvest Law`.
- Added `gapHarvest` proof pack and `playground-gap-harvest.ts` planning hook.
- Added `Active Boundary Probe Contract` and `playground-boundary-probes.ts` planning hook.
- Acceptance criteria now require no silent fallback and owner class visibility for gaps.
- Acceptance criteria now require selected route probes covering all owner classes through existing failure faces.

## Round 3

### Phase

- converge

### Input Residual

- Targeted converge found that `gapHarvest` was still too passive and needed active boundary probes.

### Findings

- id: F9
  - severity: high
  - class: ambiguity
  - summary: `gapHarvest needed active boundary probes to squeeze kernel boundaries.`
  - evidence: `Targeted converge result.`
  - status: adopted

### Counter Proposals

- id: CP5
  - summary: `Add Active Boundary Probe Contract with owner-specific triggers and existing failure faces.`
  - why_better: `Turns gap harvest from passive postcheck into active dogfooding pressure without creating a new authority.`
  - overturns_assumptions:
    - A8
  - resolves_findings:
    - F9
  - supersedes_proposals: []
  - dominance: dominates
  - axis_scores:
    - concept-count: `small bounded increase`
    - public-surface: `unchanged`
    - compat-budget: `unchanged`
    - migration-cost: `low`
    - proof-strength: `strictly higher`
    - future-headroom: `higher`
  - status: adopted

### Resolution Delta

- Proposal now includes `Active Boundary Probe Contract`.
- Added boundaryProbe pack and `playground-boundary-probes.ts` planning hook.
- Boundary probes cover `reflection`, `runtime-run`, `runtime-dispatch`, `control-plane-check`, `control-plane-trial`, `transport`, `projection`, and `playground-product`.

## Round 4

### Phase

- converge

### Input Residual

- Final converge found that `runtime-dispatch` was named in owner classes but lacked an active boundary probe.

### Findings

- id: F10
  - severity: high
  - class: ambiguity
  - summary: `runtime-dispatch active boundary probe was missing.`
  - evidence: `Final targeted converge result.`
  - status: adopted

### Counter Proposals

- id: CP6
  - summary: `Add manifest-valid runtime dispatch failure probe.`
  - why_better: `Closes dispatch runtime boundary without confusing unknown actionTag validation with dispatch runtime failure.`
  - overturns_assumptions: []
  - resolves_findings:
    - F10
  - supersedes_proposals: []
  - dominance: dominates
  - axis_scores:
    - concept-count: `no new concept, one missing row`
    - public-surface: `unchanged`
    - compat-budget: `unchanged`
    - migration-cost: `low`
    - proof-strength: `higher`
    - future-headroom: `higher`
  - status: adopted

### Resolution Delta

- Proposal now includes `runtime-dispatch` active boundary probe.
- Test Plan and Acceptance Criteria now require manifest-valid runtime dispatch failure coverage.

## Consensus

- status: `achieved`
- unresolved_findings: []
- residual_risk:
  - Implementation may need small UI evidence attributes if current UI does not expose stable coordinate fields.
  - Implementation may discover real kernel gaps; these should be recorded in verification notes with owner, route, operation and follow-up proposal path.
  - Boundary probes must not invent new gap codes; ownerClass remains a test attribution layer only.
  - Final residual check closed F10 and found no second authority or taxonomy risk.
  - Render isolation probes can reveal broad subscription gaps in React host usage; this plan may restructure Playground component ownership, but public core selector APIs and nested dirty evidence remain follow-up design work.

## Implementation Plan Review

- plan_target: `docs/superpowers/plans/2026-04-29-playground-dogfood-e2e-coverage.md`
- status: `reviewed-after-proposal-consensus`
- plan_review_rounds:
  - round: `full-plan`
    status: `issues-found`
    resolved_in_plan: true
    findings:
      - `assertEvidenceCoordinate` needed strict result/diagnostics/trace/snapshot equality and Snapshot revision plus digest checks.
      - `runtimeEvidenceProbe` needed a lightweight operation plus coordinate-backed Diagnostics/Snapshot evidence.
      - Coordinate visibility needed explicit component/test/label mapping.
      - `gapHarvest` needed all-route owning-region authority/gap checks, not only no-silent-fallback.
      - Projection boundary probe needed to avoid introducing a new runtime gap code.
  - round: `gap-harvest-residual`
    status: `approved`
    resolved_in_plan: true
    findings:
      - `boundaryProbe` wiring must not overwrite the stronger `gapHarvest` branch from Task 6.
      - `assertAllRouteGapHarvest` must explicitly cover unavailable, transport, compile, runtime and projection owning regions.
  - round: `render-isolation-addendum`
    status: `integrated-without-reopening-consensus`
    resolved_in_plan: true
    findings:
      - `PlaygroundShell` currently owns too many display-state subscriptions and slot construction responsibilities.
      - Evidence coordinate proof does not prove React host state ownership or local render fanout.
      - `renderIsolationProbe` must be a separate proof pack, not a substitute for evidence coordinate assertions.
      - The implementation plan must insert render isolation and state ownership before coordinate oracle wiring.
      - Core improvements such as explicit selector APIs, nested dirty evidence, broad subscription diagnostics and render fanout runtime evidence must stay outside this dogfood E2E plan.

## Addendum: Render Isolation And State Ownership

### Phase

- post-consensus plan integration

### Input Residual

- A parallel analysis branch found that `packages/logix-playground` state ownership is too high in `PlaygroundShell.tsx`.
- Inspector tabs, evidence tabs, Run/Check/Trial/Reset and file-tree switching can re-render or remount unrelated regions because Shell subscribes broadly and creates layout slots.
- This overlaps with the dogfood E2E plan because both touch `WorkbenchBottomPanel`, `RuntimeInspector`, panel children and stable locator surfaces.

### Findings

- id: F11
  - severity: high
  - class: proof-gap
  - summary: `Runtime evidence coordinate proof does not cover React host render isolation.`
  - evidence: `Local UI controls can trigger Shell render and recreate multiple regions while all runtime evidence assertions still pass.`
  - status: adopted
- id: F12
  - severity: high
  - class: sequencing
  - summary: `Evidence coordinate attributes should be wired after owning region containers are stable.`
  - evidence: `Adding data-playground-evidence-coordinate before moving subscriptions risks duplicated locators and data flow churn.`
  - status: adopted
- id: F13
  - severity: medium
  - class: boundary
  - summary: `Core selector and nested dirty evidence improvements are real follow-ups but out of scope for this route E2E plan.`
  - evidence: `The current issue is mainly usage-layer subscription placement; public core API changes would violate the plan non-goal.`
  - status: adopted

### Counter Proposal

- id: CP7
  - summary: `Add renderIsolationProbe and a Render Isolation And State Ownership chunk before coordinate oracle wiring.`
  - why_better: `Keeps the dogfood route proof unified while separating runtime truth alignment from React host subscription boundary proof.`
  - overturns_assumptions:
    - A9
    - A10
  - resolves_findings:
    - F11
    - F12
    - F13
  - supersedes_proposals: []
  - dominance: dominates
  - axis_scores:
    - concept-count: `small bounded increase, one proof pack and one implementation chunk`
    - public-surface: `unchanged`
    - compat-budget: `unchanged`
    - migration-cost: `medium because PlaygroundShell and region containers are touched`
    - proof-strength: `strictly higher through region fanout/remount checks`
    - future-headroom: `higher because subscription ownership becomes testable`
  - status: adopted

### Resolution Delta

- Proposal now includes `React Host Render Isolation Law`.
- Proposal now adds `renderIsolationProbe` to proof packs and selected demo recipes.
- Implementation plan now treats render isolation as a structural prerequisite before coordinate oracle wiring.
- SSoT proof law now covers both runtime evidence alignment and React host render isolation.
- Core public selector API, nested dirty evidence, broad subscription diagnostics and runtime render fanout evidence remain follow-up design candidates outside this plan.
