# Playground Runtime Evidence Refresh Proposal

## Executive Summary

Playground runtime try-run must converge on one internal evidence pipeline. The final shape is not an `actionManifest` patch. It is a unified `PlaygroundRuntimeEvidenceRefresh` path that runs current `ProjectSnapshot` through runtime-backed operations and returns one evidence envelope for `reflect`, `run`, `dispatch`, `check`, and `trialStartup`.

The product path must stop deriving usable actions from source regex. Actions, Drivers, Raw Dispatch, Trace, Check, Trial, and Workbench Projection all consume runtime evidence. If reflection is unavailable, the UI renders unavailable state plus an evidence gap. It must not manufacture an action list from source text.

No new public core API is required. Playground continues to use `@logixjs/core/repo-internal/reflection-api` and its own internal runner adapter.

## Problem

The current Playground surface has several separate truth slots:

- action buttons can come from `packages/logix-playground/src/internal/action/actionManifest.ts` source regex.
- `ProjectSnapshotRuntimeInvoker` returns unrelated shapes for `run`, `dispatch`, `check`, and `trialStartup`.
- `programSessionRunner` returns an empty trace array, while logs are synthesized locally.
- `workbenchProjection` stitches product state into `truthInputs` and can treat product debug batches as runtime evidence.
- bottom Trace shows evidence gaps for missing check/trial/manifest reports even when runtime reflection and control-plane facilities exist elsewhere.

This creates two failures:

1. The user can see Actions/Drivers and still get `playground-missing-action-manifest`, because UI discovery and runtime reflection are disconnected.
2. Clicking a Driver once can produce many repeated `runner: dispatch increment` logs, because replay/synthetic runner logs are mixed with current operation evidence.

The terminal fix is to make runtime operation evidence the only authority for runnable Playground behavior.

## Terminal Contract

### Single Evidence Root

Introduce a Playground-internal evidence root:

```ts
interface PlaygroundRuntimeEvidenceEnvelope {
  readonly sourceDigest: string
  readonly sourceRevision: number
  readonly operationKind: 'reflect' | 'run' | 'dispatch' | 'check' | 'trialStartup'
  readonly operationCoordinate: {
    readonly instanceId: string
    readonly txnSeq: number
    readonly opSeq: number
  }
  readonly runtimeOutput?: ProjectSnapshotRuntimeOutput
  readonly controlPlaneReport?: ProjectSnapshotControlPlaneReport['report']
  readonly reflectionManifest?: RuntimeReflectionManifest
  readonly minimumActionManifest?: MinimumProgramActionManifest
  readonly operationEvents: ReadonlyArray<RuntimeOperationEvent>
  readonly sourceRefs: ReadonlyArray<RuntimeReflectionSourceRef>
  readonly artifactRefs: ReadonlyArray<{
    readonly outputKey: string
    readonly kind: string
    readonly digest: string
  }>
  readonly evidenceGaps: ReadonlyArray<RuntimeOperationEvent>
}
```

Names can be adjusted during implementation, but these semantic fields are frozen:

- source snapshot identity
- operation kind and stable operation coordinate
- runtime output or control-plane report
- full runtime reflection manifest when available
- minimum action manifest as a projection of runtime reflection
- runtime operation events
- source refs and artifact refs
- evidence gap events

### Operation Coverage

`ProjectSnapshotRuntimeInvoker` is replaced or narrowed into `ProjectSnapshotRuntimeEvidenceInvoker`.

Required methods:

- `reflect(snapshot, seq?)`
- `run(snapshot, seq?)`
- `dispatch(input)`
- `check(snapshot, seq?)`
- `trialStartup(snapshot, seq?)`

Every method returns `PlaygroundRuntimeEvidenceEnvelope`.

`reflect` compiles the current snapshot and calls `extractRuntimeReflectionManifest(Program, { programId, sourceRefs })`. `minimumActionManifest` is projected from the full manifest or extracted through the same runtime-backed wrapper. It must not use source regex.

`run`, `dispatch`, `check`, and `trialStartup` attach operation events and artifact refs to their existing outputs. Transport failure becomes `operation.failed` plus a structured evidence gap.

### Action Authority

Action panel, Driver panel, and Raw Dispatch all validate against runtime-backed manifest action tags.

Rules:

- Actions render only from `minimumActionManifest.actions` or `reflectionManifest.actions`.
- Drivers may be predefined product commands, but their dispatch target must match a manifest action tag before the button becomes runnable.
- Raw Dispatch validates `_tag` against the same manifest.
- Missing manifest means disabled/unavailable controls plus an evidence gap.
- Source regex discovery cannot create runnable product actions.

### Check And Trial Evidence

`check` and `trialStartup` reports are captured into the same envelope as reflection evidence:

- report output remains a control-plane report, not a run result.
- report artifact refs include `reflectionManifest` digest when available.
- source digest and manifest digest must be visible to the workbench projection.
- missing report or manifest is represented by evidence gap events.

### Trace And Session

Session state is a host view cache. It is not a runtime authority.

Trace must be derived from runtime operation events:

- `operation.accepted`
- `operation.completed`
- `operation.failed`
- `evidence.gap`

Dispatch events must use stable `instanceId / txnSeq / opSeq`. The current repeated replay logs must be bounded so one user dispatch produces one accepted/completed pair for the current operation. Replay may remain internal to reconstruct state, but it cannot be projected as repeated current dispatch evidence.

### Workbench Projection

`workbenchProjection` consumes these inputs:

- runtime output for Run or Dispatch
- control-plane report for Check or Trial
- `createWorkbenchReflectionBridgeBundle({ manifest, sourceRefs, operationEvents, evidenceGaps })`
- explicit product metadata for Driver and Scenario context
- host view state for UI-only layout and panel state

It must not synthesize product debug event batches as runtime operation truth. Product expectation or scenario metadata can remain as classified debug evidence or context refs.

## Implementation Sketch

### Files To Touch

- `packages/logix-playground/src/internal/runner/projectSnapshotRuntimeInvoker.ts`
  - introduce evidence envelope types.
  - add `reflect`.
  - wrap all operations in operation event creation.
  - include artifact refs, source refs, and evidence gaps.

- `packages/logix-playground/src/internal/runner/actionManifestWrapper.ts`
  - replace minimum-only wrapper with runtime reflection wrapper or add a sibling `runtimeReflectionWrapper`.
  - keep minimum action manifest as a projection, not as an independent authority.

- `packages/logix-playground/src/internal/runner/controlPlaneRunner.ts`
  - return report plus artifact/source digest metadata or let the invoker attach it.

- `packages/logix-playground/src/internal/runner/programSessionRunner.ts`
  - stop returning empty traces for successful dispatch.
  - return runtime operation events or enough runtime debug refs for the invoker to project into events.
  - bound replay logs so current dispatch evidence is not repeated for historical actions.

- `packages/logix-playground/src/internal/components/PlaygroundShell.tsx`
  - replace `deriveActionManifestFromSnapshot(snapshot)` with evidence refresh state.
  - render action/driver/raw dispatch availability from runtime-backed manifest only.

- `packages/logix-playground/src/internal/action/actionManifest.ts`
  - delete product-path regex authority.
  - if a negative fixture is still useful, move it under test support with a name that marks it as forbidden source-regex authority.

- `packages/logix-playground/src/internal/summary/workbenchProjection.ts`
  - consume `createWorkbenchReflectionBridgeBundle`.
  - remove product debug event batch as runtime operation evidence.
  - keep Driver/Scenario as product metadata, context refs, host view state, or explicit evidence gaps.

- `packages/logix-playground/src/internal/components/ActionManifestPanel.tsx`
- `packages/logix-playground/src/internal/components/DriverPanel.tsx`
- `packages/logix-playground/src/internal/components/SessionConsolePanel.tsx`
- `packages/logix-playground/src/internal/components/RuntimeInspector.tsx`
- `packages/logix-playground/src/internal/components/WorkbenchBottomPanel.tsx`
  - read projected envelope state and evidence gaps.

- `docs/ssot/runtime/17-playground-product-workbench.md`
  - update SSoT wording to say runtime evidence refresh is the product authority.
  - classify source regex as forbidden product-path authority, test-only negative witness if retained.

### Core Boundary

Use existing repo-internal APIs:

- `extractRuntimeReflectionManifest`
- `extractMinimumProgramActionManifest`
- `createOperationAcceptedEvent`
- `createOperationCompletedEvent`
- `createOperationFailedEvent`
- `createRuntimeOperationEvidenceGap`
- `createWorkbenchReflectionBridgeBundle`

Do not add:

- public `Runtime.playground`
- public Playground reflection root
- public Driver or Scenario authority API
- a second manifest schema owned by Playground

### Source Digest

The invoker must compute a stable digest for the current `ProjectSnapshot` source set. If a helper already exists, use it. If not, add a small internal helper under Playground snapshot/runner internals. The digest must be included in every envelope and in source refs where possible.

## Acceptance Criteria

### Product Behavior

- Loading the default local-counter demo produces a runtime-backed reflection envelope.
- Action panel buttons are rendered from runtime reflection, with no `playground-missing-action-manifest` gap when reflection succeeds.
- Driver `increase` and Action `increase` dispatch the same manifest action tag. They differ only by host metadata and button placement.
- Raw Dispatch accepts only manifest action tags.
- If reflection fails, Actions/Drivers/Raw Dispatch show unavailable or invalid state with evidence gap. No regex-derived runnable action appears.
- One click on Driver `increase` yields one current operation accepted/completed evidence pair and bounded logs. Historical replay does not appear as repeated current dispatch logs.
- Check and Trial results are visible as control-plane reports and share the same source digest/reflection manifest digest path as Action reflection.
- Bottom Trace shows runtime operation events and only real evidence gaps.

### Text Sweep

Product path must have zero normal-path references to source-regex action authority:

- no `deriveActionManifestFromSnapshot` product call site
- no `deriveFallbackActionManifestFromSnapshot` product call site
- no `fallback-source-regex` success path
- any remaining regex helper is under test support or archived/history-only witness and is named as forbidden/negative evidence

### Tests

Add or update tests covering:

- runtime reflection renders local-counter actions.
- Driver and Action `increase` resolve to the same action tag and produce equivalent dispatch result.
- Raw Dispatch rejects an unknown `_tag` before runtime dispatch.
- reflection failure renders unavailable state plus evidence gap, no regex fallback.
- `run`, `dispatch`, `check`, `trialStartup`, and `reflect` envelopes share source digest for one snapshot revision.
- Check/Trial reports attach reflection artifact refs or explicit manifest gap events.
- Workbench projection consumes `createWorkbenchReflectionBridgeBundle` output and does not synthesize product debug batches as runtime operation truth.
- source regex product-path sweep.
- no new public API export from `@logixjs/core`.

### Verification Commands

Minimum implementation verification:

```bash
pnpm --filter @logixjs/playground test
pnpm --filter @logixjs/playground typecheck
pnpm typecheck
pnpm lint
```

If the implementation touches core reflection exports or event law:

```bash
pnpm --filter @logixjs/core test
pnpm check:effect-v4-matrix
```

If browser behavior changes:

```bash
pnpm --filter @logixjs/playground test:browser
```

Use actual package scripts if names differ. Do not use watch mode.

## Non Goals

- No compatibility path for source regex action discovery.
- No staged product fallback where regex keeps UI usable.
- No new public runtime API.
- No second Playground-owned manifest model.
- No promotion of Driver or Scenario metadata into runtime authority.
- No replay/deep host verification beyond the existing check/trial/startup scope.

## Residual Risks

- The exact source digest helper may need to be added if no existing snapshot digest is available.
- Browser tests may need selector updates because Actions and Drivers will enter unavailable state on reflection failure.
- `RuntimeOperationKind` currently lists `dispatch | run | check | trial`; implementation can map `reflect` to evidence gap or extend the repo-internal event law if needed. If extended, update 167 docs and tests in the same implementation.
