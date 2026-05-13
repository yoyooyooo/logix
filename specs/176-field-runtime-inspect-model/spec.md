# Feature Spec: Field Runtime Inspect Model

**Feature Branch**: `176-field-runtime-inspect-model`
**Created**: 2026-05-04
**Status**: Done

## Role

176 implements the field-runtime inspect foundation required by [Runtime Inspect Evidence Contract](../../docs/ssot/runtime/18-runtime-inspect-evidence-contract.md).

It owns field semantics and supplies field event payloads that join with runtime-live operation ledger envelopes from [175](../175-runtime-live-operation-ledger/spec.md).

176 does not make field-kernel a public authoring family. It turns internal compiled field assets into bounded runtime inspect facts.

## Imported Authority

- Owner law: [../../docs/ssot/runtime/18-runtime-inspect-evidence-contract.md](../../docs/ssot/runtime/18-runtime-inspect-evidence-contract.md)
- Implementation umbrella: [../173-runtime-inspect-evidence-end-state/spec.md](../173-runtime-inspect-evidence-end-state/spec.md)
- Runtime-live ledger foundation: [../175-runtime-live-operation-ledger/spec.md](../175-runtime-live-operation-ledger/spec.md)
- Field kernel boundary: [../../docs/ssot/runtime/06-form-field-kernel-boundary.md](../../docs/ssot/runtime/06-form-field-kernel-boundary.md)
- Field declaration cutover: [../../docs/adr/2026-04-12-field-kernel-declaration-cutover.md](../../docs/adr/2026-04-12-field-kernel-declaration-cutover.md)
- 172 route closure ledger: [../172-agent-first-runtime-inspect-data-plane/parity-matrix.md](../172-agent-first-runtime-inspect-data-plane/parity-matrix.md)

## Target

Field-runtime inspect model must provide owner-backed facts for:

- final field list
- field identity digest
- field graph semantic adjacency
- latest field summary
- field convergence summary
- field semantic metadata payload

Field event output uses a two-layer contract:

- 175 owns event envelope, order, watermark and join key.
- 176 owns field semantic payload, digest and source.

## Current Implementation That Must Yield

`packages/logix-core/src/internal/runtime/core/ModuleFields.ts` already produces a finalized field snapshot with digest and provenance. This is a good input for final field list and field identity digest.

`packages/logix-core/src/internal/debug-api.ts` exposes `getModuleFinalFields` and field program debug views. Those helpers may remain repo-internal support, but they cannot be the terminal inspect owner if they expose raw field program, raw graph or plan objects.

`packages/logix-core/src/internal/field-kernel/build.ts` currently builds `FieldGraph` nodes, edges, resources and plan steps. These are internal compiler assets. Inspect output must project them into semantic adjacency and summaries instead of exporting raw nodes, raw edges, step ids or resource handles.

`packages/logix-react/src/internal/dev/liveBrowserAdapter.ts` currently returns structured gaps for field inspect sections. 176 may replace those gaps with owner-backed projections, but the browser adapter remains a carrier.

172 field routes are already closed as owner-backed-or-gap. 176 can fill owner payloads behind those routes without reopening 172.

## Field Identity Law

Field identity is stable only when the owner can derive it from:

- live target coordinate
- module id
- finalized field path
- field snapshot digest
- owner-approved provenance digest when available

Field identity digest must not include object identity, closure identity, runtime handle identity, array index without row identity, random id or process timestamp.

When stable identity is missing, output must degrade or gap. It must not synthesize a temporary field id.

Allowed identity gap codes include:

- `missing-field-owner-projection`
- `missing-field-identity`
- `field-identity-unstable`
- `field-identity-over-budget`

## Final Field List Projection

Final field list is target-scoped and derived from finalized runtime field snapshot.

Each field row may include:

- field path
- field identity digest
- display name when available
- bounded description when available
- provenance summary or artifact ref
- behavior summary
- degraded marker

The projection must not expose evaluator functions, field declaration objects, runtime internals, `SubscriptionRef`, resource handles or raw owner-local compiler objects.

## Semantic Adjacency Projection

Field graph inspect must output semantic adjacency, not raw graph nodes or raw edges.

Allowed adjacency facts include:

- source field path
- target field path
- relation kind
- relation digest
- evidence source ref
- scheduling summary when available
- degraded marker

Relation kinds should describe semantics instead of implementation shape, such as:

- `derives-from`
- `refresh-depends-on`
- `validates-with`
- `mirrors`
- `external-sync`
- `writes-error`

Internal graph ids, plan step ids and raw `from/to` edge records must not be the inspect payload shape.

If the owner cannot prove stable field identity for either side, semantic adjacency must return a structured gap or degraded relation.

## Field Summary And Convergence Summary

Latest field summary is a target-scoped current projection. It can include:

- field count
- changed field count when available
- degraded reason counts
- top bounded convergence causes
- latest field snapshot digest
- latest ledger watermark ref when supplied by 175

Field convergence summary owns semantic field payload only. Runtime event envelope, order and watermark remain 175 facts.

Summary output must not claim timeline truth or historical stateAfter truth.

## Field Event Semantic Payload

Field event metadata uses 175 ledger envelope plus 176 semantic payload.

176-owned payload may include:

- field path
- field identity digest
- semantic event kind
- relation digest when relevant
- convergence cause summary
- field snapshot digest
- source ref
- degraded/redaction markers

175-owned envelope remains the source for target coordinate, `txnSeq`, `opSeq`, `linkId`, watermark and ordering.

If ledger envelope is missing, 176 can still expose latest field projections, but field event metadata must return a join gap.

Allowed join gap codes include:

- `missing-field-event-meta`
- `missing-ledger-envelope`
- `field-event-join-mismatch`

## Runtime And Owner Boundaries

Field-runtime owns semantic field facts.

Runtime-live ledger owns causal event envelope.

Reflection owns manifest/action/schema binding facts.

React host owns host evidence payloads only after future promotion.

Canonical evidence packages field facts and gaps. It cannot redefine field identity, adjacency or convergence truth.

CLI, daemon, browser adapter and Workbench are carriers or consumers only.

## Budget, Redaction And Cleanup

Field inspect projections must be bounded and JSON-safe.

Field inspect projections must be target-scoped, lazy or explicitly requested. Runtime must not build final field lists, semantic adjacency maps or convergence summaries merely because live targets exist.

Large field lists, adjacency maps and convergence summaries must use budgeted truncation, artifact refs or degraded markers. The first response surface should preserve stable counts, digests, owner code and artifact refs even when full payloads are too large.

Field summaries must be target-scoped and cleaned with runtime target lifecycle.

When field inspect is disabled, runtime must not allocate field inspect projection payloads.

Projection caches, if introduced, are owner-side derived caches. They must expire with target lifecycle and must not outlive the owner snapshot they summarize.

Carriers must not retain raw field programs, full graph assets or full summaries as authority. Browser adapter, daemon, CLI and Workbench may lease bounded payloads or artifact refs only.

Redaction markers from field-runtime must be preserved through carriers and canonical evidence export.

## Implementation Granularity

176 is planned for a high-intelligence implementation Agent. The spec freezes owner law, public absence, field identity law, budget rules, cleanup rules and proof obligations.

It intentionally does not freeze pseudo-code, exact data-structure choice or digest algorithm. Those choices may vary during implementation if they preserve deterministic identity, bounded output, disabled-allocation proof, JSON-safe output and owner separation from 175.

Exact implementation contracts are required only if implementation discovers ambiguity in wire shape, DTO fields, join keys, lifecycle ownership, persistence format or performance measurement method.

## User Scenarios & Testing

### User Story 1 - Inspect Final Fields (Priority: P1)

As an Agent, I can request final fields for a live target and receive stable field paths with identity digests.

**Independent Test**: Start a target with compiled field declarations, request `inspect.fields`, and verify field paths, identity digests, snapshot digest and provenance summaries are stable.

### User Story 2 - Inspect Semantic Field Graph (Priority: P1)

As a debugger, I can understand why a field changed through semantic adjacency instead of raw graph internals.

**Independent Test**: Build computed, source and validation relations, request `inspect.fieldGraph`, and verify relation kinds and digests without raw node/edge payloads.

### User Story 3 - Inspect Latest Field Summary (Priority: P2)

As an Agent, I can request a latest field summary for a target and understand field convergence status without reading logs.

**Independent Test**: Run field convergence activity, request `inspect.fieldSummary`, and verify field count, digest, bounded convergence causes and degraded markers.

### User Story 4 - Join Field Events With Ledger Envelope (Priority: P2)

As a timeline consumer, I can join field semantic payloads with runtime-live ledger envelopes through target and link refs.

**Independent Test**: Feed a ledger event with `txnSeq / opSeq / linkId` and a field semantic payload, then verify the exported field event metadata keeps ledger envelope and field payload ownership separate.

## Functional Requirements

- **FR-001**: The system MUST provide owner-backed final field list projection for live targets.
- **FR-002**: Final field list MUST include stable field identity digest or a structured identity gap.
- **FR-003**: Field identity digest MUST avoid random, timestamp, closure, runtime handle or process-global identities.
- **FR-004**: Field graph inspect MUST output semantic adjacency, not raw graph nodes or raw edges.
- **FR-005**: Semantic adjacency MUST include relation kind, relation digest and source ref when available.
- **FR-006**: Missing stable identity in adjacency MUST degrade or gap instead of synthesizing ids.
- **FR-007**: Latest field summary MUST be target-scoped and bounded.
- **FR-008**: Field convergence summary MUST own only field semantic payload, not ledger envelope.
- **FR-009**: Field event metadata MUST join with 175 ledger envelope through target, watermark or link refs.
- **FR-010**: Missing ledger envelope for field events MUST emit a structured join gap.
- **FR-011**: Field inspect output MUST NOT expose raw field program, raw graph, evaluator closures, `SubscriptionRef` or resource handles.
- **FR-012**: Field summary buffers or cached projections MUST clean up with target lifecycle.
- **FR-013**: Canonical evidence export MUST package field facts without redefining field truth.
- **FR-014**: CLI, daemon, browser adapter and Workbench MUST NOT own field identity, adjacency or convergence truth.
- **FR-015**: Live output MUST NOT contain verification verdict fields.
- **FR-016**: Field event metadata MUST emit a join gap when the 175 ledger envelope is missing, mismatched or cannot prove ordering ownership.
- **FR-017**: Carrier outputs MUST preserve field-runtime degraded and redaction markers without rewriting their owner or code.

## Non-Functional Requirements

- **NFR-001**: Field inspect projections MUST be JSON-safe and bounded.
- **NFR-002**: Disabled field inspect MUST not allocate field list, adjacency or summary payloads.
- **NFR-003**: Field identity and relation digests MUST be deterministic for snapshot comparison.
- **NFR-004**: Large field graphs MUST use artifact refs, truncation or degraded markers.
- **NFR-005**: Public surface sweep MUST show no new public field helper family or inspect root.
- **NFR-006**: Field list, adjacency and summary projections MUST be target-scoped and lazy or explicitly requested.
- **NFR-007**: Projection caches MUST be lifecycle-cleaned and MUST NOT retain raw field program, raw graph or runtime handles as authority.
- **NFR-008**: Disabled field inspect proof MUST cover payload allocation, projection cache allocation and carrier retention.

## Key Entities

- **FieldRuntimeInspectModel**: Owner-side field inspect projection layer.
- **FieldIdentityDigest**: Stable digest for a field within a target and field snapshot.
- **FinalFieldProjection**: Bounded target-scoped list of final fields.
- **FieldSemanticAdjacency**: FieldPath-keyed semantic relation projection.
- **FieldSummaryProjection**: Latest field and convergence summary for one target.
- **FieldSemanticEventPayload**: Field-owned semantic payload joined to a 175 ledger envelope.
- **FieldInspectGap**: Field-runtime owned structured gap for missing or degraded field facts.

## Success Criteria

- **SC-001**: `inspect.fields` returns final field paths with stable identity digests for a compiled target.
- **SC-002**: `inspect.fieldGraph` returns semantic adjacency and contains no raw graph node or raw edge payload shape.
- **SC-003**: Missing field identity degrades or gaps instead of synthesizing ids.
- **SC-004**: `inspect.fieldSummary` returns target-scoped latest summary or owner-coded structured gaps.
- **SC-005**: Field event metadata joins with 175 ledger envelope while preserving separate ownership.
- **SC-006**: Field projections are cleaned with target lifecycle and do not expose stale summaries.
- **SC-007**: Canonical evidence packages field refs without redefining field identity or adjacency truth.
- **SC-008**: Text sweep finds no forbidden public roots, planning-only code names or second-truth language in the 176 surface.
- **SC-009**: Disabled field inspect produces no field projection payload, cache or carrier-retained owner data.
- **SC-010**: Over-budget field payloads preserve counts, digest, owner gap code and artifact refs without leaking raw graph/runtime objects.

## Reopen Rules

Reopen 176 if:

- finalized field snapshot cannot provide stable field identity
- semantic adjacency cannot be projected without exposing raw graph internals
- field event metadata needs to own ledger ordering or watermark
- disabled overhead requires always-on field projection buffers
- Form/domain field semantics require a separate owner law before field-runtime inspect can close
