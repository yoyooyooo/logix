# 171 Agent Live Runtime Bridge Batch 1 Plan Optimality Loop

## Meta

- `target`: `specs/171-agent-live-runtime-bridge`
- `targets`:
  - `specs/171-agent-live-runtime-bridge/spec.md`
  - `specs/171-agent-live-runtime-bridge/discussion.md`
  - `docs/ssot/runtime/09-verification-control-plane.md`
  - `docs/ssot/runtime/14-dvtools-internal-workbench.md`
  - `docs/ssot/runtime/15-cli-agent-first-control-plane.md`
  - `docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md`
- `source_kind`: `file-spec`
- `reviewers`: `A1`, `A2`, `A3`, `A4`
- `round_count`: 1
- `challenge_scope`: `open`
- `consensus_status`: `adopted-with-residual`

## Bootstrap

- `target_complete`: true
- `alignment_gate`:
  - `policy`: `auto`
  - `status`: `inferred`
  - `resolved_points`: user requested `$plan-optimality-loop` style polishing for 171, with grouped review material and subagent challenge.
  - `open_questions`: none
  - `confirmation_basis`: user explicitly asked whether `$plan-optimality-loop` should be used and provided the skill contract.
- `review_contract`:
  - `artifact_kind`: `ssot-contract`
  - `review_goal`: `design-closure`
  - `target_claim`: Logix should establish an Agent-first live runtime bridge; CLI live is evaluated, DVTools consumes Workbench evidence, reflection keeps static facts, live evidence carries runtime facts, and all authority returns to canonical evidence plus verification control plane.
  - `target_refs`: see `targets`
  - `non_default_overrides`:
    - `scope_fence`: challenge CLI live lane, owner law, DevTools disposition, reflection/live split, and researchability readiness; do not start implementation.
    - `stop_condition`: `user-checkpoint`
    - `write_policy`: reviewers read-only; main agent writes merged artifacts and ledger.
- `review_object_manifest`:
  - `source_inputs`: user conversation, `spec.md`, `discussion.md`
  - `materialized_targets`: `spec.md`, `discussion.md`
  - `authority_target`: `spec.md`
  - `bound_docs`: `09`, `14`, `15`, `16`
  - `derived_scope`: Batch 1 North Star And Owner Law
  - `allowed_classes`: target function, owner law, public surface, evidence authority, concept set, deferred boundaries
  - `blocker_classes`: second report truth, second evidence envelope, stale CLI owner law conflict, unconditional public command expansion, researchability as adoption authority
  - `ledger_target`: this file
- `reviewer_set`: `A1`, `A2`, `A3`, `A4`
- `kernel_council`: `Ramanujan`, `Kolmogorov`, `Godel`
- `dominance_axes`: `concept-count`, `public-surface`, `compat-budget`, `migration-cost`, `proof-strength`, `future-headroom`
- `stop_rule`: pass Ramanujan, Kolmogorov, and Godel gates before adoption.
- `reopen_bar`: a later proposal must strictly improve at least one dominance axis without creating a second authority or growing the public surface unproved.
- `ledger_path`: `docs/review-plan/runs/2026-05-01-171-agent-live-runtime-bridge-batch-1.md`
- `writable`: true

## Assumptions

- `A-001`: Unconditional public CLI live lane should be the Batch 1 baseline.
  - `status`: `overturned`
  - `resolution_basis`: all reviewers found conflict with current `15` public command law.
- `A-002`: Researchability readiness should enter `171` as metric baseline, decision trace, and candidate-comparison vocabulary.
  - `status`: `overturned`
  - `resolution_basis`: reviewers found second-evaluation-system pressure; Batch 7 later narrows `171` to researchability evidence header only.
- `A-003`: DVTools should be described as viewer-only or broadly demoted.
  - `status`: `overturned`
  - `resolution_basis`: reviewers preserved repo-internal Workbench host, capture, viewer, and explainer duties.
- `A-004`: `RuntimeAgentPort` can be frozen in Batch 1.
  - `status`: `deferred`
  - `resolution_basis`: Batch 1 freezes core-owned runtime attachment semantics; names and DTOs move to Batch 3.
- `A-005`: Canonical evidence may have owner-approved artifact side exits.
  - `status`: `overturned`
  - `resolution_basis`: reviewers identified second evidence authority risk.

## Rounds

### Round 1 Challenge

Findings:

- `F-001`
  - `severity`: `blocker`
  - `class`: `invalidity`
  - `summary`: Unconditional CLI live lane conflicts with `15` current public command law.
  - `evidence`: `15` freezes `check / trial / compare`; prior `171` baseline proposed first-class CLI live lane.
  - `status`: `closed`
- `F-002`
  - `severity`: `high`
  - `class`: `controversy`
  - `summary`: Batch 1 target function was too wide.
  - `evidence`: live bridge, CLI, DevTools, reflection, and researchability were all promoted together.
  - `status`: `closed`
- `F-003`
  - `severity`: `high`
  - `class`: `invalidity`
  - `summary`: `owner-approved evidence artifact` created an evidence authority escape hatch.
  - `evidence`: canonical evidence is the owner path in `09` and `14`.
  - `status`: `closed`
- `F-004`
  - `severity`: `high`
  - `class`: `controversy`
  - `summary`: Primary concepts exceeded the five-concept mental model.
  - `evidence`: prior discussion had seven concepts and spec had eleven entities.
  - `status`: `closed`
- `F-005`
  - `severity`: `medium`
  - `class`: `ambiguity`
  - `summary`: Reflection/live split lacked digest connection law for active operations.
  - `evidence`: stale manifest and validator unavailable were only edge cases.
  - `status`: `closed`
- `F-006`
  - `severity`: `medium`
  - `class`: `controversy`
  - `summary`: DVTools demotion risked deleting Workbench host/capture duties.
  - `evidence`: `14` preserves repo-internal inspection, report explainer, and debug drilldown.
  - `status`: `closed`

Counter proposals:

- `CP-001`
  - `summary`: `C171-E Core Live Bridge First, Conditional CLI Live`
  - `why_better`: preserves live bridge goal while avoiding immediate CLI public-surface conflict and evidence side exits.
  - `overturns_assumptions`: `A-001`, `A-002`, `A-003`, `A-004`, `A-005`
  - `resolves_findings`: `F-001` to `F-006`
  - `supersedes_proposals`: `C171-B`
  - `dominance`: `dominates`
  - `axis_scores`:
    - `concept-count`: better
    - `public-surface`: better
    - `compat-budget`: same
    - `migration-cost`: better
    - `proof-strength`: better
    - `future-headroom`: same
  - `status`: `adopted`

Resolution delta:

- `spec.md` now adopts C171-E.
- Public CLI live is conditional on `15` rewrite and dogfood proof.
- Canonical evidence envelope is the only export authority.
- Batch 1 concepts are reduced to five.
- Researchability is reduced to header metadata by later Batch 7 refinement.
- DVTools keeps Workbench host/capture/viewer/explainer duties.
- Reflection/live split gains digest and evidence-gap connection law.

## Adoption

- `adopted_candidate`: `C171-E Core Live Bridge First, Conditional CLI Live`
- `lineage`: synthesized from A1, A2, A3, and A4 round 1 reviews.
- `rejected_alternatives`:
  - `C171-B Unconditional CLI With Separate live Lane`
  - `full researchability/adoption vocabulary inside 171`
  - `DVTools viewer-only demotion`
  - `owner-approved evidence artifact side exit`
- `rejection_reason`: each rejected alternative failed at least one of public-surface, concept-count, or Godel authority gates.
- `dominance_verdict`: C171-E dominates C171-B on concept-count, public-surface, migration-cost, and proof-strength while keeping comparable future-headroom.

## Freeze Record

- `adopted_summary`: 171 first owns the core live bridge substrate, canonical evidence export, Workbench projection, runtime attachment owner law, and digest-connected reflection/live split. Public CLI live commands are a later conditional route.
- `kernel_verdict`: passes Ramanujan by reducing concepts and assumptions; passes Kolmogorov by cutting public CLI live and researchability vocabulary from Batch 1; passes Godel by removing second evidence authority and CLI surface conflict.
- `frozen_decisions`:
  - core live bridge first
  - public CLI live conditional
  - canonical evidence envelope single exit
  - five Batch 1 primary concepts
  - DVTools repo-internal Workbench host/capture/viewer/explainer
  - reflection/live digest and evidence-gap connection law
  - researchability header metadata only after Batch 7 refinement
- `non_goals`:
  - public CLI live command family freeze
  - metric baseline taxonomy
  - candidate comparison and adoption loop
  - `RuntimeAgentPort` exact DTO/name
  - browser hook naming
- `allowed_reopen_surface`:
  - Batch 2 may propose public CLI live commands only with `15` rewrite proof and dogfood evidence.
  - Batch 3 may rename or reshape runtime attachment contract.
  - Batch 4 may refine static/live field split.
  - Batch 7 may decide future researchability spec boundaries.
- `proof_obligations`:
  - dogfood live route must show discover, target, controlled operation, capture, export, and verification closure.
  - exported evidence must use canonical envelope and `artifacts[].outputKey` refs.
  - stale manifest or missing validator must produce denial evidence or evidence gap.
  - disabled bridge overhead must be measured before implementation closure.
- `delta_from_previous_round`: C171-B replaced by C171-E; public CLI live, researchability metric vocabulary, and evidence side exits removed from Batch 1 authority.

## Consensus

- `status`: `adopted-with-residual`
- `unresolved_findings`: none for Batch 1 after rewrite.
- `residual_risk`:
  - Batch 2 still needs to decide whether public CLI live commands are worth the surface cost.
  - Batch 3 still needs to decide attachment name, DTO, and adapter shape.
  - Batch 4 still needs detailed reflection/live field split.
  - Follow-up planning still needs to decide whether researchability deserves a separate spec.
