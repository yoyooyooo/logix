# 171 Agent Live Runtime Bridge Batch 7 Plan Optimality Loop

## Meta

- `target`: `specs/171-agent-live-runtime-bridge`
- `targets`:
  - `specs/171-agent-live-runtime-bridge/spec.md`
  - `specs/171-agent-live-runtime-bridge/discussion.md`
  - `specs/171-agent-live-runtime-bridge/plan.md`
  - `specs/171-agent-live-runtime-bridge/research.md`
  - `specs/171-agent-live-runtime-bridge/implementation-details/evidence-facets.md`
  - `specs/165-runtime-workbench-kernel/spec.md`
  - `docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md`
- `source_kind`: `file-spec`
- `reviewers`: main agent synthesis plus parallel reviewer
- `round_count`: 1
- `challenge_scope`: `open`
- `consensus_status`: `consensus`

## Bootstrap

- `target_complete`: true
- `review_contract`:
  - `artifact_kind`: `ssot-contract`
  - `review_goal`: `design-closure`
  - `target_claim`: 171 should prepare bounded, comparable runtime evidence for future research loops while keeping metric families, candidate mutation, adoption policy, adoption ledgers, and autonomous operation outside 171 authority.
  - `non_default_overrides`:
    - `scope_fence`: challenge white-box decision/cost scope, minimal comparable fields, deferred AutoResearch concepts, performance/redaction limits, and SSoT authority.
    - `stop_condition`: `consensus`
    - `write_policy`: planning artifacts and SSoT docs may be updated; implementation code is out of scope.
- `review_object_manifest`:
  - `authority_target`: `specs/171-agent-live-runtime-bridge/spec.md`
  - `bound_docs`: `165`, `16`, `research.md`, `evidence-facets.md`
  - `derived_scope`: Batch 7 kernel researchability and AutoResearch readiness
  - `allowed_classes`: bounded metadata, comparable evidence fields, decision/cost families, evidence gaps, deferred list
  - `blocker_classes`: autonomous candidate mutation, adoption verdict, metric family authority, adoption ledger schema, 24h loop, merge/publish/release authority
  - `ledger_target`: this file
- `kernel_council`: `Ramanujan`, `Kolmogorov`, `Godel`
- `dominance_axes`: `concept-count`, `public-surface`, `compat-budget`, `migration-cost`, `proof-strength`, `future-headroom`
- `reopen_bar`: a later proposal must improve future measurement usefulness without adding adoption authority, second evidence truth, or hot-path tax.

## Findings

- `F-B7-001`
  - `severity`: `high`
  - `summary`: White-box decision scope risked becoming an unbounded internal trace system.
  - `evidence`: `discussion.md` listed candidate researchability families, including metrics and decision traces, while the later adopted direction keeps only evidence headers in 171.
  - `resolution`: freeze first-slice decision/cost families as bounded summaries only: attachment lifecycle, operation admission, capture budget/drop/redaction, selector route observation classification, transaction/operation count summary, producer drop summary, and evidence export size/duration summary.
  - `status`: `closed`
- `F-B7-002`
  - `severity`: `high`
  - `summary`: Comparable baseline/candidate fields were not defined.
  - `evidence`: Q171-013 remained open; `research.md` listed window, budget, sampling, degraded marker, environment fingerprint ref, stable coordinate ref, and evidence gap as direction only.
  - `resolution`: freeze minimal comparable fields: evidence run ref, environment fingerprint ref, source/build/manifest digest refs, target coordinate, window coordinate, budget profile, sampling config, stageClass/admissibility class, metric refs with units, proof command ref, degraded/dropped/redacted markers, and evidence gap list.
  - `status`: `closed`
- `F-B7-003`
  - `severity`: `blocker`
  - `summary`: AutoResearch deferred concepts needed a hard boundary.
  - `evidence`: AutoResearch pressure was useful, but 171 out of scope excludes autonomous adoption and full 24h loops.
  - `resolution`: explicitly defer candidate mutation, mutable candidate scope, immutable evaluation harness ownership, primary metric choice, adoption algebra, adoption ledger schema, autonomous adopt/discard, 24h loop, merge/publish/release, and SSoT rewrite authority.
  - `status`: `closed`
- `F-B7-004`
  - `severity`: `medium`
  - `summary`: Researchability metadata could violate redaction and hot-path budgets.
  - `evidence`: Batch 6 budget and redaction gates were required before implementation.
  - `resolution`: researchability capture is opt-in, bounded, cheap to omit, redaction-aware, and may emit evidence gaps instead of collecting costly or sensitive fields.
  - `status`: `closed`

## Adoption

- `adopted_candidate`: `C171-K Researchability Header Only`
- `summary`: 171 exposes only low-cost comparable evidence headers and evidence gaps needed to decide whether a future research loop can compare runs. It does not own metric families, decision trace families, experiment loops, adoption decisions, or autonomous operation.
- `dominance_verdict`:
  - `concept-count`: better, because no `ResearchabilitySignal`, `MetricBaseline`, `KernelDecisionTrace`, metric family, or decision trace family entity is added.
  - `public-surface`: same, because all fields stay internal evidence metadata.
  - `compat-budget`: same, because no public protocol is created.
  - `migration-cost`: better, because future loops can consume evidence without forcing 171 implementation to own adoption policy.
  - `proof-strength`: better, because comparability fields and gaps are explicit.
  - `future-headroom`: better, because future AutoResearch specs get stable inputs without inheriting live bridge authority.

### Freeze Record

- First-slice white-box families:
  - attachment lifecycle summary
  - operation admission summary
  - capture budget/drop/redaction summary
  - selector route observation classification
  - transaction and operation count summary
  - evidence producer drop summary
  - evidence export size and duration summary
- Minimal comparable evidence fields:
  - evidence run ref
  - environment fingerprint ref
  - source/build/manifest digest refs
  - target coordinate
  - window coordinate
  - budget profile
  - sampling config
  - stageClass or admissibility class
  - metric refs with units and owner
  - proof command ref
  - degraded, dropped, redacted markers
  - evidence gap list
- Deferred to future spec:
  - full experiment loop
  - candidate mutation
  - mutable candidate scope
  - immutable evaluation harness owner
  - primary metric selection
  - protected metric registry
  - adoption algebra
  - adoption ledger schema
  - autonomous adopt/discard
  - 24h loop operation
  - merge, publish, release
  - autonomous SSoT rewrite

## Proof Obligations

- Comparable evidence tests must show baseline and candidate packages can be checked for same target, window, budget, sampling, environment, digest, and proof command compatibility.
- Missing or sensitive fields must become evidence gaps or redaction markers.
- Workbench projection may display researchability header data as metric, degradation, drilldown, or gap nodes, but it cannot issue adoption verdicts.
- Negative sweep must classify remaining AutoResearch, adoption, metric, and loop vocabulary as deferred-only, history-only, or future-spec-only.
