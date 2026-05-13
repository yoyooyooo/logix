# Agent Live Runtime Bridge Deeper Runtime Phase Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deepen 171 from a working real carrier into a runtime-meaningful live bridge by projecting richer targets from React runtime bindings and implementing at least one true browser-backed live operation path.

**Architecture:** Keep the existing daemon/WebSocket/IPC carrier unchanged and deepen only the semantic layer above it. React dev lifecycle bindings become a richer target source, the browser adapter advertises stable runtime/module/instance projection, and the daemon adds a minimal request/response operation lane for one host-supported operation first, then expands to evidence-producing paths without creating a second runtime truth.

**Tech Stack:** TypeScript, Effect, `ws`, Vite dev injection, Playwright, Vitest, `@logixjs/core/repo-internal/live-bridge-api`, `@logixjs/react/dev/*`, `@logixjs/cli`

---

## Execution Notes

- This plan is the next phase after `implementation-plan-real-carrier.md`.
- Do not redesign the carrier again. WebSocket/IPC/daemon topology is already admitted.
- Focus on semantic depth:
  - richer `targets`
  - one real browser-backed operation lane
  - richer exported evidence payload
- Keep `LiveCommandResult` authority unchanged. No repair hints, no verification verdicts.
- Prefer one real path end-to-end before broadening to more operations.
- All shell commands in this repository must use `rtk`.

## File Structure

### React Runtime Projection

- Modify: `packages/logix-react/src/internal/dev/lifecycleCarrier.ts`
  - Extend runtime binding snapshots so browser adapter can advertise stable runtime/module/instance semantics instead of only owner/runtimeInstance ids.
- Modify: `packages/logix-react/src/internal/provider/runtimeDevLifecycleBridge.ts`
  - Derive a better owner/module/runtime label from installed runtime services or current runtime label.
- Modify: `packages/logix-react/src/internal/dev/liveBrowserAdapter.ts`
  - Send richer target descriptors and support one browser-handled operation request/response lane.
- Test: `packages/logix-react/test/internal/dev/live-browser-adapter.contract.test.ts`
- Test: `packages/logix-react/test/RuntimeProvider/runtime-hot-lifecycle-projection.contract.test.tsx`

### CLI/Daemon Operation Lane

- Modify: `packages/logix-cli/src/internal/liveDaemonClient.ts`
  - Add typed request/response support for one host-supported operation.
- Modify: `packages/logix-cli/src/internal/liveDaemonServer.ts`
  - Route a single operation to a specific browser attachment and await a correlated response.
- Modify: `packages/logix-cli/src/internal/liveClient.ts`
  - Upgrade `targets` and one selected operation from daemon gap to daemon-backed result.
- Test: `packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts`
- Test: `packages/logix-cli/test/Integration/live-evidence-handoff.e2e.test.ts`

### Core Live Artifact Semantics

- Modify: `packages/logix-core/src/internal/runtime/core/liveTypes.ts`
  - Tighten target/operation artifact shapes if richer target projection needs explicit fields.
- Modify: `packages/logix-core/src/internal/runtime/core/liveWireTypes.ts`
  - Add request/response envelope kinds for browser-backed operation completion.
- Test: `packages/logix-core/test/internal/LiveBridge/live-wire-types.contract.test.ts`
- Test: `packages/logix-core/test/internal/LiveBridge/live-operations.contract.test.ts`

### Browser Proofs

- Modify: `examples/logix-react/test/browser/live-real-carrier.playwright.ts`
  - Assert daemon-backed attachments plus at least one meaningful target or browser-backed operation result.
- Modify: `examples/logix-react/test/browser/live-dev-only-import.playwright.ts`
  - Keep minimal import-only proof, still proving attachment formation.
- Modify: `examples/logix-react/src/playground/projects/live-bridge/**`
  - Reuse the live-bridge dogfood route to expose a browser-handled operation proof.

## Chunk 1: Richer Target Projection

### Task 1: Add Runtime-Semantic Binding Snapshots

**Files:**
- Modify: `packages/logix-react/src/internal/dev/lifecycleCarrier.ts`
- Modify: `packages/logix-react/src/internal/provider/runtimeDevLifecycleBridge.ts`
- Test: `packages/logix-react/test/internal/dev/live-browser-adapter.contract.test.ts`

- [ ] **Step 1: Write the failing projection test**

Add a test asserting `listRuntimeBindings()` returns enough data to derive:

```ts
{
  ownerId: 'LiveBridgeFixture',
  runtimeInstanceId: 'example-runtime',
  targetCoordinate: {
    runtimeId: 'example-runtime',
    moduleId: 'LiveBridgeFixture',
    instanceId: 'default',
  }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
rtk pnpm -C packages/logix-react test -- --run test/internal/dev/live-browser-adapter.contract.test.ts --reporter=dot
```

Expected: FAIL because runtime binding snapshots do not carry stable target semantics.

- [ ] **Step 3: Implement minimal richer snapshot**

Add explicit target-oriented fields to the snapshot type, derived from existing runtime owner/runtime label sources. Do not invent a second registry.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
rtk pnpm -C packages/logix-react test -- --run test/internal/dev/live-browser-adapter.contract.test.ts test/RuntimeProvider/runtime-hot-lifecycle-projection.contract.test.tsx --reporter=dot
```

Expected: PASS.

## Chunk 2: One Real Browser Operation

### Task 2: Implement Browser-Handled `snapshot.read`

**Files:**
- Modify: `packages/logix-react/src/internal/dev/liveBrowserAdapter.ts`
- Modify: `packages/logix-cli/src/internal/liveDaemonServer.ts`
- Modify: `packages/logix-cli/src/internal/liveDaemonClient.ts`
- Modify: `packages/logix-cli/src/internal/liveClient.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/liveWireTypes.ts`
- Test: `packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts`

- [ ] **Step 1: Write the failing snapshot lane test**

Add an integration test that:

1. starts the daemon
2. opens a browser connection
3. sends a host offer with one target
4. calls the daemon operation lane for `snapshot.read`
5. receives a correlated browser response with a `LiveCapture` or operation-completed artifact

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
rtk pnpm -C packages/logix-cli test -- --run test/Integration/live-daemon-carrier.contract.test.ts --reporter=dot
```

Expected: FAIL because daemon currently returns only unsupported gap.

- [ ] **Step 3: Implement minimal correlated request/response**

Use one request id per operation. The daemon picks one attachment, sends a browser request, waits with timeout, and returns:

- browser-backed result on success
- structured `live-operation-unsupported-by-host` or timeout gap on failure

Only implement `snapshot.read` first.

- [ ] **Step 4: Run targeted tests**

Run:

```bash
rtk pnpm -C packages/logix-cli test -- --run test/Integration/live-daemon-carrier.contract.test.ts test/Integration/live-daemon-multitab.contract.test.ts --reporter=dot
```

Expected: PASS.

## Chunk 3: Export Richer Evidence

### Task 3: Make `export evidence` Reuse Browser Operation Output

**Files:**
- Modify: `packages/logix-cli/src/internal/liveDaemonServer.ts`
- Modify: `packages/logix-cli/src/internal/liveClient.ts`
- Modify: `packages/logix-cli/test/Integration/live-evidence-handoff.e2e.test.ts`

- [ ] **Step 1: Write the failing export-content test**

Assert that daemon-backed `export evidence` writes a manifest whose artifacts include a real operation/capture output key, not only a placeholder gap.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
rtk pnpm -C packages/logix-cli test -- --run test/Integration/live-evidence-handoff.e2e.test.ts --reporter=dot
```

Expected: FAIL because export currently writes only minimal placeholder data.

- [ ] **Step 3: Implement minimal richer manifest**

Persist the browser-backed `snapshot.read` result into the exported manifest:

- real artifact output key
- stable package id
- enough event/artifact linkage for `trial --evidence <dir>`

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
rtk pnpm -C packages/logix-cli test -- --run test/Integration/live-evidence-handoff.e2e.test.ts test/Integration/live-command-result.contract.test.ts --reporter=dot
```

Expected: PASS.

## Chunk 4: Browser Proof Upgrade

### Task 4: Upgrade Dogfood Proof To Meaningful Target/Operation Result

**Files:**
- Modify: `examples/logix-react/test/browser/live-real-carrier.playwright.ts`
- Modify: `examples/logix-react/src/playground/projects/live-bridge/**`
- Modify: `examples/logix-react/test/browser/playground-live-bridge-dogfood.playwright.ts`

- [ ] **Step 1: Write the failing dogfood assertion**

Extend the proof so it requires at least one of:

- a runtime-semantic target row
- a browser-backed `snapshot.read` result
- a richer exported evidence artifact

- [ ] **Step 2: Run proof to verify it fails**

Run:

```bash
rtk pnpm -C examples/logix-react exec tsx test/browser/live-real-carrier.playwright.ts
```

Expected: FAIL because current proof only checks attachment-level status.

- [ ] **Step 3: Implement minimal dogfood surface**

Reuse the existing live-bridge project to expose one runtime-semantic binding and one browser-backed snapshot/export path.

- [ ] **Step 4: Run browser proofs**

Run:

```bash
rtk pnpm -C examples/logix-react exec tsx test/browser/live-real-carrier.playwright.ts
rtk pnpm -C examples/logix-react exec tsx test/browser/live-dev-only-import.playwright.ts
```

Expected: both PASS.

## Chunk 5: Verification And Writeback

### Task 5: Revalidate And Write Back

**Files:**
- Modify: `specs/171-agent-live-runtime-bridge/notes/verification.md`
- Modify: `specs/171-agent-live-runtime-bridge/quickstart.md`
- Modify: `specs/171-agent-live-runtime-bridge/scenarios.md`
- Modify: `docs/ssot/runtime/15-cli-agent-first-control-plane.md`

- [ ] **Step 1: Run targeted verification matrix**

Run:

```bash
rtk pnpm -C packages/logix-core test -- --run test/internal/LiveBridge/live-wire-types.contract.test.ts test/internal/LiveBridge/live-operations.contract.test.ts --reporter=dot
rtk pnpm -C packages/logix-cli test -- --run test/Integration/live-daemon-carrier.contract.test.ts test/Integration/live-evidence-handoff.e2e.test.ts --reporter=dot
rtk pnpm -C packages/logix-react test -- --run test/internal/dev/live-browser-adapter.contract.test.ts --reporter=dot
rtk pnpm -C examples/logix-react exec tsx test/browser/live-real-carrier.playwright.ts
```

Expected: PASS.

- [ ] **Step 2: Run package typechecks**

Run:

```bash
rtk pnpm -C packages/logix-core typecheck
rtk pnpm -C packages/logix-cli typecheck
rtk pnpm -C packages/logix-react typecheck
rtk pnpm -C examples/logix-react typecheck
```

Expected: PASS.

- [ ] **Step 3: Update docs and notes**

Record:

- richer target projection proof
- first true browser-backed operation proof
- richer export evidence proof
- explicit remaining gaps, if any

- [ ] **Step 4: Final sweep**

Run:

```bash
rtk git diff --check -- packages/logix-core packages/logix-cli packages/logix-react examples/logix-react specs/171-agent-live-runtime-bridge docs/ssot/runtime/15-cli-agent-first-control-plane.md
```

Expected: PASS.
