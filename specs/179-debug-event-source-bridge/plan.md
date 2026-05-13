# Implementation Plan: Runtime-Live Debug Event Source Bridge

## Goal

Make `logix live events --kind diagnostic|process` return owner-backed event windows by feeding owner-approved DebugSink source records into 175 runtime-live ledger normalization at explicit read/capture time.

179 must not make DebugSink, browser adapter, daemon or CLI a fact owner.

## Authority Boundaries

179 owns:

- source bridge shape from runtime debug records to 175 `LiveDebugSourceRecord`
- lifecycle and disabled-overhead proof for that bridge
- carrier proof that diagnostic/process event artifacts preserve runtime-live owner markers

179 does not own:

- 175 ledger envelope, order, watermark, retention or stateAfter law
- DebugSink ring semantics
- process runtime taxonomy outside 175 event kinds
- CLI grammar
- canonical evidence export envelope

## Likely Landing Files

Core:

- `packages/logix-core/src/internal/runtime/core/liveLedger.ts`
- `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`
- `packages/logix-core/src/internal/live-bridge-api.ts`

React carrier:

- `packages/logix-react/src/internal/dev/lifecycleCarrier.ts`
- `packages/logix-react/src/internal/dev/liveBrowserAdapter.ts`

CLI carrier:

- `packages/logix-cli/src/internal/liveDaemonServer.ts`

Tests:

- `packages/logix-core/test/internal/LiveBridge/live-debug-source-bridge.contract.test.ts`
- `packages/logix-core/test/internal/LiveBridge/live-operation-ledger.contract.test.ts`
- `packages/logix-core/test/internal/LiveBridge/live-operation-ledger-disabled.guard.test.ts`
- `packages/logix-react/test/internal/dev/live-browser-adapter-inspect.contract.test.ts`
- `packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts`
- `packages/logix-core/test/internal/LiveBridge/runtime-inspect-coverage.harness.test.ts`

## Phase 1 - Source Bridge Contract

Freeze the bridge input and target ownership.

Requirements:

- Use existing 175 `LiveDebugSourceRecord` and `RuntimeDebugEventRef` normalization when sufficient.
- Add a narrow contract only if current DTOs cannot express required target/source refs.
- Keep source records bounded and JSON-safe.
- Do not expose raw DebugSink ring internals.

## Phase 2 - Runtime And React Lifecycle Plumbing

Connect owner-approved source records to the target-scoped live ledger store.

Requirements:

- Source bridge is target-scoped or lease-scoped.
- Read-time normalization only happens for explicit diagnostic/process event reads.
- Cleanup follows target lifecycle.
- Disabled diagnostics and disabled live inspect allocate no diagnostic/process projection payloads.

## Phase 3 - Event Window Projection

Return diagnostic/process events as normal 175 operation windows.

Requirements:

- Preserve `txnSeq / opSeq / linkId` when available.
- Preserve runtime-live gaps for unsupported or missing source kinds.
- Ensure generic operation event reads remain unaffected.
- Do not present missing producer as valid empty diagnostic/process event history unless owner can prove emptiness.

## Phase 4 - Carrier And Evidence Proof

Route diagnostic/process event reads through owner-backed operation windows.

Requirements:

- Browser adapter transports owner windows only.
- Daemon does not rewrite event order, watermark, owner or gap codes.
- Canonical evidence packages refs and owner gaps only.

## Phase 5 - Writeback

Required writebacks after implementation:

- Move `diagnostics` and `process-events` from structured gap to owner-backed in `runtime-inspect-coverage.harness.test.ts`.
- Keep SSoT 18 as owner law unless implementation exposes a missing proof obligation.
- Keep SSoT 15 command grammar unchanged.
- Update `specs/179-debug-event-source-bridge/tasks.md`.

## Performance And Memory Gates

- disabled bridge allocates no diagnostic/process ledger payload projections
- no always-on DebugSink push into ledger buffers
- source records are bounded and target/lease-scoped
- carrier memory remains response-lease-bound

## Verification Matrix

```text
rtk pnpm --filter @logixjs/core test -- --run test/internal/LiveBridge/live-debug-source-bridge.contract.test.ts test/internal/LiveBridge/live-operation-ledger.contract.test.ts test/internal/LiveBridge/live-operation-ledger-disabled.guard.test.ts test/internal/LiveBridge/runtime-inspect-coverage.harness.test.ts
rtk pnpm --filter @logixjs/react test -- --run test/internal/dev/live-browser-adapter-inspect.contract.test.ts
rtk pnpm --filter @logixjs/cli test -- --run test/Integration/live-daemon-carrier.contract.test.ts
rtk pnpm typecheck
rtk pnpm lint
```

Text checks:

```text
rtk rg -n "Runtime\\.inspect|runtime\\.inspect|Runtime\\.devtools|runtime\\.devtools|Logix\\.Reflection" docs/ssot/runtime/18-runtime-inspect-evidence-contract.md specs/179-debug-event-source-bridge packages/logix-core/src packages/logix-react/src packages/logix-cli/src
rtk rg -n "[D]ebugSink.*owns|[C]LI.*owns|[d]aemon.*owns|[b]rowser adapter.*owns|[W]orkbench.*owns|[c]anonical evidence.*owns.*diagnostic|[c]anonical evidence.*owns.*process" docs/ssot/runtime/18-runtime-inspect-evidence-contract.md specs/179-debug-event-source-bridge
rtk rg -n "raw DebugSink|raw ring|runtime handle|SubscriptionRef|verification verdict|repairHints|always-on.*ledger" specs/179-debug-event-source-bridge packages/logix-core/src packages/logix-core/test packages/logix-react/test packages/logix-cli/test
```

## Exit Gates

179 exits only when:

- diagnostic event reads are owner-backed from runtime-live ledger windows when source exists
- process event reads are owner-backed from runtime-live ledger windows when source exists
- missing, disabled and unsupported source cases emit stable runtime-live gaps
- disabled allocation and cleanup are covered
- carrier and export proofs preserve owner markers
- runtime inspect coverage records both rows as owner-backed

## Reopen Rules

Reopen the plan if source records cannot provide target coordinates, diagnostic/process normalization requires always-on ledger collection, process events need a new owner taxonomy, or public CLI grammar must change.
