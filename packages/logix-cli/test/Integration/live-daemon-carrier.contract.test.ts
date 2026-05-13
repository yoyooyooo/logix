import { mkdtemp, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'

import { Effect } from 'effect'
import WebSocket from 'ws'
import { afterEach, describe, expect, it } from 'vitest'
import {
  createFieldRuntimeInspectModel,
  createLiveOperationLedgerStore,
  makeLiveSummaryInspectArtifact,
  makeLiveTargetCoordinate,
  makeLiveTimelineInspectArtifact,
  makeLiveTimelineContinuationGap,
} from '@logixjs/core/repo-internal/live-bridge-api'

import { runCli } from '../../src/internal/entry.js'
import { runLiveClientTask } from '../../src/internal/liveClient.js'
import { requestLiveDaemon } from '../../src/internal/liveDaemonClient.js'
import { makeTestLiveDaemonLaunchOverride } from '../../src/internal/liveDaemonLauncher.js'
import { createLiveDaemonServer } from '../../src/internal/liveDaemonServer.js'

const require = createRequire(import.meta.url)
const previousStateDir = process.env.LOGIX_LIVE_STATE_DIR
const previousPort = process.env.LOGIX_LIVE_PORT
const previousLaunchCommand = process.env.LOGIX_INTERNAL_LIVE_DAEMON_COMMAND
const previousLaunchArgs = process.env.LOGIX_INTERNAL_LIVE_DAEMON_ARGS_JSON

afterEach(() => {
  if (previousStateDir === undefined) delete process.env.LOGIX_LIVE_STATE_DIR
  else process.env.LOGIX_LIVE_STATE_DIR = previousStateDir
  if (previousPort === undefined) delete process.env.LOGIX_LIVE_PORT
  else process.env.LOGIX_LIVE_PORT = previousPort
  if (previousLaunchCommand === undefined) delete process.env.LOGIX_INTERNAL_LIVE_DAEMON_COMMAND
  else process.env.LOGIX_INTERNAL_LIVE_DAEMON_COMMAND = previousLaunchCommand
  if (previousLaunchArgs === undefined) delete process.env.LOGIX_INTERNAL_LIVE_DAEMON_ARGS_JSON
  else process.env.LOGIX_INTERNAL_LIVE_DAEMON_ARGS_JSON = previousLaunchArgs
})

const withTempStateDir = async <A>(fn: (stateDir: string) => Promise<A>): Promise<A> => {
  const stateDir = await mkdtemp(path.join(os.tmpdir(), 'logix-live-daemon-'))
  process.env.LOGIX_LIVE_STATE_DIR = stateDir
  process.env.LOGIX_LIVE_PORT = '0'
  const launch = makeTestLiveDaemonLaunchOverride(path.resolve(__dirname, '../../src/bin/logix.ts'))
  process.env.LOGIX_INTERNAL_LIVE_DAEMON_COMMAND = launch.command
  process.env.LOGIX_INTERNAL_LIVE_DAEMON_ARGS_JSON = JSON.stringify(launch.args)
  try {
    return await fn(stateDir)
  } finally {
    await rm(stateDir, { recursive: true, force: true })
  }
}

const waitForOpen = (ws: WebSocket): Promise<void> =>
  new Promise((resolve, reject) => {
    ws.once('open', resolve)
    ws.once('error', reject)
  })

describe('live daemon carrier client', () => {
  it('starts and stops the daemon through the live CLI route', async () => {
    await withTempStateDir(async () => {
      const start = await Effect.runPromise(runCli(['live', 'start', '--runId', 'live-start-1']))
      expect(start.kind).toBe('result')
      if (start.kind !== 'result') throw new Error('expected start result')
      expect(start.result.kind).toBe('LiveCommandResult')
      expect(start.result.artifacts[0]?.inline).toMatchObject({ state: 'ready' })

      const status = await Effect.runPromise(runCli(['live', 'status', '--runId', 'live-status-2']))
      expect(status.kind).toBe('result')
      if (status.kind !== 'result') throw new Error('expected status result')
      expect(status.result.artifacts[0]?.inline).toMatchObject({ state: 'ready' })

      const stop = await Effect.runPromise(runCli(['live', 'stop', '--runId', 'live-stop-1']))
      expect(stop.kind).toBe('result')
      if (stop.kind !== 'result') throw new Error('expected stop result')
      expect(stop.result.artifacts[0]?.inline).toMatchObject({ state: 'stopping' })
    })
  })

  it('returns a structured stopped status when no daemon metadata exists', async () => {
    await withTempStateDir(async () => {
      const result = runLiveClientTask({ task: 'status' })

      expect(result.kind).toBe('LiveStatus')
      expect(result.inline).toMatchObject({
        state: 'stopped',
        authority: 'core-owned-attachment',
        transport: expect.objectContaining({ carrier: 'ipc', health: 'closed' }),
      })
    })
  })

  it('degrades bounded retained segment drain requests before any browser wait', async () => {
    await withTempStateDir(async (stateDir) => {
      const daemon = await createLiveDaemonServer({ stateDir, host: '127.0.0.1', port: 0 }).start()
      try {
        const response = await requestLiveDaemon(daemon.paths, {
          type: 'operation',
          operation: 'evidence.retainedSegment.drain',
          payload: {
            target: 'runtime:example-runtime/module:LiveBridgeFixture/instance:default',
            leaseId: 'lease-overflow',
            maxQueueEntries: 0,
          },
        })

        expect(response).toMatchObject({
          ok: true,
          data: {
            gap: expect.objectContaining({
              code: 'retained-segment-drain-bounded',
              severity: 'warning',
            }),
          },
        })
      } finally {
        await daemon.stop()
      }
    })
  })

  it('opens explicit evidence leases and exports retained owner segment refs without owning timeline truth', async () => {
    await withTempStateDir(async (stateDir) => {
      const daemon = await createLiveDaemonServer({ stateDir, host: '127.0.0.1', port: 0 }).start()
      const ws = new WebSocket(`ws://127.0.0.1:${daemon.port}`)
      try {
        const target = makeLiveTargetCoordinate({
          runtimeId: 'example-runtime',
          moduleId: 'LiveBridgeFixture',
          instanceId: 'default',
        })
        const store = createLiveOperationLedgerStore({ enabled: true })
        store.recordOperationEvent({ target, eventKind: 'operation.accepted', label: 'accepted', txnSeq: 1, opSeq: 1 })
        store.recordOperationEvent({
          target,
          eventKind: 'operation.completed',
          label: 'completed',
          txnSeq: 1,
          opSeq: 2,
          redacted: [{ category: 'secret', reason: 'policy' }],
        })

        await waitForOpen(ws)
        ws.send(
          JSON.stringify({
            schemaVersion: 1,
            id: 'offer-1',
            role: 'browser',
            type: 'host.offer',
            payload: {
              attachmentId: 'browser:conn-1',
              adapterKind: 'browser-dev',
              hostCoordinate: { hostKind: 'browser', tabId: 'tab-a' },
              transport: { carrier: 'websocket', connectionId: 'conn-1' },
              targets: [target],
            },
          }),
        )
        ws.on('message', (raw) => {
          const msg = JSON.parse(raw.toString()) as { readonly type?: string; readonly payload?: any }
          if (msg.type !== 'live.operation.request') return
          if (msg.payload.operation !== 'inspect.events') return
          const ownerWindow = store.readWindow({
            target,
            attachmentId: msg.payload.attachmentId,
            limit: msg.payload.limit,
          })
          ws.send(
            JSON.stringify({
              schemaVersion: 1,
              id: `resp:${msg.payload.requestId}`,
              role: 'browser',
              type: 'live.operation.response',
              payload: {
                requestId: msg.payload.requestId,
                attachmentId: msg.payload.attachmentId,
                ok: true,
                artifact: {
                  outputKey: 'live-inspect:events',
                  kind: 'LiveInspectArtifact',
                  value: {
                    kind: 'live.inspect.artifact',
                    section: 'events',
                    facet: {
                      kind: 'live.inspect.facet',
                      view: 'events',
                      target: { ...target, attachmentId: msg.payload.attachmentId, adapterKind: 'browser-dev' },
                      sourceAuthority: 'runtime-live',
                      producer: 'browser-test',
                      payload: {
                        schemaVersion: 'live-inspect.v1',
                        generatedBy: 'browser-test',
                        operationWindow: ownerWindow,
                      },
                      budget: { maxEvents: 2, maxInlineBytes: 4096 },
                      gaps: ownerWindow.gaps,
                    },
                  },
                },
              },
            }),
          )
        })

        await new Promise((resolve) => setTimeout(resolve, 30))
        const open = await requestLiveDaemon(daemon.paths, {
          type: 'operation',
          operation: 'evidence.retainedSegment.open',
          payload: {
            target: 'runtime:example-runtime/module:LiveBridgeFixture/instance:default',
            purpose: 'export-evidence',
            consumer: 'agent',
            workspace: 'workspace-a',
            limit: 2,
            ttlMs: 30_000,
            maxBytes: 8192,
          },
        })

        expect(open).toMatchObject({
          ok: true,
          data: {
            artifact: {
              outputKey: 'live-retained-segment',
              kind: 'CanonicalEvidencePackage',
              value: {
                retainedSegmentRef: expect.stringContaining('retained-segment:'),
                segment: expect.objectContaining({
                  kind: 'daemon.retained.owner.segment',
                  ownerEventIds: expect.arrayContaining([
                    'live-ledger:example-runtime/LiveBridgeFixture/default:1',
                    'live-ledger:example-runtime/LiveBridgeFixture/default:2',
                  ]),
                  redacted: [{ category: 'secret', reason: 'policy' }],
                  leaseProvenance: expect.objectContaining({ purpose: 'export-evidence' }),
                }),
              },
            },
          },
        })
        const segmentRef = (open as any).data.artifact.value.retainedSegmentRef
        const exported = await requestLiveDaemon(daemon.paths, {
          type: 'operation',
          operation: 'export.evidence',
          payload: { from: segmentRef },
        })
        const manifest = (exported as any).data.package

        expect(manifest.retainedSegments).toEqual([expect.objectContaining({ ref: segmentRef })])
        expect(JSON.stringify(manifest)).not.toMatch(/verdict|repairHints|completenessAuthority|daemonOrder/)
      } finally {
        ws.close()
        await daemon.stop()
      }
    })
  })

  it('accepts browser host offers through WebSocket and returns targets through IPC', async () => {
    await withTempStateDir(async (stateDir) => {
      const daemon = await createLiveDaemonServer({ stateDir, host: '127.0.0.1', port: 0 }).start()
      const ws = new WebSocket(`ws://127.0.0.1:${daemon.port}`)
      try {
        await waitForOpen(ws)
        ws.send(
          JSON.stringify({
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
          }),
        )

        await new Promise((resolve) => setTimeout(resolve, 30))
        const response = await requestLiveDaemon(daemon.paths, { type: 'targets', tree: true })
        expect(response).toMatchObject({
          ok: true,
          data: {
            targets: [
              expect.objectContaining({
                attachmentId: 'browser:conn-1',
                hostCoordinate: expect.objectContaining({ tabId: 'tab-a' }),
              }),
            ],
          },
        })

        const out = await Effect.runPromise(runCli(['live', 'targets', '--runId', 'daemon-targets', '--tree']))
        expect(out.kind).toBe('result')
        if (out.kind !== 'result') throw new Error('expected result')
        expect(out.result.kind).toBe('LiveCommandResult')
        expect(out.result.artifacts[0]).toMatchObject({
          kind: 'LiveTargetList',
          inline: { targets: [expect.objectContaining({ attachmentId: 'browser:conn-1' })] },
        })
      } finally {
        ws.close()
        await daemon.stop()
      }
    })
  })

  it('returns snapshot.read as a bounded inspect artifact composition', async () => {
    await withTempStateDir(async (stateDir) => {
      const daemon = await createLiveDaemonServer({ stateDir, host: '127.0.0.1', port: 0 }).start()
      const ws = new WebSocket(`ws://127.0.0.1:${daemon.port}`)
      try {
        await waitForOpen(ws)
        ws.send(
          JSON.stringify({
            schemaVersion: 1,
            id: 'offer-1',
            role: 'browser',
            type: 'host.offer',
            payload: {
              attachmentId: 'browser:conn-1',
              adapterKind: 'browser-dev',
              hostCoordinate: { hostKind: 'browser', tabId: 'tab-a' },
              transport: { carrier: 'websocket', connectionId: 'conn-1' },
              targets: [{ runtimeId: 'example-runtime', moduleId: 'LiveBridgeFixture', instanceId: 'default' }],
            },
          }),
        )
        await new Promise((resolve) => setTimeout(resolve, 30))
        const response = await requestLiveDaemon(daemon.paths, {
          type: 'operation',
          operation: 'snapshot.read',
          payload: { target: 'runtime:example-runtime/module:LiveBridgeFixture/instance:default' },
        })
        expect(response).toMatchObject({
          ok: true,
          data: {
            artifact: {
              outputKey: 'live-inspect:snapshot',
              kind: 'LiveInspectArtifact',
              value: expect.objectContaining({
                kind: 'live.inspect.artifact',
                section: 'snapshot',
              }),
            },
          },
        })
      } finally {
        ws.close()
        await daemon.stop()
      }
    })
  })

  it('routes capture.eventWindow through the same browser operation lane', async () => {
    await withTempStateDir(async (stateDir) => {
      const daemon = await createLiveDaemonServer({ stateDir, host: '127.0.0.1', port: 0 }).start()
      const ws = new WebSocket(`ws://127.0.0.1:${daemon.port}`)
      try {
        await waitForOpen(ws)
        ws.send(
          JSON.stringify({
            schemaVersion: 1,
            id: 'offer-1',
            role: 'browser',
            type: 'host.offer',
            payload: {
              attachmentId: 'browser:conn-1',
              adapterKind: 'browser-dev',
              hostCoordinate: { hostKind: 'browser', tabId: 'tab-a' },
              transport: { carrier: 'websocket', connectionId: 'conn-1' },
              targets: [{ runtimeId: 'example-runtime', moduleId: 'LiveBridgeFixture', instanceId: 'default' }],
            },
          }),
        )
        ws.on('message', (raw) => {
          const msg = JSON.parse(raw.toString()) as { readonly type?: string; readonly payload?: any }
          if (msg.type !== 'live.operation.request') return
          if (msg.payload.operation !== 'capture.eventWindow') return
          ws.send(
            JSON.stringify({
              schemaVersion: 1,
              id: `resp:${msg.payload.requestId}`,
              role: 'browser',
              type: 'live.operation.response',
              payload: {
                requestId: msg.payload.requestId,
                attachmentId: msg.payload.attachmentId,
                ok: true,
                artifact: {
                  outputKey: 'live-capture:event-window',
                  kind: 'LiveCapture',
                  value: {
                    kind: 'live.capture',
                    captureId: 'capture:event-window-1',
                    captureKind: 'event-window',
                    target: { runtimeId: 'example-runtime', moduleId: 'LiveBridgeFixture', instanceId: 'default' },
                    stageClass: 'drilldown-only',
                    budget: { maxEvents: 16, maxInlineBytes: 1024 },
                    artifactRef: { outputKey: 'live-capture:event-window', kind: 'LiveCapture' },
                  },
                },
              },
            }),
          )
        })

        await new Promise((resolve) => setTimeout(resolve, 30))
        const response = await requestLiveDaemon(daemon.paths, {
          type: 'operation',
          operation: 'capture.eventWindow',
          payload: { target: 'runtime:example-runtime/module:LiveBridgeFixture/instance:default', windowMs: 500 },
        })
        expect(response).toMatchObject({
          ok: true,
          data: {
            artifact: {
              outputKey: 'live-capture:event-window',
              kind: 'LiveCapture',
            },
          },
        })
      } finally {
        ws.close()
        await daemon.stop()
      }
    })
  })

  it('transports inspect.events operation windows without reordering or accepting late duplicate responses', async () => {
    await withTempStateDir(async (stateDir) => {
      const daemon = await createLiveDaemonServer({ stateDir, host: '127.0.0.1', port: 0 }).start()
      const ws = new WebSocket(`ws://127.0.0.1:${daemon.port}`)
      try {
        const target = makeLiveTargetCoordinate({
          runtimeId: 'example-runtime',
          moduleId: 'LiveBridgeFixture',
          instanceId: 'default',
        })
        const store = createLiveOperationLedgerStore({ enabled: true })
        store.recordOperationEvent({ target, eventKind: 'operation.accepted', label: 'z-accepted' })
        store.recordOperationEvent({ target, eventKind: 'operation.completed', label: 'a-completed' })
        const ownerWindow = store.readWindow({ target, limit: 2 })
        const duplicateWindow = {
          ...ownerWindow,
          events: [...ownerWindow.events].reverse(),
        }
        let requestId = ''

        await waitForOpen(ws)
        ws.send(
          JSON.stringify({
            schemaVersion: 1,
            id: 'offer-1',
            role: 'browser',
            type: 'host.offer',
            payload: {
              attachmentId: 'browser:conn-1',
              adapterKind: 'browser-dev',
              hostCoordinate: { hostKind: 'browser', tabId: 'tab-a' },
              transport: { carrier: 'websocket', connectionId: 'conn-1' },
              targets: [target],
            },
          }),
        )
        ws.on('message', (raw) => {
          const msg = JSON.parse(raw.toString()) as { readonly type?: string; readonly payload?: any }
          if (msg.type !== 'live.operation.request') return
          if (msg.payload.operation !== 'inspect.events') return
          requestId = msg.payload.requestId
          ws.send(
            JSON.stringify({
              schemaVersion: 1,
              id: `resp:${msg.payload.requestId}`,
              role: 'browser',
              type: 'live.operation.response',
              payload: {
                requestId: msg.payload.requestId,
                attachmentId: msg.payload.attachmentId,
                ok: true,
                artifact: {
                  outputKey: 'live-inspect:events',
                  kind: 'LiveInspectArtifact',
                  value: {
                    kind: 'live.inspect.artifact',
                    section: 'events',
                    facet: {
                      kind: 'live.inspect.facet',
                      view: 'events',
                      target: { ...target, attachmentId: msg.payload.attachmentId, adapterKind: 'browser-dev' },
                      sourceAuthority: 'runtime-live',
                      producer: 'browser-test',
                      payload: {
                        schemaVersion: 'live-inspect.v1',
                        generatedBy: 'browser-test',
                        operationWindow: ownerWindow,
                      },
                      budget: { maxEvents: 2, maxInlineBytes: 4096 },
                      gaps: [],
                    },
                  },
                },
              },
            }),
          )
        })

        await new Promise((resolve) => setTimeout(resolve, 30))
        const response = await requestLiveDaemon(daemon.paths, {
          type: 'operation',
          operation: 'inspect.events',
          payload: { target: 'runtime:example-runtime/module:LiveBridgeFixture/instance:default', limit: 2 },
        })
        expect(response).toMatchObject({
          ok: true,
          data: {
            artifact: {
              outputKey: 'live-inspect:events',
              kind: 'LiveInspectArtifact',
            },
          },
        })
        const operationWindow = (response as any).data.artifact.value.facet.payload.operationWindow
        expect(operationWindow).toEqual(ownerWindow)
        expect(operationWindow.events.map((event: any) => event.label)).toEqual(['z-accepted', 'a-completed'])
        expect(operationWindow.events.map((event: any) => event.sourceAuthority)).toEqual(['runtime-live', 'runtime-live'])

        ws.send(
          JSON.stringify({
            schemaVersion: 1,
            id: `resp:${requestId}:late`,
            role: 'browser',
            type: 'live.operation.response',
            payload: {
              requestId,
              attachmentId: 'browser:conn-1',
              ok: true,
              artifact: {
                outputKey: 'live-inspect:events',
                kind: 'LiveInspectArtifact',
                value: {
                  kind: 'live.inspect.artifact',
                  section: 'events',
                  facet: {
                    kind: 'live.inspect.facet',
                    view: 'events',
                    target: { ...target, attachmentId: 'browser:conn-1', adapterKind: 'browser-dev' },
                    sourceAuthority: 'runtime-live',
                    producer: 'browser-test-late',
                    payload: {
                      schemaVersion: 'live-inspect.v1',
                      generatedBy: 'browser-test-late',
                      operationWindow: duplicateWindow,
                    },
                    budget: { maxEvents: 2, maxInlineBytes: 4096 },
                    gaps: [],
                  },
                },
              },
            },
          }),
        )
        await new Promise((resolve) => setTimeout(resolve, 30))

        const lineageRef = (response as any).data.artifact.value.artifactRef.file
        const exported = await requestLiveDaemon(daemon.paths, {
          type: 'operation',
          operation: 'export.evidence',
          payload: { from: lineageRef },
        })
        const exportedWindow = (exported as any).data.package.events[0].facet.payload.operationWindow
        expect(exportedWindow).toEqual(ownerWindow)
      } finally {
        ws.close()
        await daemon.stop()
      }
    })
  })

  it('transports diagnostic and process inspect.events windows through daemon cache and export', async () => {
    await withTempStateDir(async (stateDir) => {
      const daemon = await createLiveDaemonServer({ stateDir, host: '127.0.0.1', port: 0 }).start()
      const ws = new WebSocket(`ws://127.0.0.1:${daemon.port}`)
      try {
        const target = makeLiveTargetCoordinate({
          runtimeId: 'example-runtime',
          moduleId: 'LiveDebugSourceFixture',
          instanceId: 'default',
        })
        const store = createLiveOperationLedgerStore({ enabled: true, diagnosticsEnabled: true })
        store.addDebugSourceRecord({
          type: 'diagnostic',
          target,
          code: 'debug.source.warning',
          severity: 'warning',
          message: 'Debug source warning.',
          txnSeq: 3,
          opSeq: 2,
        })
        store.addDebugSourceRecord({
          type: 'process:start',
          target,
          label: 'process:start',
          severity: 'info',
          txnSeq: 5,
          eventSeq: 4,
          meta: { processId: 'sync-user' },
        })

        await waitForOpen(ws)
        ws.send(
          JSON.stringify({
            schemaVersion: 1,
            id: 'offer-1',
            role: 'browser',
            type: 'host.offer',
            payload: {
              attachmentId: 'browser:conn-1',
              adapterKind: 'browser-dev',
              hostCoordinate: { hostKind: 'browser', tabId: 'tab-a' },
              transport: { carrier: 'websocket', connectionId: 'conn-1' },
              targets: [target],
            },
          }),
        )
        ws.on('message', (raw) => {
          const msg = JSON.parse(raw.toString()) as { readonly type?: string; readonly payload?: any }
          if (msg.type !== 'live.operation.request') return
          if (msg.payload.operation !== 'inspect.events') return
          const ownerWindow = store.readWindow({
            target,
            eventKinds: msg.payload.kind === 'diagnostic' || msg.payload.kind === 'process' ? [msg.payload.kind] : undefined,
            ...(typeof msg.payload.limit === 'number' ? { limit: msg.payload.limit } : null),
          })
          ws.send(
            JSON.stringify({
              schemaVersion: 1,
              id: `resp:${msg.payload.requestId}`,
              role: 'browser',
              type: 'live.operation.response',
              payload: {
                requestId: msg.payload.requestId,
                attachmentId: msg.payload.attachmentId,
                ok: true,
                artifact: {
                  outputKey: 'live-inspect:events',
                  kind: 'LiveInspectArtifact',
                  value: {
                    kind: 'live.inspect.artifact',
                    section: 'events',
                    facet: {
                      kind: 'live.inspect.facet',
                      view: 'events',
                      target: { ...target, attachmentId: msg.payload.attachmentId, adapterKind: 'browser-dev' },
                      sourceAuthority: 'runtime-live',
                      producer: 'browser-test',
                      payload: {
                        schemaVersion: 'live-inspect.v1',
                        generatedBy: 'browser-test',
                        operationWindow: ownerWindow,
                      },
                      budget: { maxEvents: 2, maxInlineBytes: 4096 },
                      gaps: ownerWindow.gaps,
                    },
                  },
                },
              },
            }),
          )
        })

        await new Promise((resolve) => setTimeout(resolve, 30))
        for (const item of [
          { kind: 'diagnostic', label: 'debug.source.warning', coordinate: { kind: 'txn-op', txnSeq: 3, opSeq: 2 } },
          { kind: 'process', label: 'process:start', coordinate: { kind: 'txn-event', txnSeq: 5, eventSeq: 4 } },
        ] as const) {
          const response = await requestLiveDaemon(daemon.paths, {
            type: 'operation',
            operation: 'inspect.events',
            payload: {
              target: 'runtime:example-runtime/module:LiveDebugSourceFixture/instance:default',
              kind: item.kind,
              limit: 2,
            },
          })
          expect(response).toMatchObject({
            ok: true,
            data: {
              artifact: {
                outputKey: 'live-inspect:events',
                kind: 'LiveInspectArtifact',
              },
            },
          })
          const operationWindow = (response as any).data.artifact.value.facet.payload.operationWindow
          expect(operationWindow.events).toHaveLength(1)
          expect(operationWindow.events[0]).toMatchObject({
            eventKind: item.kind,
            label: item.label,
            sourceAuthority: 'runtime-live',
            order: { coordinate: item.coordinate },
          })
          expect(operationWindow.gaps).toEqual([])
          expect((response as any).data.artifact.value.artifactRef).toMatchObject({
            file: expect.any(String),
            reasonCodes: expect.arrayContaining(['live-daemon-lineage']),
          })

          const lineageRef = (response as any).data.artifact.value.artifactRef.file
          const exported = await requestLiveDaemon(daemon.paths, {
            type: 'operation',
            operation: 'export.evidence',
            payload: { from: lineageRef },
          })
          const exportedWindow = (exported as any).data.package.events[0].facet.payload.operationWindow
          expect(exportedWindow).toEqual(operationWindow)
        }
      } finally {
        ws.close()
        await daemon.stop()
      }
    })
  })

  it('transports inspect.timeline owner artifacts without rewriting the timeline payload', async () => {
    await withTempStateDir(async (stateDir) => {
      const daemon = await createLiveDaemonServer({ stateDir, host: '127.0.0.1', port: 0 }).start()
      const ws = new WebSocket(`ws://127.0.0.1:${daemon.port}`)
      try {
        const target = makeLiveTargetCoordinate({
          runtimeId: 'example-runtime',
          moduleId: 'LiveBridgeFixture',
          instanceId: 'default',
        })
        const store = createLiveOperationLedgerStore({ enabled: true })
        store.recordOperationEvent({ target, eventKind: 'operation.accepted', label: 'z-accepted', txnSeq: 1, opSeq: 1, linkId: 'link:one' })
        store.recordOperationEvent({
          target,
          eventKind: 'operation.completed',
          label: 'a-completed',
          txnSeq: 1,
          opSeq: 2,
          linkId: 'link:one',
          stateAfter: { sourceKind: 'current-head-exact', boundedSummary: { count: 1 } },
        })
        const ownerWindow = store.readWindow({ target, limit: 2 })
        const ownerArtifact = makeLiveTimelineInspectArtifact({
          target: { ...target, attachmentId: 'browser:conn-1', adapterKind: 'browser-dev' },
          producer: 'browser-test',
          operationWindow: ownerWindow,
          gaps: [
            {
              kind: 'evidence.gap',
              gapId: 'field-runtime:missing-field-event-meta:count',
              code: 'missing-field-event-meta',
              summary: 'No field semantic metadata was available for count.',
              severity: 'info',
              stageClass: 'drilldown-only',
              target,
              owner: 'field-runtime',
              reopenBar: 'reopen when field-runtime can provide field event metadata',
            },
          ],
        })

        await waitForOpen(ws)
        ws.send(
          JSON.stringify({
            schemaVersion: 1,
            id: 'offer-1',
            role: 'browser',
            type: 'host.offer',
            payload: {
              attachmentId: 'browser:conn-1',
              adapterKind: 'browser-dev',
              hostCoordinate: { hostKind: 'browser', tabId: 'tab-a' },
              transport: { carrier: 'websocket', connectionId: 'conn-1' },
              targets: [target],
            },
          }),
        )
        ws.on('message', (raw) => {
          const msg = JSON.parse(raw.toString()) as { readonly type?: string; readonly payload?: any }
          if (msg.type !== 'live.operation.request') return
          if (msg.payload.operation !== 'inspect.timeline') return
          ws.send(
            JSON.stringify({
              schemaVersion: 1,
              id: `resp:${msg.payload.requestId}`,
              role: 'browser',
              type: 'live.operation.response',
              payload: {
                requestId: msg.payload.requestId,
                attachmentId: msg.payload.attachmentId,
                ok: true,
                artifact: {
                  outputKey: 'live-inspect:timeline',
                  kind: 'LiveInspectArtifact',
                  value: ownerArtifact,
                },
              },
            }),
          )
        })

        await new Promise((resolve) => setTimeout(resolve, 30))
        const response = await requestLiveDaemon(daemon.paths, {
          type: 'operation',
          operation: 'inspect.timeline',
          payload: { target: 'runtime:example-runtime/module:LiveBridgeFixture/instance:default', limit: 2, field: 'count' },
        })
        expect(response).toMatchObject({
          ok: true,
          data: {
            artifact: {
              outputKey: 'live-inspect:timeline',
              kind: 'LiveInspectArtifact',
            },
          },
        })
        const timeline = (response as any).data.artifact.value.facet.payload.timeline
        expect(timeline).toEqual((ownerArtifact.facet.payload as any).timeline)
        expect(timeline.items.map((item: any) => item.label)).toEqual(['z-accepted', 'a-completed'])
        expect(timeline.items[1].stateAfter).toMatchObject({
          kind: 'live.stateAfter.sourceRef',
          sourceKind: 'current-head-exact',
        })
        expect(timeline.gaps).toEqual([
          expect.objectContaining({ owner: 'field-runtime', code: 'missing-field-event-meta' }),
        ])
        expect((response as any).data.artifact.value.artifactRef).toMatchObject({
          file: expect.any(String),
          reasonCodes: expect.arrayContaining(['live-daemon-lineage']),
        })
        expect(JSON.stringify(timeline)).not.toMatch(/lineageRef|live-daemon-lineage/)

        const lineageRef = (response as any).data.artifact.value.artifactRef.file
        const exported = await requestLiveDaemon(daemon.paths, {
          type: 'operation',
          operation: 'export.evidence',
          payload: { from: lineageRef },
        })
        const exportedTimeline = (exported as any).data.package.events[0].facet.payload.timeline
        expect(exportedTimeline).toEqual((ownerArtifact.facet.payload as any).timeline)
      } finally {
        ws.close()
        await daemon.stop()
      }
    })
  })

  it('preserves segmented timeline completeness without daemon-owned truth fields', async () => {
    await withTempStateDir(async (stateDir) => {
      const daemon = await createLiveDaemonServer({ stateDir, host: '127.0.0.1', port: 0 }).start()
      const ws = new WebSocket(`ws://127.0.0.1:${daemon.port}`)
      try {
        const target = makeLiveTargetCoordinate({
          runtimeId: 'example-runtime',
          moduleId: 'SegmentedTimelineFixture',
          instanceId: 'default',
        })
        const store = createLiveOperationLedgerStore({ enabled: true })
        const retainedEvent = store.recordOperationEvent({ target, eventKind: 'operation.accepted', label: 'retained', txnSeq: 1, opSeq: 1 })
        store.recordOperationEvent({ target, eventKind: 'operation.failed', label: 'dropped-middle', txnSeq: 1, opSeq: 2 })
        const headEvent = store.recordOperationEvent({ target, eventKind: 'operation.completed', label: 'head', txnSeq: 1, opSeq: 3 })
        const ownerWindow = store.readWindow({ target, cursor: headEvent.watermark, limit: 1 })
        const ownerArtifact = makeLiveTimelineInspectArtifact({
          target: { ...target, attachmentId: 'browser:conn-1', adapterKind: 'browser-dev' },
          producer: 'browser-test',
          operationWindow: ownerWindow,
          sourceSegments: [
            {
              sourceKind: 'daemon-retained-segment',
              target: { ...target, attachmentId: 'browser:conn-1', adapterKind: 'browser-dev' },
              attachmentId: 'browser:conn-1',
              startWatermark: retainedEvent.watermark,
              endWatermark: retainedEvent.watermark,
              completeness: 'complete',
              gaps: [],
              dropped: [],
              degraded: [],
              redacted: [],
              retainedSegmentRef: 'retained-segment:stale',
            },
          ],
          gaps: [makeLiveTimelineContinuationGap({ code: 'timeline-retention-gap', target })],
        })
        const ownerTimeline = (ownerArtifact.facet.payload as any).timeline

        await waitForOpen(ws)
        ws.send(
          JSON.stringify({
            schemaVersion: 1,
            id: 'offer-1',
            role: 'browser',
            type: 'host.offer',
            payload: {
              attachmentId: 'browser:conn-1',
              adapterKind: 'browser-dev',
              hostCoordinate: { hostKind: 'browser', tabId: 'tab-a' },
              transport: { carrier: 'websocket', connectionId: 'conn-1' },
              targets: [target],
            },
          }),
        )
        ws.on('message', (raw) => {
          const msg = JSON.parse(raw.toString()) as { readonly type?: string; readonly payload?: any }
          if (msg.type !== 'live.operation.request') return
          if (msg.payload.operation !== 'inspect.timeline') return
          ws.send(
            JSON.stringify({
              schemaVersion: 1,
              id: `resp:${msg.payload.requestId}`,
              role: 'browser',
              type: 'live.operation.response',
              payload: {
                requestId: msg.payload.requestId,
                attachmentId: msg.payload.attachmentId,
                ok: true,
                artifact: {
                  outputKey: 'live-inspect:timeline',
                  kind: 'LiveInspectArtifact',
                  value: ownerArtifact,
                },
              },
            }),
          )
        })

        await new Promise((resolve) => setTimeout(resolve, 30))
        const response = await requestLiveDaemon(daemon.paths, {
          type: 'operation',
          operation: 'inspect.timeline',
          payload: { target: 'runtime:example-runtime/module:SegmentedTimelineFixture/instance:default', limit: 1 },
        })
        const timeline = (response as any).data.artifact.value.facet.payload.timeline

        expect(timeline).toEqual(ownerTimeline)
        expect(timeline.completeness).toBe('partial-dropped')
        expect(timeline.sourceSegments.map((segment: any) => segment.sourceKind)).toEqual([
          'daemon-retained-segment',
          'runtime-head',
        ])
        expect(timeline.safeResumeBoundary).toEqual(
          expect.objectContaining({
            reason: 'partial-window',
            resumeWatermark: ownerWindow.endWatermark,
            gaps: [expect.objectContaining({ code: 'timeline-retention-gap' })],
          }),
        )
        expect(JSON.stringify(timeline)).not.toMatch(/completenessAuthority|daemonOrder|rowId|writeTime/)

        const lineageRef = (response as any).data.artifact.value.artifactRef.file
        const exported = await requestLiveDaemon(daemon.paths, {
          type: 'operation',
          operation: 'export.evidence',
          payload: { from: lineageRef },
        })
        const exportedTimeline = (exported as any).data.package.events[0].facet.payload.timeline
        expect(exportedTimeline).toEqual(ownerTimeline)
      } finally {
        ws.close()
        await daemon.stop()
      }
    })
  })

  it('transports inspect.summary owner artifacts through daemon cache and export without rewriting owner facts', async () => {
    await withTempStateDir(async (stateDir) => {
      const daemon = await createLiveDaemonServer({ stateDir, host: '127.0.0.1', port: 0 }).start()
      const ws = new WebSocket(`ws://127.0.0.1:${daemon.port}`)
      try {
        const target = makeLiveTargetCoordinate({
          runtimeId: 'example-runtime',
          moduleId: 'LiveSummaryFixture',
          instanceId: 'default',
        })
        const store = createLiveOperationLedgerStore({ enabled: true })
        store.recordOperationEvent({ target, eventKind: 'operation.accepted', label: 'accepted', txnSeq: 1, opSeq: 1 })
        store.recordOperationEvent({ target, eventKind: 'operation.completed', label: 'completed', txnSeq: 1, opSeq: 2 })
        const ownerWindow = store.readWindow({ target, limit: 2 })
        const fieldModel = createFieldRuntimeInspectModel({ enabled: true, producer: 'browser-test' })
        const fieldSummaryArtifact = fieldModel.readFieldSummary({
          target: { ...target, attachmentId: 'browser:conn-1', adapterKind: 'browser-dev' },
          snapshot: {
            moduleId: 'LiveSummaryFixture',
            digest: 'mfields:daemon-summary',
            fields: [{ fieldId: 'count', name: 'Count' }],
            provenanceIndex: {
              count: {
                originType: 'module',
                originId: 'LiveSummaryFixture',
                originIdKind: 'explicit',
                originLabel: 'module:LiveSummaryFixture',
              },
            },
          },
          changedFieldCount: 1,
          convergenceCauses: [{ cause: 'dispatch', fieldPath: 'count', count: 1 }],
          budget: { maxEvents: 2, maxInlineBytes: 4096 },
        })
        const ownerArtifact = makeLiveSummaryInspectArtifact({
          target: { ...target, attachmentId: 'browser:conn-1', adapterKind: 'browser-dev' },
          producer: 'browser-test',
          operationWindow: ownerWindow,
          fieldSummaryArtifact,
        })

        await waitForOpen(ws)
        ws.send(
          JSON.stringify({
            schemaVersion: 1,
            id: 'offer-1',
            role: 'browser',
            type: 'host.offer',
            payload: {
              attachmentId: 'browser:conn-1',
              adapterKind: 'browser-dev',
              hostCoordinate: { hostKind: 'browser', tabId: 'tab-a' },
              transport: { carrier: 'websocket', connectionId: 'conn-1' },
              targets: [target],
            },
          }),
        )
        ws.on('message', (raw) => {
          const msg = JSON.parse(raw.toString()) as { readonly type?: string; readonly payload?: any }
          if (msg.type !== 'live.operation.request') return
          if (msg.payload.operation !== 'inspect.summary') return
          ws.send(
            JSON.stringify({
              schemaVersion: 1,
              id: `resp:${msg.payload.requestId}`,
              role: 'browser',
              type: 'live.operation.response',
              payload: {
                requestId: msg.payload.requestId,
                attachmentId: msg.payload.attachmentId,
                ok: true,
                artifact: {
                  outputKey: 'live-inspect:summary',
                  kind: 'LiveInspectArtifact',
                  value: ownerArtifact,
                },
              },
            }),
          )
        })

        await new Promise((resolve) => setTimeout(resolve, 30))
        const response = await requestLiveDaemon(daemon.paths, {
          type: 'operation',
          operation: 'inspect.summary',
          payload: { target: 'runtime:example-runtime/module:LiveSummaryFixture/instance:default', limit: 2 },
        })
        expect(response).toMatchObject({
          ok: true,
          data: {
            artifact: {
              outputKey: 'live-inspect:summary',
              kind: 'LiveInspectArtifact',
            },
          },
        })
        const summary = (response as any).data.artifact.value.facet.payload.summary
        expect(summary).toEqual((ownerArtifact.facet.payload as any).summary)
        expect(summary.operation.eventKindCounts).toEqual({
          'operation.accepted': 1,
          'operation.completed': 1,
        })
        expect(summary.fieldConvergence).toMatchObject({
          sourceAuthority: 'field-runtime',
          fieldSummary: {
            kind: 'live.field.summary',
            fieldCount: 1,
            changedFieldCount: 1,
          },
        })
        expect((response as any).data.artifact.value.artifactRef).toMatchObject({
          file: expect.any(String),
          reasonCodes: expect.arrayContaining(['live-daemon-lineage']),
        })
        expect(JSON.stringify(summary)).not.toMatch(/operationWindow|lineageRef|live-daemon-lineage|SubscriptionRef/)

        const lineageRef = (response as any).data.artifact.value.artifactRef.file
        const exported = await requestLiveDaemon(daemon.paths, {
          type: 'operation',
          operation: 'export.evidence',
          payload: { from: lineageRef },
        })
        const exportedSummary = (exported as any).data.package.events[0].facet.payload.summary
        expect(exportedSummary).toEqual((ownerArtifact.facet.payload as any).summary)
      } finally {
        ws.close()
        await daemon.stop()
      }
    })
  })

  it('releases pending operation requests when the target connection closes', async () => {
    await withTempStateDir(async (stateDir) => {
      const daemon = await createLiveDaemonServer({ stateDir, host: '127.0.0.1', port: 0 }).start()
      const ws = new WebSocket(`ws://127.0.0.1:${daemon.port}`)
      try {
        await waitForOpen(ws)
        ws.send(
          JSON.stringify({
            schemaVersion: 1,
            id: 'offer-1',
            role: 'browser',
            type: 'host.offer',
            payload: {
              attachmentId: 'browser:conn-1',
              adapterKind: 'browser-dev',
              hostCoordinate: { hostKind: 'browser', tabId: 'tab-a' },
              transport: { carrier: 'websocket', connectionId: 'conn-1' },
              targets: [{ runtimeId: 'example-runtime', moduleId: 'LiveBridgeFixture', instanceId: 'default' }],
            },
          }),
        )
        ws.on('message', (raw) => {
          const msg = JSON.parse(raw.toString()) as { readonly type?: string; readonly payload?: any }
          if (msg.type !== 'live.operation.request') return
          if (msg.payload.operation === 'inspect.events') ws.close()
        })

        await new Promise((resolve) => setTimeout(resolve, 30))
        const pending = requestLiveDaemon(daemon.paths, {
          type: 'operation',
          operation: 'inspect.events',
          payload: { target: 'runtime:example-runtime/module:LiveBridgeFixture/instance:default', limit: 2 },
        })
        const response = await Promise.race([
          pending,
          new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 350)),
        ])
        expect(response).not.toBe('timeout')
        expect(response).toMatchObject({
          ok: true,
          data: {
            gap: expect.objectContaining({
              code: 'carrier.target-closed',
            }),
          },
        })
      } finally {
        ws.close()
        await daemon.stop()
      }
    })
  })

  it('routes wait.condition through the same browser operation lane', async () => {
    await withTempStateDir(async (stateDir) => {
      const daemon = await createLiveDaemonServer({ stateDir, host: '127.0.0.1', port: 0 }).start()
      const ws = new WebSocket(`ws://127.0.0.1:${daemon.port}`)
      try {
        await waitForOpen(ws)
        ws.send(
          JSON.stringify({
            schemaVersion: 1,
            id: 'offer-1',
            role: 'browser',
            type: 'host.offer',
            payload: {
              attachmentId: 'browser:conn-1',
              adapterKind: 'browser-dev',
              hostCoordinate: { hostKind: 'browser', tabId: 'tab-a' },
              transport: { carrier: 'websocket', connectionId: 'conn-1' },
              targets: [{ runtimeId: 'example-runtime', moduleId: 'LiveBridgeFixture', instanceId: 'default' }],
            },
          }),
        )
        ws.on('message', (raw) => {
          const msg = JSON.parse(raw.toString()) as { readonly type?: string; readonly payload?: any }
          if (msg.type !== 'live.operation.request') return
          if (msg.payload.operation !== 'wait.condition') return
          ws.send(
            JSON.stringify({
              schemaVersion: 1,
              id: `resp:${msg.payload.requestId}`,
              role: 'browser',
              type: 'live.operation.response',
              payload: {
                requestId: msg.payload.requestId,
                attachmentId: msg.payload.attachmentId,
                ok: true,
                artifact: {
                  outputKey: 'live-wait',
                  kind: 'LiveOperationFacet',
                  value: {
                    kind: 'operation.completed',
                    operationId: `wait:${msg.payload.requestId}`,
                    target: { runtimeId: 'example-runtime', moduleId: 'LiveBridgeFixture', instanceId: 'default' },
                    stageClass: 'drilldown-only',
                    artifactRef: { outputKey: 'live-wait', kind: 'LiveOperationFacet' },
                  },
                },
              },
            }),
          )
        })

        await new Promise((resolve) => setTimeout(resolve, 30))
        const response = await requestLiveDaemon(daemon.paths, {
          type: 'operation',
          operation: 'wait.condition',
          payload: {
            target: 'runtime:example-runtime/module:LiveBridgeFixture/instance:default',
            condition: 'count>0',
            timeoutMs: 500,
          },
        })
        expect(response).toMatchObject({
          ok: true,
          data: {
            artifact: {
              outputKey: 'live-wait',
              kind: 'LiveOperationFacet',
            },
          },
        })
      } finally {
        ws.close()
        await daemon.stop()
      }
    })
  })

  it('routes dispatch.declaredAction through the browser operation lane with explicit action metadata', async () => {
    await withTempStateDir(async (stateDir) => {
      const daemon = await createLiveDaemonServer({ stateDir, host: '127.0.0.1', port: 0 }).start()
      const ws = new WebSocket(`ws://127.0.0.1:${daemon.port}`)
      try {
        await waitForOpen(ws)
        ws.send(
          JSON.stringify({
            schemaVersion: 1,
            id: 'offer-1',
            role: 'browser',
            type: 'host.offer',
            payload: {
              attachmentId: 'browser:conn-1',
              adapterKind: 'browser-dev',
              hostCoordinate: { hostKind: 'browser', tabId: 'tab-a' },
              transport: { carrier: 'websocket', connectionId: 'conn-1' },
              targets: [{ runtimeId: 'example-runtime', moduleId: 'LiveBridgeFixture', instanceId: 'default' }],
            },
          }),
        )
        ws.on('message', (raw) => {
          const msg = JSON.parse(raw.toString()) as { readonly type?: string; readonly payload?: any }
          if (msg.type !== 'live.operation.request') return
          if (msg.payload.operation !== 'dispatch.declaredAction') return
          expect(msg.payload.actionTag).toBe('increment')
          expect(msg.payload).not.toHaveProperty('validatorAvailable')
          ws.send(
            JSON.stringify({
              schemaVersion: 1,
              id: `resp:${msg.payload.requestId}`,
              role: 'browser',
              type: 'live.operation.response',
              payload: {
                requestId: msg.payload.requestId,
                attachmentId: msg.payload.attachmentId,
                ok: true,
                artifact: {
                  outputKey: 'live-operation:dispatch.declaredAction',
                  kind: 'LiveOperationFacet',
                  value: {
                    kind: 'operation.completed',
                    operationId: `dispatch:${msg.payload.requestId}`,
                    target: { runtimeId: 'example-runtime', moduleId: 'LiveBridgeFixture', instanceId: 'default' },
                    stageClass: 'drilldown-only',
                    artifactRef: { outputKey: 'live-operation:dispatch.declaredAction', kind: 'LiveOperationFacet' },
                  },
                },
              },
            }),
          )
        })

        await new Promise((resolve) => setTimeout(resolve, 30))
        const response = await requestLiveDaemon(daemon.paths, {
          type: 'operation',
          operation: 'dispatch.declaredAction',
          payload: {
            target: 'runtime:example-runtime/module:LiveBridgeFixture/instance:default',
            actionTag: 'increment',
            payload: undefined,
          },
        })
        expect(response).toMatchObject({
          ok: true,
          data: {
            artifact: {
              outputKey: 'live-operation:dispatch.declaredAction',
              kind: 'LiveOperationFacet',
            },
          },
        })
      } finally {
        ws.close()
        await daemon.stop()
      }
    })
  })

  it('preserves field-runtime inspect artifacts and markers through daemon cache and export', async () => {
    await withTempStateDir(async (stateDir) => {
      const daemon = await createLiveDaemonServer({ stateDir, host: '127.0.0.1', port: 0 }).start()
      const ws = new WebSocket(`ws://127.0.0.1:${daemon.port}`)
      try {
        await waitForOpen(ws)
        ws.send(
          JSON.stringify({
            schemaVersion: 1,
            id: 'offer-1',
            role: 'browser',
            type: 'host.offer',
            payload: {
              attachmentId: 'browser:conn-1',
              adapterKind: 'browser-dev',
              hostCoordinate: { hostKind: 'browser', tabId: 'tab-a' },
              transport: { carrier: 'websocket', connectionId: 'conn-1' },
              targets: [{ runtimeId: 'example-runtime', moduleId: 'LiveFieldFixture', instanceId: 'default' }],
            },
          }),
        )
        ws.on('message', (raw) => {
          const msg = JSON.parse(raw.toString()) as { readonly type?: string; readonly payload?: any }
          if (msg.type !== 'live.operation.request') return
          if (msg.payload.operation !== 'inspect.fieldSummary') return
          ws.send(
            JSON.stringify({
              schemaVersion: 1,
              id: `resp:${msg.payload.requestId}`,
              role: 'browser',
              type: 'live.operation.response',
              payload: {
                requestId: msg.payload.requestId,
                attachmentId: msg.payload.attachmentId,
                ok: true,
                artifact: {
                  outputKey: 'live-inspect:field-summary',
                  kind: 'LiveInspectArtifact',
                  value: {
                    kind: 'live.inspect.artifact',
                    section: 'field-summary',
                    facet: {
                      kind: 'live.inspect.facet',
                      view: 'field-summary',
                      target: {
                        runtimeId: 'example-runtime',
                        moduleId: 'LiveFieldFixture',
                        instanceId: 'default',
                        attachmentId: msg.payload.attachmentId,
                        adapterKind: 'browser-dev',
                      },
                      sourceAuthority: 'field-runtime',
                      producer: 'browser-test',
                      payload: {
                        kind: 'live.field.summary',
                        schemaVersion: 'live-field-inspect.v1',
                        generatedBy: 'browser-test',
                        targetKey: 'runtime:example-runtime/module:LiveFieldFixture/instance:default',
                        moduleId: 'LiveFieldFixture',
                        fieldCount: 3,
                        degradedReasonCounts: { 'field-summary-truncated': 1 },
                        convergenceCauses: [{ cause: 'startup', fieldPath: 'derived', count: 1 }],
                        latestFieldSnapshotDigest: 'module-fields:test-digest',
                        truncated: true,
                      },
                      budget: { maxEvents: 1, maxInlineBytes: 4096 },
                      gaps: [
                        {
                          kind: 'evidence.gap',
                          gapId: 'live:field:field-summary-over-budget:test',
                          code: 'field-summary-over-budget',
                          summary: 'Field convergence summary exceeded the requested cause budget.',
                          severity: 'warning',
                          stageClass: 'drilldown-only',
                          owner: 'field-runtime',
                          reopenBar: 'reopen only if field-runtime inspect owner law changes',
                        },
                      ],
                      degraded: { reason: 'field-summary-truncated' },
                      redacted: [{ path: 'profile.secret', reason: 'field-redaction' }],
                    },
                  },
                },
              },
            }),
          )
        })

        await new Promise((resolve) => setTimeout(resolve, 30))
        const response = await requestLiveDaemon(daemon.paths, {
          type: 'operation',
          operation: 'inspect.fieldSummary',
          payload: { target: 'runtime:example-runtime/module:LiveFieldFixture/instance:default' },
        })
        const artifact = (response as any).data.artifact
        expect(response).toMatchObject({
          ok: true,
          data: {
            artifact: {
              outputKey: 'live-inspect:field-summary',
              kind: 'LiveInspectArtifact',
              value: expect.objectContaining({
                section: 'field-summary',
                facet: expect.objectContaining({
                  sourceAuthority: 'field-runtime',
                  degraded: { reason: 'field-summary-truncated' },
                  gaps: [expect.objectContaining({ owner: 'field-runtime', code: 'field-summary-over-budget' })],
                  redacted: [expect.objectContaining({ path: 'profile.secret' })],
                }),
              }),
            },
          },
        })
        expect(JSON.stringify(artifact)).not.toMatch(/"nodes"|"edges"|"from"|"to"|SubscriptionRef|field program/)

        const lineageRef = artifact.value.artifactRef.file
        const exported = await requestLiveDaemon(daemon.paths, {
          type: 'operation',
          operation: 'export.evidence',
          payload: { from: lineageRef },
        })
        const exportedEvent = (exported as any).data.package.events[0]
        expect(exportedEvent.facet.sourceAuthority).toBe('field-runtime')
        expect(exportedEvent.facet.gaps).toEqual([
          expect.objectContaining({ owner: 'field-runtime', code: 'field-summary-over-budget' }),
        ])
        expect(exportedEvent.facet.degraded).toEqual({ reason: 'field-summary-truncated' })
        expect(exportedEvent.facet.redacted).toEqual([expect.objectContaining({ path: 'profile.secret' })])
      } finally {
        ws.close()
        await daemon.stop()
      }
    })
  })
})
