# Feature Spec: Runtime Inspect Evidence End State

**Feature Branch**: `173-runtime-inspect-evidence-end-state`
**Created**: 2026-05-04
**Status**: Done

## Role

173 is the implementation umbrella for [Runtime Inspect Evidence Contract](../../docs/ssot/runtime/18-runtime-inspect-evidence-contract.md). It does not own long-term runtime inspect evidence law. It sequences foundation specs, records gates, and prevents 172 from growing into a future roadmap.

173 is successful only if it closes `174/175/176`, promotes only eligible dependent rows, and keeps their shared laws imported from SSoT 18.

## Target

Move post-172 work from route/gap closure to live runtime evidence and causal debug records.

The implementation sequence must preserve:

- route closure from 172
- owner law from SSoT 18
- CLI grammar and transport envelope from SSoT 15
- no Runtime fact ownership in CLI, daemon, browser adapter, Workbench or canonical evidence

## Authority

- Long-term owner law: [../../docs/ssot/runtime/18-runtime-inspect-evidence-contract.md](../../docs/ssot/runtime/18-runtime-inspect-evidence-contract.md)
- CLI grammar and envelope: [../../docs/ssot/runtime/15-cli-agent-first-control-plane.md](../../docs/ssot/runtime/15-cli-agent-first-control-plane.md)
- 172 route closure: [../172-agent-first-runtime-inspect-data-plane/parity-matrix.md](../172-agent-first-runtime-inspect-data-plane/parity-matrix.md)
- Review ledger: [../../docs/review-plan/runs/runtime-inspect-end-state-contract-20260504.md](../../docs/review-plan/runs/runtime-inspect-end-state-contract-20260504.md)

## Scope

173 coordinated three foundation specs:

- [../174-reflection-live-binding-model/spec.md](../174-reflection-live-binding-model/spec.md)
- [../175-runtime-live-operation-ledger/spec.md](../175-runtime-live-operation-ledger/spec.md)
- [../176-field-runtime-inspect-model/spec.md](../176-field-runtime-inspect-model/spec.md)

173 promoted this dependent row after its gates passed:

- [../177-runtime-inspect-timeline-projection/spec.md](../177-runtime-inspect-timeline-projection/spec.md)

Post-173 coverage promotion created these follow-up specs without reopening 173:

- [../178-runtime-summary-projection/spec.md](../178-runtime-summary-projection/spec.md)
- [../179-debug-event-source-bridge/spec.md](../179-debug-event-source-bridge/spec.md)

173 keeps these as dependent backlog rows:

- React host evidence owner
- local profiler owner

## Dependency Order

The default order is:

1. `174` reflection live binding model.
2. `175` runtime-live operation ledger.
3. `176` field-runtime inspect model.
4. dependent backlog promotion review.
5. `177` runtime inspect timeline projection.

Rationale:

- `174` closes the P0 binding risk and is narrower than the ledger work.
- `175` freezes the causal envelope, event coordinate, watermark and stateAfter source law that later projections must consume.
- `176` depends on the ledger envelope for field event output while retaining field semantic ownership.

`176` may be planned in parallel with `175`, but field event metadata cannot be frozen until `175` defines the ledger envelope and join law.

## Foundation Entry Gates

`174` may enter implementation when:

- it imports SSoT 18 instead of redefining binding law
- it identifies all live binding producer paths, including React dev lifecycle and direct runtime binding
- it defines matched, missing, stale and mismatch binding outcomes
- it defines no-mutation dispatch denial cases

`175` may enter implementation when:

- it imports SSoT 18 coordination law
- it identifies the event envelope write point
- it defines disabled-overhead strategy before adding buffers
- it defines target lifecycle cleanup
- it defines latest-state versus historical stateAfter separation

`176` may enter implementation when:

- it imports SSoT 18 field ownership law
- it identifies field program to live target binding
- it defines semantic adjacency output shape without raw graph identity
- it defines how field semantic payload joins ledger envelope
- it defines missing identity degradation

## Foundation Exit Gates

Each foundation spec exits only after it records:

- owner-side budget, redaction and degraded behavior
- memory cap and cleanup proof for owner indexes or buffers
- disabled-overhead proof
- disabled-allocation proof
- target identity and lifecycle cleanup
- canonical evidence export derivation
- structured gap owner/code/reopen bar
- no verification verdict fields in live output
- text sweep for forbidden public surfaces and planning-only names

`174` additionally exits only after canonical dogfood target returns matched binding and dispatch admission uses the same binding fact.

`174` must also prove indexed or bounded action lookup for large manifests, no projection allocation when live inspect is disabled, and cleanup of binding indexes with target or manifest lifecycle.

`175` additionally exits only after event window is target-scoped, diagnostics/process envelopes are owner-backed, current state is not used as historical stateAfter and ledger cleanup follows target lifecycle.

`175` must also prove per-target retention limits, overflow/dropped-event behavior, disabled diagnostics/process allocation behavior and carrier queue lifecycle cleanup.

`176` additionally exits only after field graph uses semantic adjacency, field event metadata uses ledger envelope plus field semantic payload and missing field identity degrades or gaps.

`176` must also prove target-scoped lazy projection, disabled allocation for payloads/caches/carrier retention, lifecycle cleanup for derived field caches, bounded over-budget field payload behavior and carrier preservation of field-runtime degraded/redaction markers.

## Backlog Promotion Results

Timeline projection was promoted to [177-runtime-inspect-timeline-projection](../177-runtime-inspect-timeline-projection/spec.md) because:

- `175` records stateAfter refs or watermark law
- `176` supplies field event semantic payloads
- latest-state backfill remains forbidden and tested
- the promoted scope is limited to timeline query/output projection and does not redefine ordering, watermark, stateAfter or field semantic ownership

Post-177 coverage review promoted [178-runtime-summary-projection](../178-runtime-summary-projection/spec.md) and [179-debug-event-source-bridge](../179-debug-event-source-bridge/spec.md) because the then-remaining structured gaps split into two separable contracts:

- summary composition over already promoted 175 operation windows and 176 field summaries
- diagnostic/process source plumbing into 175 read-time ledger normalization

This post-173 promotion does not reopen 173 because 173's original foundation and timeline promotion gates remain closed.

179 closure leaves the Runtime Inspect Coverage Harness at 17 owner-backed, 0 structured-gap, 2 deferred and 2 rejected fact families. The only remaining backlog rows are React host evidence owner and local profiler owner, and both stay gated by SSoT 18 reopen bars rather than being promoted automatically.

React host evidence remains deferred. It may be promoted only after:

- ledger link rules are stable
- host evidence cannot become Runtime truth
- selector/render identity has disabled-overhead proof

Local profiler owner remains deferred. It may be promoted only after:

- local profiler owner exists
- authorization, budget and redaction rules are frozen
- profile artifacts only link to runtime facts through target/time/link refs

## Non-Goals

- Do not implement runtime code in 173.
- Do not redefine owner laws from SSoT 18.
- Do not allocate one spec per CLI command.
- Do not promote React host evidence or local profiler owner before their reopen bars pass.
- Do not let canonical evidence become a runtime evidence ledger.
- Do not move CLI grammar from SSoT 15 into 173.

## Success Criteria

- 174/175/176 are implemented and import SSoT 18 rather than redefining coordination law.
- Timeline projection is promoted to 177 after 175/176 gates close.
- Post-177 coverage gaps are split into 178 summary projection and 179 debug source bridge without reopening 173.
- 172 contains only a handoff link for post-172 owner work.
- SSoT 15 points to SSoT 18 for runtime inspect evidence owner law.
- specs index lists 173 and dependent specs under Live Runtime Evidence.
- React host evidence and local profiler owner remain deferred until their reopen bars pass.
- no new Runtime truth owner appears in CLI, daemon, browser adapter, Workbench or canonical evidence.
