# Runtime Causal Evidence Spool And Timeline Query Review Ledger

## Meta

- target: `docs/proposals/runtime-causal-evidence-spool-and-timeline-query-contract.md`
- targets:
  - `docs/proposals/runtime-causal-evidence-spool-and-timeline-query-contract.md`
- source_kind: `file-ssot-contract`
- reviewers: `A1b`, `A3`, `A4`
- invalidated_reviewers:
  - `A1`: stale, closed after no useful output.
  - `A2`: transport error before completion.
  - `A2b`: stale, closed after no useful output.
- round_count: 3
- challenge_scope: `open`
- consensus_status: `closed`

## Bootstrap

- target_complete: yes
- alignment_gate:
  - policy: `auto`
  - status: `inferred`
  - resolved_points:
    - user requested a terminal proposal and explicitly invoked `$plan-optimality-loop`.
    - review may challenge target function, owner boundaries, public cursor grammar, daemon persistence and storage placement.
    - reviewers do not implement code.
    - main agent may write proposal and ledger updates after synthesis.
  - open_questions: none
  - confirmation_basis: user asked to create the proposal and polish it through `$plan-optimality-loop`; prior discussion established the concern around limit-only timeline, runtime memory overhead and whether Runtime should push events to daemon.
- review_contract:
  - artifact_kind: `ssot-contract`
  - review_goal: `design-closure`
  - target_claim: terminal live timeline history should use Runtime-owned bounded causal ledger head, explicit daemon evidence leases, daemon-owned retained owner segments, and watermark-centered cursor query grammar instead of always pushing all events or making daemon the timeline owner.
  - target_refs:
    - `docs/proposals/runtime-causal-evidence-spool-and-timeline-query-contract.md`
    - `docs/ssot/runtime/18-runtime-inspect-evidence-contract.md`
    - `docs/ssot/runtime/15-cli-agent-first-control-plane.md`
    - `specs/175-runtime-live-operation-ledger/spec.md`
    - `specs/176-field-runtime-inspect-model/spec.md`
    - `specs/177-runtime-inspect-timeline-projection/spec.md`
    - `docs/proposals/agent-first-cli-capability-directions.md`
  - non_default_overrides:
    - alignment_policy: `auto`
    - scope_fence: reviewers may challenge the proposed architecture, cursor grammar, daemon spool boundary, queue coupling, promotion strategy and proof obligations; reviewers must not implement code.
    - stop_condition: `consensus`
    - write_policy: reviewers do not edit files; main agent writes adopted changes to the proposal and ledger.
- review_object_manifest:
  - source_inputs:
    - user discussion on terminal timeline state, Runtime memory overhead, event push versus daemon queue, QA recording, source-chain joins and local semantic memory.
  - materialized_targets:
    - `docs/proposals/runtime-causal-evidence-spool-and-timeline-query-contract.md`
  - authority_target: `docs/proposals/runtime-causal-evidence-spool-and-timeline-query-contract.md`
  - bound_docs:
    - `docs/ssot/runtime/18-runtime-inspect-evidence-contract.md`
    - `docs/ssot/runtime/15-cli-agent-first-control-plane.md`
    - `specs/175-runtime-live-operation-ledger/spec.md`
    - `specs/176-field-runtime-inspect-model/spec.md`
    - `specs/177-runtime-inspect-timeline-projection/spec.md`
    - `docs/proposals/agent-first-cli-capability-directions.md`
  - derived_scope:
    - terminal timeline query model
    - daemon retained owner segment and retention boundary
    - Runtime-to-daemon evidence lease model
    - CLI cursor grammar promotion candidate
  - allowed_classes:
    - ambiguity
    - invalidity
    - controversy
    - dominance-based counter proposal
    - proof obligation gap
  - blocker_classes:
    - daemon becomes Runtime fact owner
    - Runtime hot path performs daemon IO or waits for daemon ack
    - always-on collection violates disabled-overhead law
    - cursor token becomes a second ordering truth
    - public CLI grammar expands without reducing Agent ambiguity
    - canonical evidence becomes timeline truth
  - ledger_target: `docs/review-plan/runs/2026-05-04-runtime-causal-evidence-spool-and-timeline-query.md`
- challenge_scope: `open`
- reviewer_set:
  - A1b structure purity and owner boundaries
  - A3 dominance, future stability and second-truth detection
  - A4 target function challenge
- active_advisors: none
- activation_reason: A4 enabled because the proposal touches architecture, public CLI grammar, retention authority and long-term success criteria.
- max_reviewer_count: 4
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
- stop_rule: consensus requires no unresolved reviewer findings, no stale results, no unhandled dominating alternative, adopted freeze record saved, target text saved, and ledger updated.
- reopen_bar: reopen only if a candidate strictly improves at least one dominance axis without weakening owner authority, disabled-overhead, no-second-truth, cursor determinism or proof strength.
- ledger_path: `docs/review-plan/runs/2026-05-04-runtime-causal-evidence-spool-and-timeline-query.md`
- writable: yes

## Assumptions

- A-001:
  - summary: Runtime should not default to realtime push of all events to daemon.
  - status: kept
  - resolution_basis: A1b, A3 and A4 all preserved Runtime-owned truth and rejected daemon push as default.
- A-002:
  - summary: watermark-centered `--cursor <token>` is the smallest public CLI upgrade for timeline continuation.
  - status: kept
  - resolution_basis: kept only after cursor became an opaque resume certificate bound to Runtime watermark, target, attachment and semantic query fingerprint.
- A-003:
  - summary: daemon queue and daemon spool should be planned together because both are retention/backpressure concerns.
  - status: overturned
  - resolution_basis: A1b, A3 and A4 all found queue/task history and retained owner segment have different proof obligations.
- A-004:
  - summary: spec 180 should own this upgrade instead of silently extending 177.
  - status: kept
  - resolution_basis: kept with narrowed scope; 180 owns continuation and retained owner segment, not queue, QA recorder, source-chain or local memory.

## Rounds

- round: 1
  phase: `challenge`
  input_residual: none
  findings:
    - id: F-001
      severity: blocker
      class: invalidity
      summary: proposed Spec 180 bundled cursor grammar, daemon spool, queue, QA/source-chain promotion and semantic memory into one contract.
      evidence: A1b, A3 and A4 all identified owner bundle bloat and second-system risk.
      status: merged
    - id: F-002
      severity: blocker
      class: invalidity
      summary: daemon was allowed to decide head, spool or merged serving, risking daemon timeline ownership.
      evidence: A1b and A3 both found daemon merge/completeness would conflict with 177 timeline projection authority.
      status: merged
    - id: F-003
      severity: high
      class: invalidity
      summary: cursor token law allowed query fingerprint and spool segment hint to blur into ordering or completeness semantics.
      evidence: A1b and A3 both challenged `spool segment hint` and requested opaque cursor with non-semantic locator hints.
      status: merged
    - id: F-004
      severity: high
      class: ambiguity
      summary: ordinary `logix live timeline --cursor` could implicitly create retention lease.
      evidence: A3 found this weakens disabled-overhead and lazy capture proof; A1b requested lease purpose and budget as core law.
      status: merged
    - id: F-005
      severity: high
      class: ambiguity
      summary: public cursor grammar omitted attachment binding and mismatch behavior.
      evidence: A3 cited existing CLI grammar and multi-attachment ambiguity law.
      status: merged
    - id: F-006
      severity: high
      class: controversy
      summary: queue/backpressure and retained owner segment have different owner and proof models.
      evidence: A1b, A3 and A4 all proposed splitting full queue/task history to a separate carrier-hardening spec.
      status: merged
    - id: F-007
      severity: medium
      class: ambiguity
      summary: source-map, AST, loaded-module, route and work-session joins were allowed inside spool core.
      evidence: A1b and A3 found this would thicken retention owner into local semantic memory authority.
      status: merged
    - id: F-008
      severity: blocker
      class: ambiguity
      summary: proposal still had open review questions, so it could not satisfy design-closure.
      evidence: A1b found cursor sufficiency, queue split, history query, redaction and proof priority remained open.
      status: merged
    - id: F-009
      severity: medium
      class: ambiguity
      summary: normalized semantic query fingerprint was undefined.
      evidence: A1b requested exact fingerprint components and `limit` disposition.
      status: merged
    - id: F-010
      severity: high
      class: invalidity
      summary: target function mixed timeline continuation with long-term QA, source-chain and local memory success criteria.
      evidence: A4 found the public cursor grammar could not support all advertised killer features as first-spec exit gates.
      status: merged
  counter_proposals:
    - id: CP-001
      summary: adopt Minimal Causal Evidence Core and narrow 180 to timeline continuation, evidence lease, retained owner segment, cursor and segmented source law.
      why_better: reduces owner bundle while preserving future headroom.
      overturns_assumptions: A-003
      resolves_findings: F-001, F-006, F-010
      supersedes_proposals: A1b-ALT-01, A3-ALT-001, A4-ALT-1
      dominance: dominates
      axis_scores:
        concept-count: improved
        public-surface: improved
        compat-budget: improved
        migration-cost: neutral
        proof-strength: improved
        future-headroom: improved
      status: adopted
    - id: CP-002
      summary: define public cursor as opaque resume certificate bound to Runtime watermark, target, attachment and semantic query fingerprint.
      why_better: keeps Agent grammar small and prevents cursor token from becoming ordering truth.
      overturns_assumptions: none
      resolves_findings: F-003, F-005, F-009
      supersedes_proposals: A1b-ALT-02, A3-ALT-002
      dominance: dominates
      axis_scores:
        concept-count: improved
        public-surface: neutral
        compat-budget: improved
        migration-cost: improved
        proof-strength: improved
        future-headroom: improved
      status: adopted
    - id: CP-003
      summary: move merge and completeness to segmented timeline source law owned by timeline projection.
      why_better: daemon remains retention/query carrier and cannot create timeline truth.
      overturns_assumptions: none
      resolves_findings: F-002
      supersedes_proposals: A1b-ALT-04, A3-ALT-003, A4-ALT-2
      dominance: dominates
      axis_scores:
        concept-count: neutral
        public-surface: neutral
        compat-budget: improved
        migration-cost: neutral
        proof-strength: improved
        future-headroom: improved
      status: adopted
    - id: CP-004
      summary: ordinary timeline reads do not create retention lease; explicit lease is reserved for export evidence, Workbench, QA recording and maintenance debug.
      why_better: preserves disabled-overhead and privacy boundary without adding public flags.
      overturns_assumptions: none
      resolves_findings: F-004
      supersedes_proposals: A3-ALT-004
      dominance: dominates
      axis_scores:
        concept-count: improved
        public-surface: improved
        compat-budget: improved
        migration-cost: neutral
        proof-strength: improved
        future-headroom: neutral
      status: adopted
    - id: CP-005
      summary: split full daemon queue/task history and derived source/QA/local-memory indexes into later specs.
      why_better: separates operational carrier facts and derived semantic indexes from retained owner segment core.
      overturns_assumptions: A-003
      resolves_findings: F-006, F-007, F-010
      supersedes_proposals: A1b-ALT-03, A4-ALT-3
      dominance: dominates
      axis_scores:
        concept-count: improved
        public-surface: improved
        compat-budget: improved
        migration-cost: neutral
        proof-strength: improved
        future-headroom: improved
      status: adopted
  resolution_delta:
    - proposal retargeted to Minimal Causal Evidence Core.
    - 180 narrowed to timeline continuation, evidence lease, retained owner segment, cursor and segmented source law.
    - full daemon queue/task history moved to tentative 181.
    - QA recorder, source-chain, work-session index and local semantic memory moved to downstream specs.
    - cursor changed to opaque resume certificate.
    - `--attachment` preserved in cursor grammar.
    - daemon merge authority removed; timeline projection owns segmented source merge and completeness.
    - ordinary timeline reads no longer create retention lease.
    - open review questions converted into frozen decisions or future-spec deferrals.
- round: 2
  phase: `converge`
  input_residual:
    - ensure source-chain/AST/QA/local-memory do not remain in 180 exit gates.
    - ensure cursor fingerprint is deterministic enough for proof.
  findings:
    - id: F-CV-001
      severity: high
      class: ambiguity
      summary: `source-chain` remained in cursor failure and proof obligation text after being deferred to downstream specs.
      evidence: A1b, A3 and A4 all found `source chain partial/continuation` wording still made downstream source-chain a 180 exit gate.
      status: merged
    - id: F-CV-002
      severity: medium
      class: ambiguity
      summary: `semantic budget class` entered cursor fingerprint without owner or value definition.
      evidence: A1b found it weakened cursor determinism proof and requested either removal or exact projection semantics definition.
      status: merged
  counter_proposals:
    - id: CP-CV-001
      summary: replace source-chain proof wording with source segment chain wording.
      why_better: removes downstream source-chain from 180 while preserving segmented source continuity proof.
      overturns_assumptions: none
      resolves_findings: F-CV-001
      supersedes_proposals: none
      dominance: dominates
      axis_scores:
        concept-count: improved
        public-surface: neutral
        compat-budget: neutral
        migration-cost: neutral
        proof-strength: improved
        future-headroom: neutral
      status: adopted
    - id: CP-CV-002
      summary: replace `semantic budget class` with finite owner-coded projection mode and keep `limit`/lease budget outside cursor identity.
      why_better: makes cursor fingerprint stable while avoiding budget implementation details in identity.
      overturns_assumptions: none
      resolves_findings: F-CV-002
      supersedes_proposals: none
      dominance: dominates
      axis_scores:
        concept-count: neutral
        public-surface: neutral
        compat-budget: improved
        migration-cost: neutral
        proof-strength: improved
        future-headroom: improved
      status: adopted
  resolution_delta:
    - source-chain cursor/proof wording changed to source segment chain.
    - cursor fingerprint now uses finite projection mode.
    - `limit`, lease budget and request byte budget are explicitly excluded from cursor identity unless a future projection mode changes item semantics.
- round: 3
  phase: `converge`
  input_residual:
    - confirm source-chain no longer remains in 180 cursor failure or proof obligations.
    - confirm cursor fingerprint no longer contains undefined `semantic budget class`.
  findings: []
  counter_proposals: []
  resolution_delta:
    - final converge reviewers returned no unresolved findings.
    - residual risk is limited to future writeback accidentally reintroducing source-chain as 180 proof gate or budget class as cursor identity.

## Adoption

- adopted_candidate: draft `Minimal Causal Evidence Core`
- lineage: CP-001 + CP-002 + CP-003 + CP-004 + CP-005
- rejected_alternatives:
  - always push every Runtime event to daemon
  - make daemon the timeline owner
  - bundle queue, QA, source-chain and semantic memory into 180
  - add wall-clock query flags before cursor
  - store full state snapshots by default
  - put persistent storage in Chrome extension
- rejection_reason: rejected alternatives either create second Runtime truth, make disabled overhead hard to prove, or expand public/owner surface before cursor continuation law is closed.
- dominance_verdict: draft adopted candidate dominates the initial proposal on concept-count, public-surface, proof-strength and future-headroom while preserving the target claim.
- freeze_record:
  - adopted_summary: 180 should freeze timeline continuation and retained owner segment, not the whole future live evidence platform.
  - kernel_verdict:
    - Ramanujan: minimal causal evidence core removes unnecessary state modes and future consumer branches.
    - Kolmogorov: one public flag and one retained segment law are smaller than a bundled history platform.
    - Godel: daemon retention no longer owns ordering, merge or completeness.
  - frozen_decisions:
    - `--cursor <token>` is the only first public CLI grammar upgrade.
    - cursor is opaque resume certificate; raw watermark JSON is not public v1 grammar.
    - ordinary timeline reads do not create retention lease.
    - daemon returns source segments; timeline projection owns merge and completeness.
    - queue/task history belongs to later carrier-hardening spec.
    - QA/source-chain/local memory are downstream consumers.
  - non_goals:
    - replay engine
    - final SQLite schema
    - Chrome extension as mandatory UI
    - source map or AST as Runtime truth
  - allowed_reopen_surface:
    - exact retained segment DTO if implementation finds ambiguity
    - cursor token signing or encoding if security requires it
    - minimal redaction contract if proof cannot be written at spec level
  - proof_obligations:
    - disabled allocation
    - no daemon IO in transaction window
    - cursor mismatch and retention gap behavior
    - segmented source continuity
    - lease purpose/budget/redaction enforcement
  - delta_from_previous_round:
    - round 1 adopted draft after challenge.
    - round 2 converge patch removed source-chain exit gate wording and defined cursor projection mode.

## Consensus

- consensus_status: `closed`
- final_verdict: no unresolved findings.
- residual_risk:
  - follow-up 180 writeback must preserve `source segment chain` wording for 180 proof gates.
  - cursor fingerprint must keep finite `projection mode`; budget classes must not re-enter cursor identity without reopening.
- closed_round: 3
