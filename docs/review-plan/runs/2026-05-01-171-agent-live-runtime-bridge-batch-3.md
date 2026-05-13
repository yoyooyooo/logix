# 171 Agent Live Runtime Bridge Batch 3 Plan Optimality Loop

## Meta

- `target`: `specs/171-agent-live-runtime-bridge`
- `targets`:
  - `specs/171-agent-live-runtime-bridge/spec.md`
  - `specs/171-agent-live-runtime-bridge/discussion.md`
  - `docs/ssot/runtime/02-hot-path-direction.md`
  - `docs/ssot/runtime/09-verification-control-plane.md`
  - `docs/ssot/runtime/14-dvtools-internal-workbench.md`
- `source_kind`: `file-spec`
- `reviewers`: `A1`, `A2`, `A3`, `A4`
- `round_count`: 3
- `challenge_scope`: `open`
- `consensus_status`: `consensus`

## Bootstrap

- `target_complete`: true
- `alignment_gate`:
  - `policy`: `auto`
  - `status`: `inferred`
  - `resolved_points`: user explicitly requested `$plan-optimality-loop` reviewer review for Batch 3 and later asked to continue until consensus or write back planning artifacts.
  - `open_questions`: none
  - `confirmation_basis`: target files, Batch 1 freeze record, Batch 3 focus, read-only challenge, and write-back expectation were provided by the user.
- `review_contract`:
  - `artifact_kind`: `ssot-contract`
  - `review_goal`: `design-closure`
  - `target_claim`: Batch 3 must settle the runtime attachment model for Agent live runtime bridge without creating a second runtime truth, public surface, evidence envelope, or cloud-unsafe hook model.
  - `target_refs`: see `targets`
  - `non_default_overrides`:
    - `scope_fence`: challenge runtime attachment naming, browser hook existence and owner, Node/browser/Playground/cloud shared semantics, disabled overhead, transaction-window IO, cloud safety, and adapter/core truth boundary; do not start implementation.
    - `stop_condition`: `consensus`
    - `write_policy`: main agent may update `spec.md`, `discussion.md`, and this ledger; implementation code is out of scope.
- `review_object_manifest`:
  - `source_inputs`: user request, Batch 1 ledger, `spec.md`, `discussion.md`, `02`, `09`, `14`
  - `materialized_targets`: `spec.md`, `discussion.md`, this ledger
  - `authority_target`: `spec.md`
  - `bound_docs`: `02-hot-path-direction.md`, `09-verification-control-plane.md`, `14-dvtools-internal-workbench.md`
  - `derived_scope`: Batch 3 Runtime Hook, Agent Port, And Attachment Model historical label; adopted target is C171-F attachment substrate
  - `allowed_classes`: attachment owner law, attachment naming, adapter projection, browser hook boundary, cloud-compatible constraints, disabled overhead, transaction-window IO, truth firewall
  - `blocker_classes`: second runtime truth, second session truth, browser-only singleton as core model, public hook/port surface, exact cloud product protocol in Batch 3, IO in transaction window, disabled hot-path overhead
  - `ledger_target`: this file
- `reviewer_set`: `A1`, `A2`, `A3`, `A4`
- `kernel_council`: `Ramanujan`, `Kolmogorov`, `Godel`
- `dominance_axes`: `concept-count`, `public-surface`, `compat-budget`, `migration-cost`, `proof-strength`, `future-headroom`
- `stop_rule`: pass Ramanujan, Kolmogorov, and Godel gates before adoption; converge reviewers must report no unresolved findings after write-back.
- `reopen_bar`: a later proposal must strictly improve at least one dominance axis without growing public surface, creating second authority, weakening disabled-path proof, or weakening cloud safety.
- `ledger_path`: `docs/review-plan/runs/2026-05-01-171-agent-live-runtime-bridge-batch-3.md`
- `writable`: true

## Assumptions

- `A-B3-001`: Batch 3 should freeze exact `RuntimeAgentPort` name, DTO, and schema.
  - `status`: `overturned`
  - `resolution_basis`: all reviewers found exact port/DTO premature and duplicative with runtime attachment semantics.
- `A-B3-002`: Browser global hook is the center of Batch 3.
  - `status`: `overturned`
  - `resolution_basis`: reviewers found hook-first framing weaker than attachment-substrate-first on concept-count, public-surface, proof-strength, and future-headroom.
- `A-B3-003`: Browser, Node, Playground, and cloud should share one DTO or transport to share semantics.
  - `status`: `overturned`
  - `resolution_basis`: reviewers converged on shared semantic substrate with adapter projections.
- `A-B3-004`: Cloud product registration should be frozen in Batch 3.
  - `status`: `overturned`
  - `resolution_basis`: full cloud product surface is out of scope; only cloud-compatible constraints are adopted.
- `A-B3-005`: Adapter registration is equivalent to runtime attachment authority.
  - `status`: `overturned`
  - `resolution_basis`: adapters submit attach offers and transport metadata; core owns attachment authority.
- `A-B3-006`: Disabled overhead, transaction-window IO, and cloud safety can remain scattered NFRs.
  - `status`: `overturned`
  - `resolution_basis`: reviewers require them as first-order Batch 3 gates.

## Rounds

### Round 1 Challenge

Findings:

- `F-B3-001`
  - `severity`: `blocker`
  - `class`: `invalidity`
  - `summary`: Exact `RuntimeAgentPort` DTO/internal service freezes too early and duplicates `RuntimeAttachment`.
  - `evidence`: Batch 1 deferred port name/DTO; Batch 3 candidate split promoted it before permission and operation allowlist closure.
  - `status`: `closed`
- `F-B3-002`
  - `severity`: `blocker`
  - `class`: `controversy`
  - `summary`: Hook-first target function biases Batch 3 toward browser attachment.
  - `evidence`: Batch 3 goal centered React-like global hook while Batch 1 froze core-owned attachment semantics and must-cut rejected browser-only singleton.
  - `status`: `closed`
- `F-B3-003`
  - `severity`: `high`
  - `class`: `ambiguity`
  - `summary`: Shared attachment semantics lacked a minimal invariant set.
  - `evidence`: spec required browser/Node/Playground/cloud to share semantics but did not freeze axioms.
  - `status`: `closed`
- `F-B3-004`
  - `severity`: `high`
  - `class`: `invalidity`
  - `summary`: Cloud product registration was being considered despite full cloud product surface being deferred.
  - `evidence`: spec out-of-scope and deferred list exclude full remote cloud control-plane design.
  - `status`: `closed`
- `F-B3-005`
  - `severity`: `high`
  - `class`: `invalidity`
  - `summary`: Adapter-owned session or evidence summary would create second runtime truth.
  - `evidence`: `09` and `14` forbid second evidence, report, session, and runtime truth.
  - `status`: `closed`
- `F-B3-006`
  - `severity`: `high`
  - `class`: `ambiguity`
  - `summary`: Disabled-path and transaction-window IO requirements lacked structural gates.
  - `evidence`: spec had NFRs for disabled overhead and no transaction IO; `02` excludes control plane from steady-state hot path.
  - `status`: `closed`

Counter proposals:

- `CP-B3-001`
  - `summary`: `C171-F Core Attachment Authority, Adapter Offer Only`
  - `why_better`: keeps C171-E north star while removing premature DTO, hook registry, cloud registration, and daemon session truth.
  - `overturns_assumptions`: `A-B3-001`, `A-B3-002`, `A-B3-003`, `A-B3-004`, `A-B3-005`, `A-B3-006`
  - `resolves_findings`: `F-B3-001` to `F-B3-006`
  - `supersedes_proposals`: Batch 3 candidate split
  - `dominance`: `dominates`
  - `axis_scores`:
    - `concept-count`: better
    - `public-surface`: better
    - `compat-budget`: better
    - `migration-cost`: better
    - `proof-strength`: better
    - `future-headroom`: better
  - `status`: `adopted`

Resolution delta:

- `spec.md` now adopts `C171-F`.
- `discussion.md` now records the rejected candidate split, adopted candidate, frozen decisions, and deferred exact names/protocols.
- Browser hook exact name, `RuntimeAgentPort` exact DTO, Node daemon protocol, cloud registration protocol, active-operation payload shape, and public CLI live command shape remain deferred.

## Adoption

- `adopted_candidate`: `C171-F Core Attachment Authority, Adapter Offer Only`
- `lineage`: synthesized from A1, A2, A3, and A4 Batch 3 reviews.
- `rejected_alternatives`:
  - `RuntimeAgentPort DTO first`
  - `exact browser global hook name`
  - `per-adapter object model`
  - `cloud product registration now`
  - `adapter session management`
- `rejection_reason`: each rejected alternative failed at least one of concept-count, public-surface, proof-strength, or Godel authority gates.
- `dominance_verdict`: `C171-F` strictly dominates the Batch 3 candidate split across all six dominance axes.

### Freeze Record

- `adopted_summary`: Batch 3 freezes a core-owned runtime attachment substrate. Adapters submit attach offers and transport metadata. Core owns attachment authority and runtime truth. Canonical evidence and Workbench own projection truth. `09` owns verdict truth.
- `kernel_verdict`: passes Ramanujan by reducing adapter objects to one substrate and projection matrix; passes Kolmogorov by avoiding exact hook/port/cloud protocol naming; passes Godel by closing second runtime truth, second session truth, and second evidence authority risks.
- `frozen_decisions`:
  - `RuntimeAttachment` is a planning label for core-owned attachment substrate semantics, not a frozen public name, DTO name, or exported schema.
  - `RuntimeAgentPort` may exist only as internal implementation vocabulary after implementation design proves it useful.
  - Browser hook may exist only as optional browser adapter discovery / attach-offer mechanism; exact global name is not frozen.
  - Node daemon, Playground wiring, cloud registration, and CLI/daemon transport are adapter projections.
  - Cloud safety constraints are frozen; full cloud registration protocol is deferred.
  - Disabled path must be structurally no-op or static-empty capability.
  - Synchronous transaction windows cannot perform bridge IO.
  - Adapter cannot own runtime identity, session truth, operation authority, evidence envelope, Workbench projection, or verification verdict.
- `non_goals`:
  - exact `RuntimeAgentPort` name / DTO / schema
  - exact browser global hook name
  - Node daemon protocol
  - cloud registration protocol
  - active-operation payload shape
  - public CLI live command shape
- `allowed_reopen_surface`:
  - implementation plan may rename `RuntimeAttachment` if it preserves the substrate law and five-concept mental model.
  - implementation plan may introduce an internal port if it stays internal and does not enter public or SSoT primary vocabulary.
  - future cloud spec may define product protocol after local attachment and explicit adapter-offer semantics are proven.
  - Batch 6 may refine controlled-operation allowlist and payload admission rules.
- `proof_obligations`:
  - hot-path baseline must prove disabled attachment does not affect ordinary steady-state hot paths.
  - active operation evidence must show admission, runtime scheduling, post-commit evidence drain, and adapter transport separation.
  - cloud path must show explicit auth, tenant/session boundary, revocation, audit, redaction, no `globalThis` authority, and canonical evidence only.
  - adapter conformance tests must prove adapters cannot mint runtime identity, session/finding truth, txn/op coordinates, independent evidence envelope, or verdict.
- `delta_from_previous_round`: Batch 3 replaces the candidate split with `C171-F`; port DTO, exact hook name, cloud registration protocol, daemon protocol, and active-operation payload exactness are removed from Batch 3 authority.

## Round 2 Converge

### Phase

- `converge`

### Input Residual

- Verify whether `C171-F` write-back in `spec.md`, `discussion.md`, and this ledger resolves `F-B3-001` to `F-B3-006`.

### Findings

- `F-B3-CV-001`
  - `severity`: `medium`
  - `class`: `ambiguity`
  - `summary`: `discussion.md` still had pre-Batch-3 `Current Recommendation To Challenge` and `why still alive` candidate wording, making old hook / adapter / cloud candidates appear active.
  - `evidence`: A2 converge review found stale candidate state in `discussion.md`.
  - `status`: `closed`

### Counter Proposals

- `CP-B3-CV-001`
  - `summary`: Keep C171-F and rewrite stale candidate history into a post-Batch-3 status table.
  - `why_better`: reduces stale candidate risk without reopening the adopted attachment substrate.
  - `overturns_assumptions`: none
  - `resolves_findings`: `F-B3-CV-001`
  - `supersedes_proposals`: none
  - `dominance`: `partial`
  - `axis_scores`:
    - `concept-count`: better
    - `public-surface`: same
    - `compat-budget`: same
    - `migration-cost`: same
    - `proof-strength`: better
    - `future-headroom`: same
  - `status`: `adopted`

### Resolution Delta

- `discussion.md` now uses `Post-Batch-3 Recommendation`.
- `discussion.md` now uses `Candidate Status After Batch 3`.
- Old candidates are explicitly classified as adopted, rejected, or deferred.
- Batch 3 section title is marked as a historical batch label.

## Round 3 Residual Converge

### Phase

- `converge`

### Input Residual

- Verify the `F-B3-CV-001` rewrite and check whether any reviewer still finds unresolved findings or a stronger candidate.

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- A1, A2, A3, and A4 converge reviewers all returned `无 unresolved findings`.
- No reviewer found a proposal that directly dominates `C171-F`.

## Consensus

- `reviewers`: `A1`, `A2`, `A3`, `A4`
- `adopted_candidate`: `C171-F Core Attachment Authority, Adapter Offer Only`
- `final_status`: `consensus`
- `stop_rule_satisfied`: true
- `residual_risk`:
  - controlled-operation allowlist remains Batch 6.
  - live evidence event fields remain later planning.
  - exact implementation name remains deferred.
  - disabled-path baseline and proof commands remain `plan.md` work.
  - `02/09/14` do not need Batch 3 terminology updates now, but FR-021 may trigger SSoT materialization before implementation closure.
