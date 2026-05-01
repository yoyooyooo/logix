# Logix Playground Review Ledger

## Meta

- target: `specs/164-logix-playground/plan.md`
- targets:
  - `specs/164-logix-playground/spec.md`
  - `specs/164-logix-playground/plan.md`
  - `specs/164-logix-playground/research.md`
  - `specs/164-logix-playground/data-model.md`
  - `specs/164-logix-playground/contracts/README.md`
  - `specs/164-logix-playground/quickstart.md`
- source_kind: file-plan
- reviewer_count: 4
- reviewer_model: `gpt-5.4`
- reviewer_reasoning: `xhigh`
- challenge_scope: open
- consensus_status: closed

## Bootstrap

- target_complete: true
- alignment_gate:
  - policy: auto
  - status: inferred
  - resolved_points:
    - artifact_kind: implementation-plan
    - review_goal: implementation-ready
    - target_claim: `164` should be ready to guide shell-first `packages/logix-playground` implementation for React preview plus Runtime Run/Check/Trial proof.
    - challenge_scope: open
    - scope_fence: package boundary, public contract, shared execution coordinate, docs/examples proof and verification gates are challengeable; implementation is out of scope.
    - stop_condition: consensus, max 4 rounds
    - write_policy: main agent may update target planning artifacts and ledger.
  - open_questions: none
  - confirmation_basis: user explicitly invoked `$plan-optimality-loop` against the existing `164-logix-playground` planning artifacts.
- review_contract:
  - artifact_kind: implementation-plan
  - review_goal: implementation-ready
  - target_claim: current `164` plan should become an implementation-ready plan for a reusable Logix Playground package.
  - target_refs:
    - `specs/164-logix-playground/spec.md`
    - `specs/164-logix-playground/plan.md`
    - `specs/164-logix-playground/research.md`
    - `specs/164-logix-playground/data-model.md`
    - `specs/164-logix-playground/contracts/README.md`
    - `specs/164-logix-playground/quickstart.md`
    - `specs/163-runtime-playground-terminal-runner/spec.md`
    - `docs/ssot/runtime/01-public-api-spine.md`
    - `docs/ssot/runtime/09-verification-control-plane.md`
    - `docs/standards/logix-api-next-guardrails.md`
  - non_default_overrides:
    - reviewer_count: 4
    - active_A4: true
    - reason: open scope touches architecture, public contract and long-term package governance.
- review_object_manifest:
  - source_inputs: existing spec-kit artifacts for `164-logix-playground`
  - materialized_targets: none
  - authority_target: `specs/164-logix-playground/plan.md`
  - bound_docs:
    - `specs/164-logix-playground/spec.md`
    - `specs/164-logix-playground/research.md`
    - `specs/164-logix-playground/data-model.md`
    - `specs/164-logix-playground/contracts/README.md`
    - `specs/164-logix-playground/quickstart.md`
  - derived_scope: implementation plan plus directly bound Phase 0/1 artifacts
  - allowed_classes:
    - task
    - dependency
    - risk
    - rollback
    - verification backlog
    - public surface boundary
    - authority boundary
  - blocker_classes:
    - live task ambiguity
    - unbound dependency
    - unsealed verification gate
    - second authority
    - public surface expansion without proof
  - ledger_target: `docs/review-plan/runs/2026-04-28-logix-playground-optimality-loop.md`
- challenge_scope: open
- reviewer_set:
  - A1: structure purity
  - A2: token economy and duplicate contracts
  - A3: dominance alternatives and second-authority detection
  - A4: target-function challenge
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
  - proposal must compress at least one assumption, public boundary or duplicate contract
  - core axes `concept-count / public-surface / compat-budget` must not get worse overall
  - no new second authority, second workflow, second contract or unexplained contradiction
- reopen_bar:
  - reopened only by a proposal that strictly dominates adopted candidate on dominance axes or significantly improves proof-strength/future-headroom without worsening core axes
- ledger_path: `docs/review-plan/runs/2026-04-28-logix-playground-optimality-loop.md`
- writable: true

## Assumptions

- A-01:
  - summary: Public adapter/file/runner/evidence submodules are needed for docs/examples reuse.
  - status: overturned
  - resolution_basis: reviewers found no second consumer proof; shell-first public surface dominates.
- A-02:
  - summary: Same-source proof can be file-text-only and demonstrated by one example.
  - status: overturned
  - resolution_basis: adopted `ProjectSnapshot` makes execution coordinate the invariant for all projects with preview and Program capability.
- A-03:
  - summary: Docs may maintain a separate registry with the same project ids.
  - status: overturned
  - resolution_basis: adopted single curated project authority or generated index rule.
- A-04:
  - summary: Generic Trial contract is safe for v1.
  - status: overturned
  - resolution_basis: adopted startup-only Trial boundary.
- A-05:
  - summary: PlaygroundEvidence should be independent workspace state.
  - status: overturned
  - resolution_basis: adopted derived summary only; core report remains authority.

## Round 1

### Phase

- challenge

### Input Residual

- none

### Findings

- F1 `critical` `invalidity`:
  - summary: Public surface overexposes `FileModel / ProgramEngine / Preview / Evidence` and mirrors runtime runner into a second public product API.
  - evidence: all reviewers flagged exported submodules and public runner/evidence contracts.
  - status: adopted
- F2 `high` `invalidity`:
  - summary: Same-source model covers file text, not full execution coordinate.
  - evidence: reviewers identified dependencies, mocks, generated files, resolved entries and env seed as hidden divergence sources.
  - status: adopted
- F3 `high` `ambiguity`:
  - summary: Trial mode is not frozen to startup, allowing scenario/replay/compare creep.
  - evidence: reviewers cited `Runtime.trial` control-plane law and default gate.
  - status: adopted
- F4 `high` `controversy`:
  - summary: Docs readiness could form a parallel docs registry authority.
  - evidence: examples registry and docs registry examples were separate in original quickstart/contracts.
  - status: adopted
- F5 `high` `invalidity`:
  - summary: `PlaygroundEvidence` as a mutable entity risks second evidence ledger.
  - evidence: data model stored evidence beside preview/program sessions and core reports.
  - status: adopted
- F6 `medium` `ambiguity`:
  - summary: Verification gates were duplicated across spec, plan and quickstart without a single implementation authority.
  - evidence: A2 identified multiple pass/fail sources.
  - status: adopted
- F7 `medium` `ambiguity`:
  - summary: Project declaration mixed source authority, docs metadata, mocks, dependencies and adapter concerns.
  - evidence: A1/A2 highlighted over-broad registry schema.
  - status: adopted

### Counter Proposals

- P1:
  - summary: Shell-first public surface.
  - why_better: Removes public runner/file/adapter/evidence API while preserving docs/examples consumption.
  - overturns_assumptions: A-01
  - resolves_findings: F1
  - supersedes_proposals: A1-ALT-01, A2-ALT-02, A3-ALT-01, A4-ALT-01
  - dominance: dominates
  - axis_scores:
    - concept-count: +3
    - public-surface: +4
    - compat-budget: +4
    - migration-cost: +2
    - proof-strength: +2
    - future-headroom: +2
  - status: adopted
- P2:
  - summary: `ProjectSnapshot` as single execution coordinate.
  - why_better: Makes preview and runtime operation equality testable beyond file text.
  - overturns_assumptions: A-02
  - resolves_findings: F2
  - supersedes_proposals: A3-ALT-02, A4-ALT-02
  - dominance: dominates
  - axis_scores:
    - concept-count: +1
    - public-surface: +1
    - compat-budget: +1
    - migration-cost: 0
    - proof-strength: +4
    - future-headroom: +4
  - status: adopted
- P3:
  - summary: Startup-only Trial in Playground v1.
  - why_better: Aligns with runtime control-plane default gate and blocks scenario/replay/compare scope creep.
  - overturns_assumptions: A-04
  - resolves_findings: F3
  - supersedes_proposals: A1-ALT-03, A4-ALT-03
  - dominance: dominates
  - axis_scores:
    - concept-count: +1
    - public-surface: +1
    - compat-budget: +1
    - migration-cost: +2
    - proof-strength: +2
    - future-headroom: 0
  - status: adopted
- P4:
  - summary: Single curated project authority for examples and future docs.
  - why_better: Eliminates docs/examples metadata drift.
  - overturns_assumptions: A-03
  - resolves_findings: F4
  - supersedes_proposals: A3-ALT-03
  - dominance: dominates
  - axis_scores:
    - concept-count: +2
    - public-surface: +1
    - compat-budget: +2
    - migration-cost: 0
    - proof-strength: +3
    - future-headroom: +3
  - status: adopted
- P5:
  - summary: Derived summary instead of mutable evidence ledger.
  - why_better: Keeps Agent-readable summary without second report/evidence truth.
  - overturns_assumptions: A-05
  - resolves_findings: F5
  - supersedes_proposals: A2-ALT-03
  - dominance: dominates
  - axis_scores:
    - concept-count: +2
    - public-surface: +1
    - compat-budget: +1
    - migration-cost: +1
    - proof-strength: +2
    - future-headroom: +2
  - status: adopted
- P6:
  - summary: Acceptance matrix as single implementation pass/fail authority.
  - why_better: Eliminates duplicated gate prose and gives task generation concrete witness ids.
  - overturns_assumptions: duplicate gate sources are harmless
  - resolves_findings: F6
  - supersedes_proposals: A2-ALT-01
  - dominance: dominates
  - axis_scores:
    - concept-count: +3
    - public-surface: 0
    - compat-budget: +2
    - migration-cost: +1
    - proof-strength: +3
    - future-headroom: +2
  - status: adopted

### Resolution Delta

- Rewrote `plan.md` around adopted candidate and added acceptance matrix.
- Updated `spec.md` to shell-first, ProjectSnapshot, startup Trial, derived summary and single project authority.
- Updated `contracts/README.md` to minimal public surface and internal boundaries.
- Updated `data-model.md` to remove mutable evidence ledger and add `ProjectSnapshot`.
- Updated `research.md` decisions and alternatives.
- Updated `quickstart.md` commands and docs readiness rule.

## Adoption

- adopted_candidate: Shell-first Playground package with internal snapshot/runner/adapter and single curated project authority.
- lineage:
  - A1-ALT-01
  - A1-ALT-03
  - A2-ALT-01
  - A2-ALT-02
  - A2-ALT-03
  - A3-ALT-01
  - A3-ALT-02
  - A3-ALT-03
  - A4-ALT-01
  - A4-ALT-02
  - A4-ALT-03
- rejected_alternatives:
  - keep public `FileModel / ProgramEngine / Preview / Evidence`
  - keep file-text-only shared model
  - allow custom `programExport/mainExport`
  - allow generic Trial in v1
  - allow docs-owned parallel registry
  - store PlaygroundEvidence as mutable state
- rejection_reason:
  - Each rejected alternative either increases public surface, creates second authority, weakens proof strength or conflicts with `163`/runtime control-plane authority.
- dominance_verdict:
  - Adopted candidate strictly improves concept-count, public-surface, compat-budget, proof-strength and future-headroom without increasing migration cost.

### Freeze Record

- adopted_summary:
  - `@logixjs/playground` public surface is shell-first: `PlaygroundPage` plus project declaration helpers.
  - `ProjectSnapshot` is the single execution coordinate for preview and internal runtime operations.
  - Program files use fixed `Program` and app-local `main` exports.
  - Runtime operations are internal and limited to Run, Check and startup Trial.
  - Derived summary is a projection, not independent evidence truth.
  - Docs consume the same curated project authority or generated index.
  - Acceptance matrix is the implementation pass/fail authority.
- kernel_verdict:
  - Ramanujan: public concepts and authorities were compressed.
  - Kolmogorov: duplicate gate prose was replaced by an acceptance matrix.
  - Godel: second runner contract, second evidence ledger and second registry authority were removed.
- frozen_decisions:
  - shell-first public surface
  - internal preview adapter
  - internal sandbox-backed runner
  - `ProjectSnapshot`
  - fixed `Program/main`
  - startup-only Trial
  - derived summary only
  - single curated project authority
  - acceptance matrix
- non_goals:
  - public adapter plugin API
  - public ProgramEngine/FileModel/Preview/Evidence
  - scenario trial/replay/compare
  - independent docs registry truth
  - mutable Playground evidence ledger
- allowed_reopen_surface:
  - third-party preview limitations that make internal adapter impossible
  - docs requirement that cannot consume shared/generated project authority
  - ProjectSnapshot unable to represent required preview/runtime inputs
  - dominance proof for public submodule promotion after second consumer exists
- proof_obligations:
  - AM-01 through AM-13 in `specs/164-logix-playground/plan.md`
- delta_from_previous_round:
  - public surface narrowed
  - snapshot law added
  - Trial scope frozen
  - registry authority unified
  - evidence demoted to derived summary
  - acceptance matrix added

## Round 2

### Phase

- converge

### Input Residual

- Check adopted freeze record for unresolved findings after revision.

### Findings

- F8 `medium` `ambiguity`:
  - summary: A4 found that startup-only Trial was frozen, but Source/Preview/Run default hierarchy and on-demand Check/Trial were not yet a verifiable contract.
  - evidence: initial Round 2 A4 converge result.
  - status: closed

### Counter Proposals

- P7:
  - summary: Add default UI hierarchy witness.
  - why_better: Closes the remaining control-plane hierarchy gap without changing public surface.
  - overturns_assumptions: panel completeness is sufficient without default hierarchy
  - resolves_findings: F8
  - supersedes_proposals: none
  - dominance: partial
  - axis_scores:
    - concept-count: 0
    - public-surface: 0
    - compat-budget: +1
    - migration-cost: 0
    - proof-strength: +2
    - future-headroom: +1
  - status: adopted

### Resolution Delta

- Added `FR-020` and `SC-009` to `spec.md`.
- Added `AM-13 default UI hierarchy` to `plan.md`.
- Updated `quickstart.md` required UI proof.
- Renumbered text sweep witness to `AM-14`.

## Consensus

- reviewers:
  - A1: no unresolved findings
  - A2: no unresolved findings
  - A3: no unresolved findings
  - A4: one Round 2 residual accepted and patched
- adopted_candidate: Shell-first Playground package with `ProjectSnapshot` and startup-only Trial.
- final_status: consensus reached
- stop_rule_satisfied: true
- residual_risk:
  - implementation must keep generated files, dependencies and fixtures single-source through `ProjectSnapshot`
  - docs integration must consume shared/generated project authority and must not reauthor project metadata
