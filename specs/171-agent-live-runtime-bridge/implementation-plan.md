# Agent Live Runtime Bridge Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** Completed on 2026-05-02. This file is now an executed worker plan. Current authority for closure evidence is [notes/verification.md](./notes/verification.md), [notes/perf-evidence.md](./notes/perf-evidence.md), and [tasks.md](./tasks.md).

**Goal:** 实施 171 的 repo-internal live runtime bridge，使 Agent 能通过 `logix live <task>` 发现 live target、执行受控 debug operation、导出 canonical evidence，并把 evidence 交回 `trial / compare` 产生 report-owned repair hints。

**Architecture:** Core 拥有 attachment、target identity、operation admission、evidence facet 与 cleanup 语义；CLI 只提供 `LiveCommandResult` transport 和 `logix live` route；React、Node、Playground、DVTools 都只能作为 adapter offer 或 Workbench projection host。所有 live facts 必须通过 canonical evidence package 或 Workbench truth input 进入验证闭环，不能新增第二 report、runtime identity、session truth 或 evidence envelope。

**Tech Stack:** TypeScript 5.9、Effect 4 beta、Vitest、pnpm workspace、Logix core repo-internal APIs、Playwright/browser proof、`agent-browser` failure inspection。

---

## Reading Order

- `specs/171-agent-live-runtime-bridge/spec.md`
- `specs/171-agent-live-runtime-bridge/plan.md`
- `specs/171-agent-live-runtime-bridge/contracts/README.md`
- `specs/171-agent-live-runtime-bridge/data-model.md`
- `specs/171-agent-live-runtime-bridge/scenarios.md`
- `specs/171-agent-live-runtime-bridge/implementation-details/attachment-substrate.md`
- `specs/171-agent-live-runtime-bridge/implementation-details/transport-topology.md`
- `specs/171-agent-live-runtime-bridge/implementation-details/evidence-facets.md`
- `specs/171-agent-live-runtime-bridge/implementation-details/security-budget.md`
- `specs/171-agent-live-runtime-bridge/implementation-details/harness-path.md`
- `docs/ssot/runtime/02-hot-path-direction.md`
- `docs/ssot/runtime/09-verification-control-plane.md`
- `docs/ssot/runtime/14-dvtools-internal-workbench.md`
- `docs/ssot/runtime/15-cli-agent-first-control-plane.md`
- `docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md`

## Non-Negotiable Rules

- Do not expose `RuntimeAttachment` or `RuntimeAgentPort` as public API names.
- Do not add flat root commands such as `rtk logix status`, `rtk logix capture`, `rtk logix snapshot`, `rtk logix wait`, `rtk logix export`, or `rtk logix trigger`.
- Do not let `CommandResult` serve live commands.
- Do not put `repairHints`, `nextRecommendedStage`, verification verdict, runtime identity authority, session truth, or evidence envelope authority into `LiveCommandResult`.
- Do not perform IO, serialization, buffer allocation, transport allocation, adapter discovery, or listener fanout inside runtime transaction windows.
- Do not let adapters, DVTools, Playground, or CLI create a second runtime truth, operation truth, Workbench truth, report truth, or evidence truth.
- Do not use `agent-browser` artifacts as final proof. They are allowed only for exploratory QA and failure inspection.
- Do not run `git add`, `git commit`, `git push`, `git reset`, `git restore`, `git clean`, `git stash`, `git merge`, `git rebase`, or `git cherry-pick` unless the user explicitly authorizes it.

## File Structure

### Core Attachment And Live Semantics

- Create: `packages/logix-core/src/internal/runtime/core/liveTypes.ts`
  - Defines internal live target coordinates, attachment lifecycle, capability leases, operation requests, denial reasons, budget markers, evidence refs.
- Create: `packages/logix-core/src/internal/runtime/core/liveAttachment.ts`
  - Owns attachment registry, disabled static-empty capability path, terminal-state cleanup, target discovery.
- Create: `packages/logix-core/src/internal/runtime/core/liveAdmission.ts`
  - Owns static-live binding, permission, validator availability, budget/redaction admission, pre-mutation denial.
- Create: `packages/logix-core/src/internal/runtime/core/liveOperations.ts`
  - Dispatches P1 operation kinds after admission: `target.discover`, `capture.eventWindow`, `snapshot.read`, `wait.condition`, `evidence.export`, `dispatch.declaredAction`, `profile.runtimeSummary`.
- Create: `packages/logix-core/src/internal/runtime/core/liveEvidence.ts`
  - Builds canonical live evidence facets and maps denial/gap/degraded markers to Workbench-compatible truth inputs.
- Create: `packages/logix-core/src/internal/live-bridge-api.ts`
  - Thin repo-internal export for CLI/Playground/DVTools. This is not public authoring API.
- Modify: `packages/logix-core/package.json`
  - Add development export `./repo-internal/live-bridge-api`.
- Modify: `packages/logix-core/src/internal/workbench/authority.ts`
  - Add only the minimum live-evidence truth input shape needed by projection, if existing `debug-event-batch` and `evidence-package` are insufficient.
- Modify: `packages/logix-core/src/internal/workbench/projection.ts`
  - Project live operation denial/gap/degraded/capture facets without minting diagnostic verdicts.
- Modify: `packages/logix-core/src/internal/workbench/coordinates.ts`
  - Normalize live target/runtime coordinates.
- Modify: `packages/logix-core/src/internal/workbench-api.ts`
  - Re-export new Workbench live projection types only if tests require repo-internal consumers.
- Modify: `packages/logix-core/src/internal/reflection/runtimeOperationEvents.ts`
  - Expand event names only if `operation.denied` and capture/export facets cannot be represented cleanly by a new live evidence module.
- Modify: `packages/logix-core/src/internal/reflection/workbenchBridge.ts`
  - Accept live operation events as canonical evidence facets, not manifest facts.

### Core Tests

- Create: `packages/logix-core/test/internal/LiveBridge/live-attachment.boundary.test.ts`
- Create: `packages/logix-core/test/internal/LiveBridge/live-target-discovery.contract.test.ts`
- Create: `packages/logix-core/test/internal/LiveBridge/live-operation-admission.guard.test.ts`
- Create: `packages/logix-core/test/internal/LiveBridge/live-evidence-facets.contract.test.ts`
- Create: `packages/logix-core/test/internal/LiveBridge/live-workbench-projection.contract.test.ts`
- Create: `packages/logix-core/test/internal/LiveBridge/live-disabled-overhead.guard.test.ts`

### CLI Live Namespace

- Create: `packages/logix-cli/src/internal/liveResult.ts`
  - Defines `LiveCommandResult` and guards against report-owned fields.
- Create: `packages/logix-cli/src/internal/commands/live.ts`
  - Implements `logix live <task>` route and delegates to repo-internal core bridge API.
- Create: `packages/logix-cli/src/internal/liveClient.ts`
  - Talks to local daemon/process bridge or in-process test adapter. No runtime semantics here.
- Create: `packages/logix-cli/src/internal/liveDaemon.ts`
  - Local Node daemon/transport projection for `rtk logix live start/status`. It does not own runtime identity.
- Modify: `packages/logix-cli/src/internal/args.ts`
  - Parse `live` nested commands and reject forbidden flat roots.
- Modify: `packages/logix-cli/src/internal/entry.ts`
  - Route `live` to `runLive`, format `CommandResult | LiveCommandResult`, preserve `CommandResult` for check/trial/compare only.
- Modify: `packages/logix-cli/src/internal/result.ts`
  - Keep `CommandResult` unchanged except shared artifact helpers if needed.
- Modify: `packages/logix-cli/src/internal/output.ts`
  - If used by current CLI output path, support stable JSON for both result envelopes.
- Modify: `packages/logix-cli/src/schema/commands.v1.json`
  - Add `logix live <task>` as live transport route with `LiveCommandResult`, without runtime stage.
- Modify: `packages/logix-cli/src/internal/commandSchema.ts`
  - Mirror schema update.

### CLI Tests

- Create: `packages/logix-cli/test/Integration/live-command-result.contract.test.ts`
- Create: `packages/logix-cli/test/Integration/live-namespace.contract.test.ts`
- Create: `packages/logix-cli/test/Integration/live-flat-root-rejection.guard.test.ts`
- Create: `packages/logix-cli/test/Integration/live-evidence-handoff.e2e.test.ts`
- Modify: `packages/logix-cli/test/Integration/command-schema.guard.test.ts`
- Modify: `packages/logix-cli/test/Integration/output-contract.test.ts`
- Modify: `packages/logix-cli/test/Integration/legacy-command-rejection.guard.test.ts`
- Modify: `packages/logix-cli/test/support/commandResult.ts`
  - Add separate support helpers for `LiveCommandResult`; do not merge the two envelopes.

### Dogfood Fixtures, Playground, DVTools

- Create: `examples/logix/src/verification/live-bridge-fixture.ts`
  - One running runtime, one declared action, one invalid dispatch case, one captureable failure, one evidence export.
- Modify: `examples/logix/src/verification/index.ts`
  - Export the fixture for CLI and browser dogfood tests.
- Create: `examples/logix-react/src/playground/live-bridge-dogfood.tsx`
  - Browser route that offers a dev-only live adapter and exposes observable target/evidence state.
- Create: `examples/logix-react/test/browser/live-bridge-dogfood.spec.ts`
  - Playwright proof for browser route, attach offer, capture/export handoff.
- Modify: `packages/logix-playground/src/internal/session/previewSession.ts`
  - Submit adapter offer only; do not create runtime identity.
- Modify: `packages/logix-playground/src/internal/summary/workbenchProjection.ts`
  - Consume shared Workbench projection.
- Modify: `packages/logix-devtools-react/src/internal/state/index.ts`
  - Consume imported/live evidence projection only.
- Create: `packages/logix-playground/src/internal/summary/liveBridgeProjection.test.ts`
- Create: `packages/logix-devtools-react/src/internal/state/liveBridgeProjection.test.ts`

### Evidence And Notes

- Modify: `specs/171-agent-live-runtime-bridge/notes/verification.md`
  - Record W171-001, W171-003, W171-006, W171-009 after implementation.
- Modify: `specs/171-agent-live-runtime-bridge/notes/perf-evidence.md`
  - Record W171-002 disabled overhead proof.
- Modify: `docs/ssot/runtime/09-verification-control-plane.md`
  - Only if final evidence handoff fields change.
- Modify: `docs/ssot/runtime/14-dvtools-internal-workbench.md`
  - Only if final DVTools consumer boundary changes.
- Modify: `docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md`
  - Replace future proof refs with actual proof refs after successful dogfood.
- Modify: `specs/165-runtime-workbench-kernel/spec.md`
  - Only if Workbench input contract changes.
- Modify: `specs/167-runtime-reflection-manifest/spec.md`
  - Only if static-live binding refs change.
- Modify: `specs/168-kernel-to-playground-verification-parity/spec.md`
  - Only if Playground dogfood boundary changes.

## Chunk 1: Core Attachment Substrate

### Task 1: Core Live Types

**Files:**
- Create: `packages/logix-core/src/internal/runtime/core/liveTypes.ts`
- Test: `packages/logix-core/test/internal/LiveBridge/live-attachment.boundary.test.ts`

- [x] **Step 1: Write failing type/behavior tests**

Add tests that construct minimal lifecycle and target values:

```ts
import { describe, expect, it } from 'vitest'
import {
  makeLiveAttachmentState,
  makeLiveTargetCoordinate,
  type LiveOperationRequest,
} from '../../../src/internal/runtime/core/liveTypes.js'

describe('live attachment boundary', () => {
  it('normalizes target coordinates and keeps attachment lifecycle explicit', () => {
    expect(makeLiveTargetCoordinate({ runtimeId: ' r1 ', moduleId: 'm1', instanceId: 'i1' })).toEqual({
      runtimeId: 'r1',
      moduleId: 'm1',
      instanceId: 'i1',
    })

    expect(makeLiveAttachmentState({ attachmentId: 'a1', state: 'disabled' }).state).toBe('disabled')
  })

  it('does not put verdict or repair advice in operation requests', () => {
    const request: LiveOperationRequest = {
      actorId: 'agent',
      operationKind: 'target.discover',
      target: { runtimeId: 'r1', moduleId: 'm1', instanceId: 'i1' },
      budget: { maxEvents: 0, maxInlineBytes: 0 },
      redactionPolicyRef: 'default',
    }

    expect(JSON.stringify(request)).not.toMatch(/repairHints|nextRecommendedStage|verdict/)
  })
})
```

- [x] **Step 2: Run test to verify it fails**

Run:

```bash
rtk pnpm -C packages/logix-core test -- --run test/internal/LiveBridge/live-attachment.boundary.test.ts --reporter=dot
```

Expected: fail because `liveTypes.ts` does not exist.

- [x] **Step 3: Implement minimal live types**

Create:

```ts
export type LiveAttachmentLifecycleState =
  | 'disabled'
  | 'offered'
  | 'attached'
  | 'draining'
  | 'revoked'
  | 'disconnected'
  | 'target-unavailable'
  | 'cleaned'

export interface LiveTargetCoordinate {
  readonly runtimeId: string
  readonly moduleId: string
  readonly instanceId: string
}

export interface LiveBudgetProfile {
  readonly maxEvents: number
  readonly maxInlineBytes: number
  readonly timeoutMs?: number
}

export type LiveOperationKind =
  | 'target.discover'
  | 'capture.eventWindow'
  | 'snapshot.read'
  | 'wait.condition'
  | 'evidence.export'
  | 'dispatch.declaredAction'
  | 'profile.runtimeSummary'

export interface LiveOperationRequest {
  readonly actorId: string
  readonly operationKind: LiveOperationKind
  readonly target: LiveTargetCoordinate
  readonly permissionScope?: string
  readonly capabilityLeaseId?: string
  readonly manifestDigest?: string
  readonly actionTag?: string
  readonly payloadSchemaRef?: string
  readonly validatorAvailable?: boolean
  readonly budget: LiveBudgetProfile
  readonly redactionPolicyRef: string
}

export const makeLiveTargetCoordinate = (input: LiveTargetCoordinate): LiveTargetCoordinate => ({
  runtimeId: input.runtimeId.trim() || 'unknown-runtime',
  moduleId: input.moduleId.trim() || 'unknown-module',
  instanceId: input.instanceId.trim() || 'unknown-instance',
})

export const makeLiveAttachmentState = (input: {
  readonly attachmentId: string
  readonly state: LiveAttachmentLifecycleState
}) => ({
  attachmentId: input.attachmentId.trim() || 'unknown-attachment',
  state: input.state,
})
```

- [x] **Step 4: Run test to verify it passes**

Run the same command. Expected: pass.

- [x] **Step 5: Checkpoint**

Run:

```bash
rtk git diff -- packages/logix-core/src/internal/runtime/core/liveTypes.ts packages/logix-core/test/internal/LiveBridge/live-attachment.boundary.test.ts
```

Do not commit unless the user explicitly authorizes commits.

### Task 2: Attachment Registry And Disabled Path

**Files:**
- Create: `packages/logix-core/src/internal/runtime/core/liveAttachment.ts`
- Test: `packages/logix-core/test/internal/LiveBridge/live-attachment.boundary.test.ts`
- Test: `packages/logix-core/test/internal/LiveBridge/live-disabled-overhead.guard.test.ts`

- [x] **Step 1: Write failing tests for disabled and terminal states**

Required assertions:

- disabled bridge returns static-empty capabilities.
- revoked/disconnected/target-unavailable/cleaned states deny later mutation-capable requests.
- cleanup drains evidence refs or records dropped/degraded marker.
- no disabled path allocation of capture buffer.

Use test names:

```ts
it('returns static-empty capability when disabled')
it('keeps revoked and disconnected attachments terminal')
it('does not allocate capture buffer on disabled path')
```

- [x] **Step 2: Run tests to verify they fail**

```bash
rtk pnpm -C packages/logix-core test -- --run test/internal/LiveBridge/live-attachment.boundary.test.ts test/internal/LiveBridge/live-disabled-overhead.guard.test.ts --reporter=dot
```

Expected: fail because registry API does not exist.

- [x] **Step 3: Implement minimal registry**

Implementation responsibilities:

- `createLiveAttachmentRegistry({ enabled })`
- `submitAttachmentOffer(offer)`
- `listTargets()`
- `getAttachmentState(attachmentId)`
- `markTerminal(attachmentId, state)`
- `cleanup(attachmentId)`
- `getCapabilities()`

Keep all storage in memory for v1. No daemon or browser global logic in core.

- [x] **Step 4: Run tests to verify pass**

Run the same test command. Expected: pass.

- [x] **Step 5: Run targeted typecheck**

```bash
rtk pnpm -C packages/logix-core typecheck
```

Expected: exit 0.

## Chunk 2: Operation Admission And Evidence

### Task 3: Admission Guard

**Files:**
- Create: `packages/logix-core/src/internal/runtime/core/liveAdmission.ts`
- Test: `packages/logix-core/test/internal/LiveBridge/live-operation-admission.guard.test.ts`

- [x] **Step 1: Write failing admission tests**

Cover these cases:

- valid declared action with validator available returns `operation.accepted`.
- stale manifest returns `operation.denied` and `noMutation: true`.
- digest mismatch returns `operation.denied` and `noMutation: true`.
- unavailable action contract returns `operation.denied` and `noMutation: true`.
- unauthorized target returns `operation.denied` and `noMutation: true`.
- missing validator for non-void dispatch returns `operation.denied` and `noMutation: true`.

- [x] **Step 2: Run test to verify it fails**

```bash
rtk pnpm -C packages/logix-core test -- --run test/internal/LiveBridge/live-operation-admission.guard.test.ts --reporter=dot
```

- [x] **Step 3: Implement `admitLiveOperation`**

Required return shape:

```ts
export type LiveAdmissionResult =
  | {
      readonly ok: true
      readonly kind: 'operation.accepted'
      readonly request: LiveOperationRequest
    }
  | {
      readonly ok: false
      readonly kind: 'operation.denied'
      readonly reason:
        | 'stale-manifest'
        | 'digest-mismatch'
        | 'unavailable-action-contract'
        | 'unauthorized-target'
        | 'missing-validator'
        | 'unsupported-operation'
      readonly noMutation: true
      readonly request: LiveOperationRequest
    }
```

Do not call runtime mutation code from this module.

- [x] **Step 4: Run admission tests**

Expected: pass.

### Task 4: Live Evidence Facets

**Files:**
- Create: `packages/logix-core/src/internal/runtime/core/liveEvidence.ts`
- Modify: `packages/logix-core/src/internal/workbench/authority.ts`
- Modify: `packages/logix-core/src/internal/workbench/projection.ts`
- Test: `packages/logix-core/test/internal/LiveBridge/live-evidence-facets.contract.test.ts`
- Test: `packages/logix-core/test/internal/LiveBridge/live-workbench-projection.contract.test.ts`

- [x] **Step 1: Write failing evidence tests**

Assertions:

- denied operation becomes canonical evidence facet.
- capture event window includes budget, dropped, degraded, redaction markers.
- Workbench projection sees artifact/gap identity but does not create verdict.
- live facts do not enter reflection manifest.

- [x] **Step 2: Run tests to verify they fail**

```bash
rtk pnpm -C packages/logix-core test -- --run test/internal/LiveBridge/live-evidence-facets.contract.test.ts test/internal/LiveBridge/live-workbench-projection.contract.test.ts --reporter=dot
```

- [x] **Step 3: Implement facet builders**

Expose these functions from `liveEvidence.ts`:

```ts
export const makeLiveOperationDeniedFacet = (...)
export const makeLiveOperationAcceptedFacet = (...)
export const makeLiveOperationCompletedFacet = (...)
export const makeLiveOperationFailedFacet = (...)
export const makeLiveCaptureFacet = (...)
export const makeLiveEvidenceGap = (...)
export const toWorkbenchTruthInput = (...)
```

Use `artifact-ref`, `evidence-package`, `debug-event-batch`, or a minimal new `live-evidence` truth input only if existing Workbench types cannot preserve identity.

- [x] **Step 4: Run tests**

Expected: pass.

### Task 5: Repo-Internal Core API

**Files:**
- Create: `packages/logix-core/src/internal/live-bridge-api.ts`
- Modify: `packages/logix-core/package.json`
- Test: `packages/logix-core/test/internal/LiveBridge/live-target-discovery.contract.test.ts`

- [x] **Step 1: Write failing import/API test**

The test should import from source path first:

```ts
import { createLiveAttachmentRegistry } from '../../../src/internal/live-bridge-api.js'
```

Then add package export tests later from CLI side.

- [x] **Step 2: Implement thin export**

```ts
export * from './runtime/core/liveTypes.js'
export * from './runtime/core/liveAttachment.js'
export * from './runtime/core/liveAdmission.js'
export * from './runtime/core/liveEvidence.js'
```

- [x] **Step 3: Add package export**

Add to `packages/logix-core/package.json` dev exports:

```json
"./repo-internal/live-bridge-api": "./src/internal/live-bridge-api.ts"
```

Add to `publishConfig.exports` as `null`, matching existing repo-internal exports policy.

- [x] **Step 4: Run tests and typecheck**

```bash
rtk pnpm -C packages/logix-core test -- --run test/internal/LiveBridge --reporter=dot
rtk pnpm -C packages/logix-core typecheck
```

## Chunk 3: CLI Live Namespace

### Task 6: `LiveCommandResult`

**Files:**
- Create: `packages/logix-cli/src/internal/liveResult.ts`
- Test: `packages/logix-cli/test/Integration/live-command-result.contract.test.ts`

- [x] **Step 1: Write failing envelope tests**

Assertions:

- `kind` is `LiveCommandResult`.
- no `primaryReportOutputKey`.
- no `repairHints`, `nextRecommendedStage`, `verdict`.
- has `primaryLiveOutputKey`.
- artifact links use `artifacts[].outputKey`.

- [x] **Step 2: Run test to verify fail**

```bash
rtk pnpm -C packages/logix-cli test -- --run test/Integration/live-command-result.contract.test.ts --reporter=dot
```

- [x] **Step 3: Implement envelope**

```ts
export interface LiveArtifactOutput {
  readonly outputKey: string
  readonly kind: 'LiveTargetList' | 'LiveOperationFacet' | 'LiveCapture' | 'CanonicalEvidencePackage' | 'EvidenceGap'
  readonly ok: boolean
  readonly inline?: JsonValue
  readonly file?: string
  readonly digest?: string
  readonly reasonCodes?: ReadonlyArray<string>
}

export interface LiveCommandResult {
  readonly schemaVersion: 1
  readonly kind: 'LiveCommandResult'
  readonly runId: string
  readonly command: string
  readonly ok: boolean
  readonly inputCoordinate: unknown
  readonly artifacts: ReadonlyArray<LiveArtifactOutput>
  readonly primaryLiveOutputKey: string
  readonly error?: SerializableErrorSummary
}
```

`makeLiveCommandResult` must reject forbidden top-level keys by construction and validate `primaryLiveOutputKey`.

- [x] **Step 4: Run envelope test**

Expected: pass.

### Task 7: Parser And Command Schema

**Files:**
- Modify: `packages/logix-cli/src/internal/args.ts`
- Modify: `packages/logix-cli/src/schema/commands.v1.json`
- Modify: `packages/logix-cli/src/internal/commandSchema.ts`
- Modify: `packages/logix-cli/test/Integration/command-schema.guard.test.ts`
- Create: `packages/logix-cli/test/Integration/live-namespace.contract.test.ts`
- Create: `packages/logix-cli/test/Integration/live-flat-root-rejection.guard.test.ts`

- [x] **Step 1: Write failing parser tests**

Accepted:

```bash
rtk logix live start --runId r1
rtk logix live status --runId r1
rtk logix live targets --runId r1 --tree
rtk logix live inspect --runId r1 --target runtime:r1/module:m1/instance:i1
rtk logix live capture --runId r1 --target ... --window 5s
rtk logix live snapshot --runId r1 --target ...
rtk logix live wait --runId r1 --target ... --condition ready --timeout 5000
rtk logix live dispatch --runId r1 --target ... --action submit --payload payload.json
rtk logix live profile start --runId r1 --target ...
rtk logix live profile stop --runId r1 --target ...
rtk logix live profile summary --runId r1 --target ...
rtk logix live export evidence --runId r1 --from <daemon-lineage-ref>
```

Rejected:

```bash
rtk logix status
rtk logix capture
rtk logix snapshot
rtk logix wait
rtk logix export
rtk logix trigger
```

- [x] **Step 2: Run tests to verify fail**

```bash
rtk pnpm -C packages/logix-cli test -- --run test/Integration/live-namespace.contract.test.ts test/Integration/live-flat-root-rejection.guard.test.ts test/Integration/command-schema.guard.test.ts --reporter=dot
```

- [x] **Step 3: Implement `CliInvocation` live branch**

Add a separate union branch:

```ts
export type LiveTask =
  | { readonly task: 'start' }
  | { readonly task: 'status' }
  | { readonly task: 'targets'; readonly tree: boolean }
  | { readonly task: 'inspect'; readonly target: string }
  | { readonly task: 'capture'; readonly target: string; readonly windowMs: number }
  | { readonly task: 'snapshot'; readonly target: string }
  | { readonly task: 'wait'; readonly target: string; readonly condition: string; readonly timeoutMs: number }
  | { readonly task: 'dispatch'; readonly target: string; readonly action: string; readonly payload?: string }
  | { readonly task: 'profile.start' | 'profile.stop' | 'profile.summary'; readonly target: string }
  | { readonly task: 'export.evidence'; readonly from: string }
```

Do not add a runtime stage for live.

- [x] **Step 4: Update help text**

`printHelp()` must include `logix live <task>` but must not list flat roots as top-level commands.

- [x] **Step 5: Run tests**

Expected: pass.

### Task 8: CLI Live Runner

**Files:**
- Create: `packages/logix-cli/src/internal/commands/live.ts`
- Create: `packages/logix-cli/src/internal/liveClient.ts`
- Create: `packages/logix-cli/src/internal/liveDaemon.ts`
- Modify: `packages/logix-cli/src/internal/entry.ts`
- Test: `packages/logix-cli/test/Integration/live-namespace.contract.test.ts`

- [x] **Step 1: Write failing runner tests**

Use an in-process fake live client. Assert:

- `rtk logix live status` returns `LiveCommandResult`.
- `logix live targets` primary artifact kind is `LiveTargetList`.
- `logix live dispatch` denial returns `LiveOperationFacet` with `noMutation: true`.
- `logix live export evidence` returns `CanonicalEvidencePackage` ref.

- [x] **Step 2: Run tests to verify fail**

```bash
rtk pnpm -C packages/logix-cli test -- --run test/Integration/live-namespace.contract.test.ts --reporter=dot
```

- [x] **Step 3: Implement live runner**

`commands/live.ts` may call `createLiveAttachmentRegistry()` for in-process proof, then later switch to daemon transport. `liveClient.ts` translates CLI tasks to core operation requests. `liveDaemon.ts` owns process transport only.

Do not put admission rules in CLI.

- [x] **Step 4: Update `entry.ts` formatting**

Add `formatCliResult(result: CommandResult | LiveCommandResult)` or widen `formatCommandResult` only if the name remains accurate. Keep `CommandResult` constructor unchanged.

- [x] **Step 5: Run CLI tests**

```bash
rtk pnpm -C packages/logix-cli test -- --run test/Integration/live-command-result.contract.test.ts test/Integration/live-namespace.contract.test.ts test/Integration/output-contract.test.ts --reporter=dot
```

## Chunk 4: Evidence Handoff And Repair Closure

### Task 9: Live Evidence To Trial/Compare

**Files:**
- Create: `packages/logix-cli/test/Integration/live-evidence-handoff.e2e.test.ts`
- Modify: `packages/logix-cli/src/internal/evidenceInput.ts`
- Modify: `packages/logix-cli/src/internal/commands/trial.ts`
- Modify: `packages/logix-cli/src/internal/commands/compare.ts`
- Modify: `packages/logix-cli/src/internal/workbenchProjection.ts`
- Create: `examples/logix/src/verification/live-bridge-fixture.ts`
- Modify: `examples/logix/src/verification/index.ts`

- [x] **Step 1: Write failing e2e test**

Flow:

```text
live capture/export evidence
  -> trial --mode startup --evidence <ref>
    -> VerificationControlPlaneReport.repairHints
```

Assertions:

- live result has no repair hints.
- trial report has at least one repair hint.
- repair hint `relatedArtifactOutputKeys` or evidence refs point back to live-derived artifact.

- [x] **Step 2: Run test to verify fail**

```bash
rtk pnpm -C packages/logix-cli test -- --run test/Integration/live-evidence-handoff.e2e.test.ts --reporter=dot
```

- [x] **Step 3: Implement fixture and evidence handoff**

The fixture must expose:

- one running runtime.
- one declared action.
- one invalid dispatch case.
- one captureable failure.
- one evidence export.
- one verification report with repair hints.

- [x] **Step 4: Run handoff test**

Expected: pass.

### Task 10: Workbench Projection Parity

**Files:**
- Modify: `packages/logix-cli/src/internal/workbenchProjection.ts`
- Test: `packages/logix-cli/test/Integration/workbench-parity.contract.test.ts`
- Test: `packages/logix-core/test/internal/LiveBridge/live-workbench-projection.contract.test.ts`

- [x] **Step 1: Add failing parity assertions**

Same canonical evidence package must produce equivalent session/finding/artifact/gap ids through:

- Agent route.
- Workbench projection.
- imported evidence path.

- [x] **Step 2: Run tests**

```bash
rtk pnpm -C packages/logix-core test -- --run test/internal/LiveBridge/live-workbench-projection.contract.test.ts --reporter=dot
rtk pnpm -C packages/logix-cli test -- --run test/Integration/workbench-parity.contract.test.ts --reporter=dot
```

- [x] **Step 3: Implement missing projection normalization**

Normalize target coordinates, artifact refs, evidence gaps, and denial facets. Do not infer findings from operation facets unless report/evidence authority exists.

- [x] **Step 4: Run tests**

Expected: pass.

## Chunk 5: Browser, Playground, And DVTools Dogfood

### Task 11: Browser/React Adapter Offer

**Files:**
- Create: `packages/logix-react/src/internal/liveBridgeAdapter.ts`
- Create: `examples/logix-react/src/playground/live-bridge-dogfood.tsx`
- Create: `examples/logix-react/test/browser/live-bridge-dogfood.spec.ts`

- [x] **Step 1: Write failing browser proof**

Playwright test should:

- open the dogfood route.
- confirm adapter offer is available.
- confirm `logix live targets` equivalent data appears in test fixture.
- trigger capture/export handoff through test-only route.

- [x] **Step 2: Run browser proof to verify fail**

```bash
rtk pnpm -C examples/logix-react test:browser -- --run --silent=passed-only --reporter=dot
```

- [x] **Step 3: Implement dev-only adapter offer**

Rules:

- no frozen public browser global hook name.
- no cloud `globalThis` authority.
- no mutation outside `dispatch.declaredAction`.
- adapter submits offer metadata; core owns identity and admission.

- [x] **Step 4: Use `agent-browser` only for failure inspection**

If Playwright fails, inspect with:

```bash
rtk agent-browser open <local-url>
rtk agent-browser snapshot
rtk agent-browser console
rtk agent-browser errors
rtk agent-browser network requests
rtk agent-browser screenshot specs/171-agent-live-runtime-bridge/artifacts/browser-smoke.png
```

Record any artifact path in `notes/verification.md` as auxiliary material only.

### Task 12: Playground And DVTools Consumers

**Files:**
- Modify: `packages/logix-playground/src/internal/session/previewSession.ts`
- Modify: `packages/logix-playground/src/internal/summary/workbenchProjection.ts`
- Create: `packages/logix-playground/src/internal/summary/liveBridgeProjection.test.ts`
- Modify: `packages/logix-devtools-react/src/internal/state/index.ts`
- Create: `packages/logix-devtools-react/src/internal/state/liveBridgeProjection.test.ts`

- [x] **Step 1: Write failing projection parity tests**

Assertions:

- Playground consumes adapter offer and Workbench projection only.
- DVTools live/imported evidence modes use the same projection law.
- Neither host defines session/finding/artifact truth.

- [x] **Step 2: Run tests to verify fail**

```bash
rtk pnpm -C packages/logix-playground test -- --run src/internal/summary/liveBridgeProjection.test.ts --reporter=dot
rtk pnpm -C packages/logix-devtools-react test -- --run src/internal/state/liveBridgeProjection.test.ts --reporter=dot
```

- [x] **Step 3: Implement consumers**

Use Workbench projection output as read model. Host-local selection state may exist, but cannot affect finding truth.

- [x] **Step 4: Run package typechecks**

```bash
rtk pnpm -C packages/logix-playground typecheck
rtk pnpm -C packages/logix-devtools-react typecheck
```

## Chunk 6: Performance, Documentation, And Final Closure

### Task 13: Disabled Overhead Proof

**Files:**
- Modify: `specs/171-agent-live-runtime-bridge/notes/perf-evidence.md`
- Test: `packages/logix-core/test/internal/LiveBridge/live-disabled-overhead.guard.test.ts`

- [x] **Step 1: Run performance matrix**

```bash
rtk pnpm check:effect-v4-matrix
rtk pnpm perf collect -- --profile default --out specs/171-agent-live-runtime-bridge/perf/before.<sha>.<envId>.default.json
rtk pnpm perf collect -- --profile default --out specs/171-agent-live-runtime-bridge/perf/after.<sha-or-worktree>.<envId>.default.json
rtk pnpm perf diff -- --before specs/171-agent-live-runtime-bridge/perf/before.<sha>.<envId>.default.json --after specs/171-agent-live-runtime-bridge/perf/after.<sha-or-worktree>.<envId>.default.json --out specs/171-agent-live-runtime-bridge/perf/diff.before__after.json
rtk pnpm perf validate -- --report specs/171-agent-live-runtime-bridge/perf/after.<sha-or-worktree>.<envId>.default.json
```

- [x] **Step 2: Record results**

Update `notes/perf-evidence.md` with:

- envId.
- profile.
- before/after/diff artifact paths.
- comparable status.
- p95, allocation, event count.
- explicit transaction-window IO result.

- [x] **Step 3: Block if not comparable**

If `comparable=false`, missing suite, timeout, or stability warning appears, do not close W171-002.

### Task 14: Verification Ledger And SSoT Backlinks

**Files:**
- Modify: `specs/171-agent-live-runtime-bridge/notes/verification.md`
- Modify: `docs/ssot/runtime/09-verification-control-plane.md`
- Modify: `docs/ssot/runtime/14-dvtools-internal-workbench.md`
- Modify: `docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md`
- Modify: `specs/165-runtime-workbench-kernel/spec.md`
- Modify: `specs/167-runtime-reflection-manifest/spec.md`
- Modify: `specs/168-kernel-to-playground-verification-parity/spec.md`

- [x] **Step 1: Record proof rows**

Update W171 proof records:

- W171-001 dogfood handoff.
- W171-002 disabled overhead.
- W171-003 operation denial no mutation.
- W171-006 DVTools/Playground projection parity.
- W171-008 forbidden text sweep.
- W171-009 run -> evidence -> repair.

- [x] **Step 2: Update owner SSoT only where behavior changed**

Do not duplicate schema details into SSoT pages. Add links to proof refs and final field names only.

- [x] **Step 3: Run link and stale-text sweeps**

```bash
rtk rg -n "Runtime\\.devtools|runtime\\.devtools|Runtime\\.inspect|runtime\\.inspect|Logix\\.Reflection|RuntimeAgentPort|LiveEvidenceSidecar|RuntimeOperationEvent|CommandResult.*live|globalThis\\.__LOGIX|\\blogix (status|capture|snapshot|trigger|wait|export)\\b" packages docs specs examples
rtk rg -n "repairHints.*LiveCommandResult|nextRecommendedStage.*LiveCommandResult|verdict.*LiveCommandResult" packages docs specs examples
```

Classify every remaining hit.

### Task 15: Full Validation

**Files:**
- No source files unless validation exposes defects.

- [x] **Step 1: Run targeted core checks**

```bash
rtk pnpm -C packages/logix-core typecheck
rtk pnpm -C packages/logix-core test -- --run --cache --silent=passed-only --reporter=dot
```

- [x] **Step 2: Run targeted CLI checks**

```bash
rtk pnpm -C packages/logix-cli typecheck
rtk pnpm -C packages/logix-cli test -- --run --cache --silent=passed-only --reporter=dot
```

- [x] **Step 3: Run host checks**

```bash
rtk pnpm -C packages/logix-react typecheck
rtk pnpm -C packages/logix-playground typecheck
rtk pnpm -C packages/logix-devtools-react typecheck
rtk pnpm -C examples/logix-react typecheck
rtk pnpm -C examples/logix-react test:browser -- --run --silent=passed-only --reporter=dot
```

- [x] **Step 4: Run workspace checks**

```bash
rtk pnpm typecheck
rtk pnpm lint
rtk pnpm test:turbo
```

- [x] **Step 5: Final scenario checklist**

Compare `specs/171-agent-live-runtime-bridge/scenarios.md` with proof records. Every required scenario must have proof refs or explicit owner handoff.

- [x] **Step 6: Status update**

Only after all success criteria pass, update `specs/171-agent-live-runtime-bridge/spec.md` status out of Draft. If any proof is blocked, keep Draft and list blocker in `notes/verification.md`.

## Final Acceptance Checklist

- [x] `logix live` public namespace exists.
- [x] Flat root live commands are rejected.
- [x] `CommandResult` remains verification-only.
- [x] `LiveCommandResult` has no report/verdict/repair scheduling authority.
- [x] Core owns attachment lifecycle and target identity.
- [x] Disabled path is structural no-op or static-empty.
- [x] Mutation-capable denial is pre-mutation and `noMutation: true`.
- [x] Live evidence exports canonical evidence package refs.
- [x] Trial/compare consume live-derived evidence and produce report-owned repair hints.
- [x] DVTools and Playground consume the same Workbench projection.
- [x] Browser proof uses Playwright or equivalent repeatable browser test.
- [x] `agent-browser` artifacts are auxiliary only.
- [x] Performance proof is comparable.
- [x] W171-001 through W171-009 are recorded or explicitly blocked.
- [x] Final text sweep has no active forbidden public shape.
