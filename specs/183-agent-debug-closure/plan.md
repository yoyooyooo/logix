# Implementation Plan: Agent Debug Closure

**Branch**: `183-agent-debug-closure` | **Date**: 2026-05-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/183-agent-debug-closure/spec.md`

## Summary

Complete the terminal Agent live diagnosis closure over the existing `logix live` lane:

- preserve Runtime owner facts from 174 to 180 as the only Runtime truth
- admit React host evidence only as adjunct sidecars over Runtime coordinates
- link user/host interaction to declared action admission and `txnSeq / opSeq / linkId`
- expose bounded local profile summary as diagnosis evidence, not profiler truth
- package owner facts, adjunct refs, profile refs, disagreements and structured gaps through existing live/canonical evidence routes
- prove disabled-path and production-bundle safety before closure

This plan does not revive 182, add `logix debug`, add public `HostEvidence` or `HostAdjunctEvidence` artifact kinds, implement QA replay, SourceMap/AST indexing, deep CPU/heap profiling, cloud attachment, or a second evidence envelope.

## Stage Role

- This file records execution constraints only.
- [spec.md](./spec.md) owns the 183 feature law.
- [Runtime Inspect Evidence Contract](../../docs/ssot/runtime/18-runtime-inspect-evidence-contract.md) owns Runtime inspect authority and coordination law.
- [CLI Agent First Control Plane](../../docs/ssot/runtime/15-cli-agent-first-control-plane.md) owns public CLI grammar and `LiveCommandResult` artifact kinds.
- [React Host Projection Boundary](../../docs/ssot/runtime/10-react-host-projection-boundary.md) owns selector/render host law.
- [Harness And Proof Assets Standard](../../docs/standards/harness-and-proof-assets-standard.md) owns live evidence safety gate and proof asset hygiene.

Implementation must update this plan only if execution discovers a changed authority, gate or writeback target. Code-level tactics stay outside this file unless they resolve a narrow DTO, wire, lifecycle, authorization or measurement ambiguity.

## Planning Granularity

This plan targets a high-intelligence implementation Agent.

It freezes owner boundaries, landing zones, phase order, witness set, proof obligations, performance and memory gates, and writeback targets. It intentionally avoids line-by-line algorithms.

The only exact companion contract for this wave is [implementation-details/diagnosis-evidence-contract.md](./implementation-details/diagnosis-evidence-contract.md). That contract freezes the narrow cross-lane payload, authorization and measurement rules needed to keep core, React host, CLI daemon and canonical evidence packaging from diverging.

## Technical Context

**Language/Version**: TypeScript 5.x, ESM.
**Primary Dependencies**: `@logixjs/core`, `@logixjs/react`, `@logixjs/cli`, Effect V4 baseline as used by current workspace.
**Storage**: In-memory local daemon/profile buffers only when explicitly enabled and authorized; no final SQLite schema in 183.
**Testing**: Vitest, existing package-local test runners, examples/logix-react browser/prod-bundle proof commands.
**Target Platform**: Node.js 20+ CLI/daemon, modern browser dev adapter, local development examples.
**Project Type**: pnpm workspace with `packages/logix-core`, `packages/logix-react`, `packages/logix-cli`, `examples/logix-react`.
**Performance Goals**: disabled diagnosis closure allocates no host capture buffer, render subscription fanout, profile sample buffer, projection cache or retained adjunct data; transaction windows contain no IO; enabled buffers are target/attachment scoped and bounded.
**Constraints**: no second Runtime truth, no new public debug namespace, no standalone host public artifact kind, no production bundle reachability for dev/live/debug carrier modules.
**Scale/Scope**: local Agent live diagnosis for one or more browser attachments with bounded target-scoped evidence windows.

## Constitution Check

- SSoT first: 183 imports SSoT 18, 10, 15 and the harness standard; any owner-law change must be written back before implementation closes.
- Runtime truth: Runtime owner facts remain owned by 174 to 180; host/profile sidecars cannot override them.
- Deterministic identity: linkage must use target coordinate, attachment id, `txnSeq`, `opSeq`, `linkId`, artifact ref and admitted host refs.
- Transaction boundary: no host capture drain, profile sampling drain, source-map lookup, AST parse, daemon wait or evidence export work inside transaction windows.
- Performance and memory: disabled path is allocation-free for new 183 buffers; enabled buffers are bounded and lifecycle-cleaned.
- React host law: selector evidence uses core selector route identity/fingerprint or diagnostic label only; render evidence uses host render boundary refs or harness refs only.
- CLI public surface: 183 reuses `logix live ...`, `LiveInspectArtifact`, `LiveProfileSummary`, `CanonicalEvidencePackageRef`, `EvidenceGap` and repo-internal harness output.
- Production safety: business production bundles must not include dev/live/debug carrier plumbing through normal imports.
- Single-track implementation: no compatibility aliases, no dual evidence envelope, no transitional public artifact kinds.
- Planning granularity: plan/tasks freeze boundaries and proof gates, not pseudo-code recipes.

## Entry Gates

### Gate A: Spec Admission

Passed. [spec.md](./spec.md) answers:

- current owner boundary
- in-scope / out-of-scope diagnosis lanes
- no-second-truth and no-new-public-surface guardrails
- closure gate and reopen bar

### Gate B: Implementation Admission

Implementation can start only after these planning artifacts exist:

- [research.md](./research.md)
- [data-model.md](./data-model.md)
- [implementation-details/diagnosis-evidence-contract.md](./implementation-details/diagnosis-evidence-contract.md)
- [quickstart.md](./quickstart.md)
- [tasks.md](./tasks.md)
- [checklists/requirements.md](./checklists/requirements.md)

Implementation must not start if `discussion.md` later appears with `Must Close Before Implementation` items.

## Perf Evidence Plan

183 touches diagnosis capture, React host projection, local profiling and canonical evidence packaging. These are high-risk for memory and production bundle safety.

Required evidence:

- Disabled allocation witness: no host capture buffer, render subscription fanout, profile sample buffer, projection cache or retained adjunct data when 183 capture/profile is disabled.
- Transaction boundary witness: runtime transaction windows contain no daemon wait, host drain, source lookup, AST parse, profile drain or evidence export work.
- Bounded buffer witness: enabled host/profile buffers are target-scoped or attachment-scoped, size-capped and cleaned on target/attachment lifecycle.
- Production bundle witness: `examples/logix-react` production build does not include dev/live/debug carrier modules through normal business imports.
- Multi-attachment witness: ambiguous target without attachment does not merge host chains.

Full benchmark collection is required only if implementation changes always-on runtime transaction, ledger ingestion or selector subscription behavior. If that happens, add a focused perf artifact under `specs/183-agent-debug-closure/perf/` and document before/after command and result in `notes/verification.md`.

## Project Structure

### Documentation

```text
specs/183-agent-debug-closure/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/
│   └── requirements.md
├── implementation-details/
│   └── diagnosis-evidence-contract.md
└── tasks.md
```

### Likely Source Landing Zones

Core runtime and evidence:

- `packages/logix-core/src/internal/runtime/core/liveTypes.ts`
- `packages/logix-core/src/internal/runtime/core/liveInspect.ts`
- `packages/logix-core/src/internal/runtime/core/liveEvidence.ts`
- `packages/logix-core/src/internal/runtime/core/liveOperations.ts`
- `packages/logix-core/src/internal/runtime/core/liveLedger.ts`
- `packages/logix-core/src/internal/live-bridge-api.ts`

React host adjunct and browser carrier:

- `packages/logix-react/src/internal/dev/lifecycleCarrier.ts`
- `packages/logix-react/src/internal/dev/liveBrowserAdapter.ts`
- `packages/logix-react/src/internal/provider/RuntimeProvider.tsx`
- `packages/logix-react/src/internal/store/**`
- `packages/logix-react/src/internal/hooks/**`
- `packages/logix-react/src/dev/live.ts`

CLI and daemon carrier:

- `packages/logix-cli/src/internal/args.ts`
- `packages/logix-cli/src/internal/commands/live.ts`
- `packages/logix-cli/src/internal/liveClient.ts`
- `packages/logix-cli/src/internal/liveDaemonServer.ts`
- `packages/logix-cli/src/internal/liveResult.ts`
- `packages/logix-cli/src/schema/commands.v1.json`

Dogfood and proof:

- `examples/logix-react/src/demoRouteRegistry.tsx`
- `examples/logix-react/test/browser/**`
- `examples/logix-react/test/production-bundle-dev-isolation.guard.ts`
- `packages/logix-core/test/internal/LiveBridge/**`
- `packages/logix-react/test/internal/dev/**`
- `packages/logix-react/test/RuntimeProvider/**`
- `packages/logix-cli/test/Integration/**`

Implementation may choose narrower files after reading the current code. If a listed file is not needed, leave it untouched.

## Phase 0 - Research And Admission Confirmation

Outputs:

- [research.md](./research.md)

Required decisions:

- host adjunct evidence remains a subordinate sidecar
- interaction linkage uses runtime operation coordinates
- local profile summary is local-only and authorization-gated
- diagnosis packaging uses existing live artifact kinds and canonical evidence refs
- production bundle proof remains repo-wide safety gate
- SourceMap/AST/QA replay/deep profiler remain out of scope

## Phase 1 - Diagnosis Evidence Contract

Outputs:

- [data-model.md](./data-model.md)
- [implementation-details/diagnosis-evidence-contract.md](./implementation-details/diagnosis-evidence-contract.md)
- [quickstart.md](./quickstart.md)

The narrow contract must freeze:

- diagnosis evidence package composition boundary
- host attachment / selector subscription / render boundary sidecar shape
- interaction linkage sidecar shape
- local profile summary boundary and authorization gate
- structured gap/disagreement taxonomy
- artifact kind preservation and public-output constraints
- disabled-overhead, bounded-memory and production-bundle measurement gates

## Phase 2 - Runtime Coordinate And Owner Law Pressure

Implement only the core pressure needed for deterministic linkage.

Requirements:

- expose or preserve target coordinate, attachment id, `txnSeq`, `opSeq`, `linkId`, artifact ref and source ref as linkable refs
- preserve Runtime owner facts as authority
- return structured gaps for missing, stale, ambiguous, redacted or degraded linkage
- avoid current-state backfill into historical operation proof
- avoid any new Runtime truth model for host or profile data

## Phase 3 - React Host Adjunct Capture

Implement host attachment, selector subscription and render boundary sidecars.

Requirements:

- capture only when explicitly enabled or requested through dev/live diagnosis path
- use selector fingerprint / core route identity from React host law
- produce render boundary refs or host harness refs, not component-heuristic truth
- keep host evidence read-only relative to Runtime truth
- emit structured host gaps and disagreement markers instead of guessing
- clean buffers with target, attachment and host lifecycle

## Phase 4 - Interaction Linkage

Link host interaction to declared action dispatch and Runtime operation coordinates.

Requirements:

- preserve interaction ref as provenance only
- link only to admitted declared action dispatch or return admission/linkage gap
- never fabricate operation facts from UI events
- respect multi-attachment ambiguity law
- preserve redaction/degraded markers through daemon and canonical evidence packaging

## Phase 5 - Local Profile Summary

Implement bounded local profile summary.

Requirements:

- start/stop/summary remain local-only observation commands
- authorization, budget and redaction are explicit
- raw samples do not become Runtime facts or timeline items
- profile summary links only through target/time/link refs
- unavailable, unauthorized, over-budget or cross-target capture returns structured profile gaps

## Phase 6 - Canonical Evidence Packaging And CLI Preservation

Package diagnosis-ready evidence without adding public artifact kinds.

Requirements:

- preserve Runtime owner facts, adjunct refs, profile refs, disagreements, redaction, degraded and structured gaps
- use existing `LiveInspectArtifact`, `LiveProfileSummary`, `CanonicalEvidencePackageRef`, `EvidenceGap` or repo-internal harness output routes
- do not add `logix debug`
- do not add `HostEvidence` or `HostAdjunctEvidence` public artifact kinds
- update `commands.v1.json` only if existing `logix live ...` profile/export routes need schema alignment

## Phase 7 - Proof And Writeback

Required writebacks:

- [spec.md](./spec.md) status and closure notes
- [quickstart.md](./quickstart.md) final proof commands and expected machine output shape
- `specs/172-agent-first-runtime-inspect-data-plane/implementation-details/runtime-inspect-coverage-harness.md` and related proof inventory when implementation updates deferred rows
- [Runtime Inspect Evidence Contract](../../docs/ssot/runtime/18-runtime-inspect-evidence-contract.md) only for owner-law or closure-result deltas
- [React Host Projection Boundary](../../docs/ssot/runtime/10-react-host-projection-boundary.md) only for selector/render host-law deltas
- [CLI Agent First Control Plane](../../docs/ssot/runtime/15-cli-agent-first-control-plane.md) only for CLI grammar, artifact-kind or live-profile-route deltas
- [Harness And Proof Assets Standard](../../docs/standards/harness-and-proof-assets-standard.md) only if proof asset placement or live evidence safety gate changes
- [specs/README.md](../README.md) status row

## Required Witness Set

- Runtime action -> field fact -> selector subscription -> render boundary can be linked or emits explicit host gaps.
- Host interaction -> declared action dispatch -> `txnSeq / opSeq / linkId` can be linked or emits admission/linkage gaps.
- Diagnosis-ready evidence export preserves Runtime owner facts, adjunct refs, profile refs and gap markers without public host artifact kinds.
- Host/runtime disagreement keeps Runtime truth authoritative and emits structured disagreement marker.
- Disabled diagnosis closure allocates no host capture buffer, render fanout, profile sample buffer, projection cache or transaction-window IO.
- Production bundle reachability over `examples/logix-react` excludes dev/live/debug carrier modules.
- Multi-attachment ambiguity does not merge host chains.
- Profile unavailable, unauthorized, over budget and cross-target cases return deterministic profile gaps.
- Runtime Inspect Coverage Harness no longer treats React host adjunct evidence or local profiler as unresolved deferred rows after implementation; each row is adjunct-backed, profile-backed or explicitly rejected with stable reason.

## Verification Matrix

Focused core/runtime:

```text
rtk pnpm --filter @logixjs/core exec vitest run test/internal/LiveBridge/live-inspect-evidence-bridge.contract.test.ts test/internal/LiveBridge/live-operation-window.contract.test.ts test/internal/LiveBridge/live-operation-ledger-disabled.guard.test.ts
```

Focused React host:

```text
rtk pnpm --filter @logixjs/react exec vitest run test/internal/dev/live-browser-adapter-inspect.contract.test.ts test/RuntimeProvider/runtime-hot-lifecycle-host-cleanup.contract.test.tsx test/RuntimeProvider/runtime-hot-lifecycle-projection.contract.test.tsx
```

Focused CLI:

```text
rtk pnpm --filter @logixjs/cli exec vitest run test/Integration/live-inspect-routes.contract.test.ts test/Integration/live-daemon-carrier.contract.test.ts test/Integration/live-evidence-handoff.e2e.test.ts
```

Dogfood and production safety:

```text
rtk pnpm -C examples/logix-react test:browser:live-real-carrier
rtk pnpm -C examples/logix-react test:bundle:production
```

Repository gates:

```text
rtk pnpm check:effect-v4-matrix
rtk pnpm typecheck
rtk pnpm lint
```

Final text sweeps:

- Public-surface rejection sweep over this spec pack plus SSoT 18 and SSoT 15 for the forbidden debug namespace and host evidence artifact names.
- Unresolved-marker sweep over this spec pack. Clarification and todo placeholder markers must return no unresolved planning placeholders. Markdown task checkboxes in [tasks.md](./tasks.md) are expected until implementation executes them.
- Production-source planning-name sweep for requirement IDs, process IDs, old probe/witness/pressure labels and matrix-row helper names under `packages/*/src` and `examples/*/src`.

The public-surface sweep is expected to return only explicit rejection, guard-test or "not admitted" text. Any command example or artifact kind admission using those strings is a failure.

## Non-Goals

- No new `logix debug` namespace.
- No public `HostEvidence` or `HostAdjunctEvidence` artifact kind.
- No React host evidence as Runtime truth.
- No profiler samples as timeline or Runtime facts.
- No ordinary timeline read lease creation.
- No SourceMap/AST/loaded-module index as core Runtime truth.
- No QA recorder, replay engine or work-session task history.
- No deep CPU profile, heap snapshot, remote/cloud mutation or long-running raw stream.
- No compatibility layer for old live inspect shapes.

## Complexity Tracking

No gate violation is justified at planning time.

If implementation needs a public artifact kind, a second selector authority, always-on host capture, persistent local storage, source index, or a new CLI namespace, it must stop and reopen the relevant SSoT before continuing.
