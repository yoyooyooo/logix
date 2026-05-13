# 171 Agent Live Runtime Bridge Batch 5 Plan Optimality Loop

## Meta

- `target`: `specs/171-agent-live-runtime-bridge`
- `targets`:
  - `specs/171-agent-live-runtime-bridge/spec.md`
  - `specs/171-agent-live-runtime-bridge/discussion.md`
  - `specs/171-agent-live-runtime-bridge/plan.md`
  - `docs/ssot/runtime/14-dvtools-internal-workbench.md`
  - `docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md`
  - `specs/165-runtime-workbench-kernel/spec.md`
  - `specs/168-kernel-to-playground-verification-parity/spec.md`
- `source_kind`: `file-spec`
- `reviewers`: main agent synthesis plus parallel reviewer
- `round_count`: 1
- `challenge_scope`: `open`
- `consensus_status`: `consensus`

## Bootstrap

- `target_complete`: true
- `alignment_gate`:
  - `policy`: `auto`
  - `status`: `inferred`
  - `resolved_points`: user asked to continue until all remaining details are polished and materialized.
  - `open_questions`: none
  - `confirmation_basis`: Batch 5 scope and expected output are listed in `discussion.md`; Batch 1 to Batch 4 were already frozen before this batch.
- `review_contract`:
  - `artifact_kind`: `ssot-contract`
  - `review_goal`: `design-closure`
  - `target_claim`: DevTools and Playground must converge on the same Runtime Workbench projection law as the Agent live route without creating a product, panel, or Playground truth source.
  - `non_default_overrides`:
    - `scope_fence`: challenge DevTools retained slices, paused slices, Playground dogfood path, Workbench projection additions, host/capture/viewer/explainer boundaries, and no-second-truth proof.
    - `stop_condition`: `consensus`
    - `write_policy`: planning artifacts and SSoT docs may be updated; implementation code is out of scope.
- `review_object_manifest`:
  - `authority_target`: `specs/171-agent-live-runtime-bridge/spec.md`
  - `bound_docs`: `14`, `16`, `165`, `168`
  - `derived_scope`: Batch 5 DevTools, Playground, and Workbench convergence
  - `allowed_classes`: disposition table, dogfood path, Workbench projection host law, parity proof, negative cuts
  - `blocker_classes`: DevTools-owned session/finding/artifact truth, Playground-owned live facts, panel-only diagnostics, product scenario truth, raw timeline as first-class truth
  - `ledger_target`: this file
- `kernel_council`: `Ramanujan`, `Kolmogorov`, `Godel`
- `dominance_axes`: `concept-count`, `public-surface`, `compat-budget`, `migration-cost`, `proof-strength`, `future-headroom`
- `stop_rule`: adopted candidate must reduce host-private derivation and preserve one Workbench projection law.
- `reopen_bar`: a later proposal must improve proof strength without increasing public surface, adding a second projection truth, or making Playground/DVTools product state authoritative.

## Findings

- `F-B5-001`
  - `severity`: `high`
  - `summary`: DevTools retained capabilities were named broadly, but pause/keep/downshift disposition was not frozen.
  - `evidence`: `discussion.md` Batch 5 asked for a disposition table; `14` listed retained workbench duties and downshifted drilldowns without tying them to 171 dogfood proof.
  - `resolution`: adopt a disposition table. Keep Session Workbench, evidence import/export, report explainer, debug drilldowns, and Agent repair coordinates as Workbench consumers. Pause panel-only fact derivation, default raw timeline, default time travel, product redesign, and any operation controller not allowed by Batch 6.
  - `status`: `closed`
- `F-B5-002`
  - `severity`: `high`
  - `summary`: Playground dogfood could be mistaken for product scenario truth.
  - `evidence`: `168` already forbids fake diagnostics, while 171 needed a dogfood path through live discovery, controlled operation, evidence export, and verification closure.
  - `resolution`: freeze Playground as a dev-only dogfood host. It may submit adapter offers and source context, then consume canonical evidence facets through Workbench projection. Product scenario playback remains product output until core scenario evidence exists.
  - `status`: `closed`
- `F-B5-003`
  - `severity`: `medium`
  - `summary`: Workbench projection additions risked creating new concepts instead of reusing `truthInputs / contextRefs / selectionHints`.
  - `evidence`: `165` already owns the authority bundle split and live evidence addendum.
  - `resolution`: no new Workbench root concept. Batch 5 only adds conformance rules: live/imported parity, unsupported host fact gaps, and host role metadata as context/ref or selection hint.
  - `status`: `closed`

## Adoption

- `adopted_candidate`: `C171-I Shared Workbench Projection Hosts`
- `alias`: `Projection-Parity Consumer Convergence`
- `summary`: DVTools and Playground are repo-internal hosts over the same Workbench projection law. They can capture, view, explain, select, and dogfood live evidence, but they cannot define session, finding, artifact, operation, report, evidence, verdict, or runtime truth.
- `dominance_verdict`:
  - `concept-count`: better, because no DevTools/Playground projection model is added.
  - `public-surface`: same, because public surface remains zero.
  - `compat-budget`: same, because forward-only internal convergence needs no compatibility lane.
  - `migration-cost`: better, because private derivations are cut or demoted instead of bridged.
  - `proof-strength`: better, because one evidence package must project equivalently across Agent route, DVTools, and Playground.
  - `future-headroom`: better, because later UI or browser extension work can attach as host view state.

### Freeze Record

- DevTools keeps only repo-internal Workbench host, capture surface, viewer, explainer, evidence import/export, report explainer, debug drilldown, and Agent repair coordinate duties.
- DevTools pauses or cuts panel-only truth, default raw timeline as main view, default time travel/state mutation, product redesign, public package surface, private session/finding/artifact derivation, and operation controller UI outside Batch 6 allowlist.
- Playground dogfoods a dev-only live bridge path: adapter offer, target discovery, static-live binding, allowlisted operation or capture, canonical evidence export, Workbench projection, and verification/compare handoff.
- Playground UI state, product scenario playback, preview state, source editor selection, and demo metadata cannot create live operation, host, selector, profile, snapshot, report, verdict, or finding truth.
- Workbench Kernel needs no new root entity for Batch 5. It must enforce host parity through `truthInputs`, `contextRefs`, and `selectionHints`.
- Unsupported panel-only or product-only facts become viewer-local gaps, drilldown locators, or discussion items.

## Proof Obligations

- One canonical evidence package or live session projection must produce equivalent session, finding, artifact, coordinate, metric, degradation, and gap ids across Agent route, DVTools, and Playground.
- DevTools live and imported modes must use the same projection law.
- Playground dogfood proof must cite runtime/session/evidence coordinates shared with the Agent route.
- Negative sweep must show no DevTools-owned report/evidence/session protocol and no Playground-owned live evidence truth.
