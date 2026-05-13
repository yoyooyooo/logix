# Live Daemon Launcher Operator Snapshot Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the current `logix live` daemon launcher so process metadata stays a carrier-local operator snapshot, stale daemon state is diagnosed and cleaned by the launcher boundary, and no supervisor or public lifecycle grammar is introduced.

**Architecture:** Keep the existing real carrier: browser adapter -> WebSocket daemon -> IPC -> `logix live`. Add a small internal operator snapshot module that owns metadata validation, stale cleanup evidence, readiness/health/log locator shape, and launcher wait behavior. `liveClient` may call the launcher and daemon client, but it must not decide process launch strategy, stale metadata policy, or publish pid/log/state as public contract.

**Tech Stack:** TypeScript ESM, Node `fs/promises`, `net`, `child_process`, `ws`, Vitest, `@logixjs/core/repo-internal/live-bridge-api`, `@logixjs/cli` internals.

---

## Context

Use this plan after the project-level memo has converged:

- `docs/proposals/live-daemon-lifecycle-architecture-memo.md`
- `docs/review-plan/runs/2026-05-03-171-live-daemon-launcher-supervisor.md`
- `specs/171-agent-live-runtime-bridge/spec.md`
- `docs/ssot/runtime/15-cli-agent-first-control-plane.md`

Latest observed implementation state:

- `packages/logix-cli/src/internal/liveDaemonLauncher.ts` already exists and owns process spawn.
- `packages/logix-cli/src/internal/liveDaemonServer.ts` already owns WebSocket, IPC, operation routing, multi-tab ambiguity, and daemon lineage artifact refs.
- `packages/logix-cli/src/internal/liveDaemonClient.ts` currently reads `daemon.json` without validating PID liveness or socket health.
- `packages/logix-cli/src/internal/liveClient.ts` still shapes some daemon stopped/ready status inline.
- `packages/logix-cli/src/bin/logix.ts` has hidden `__internal_live_daemon`.
- `packages/logix-cli/src/bin/logix-live-daemon.ts` also exists and `tsup.config.ts` builds it, while `package.json` only exposes `logix`.
- Existing tests already cover basic daemon start/stop, WebSocket offers, operations, disconnect lifecycle, multi-tab isolation, and evidence handoff.

Non-goals:

- Do not add `logix live ensure`, `logix live restart`, `logix live logs`, `logix live doctor`, or `stack`.
- Do not introduce a supervisor runtime.
- Do not freeze pid/log/state file schema as public contract.
- Do not change 171 owner law, `LiveCommandResult`, or public command grammar in `15`.

## File Structure

- Create `packages/logix-cli/src/internal/liveDaemonOperatorSnapshot.ts`
  - Owns internal metadata validation, PID liveness probe, socket health probe, stale cleanup, and operator snapshot shape.
  - Exports functions used by launcher/client/server, not public package exports.

- Modify `packages/logix-cli/src/internal/liveDaemonClient.ts`
  - Reuse operator snapshot metadata parsing.
  - Keep IPC request/stop behavior unchanged.

- Modify `packages/logix-cli/src/internal/liveDaemonLauncher.ts`
  - Use operator snapshot to decide existing daemon readiness.
  - Clean stale metadata/socket before spawning.
  - Return operator snapshot evidence from start wait without exposing process strategy.

- Modify `packages/logix-cli/src/internal/liveClient.ts`
  - Stop constructing divergent status objects manually.
  - Use a shared stopped/degraded/ready operator snapshot projection.

- Modify `packages/logix-cli/src/internal/liveDaemonServer.ts`
  - Write metadata through the operator snapshot helper.
  - Include optional log locator only as operator-local evidence.

- Modify `packages/logix-cli/src/bin/logix-live-daemon.ts`
  - Remove it if not needed, or keep it only if tests prove it is not a public binary and not referenced by launcher.
  - Preferred outcome: delete this file and remove the second tsup entry, because hidden `__internal_live_daemon` already re-execs the current CLI.

- Modify `packages/logix-cli/tsup.config.ts`
  - Build only `src/bin/logix.ts` unless a later task proves the extra daemon entry is needed.

- Test `packages/logix-cli/test/Integration/live-daemon-operator-snapshot.contract.test.ts`
  - New focused contract tests for metadata liveness, stale cleanup, degraded status, and no public daemon bin.

- Modify existing tests only when expected status shape intentionally changes:
  - `packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts`
  - `packages/logix-cli/test/Integration/live-daemon-disconnect.contract.test.ts`
  - `packages/logix-cli/test/Integration/live-namespace.contract.test.ts`
  - `packages/logix-cli/test/Integration/public-surface.guard.test.ts`

- Docs after implementation:
  - `docs/proposals/live-daemon-lifecycle-architecture-memo.md`
  - `specs/171-agent-live-runtime-bridge/notes/verification.md`
  - `specs/171-agent-live-runtime-bridge/tasks.md`

## Chunk 1: Operator Snapshot Boundary

### Task 1: Add Operator Snapshot Contract Tests

**Files:**
- Create: `packages/logix-cli/test/Integration/live-daemon-operator-snapshot.contract.test.ts`
- Create later: `packages/logix-cli/src/internal/liveDaemonOperatorSnapshot.ts`

- [ ] **Step 1: Write the failing tests**

Add tests for three facts:

```ts
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  cleanupStaleLiveDaemonSnapshot,
  makeStoppedLiveDaemonOperatorSnapshot,
  readLiveDaemonOperatorSnapshot,
  writeLiveDaemonOperatorSnapshot,
} from '../../src/internal/liveDaemonOperatorSnapshot.js'
import { resolveLiveTransportPaths } from '../../src/internal/liveTransportPaths.js'

describe('live daemon operator snapshot', () => {
  it('treats invalid metadata as a degraded carrier-local snapshot', async () => {
    const stateDir = await mkdtemp(path.join(os.tmpdir(), 'logix-live-operator-snapshot-'))
    const paths = resolveLiveTransportPaths({ stateDir })
    await writeFile(paths.metadataPath, '{"pid":"not-a-number"}', 'utf8')

    const snapshot = await readLiveDaemonOperatorSnapshot(paths)

    expect(snapshot.state).toBe('degraded')
    expect(snapshot.authority).toBe('core-owned-attachment')
    expect(snapshot.transport).toMatchObject({ carrier: 'ipc', health: 'degraded' })
    expect(snapshot.operator).toMatchObject({
      carrierLocal: true,
      publicContract: false,
      reason: 'invalid-metadata',
    })
    expect(snapshot).not.toHaveProperty('targets')
  })

  it('writes metadata as an operator-local snapshot, not runtime truth', async () => {
    const stateDir = await mkdtemp(path.join(os.tmpdir(), 'logix-live-operator-snapshot-'))
    const paths = resolveLiveTransportPaths({ stateDir, port: 4567 })

    await writeLiveDaemonOperatorSnapshot(paths, {
      pid: process.pid,
      startedAt: 123,
      logPath: path.join(stateDir, 'daemon.log'),
    })

    const raw = JSON.parse(await readFile(paths.metadataPath, 'utf8'))
    expect(raw).toMatchObject({
      schemaVersion: 1,
      pid: process.pid,
      host: paths.host,
      port: 4567,
      socketPath: paths.socketPath,
      stateDir,
      operator: {
        carrierLocal: true,
        publicContract: false,
      },
    })
    expect(raw).not.toHaveProperty('runtimeId')
    expect(raw).not.toHaveProperty('attachmentId')
    expect(raw).not.toHaveProperty('evidence')
    expect(raw).not.toHaveProperty('report')
  })

  it('removes stale metadata and socket paths with cleanup evidence', async () => {
    const stateDir = await mkdtemp(path.join(os.tmpdir(), 'logix-live-operator-snapshot-'))
    const paths = resolveLiveTransportPaths({ stateDir })
    await writeFile(paths.metadataPath, JSON.stringify({
      schemaVersion: 1,
      pid: 99999999,
      host: paths.host,
      port: paths.port,
      socketPath: paths.socketPath,
      stateDir,
    }), 'utf8')
    await writeFile(paths.socketPath, '', 'utf8')

    const cleanup = await cleanupStaleLiveDaemonSnapshot(paths, 'stale-pid')

    expect(cleanup.cleaned).toBe(true)
    expect(cleanup.reason).toBe('stale-pid')
    await expect(readFile(paths.metadataPath, 'utf8')).rejects.toThrow()
    await expect(readFile(paths.socketPath, 'utf8')).rejects.toThrow()
  })

  it('creates stopped status without process strategy or public file schema', () => {
    const paths = resolveLiveTransportPaths({ stateDir: '/tmp/logix-live-test' })
    const snapshot = makeStoppedLiveDaemonOperatorSnapshot(paths)

    expect(snapshot).toMatchObject({
      state: 'stopped',
      authority: 'core-owned-attachment',
      transport: { carrier: 'ipc', health: 'closed' },
      websocket: { carrier: 'websocket', health: 'closed' },
      operator: { carrierLocal: true, publicContract: false },
    })
    expect(snapshot.operator).not.toHaveProperty('launchCommand')
    expect(snapshot.operator).not.toHaveProperty('schemaContract')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
rtk pnpm -C packages/logix-cli test -- --run test/Integration/live-daemon-operator-snapshot.contract.test.ts --reporter=dot
```

Expected: FAIL because `liveDaemonOperatorSnapshot.ts` does not exist.

- [ ] **Step 3: Implement `liveDaemonOperatorSnapshot.ts`**

Create `packages/logix-cli/src/internal/liveDaemonOperatorSnapshot.ts`:

```ts
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import type { LiveTransportPaths } from './liveTransportPaths.js'

export interface LiveDaemonOperatorMetadata {
  readonly schemaVersion: 1
  readonly pid: number
  readonly host: string
  readonly port: number
  readonly socketPath: string
  readonly stateDir: string
  readonly startedAt?: number
  readonly logPath?: string
  readonly operator: {
    readonly carrierLocal: true
    readonly publicContract: false
  }
}

export interface LiveDaemonOperatorSnapshot {
  readonly state: 'stopped' | 'ready' | 'degraded'
  readonly authority: 'core-owned-attachment'
  readonly transport: {
    readonly carrier: 'ipc'
    readonly socketPath: string
    readonly health: 'closed' | 'ready' | 'degraded'
  }
  readonly websocket: {
    readonly carrier: 'websocket'
    readonly host: string
    readonly port: number
    readonly health: 'closed' | 'ready' | 'degraded'
  }
  readonly operator: {
    readonly carrierLocal: true
    readonly publicContract: false
    readonly pid?: number
    readonly stateDir: string
    readonly metadataPath: string
    readonly logPath?: string
    readonly reason?: string
    readonly cleanup?: LiveDaemonStaleCleanupEvidence
  }
}

export interface LiveDaemonStaleCleanupEvidence {
  readonly cleaned: boolean
  readonly reason: 'invalid-metadata' | 'stale-pid' | 'stale-socket' | 'start-timeout'
  readonly removed: ReadonlyArray<string>
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

export const isPidRunning = (pid: number): boolean => {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

const parseMetadata = (value: unknown): LiveDaemonOperatorMetadata | undefined => {
  if (!isRecord(value)) return undefined
  if (value.schemaVersion !== 1) return undefined
  if (typeof value.pid !== 'number' || !Number.isFinite(value.pid)) return undefined
  if (typeof value.host !== 'string') return undefined
  if (typeof value.port !== 'number' || !Number.isFinite(value.port)) return undefined
  if (typeof value.socketPath !== 'string') return undefined
  if (typeof value.stateDir !== 'string') return undefined
  return {
    schemaVersion: 1,
    pid: Math.floor(value.pid),
    host: value.host,
    port: Math.floor(value.port),
    socketPath: value.socketPath,
    stateDir: value.stateDir,
    ...(typeof value.startedAt === 'number' ? { startedAt: value.startedAt } : null),
    ...(typeof value.logPath === 'string' ? { logPath: value.logPath } : null),
    operator: { carrierLocal: true, publicContract: false },
  }
}

export const makeStoppedLiveDaemonOperatorSnapshot = (paths: LiveTransportPaths): LiveDaemonOperatorSnapshot => ({
  state: 'stopped',
  authority: 'core-owned-attachment',
  transport: { carrier: 'ipc', socketPath: paths.socketPath, health: 'closed' },
  websocket: { carrier: 'websocket', host: paths.host, port: paths.port, health: 'closed' },
  operator: {
    carrierLocal: true,
    publicContract: false,
    stateDir: paths.stateDir,
    metadataPath: paths.metadataPath,
  },
})

export const makeReadyLiveDaemonOperatorSnapshot = (
  paths: LiveTransportPaths,
  metadata: LiveDaemonOperatorMetadata,
): LiveDaemonOperatorSnapshot => ({
  state: 'ready',
  authority: 'core-owned-attachment',
  transport: { carrier: 'ipc', socketPath: metadata.socketPath, health: 'ready' },
  websocket: { carrier: 'websocket', host: metadata.host, port: metadata.port, health: 'ready' },
  operator: {
    carrierLocal: true,
    publicContract: false,
    pid: metadata.pid,
    stateDir: metadata.stateDir,
    metadataPath: paths.metadataPath,
    ...(metadata.logPath ? { logPath: metadata.logPath } : null),
  },
})

export const makeDegradedLiveDaemonOperatorSnapshot = (
  paths: LiveTransportPaths,
  reason: string,
  cleanup?: LiveDaemonStaleCleanupEvidence,
): LiveDaemonOperatorSnapshot => ({
  state: 'degraded',
  authority: 'core-owned-attachment',
  transport: { carrier: 'ipc', socketPath: paths.socketPath, health: 'degraded' },
  websocket: { carrier: 'websocket', host: paths.host, port: paths.port, health: 'degraded' },
  operator: {
    carrierLocal: true,
    publicContract: false,
    stateDir: paths.stateDir,
    metadataPath: paths.metadataPath,
    reason,
    ...(cleanup ? { cleanup } : null),
  },
})

export const writeLiveDaemonOperatorSnapshot = async (
  paths: LiveTransportPaths,
  input: { readonly pid: number; readonly startedAt?: number; readonly logPath?: string },
): Promise<LiveDaemonOperatorMetadata> => {
  const metadata: LiveDaemonOperatorMetadata = {
    schemaVersion: 1,
    pid: input.pid,
    host: paths.host,
    port: paths.port,
    socketPath: paths.socketPath,
    stateDir: paths.stateDir,
    ...(input.startedAt !== undefined ? { startedAt: input.startedAt } : null),
    ...(input.logPath ? { logPath: input.logPath } : null),
    operator: { carrierLocal: true, publicContract: false },
  }
  await mkdir(dirname(paths.metadataPath), { recursive: true })
  await writeFile(paths.metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8')
  return metadata
}

export const readLiveDaemonOperatorMetadata = async (
  paths: LiveTransportPaths,
): Promise<LiveDaemonOperatorMetadata | undefined> => {
  const raw = await readFile(paths.metadataPath, 'utf8')
  const parsed = parseMetadata(JSON.parse(raw))
  if (!parsed) return undefined
  return parsed
}

export const readLiveDaemonOperatorSnapshot = async (paths: LiveTransportPaths): Promise<LiveDaemonOperatorSnapshot> => {
  try {
    const metadata = await readLiveDaemonOperatorMetadata(paths)
    if (!metadata) return makeDegradedLiveDaemonOperatorSnapshot(paths, 'invalid-metadata')
    if (!isPidRunning(metadata.pid)) return makeDegradedLiveDaemonOperatorSnapshot(paths, 'stale-pid')
    return makeReadyLiveDaemonOperatorSnapshot(paths, metadata)
  } catch {
    try {
      const raw = await readFile(paths.metadataPath, 'utf8')
      JSON.parse(raw)
      return makeDegradedLiveDaemonOperatorSnapshot(paths, 'invalid-metadata')
    } catch {
      return makeStoppedLiveDaemonOperatorSnapshot(paths)
    }
  }
}

export const cleanupStaleLiveDaemonSnapshot = async (
  paths: LiveTransportPaths,
  reason: LiveDaemonStaleCleanupEvidence['reason'],
): Promise<LiveDaemonStaleCleanupEvidence> => {
  const removed: string[] = []
  for (const file of [paths.metadataPath, paths.socketPath]) {
    try {
      await rm(file, { force: true })
      removed.push(file)
    } catch {
      // best-effort cleanup only
    }
  }
  return { cleaned: removed.length > 0, reason, removed }
}
```

- [ ] **Step 4: Run the tests**

Run:

```bash
rtk pnpm -C packages/logix-cli test -- --run test/Integration/live-daemon-operator-snapshot.contract.test.ts --reporter=dot
```

Expected: PASS.

- [ ] **Step 5: Commit**

Do not commit unless the user explicitly asks. If committing is later requested:

```bash
rtk git add packages/logix-cli/src/internal/liveDaemonOperatorSnapshot.ts packages/logix-cli/test/Integration/live-daemon-operator-snapshot.contract.test.ts
rtk git commit -m "test: define live daemon operator snapshot boundary"
```

## Chunk 2: Launcher Stale Cleanup And Readiness

### Task 2: Make Launcher Use Operator Snapshot

**Files:**
- Modify: `packages/logix-cli/src/internal/liveDaemonLauncher.ts`
- Modify: `packages/logix-cli/src/internal/liveDaemonClient.ts`
- Test: `packages/logix-cli/test/Integration/live-daemon-operator-snapshot.contract.test.ts`

- [ ] **Step 1: Add failing launcher tests**

Append tests:

```ts
import { readFile } from 'node:fs/promises'

import { resolveLiveDaemonLaunchSpec, startLiveDaemonProcess } from '../../src/internal/liveDaemonLauncher.js'

it('does not reuse metadata for a non-running pid', async () => {
  const stateDir = await mkdtemp(path.join(os.tmpdir(), 'logix-live-launcher-stale-'))
  process.env.LOGIX_LIVE_STATE_DIR = stateDir
  const paths = resolveLiveTransportPaths({ stateDir })
  await writeFile(paths.metadataPath, JSON.stringify({
    schemaVersion: 1,
    pid: 99999999,
    host: paths.host,
    port: paths.port,
    socketPath: paths.socketPath,
    stateDir,
    operator: { carrierLocal: true, publicContract: false },
  }), 'utf8')

  const launch = makeTestLiveDaemonLaunchOverride(path.resolve(__dirname, '../../src/bin/logix.ts'))
  process.env.LOGIX_INTERNAL_LIVE_DAEMON_COMMAND = launch.command
  process.env.LOGIX_INTERNAL_LIVE_DAEMON_ARGS_JSON = JSON.stringify(launch.args)

  const started = await startLiveDaemonProcess()

  expect(started.started).toBe(true)
  const metadata = JSON.parse(await readFile(paths.metadataPath, 'utf8'))
  expect(metadata.pid).not.toBe(99999999)
  expect(metadata.operator).toMatchObject({ carrierLocal: true, publicContract: false })
})

it('keeps launch override as test-only and defaults to current CLI re-exec', () => {
  delete process.env.LOGIX_INTERNAL_LIVE_DAEMON_COMMAND
  delete process.env.LOGIX_INTERNAL_LIVE_DAEMON_ARGS_JSON
  process.env.LOGIX_INTERNAL_CLI_ENTRY = '/tmp/logix/dist/logix.js'
  process.env.LOGIX_INTERNAL_CLI_EXECARGV_JSON = JSON.stringify(['--enable-source-maps'])

  const spec = resolveLiveDaemonLaunchSpec()

  expect(spec.command).toBe(process.execPath)
  expect(spec.args).toEqual(['--enable-source-maps', '/tmp/logix/dist/logix.js', '__internal_live_daemon'])
  expect(spec.args.join(' ')).not.toContain('tsx')
  expect(spec.args.join(' ')).not.toContain('logix-live-daemon')
})
```

Expected current failure: stale metadata is reused or helper signatures differ.

- [ ] **Step 2: Run failing tests**

Run:

```bash
rtk pnpm -C packages/logix-cli test -- --run test/Integration/live-daemon-operator-snapshot.contract.test.ts --reporter=dot
```

Expected: FAIL on stale metadata behavior.

- [ ] **Step 3: Update `liveDaemonClient.ts` metadata read path**

Change `LiveDaemonMetadata` to be compatible with `LiveDaemonOperatorMetadata`. Replace raw `JSON.parse` in `readLiveDaemonMetadata` with:

```ts
import { readLiveDaemonOperatorMetadata } from './liveDaemonOperatorSnapshot.js'

export type LiveDaemonMetadata = LiveDaemonOperatorMetadata

export const readLiveDaemonMetadata = async (
  paths: LiveTransportPaths = resolveLiveTransportPaths(),
): Promise<LiveDaemonMetadata | undefined> => {
  try {
    return await readLiveDaemonOperatorMetadata(paths)
  } catch {
    return undefined
  }
}
```

Keep `requestLiveDaemon`, `requestDefaultLiveDaemon`, and `stopLiveDaemon` unchanged.

- [ ] **Step 4: Update `liveDaemonLauncher.ts`**

Replace direct metadata reuse with snapshot checks:

```ts
import {
  cleanupStaleLiveDaemonSnapshot,
  readLiveDaemonOperatorSnapshot,
} from './liveDaemonOperatorSnapshot.js'
```

Before spawning:

```ts
const snapshot = await readLiveDaemonOperatorSnapshot(paths)
if (snapshot.state === 'ready') {
  return { started: false, port: snapshot.websocket.port }
}
if (snapshot.state === 'degraded') {
  await cleanupStaleLiveDaemonSnapshot(
    paths,
    snapshot.operator.reason === 'stale-pid' ? 'stale-pid' : 'invalid-metadata',
  )
}
```

After spawn wait, keep polling `readLiveDaemonMetadata(paths)`, because daemon readiness still means metadata exists. On timeout, clean stale evidence:

```ts
await cleanupStaleLiveDaemonSnapshot(paths, 'start-timeout')
throw new Error('Live daemon did not become ready in time.')
```

- [ ] **Step 5: Run focused tests**

Run:

```bash
rtk pnpm -C packages/logix-cli test -- --run test/Integration/live-daemon-operator-snapshot.contract.test.ts test/Integration/live-daemon-carrier.contract.test.ts --reporter=dot
```

Expected: PASS.

- [ ] **Step 6: Commit**

Do not commit unless explicitly requested. If committing is later requested:

```bash
rtk git add packages/logix-cli/src/internal/liveDaemonLauncher.ts packages/logix-cli/src/internal/liveDaemonClient.ts packages/logix-cli/src/internal/liveDaemonOperatorSnapshot.ts packages/logix-cli/test/Integration/live-daemon-operator-snapshot.contract.test.ts
rtk git commit -m "fix: keep live daemon launch state carrier-local"
```

## Chunk 3: Server Metadata And Live Status Projection

### Task 3: Write Daemon Metadata Through Operator Snapshot

**Files:**
- Modify: `packages/logix-cli/src/internal/liveDaemonServer.ts`
- Test: `packages/logix-cli/test/Integration/live-daemon-operator-snapshot.contract.test.ts`

- [ ] **Step 1: Add failing server metadata test**

Append:

```ts
import { createLiveDaemonServer } from '../../src/internal/liveDaemonServer.js'

it('server writes operator metadata without runtime or attachment truth', async () => {
  const stateDir = await mkdtemp(path.join(os.tmpdir(), 'logix-live-server-metadata-'))
  const daemon = await createLiveDaemonServer({ stateDir, host: '127.0.0.1', port: 0 }).start()
  try {
    const raw = JSON.parse(await readFile(daemon.paths.metadataPath, 'utf8'))
    expect(raw).toMatchObject({
      schemaVersion: 1,
      pid: process.pid,
      host: '127.0.0.1',
      port: daemon.port,
      socketPath: daemon.paths.socketPath,
      stateDir,
      operator: { carrierLocal: true, publicContract: false },
    })
    expect(raw).not.toHaveProperty('attachments')
    expect(raw).not.toHaveProperty('targets')
    expect(raw).not.toHaveProperty('runtime')
    expect(raw).not.toHaveProperty('evidence')
  } finally {
    await daemon.stop()
  }
})
```

- [ ] **Step 2: Run failing test**

Run:

```bash
rtk pnpm -C packages/logix-cli test -- --run test/Integration/live-daemon-operator-snapshot.contract.test.ts --reporter=dot
```

Expected: FAIL because current server metadata lacks `schemaVersion/operator`.

- [ ] **Step 3: Use `writeLiveDaemonOperatorSnapshot` in server**

In `liveDaemonServer.ts`, replace direct `writeFile(paths.metadataPath, JSON.stringify(...))` with:

```ts
import { writeLiveDaemonOperatorSnapshot } from './liveDaemonOperatorSnapshot.js'
```

and:

```ts
await writeLiveDaemonOperatorSnapshot(paths, {
  pid: process.pid,
  startedAt: Date.now(),
  logPath: path.join(paths.stateDir, 'daemon.log'),
})
```

Do not start writing process logs in this task. `logPath` is a locator only.

- [ ] **Step 4: Run focused tests**

Run:

```bash
rtk pnpm -C packages/logix-cli test -- --run test/Integration/live-daemon-operator-snapshot.contract.test.ts test/Integration/live-daemon-carrier.contract.test.ts test/Integration/live-daemon-disconnect.contract.test.ts --reporter=dot
```

Expected: PASS.

- [ ] **Step 5: Commit**

Do not commit unless explicitly requested.

### Task 4: Make Live Status Reuse Operator Snapshot Shape

**Files:**
- Modify: `packages/logix-cli/src/internal/liveClient.ts`
- Modify if needed: `packages/logix-cli/test/Integration/live-namespace.contract.test.ts`
- Test: `packages/logix-cli/test/Integration/live-daemon-operator-snapshot.contract.test.ts`

- [ ] **Step 1: Add failing live status degraded test**

Append:

```ts
import { Effect } from 'effect'
import { runCli } from '../../src/internal/entry.js'

it('live status reports invalid metadata as degraded operator snapshot', async () => {
  const stateDir = await mkdtemp(path.join(os.tmpdir(), 'logix-live-status-degraded-'))
  process.env.LOGIX_LIVE_STATE_DIR = stateDir
  const paths = resolveLiveTransportPaths({ stateDir })
  await writeFile(paths.metadataPath, '{"pid":"bad"}', 'utf8')

  const out = await Effect.runPromise(runCli(['live', 'status', '--runId', 'status-degraded']))

  expect(out.kind).toBe('result')
  if (out.kind !== 'result') throw new Error('expected result')
  expect(out.result.kind).toBe('LiveCommandResult')
  expect(out.result.artifacts[0]?.inline).toMatchObject({
    state: 'degraded',
    operator: { carrierLocal: true, publicContract: false, reason: 'invalid-metadata' },
  })
})
```

- [ ] **Step 2: Run failing test**

Run:

```bash
rtk pnpm -C packages/logix-cli test -- --run test/Integration/live-daemon-operator-snapshot.contract.test.ts test/Integration/live-namespace.contract.test.ts --reporter=dot
```

Expected: FAIL because status currently falls back to stopped or raw daemon status.

- [ ] **Step 3: Update `liveClient.ts` status helpers**

Import:

```ts
import {
  makeStoppedLiveDaemonOperatorSnapshot,
  readLiveDaemonOperatorSnapshot,
} from './liveDaemonOperatorSnapshot.js'
```

Change `stoppedStatus` to use `makeStoppedLiveDaemonOperatorSnapshot(paths)`.

For `status`:

```ts
const snapshot = await readLiveDaemonOperatorSnapshot(paths)
if (snapshot.state !== 'ready') {
  return { outputKey: 'liveStatus', kind: 'LiveStatus', ok: true, inline: toJsonPayload(snapshot) }
}
const response = await requestLiveDaemon(paths, { type: 'status' })
if (!response.ok) {
  return {
    outputKey: 'liveStatus',
    kind: 'LiveStatus',
    ok: true,
    inline: toJsonPayload({ ...snapshot, state: 'degraded', operator: { ...snapshot.operator, reason: response.error.code } }),
  }
}
return { outputKey: 'liveStatus', kind: 'LiveStatus', ok: true, inline: toJsonPayload(response.data) }
```

For `start`, preserve behavior: existing ready snapshot returns ready; degraded snapshot triggers launcher cleanup and spawn from Task 2.

- [ ] **Step 4: Run focused tests**

Run:

```bash
rtk pnpm -C packages/logix-cli test -- --run test/Integration/live-daemon-operator-snapshot.contract.test.ts test/Integration/live-namespace.contract.test.ts test/Integration/live-daemon-carrier.contract.test.ts --reporter=dot
```

Expected: PASS.

- [ ] **Step 5: Commit**

Do not commit unless explicitly requested.

## Chunk 4: Bin And Packaging Hygiene

### Task 5: Remove The Second Daemon Bin From Build Surface

**Files:**
- Modify: `packages/logix-cli/tsup.config.ts`
- Delete: `packages/logix-cli/src/bin/logix-live-daemon.ts`
- Test: `packages/logix-cli/test/Integration/public-surface.guard.test.ts`

- [ ] **Step 1: Add failing public surface guard**

In `public-surface.guard.test.ts`, add:

```ts
it('does not build or advertise a second live daemon binary', () => {
  const tsupConfig = fs.readFileSync(path.join(packageRoot, 'tsup.config.ts'), 'utf8')
  expect(tsupConfig).not.toContain('src/bin/logix-live-daemon.ts')
  expect(fs.existsSync(path.join(packageRoot, 'src/bin/logix-live-daemon.ts'))).toBe(false)
})
```

Expected current failure: file exists and tsup entry includes it.

- [ ] **Step 2: Run failing guard**

Run:

```bash
rtk pnpm -C packages/logix-cli test -- --run test/Integration/public-surface.guard.test.ts --reporter=dot
```

Expected: FAIL.

- [ ] **Step 3: Remove the extra bin**

Delete `packages/logix-cli/src/bin/logix-live-daemon.ts`.

Edit `packages/logix-cli/tsup.config.ts`:

```ts
entry: ['src/bin/logix.ts'],
```

Keep `package.json` unchanged because it already only exposes:

```json
"bin": { "logix": "dist/logix.js" }
```

- [ ] **Step 4: Run public surface guard**

Run:

```bash
rtk pnpm -C packages/logix-cli test -- --run test/Integration/public-surface.guard.test.ts --reporter=dot
```

Expected: PASS.

- [ ] **Step 5: Run build smoke**

Run:

```bash
rtk pnpm -C packages/logix-cli build
```

Expected: PASS, `dist/logix.js` exists and no public `package.json` bin points to daemon.

- [ ] **Step 6: Commit**

Do not commit unless explicitly requested.

## Chunk 5: Verification And Docs Closure

### Task 6: Run Minimal Regression Matrix

**Files:**
- No code edits unless failures reveal necessary fixes.

- [ ] **Step 1: Run CLI live daemon tests**

Run:

```bash
rtk pnpm -C packages/logix-cli test -- --run \
  test/Integration/live-daemon-operator-snapshot.contract.test.ts \
  test/Integration/live-daemon-carrier.contract.test.ts \
  test/Integration/live-daemon-disconnect.contract.test.ts \
  test/Integration/live-daemon-multitab.contract.test.ts \
  test/Integration/live-evidence-handoff.e2e.test.ts \
  test/Integration/live-namespace.contract.test.ts \
  test/Integration/live-command-result.contract.test.ts \
  test/Integration/public-surface.guard.test.ts \
  --reporter=dot
```

Expected: PASS.

- [ ] **Step 2: Run CLI typecheck**

Run:

```bash
rtk pnpm -C packages/logix-cli typecheck
```

Expected: PASS.

- [ ] **Step 3: Run diff hygiene**

Run:

```bash
rtk git diff --check -- packages/logix-cli docs/proposals/live-daemon-lifecycle-architecture-memo.md specs/171-agent-live-runtime-bridge/notes/verification.md specs/171-agent-live-runtime-bridge/tasks.md
```

Expected: no output.

### Task 7: Update Verification Notes And Task Ledger

**Files:**
- Modify: `specs/171-agent-live-runtime-bridge/notes/verification.md`
- Modify: `specs/171-agent-live-runtime-bridge/tasks.md`
- Modify if needed: `docs/proposals/live-daemon-lifecycle-architecture-memo.md`

- [ ] **Step 1: Update verification note**

Append a dated section to `specs/171-agent-live-runtime-bridge/notes/verification.md`:

```md
## 2026-05-03 live daemon launcher/operator snapshot hardening

Scope:

- `live client` does not own daemon launch strategy.
- daemon metadata is carrier-local operator snapshot only.
- stale metadata/socket cleanup is launcher-owned.
- no supervisor and no public lifecycle grammar were introduced.
- hidden daemon runtime continues through current CLI re-exec with `__internal_live_daemon`.

Proof:

```bash
rtk pnpm -C packages/logix-cli test -- --run \
  test/Integration/live-daemon-operator-snapshot.contract.test.ts \
  test/Integration/live-daemon-carrier.contract.test.ts \
  test/Integration/live-daemon-disconnect.contract.test.ts \
  test/Integration/live-daemon-multitab.contract.test.ts \
  test/Integration/live-evidence-handoff.e2e.test.ts \
  test/Integration/live-namespace.contract.test.ts \
  test/Integration/live-command-result.contract.test.ts \
  test/Integration/public-surface.guard.test.ts \
  --reporter=dot
rtk pnpm -C packages/logix-cli typecheck
rtk git diff --check -- packages/logix-cli specs/171-agent-live-runtime-bridge/notes/verification.md specs/171-agent-live-runtime-bridge/tasks.md
```
```

- [ ] **Step 2: Update tasks**

In `specs/171-agent-live-runtime-bridge/tasks.md`, add or check off entries near the real carrier / daemon launcher tasks:

```md
- [x] T124 在 `packages/logix-cli/src/internal/liveDaemonOperatorSnapshot.ts` 固定 carrier-local operator snapshot，不把 pid/log/state 升级为 public contract。
- [x] T125 在 `packages/logix-cli/src/internal/liveDaemonLauncher.ts` 把 stale metadata/socket cleanup 收回 launcher boundary。
- [x] T126 删除或阻断第二 daemon bin entry，保持 hidden `__internal_live_daemon` 只由当前 CLI re-exec 使用。
```

Use the next available task numbers if T124-T126 are already taken.

- [ ] **Step 3: Re-run docs sweep**

Run:

```bash
rtk rg -n 'logix live ensure|logix live restart|logix live logs|logix live doctor|logix-live-daemon|pid/log/state 文件 schema|public file contract' docs specs packages/logix-cli -g '*.md' -g '*.ts'
```

Expected:

- No public docs teaching `logix live ensure/restart/logs/doctor`.
- No remaining `logix-live-daemon` production/source reference after deletion.
- Any `pid/log/state` references in proposal/ledger must say carrier-local operator snapshot or non-public evidence.

- [ ] **Step 4: Commit**

Do not commit unless explicitly requested.

## Final Acceptance

- [ ] `liveClient.ts` imports launcher/client helpers but does not parse `process.argv`, hardcode `tsx`, decide `src/dist`, or clean stale process files itself.
- [ ] `liveDaemonLauncher.ts` is the only module that starts the daemon process.
- [ ] `liveDaemonOperatorSnapshot.ts` is the only module that interprets daemon metadata validity and stale cleanup evidence.
- [ ] `liveDaemonServer.ts` writes operator metadata without targets, attachments, runtime truth, evidence truth, or report truth.
- [ ] No public command grammar beyond existing `logix live <task>` was added.
- [ ] No supervisor runtime was added.
- [ ] No second public daemon binary is built or exposed.
- [ ] Focused CLI live daemon tests pass.
- [ ] `packages/logix-cli` typecheck passes.
- [ ] 171 verification notes and tasks are updated with proof commands.
