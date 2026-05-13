# Agent Live Runtime Bridge Real Carrier Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current in-process proof transport for `logix live` with a real local daemon, browser WebSocket adapter, CLI IPC client, dual frontend dev integration, and multi-tab aware attachment projection while preserving 171's core-owned live semantics.

**Architecture:** Browser and React dev hosts install the same live browser adapter through either Vite dev plugin injection or the `@logixjs/react/dev/live` dev-only import entry. Both frontend entries submit `host.offer` messages over a dev-only WebSocket carrier to a local daemon. The CLI talks to the daemon over local IPC and only receives owner-backed live artifacts, canonical evidence packages, attachment/host locators, or structured gaps. The daemon and WebSocket are transport projections only; runtime identity, attachment lifecycle, operation admission, evidence facets, Workbench projection, and repair closure stay owned by core and the verification control plane.

**Tech Stack:** TypeScript, Node `net`/`fs`/`child_process`, `ws`, Effect, Vitest, Playwright, Vite dev plugin injection, dev-only side-effect import, `@logixjs/core/repo-internal/live-bridge-api`, `@logixjs/react/dev/*`, `@logixjs/cli`.

---

## Execution Notes

- This is a post-closure implementation delta for 171. The semantic MVP is done; this plan closes the remaining product usability gap: true browser/daemon/CLI carrier.
- Do not add public flat live root commands. Keep the public CLI root at `logix live <task>`.
- Do not use React DevTools protocol as Logix truth. React component tree support is out of scope for this plan.
- Do not make WebSocket, daemon id, socket path, browser page id, or `tabId` runtime identity.
- Frontend integration has two required entries:
  - Vite dev plugin injection for the normal Vite app path.
  - `import "@logixjs/react/dev/live"` dev-only import for minimal E2E pages, explicit app integration, and non-plugin reproduction.
- The Vite plugin and dev-only import must install the same browser adapter and emit the same `host.offer` wire contract. They must not fork protocol, evidence shape, attachment identity, or CLI behavior.
- Do not commit from this plan unless the user explicitly authorizes git operations. Treat each "Checkpoint" step as a local verification stop, not a git commit.
- All shell commands in this repository must be run with `rtk`.

## Reading Order

- `specs/171-agent-live-runtime-bridge/spec.md`
- `specs/171-agent-live-runtime-bridge/implementation-details/transport-topology.md`
- `specs/171-agent-live-runtime-bridge/contracts/README.md`
- `specs/171-agent-live-runtime-bridge/data-model.md`
- `specs/171-agent-live-runtime-bridge/tasks.md`
- `docs/ssot/runtime/15-cli-agent-first-control-plane.md`
- `packages/logix-cli/src/internal/liveClient.ts`
- `packages/logix-cli/src/internal/liveDaemon.ts`
- `packages/logix-cli/src/internal/commands/live.ts`
- `packages/logix-core/src/internal/runtime/core/liveTypes.ts`
- `packages/logix-core/src/internal/runtime/core/liveAttachment.ts`
- `packages/logix-react/src/internal/dev/lifecycleCarrier.ts`
- `packages/logix-react/src/dev/vite.ts`
- `examples/logix-react/test/browser/playground-live-bridge-dogfood.playwright.ts`

## Success Proofs

- W171-011: `logix live start -> browser tab connects -> logix live targets --tree` shows at least one real browser attachment row and host locator. This must pass through both frontend entries: Vite dev plugin injection and `import "@logixjs/react/dev/live"` dev-only import.
- W171-012: two browser tabs connecting to the same route produce two attachment rows. They may share runtime coordinates, but must have distinct attachment/transport locators.
- W171-013: `logix live capture/snapshot/export evidence` returns real daemon-backed live artifacts or canonical evidence packages, not the old in-process proof gap.
- W171-014: browser disconnect, reload, and daemon stop move attachments to terminal/degraded state. Later requests return `operation.denied`, `evidence.gap`, or degraded marker, not writable live truth.
- W171-015: `LiveCommandResult` still contains no `repairHints`, `nextRecommendedStage`, or verification verdict; repair advice still comes only from `trial` or `compare`.
- W171-016: disabled/no-daemon path remains structural no-op for runtime hot path and does not allocate capture buffers or perform transaction-window IO.

## File Structure

### Core Live Contract

- Modify: `packages/logix-core/src/internal/runtime/core/liveTypes.ts`
  - Add `LiveHostCoordinate`, `LiveTransportProjection`, host locator fields on offers and target descriptors.
- Modify: `packages/logix-core/src/internal/runtime/core/liveAttachment.ts`
  - Preserve host/transport locators through attachment registry and target discovery.
- Create: `packages/logix-core/src/internal/runtime/core/liveWireTypes.ts`
  - Define daemon/browser/CLI wire envelopes and runtime guards.
- Modify: `packages/logix-core/src/internal/live-bridge-api.ts`
  - Re-export internal wire helpers for CLI and React dev adapter.
- Test: `packages/logix-core/test/internal/LiveBridge/live-host-coordinate.contract.test.ts`
- Test: `packages/logix-core/test/internal/LiveBridge/live-wire-types.contract.test.ts`

### CLI Carrier

- Modify: `packages/logix-cli/src/internal/liveDaemon.ts`
  - Keep transport projection types and daemon state contract here.
- Create: `packages/logix-cli/src/internal/liveTransportPaths.ts`
  - Resolve state dir, socket path, metadata path, default WebSocket host/port.
- Create: `packages/logix-cli/src/internal/liveDaemonServer.ts`
  - Own local daemon process behavior, WebSocket server, IPC server, connection lifecycle, and command routing.
- Create: `packages/logix-cli/src/internal/liveDaemonClient.ts`
  - Own CLI IPC request/response, status probing, stop, and command timeout handling.
- Modify: `packages/logix-cli/src/internal/liveClient.ts`
  - Replace demo registry with daemon client. Keep structured gaps when daemon is stopped.
- Modify: `packages/logix-cli/src/bin/logix.ts`
  - Hidden `__internal_live_daemon` selector re-execs the current CLI and starts the daemon runtime.
- Modify: `packages/logix-cli/tsup.config.ts`
  - Final build surface contains only `src/bin/logix.ts`; the early second daemon bin shape was superseded by launcher/operator snapshot hardening.
- Test: `packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts`
- Test: `packages/logix-cli/test/Integration/live-daemon-multitab.contract.test.ts`
- Test: `packages/logix-cli/test/Integration/live-daemon-disconnect.contract.test.ts`

### React Browser Adapter

- Modify: `packages/logix-react/src/internal/dev/lifecycleCarrier.ts`
  - Expose a dev-only binding snapshot list for live adapter discovery.
- Create: `packages/logix-react/src/internal/dev/liveBrowserAdapter.ts`
  - Connect to daemon WebSocket, submit host offers, publish target snapshots, capture/snapshot/export evidence, and handle disconnect.
- Create: `packages/logix-react/src/dev/live.ts`
  - Dev-only public entry that installs the browser adapter. It must support a side-effect import form, `import "@logixjs/react/dev/live"`, plus a named install API used by tests and Vite injection. This is not business authoring API.
- Modify: `packages/logix-react/src/dev/vite.ts`
  - Add optional live bridge injection or a separate `logixReactLiveBridge` helper that injects the same adapter entry rather than owning a second transport path.
- Modify: `packages/logix-react/package.json`
  - Export `./dev/live` in source and publish config.
- Test: `packages/logix-react/test/internal/dev/live-browser-adapter.contract.test.ts`
- Test: `packages/logix-react/test/hmr-host-carrier.contract.test.ts`

### Example Browser Proof

- Modify: `examples/logix-react/vite.config.ts`
  - Enable live bridge dev injection for the dogfood app.
- Create: `examples/logix-react/test/browser/live-real-carrier.playwright.ts`
  - Start daemon, start Vite, open two browser tabs, query CLI targets, close one tab, export evidence.
- Create: `examples/logix-react/test/browser/live-dev-only-import.playwright.ts`
  - Start daemon and a lightweight page whose bridge integration is only `import "@logixjs/react/dev/live"`, then simulate the CLI through daemon IPC and assert the browser/daemon/CLI chain.
- Create: `examples/logix-react/test/fixtures/live-dev-only-import/main.ts`
  - Keep the bridge integration line as the only Logix live adapter import. Any runtime fixture needed by the test must stay in the harness, not in a second bridge entry.
- Modify: `examples/logix-react/package.json`
  - Add `test:browser:live-real-carrier` and include both the plugin-injected dogfood proof and the dev-only import proof.
- Modify: `specs/171-agent-live-runtime-bridge/notes/verification.md`
  - Record W171-011 through W171-016.
- Modify: `specs/171-agent-live-runtime-bridge/notes/perf-evidence.md`
  - Record disabled/no-daemon perf revalidation.

## Chunk 1: Core Wire Contract

### Task 1: Add Host And Transport Coordinates

**Files:**
- Modify: `packages/logix-core/src/internal/runtime/core/liveTypes.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/liveAttachment.ts`
- Test: `packages/logix-core/test/internal/LiveBridge/live-host-coordinate.contract.test.ts`

- [ ] **Step 1: Write the failing host-coordinate test**

```ts
import { describe, expect, it } from 'vitest'
import {
  createLiveAttachmentRegistry,
  makeLiveTargetCoordinate,
} from '../../../src/internal/live-bridge-api.js'

describe('live host coordinate projection', () => {
  it('keeps two browser attachments distinct even when runtime coordinates match', () => {
    const registry = createLiveAttachmentRegistry({ enabled: true })
    const target = makeLiveTargetCoordinate({
      runtimeId: 'example-runtime',
      moduleId: 'LiveBridgeFixture',
      instanceId: 'default',
    })

    registry.submitAttachmentOffer({
      attachmentId: 'browser:conn-1',
      adapterKind: 'browser-dev',
      hostCoordinate: { hostKind: 'browser', tabId: 'tab-a', projectId: 'examples/logix-react' },
      transport: { carrier: 'websocket', connectionId: 'conn-1' },
      targets: [target],
    })
    registry.submitAttachmentOffer({
      attachmentId: 'browser:conn-2',
      adapterKind: 'browser-dev',
      hostCoordinate: { hostKind: 'browser', tabId: 'tab-b', projectId: 'examples/logix-react' },
      transport: { carrier: 'websocket', connectionId: 'conn-2' },
      targets: [target],
    })

    expect(registry.listTargets()).toEqual([
      expect.objectContaining({ attachmentId: 'browser:conn-1', hostCoordinate: expect.objectContaining({ tabId: 'tab-a' }) }),
      expect.objectContaining({ attachmentId: 'browser:conn-2', hostCoordinate: expect.objectContaining({ tabId: 'tab-b' }) }),
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
rtk pnpm -C packages/logix-core test -- --run test/internal/LiveBridge/live-host-coordinate.contract.test.ts --reporter=dot
```

Expected: FAIL because `hostCoordinate` and `transport` are not accepted or projected.

- [ ] **Step 3: Implement minimal host/transport fields**

Add these internal types to `liveTypes.ts`:

```ts
export interface LiveHostCoordinate {
  readonly hostKind: 'browser' | 'node' | 'playground' | 'cloud' | 'cli-daemon' | 'test'
  readonly processId?: string
  readonly tabId?: string
  readonly projectId?: string
  readonly url?: string
  readonly environmentFingerprintRef?: string
}

export interface LiveTransportProjection {
  readonly carrier: 'websocket' | 'ipc' | 'stdio' | 'in-process' | 'test'
  readonly connectionId?: string
  readonly socketPath?: string
  readonly port?: number
  readonly health?: 'connecting' | 'ready' | 'degraded' | 'closed'
}
```

Extend `LiveAttachmentOffer` and `LiveTargetDescriptor` with optional `hostCoordinate` and `transport`.

Update `liveAttachment.ts` so `submitAttachmentOffer()` stores those fields and `listTargets()` returns them unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
rtk pnpm -C packages/logix-core test -- --run test/internal/LiveBridge/live-host-coordinate.contract.test.ts test/internal/LiveBridge/live-target-discovery.contract.test.ts --reporter=dot
```

Expected: PASS.

- [ ] **Step 5: Checkpoint**

Run:

```bash
rtk pnpm -C packages/logix-core typecheck
```

Expected: PASS. Do not commit unless explicitly authorized.

### Task 2: Add Internal Wire Envelope Guards

**Files:**
- Create: `packages/logix-core/src/internal/runtime/core/liveWireTypes.ts`
- Modify: `packages/logix-core/src/internal/live-bridge-api.ts`
- Test: `packages/logix-core/test/internal/LiveBridge/live-wire-types.contract.test.ts`

- [ ] **Step 1: Write the failing wire contract test**

```ts
import { describe, expect, it } from 'vitest'
import {
  isLiveWireEnvelope,
  makeLiveWireEnvelope,
} from '../../../src/internal/live-bridge-api.js'

describe('live wire envelope guards', () => {
  it('accepts bounded host offers and rejects verification verdict fields', () => {
    const envelope = makeLiveWireEnvelope({
      id: 'msg-1',
      role: 'browser',
      type: 'host.offer',
      payload: {
        attachmentId: 'browser:conn-1',
        adapterKind: 'browser-dev',
        hostCoordinate: { hostKind: 'browser', tabId: 'tab-a' },
        targets: [{ runtimeId: 'r', moduleId: 'm', instanceId: 'i' }],
      },
    })

    expect(isLiveWireEnvelope(envelope)).toBe(true)
    expect(isLiveWireEnvelope({ ...envelope, repairHints: [] })).toBe(false)
    expect(isLiveWireEnvelope({ ...envelope, verdict: 'FAIL' })).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
rtk pnpm -C packages/logix-core test -- --run test/internal/LiveBridge/live-wire-types.contract.test.ts --reporter=dot
```

Expected: FAIL because `liveWireTypes.ts` does not exist.

- [ ] **Step 3: Implement minimal wire helpers**

Create `liveWireTypes.ts` with:

```ts
import type { LiveAttachmentOffer, LiveEvidenceFacet, LiveTargetDescriptor } from './liveTypes.js'

export type LiveWireRole = 'browser' | 'cli' | 'daemon'
export type LiveWireMessageType =
  | 'host.offer'
  | 'host.disconnect'
  | 'live.targets.request'
  | 'live.targets.response'
  | 'live.operation.request'
  | 'live.operation.response'
  | 'live.evidence.export.request'
  | 'live.evidence.export.response'
  | 'live.status.request'
  | 'live.status.response'
  | 'live.error'

export interface LiveWireEnvelope<TPayload = unknown> {
  readonly schemaVersion: 1
  readonly id: string
  readonly role: LiveWireRole
  readonly type: LiveWireMessageType
  readonly payload: TPayload
}

export interface LiveWireHostOfferPayload extends LiveAttachmentOffer {}
export interface LiveWireTargetsPayload {
  readonly targets: ReadonlyArray<LiveTargetDescriptor>
}
export interface LiveWireEvidencePayload {
  readonly facets: ReadonlyArray<LiveEvidenceFacet>
}

export const makeLiveWireEnvelope = <TPayload>(input: {
  readonly id: string
  readonly role: LiveWireRole
  readonly type: LiveWireMessageType
  readonly payload: TPayload
}): LiveWireEnvelope<TPayload> => ({
  schemaVersion: 1,
  id: input.id,
  role: input.role,
  type: input.type,
  payload: input.payload,
})
```

Implement `isLiveWireEnvelope(value)` as a structural guard that rejects `repairHints`, `nextRecommendedStage`, `verdict`, and `primaryReportOutputKey` on the envelope root.

Export it from `live-bridge-api.ts`.

- [ ] **Step 4: Run targeted test**

Run:

```bash
rtk pnpm -C packages/logix-core test -- --run test/internal/LiveBridge/live-wire-types.contract.test.ts --reporter=dot
```

Expected: PASS.

- [ ] **Step 5: Checkpoint**

Run:

```bash
rtk pnpm -C packages/logix-core typecheck
```

Expected: PASS.

## Chunk 2: Local Daemon Carrier

### Task 3: Implement Daemon State Paths And IPC Client

**Files:**
- Create: `packages/logix-cli/src/internal/liveTransportPaths.ts`
- Create: `packages/logix-cli/src/internal/liveDaemonClient.ts`
- Modify: `packages/logix-cli/src/internal/liveDaemon.ts`
- Test: `packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts`

- [ ] **Step 1: Write failing stopped-daemon status test**

```ts
import { describe, expect, it } from 'vitest'
import { runLiveClientTask } from '../../src/internal/liveClient.js'

describe('live daemon carrier client', () => {
  it('returns a structured stopped status when no daemon metadata exists', () => {
    const result = runLiveClientTask({ task: 'status' })
    expect(result.kind).toBe('LiveStatus')
    expect(result.inline).toMatchObject({
      state: 'stopped',
      transport: expect.objectContaining({ carrier: 'ipc', health: 'closed' }),
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
rtk pnpm -C packages/logix-cli test -- --run test/Integration/live-daemon-carrier.contract.test.ts --reporter=dot
```

Expected: FAIL because current `liveClient.ts` returns proof `ready`.

- [ ] **Step 3: Implement path and client helpers**

Create `liveTransportPaths.ts`:

```ts
import os from 'node:os'
import path from 'node:path'

export interface LiveTransportPaths {
  readonly stateDir: string
  readonly metadataPath: string
  readonly socketPath: string
  readonly host: string
  readonly port: number
}

export const resolveLiveTransportPaths = (): LiveTransportPaths => {
  const stateDir = process.env.LOGIX_LIVE_STATE_DIR || path.join(os.homedir(), '.logix', 'live')
  const port = Number(process.env.LOGIX_LIVE_PORT || '8098')
  return {
    stateDir,
    metadataPath: path.join(stateDir, 'daemon.json'),
    socketPath: path.join(stateDir, 'daemon.sock'),
    host: process.env.LOGIX_LIVE_HOST || '127.0.0.1',
    port: Number.isFinite(port) ? port : 8098,
  }
}
```

Create `liveDaemonClient.ts` with `readLiveDaemonMetadata()`, `requestLiveDaemon()`, `stopLiveDaemon()`, and timeout handling. Use newline-delimited JSON over `net.connect(socketPath)`.

- [ ] **Step 4: Wire stopped status into `liveClient.ts`**

For `status`, return stopped when metadata/socket is unavailable:

```ts
{
  state: 'stopped',
  authority: 'core-owned-attachment',
  transport: { carrier: 'ipc', socketPath, health: 'closed' }
}
```

For `targets/capture/snapshot/wait/dispatch/profile/export`, return `EvidenceGap` with code `live-daemon-not-running` until the daemon client is implemented in Task 5.

- [ ] **Step 5: Run targeted test**

Run:

```bash
rtk pnpm -C packages/logix-cli test -- --run test/Integration/live-daemon-carrier.contract.test.ts --reporter=dot
```

Expected: PASS for stopped status.

### Task 4: Implement WebSocket And IPC Daemon Server

**Files:**
- Create: `packages/logix-cli/src/internal/liveDaemonServer.ts`
- Modify: `packages/logix-cli/src/bin/logix.ts`
- Modify: `packages/logix-cli/tsup.config.ts`
- Test: `packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts`

- [ ] **Step 1: Extend test with in-process daemon**

Add a second test:

```ts
import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import WebSocket from 'ws'
import { createLiveDaemonServer } from '../../src/internal/liveDaemonServer.js'
import { requestLiveDaemon } from '../../src/internal/liveDaemonClient.js'

it('accepts browser host offers through WebSocket and returns targets through IPC', async () => {
  const stateDir = await mkdtemp(path.join(os.tmpdir(), 'logix-live-daemon-'))
  const daemon = await createLiveDaemonServer({ stateDir, host: '127.0.0.1', port: 0 }).start()
  try {
    const ws = new WebSocket(`ws://127.0.0.1:${daemon.port}`)
    await new Promise<void>((resolve, reject) => {
      ws.once('open', resolve)
      ws.once('error', reject)
    })
    ws.send(JSON.stringify({
      schemaVersion: 1,
      id: 'offer-1',
      role: 'browser',
      type: 'host.offer',
      payload: {
        attachmentId: 'browser:conn-1',
        adapterKind: 'browser-dev',
        hostCoordinate: { hostKind: 'browser', tabId: 'tab-a' },
        transport: { carrier: 'websocket', connectionId: 'conn-1' },
        targets: [{ runtimeId: 'r', moduleId: 'm', instanceId: 'i' }],
      },
    }))

    await new Promise((resolve) => setTimeout(resolve, 30))
    const response = await requestLiveDaemon(daemon.paths, { type: 'targets', tree: true })
    expect(response).toMatchObject({ ok: true, data: { targets: [expect.objectContaining({ attachmentId: 'browser:conn-1' })] } })
    ws.close()
  } finally {
    await daemon.stop()
    await rm(stateDir, { recursive: true, force: true })
  }
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
rtk pnpm -C packages/logix-cli test -- --run test/Integration/live-daemon-carrier.contract.test.ts --reporter=dot
```

Expected: FAIL because `liveDaemonServer.ts` does not exist.

- [ ] **Step 3: Implement daemon server**

Implement `createLiveDaemonServer(options)` with:

- a core `createLiveAttachmentRegistry({ enabled: true })`
- a `WebSocketServer` on host/port
- a `net.Server` on the resolved socket path
- metadata write to `daemon.json`
- browser message handling for `host.offer` and socket close
- IPC handling for `status`, `targets`, `stop`

Keep daemon responses small:

```ts
type LiveDaemonIpcCommand =
  | { readonly type: 'status' }
  | { readonly type: 'targets'; readonly tree?: boolean }
  | { readonly type: 'stop' }
```

On WebSocket close, call `registry.markTerminal(attachmentId, 'disconnected')`.

- [ ] **Step 4: Add internal daemon process entry**

Implement a hidden `__internal_live_daemon` selector in `src/bin/logix.ts` that starts the daemon and stays alive until SIGTERM/SIGINT or IPC `stop`.

Modify `tsup.config.ts`:

```ts
entry: ['src/bin/logix.ts']
```

Do not add a new public `bin` entry in `package.json`. Do not add a second daemon bin source/build entry.

- [ ] **Step 5: Run targeted test**

Run:

```bash
rtk pnpm -C packages/logix-cli test -- --run test/Integration/live-daemon-carrier.contract.test.ts --reporter=dot
rtk pnpm -C packages/logix-cli typecheck
```

Expected: PASS.

### Task 5: Route CLI Live Tasks Through Daemon

**Files:**
- Modify: `packages/logix-cli/src/internal/liveClient.ts`
- Modify: `packages/logix-cli/src/internal/commands/live.ts`
- Test: `packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts`
- Test: `packages/logix-cli/test/Integration/live-command-result.contract.test.ts`

- [ ] **Step 1: Add failing daemon-backed targets test through `runCli`**

```ts
import { Effect } from 'effect'
import { runCli } from '../../src/internal/entry.js'

it('uses daemon-backed targets for logix live targets', async () => {
  // Reuse the in-process daemon setup from Task 4.
  const out = await Effect.runPromise(runCli(['live', 'targets', '--runId', 'daemon-targets', '--tree']))
  expect(out.kind).toBe('result')
  if (out.kind !== 'result') throw new Error('expected result')
  expect(out.result.kind).toBe('LiveCommandResult')
  expect(out.result.artifacts[0]).toMatchObject({
    kind: 'LiveTargetList',
    inline: { targets: [expect.objectContaining({ attachmentId: expect.stringContaining('browser:') })] },
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
rtk pnpm -C packages/logix-cli test -- --run test/Integration/live-daemon-carrier.contract.test.ts --reporter=dot
```

Expected: FAIL because `liveClient.ts` still uses proof registry or stopped gaps.

- [ ] **Step 3: Implement daemon routing**

Update `runLiveClientTask()`:

- `status`: read metadata, ping IPC, return carrier health.
- `targets`: IPC `targets`.
- `capture`, `snapshot`, `wait`, `dispatch`, `profile.*`, `export.evidence`: IPC operation request. If unsupported by the connected browser adapter, return daemon-backed `EvidenceGap` with `live-operation-unsupported-by-host`.
- no daemon: return structured stopped status or `live-daemon-not-running` gap.

Do not put `repairHints`, `nextRecommendedStage`, or verdict fields in any result.

- [ ] **Step 4: Run CLI contract tests**

Run:

```bash
rtk pnpm -C packages/logix-cli test -- --run test/Integration/live-daemon-carrier.contract.test.ts test/Integration/live-command-result.contract.test.ts test/Integration/live-namespace.contract.test.ts --reporter=dot
```

Expected: PASS.

## Chunk 3: Browser Adapter

### Task 6: Expose Dev Lifecycle Binding Snapshots

**Files:**
- Modify: `packages/logix-react/src/internal/dev/lifecycleCarrier.ts`
- Modify: `packages/logix-react/src/dev/lifecycle.ts`
- Test: `packages/logix-react/test/internal/dev/live-browser-adapter.contract.test.ts`

- [ ] **Step 1: Write failing lifecycle snapshot test**

```ts
import { describe, expect, it } from 'vitest'
import { createLogixDevLifecycleCarrier } from '../../../src/dev/lifecycle.js'

describe('live browser adapter lifecycle source', () => {
  it('lists dev lifecycle runtime bindings without exposing report truth', () => {
    const carrier = createLogixDevLifecycleCarrier({ carrierId: 'test-carrier', hostKind: 'vite' })
    expect(carrier.listRuntimeBindings()).toEqual([])
    expect(JSON.stringify(carrier)).not.toMatch(/repairHints|verdict|nextRecommendedStage/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
rtk pnpm -C packages/logix-react test -- --run test/internal/dev/live-browser-adapter.contract.test.ts --reporter=dot
```

Expected: FAIL because `listRuntimeBindings()` does not exist.

- [ ] **Step 3: Add binding snapshot API**

Add a dev-only snapshot type:

```ts
export interface LogixDevLifecycleRuntimeBindingSnapshot {
  readonly ownerId: string
  readonly runtimeInstanceId: string
  readonly carrierId: string
  readonly hostKind: LogixDevLifecycleHostKind
}
```

Add `listRuntimeBindings()` to `LogixDevLifecycleCarrier`, returning snapshots derived from internal records. Do not expose verification report fields.

- [ ] **Step 4: Run targeted test**

Run:

```bash
rtk pnpm -C packages/logix-react test -- --run test/internal/dev/live-browser-adapter.contract.test.ts --reporter=dot
```

Expected: PASS.

### Task 7: Implement Browser WebSocket Adapter With Dual Frontend Entries

**Files:**
- Create: `packages/logix-react/src/internal/dev/liveBrowserAdapter.ts`
- Create: `packages/logix-react/src/dev/live.ts`
- Modify: `packages/logix-react/src/dev/vite.ts`
- Modify: `packages/logix-react/package.json`
- Test: `packages/logix-react/test/internal/dev/live-browser-adapter.contract.test.ts`
- Test: `examples/logix-react/test/hmr-host-carrier.contract.test.ts`

- [ ] **Step 1: Add failing adapter install test with fake WebSocket**

```ts
import { installLogixLiveBrowserAdapter } from '../../../src/dev/live.js'

it('submits host.offer from lifecycle bindings over WebSocket', async () => {
  const sent: unknown[] = []
  class FakeWebSocket {
    static instances: FakeWebSocket[] = []
    readyState = 1
    onopen: (() => void) | null = null
    constructor(readonly url: string) {
      FakeWebSocket.instances.push(this)
      queueMicrotask(() => this.onopen?.())
    }
    send(raw: string) { sent.push(JSON.parse(raw)) }
    close() {}
    addEventListener(type: string, cb: () => void) {
      if (type === 'open') this.onopen = cb
    }
  }

  const previous = globalThis.WebSocket
  ;(globalThis as any).WebSocket = FakeWebSocket
  try {
    installLogixLiveBrowserAdapter({ host: '127.0.0.1', port: 8098, tabId: 'tab-a', projectId: 'test' })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(sent.some((msg: any) => msg.type === 'host.offer')).toBe(true)
  } finally {
    ;(globalThis as any).WebSocket = previous
  }
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
rtk pnpm -C packages/logix-react test -- --run test/internal/dev/live-browser-adapter.contract.test.ts --reporter=dot
```

Expected: FAIL because `dev/live.ts` does not exist.

- [ ] **Step 3: Implement shared browser adapter**

Implement `installLogixLiveBrowserAdapter(options)`:

- skip SSR and production
- connect to `ws://host:port`
- read installed dev lifecycle carrier
- submit `host.offer` with:
  - daemon-assigned or adapter-provided attachment id
  - `adapterKind: 'browser-dev'`
  - `hostCoordinate.hostKind = 'browser'`
  - optional `tabId`, `projectId`, `url`
  - one target per lifecycle runtime binding
- resubmit offer after bindings change by polling a bounded interval or by explicit `refresh()` method
- never generate random `tabId`; if not provided, omit it and send a degraded locator marker in payload metadata

- [ ] **Step 4: Add the dev-only import entry**

`packages/logix-react/src/dev/live.ts` must support both shapes:

```ts
import '@logixjs/react/dev/live'
import { installLogixLiveBrowserAdapter } from '@logixjs/react/dev/live'
```

The side-effect import installs the adapter only in a browser dev environment. It reads optional connection hints from a small, test-owned global config or Vite-injected constants, but it must not create runtime identity, report truth, repair hints, verification verdicts, or a second attachment registry.

- [ ] **Step 5: Add Vite injection over the same entry**

Add `logixReactLiveBridgeVitePlugin(options)` or extend `logixDevLifecycleVitePlugin({ live: ... })` to inject the same `@logixjs/react/dev/live` entry:

```ts
import { installLogixLiveBrowserAdapter } from "/@id/@logixjs/react/dev/live";
installLogixLiveBrowserAdapter({ host: "127.0.0.1", port: 8098, projectId: "examples/logix-react" });
```

The plugin is an ergonomics path, not a separate protocol. It must not bypass `liveBrowserAdapter.ts`.

- [ ] **Step 6: Run targeted tests**

Run:

```bash
rtk pnpm -C packages/logix-react test -- --run test/internal/dev/live-browser-adapter.contract.test.ts --reporter=dot
rtk pnpm -C examples/logix-react test -- --run test/hmr-host-carrier.contract.test.ts --reporter=dot
```

Expected: PASS.

- [ ] **Step 7: Checkpoint**

Run:

```bash
rtk pnpm -C packages/logix-react typecheck
```

Expected: PASS.

## Chunk 4: Real Browser Proof

### Task 8: Add Multi-Tab Daemon Contract

**Files:**
- Test: `packages/logix-cli/test/Integration/live-daemon-multitab.contract.test.ts`
- Modify: `packages/logix-cli/src/internal/liveDaemonServer.ts`

- [ ] **Step 1: Write failing two-WebSocket test**

Create two `ws` clients, each sends a `host.offer` for the same runtime target with different `tabId`. Assert IPC `targets` returns two rows with different `attachmentId` and preserved `hostCoordinate.tabId`.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
rtk pnpm -C packages/logix-cli test -- --run test/Integration/live-daemon-multitab.contract.test.ts --reporter=dot
```

Expected: FAIL until daemon assigns independent connection records.

- [ ] **Step 3: Implement connection record ownership**

In `liveDaemonServer.ts`, keep:

```ts
interface BrowserConnectionRecord {
  readonly connectionId: string
  readonly attachmentIds: Set<string>
  readonly openedAt: number
}
```

On close, mark all attachment ids from that connection as `disconnected`.

- [ ] **Step 4: Run test**

Run:

```bash
rtk pnpm -C packages/logix-cli test -- --run test/Integration/live-daemon-multitab.contract.test.ts --reporter=dot
```

Expected: PASS.

### Task 9: Add Examples Real Carrier Playwright Proofs

**Files:**
- Modify: `examples/logix-react/vite.config.ts`
- Create: `examples/logix-react/test/browser/live-real-carrier.playwright.ts`
- Create: `examples/logix-react/test/browser/live-dev-only-import.playwright.ts`
- Create: `examples/logix-react/test/fixtures/live-dev-only-import/main.ts`
- Modify: `examples/logix-react/package.json`

- [ ] **Step 1: Write failing plugin-injected Playwright proof**

The test must:

1. start an in-process or child daemon on a random port/state dir
2. start Vite with live bridge injection pointing at that daemon
3. open two Chromium pages to `/playground/logix-react.live-bridge`
4. run `logix live targets --tree` through `runCli`
5. assert two browser attachments are present
6. close one page
7. assert daemon status reports one disconnected or degraded attachment
8. run `logix live export evidence --from <daemon-lineage-ref>` using the operation artifact's `artifactRef.file`
9. assert `LiveCommandResult` has no repair verdict fields

- [ ] **Step 2: Write failing dev-only import Playwright proof**

The test must:

1. start an in-process or child daemon on a random port/state dir
2. start a lightweight Vite page whose bridge integration is exactly the dev-only import path
3. keep `examples/logix-react/test/fixtures/live-dev-only-import/main.ts` focused on:

```ts
import '@logixjs/react/dev/live'
```

4. open one Chromium page to the lightweight route
5. simulate the CLI by calling the daemon IPC client, or run `runCli(['live', 'targets', '--tree'])` with the test state dir
6. assert one browser attachment is present and its host locator is carried through
7. assert the same CLI-visible shape as the plugin proof: no `repairHints`, no `nextRecommendedStage`, no verification verdict

This proof is required because it isolates the browser adapter from the example Playground and from Vite plugin injection. It is the minimal E2E carrier proof.

- [ ] **Step 3: Run proofs to verify they fail**

Run:

```bash
rtk pnpm -C examples/logix-react exec tsx test/browser/live-real-carrier.playwright.ts
rtk pnpm -C examples/logix-react exec tsx test/browser/live-dev-only-import.playwright.ts
```

Expected: FAIL until Vite injection, dev-only import auto-install, and daemon routing work.

- [ ] **Step 4: Enable live bridge in example Vite config**

Use the new plugin/helper from `@logixjs/react/dev/vite`. Keep existing lifecycle plugin behavior.

- [ ] **Step 5: Add package scripts**

In `examples/logix-react/package.json`, add:

- `test:browser:live-real-carrier` for the plugin-injected dogfood proof
- `test:browser:live-dev-only-import` for the lightweight import-only proof
- a combined script that runs both when the package supports grouped browser tests

- [ ] **Step 6: Run browser proofs**

Run:

```bash
rtk pnpm -C examples/logix-react exec tsx test/browser/live-real-carrier.playwright.ts
rtk pnpm -C examples/logix-react exec tsx test/browser/live-dev-only-import.playwright.ts
```

Expected: PASS. The first proof prints `live real carrier Playwright contract passed`; the second proof prints `live dev-only import carrier Playwright contract passed`.

### Task 10: Keep Repair Closure Report-Owned

**Files:**
- Modify: `packages/logix-cli/test/Integration/live-evidence-handoff.e2e.test.ts`
- Modify: `packages/logix-cli/src/internal/liveClient.ts`

- [ ] **Step 1: Extend existing handoff test to use daemon-backed evidence**

Update the test to prefer daemon-backed `logix live export evidence`. Keep the existing report assertions:

```ts
expect(liveOut.result).not.toHaveProperty('repairHints')
expect(liveOut.result).not.toHaveProperty('nextRecommendedStage')
expect(liveOut.result).not.toHaveProperty('verdict')
```

Then run `trial --mode startup --evidence <daemon-exported-dir-or-manifest>` and assert `VerificationControlPlaneReport.repairHints`.

- [ ] **Step 2: Run test**

Run:

```bash
rtk pnpm -C packages/logix-cli test -- --run test/Integration/live-evidence-handoff.e2e.test.ts --reporter=dot
```

Expected: PASS.

## Chunk 5: Verification And Writeback

### Task 11: Revalidate Disabled Overhead

**Files:**
- Modify: `specs/171-agent-live-runtime-bridge/notes/perf-evidence.md`

- [ ] **Step 1: Run preflight and browser perf proof**

Run:

```bash
rtk env LOGIX_PREFLIGHT=1 pnpm -C packages/logix-react test -- --run test/perf-boundaries/contract-preflight.test.ts --reporter=dot
rtk pnpm -C packages/logix-react test -- --project browser --run test/browser/perf-boundaries/live-bridge-disabled-overhead.test.tsx --reporter=dot
```

Expected: PASS, with zero transaction-window IO and no capture/transport allocation in disabled/no-daemon path.

- [ ] **Step 2: Record result**

Append W171-016 evidence to `notes/perf-evidence.md`.

### Task 12: Run Final Verification Matrix

**Files:**
- Modify: `specs/171-agent-live-runtime-bridge/notes/verification.md`
- Modify: `specs/171-agent-live-runtime-bridge/quickstart.md`
- Modify: `docs/ssot/runtime/15-cli-agent-first-control-plane.md`

- [ ] **Step 1: Run targeted package tests**

Run:

```bash
rtk pnpm -C packages/logix-core test -- --run test/internal/LiveBridge --reporter=dot
rtk pnpm -C packages/logix-core typecheck
rtk pnpm -C packages/logix-cli test -- --run test/Integration/live-daemon-carrier.contract.test.ts test/Integration/live-daemon-multitab.contract.test.ts test/Integration/live-daemon-disconnect.contract.test.ts test/Integration/live-command-result.contract.test.ts test/Integration/live-evidence-handoff.e2e.test.ts --reporter=dot
rtk pnpm -C packages/logix-cli typecheck
rtk pnpm -C packages/logix-react test -- --run test/internal/dev/live-browser-adapter.contract.test.ts test/hmr-host-carrier.contract.test.ts --reporter=dot
rtk pnpm -C packages/logix-react typecheck
rtk pnpm -C examples/logix-react exec tsx test/browser/live-real-carrier.playwright.ts
rtk pnpm -C examples/logix-react exec tsx test/browser/live-dev-only-import.playwright.ts
```

Expected: all pass.

- [ ] **Step 2: Run broad checks**

Run:

```bash
rtk pnpm typecheck
rtk pnpm lint
rtk pnpm test:turbo
```

Expected: all pass.

- [ ] **Step 3: Run final negative sweep**

Run:

```bash
rtk rg -n "Runtime\\.devtools|runtime\\.devtools|Runtime\\.inspect|runtime\\.inspect|Logix\\.Reflection|RuntimeAgentPort|LiveEvidenceSidecar|CommandResult.*live|globalThis\\.__LOGIX|\\blogix (status|capture|snapshot|trigger|wait|export)\\b" packages docs specs examples
```

Expected: no active public authority adopts forbidden shapes. Classify remaining history-only, internal-only, negative-only, or accepted `logix live <task>` subcommand mentions in `notes/verification.md`.

- [ ] **Step 4: Write back final status**

Update:

- `specs/171-agent-live-runtime-bridge/notes/verification.md`
- `specs/171-agent-live-runtime-bridge/notes/perf-evidence.md`
- `specs/171-agent-live-runtime-bridge/tasks.md`
- `specs/171-agent-live-runtime-bridge/quickstart.md`
- `docs/ssot/runtime/15-cli-agent-first-control-plane.md`

Expected: W171-011 through W171-016 are recorded with command outputs and remaining risks.
