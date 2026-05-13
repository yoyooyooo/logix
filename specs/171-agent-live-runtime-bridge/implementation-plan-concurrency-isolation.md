# Live Daemon Concurrency Isolation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make live daemon routing and evidence export immune to multi-tab and concurrent request data mixing.

**Architecture:** Treat `attachmentId` as the routing owner and `requestId` as the operation correlation owner. `targetCoordinate` may select a runtime only when it resolves to exactly one attached target; ambiguous target matches return a structured gap. Browser responses are accepted only when the response comes from the same WebSocket and `attachmentId` recorded in the pending operation. Exported evidence is retrieved through daemon-minted lineage refs, not bare capture ids.

**Tech Stack:** TypeScript, Node `net`, `ws`, Vitest, Logix live bridge core contracts.

---

## Chunk 1: Contract Tests

### Task 1: Multi-Tab Ambiguity Guard

**Files:**
- Modify: `packages/logix-cli/test/Integration/live-daemon-multitab.contract.test.ts`

- [ ] **Step 1: Write the failing test**

Add a test where two WebSocket browser tabs offer the same `runtime/module/instance`. Send `snapshot.read` with only `target`. Expect a structured gap with code `ambiguous-live-target`, and expect neither tab to receive a `live.operation.request`.

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
rtk pnpm -C packages/logix-cli test -- --run test/Integration/live-daemon-multitab.contract.test.ts --reporter=dot
```

Expected: FAIL because the daemon currently picks the first matching target.

### Task 2: Explicit Attachment Routing

**Files:**
- Modify: `packages/logix-cli/test/Integration/live-daemon-multitab.contract.test.ts`

- [ ] **Step 1: Write the failing test**

Add a test with two tabs that share the same target coordinate. Send two concurrent `snapshot.read` requests, one with `attachmentId: "browser:conn-1"` and one with `attachmentId: "browser:conn-2"`. Each tab returns a different `captureId`. Assert each IPC response receives the artifact from the selected attachment.

- [ ] **Step 2: Run the test to verify it fails**

Expected: FAIL because current daemon ignores `payload.attachmentId`.

### Task 3: Browser Response Identity Guard

**Files:**
- Modify: `packages/logix-cli/test/Integration/live-daemon-multitab.contract.test.ts`

- [ ] **Step 1: Write the failing test**

Add a test where the selected tab delays its response and the wrong tab sends a forged response with the same `requestId`. Assert the daemon ignores the forged response and resolves with the selected tab artifact.

- [ ] **Step 2: Run the test to verify it fails**

Expected: FAIL because current daemon resolves by `requestId` only.

### Task 4: Strong Artifact Lineage

**Files:**
- Modify: `packages/logix-cli/test/Integration/live-daemon-multitab.contract.test.ts`

- [ ] **Step 1: Write the failing test**

After explicit attachment snapshots from two tabs return the same bare `captureId`, export by each returned daemon lineage ref. Assert each manifest contains the artifact from the selected attachment. Also assert exporting by the bare duplicate `captureId` returns a structured ambiguity gap instead of arbitrary reuse.

- [ ] **Step 2: Run the test to verify it fails**

Expected: FAIL because current daemon caches by bare `captureId`.

## Chunk 2: Daemon Routing

### Task 5: Resolve Operation Target to One Attachment

**Files:**
- Modify: `packages/logix-cli/src/internal/liveDaemonServer.ts`

- [ ] Add a small parser for `payload.target`.
- [ ] Add `resolveOperationTarget(payload)` that supports `attachmentId` plus optional target.
- [ ] If `attachmentId` is present, route only inside that attachment.
- [ ] If only `target` is present and multiple attachments match, return `ambiguous-live-target`.
- [ ] If no target is present and multiple targets exist, return `ambiguous-live-target`.

### Task 6: Bind Pending Operation to WebSocket and Attachment

**Files:**
- Modify: `packages/logix-cli/src/internal/liveDaemonServer.ts`

- [ ] Extend pending operation record with `connectionId`, `ws`, `operation`, and `target`.
- [ ] Generate operation-neutral request ids such as `live:req:<timestamp>:<suffix>`.
- [ ] On response, require same `requestId`, same `attachmentId`, and same WebSocket object.
- [ ] Ignore mismatched responses without resolving pending requests.

## Chunk 3: Evidence Lineage

### Task 7: Mint Daemon Artifact Refs

**Files:**
- Modify: `packages/logix-cli/src/internal/liveDaemonServer.ts`
- Modify: `packages/logix-cli/src/internal/liveDaemonClient.ts`

- [ ] When a browser operation returns an artifact, store it under a daemon-minted lineage key containing `attachmentId`, `requestId`, and output key plus capture id when present.
- [ ] Patch returned artifact value so `artifactRef` includes the lineage key in `file` and reason code `live-daemon-lineage`.
- [ ] Export evidence only by this lineage key as the primary path.
- [ ] Track bare refs as an alias map; if an alias maps to more than one lineage key, export returns `ambiguous-live-artifact-ref`.

## Chunk 4: Browser Adapter Binding Precision

### Task 8: Resolve Browser Binding by Full Target Coordinate

**Files:**
- Modify: `packages/logix-react/src/internal/dev/liveBrowserAdapter.ts`
- Test: `packages/logix-react/test/internal/dev/live-browser-adapter.contract.test.ts`

- [ ] Update local binding lookup to match `runtimeId`, `moduleId`, and `instanceId`.
- [ ] Add or adjust contract coverage so two bindings sharing a runtime id do not resolve the wrong module or instance.

## Chunk 5: Documentation and Verification

### Task 9: Update 171 and SSoT Docs

**Files:**
- Modify: `specs/171-agent-live-runtime-bridge/tasks.md`
- Modify: `specs/171-agent-live-runtime-bridge/notes/verification.md`
- Modify: `specs/171-agent-live-runtime-bridge/quickstart.md`
- Modify: `specs/171-agent-live-runtime-bridge/scenarios.md`
- Modify: `docs/ssot/runtime/15-cli-agent-first-control-plane.md`

- [ ] Document attachment-first routing.
- [ ] Document ambiguous target behavior.
- [ ] Document daemon lineage refs for export evidence.
- [ ] Add verification evidence commands.

### Task 10: Run Verification

Run:

```bash
rtk pnpm -C packages/logix-cli test -- --run test/Integration/live-daemon-multitab.contract.test.ts test/Integration/live-daemon-carrier.contract.test.ts test/Integration/live-evidence-handoff.e2e.test.ts --reporter=dot
rtk pnpm -C packages/logix-react test -- --run test/internal/dev/live-browser-adapter.contract.test.ts --reporter=dot
rtk pnpm -C packages/logix-cli typecheck
rtk pnpm -C packages/logix-react typecheck
rtk git diff --check -- packages/logix-cli packages/logix-react specs/171-agent-live-runtime-bridge docs/ssot/runtime/15-cli-agent-first-control-plane.md
```

Expected: all commands exit 0.
