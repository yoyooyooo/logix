# Kernel Projection Dirty Evidence Terminal Contract Review Ledger

## Meta

- target: `docs/review-plan/proposals/2026-04-30-kernel-projection-dirty-evidence-terminal-contract.md`
- targets:
  - `docs/review-plan/proposals/2026-04-30-kernel-projection-dirty-evidence-terminal-contract.md`
  - `docs/ssot/runtime/01-public-api-spine.md`
  - `docs/ssot/runtime/02-hot-path-direction.md`
  - `docs/ssot/runtime/03-canonical-authoring.md`
  - `docs/ssot/runtime/09-verification-control-plane.md`
  - `docs/ssot/runtime/10-react-host-projection-boundary.md`
  - `docs/ssot/runtime/13-selector-type-safety-ceiling-matrix.md`
  - `docs/ssot/capability/03-frozen-api-shape.md`
  - `docs/standards/logix-api-next-guardrails.md`
  - `packages/logix-react/README.md`
  - `packages/logix-react/test-dts/canonical-hooks.surface.ts`
  - `packages/logix-core/test-dts/canonical-authoring.surface.ts`
  - `skills/logix-best-practices/references/agent-first-api-generation.md`
  - `skills/logix-best-practices/references/logix-react-notes.md`
  - `skills/logix-best-practices/references/diagnostics-and-perf-gates.md`
  - `docs/review-plan/proposals/2026-04-30-playground-render-fanout-selector-closure.md`
  - `docs/review-plan/runs/2026-04-30-playground-render-fanout-selector-closure.md`
  - `docs/proposals/read-query-selector-law-internalization-contract.md`
  - `packages/logix-core/src/internal/runtime/core/ReadQuery.ts`
  - `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
  - `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
  - `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`
  - `packages/logix-react/src/internal/hooks/useSelector.ts`
- source_kind: `file-plan`
- reviewers:
  - A1 structure purity
  - A2 compression
  - A3 dominance alternatives
  - A4 goal-function challenge
  - combined reviewer pack
- reviewer_model: `inherited`
- reviewer_reasoning: `xhigh`
- round_count: 3
- challenge_scope: `open`
- consensus_status: `achieved`

## Bootstrap

- target_complete: true
- alignment_gate:
  - policy: `auto`
  - status: `inferred`
  - resolved_points:
    - User clarified that Playground is only a surface symptom.
    - The review object must target kernel-level selector precision, dirty/read overlap, API guidance, best practices, and Agent guardrails.
    - User explicitly asked for another challenge round with terminal assumptions: no phased migration and no compatibility budget.
    - Subagent/reviewer path remains authorized by the current plan-optimality-loop continuation.
  - open_questions: none
  - confirmation_basis: User said the core purpose is to let the kernel catch the issue as much as possible, support API and best practices, and guide users and Agents away from unsafe shapes.
- review_contract:
  - artifact_kind: `ssot-contract`
  - review_goal: `design-closure`
  - target_claim: `Logix must solve render fanout and broad subscription failure at the kernel selector-precision and dirty-evidence level, so ordinary business apps and Agent-generated React code default to exact selector inputs, while broad reads and dynamic selectors are explicit failures under dev/test strict policy.`
  - target_refs:
    - `docs/review-plan/proposals/2026-04-30-kernel-projection-dirty-evidence-terminal-contract.md`
    - `docs/ssot/runtime/01-public-api-spine.md`
    - `docs/ssot/runtime/10-react-host-projection-boundary.md`
    - `docs/standards/logix-api-next-guardrails.md`
    - `docs/proposals/read-query-selector-law-internalization-contract.md`
    - `packages/logix-core/src/internal/runtime/core/ReadQuery.ts`
    - `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
    - `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
    - `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`
    - `packages/logix-react/src/internal/hooks/useSelector.ts`
  - non_default_overrides:
    - alignment_policy: `auto`
    - scope_fence: `May challenge API shape, best practices, React host law, selector public/internal boundary, dirty evidence, diagnostics, control-plane proof obligations, and whether the contract is strong enough for ordinary business apps and Agent-generated code.`
    - stop_condition: `consensus`
    - write_policy: `Update proposal and ledger only; do not implement runtime code in this loop.`
- review_object_manifest:
  - source_inputs:
    - User clarification.
    - Prior Playground render fanout analysis.
    - Current runtime, React host, and selector SSoT.
  - materialized_targets:
    - `docs/review-plan/proposals/2026-04-30-kernel-projection-dirty-evidence-terminal-contract.md`
  - authority_target: `docs/review-plan/proposals/2026-04-30-kernel-projection-dirty-evidence-terminal-contract.md`
  - bound_docs:
    - `docs/ssot/runtime/01-public-api-spine.md`
    - `docs/ssot/runtime/02-hot-path-direction.md`
    - `docs/ssot/runtime/09-verification-control-plane.md`
    - `docs/ssot/runtime/10-react-host-projection-boundary.md`
    - `docs/standards/logix-api-next-guardrails.md`
    - `skills/logix-best-practices/references/logix-react-notes.md`
  - derived_scope:
    - core selector precision classification
    - dirty evidence and shared internal path-id authority
    - React host selector law
    - sealed selector inputs
    - strict dev/test precision policy
    - diagnostics and control-plane projection-quality layering
    - Agent guidance and generated code recipes
  - allowed_classes:
    - ssot decision
    - API fate
    - public/internal boundary
    - diagnostic law
    - proof obligation
    - best practice
    - Agent guardrail
  - blocker_classes:
    - second read truth
    - public `ReadQuery` noun resurrection
    - second hook family
    - broad read as canonical path
    - dynamic selector as normal path
    - silent dirty-all fallback
    - Playground-specific API
  - ledger_target: `docs/review-plan/runs/2026-04-30-kernel-projection-dirty-evidence-terminal-contract.md`
- challenge_scope: `open`
- reviewer_set:
  - A1 structure purity
  - A2 compression
  - A3 dominance alternatives
  - A4 goal-function challenge
  - combined reviewer pack
- active_advisors:
  - A4
  - Feynman
  - Turing
- activation_reason: `The contract must be understandable to users and Agents while still closing kernel-level runtime behavior.`
- max_reviewer_count: 5
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
- reopen_bar: `Reopen only if a candidate strictly dominates the adopted plan on the dominance axes without creating a second authority or compatibility residue.`
- ledger_path: `docs/review-plan/runs/2026-04-30-kernel-projection-dirty-evidence-terminal-contract.md`
- writable: true

## Assumptions

- id: A1
  - summary: `Playground is only a witness; the contract must target ordinary business applications and generated React code.`
  - status: kept
  - resolution_basis: `All reviewers accepted the shift away from Playground as design owner.`
- id: A2
  - summary: `Whole-state `useSelector(handle)` should leave canonical authoring only.`
  - status: overturned
  - resolution_basis: `Reviewers found this insufficient because the public overload remains visible to Agents; terminal public contract must remove no-arg host read.`
- id: A3
  - summary: `The single public host gate can stay as `useSelector(handle, selector, equalityFn?)`.`
  - status: kept
  - resolution_basis: `Reviewers agreed to keep the single hook gate while removing the no-arg overload.`
- id: A4
  - summary: `Sanctioned descriptors plus internal selector precision can avoid exposing `ReadQuery`.`
  - status: kept
  - resolution_basis: `Reviewers rejected public `ReadQuery` and new selector namespaces; current sealed selector inputs remain.`
- id: A5
  - summary: `Dynamic selector fallback should fail under default dev/test strict host policy.`
  - status: kept-with-owner-change
  - resolution_basis: `Reviewers required the owner to be core selector law, with React only consuming the route decision.`
- id: A6
  - summary: `Dirty evidence and read evidence must share one path authority.`
  - status: kept-with-wording-change
  - resolution_basis: `Reviewers required wording as shared internal path-id authority, without freezing registry as public or terminal authoring language.`
- id: A7
  - summary: `selectorId can serve as read-topic identity.`
  - status: overturned
  - resolution_basis: `Reviewers identified selectorId collision risk; read-topic identity must use selector fingerprint while selectorId remains a label.`
- id: A8
  - summary: `Runtime.check and trial(startup) can report React host projection quality directly.`
  - status: overturned
  - resolution_basis: `Reviewers required control-plane layering: check sees static artifacts only; host fanout evidence comes from explicit host harness, trial.scenario, or repo-internal artifact.`

## Rounds

### Round 1

- phase: `challenge`
- input_residual: `Initial T1 proposal: Strict Projection Evidence Contract.`

#### Findings

- id: F1
  - severity: critical
  - class: invalidity
  - summary: `No-arg `useSelector(handle)` cannot merely leave canonical docs; public overload must be removed from terminal host contract.`
  - evidence: `All reviewers cited the public SSoT and useSelector overload as visible to Agents and users.`
  - status: adopted
- id: F2
  - severity: critical
  - class: invalidity
  - summary: `React dynamic fallback currently bypasses runtime strict gate.`
  - evidence: `React hook falls back to module external store for non-static selectors, while runtime strict gate triggers in changesReadQueryWithMeta.`
  - status: adopted
- id: F3
  - severity: critical
  - class: invalidity
  - summary: `Broad projection taxonomy was underspecified.`
  - evidence: `Path depth alone cannot distinguish scalar, object root, list root, debug snapshot, or unknown precision.`
  - status: adopted
- id: F4
  - severity: high
  - class: invalidity
  - summary: `The proposal made internal evidence terms part of public authoring language.`
  - evidence: `Reviewers found `projection evidence`, `dirty evidence`, and `read topic` would replace `ReadQuery` as new public intermediate nouns.`
  - status: adopted
- id: F5
  - severity: high
  - class: invalidity
  - summary: `React host strict policy would create a second gate if it owns broad/dynamic classification.`
  - evidence: `Reviewers agreed core selector law must classify precision and route; React host only consumes.`
  - status: adopted
- id: F6
  - severity: high
  - class: invalidity
  - summary: `selectorId is not sufficient topic identity.`
  - evidence: `SelectorGraph and RuntimeExternalStore currently key by selectorId; mismatched static IR can collide.`
  - status: adopted
- id: F7
  - severity: high
  - class: ambiguity
  - summary: `Control-plane reporting overcommitted Runtime.check and trial(startup).`
  - evidence: `Verification SSoT keeps check static; host commit/fanout evidence requires explicit host harness or scenario artifact.`
  - status: adopted
- id: F8
  - severity: high
  - class: ambiguity
  - summary: `Evaluate-all fallback lacked a diagnostic closure.`
  - evidence: `SelectorGraph can evaluate all without emitting fallbackKind.`
  - status: adopted
- id: F9
  - severity: medium
  - class: invalidity
  - summary: `New selector helper candidates such as `select.value(path)` are out of scope.`
  - evidence: `ReadQuery internalization and runtime/10 already freeze helper owner boundaries.`
  - status: adopted
- id: F10
  - severity: medium
  - class: ambiguity
  - summary: `Region ownership guidance included product-specific vocabulary.`
  - evidence: `Tabs, file trees, and command bars belong to product witness docs, not kernel contract.`
  - status: adopted

#### Counter Proposals

- id: CP1
  - summary: `T2: Selector-Input Precision Law + Core Projection Quality Route.`
  - why_better: `Deletes public no-arg host read, keeps a single selector-input gate, moves broad/dynamic classification to core, and keeps internal evidence terms out of public authoring language.`
  - overturns_assumptions:
    - A2
    - A5
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
    - F10
  - supersedes_proposals:
    - `T1`
  - dominance: `dominates`
  - axis_scores:
    - concept-count: `better`
    - public-surface: `strictly better`
    - compat-budget: `strictly better`
    - migration-cost: `higher implementation cost but no compatibility residue`
    - proof-strength: `strictly better`
    - future-headroom: `better`
  - status: adopted
- id: CP2
  - summary: `Diagnostic-only evidence public quarantine.`
  - why_better: `Keeps projection/dirty/read-topic nouns in internal diagnostics and proof matrices only.`
  - overturns_assumptions:
    - A4-public-wording
  - resolves_findings:
    - F4
  - supersedes_proposals:
    - `T1 public reader path`
  - dominance: `partial`
  - axis_scores:
    - concept-count: `better`
    - public-surface: `better`
    - compat-budget: `same`
    - migration-cost: `lower`
    - proof-strength: `same`
    - future-headroom: `better`
  - status: merged-into-CP1
- id: CP3
  - summary: `Projection fingerprint topic identity.`
  - why_better: `Prevents selectorId label collisions from sharing graph entries or external-store topics.`
  - overturns_assumptions:
    - A7
  - resolves_findings:
    - F6
  - supersedes_proposals:
    - `selectorId-as-topic-identity`
  - dominance: `partial`
  - axis_scores:
    - concept-count: `slightly higher internal`
    - public-surface: `same`
    - compat-budget: `better`
    - migration-cost: `medium`
    - proof-strength: `strictly better`
    - future-headroom: `better`
  - status: merged-into-CP1

#### Resolution Delta

- T1 was replaced by T2.
- Public no-arg host read is removed from terminal public contract.
- Core selector law owns precision quality and route decision.
- React host consumes route decisions.
- Public language is compressed to selector input, broad read, and dynamic selector fallback.
- `select.value(path)` and public object/struct descriptor remain rejected in this proposal.
- Control-plane obligations are layered by what check/startup/host harness can actually observe.

## Adoption

- adopted_candidate: `T2: Selector-Input Precision Law + Core Projection Quality Route`
- lineage:
  - `T1 initial draft`
  - `A1 Selector-Input Precision Law`
  - `A3 Hard Projection Gate Minimalism`
  - `combined ProjectionEvidence/quality/fingerprint corrections`
  - `A4 Descriptor-Only Canonical Host Read constraints`
- rejected_alternatives:
  - `T1 as written`
  - `public ReadQuery`
  - `React-owned strict gate`
  - `select.value(path)` in this proposal
  - `public object/struct projection descriptor`
  - `function selector as generated recipe`
- rejection_reason:
  - `Rejected alternatives either preserve broad public reads, add public surface, create second gate authority, or expand selector helper family without separate reopen.`
- dominance_verdict:
  - `T2 dominates T1 on public-surface, compat-budget, proof-strength, and Agent generation stability while preserving future selector-helper reopen surface.`
- freeze_record:
  - adopted_summary: `Terminal React read gate is `useSelector(handle, selector, equalityFn?)`; no public no-arg host read. Core selector law classifies precision and route. React consumes the route. Dirty and read paths share internal path-id authority. Diagnostics expose precision loss without making evidence terms public authoring concepts.`
  - kernel_verdict:
    - Ramanujan: `fewer public rules and fewer host concepts.`
    - Kolmogorov: `compresses T1 into selector input, core route, path-id overlap, and diagnostic quarantine.`
    - Godel: `removes second strict gate and public ReadQuery-adjacent noun drift.`
  - frozen_decisions:
    - `Public no-arg `useSelector(handle)` is not part of the terminal public React host contract.`
    - `Public authoring concept is selector input.`
    - `Core selector law owns precision quality and route decision.`
    - `React host cannot silently fall back to module topic for dynamic or broad reads.`
    - `Read-topic identity uses selector fingerprint, with selectorId retained as label.`
    - `Read and dirty paths normalize through one internal path-id authority.`
    - `Evaluate-all fallback is a default dev/test strict precision failure when it affects host projections.`
    - `Dirty-side precision loss is part of the same strict policy as read-side broad/dynamic fallback.`
    - `Runtime.check reports only static artifacts it can actually see.`
  - non_goals:
    - `No public ReadQuery.`
    - `No second React hook family.`
    - `No new public selector namespace.`
    - `No Playground-specific API.`
    - `No public object/struct descriptor in this contract.`
  - allowed_reopen_surface:
    - `fieldValue(path) naming/type-safety through runtime/10 reopen only.`
    - `public selector helper family through separate admission only.`
    - `host deep verification through verification-control-plane reopen only.`
  - proof_obligations:
    - `No-arg host read absent from public overload tests and docs.`
    - `Core precision classification covers exact, broad-root, broad-state, dynamic, debug, unknown.`
    - `React host consumes core route and cannot bypass dynamic/broad rejection.`
    - `Selector fingerprint prevents static shape collisions.`
    - `Dirty/read path-id overlap, dirty-side rejection, and evaluate-all fallback rejection are covered.`
  - delta_from_previous_round:
    - `T1 broadened evidence into public concepts; T2 quarantines evidence terms internally and hardens the public read gate.`

## Consensus

### Converge Round 1

- result:
  - two reviewers returned `无 unresolved findings`.
  - one reviewer found a remaining dirty-side strictness gap.
- unresolved_finding:
  - id: CF1
  - severity: high
  - class: invalidity
  - summary: `Dirty-side precision failure was diagnostic-visible but not default-failing under dev/test.`
  - evidence: `Proposal required dirty-all, missing path authority, and evaluate-all fallback to be reported, but did not freeze default failure semantics.`
  - status: adopted
- resolution_delta:
  - `Proposal now freezes dirty-side precision loss as default dev/test failure when it affects host projections.`
  - `Dirty-all, missing path authority, unmapped write path, unsafe coarse dirty root, and evaluate-all fallback reject by default unless explicitly marked internal debug/resilience.`
  - `Business witnesses now require dirty precision loss to reject under dev/test.`

### Updated Freeze Record Delta

- frozen_decisions_added:
  - `Dirty-side precision loss is part of the same strict precision policy as read-side broad/dynamic fallback.`
  - `Dirty-all, missing path authority, unmapped write path, unsafe coarse dirty root, and evaluate-all fallback reject under default dev/test policy when they affect host projections.`
  - `Diagnostic-only dirty fallback is insufficient for terminal guardrails.`
- proof_obligations_added:
  - `Dirty-side precision failures have dev/test rejection tests.`
  - `Internal debug/resilience dirty fallback requires explicit marker and structured diagnostics.`

### Final Converge Round

- result:
  - all final reviewers returned `无 unresolved findings`.
  - CF1 is closed.
- residual_risk:
  - `Implementation must prevent internal debug/resilience markers from becoming a broad public escape hatch.`
  - `Source-marked inferred dirty evidence must not become an Agent-friendly coarse write workaround.`
  - `Performance cost of selector fingerprinting, path-id authority, fallback diagnostics, and dev/test rejection must be measured with the proposal matrix.`

### Final Status

- consensus_status: `achieved`
- adopted_candidate: `T2: Selector-Input Precision Law + Core Projection Quality Route`
- final_proposal: `docs/review-plan/proposals/2026-04-30-kernel-projection-dirty-evidence-terminal-contract.md`

## External Review Absorption

### Input

- source: `external LLM review provided by user`
- verdict: `倾向采纳 T2，但落地前要补一轮 SSoT cutover 和边界收紧`

### Accepted Corrections

- active SSoT cutover must happen before implementation.
- public `useSelector(handle)` must be removed from terminal public contract, not merely hidden from canonical examples.
- writeback targets include runtime authoring, selector type-safety ceiling, frozen API shape, React README, test-dts, skills, and previous Playground fanout proposal.
- implementation must start from a core internal route API.
- React host must stop owning a parallel `selectorTopicEligible` decision after core route exists.
- selector fingerprint must include path-authority digest or epoch.
- debug/resilience marker must stay internal-only and must not appear in public types, root exports, README snippets, or Agent generation material.

### Cutover Delta

- `docs/ssot/runtime/01-public-api-spine.md`: terminal React read gate narrowed to `useSelector(handle, selector, equalityFn?)`.
- `docs/ssot/runtime/02-hot-path-direction.md`: selector route, fingerprint, path-authority, dirty/read overlap, and fallback policy added to hot-path reopen triggers.
- `docs/ssot/runtime/03-canonical-authoring.md`: no-arg host read removed from canonical generated read rule.
- `docs/ssot/runtime/09-verification-control-plane.md`: check/startup/scenario layering corrected so host projection precision only enters through explicit artifacts or host harness evidence.
- `docs/ssot/runtime/10-react-host-projection-boundary.md`: core route ownership, selector fingerprint, strict failure, internal-only debug marker, and public overload deletion proof added.
- `docs/ssot/runtime/13-selector-type-safety-ceiling-matrix.md`: no-arg host read marked outside terminal public contract.
- `docs/ssot/capability/03-frozen-api-shape.md`: no-arg React snapshot example removed from frozen public shape.
- `docs/standards/logix-api-next-guardrails.md`: no-arg host read and React-owned route decision rejected.
- `packages/logix-react/README.md`: examples converted to selector-input reads.
- `skills/logix-best-practices/references/*`: Agent generation and diagnostics gates updated.
- `docs/review-plan/proposals/2026-04-30-playground-render-fanout-selector-closure.md`: superseded on kernel selector law by T2.

### Implementation Order Freeze

1. core precision record and route decision.
2. selector fingerprint topic identity with path-authority digest or epoch.
3. React host consumes the core route and removes parallel route eligibility logic.
4. dirty-side fallback strict gate.
5. public no-arg overload deletion and type-level witnesses.
6. active docs, README, generated recipe, example, and skill sweep.
