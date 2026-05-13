# Implementation Plan: Runtime Inspect Summary Projection

## Goal

Make `logix live summary` return owner-backed summary artifacts by composing 175 operation windows and 176 field summaries.

178 must keep summary as a projection/composition layer. It must not define a new runtime evidence owner.

## Authority Boundaries

178 owns:

- summary query normalization from existing live inspect payloads
- `LiveInspectArtifact(section="summary")` output shape
- composition completeness, truncation and projection gaps
- carrier proof that owner markers are preserved

178 does not own:

- 175 ledger envelope, ordering, watermark, retention or stateAfter law
- 176 field identity, field summary or field semantic payload law
- diagnostics/process producer source bridge
- React host evidence
- local profile payloads
- CLI grammar
- canonical evidence export envelope

## Likely Landing Files

Core:

- `packages/logix-core/src/internal/runtime/core/liveSummary.ts`
- `packages/logix-core/src/internal/runtime/core/liveInspect.ts`
- `packages/logix-core/src/internal/live-bridge-api.ts`

React carrier:

- `packages/logix-react/src/internal/dev/lifecycleCarrier.ts`
- `packages/logix-react/src/internal/dev/liveBrowserAdapter.ts`

CLI carrier:

- `packages/logix-cli/src/internal/liveDaemonServer.ts`

Tests:

- `packages/logix-core/test/internal/LiveBridge/live-summary-projection.contract.test.ts`
- `packages/logix-react/test/internal/dev/live-browser-adapter-inspect.contract.test.ts`
- `packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts`
- `packages/logix-core/test/internal/LiveBridge/runtime-inspect-coverage.harness.test.ts`

## Phase 1 - Summary Projection Model

Define owner-side summary DTOs and projection helpers.

Requirements:

- JSON-safe bounded output.
- Operation slice derives only from 175 `LiveOperationWindow`.
- Field convergence slice derives only from 176 field summary output.
- Missing slices emit owner-coded gaps independently.
- Output uses `LiveInspectArtifact(section="summary")`.

## Phase 2 - Operation And Field Composition

Project available 175 and 176 inputs into one summary payload.

Requirements:

- Preserve 175 order, watermark, dropped, degraded and redaction markers.
- Preserve 176 field-runtime owner, degraded and redaction markers.
- Do not fail the whole summary when one slice is missing.
- Do not backfill operation history from current latest state.
- Do not scan raw field graph or raw field program.

## Phase 3 - Budget And Cleanup

Keep summary lazy and bounded.

Requirements:

- Allocate summary payload only for explicit summary reads.
- Reuse request and owner budgets.
- Use truncation/degraded markers for over-budget output.
- No projection caches unless target-scoped and lifecycle-cleaned.

## Phase 4 - Carrier And Evidence Proof

Route `inspect.summary` through owner projection where available.

Requirements:

- Browser adapter calls owner projection and transports artifact only.
- Daemon continues to route existing `inspect.summary` operation without owning facts.
- Canonical evidence packages artifact refs and owner gaps only.
- Carrier tests prove owner markers and gaps are preserved.

## Phase 5 - Writeback

Required writebacks after implementation:

- Move `operation-summary` and `field-converge` from structured gap to owner-backed in `runtime-inspect-coverage.harness.test.ts`.
- Keep SSoT 18 as owner law unless implementation exposes a missing proof obligation.
- Keep SSoT 15 command grammar unchanged.
- Update `specs/178-runtime-summary-projection/tasks.md`.
- Keep React host evidence and local profiler owner deferred.

## Performance And Memory Gates

- disabled summary projection allocates no summary payloads, projection caches or carrier-retained owner data
- projection is target-scoped and explicitly requested
- large summaries degrade with counts, owner gap codes, truncation markers or artifact refs
- carriers preserve redaction/degraded markers and cannot retain unbounded owner windows or field summaries after response delivery

## Verification Matrix

```text
rtk pnpm --filter @logixjs/core test -- --run test/internal/LiveBridge/live-summary-projection.contract.test.ts test/internal/LiveBridge/runtime-inspect-coverage.harness.test.ts
rtk pnpm --filter @logixjs/react test -- --run test/internal/dev/live-browser-adapter-inspect.contract.test.ts
rtk pnpm --filter @logixjs/cli test -- --run test/Integration/live-daemon-carrier.contract.test.ts
rtk pnpm typecheck
rtk pnpm lint
```

Text checks:

```text
rtk rg -n "Runtime\\.inspect|runtime\\.inspect|Runtime\\.devtools|runtime\\.devtools|Logix\\.Reflection" docs/ssot/runtime/18-runtime-inspect-evidence-contract.md specs/178-runtime-summary-projection packages/logix-core/src packages/logix-react/src packages/logix-cli/src
rtk rg -n "[C]LI.*owns|[d]aemon.*owns|[b]rowser adapter.*owns|[W]orkbench.*owns|[c]anonical evidence.*owns.*summary|[c]anonical evidence.*owns.*Runtime" docs/ssot/runtime/18-runtime-inspect-evidence-contract.md specs/178-runtime-summary-projection
rtk rg -n "raw field|raw graph|SubscriptionRef|verification verdict|repairHints|time-travel|replay|render count|profile sample" specs/178-runtime-summary-projection packages/logix-core/src packages/logix-core/test packages/logix-react/test packages/logix-cli/test
```

## Exit Gates

178 exits only when:

- operation-summary is owner-backed from 175 operation windows
- field-converge is owner-backed from 176 field summary facts
- missing slices emit stable owner-coded gaps
- carrier and export proofs preserve owner markers
- disabled allocation, bounded projection and lifecycle cleanup are covered
- runtime inspect coverage records both rows as owner-backed

## Reopen Rules

Reopen the plan if summary projection needs a new owner law, a new public CLI grammar, React host evidence, profile payloads or raw field/runtime internals.
