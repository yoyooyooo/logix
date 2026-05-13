# Implementation Plan: Field Runtime Inspect Model

## Goal

Make field-runtime inspect model the owner-backed source for final field list, field identity, semantic adjacency, field summary and field semantic event payloads.

The implementation should reuse compiled field assets and finalized runtime snapshots, while removing raw graph/runtime-object leakage from inspect output.

## Technical Context

Likely core landing files:

- `packages/logix-core/src/internal/runtime/core/liveFieldInspect.ts`
- `packages/logix-core/src/internal/runtime/core/liveInspect.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleFields.ts`
- `packages/logix-core/src/internal/debug-api.ts`
- `packages/logix-core/src/internal/field-kernel/build.ts`
- `packages/logix-core/src/internal/runtime/core/liveLedger.ts`
- `packages/logix-core/src/internal/live-bridge-api.ts`

Likely carrier landing files:

- `packages/logix-react/src/internal/dev/lifecycleCarrier.ts`
- `packages/logix-react/src/internal/dev/liveBrowserAdapter.ts`
- `packages/logix-cli/src/internal/liveDaemonServer.ts`

Likely tests:

- `packages/logix-core/test/internal/LiveBridge/live-field-inspect.contract.test.ts`
- `packages/logix-core/test/internal/LiveBridge/live-field-graph.guard.test.ts`
- `packages/logix-core/test/internal/LiveBridge/live-field-summary.contract.test.ts`
- `packages/logix-core/test/internal/LiveBridge/live-field-ledger-join.contract.test.ts`
- `packages/logix-react/test/internal/dev/live-browser-adapter-inspect.contract.test.ts`
- `packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts`

## Authority Boundaries

Field-runtime owns:

- final field list
- field identity digest
- field semantic adjacency
- latest field summary
- field convergence summary
- field semantic metadata payload

It does not own:

- runtime ledger envelope, ordering or watermark
- reflection schema and action binding
- React host selector/render evidence
- profile payloads
- canonical evidence export envelope
- CLI/browser/daemon transport grammar

## Phase 1 - Field Inspect Projection Model

Add owner-side DTOs and projection helpers for field inspect.

Implementation requirements:

- Define `FieldRuntimeInspectModel`, `FieldIdentityDigest`, `FinalFieldProjection`, `FieldSemanticAdjacency`, `FieldSummaryProjection`, `FieldSemanticEventPayload` and `FieldInspectGap`.
- Keep projections JSON-safe and bounded.
- Return structured gaps for missing owner projection.
- Keep projection creation lazy or explicitly requested; do not populate field inspect payloads merely because a target is live.
- Export only repo-internal bridge APIs, no public authoring surface.
- Keep this phase at contract and proof level. Do not freeze a pseudo-code algorithm unless DTO shape, lifecycle ownership or budget measurement becomes ambiguous.

Expected landing files:

- `packages/logix-core/src/internal/runtime/core/liveFieldInspect.ts`
- `packages/logix-core/src/internal/runtime/core/liveInspect.ts`
- `packages/logix-core/src/internal/live-bridge-api.ts`

## Phase 2 - Field Identity Digest

Derive stable identity from finalized runtime field snapshot.

Implementation requirements:

- Use live target coordinate, module id, field path, field snapshot digest and provenance digest when available.
- Avoid object identity, closure identity, runtime handles, random ids and timestamps.
- Degrade or gap when field identity cannot be proven.
- Keep digest deterministic for snapshot comparison.

Expected landing files:

- `packages/logix-core/src/internal/runtime/core/ModuleFields.ts`
- `packages/logix-core/src/internal/runtime/core/liveFieldInspect.ts`
- `packages/logix-core/test/internal/LiveBridge/live-field-inspect.contract.test.ts`

## Phase 3 - Final Field List

Expose target-scoped final field list.

Implementation requirements:

- Read finalized snapshot through owner-approved runtime internals.
- Project field path, identity digest, name, description and provenance summary.
- Preserve field snapshot digest.
- Preserve stable counts and artifact refs when the full list is over budget.
- Do not expose raw declaration values, closures or runtime handles.
- Browser adapter and daemon only transport the owner projection.

Expected landing files:

- `packages/logix-core/src/internal/runtime/core/liveFieldInspect.ts`
- `packages/logix-react/src/internal/dev/lifecycleCarrier.ts`
- `packages/logix-react/src/internal/dev/liveBrowserAdapter.ts`
- `packages/logix-cli/src/internal/liveDaemonServer.ts`

## Phase 4 - Semantic Adjacency

Project compiled field graph and plan into semantic adjacency.

Implementation requirements:

- Convert internal graph and plan assets into fieldPath-keyed semantic relations.
- Use relation kinds such as `derives-from`, `refresh-depends-on`, `validates-with`, `mirrors`, `external-sync` and `writes-error`.
- Attach relation digest and source ref when available.
- Do not output raw node, raw edge, raw plan step or temporary graph ids.
- Emit degraded relation or structured gap when either side lacks stable field identity.
- Use bounded relation projection. Over-budget adjacency must degrade with counts, relation digests and artifact refs instead of retaining or emitting the full raw graph.

Expected landing files:

- `packages/logix-core/src/internal/runtime/core/liveFieldInspect.ts`
- `packages/logix-core/src/internal/field-kernel/build.ts`
- `packages/logix-core/test/internal/LiveBridge/live-field-graph.guard.test.ts`

## Phase 5 - Field Summary And Convergence

Expose latest field summary and convergence summary.

Implementation requirements:

- Project field count, changed field count when available, degraded reason counts and bounded top convergence causes.
- Include latest field snapshot digest.
- Join optional 175 ledger watermark refs without owning them.
- Return target-scoped gaps for missing latest summary.
- Clean cached summaries with target lifecycle.
- If summary projection caches are introduced, treat them as derived owner-side caches with explicit cleanup and no authority over raw field program or graph assets.

Expected landing files:

- `packages/logix-core/src/internal/runtime/core/liveFieldInspect.ts`
- `packages/logix-core/src/internal/runtime/core/liveInspect.ts`
- `packages/logix-core/test/internal/LiveBridge/live-field-summary.contract.test.ts`

## Phase 6 - Field Event Ledger Join

Join 176 semantic payload with 175 ledger envelope.

Implementation requirements:

- Keep field payload owner separate from ledger envelope owner.
- Join through target coordinate plus watermark or `linkId`.
- Emit `missing-field-event-meta`, `missing-ledger-envelope` or `field-event-join-mismatch` gaps when proof is missing.
- Do not make field-runtime own ordering or historical stateAfter.

Expected landing files:

- `packages/logix-core/src/internal/runtime/core/liveFieldInspect.ts`
- `packages/logix-core/src/internal/runtime/core/liveLedger.ts`
- `packages/logix-core/test/internal/LiveBridge/live-field-ledger-join.contract.test.ts`

## Phase 7 - Carrier And Evidence Proof

Replace field inspect carrier gaps with owner-backed payloads where available.

Implementation requirements:

- Browser adapter must call owner projection and transport artifacts.
- CLI/daemon must return field projection artifact refs or structured field-runtime gaps.
- Canonical evidence may package field refs and gaps only.
- Workbench consumes field facts as owner inputs or evidence gaps.
- Carriers must not retain raw field program, full graph, full summary or runtime handle payloads beyond the target lease.
- Carrier tests must prove owner markers are preserved and not rewritten by daemon, browser adapter, CLI or Workbench consumers.

Expected landing files:

- `packages/logix-react/src/internal/dev/liveBrowserAdapter.ts`
- `packages/logix-cli/src/internal/liveDaemonServer.ts`
- `packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts`
- existing canonical evidence packaging tests touched by live inspect output

## Phase 8 - Documentation Writeback

Update only owner facts that changed during implementation.

Required writebacks:

- Keep SSoT 18 as owner law unless implementation exposes a missing proof obligation.
- Keep 173 as umbrella; mark 176 implementation tasks complete there when implementation closes.
- Keep 172 as route closure and handoff only.
- Do not promote timeline until 175 and 176 gates pass.
- Do not reopen public field authoring surface.

## Planning Granularity

This plan targets a high-intelligence implementation Agent. It freezes owner boundaries, landing zones, required witnesses, proof obligations, performance and memory gates, and writeback targets.

It should not be expanded into line-by-line pseudo-code, exact data-structure algorithms or coding recipes unless a concrete ambiguity would otherwise let different implementers create incompatible DTOs, lifecycle behavior, wire contracts or proof measurements.

If such ambiguity appears, add a focused `implementation-details/*contract*.md` page for that narrow contract. Do not turn this plan into a second owner law.

## Performance And Memory Gates

Field inspect touches runtime owner data and must treat performance and memory as closure criteria.

Required gates:

- disabled field inspect allocates no field list, adjacency, summary projection, projection cache or carrier-retained field payload
- field list, adjacency and summary projection are target-scoped and lazy or explicitly requested
- large lists, graph projections and convergence summaries degrade with counts, digests, owner gap codes, truncation markers or artifact refs
- identity and relation digest generation is deterministic and does not use object identity, runtime handles, closures, random values or timestamps
- projection caches, if any, clean up with target lifecycle and cannot outlive the owner snapshot
- carriers preserve redaction/degraded markers and cannot become authority for full field programs, full graph assets or summaries
- field event joins gap when the 175 ledger envelope is missing, mismatched or cannot prove ordering ownership

## Verification Matrix

Focused implementation checks:

```text
rtk pnpm --filter @logixjs/core test -- --run test/internal/LiveBridge/live-field-inspect.contract.test.ts test/internal/LiveBridge/live-field-graph.guard.test.ts test/internal/LiveBridge/live-field-summary.contract.test.ts test/internal/LiveBridge/live-field-ledger-join.contract.test.ts
rtk pnpm --filter @logixjs/react test -- --run test/internal/dev/live-browser-adapter-inspect.contract.test.ts
rtk pnpm --filter @logixjs/cli test -- --run test/Integration/live-daemon-carrier.contract.test.ts
rtk pnpm typecheck
```

Text checks:

```text
rtk rg -n "Runtime\\.inspect|runtime\\.inspect|Runtime\\.devtools|runtime\\.devtools|Logix\\.Reflection" docs/ssot/runtime/18-runtime-inspect-evidence-contract.md specs/176-field-runtime-inspect-model packages/logix-core/src packages/logix-react/src packages/logix-cli/src
rtk rg -n "[C]LI.*owns|[d]aemon.*owns|[b]rowser adapter.*owns|[W]orkbench.*owns|[c]anonical evidence.*owns.*field|[c]anonical evidence.*owns.*Runtime" docs/ssot/runtime/18-runtime-inspect-evidence-contract.md specs/176-field-runtime-inspect-model
rtk rg -n "raw node|raw edge|SubscriptionRef|field-identity|FieldSemanticAdjacency|missing-field" specs/176-field-runtime-inspect-model packages/logix-core/src packages/logix-core/test packages/logix-react/test packages/logix-cli/test
```

## Exit Gates

176 exits only when:

- field graph uses semantic adjacency, not raw nodes or edges
- field event metadata uses ledger envelope plus field semantic payload
- missing field identity degrades or gaps instead of synthesizing ids
- field summary is target-scoped and lifecycle-cleaned
- disabled overhead is proven
- disabled allocation is proven for projection payloads, caches and carrier retention
- over-budget field payloads degrade through bounded summaries or artifact refs
- canonical evidence export derives from field facts only
- text sweep catches forbidden public roots and second-truth language

## Reopen Rules

Reopen the plan if:

- field identity cannot be made stable from finalized snapshot and target coordinate
- semantic adjacency cannot be projected without leaking raw compiler objects
- field event metadata needs to own 175 ordering or watermark facts
- disabled overhead cannot stay bounded without always-on field projection buffers
