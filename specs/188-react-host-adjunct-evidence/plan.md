# Implementation Plan: React Host Adjunct Evidence Closure

**Branch**: `188-react-host-adjunct-evidence` | **Date**: 2026-05-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/188-react-host-adjunct-evidence/spec.md`

## Summary

Close React host diagnosis blind spots as adjunct evidence only.

Implementation must admit enough selector/render boundary, interaction linkage, local profile summary and host lifecycle evidence to help Agents diagnose real UI symptoms, while preserving that Runtime owner facts win and React host evidence never owns runtime truth, verification verdicts, repair hints, compare truth or stage scheduling.

188 is the terminal adopted successor for the stopped standalone 182 direction. It does not revive 182 as an owner spec and does not add public host evidence commands or artifact kinds unless `15` and `18` are explicitly reopened.

This plan explicitly excludes `trial --mode scenario`, new `logix debug`, public host evidence route, second selector authority, browser HMR protocol expansion, replay, host-owned timeline ordering, host-owned stateAfter, host-owned field semantics and host-owned verification truth.

## Stage Role

- This file records execution constraints only.
- [spec.md](./spec.md) owns the 188 feature law.
- [React Host Projection Boundary](../../docs/ssot/runtime/10-react-host-projection-boundary.md) owns selector/render host law.
- [Runtime Inspect Evidence Contract](../../docs/ssot/runtime/18-runtime-inspect-evidence-contract.md) owns adjunct evidence admission, live owner law, cost law and no-second-truth proof obligation.
- [CLI Agent First Control Plane](../../docs/ssot/runtime/15-cli-agent-first-control-plane.md) owns public live grammar and public artifact route authority.
- [Verification Control Plane](../../docs/ssot/runtime/09-verification-control-plane.md) owns verification report, repair, compare and scheduling after evidence is consumed.
- [187](../187-live-diagnosis-evidence/spec.md) owns live diagnosis evidence closure that can carry host refs or gaps.
- [183](../183-agent-debug-closure/spec.md) remains the broader prior terminal diagnosis planning context; 188 narrows the terminal host adjunct requirement.

Implementation must update this plan only if execution discovers a changed authority, gate or writeback target.

## Planning Granularity

This plan targets a high-intelligence implementation Agent.

It freezes owner boundaries, landing zones, phase order, witness set, proof obligations, disabled cost gates, memory gates, and writeback targets. It intentionally avoids line-by-line algorithms.

No `implementation-details/*contract*.md` is required in 188 at planning time. Existing React host law, Runtime inspect coordination law and canonical evidence packaging own the exact handoff shapes. If implementation discovers a narrow host adjunct payload ambiguity, add a contract only after writing its owner-law impact back to [spec.md](./spec.md), this plan, `10` or `18`.

## Technical Context

**Language/Version**: TypeScript 5.x, ESM, React host tests where needed.  
**Primary Dependencies**: `@logixjs/core`, `@logixjs/react`, optional `@logixjs/cli` live evidence carrier, Effect V4 baseline as used by the workspace.  
**Storage**: target/attachment-scoped host buffers only when explicitly enabled; no permanent host truth store.  
**Testing**: Vitest, React host internal dev tests, core LiveBridge tests, CLI live/evidence handoff tests, optional examples production-bundle proof when public imports or dev carrier boundaries are touched.  
**Target Platform**: Modern browser dev host, Node.js 20+ test runner and CLI/daemon carrier.  
**Project Type**: pnpm workspace with `packages/logix-react`, `packages/logix-core`, `packages/logix-cli`, optional examples proof.  
**Performance Goals**: disabled host adjunct evidence allocates no host capture buffer and adds no render subscription fanout; collection performs no IO in runtime transaction windows; enabled evidence is memory/event/profile/byte bounded and lifecycle-cleaned.  
**Constraints**: adjunct-only authority, runtime truth wins, no second selector authority, no public debug namespace, no public host artifact kind by default.  
**Scale/Scope**: local Agent diagnosis for React host symptoms linked to runtime targets and operation refs.

## Constitution Check

- SSoT first: 188 imports `10`, `18`, `15`, `09`, `158`, `180`, `182`, `183` and `187`; changed host or live owner law must be written back before closure.
- Runtime truth: host adjunct evidence supplements runtime owner facts only and cannot override them.
- React host law: selector evidence references core route identity, selector fingerprint or diagnostic label only; render evidence references render boundary or host harness refs only.
- Verification boundary: host evidence cannot contain verdicts, repair hints, next-stage scheduling or compare truth.
- Deterministic identity: linkage uses target coordinate, attachment id, txnSeq, opSeq, linkId, artifact refs, gaps, redaction and degraded markers.
- Transaction boundary: host evidence collection cannot perform IO inside runtime transaction windows.
- Performance/memory: disabled mode has no capture buffer or render subscription fanout; enabled mode is bounded and cleanup-proven.
- Forward-only: no standalone 182 revival, no public debug namespace, no new public host evidence route by default.
- Single-track implementation: direct terminal adjunct evidence admission over current live/evidence lanes.

## Entry Gates

### Gate A: Planning Admission

Passed. [spec.md](./spec.md) answers:

- host adjunct evidence owner boundary
- in-scope host evidence families and out-of-scope verification truth
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

188 touches React render/selector boundaries and local profile collection, so focused performance and memory evidence is mandatory.

Required evidence:

- Disabled-overhead witness: no host capture buffer, no extra render subscription fanout and no transaction-window IO when adjunct evidence is disabled.
- Enabled-budget witness: local profile summary and host evidence are bounded by event, memory, profile and byte budgets.
- Cleanup witness: host buffers, linkage indexes and profile summaries clean up with target or host lifecycle.
- Conflict witness: runtime truth wins when host evidence disagrees, and disagreement is structural.
- Bundle boundary witness: if public imports or dev carrier boundaries change, production business imports do not pull host adjunct/live/debug carrier modules.

Full benchmark collection is required only if implementation changes always-on selector subscription behavior, RuntimeProvider render behavior, transaction hot paths or production import reachability. If that happens, add focused perf artifacts under `specs/188-react-host-adjunct-evidence/perf/` and document before/after command and result in [quickstart.md](./quickstart.md).

## Project Structure

### Documentation

```text
specs/188-react-host-adjunct-evidence/
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

React host adjunct carrier:

- `packages/logix-react/src/internal/dev/liveBrowserAdapter.ts`
- `packages/logix-react/src/internal/dev/lifecycleCarrier.ts`
- `packages/logix-react/src/internal/provider/RuntimeProvider.tsx`
- `packages/logix-react/src/internal/hooks/**`
- `packages/logix-react/src/internal/store/**`
- `packages/logix-react/src/dev/live.ts`

Core live evidence and coordination:

- `packages/logix-core/src/internal/runtime/core/liveEvidence.ts`
- `packages/logix-core/src/internal/runtime/core/liveOperations.ts`
- `packages/logix-core/src/internal/runtime/core/liveInspect.ts`
- `packages/logix-core/src/internal/runtime/core/liveTypes.ts`
- `packages/logix-core/src/internal/live-bridge-api.ts`

CLI/daemon carrier:

- `packages/logix-cli/src/internal/liveResult.ts`
- `packages/logix-cli/src/internal/liveDaemonServer.ts`
- `packages/logix-cli/src/internal/commands/live.ts`

Proof:

- `packages/logix-react/test/internal/dev/**`
- `packages/logix-react/test/RuntimeProvider/**`
- `packages/logix-core/test/internal/LiveBridge/live-host-coordinate.contract.test.ts`
- `packages/logix-core/test/internal/LiveBridge/live-operation-window.contract.test.ts`
- `packages/logix-cli/test/Integration/live-evidence-handoff.e2e.test.ts`
- `packages/logix-cli/test/Integration/live-command-result.contract.test.ts`
- `examples/logix-react/test/production-bundle-dev-isolation.guard.ts`

Implementation may choose narrower files after reading current code. If a listed file is not needed, leave it untouched.

## Phase 0 - Research And Admission Confirmation

Output:

- [research.md](./research.md)

Required decisions:

- React host evidence is adjunct and subordinate to runtime owner facts.
- linkage vocabulary reuses runtime target and operation refs.
- local profile summary is bounded local-only evidence.
- conflicts produce disagreement markers and runtime truth wins.
- disabled mode and cleanup proof are closure gates.
- 182 remains stopped; 188/183 are terminal adopted paths.

## Phase 1 - Data Model And Quickstart

Outputs:

- [data-model.md](./data-model.md)
- [quickstart.md](./quickstart.md)

The model must name only stable coordination objects:

- Host Adjunct Evidence
- Interaction Linkage
- Local Profile Summary
- Disagreement Marker
- Host Evidence Gap
- Disabled Capture Gate

The quickstart must show host proof commands, disabled-overhead checks, bundle checks and forbidden-field sweeps.

## Phase 2 - Host Adjunct Boundary

Requirements:

- host evidence only supplements runtime owner facts
- linkage uses approved runtime refs and markers
- missing/ambiguous/conflicting/redacted/degraded evidence returns structured gap or disagreement
- exported host adjunct evidence enters canonical evidence packaging or repo-internal host harness output only

## Phase 3 - Selector/Render And Interaction Evidence

Requirements:

- selector identity references React host law and core route identity without creating a second selector authority
- render evidence references boundary/harness refs only
- interaction linkage connects host event or render context to admitted runtime operation refs
- no host-owned timeline ordering, stateAfter, field semantics or compare truth

## Phase 4 - Local Profile Summary

Requirements:

- profile summaries are bounded, local-only, redaction-preserving and linked to runtime facts through approved refs
- disabled, denied, over-budget or unavailable profile capture returns structured gap or degraded marker
- raw profile samples do not become Runtime facts or timeline items

## Phase 5 - Disabled Safety, Cleanup And Docs Cutover

Requirements:

- disabled adjunct evidence has no host capture buffer and no extra render subscription fanout
- collection performs no IO in runtime transaction windows
- host buffers, linkage indexes and profile summaries clean up with target or host lifecycle
- active docs route standalone 182 as stopped and 188/183 as terminal adopted closure path

## Phase 6 - Proof And Writeback

Required witness set:

- host blind spot closure proof without verdict or repair hints
- disabled-overhead proof
- conflict/disagreement proof
- bounded local profile summary proof
- cleanup proof
- 182 stopped-route documentation proof

Verification matrix:

- `rtk pnpm --filter @logixjs/react test -- --run test/internal/dev/ test/RuntimeProvider/`
- `rtk pnpm --filter @logixjs/core test -- --run test/internal/LiveBridge/live-host-coordinate.contract.test.ts test/internal/LiveBridge/live-operation-window.contract.test.ts`
- `rtk pnpm --filter @logixjs/cli test -- --run test/Integration/live-evidence-handoff.e2e.test.ts test/Integration/live-command-result.contract.test.ts`
- `rtk pnpm -C examples/logix-react test:bundle:production`
- `rtk rg -n "HostEvidence|HostAdjunctEvidence|host-owned verdict|host-owned repair|logix debug|182-react-host-adjunct-evidence.*adopted|standalone 182" docs/ssot specs/188-react-host-adjunct-evidence specs/183-agent-debug-closure packages/logix-react/src packages/logix-cli/src`

Required writebacks:

- update `docs/ssot/runtime/10-react-host-projection-boundary.md` if selector/render host law changes
- update `docs/ssot/runtime/18-runtime-inspect-evidence-contract.md` if adjunct admission, cost law or proof obligation changes
- update `docs/ssot/runtime/15-cli-agent-first-control-plane.md` only if public live artifact route or schema mirror changes
- update `specs/183-agent-debug-closure/spec.md` or notes only if final terminal host closure route needs clarification
- ensure `specs/182-react-host-adjunct-evidence/spec.md` remains stopped/history and not revived as owner
- update [quickstart.md](./quickstart.md), [spec.md](./spec.md), and [specs/README.md](../README.md) with final proof status after implementation

## Non-Goals

- Do not implement or plan `trial --mode scenario`.
- Do not make React host a Runtime fact owner.
- Do not add host-owned verdicts, repair hints, next-stage scheduling or compare truth.
- Do not add `logix debug` or public host evidence routes by default.
- Do not revive standalone 182.
- Do not add a second selector authority.
- Do not add browser HMR protocol expansion, replay or deep profiler as part of 188.
