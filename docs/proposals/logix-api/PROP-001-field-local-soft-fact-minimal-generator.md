---
title: PROP-001 Field-Local Soft Fact Minimal Generator
status: draft
version: 3
---

# Proposal: `PROP-001 field-local-soft-fact-minimal-generator`

## Metadata

| field | value |
| --- | --- |
| proposal_id | `PROP-001` |
| status | `implementation-ready` |
| execution_topology | `multi-agent` |
| coordination_owner | `main-agent` |
| portfolio_row | `docs/next/logix-api-planning/proposal-portfolio.md` |
| run_state | `docs/next/logix-api-planning/run-state.md` |
| review_ledger | `docs/review-plan/runs/2026-04-24-prop-001-implementation-ready-check.md` |

## Target

- target_scenarios:
  - `SC-C`
  - `SC-D` as pressure surface only; final truth remains outside this proposal
- claimed_caps:
  - `CAP-10`
  - `CAP-11`
  - `CAP-12`
  - `CAP-13`
- excluded_caps:
  - `CAP-14`
  - `CAP-15`
  - `CAP-16`
  - `CAP-17`
  - `CAP-18`
- target_projection:
  - `PROJ-03`
- authority_touchpoints:
  - `docs/ssot/form/13-exact-surface-contract.md`
  - `specs/155-form-api-shape/spec.md`
  - `specs/155-form-api-shape/candidate-ac3.3.md`
  - current exact authority baseline already carries `field(path).companion({ lower })`; this proposal does not reopen exact spelling by itself

## Decision Policy Check

### P0 Hard Laws
- violated:
  - none
- touched:
  - single owner for local soft fact
  - projection cannot freeze surface
  - proof before authority

### P1 Strong Preferences
- improved:
  - reuse existing lane
  - small public surface
  - minimal generator first
  - planning before exact
- weakened:
  - none yet
- proof for weakening:
  - not applicable in this draft

### Generator Efficiency
- public_concepts:
  - one field-local soft fact lane
- covered_caps:
  - `CAP-10`
  - `CAP-11`
  - `CAP-12`
  - `CAP-13`
- covered_scenarios:
  - `SC-C`
  - partial pressure on `SC-D`
- collisions_introduced:
  - none newly introduced
- generator_verdict:
  - candidate minimal generator for field-local soft fact

### P2 Tradeoffs
- chosen compromise:
  - keep exact noun, callback spelling, and carrier shape outside this proposal
- rejected alternatives:
  - one API per capability
  - source absorbs local soft fact
  - final rule absorbs local derivation shape

### Human First-Read
- first-read win:
  - one local lane can explain “derive availability and candidates from local state plus source”
- first-read cost:
  - exact API noun is deferred, so readers must tolerate a lane-level sketch first

### Agent-First
- generation stability:
  - high, because one lane covers four related capability atoms
- validation stability:
  - high, with row-heavy sufficiency closed and sanctioned selector primitive adopted through `PF-03`

## Shape

- lane-level design:
  - field-local soft fact lane consumes `value / deps / source?`
  - lane emits local soft fact bundle for availability and candidate projection
  - lane stays selector-readable through the single host gate
- exact surface status:
  - deferred to owner authority
- non_claims:
  - no exact noun freeze
  - no callback spelling freeze
  - no helper freeze
  - no list/root scope expansion

## Coverage

- covered_caps:
  - `CAP-10`
  - `CAP-11`
  - `CAP-12`
  - `CAP-13`
- uncovered_caps:
  - `CAP-14`
  - `CAP-15`
  - `CAP-16`
  - `CAP-17`
  - `CAP-18`
- residual_risks:
  - final truth and diagnostics backlink remain outside this proposal
  - current exact baseline may survive or be challenged later, but this proposal does not settle that question

## Collision

- touched_col:
  - `COL-01`
  - `COL-02`
  - `COL-03`
  - `COL-08`
- new_col:
  - none
- conflicting_proposals:
  - source-only local coordination
  - list/root soft fact reopen
  - spelling-level challengers for the field-local lane
- follow_up_ledgers:
  - `docs/review-plan/runs/2026-04-24-col-03-row-heavy-follow-up.md`
  - `docs/review-plan/runs/2026-04-24-cap-13-sanctioned-selector-primitive-decision.md`
  - `docs/review-plan/runs/2026-04-24-col-04-row-owner-selector-decision.md`
  - `docs/review-plan/runs/2026-04-24-col-05-evidence-envelope-decision.md`
  - `docs/review-plan/runs/2026-04-24-pf-08-evidence-envelope-exactness-packet.md`
  - `docs/review-plan/runs/2026-04-24-pf-04-rule-submit-backlink-packet.md`
  - `docs/review-plan/runs/2026-04-24-proj-03-freeze-record.md`

## Proof

- required_pf:
  - `PF-03`
  - `PF-07`
- collision_closure_packets:
  - `docs/review-plan/runs/2026-04-24-pf-06-refinement-packet.md`
- proof_status:
  - proven for `CAP-10 / CAP-11 / CAP-12 / CAP-13`
- missing_evidence:
  - none for `PROJ-03` baseline

## Principle Candidates

- principle_candidates:
  - field-local soft fact should stay separate from remote fact ingress
  - field-local soft fact should stay separate from final rule truth

## Review

- plan_optimality_ledgers:
  - `docs/review-plan/runs/2026-04-24-prop-001-local-review.md`
  - `docs/review-plan/runs/2026-04-24-pf-03-recipe-only-admissibility-blocker-check.md`
  - `docs/review-plan/runs/2026-04-24-cap-13-sanctioned-selector-primitive-decision.md`
  - `docs/review-plan/runs/2026-04-24-col-04-row-owner-selector-decision.md`
  - `docs/review-plan/runs/2026-04-24-col-05-evidence-envelope-decision.md`
  - `docs/review-plan/runs/2026-04-24-proj-03-freeze-record.md`
  - `docs/review-plan/runs/2026-04-24-prop-001-implementation-ready-check.md`
  - `docs/review-plan/runs/2026-04-24-global-api-shape-closure-gate-after-pf-09.md`
- current_status:
  - proposal review passed with no blocker
  - `COL-03` follow-up kept `field-only` baseline alive and narrowed the next proof gate to `PF-06`
  - `PF-06` executed and passed as the closure gate for `COL-03`
  - `COL-03` is closed and `field-only` remains the surviving baseline
  - historical `PF-03` blocker confirmed current host gate was insufficient until the sanctioned companion selector primitive reopen was adopted
  - sanctioned companion selector primitive decision adopted `Form.Companion.field(path)`
  - row-owner selector primitive decision adopted `Form.Companion.byRowId(listPath, rowId, fieldPath)`
  - `PF-03` is now executable and `PROJ-03` is frozen as the planning baseline
  - `COL-04` is closed; diagnostics/materializer split also closed through one evidence envelope
  - `PROP-001` passed implementation-ready check and is no longer the active work item
  - `PF-08` accepted the current startup-report evidence floor and promoted `SC-C / SC-E / SC-F` to covered on the frozen baseline
  - `PF-04` is now executable and proved the current rule lane and settlement lane floor for `SC-D`
  - `CAP-15` submit backlink and `PF-09` compare/perf admissibility are closed for current matrix scope
  - current global closure passed planning scope and moved consumption to `CONV-001`
- adoption_request:
  - `implementation-ready`

## Skill Feedback

- feedback_id:
  - none yet
- source_context:
  - none yet
- observed_gap:
  - none yet
- proposed_skill_change:
  - none yet
- affected_files:
  - none yet
- evidence:
  - none yet
- reuse_scope:
  - none yet
- risk_if_added:
  - none yet
- risk_if_ignored:
  - none yet
- recommended_status:
  - none yet
