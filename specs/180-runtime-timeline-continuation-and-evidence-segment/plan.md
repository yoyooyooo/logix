# Implementation Plan: Runtime Timeline Continuation And Evidence Segment

**Branch**: `180-runtime-timeline-continuation-and-evidence-segment` | **Date**: 2026-05-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/180-runtime-timeline-continuation-and-evidence-segment/spec.md`

## Summary

Implement `Minimal Causal Evidence Core` for live timeline continuation:

- expose `logix live timeline --cursor <token>` as the only new public timeline grammar
- turn cursor into an opaque resume certificate over Runtime-owned watermark and query fingerprint
- add explicit evidence lease and daemon retained owner segment support
- make timeline output expose source segments and safe resume boundaries
- keep daemon as retention carrier only; timeline projection owns merge and completeness

This plan does not implement full daemon queue/task history, QA recorder, source-chain index, local semantic memory, replay, or final SQLite schema.

## Stage Role

- This file records execution constraints only.
- This file MUST NOT invent a second owner truth beside [spec.md](./spec.md).
- This file names where stable results will be written back after implementation.

## Planning Granularity

This plan targets a high-intelligence implementation Agent.

It freezes owner boundaries, landing zones, required witnesses, proof obligations, performance and memory gates, result writeback targets, and the one narrow wire contract needed before implementation.

It intentionally avoids pseudo-code and exact data structures except where cursor, retained segment and source segment wire behavior must remain stable across core, React carrier and CLI daemon.

## Technical Context

**Language/Version**: TypeScript 5.x, ESM.
**Primary Dependencies**: `@logixjs/core`, `@logixjs/react`, `@logixjs/cli`, Effect V4 baseline as used by current workspace.
**Storage**: In-memory daemon retained owner segment store for 180; final SQLite schema is deferred.
**Testing**: Vitest and existing package-local test runners.
**Target Platform**: Node.js 20+ CLI/daemon and modern browser dev adapter.
**Project Type**: pnpm workspace with `packages/logix-core`, `packages/logix-react`, `packages/logix-cli`.
**Performance Goals**: disabled live inspect allocates no cursor, retained segment or background drain payload; ordinary timeline cursor reads do not create retention lease; daemon retained segment writes are bounded by per-target queue and size caps.
**Constraints**: transaction windows must contain no daemon IO or daemon wait; daemon cannot own ordering, merge or completeness; public grammar adds only `--cursor <token>`.
**Scale/Scope**: target-scoped live debugging and explicit evidence retention for local daemon sessions.

## Constitution Check

- North Stars / Kill Features: no NS/KF IDs are claimed by spec.md.
- SSoT first: 180 imports SSoT 18 and SSoT 15; implementation must write back any owner-law changes before code is considered closed.
- Intent to Runtime chain: Agent live debugging intent maps to CLI cursor grammar, Runtime watermark continuation, daemon retained owner segment and machine-readable timeline proof.
- Effect/Logix contracts: changes are live runtime evidence contracts, captured by SSoT 18, SSoT 15 and 177 writeback.
- Deterministic identity: cursor identity is target-scoped Runtime watermark plus normalized query fingerprint; locator hints are non-semantic.
- Transaction boundary: no daemon IO or wait in transaction window; lease drain is outside Runtime transaction.
- React consistency: React browser adapter remains a carrier; no React render truth is introduced.
- External sources: not applicable.
- Internal contracts: cursor, retained segment and source segment require a focused wire/lifecycle contract before implementation.
- Performance budget: disabled allocation, bounded retained segment writes, no unbounded carrier queue.
- Diagnosability: output must expose source segments, coverage, completeness, gaps and safe resume boundary.
- Breaking changes: public grammar expands forward-only with `--cursor`; no compatibility layer.
- Single-track implementation: direct cutover to cursor continuation; no dual grammar or legacy alias.
- Public submodules: no new public package submodule expected.
- Large modules/files: implementation must check touched files. If a touched file is already large, keep semantic changes minimal and open a separate decomposition follow-up if needed.
- Quality gates: focused package tests, typecheck, lint and text sweeps listed below.

## Entry Gates

### Gate A: Planning Admission

Passed. `spec.md` answers owner, boundary and closure:

- Runtime-live owns causal truth.
- Daemon owns retention only.
- Timeline projection owns merge/completeness.
- CLI owns cursor spelling.

### Gate B: Implementation Admission

Implementation starts only after this plan defines:

- likely landing files
- required witness set
- verification matrix
- result writeback targets
- non-goals
- narrow wire contract for cursor/segment DTOs

## Perf Evidence Plan

180 touches live debug paths and daemon carrier memory, not the main runtime write hot path by default.

- Baseline semantics: before/after focused allocation and carrier-retention tests rather than full perf suite.
- Disabled allocation witness: tests must prove no cursor payload, retained segment payload or background drain allocation when live inspect is disabled.
- Transaction boundary witness: tests must prove cursor reads and lease drain do not introduce daemon wait into transaction windows.
- Carrier memory witness: tests must prove retained segment queue/write failure degrades and stays bounded.
- Full perf collection is optional unless implementation changes `liveLedger.ts` ingestion or Runtime transaction code in a way that affects always-on paths.

If implementation touches always-on ledger ingestion or transaction internals, add a local perf evidence artifact under `specs/180-runtime-timeline-continuation-and-evidence-segment/perf/` and document before/after commands in implementation notes.

## Project Structure

### Documentation

```text
specs/180-runtime-timeline-continuation-and-evidence-segment/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── timeline-continuation.schema.json
├── implementation-details/
│   └── timeline-continuation-wire-contract.md
└── tasks.md
```

### Source Code

Likely core landing files:

- `packages/logix-core/src/internal/runtime/core/liveLedger.ts`
- `packages/logix-core/src/internal/runtime/core/liveTimeline.ts`
- `packages/logix-core/src/internal/runtime/core/liveInspect.ts`
- `packages/logix-core/src/internal/live-bridge-api.ts`

Likely React carrier landing files:

- `packages/logix-react/src/internal/dev/lifecycleCarrier.ts`
- `packages/logix-react/src/internal/dev/liveBrowserAdapter.ts`

Likely CLI/daemon landing files:

- `packages/logix-cli/src/internal/args.ts`
- `packages/logix-cli/src/internal/liveClient.ts`
- `packages/logix-cli/src/internal/liveDaemonServer.ts`
- `packages/logix-cli/src/internal/liveResult.ts`
- `packages/logix-cli/src/schema/commands.v1.json`

Likely tests:

- `packages/logix-core/test/internal/LiveBridge/live-timeline-continuation.contract.test.ts`
- `packages/logix-core/test/internal/LiveBridge/live-evidence-segment.contract.test.ts`
- `packages/logix-core/test/internal/LiveBridge/live-operation-window.contract.test.ts`
- `packages/logix-core/test/internal/LiveBridge/live-operation-ledger-disabled.guard.test.ts`
- `packages/logix-react/test/internal/dev/live-browser-adapter-inspect.contract.test.ts`
- `packages/logix-cli/test/Integration/live-inspect-routes.contract.test.ts`
- `packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts`

## Phase 0 - Contract Research

Research outputs:

- [research.md](./research.md)

Decisions must cover:

- cursor as opaque resume certificate
- retained owner segment as daemon retention artifact
- segmented source law as timeline projection input
- in-memory retained segment store for 180
- no ordinary-read retention lease

## Phase 1 - Wire Contract And Data Model

Required artifacts:

- [data-model.md](./data-model.md)
- [contracts/timeline-continuation.schema.json](./contracts/timeline-continuation.schema.json)
- [implementation-details/timeline-continuation-wire-contract.md](./implementation-details/timeline-continuation-wire-contract.md)
- [quickstart.md](./quickstart.md)

The wire contract must freeze:

- `TimelineCursorResumeCertificate`
- `TimelineQueryFingerprint`
- `EvidenceLease`
- `DaemonRetainedOwnerSegment`
- `TimelineSourceSegment`
- `SafeResumeBoundary`

The contract must explicitly state:

- locator hints are non-semantic
- `limit`, lease budget and request byte budget do not enter cursor fingerprint
- source segment chain is the only 180 proof phrase; source-chain indexes are deferred

## Phase 2 - Core Timeline Continuation

Implement cursor-aware timeline reads over 175 operation windows and 177 timeline projection.

Requirements:

- Continue after Runtime resume watermark for same-query cursor reads.
- Preserve latest-head behavior when cursor is absent.
- Return owner-coded gaps for target mismatch, attachment mismatch, query mismatch, expired cursor, incomparable watermark and retention gaps.
- Produce `cursor.next`, watermark range, coverage and safe resume boundary when possible.
- Do not expose raw watermark JSON as public grammar.

## Phase 3 - Evidence Lease And Retained Owner Segment

Implement explicit retained owner segment support in daemon/carrier boundary.

Requirements:

- Ordinary timeline reads do not create retention lease.
- Allowed lease purposes are `export-evidence`, `workbench-session`, `qa-recording`, `maintenance-debug`.
- Retained segments store owner refs, bounded projections, digests, gaps, redaction/degraded markers, TTL, size cap and lease provenance.
- Retained segments do not store daemon ordering, daemon-computed completeness, source-chain indexes, work-session history, QA replay steps or verification verdicts.
- Lease drain queue is bounded and does not block Runtime.

## Phase 4 - Segmented Source Projection

Make timeline output expose source segments and let timeline projection own merge/completeness.

Requirements:

- Daemon returns `runtime-head` and `daemon-retained-segment` source segments.
- Merge only comparable, continuous source segment chains.
- Sort only by Runtime watermark/order law, never daemon write time, wall clock, row id, request id or locator hint.
- Partial or discontinuous chains return structured gaps and safe resume boundary.

## Phase 5 - CLI Grammar And Carrier Proof

Expose `--cursor <token>` through CLI parser/schema and carrier payloads.

Requirements:

- Add only `--cursor` to `logix live timeline`.
- Preserve `--target`, `--attachment`, `--field`, `--limit`.
- Update command schema artifact.
- Browser adapter and daemon preserve owner markers, source segments, cursor gaps and safe resume boundary.
- No `--since`, `--until`, `--before`, `--after`, `--after-watermark` public grammar.

## Phase 6 - Evidence Export And Writeback

Make canonical evidence package retained segment refs and owner facts without becoming timeline truth.

Required writebacks:

- `docs/ssot/runtime/18-runtime-inspect-evidence-contract.md`
- `docs/ssot/runtime/15-cli-agent-first-control-plane.md`
- `specs/177-runtime-inspect-timeline-projection/spec.md`
- `specs/180-runtime-timeline-continuation-and-evidence-segment/spec.md` status and notes
- `specs/README.md` status row

Proposal remains consumed. Review ledger remains historical evidence.

## Required Witness Set

- Cursor continuation over complete window has no duplicate events.
- Cursor mismatch, expiry, missing retained segment, retention gap and incomparable watermark emit stable structured gaps.
- Ordinary timeline reads do not create retention lease.
- Explicit lease creates bounded retained owner segment with lease provenance.
- Daemon retained segment cannot own ordering or completeness.
- Continuous source segment chain can project; discontinuous chain returns partial output with gaps.
- Canonical evidence export carries retained segment refs without verification verdicts or synthesized Runtime facts.
- Disabled live inspect allocates no cursor payload, retained segment payload or background drain.

## Performance And Memory Gates

- disabled live inspect allocation counters remain unchanged for cursor and retained segment paths
- lease drain queue is bounded per workspace and target
- retained segment payload is bounded by owner and lease budgets
- retained segment write failure degrades without fabricating completion
- carrier responses are lease-bound or request-bound and lifecycle-cleaned
- no transaction-window daemon IO or wait

## Verification Matrix

Focused tests:

```text
rtk pnpm --filter @logixjs/core test -- --run test/internal/LiveBridge/live-timeline-continuation.contract.test.ts test/internal/LiveBridge/live-evidence-segment.contract.test.ts test/internal/LiveBridge/live-operation-window.contract.test.ts test/internal/LiveBridge/live-operation-ledger-disabled.guard.test.ts
rtk pnpm --filter @logixjs/react test -- --run test/internal/dev/live-browser-adapter-inspect.contract.test.ts
rtk pnpm --filter @logixjs/cli test -- --run test/Integration/live-inspect-routes.contract.test.ts test/Integration/live-daemon-carrier.contract.test.ts
rtk pnpm typecheck
rtk pnpm lint
```

Text checks:

```text
rtk rg -n --glob '!plan.md' "semantic budget class|source chain partial|complete source chain|partial source chain|Open Review Questions" specs/180-runtime-timeline-continuation-and-evidence-segment docs/ssot/runtime/15-cli-agent-first-control-plane.md docs/ssot/runtime/18-runtime-inspect-evidence-contract.md specs/177-runtime-inspect-timeline-projection
rtk rg -n -- "(--since|--until|--before|--after|--after-watermark)(\\s|$)" packages/logix-cli/src packages/logix-cli/test docs/ssot/runtime/15-cli-agent-first-control-plane.md
rtk rg -n "[d]aemon.*owns.*timeline|[d]aemon.*owns.*ordering|[d]aemon.*owns.*completeness|[c]anonical evidence.*owns.*timeline|raw watermark JSON|SQLite schema" packages/logix-core/src packages/logix-react/src packages/logix-cli/src
rtk rg -n "readonly (verificationVerdict|repairHints|rawFieldGraph|rawFieldProgram|runtimeHandles|profileSamples|reactRenderPayload)|\\b(verificationVerdict|rawFieldGraph|rawFieldProgram|runtimeHandles|profileSamples|reactRenderPayload)\\s*:" packages/logix-core/src/internal/runtime/core/live*.ts packages/logix-react/src/internal/dev/live*.ts packages/logix-cli/src/internal/live*.ts
```

## Result Writeback

Authority pages:

- `docs/ssot/runtime/18-runtime-inspect-evidence-contract.md`: evidence lease, retained owner segment, cursor and segmented source boundary.
- `docs/ssot/runtime/15-cli-agent-first-control-plane.md`: `--cursor <token>` grammar and same-query continuation semantics.
- `specs/177-runtime-inspect-timeline-projection/spec.md`: no-new-grammar rule superseded only by 180 for timeline cursor continuation.

Spec sync:

- `specs/180-runtime-timeline-continuation-and-evidence-segment/spec.md`: status to Implemented/Done only after code and writeback close.
- `specs/180-runtime-timeline-continuation-and-evidence-segment/tasks.md`: created by `$speckit tasks 180`.
- `specs/README.md`: update 180 status.

Proof docs:

- Record final commands and results in `specs/180-runtime-timeline-continuation-and-evidence-segment/notes/verification.md` if implementation spans multiple sessions.

## Non-Goals

- Do not implement full daemon queue/task history.
- Do not implement QA recorder, source-chain index, SourceMap/AST derived index, local semantic memory or replay engine.
- Do not define final SQLite schema.
- Do not promote React host evidence or profiler owner.
- Do not add wall-clock query flags or raw watermark JSON public grammar.
- Do not create daemon-owned ordering, merge or completeness.

## Exit Gates

180 exits only when:

- `--cursor <token>` works for same-query timeline continuation.
- Cursor failure cases emit stable structured gaps.
- Ordinary timeline reads do not create retention lease.
- Explicit lease produces bounded retained owner segments.
- Source segment merge/completeness stays owned by timeline projection.
- Disabled allocation and no-daemon-wait proofs pass.
- Canonical evidence export packages refs without becoming timeline truth.
- SSoT 18, SSoT 15 and 177 writebacks are complete.

## Reopen Rules

Reopen the plan if:

- cursor continuation requires raw watermark JSON as public grammar
- daemon retained segments require daemon ordering or daemon-computed completeness
- ordinary timeline reads must create retention leases
- segment merge cannot preserve 175 Runtime watermark authority
- retained segment proof requires full state snapshots by default
- source-chain, QA recorder or local semantic memory must become part of 180 exit gates
