# Quickstart: Runtime Timeline Continuation And Evidence Segment

## Intended Agent Flow

1. Start or attach to a live target.
2. Read latest timeline:

```bash
rtk pnpm cli live timeline --runId timeline-first --target <target> --attachment <attachmentId> --limit 20
```

3. Save `cursor.next` from the machine output.
4. Trigger more Runtime activity.
5. Continue with the same query:

```bash
rtk pnpm cli live timeline --runId timeline-next --target <target> --attachment <attachmentId> --limit 20 --cursor <cursor.next>
```

Expected behavior:

- Complete continuation does not duplicate already consumed events.
- Incomplete continuation returns structured gap and safe resume boundary.
- Timeline output exposes `sourceSegments`, coverage, completeness, `cursor.next` and safe resume boundary.
- The command does not create a retention lease by itself.
- `--cursor` is opaque. Do not decode it or replace it with raw watermark JSON.
- `--cursor` is the only public continuation grammar. Do not add `--since`, `--until`, `--before`, `--after` or `--after-watermark`.

## Examples Dogfood Flow

Use `examples/logix-react` as the business-project proof repo:

```bash
rtk pnpm cli live start --runId live-180-start
rtk pnpm -C examples/logix-react dev -- --host localhost --port 5173 --strictPort
```

Open:

```text
http://localhost:5173/playground/logix-react.live-bridge
```

Then run:

```bash
rtk pnpm cli live status --runId live-180-status
rtk pnpm cli live targets --runId live-180-targets --tree
rtk pnpm cli live timeline --runId live-180-empty --target runtime:example-runtime/module:LiveBridgeFixture/instance:default --attachment <attachmentId> --limit 1
rtk pnpm cli live dispatch --runId live-180-dispatch-a --target runtime:example-runtime/module:LiveBridgeFixture/instance:default --attachment <attachmentId> --action missing-action
rtk pnpm cli live timeline --runId live-180-first --target runtime:example-runtime/module:LiveBridgeFixture/instance:default --attachment <attachmentId> --limit 1
rtk pnpm cli live dispatch --runId live-180-dispatch-b --target runtime:example-runtime/module:LiveBridgeFixture/instance:default --attachment <attachmentId> --action missing-action
rtk pnpm cli live timeline --runId live-180-next --target runtime:example-runtime/module:LiveBridgeFixture/instance:default --attachment <attachmentId> --limit 2 --cursor <cursor.next>
rtk pnpm cli live capture --runId live-180-capture --target runtime:example-runtime/module:LiveBridgeFixture/instance:default --attachment <attachmentId> --window 500ms
rtk pnpm cli live export evidence --runId live-180-export --from <artifactRef.file>
```

Expected machine shapes:

- `status` -> `LiveCommandResult` with primary artifact kind `LiveStatus`.
- `targets --tree` -> `LiveTargetList`, including `attachmentId` for tab-safe follow-up commands.
- empty timeline -> `LiveInspectArtifact(section="timeline")` with structured gap such as `missing-operation-window`.
- first timeline after runtime activity -> `LiveInspectArtifact(section="timeline")` with `facet.payload.timeline.cursor.next`.
- continued timeline -> `LiveInspectArtifact(section="timeline")`; `inputCoordinate.cursor` retains the opaque token and returned items do not duplicate already consumed events.
- capture -> live artifact with daemon lineage ref in `artifactRef.file`.
- export -> `CanonicalEvidencePackage` or structured `EvidenceGap`, never a verification verdict.

## Explicit Retention Flow

Retention is opened only by a consumer that has a purpose, budget, redaction policy and retention policy, such as evidence export, Workbench session, QA recording or maintenance debug.

Retained segments may later be used as source segments for timeline projection. They do not own timeline ordering or completeness.

First 180 implementation exposes `evidence.retainedSegment.open` through the daemon operation lane and keeps retained owner segments in daemon memory with TTL, size cap, workspace partition and lease provenance. Final persistent storage remains deferred.

## Source Segment Chain Flow

Timeline projection may combine:

- `runtime-head`
- `daemon-retained-segment`

Only comparable, continuous Runtime watermark chains can be presented as complete. Discontinuous chains return partial output with a structured `timeline-retention-gap` and a safe resume boundary. Daemon write time, wall clock, row id, request id and locator hints never participate in ordering or completeness.

## Failure Cases To Verify

- target mismatch
- attachment mismatch
- query fingerprint mismatch
- expired cursor
- missing retained segment
- retention gap
- incomparable watermark
- discontinuous source segment chain

All cases should return structured gaps, not fabricated empty timelines.

## Focused Proof Commands

```text
rtk pnpm --filter @logixjs/core exec vitest run test/internal/LiveBridge/live-timeline-continuation.contract.test.ts test/internal/LiveBridge/live-evidence-segment.contract.test.ts test/internal/LiveBridge/live-evidence-facets.contract.test.ts test/internal/LiveBridge/live-inspect-facet.contract.test.ts test/internal/LiveBridge/live-operation-window.contract.test.ts test/internal/LiveBridge/live-operation-ledger-disabled.guard.test.ts
rtk pnpm --filter @logixjs/react exec vitest run test/internal/dev/live-browser-adapter-inspect.contract.test.ts
rtk pnpm --filter @logixjs/cli exec vitest run test/Integration/live-inspect-routes.contract.test.ts test/Integration/live-daemon-carrier.contract.test.ts test/Integration/live-namespace.contract.test.ts test/Integration/live-evidence-handoff.e2e.test.ts
rtk pnpm -C examples/logix-react test:browser:live-real-carrier
```
