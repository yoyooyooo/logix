# Implementation Plan: Live Diagnosis Evidence Closure

**Branch**: `187-live-diagnosis-evidence` | **Date**: 2026-05-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/187-live-diagnosis-evidence/spec.md`

## Summary

Close `logix live` as an Agent runtime diagnosis evidence lane:

```text
live start/status -> targets -> inspect/drilldown -> capture/snapshot/wait/dispatch/profile -> export evidence -> trial/compare
```

Implementation must let Agents discover live targets, inspect owner-backed facts or structured gaps, export canonical evidence, and feed that evidence into verification. Live output remains evidence/gap/operation output only and must not contain verification verdicts, repair hints, next-stage scheduling or primary report authority.

This plan explicitly excludes `trial --mode scenario`, `logix debug`, flat live roots, daemon-owned runtime truth, host adjunct evidence beyond refs or deferred ownership, and any live repair/verdict lane.

## Stage Role

- This file records execution constraints only.
- [spec.md](./spec.md) owns the 187 feature law.
- [CLI Agent First Control Plane](../../docs/ssot/runtime/15-cli-agent-first-control-plane.md) owns public live grammar and `LiveCommandResult`.
- [Runtime Inspect Evidence Contract](../../docs/ssot/runtime/18-runtime-inspect-evidence-contract.md) owns live inspect evidence owner law, coordination law, cost law and no-second-truth proof obligation.
- [Verification Control Plane](../../docs/ssot/runtime/09-verification-control-plane.md) owns verification report, repair and compare authority after evidence is consumed.
- Specs `171` through `180` own predecessor live carrier and owner-backed fact families.
- [185](../185-repair-intent-contract/spec.md) owns repair intent that can link back to live-derived evidence after verification consumes it.

Implementation must update this plan only if execution discovers a changed authority, gate or writeback target.

## Planning Granularity

This plan targets a high-intelligence implementation Agent.

It freezes owner boundaries, landing zones, phase order, witness set, proof obligations, performance and memory gates, and writeback targets. It intentionally avoids line-by-line algorithms.

No `implementation-details/*contract*.md` is required in 187. `LiveCommandResult`, live artifact families, canonical evidence package refs and Runtime inspect coordination law already own the exact handoff shapes.

## Technical Context

**Language/Version**: TypeScript 5.x, ESM.  
**Primary Dependencies**: `@logixjs/core`, `@logixjs/cli`, optional `@logixjs/react` dev live carrier only as existing carrier, Effect V4 baseline as used by the workspace.  
**Storage**: daemon/live retained artifacts only under existing target, lease, retention and outRoot budgets; no new persistent truth store.  
**Testing**: Vitest, CLI live integration tests, core LiveBridge tests, optional examples live dogfood proof when implementation touches carrier behavior.  
**Target Platform**: Node.js 20+ CLI/daemon and modern browser dev attachment where existing live carrier is involved.  
**Project Type**: pnpm workspace with `packages/logix-core`, `packages/logix-cli`, optional `packages/logix-react` carrier and examples proof.  
**Performance Goals**: disabled live inspect allocates no owner buffers, projection payloads or background collectors; enabled outputs are event/byte/retention/lease bounded and target-scoped.  
**Constraints**: CLI/daemon/browser/Workbench remain carriers or consumers, not fact owners; live output has no verdict, repair hints, next-stage scheduling or primary report output key.  
**Scale/Scope**: local Agent live diagnosis over one or more live targets with bounded evidence windows.

## Constitution Check

- SSoT first: 187 imports `15`, `18`, `09`, `171` through `180`, and `185`; changed live grammar or evidence law must be written back before closure.
- Runtime truth: owner-backed facts remain with runtime inspect owners; live CLI, daemon, browser adapter and Workbench are carriers/consumers.
- Verification boundary: repair hints and verdicts appear only after verification consumes exported evidence.
- Deterministic identity: target coordinate, attachment id, artifact refs, lease refs, operation refs and evidence refs must be stable.
- Transaction boundary: live dispatch admission and export must not perform IO inside runtime transaction windows.
- Performance/memory: disabled path must avoid owner buffers/background collectors; enabled path is bounded and lifecycle-cleaned.
- Forward-only: no flat live roots, no `logix debug`, no public debug namespace, no second evidence/report envelope.
- Single-track implementation: terminal closure uses current `logix live <task>` surface.

## Entry Gates

### Gate A: Planning Admission

Passed. [spec.md](./spec.md) answers:

- live evidence owner boundary
- in-scope live tasks and out-of-scope verdict/repair authority
- closure contract, must-cut list and reopen bar

### Gate B: Implementation Admission

Implementation can start only after these planning artifacts exist:

- [research.md](./research.md)
- [data-model.md](./data-model.md)
- [quickstart.md](./quickstart.md)
- [tasks.md](./tasks.md)
- [checklists/requirements.md](./checklists/requirements.md)

Implementation must not start if `discussion.md` later appears with `Must Close Before Implementation` items.

## Perf Evidence Plan

187 touches live diagnosis collection, target discovery, inspect projections, daemon retention and evidence export. It must include focused cost evidence.

Required evidence:

- Disabled-overhead witness: disabled live inspect allocates no owner buffers, projection payloads or background collectors.
- Bounded output witness: live outputs respect event, byte, retention and lease budgets and preserve redaction/degraded/dropped/gap markers.
- Cleanup witness: per-target owner indexes, buffers, daemon retained segments and lease material clean up with target or manifest lifecycle.
- No-second-truth witness: all live outputs exclude verification verdict, repair hints, next-stage scheduling and primary report fields.
- Evidence handoff witness: exported evidence can be consumed by trial or compare and repair hints link back from the verification report.

Full benchmark collection is required only if implementation changes always-on runtime transaction, operation ledger ingestion, selector subscription, live binding or daemon background collection behavior. If that happens, add focused perf artifacts under `specs/187-live-diagnosis-evidence/perf/` and document before/after command and result in [quickstart.md](./quickstart.md).

## Project Structure

### Documentation

```text
specs/187-live-diagnosis-evidence/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Likely Source Landing Zones

Core live evidence and inspect:

- `packages/logix-core/src/internal/live-bridge-api.ts`
- `packages/logix-core/src/internal/runtime/core/liveTypes.ts`
- `packages/logix-core/src/internal/runtime/core/liveInspect.ts`
- `packages/logix-core/src/internal/runtime/core/liveEvidence.ts`
- `packages/logix-core/src/internal/runtime/core/liveOperations.ts`
- `packages/logix-core/src/internal/runtime/core/liveTimeline.ts`
- `packages/logix-core/src/internal/runtime/core/liveSummary.ts`
- `packages/logix-core/src/internal/runtime/core/liveFieldInspect.ts`

CLI live carrier:

- `packages/logix-cli/src/internal/commands/live.ts`
- `packages/logix-cli/src/internal/liveResult.ts`
- `packages/logix-cli/src/internal/liveClient.ts`
- `packages/logix-cli/src/internal/liveDaemonServer.ts`
- `packages/logix-cli/src/internal/liveDaemonClient.ts`
- `packages/logix-cli/src/internal/liveDaemonOperatorSnapshot.ts`
- `packages/logix-cli/src/schema/commands.v1.json`

Optional existing React/browser carrier:

- `packages/logix-react/src/internal/dev/liveBrowserAdapter.ts`
- `packages/logix-react/src/internal/dev/lifecycleCarrier.ts`
- `packages/logix-react/src/dev/live.ts`

Proof:

- `packages/logix-core/test/internal/LiveBridge/**`
- `packages/logix-cli/test/Integration/live-namespace.contract.test.ts`
- `packages/logix-cli/test/Integration/live-command-result.contract.test.ts`
- `packages/logix-cli/test/Integration/live-inspect-routes.contract.test.ts`
- `packages/logix-cli/test/Integration/live-evidence-handoff.e2e.test.ts`
- `packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts`
- `packages/logix-cli/test/Integration/live-daemon-multitab.contract.test.ts`
- `packages/logix-core/test/internal/LiveBridge/runtime-inspect-coverage.harness.test.ts`
- `packages/logix-core/test/internal/LiveBridge/live-disabled-overhead.guard.test.ts`

Implementation may choose narrower files after reading current code. If a listed file is not needed, leave it untouched.

## Phase 0 - Research And Admission Confirmation

Output:

- [research.md](./research.md)

Required decisions:

- live remains evidence lane and never verification report authority
- `LiveCommandResult` is distinct from `CommandResult`
- owner-backed facts or owner-coded gaps are mandatory for inspect routes
- canonical evidence export is the only route from live diagnosis to repair reports
- daemon/browser/CLI/Workbench remain carriers or consumers
- no new exact contract file is needed because `15` and `18` own the shapes

## Phase 1 - Data Model And Quickstart

Outputs:

- [data-model.md](./data-model.md)
- [quickstart.md](./quickstart.md)

The model must name only stable coordination objects:

- Live Target Coordinate
- Live Inspect Artifact
- Canonical Evidence Package
- Evidence Gap
- Live Command Result
- Evidence Lease

The quickstart must show focused proof commands, disabled-overhead checks and forbidden-field sweeps.

## Phase 2 - Live Route And Result Boundary

Requirements:

- public route stays `logix live <task>`
- flat live roots and `logix debug` stay rejected
- live commands return `LiveCommandResult`, not `CommandResult`
- live outputs exclude verdict, repair hints, next-stage scheduling and primary report output key

## Phase 3 - Owner-Backed Inspect And Structured Gaps

Requirements:

- target discovery returns runtime, module, instance and attachment coordinates
- state/actions/events/timeline/fields/field graph/field summary/summary inspect routes return owner-backed facts or explicit structured gaps
- target-specific commands use discovered target coordinates
- timeline continuation uses opaque cursor tokens and safe owner-backed resume boundaries

## Phase 4 - Capture, Operation, Profile And Export Evidence

Requirements:

- capture/snapshot/wait/dispatch/profile summary produce live artifact families or gaps only
- mutation-capable dispatch uses declared action admission and structured denial without mutation on precondition failure
- evidence export preserves owner facts, gaps, redaction, degraded/dropped markers, artifact refs and lease provenance
- exported evidence feeds verification; repair hints come only from resulting verification reports

## Phase 5 - Cost, Retention And Cleanup

Requirements:

- disabled live inspect allocates no owner buffers, projection payloads or background collectors
- enabled outputs are bounded by event, byte, retention and lease budgets
- per-target indexes, buffers and retained segments clean up with target or manifest lifecycle
- daemon retained evidence never becomes daemon-owned truth

## Phase 6 - Proof And Writeback

Required witness set:

- public live route proof for status/targets/inspect/drilldown/capture/snapshot/wait/dispatch/profile/export
- forbidden verification-field schema proof
- owner-backed fact or structured gap proof
- evidence export to trial/compare and repair hint backlink proof
- disabled-overhead and cleanup proof
- runtime inspect coverage inventory proof

Verification matrix:

- `rtk pnpm --filter @logixjs/cli test -- --run test/Integration/live-namespace.contract.test.ts test/Integration/live-command-result.contract.test.ts test/Integration/live-inspect-routes.contract.test.ts`
- `rtk pnpm --filter @logixjs/cli test -- --run test/Integration/live-daemon-carrier.contract.test.ts test/Integration/live-daemon-multitab.contract.test.ts test/Integration/live-evidence-handoff.e2e.test.ts`
- `rtk pnpm --filter @logixjs/core test -- --run test/internal/LiveBridge/runtime-inspect-coverage.harness.test.ts test/internal/LiveBridge/live-disabled-overhead.guard.test.ts`
- `rtk pnpm --filter @logixjs/core test -- --run test/internal/LiveBridge/`
- `rtk rg -n "logix debug|logix status|logix capture|logix snapshot|LiveCommandResult.*verdict|LiveCommandResult.*repairHints|LiveCommandResult.*nextRecommendedStage|primaryReportOutputKey" packages/logix-cli/src packages/logix-cli/test docs/ssot skills/logix-cli specs/187-live-diagnosis-evidence`

Required writebacks:

- update `docs/ssot/runtime/15-cli-agent-first-control-plane.md` if public live grammar, live artifacts or schema mirror changed
- update `docs/ssot/runtime/18-runtime-inspect-evidence-contract.md` if live owner law, cost law or proof obligation changed
- update `docs/ssot/runtime/09-verification-control-plane.md` only if evidence handoff into verification changed
- update `specs/172-agent-first-runtime-inspect-data-plane/implementation-details/runtime-inspect-coverage-harness.md` and `notes/verification.md` if coverage inventory changes
- update `skills/logix-cli/SKILL.md` if Agent live consumption recipe changed
- update [quickstart.md](./quickstart.md), [spec.md](./spec.md), and [specs/README.md](../README.md) with final proof status after implementation

## Non-Goals

- Do not implement or plan `trial --mode scenario`.
- Do not add `logix debug` or flat live roots.
- Do not put verification verdicts, repair hints, next-stage scheduling or primary report output key in live output.
- Do not make daemon, browser adapter, CLI or Workbench a Runtime fact owner.
- Do not add raw runtime handles, raw field graph, source maps, AST indexes or task history as live fact truth.
- Do not make host adjunct evidence a 187-owned terminal feature; terminal host adjunct work belongs to 188.
