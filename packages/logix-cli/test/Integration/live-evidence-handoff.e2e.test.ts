import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'
import { isVerificationControlPlaneReport } from '@logixjs/core/ControlPlane'

import { runCli } from '../../src/internal/entry.js'
import { readLiveDaemonMetadata, requestLiveDaemon } from '../../src/internal/liveDaemonClient.js'
import { resolveLiveTransportPaths } from '../../src/internal/liveTransportPaths.js'
import { createLiveDaemonServer } from '../../src/internal/liveDaemonServer.js'
import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import WebSocket from 'ws'
import {
  createLiveOperationLedgerStore,
  makeLiveTargetCoordinate,
} from '@logixjs/core/repo-internal/live-bridge-api'

const waitFor = async <A>(read: () => Promise<A>, predicate: (value: A) => boolean, timeoutMs = 1000): Promise<A> => {
  const startedAt = Date.now()
  for (;;) {
    const value = await read()
    if (predicate(value)) return value
    if (Date.now() - startedAt > timeoutMs) throw new Error(`waitFor timed out after ${timeoutMs}ms`)
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}

describe('live evidence handoff to verification closure', () => {
  it('exports retained segment refs without verification verdicts or synthesized Runtime facts', async () => {
    const stateDir = await mkdtemp(path.join(os.tmpdir(), 'logix-live-retained-evidence-'))
    const daemon = await createLiveDaemonServer({ stateDir, host: '127.0.0.1', port: 0 }).start()
    try {
      const ws = new WebSocket(`ws://127.0.0.1:${daemon.port}`)
      await new Promise<void>((resolve, reject) => {
        ws.once('open', resolve)
        ws.once('error', reject)
      })
      const target = makeLiveTargetCoordinate({
        runtimeId: 'example-runtime',
        moduleId: 'LiveBridgeFixture',
        instanceId: 'default',
      })
      const store = createLiveOperationLedgerStore({ enabled: true })
      store.recordOperationEvent({ target, eventKind: 'operation.accepted', label: 'accepted', txnSeq: 1, opSeq: 1 })
      store.recordOperationEvent({ target, eventKind: 'operation.completed', label: 'completed', txnSeq: 1, opSeq: 2 })
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
      await waitFor(
        () => requestLiveDaemon(daemon.paths, { type: 'targets', tree: true }),
        (response) => Boolean(response.ok && response.data.targets?.some((item) => item.attachmentId === 'browser:conn-1')),
      )
      ws.on('message', (raw) => {
        const message = JSON.parse(raw.toString()) as { readonly type?: string; readonly payload?: any }
        if (message.type !== 'live.operation.request' || message.payload.operation !== 'inspect.events') return
        const ownerWindow = store.readWindow({
          target,
          attachmentId: message.payload.attachmentId,
          limit: message.payload.limit,
        })
        ws.send(
          JSON.stringify({
            schemaVersion: 1,
            id: `resp:${message.payload.requestId}`,
            role: 'browser',
            type: 'live.operation.response',
            payload: {
              requestId: message.payload.requestId,
              attachmentId: message.payload.attachmentId,
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
                    target: { ...target, attachmentId: message.payload.attachmentId, adapterKind: 'browser-dev' },
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

      const open = await requestLiveDaemon(daemon.paths, {
        type: 'operation',
        operation: 'evidence.retainedSegment.open',
        payload: {
          target: 'runtime:example-runtime/module:LiveBridgeFixture/instance:default',
          purpose: 'export-evidence',
          workspace: 'workspace-a',
          consumer: 'agent',
          limit: 2,
        },
      })
      const segmentRef = (open as any).data.artifact.value.retainedSegmentRef
      expect(segmentRef).toEqual(expect.stringContaining('retained-segment:'))

      const exported = await requestLiveDaemon(daemon.paths, {
        type: 'operation',
        operation: 'export.evidence',
        payload: { from: segmentRef },
      })
      const manifest = (exported as any).data.package

      expect(manifest.retainedSegments).toEqual([
        expect.objectContaining({
          ref: segmentRef,
          attachmentId: 'browser:conn-1',
          leaseProvenance: expect.objectContaining({ purpose: 'export-evidence' }),
        }),
      ])
      expect(manifest.events[0]).toMatchObject({
        kind: 'daemon.retained.owner.segment',
        ownerEventIds: [
          'live-ledger:example-runtime/LiveBridgeFixture/default:1',
          'live-ledger:example-runtime/LiveBridgeFixture/default:2',
        ],
      })
      expect(JSON.stringify(manifest)).not.toMatch(/verdict|repairHints|nextRecommendedStage|completenessAuthority|synthesized/)
      ws.close()
    } finally {
      await daemon.stop()
      await rm(stateDir, { recursive: true, force: true })
    }
  })

  it('keeps repair hints report-owned while linking trial hints to live-derived evidence', async () => {
    const stateDir = await mkdtemp(path.join(os.tmpdir(), 'logix-live-evidence-'))
    const daemon = await createLiveDaemonServer({ stateDir, host: '127.0.0.1', port: 0 }).start()
    process.env.LOGIX_LIVE_STATE_DIR = stateDir
    try {
      const ws = new WebSocket(`ws://127.0.0.1:${daemon.port}`)
      await new Promise<void>((resolve, reject) => {
        ws.once('open', resolve)
        ws.once('error', reject)
      })
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
      await waitFor(
        () => requestLiveDaemon(daemon.paths, { type: 'targets', tree: true }),
        (response) => Boolean(response.ok && response.data.targets?.some((target) => target.attachmentId === 'browser:conn-1')),
      )
      ws.on('message', (raw) => {
        const message = JSON.parse(raw.toString()) as { readonly type?: string; readonly payload?: any }
        if (message.type !== 'live.operation.request') return
        ws.send(
          JSON.stringify({
            schemaVersion: 1,
            id: `resp:${message.payload.requestId}`,
            role: 'browser',
            type: 'live.operation.response',
            payload: {
              requestId: message.payload.requestId,
              attachmentId: message.payload.attachmentId,
              ok: true,
              artifact: {
                outputKey: 'live-snapshot',
                kind: 'LiveCapture',
                value: {
                  kind: 'live.capture',
                  captureId: 'capture:snapshot-proof',
                  captureKind: 'snapshot',
                  target: { runtimeId: 'example-runtime', moduleId: 'LiveBridgeFixture', instanceId: 'default' },
                  stageClass: 'drilldown-only',
                  budget: { maxEvents: 16, maxInlineBytes: 1024 },
                  artifactRef: { outputKey: 'live-snapshot', kind: 'LiveCapture' },
                },
              },
            },
          }),
        )
      })

      const snapshotOut = await Effect.runPromise(
        runCli([
          'live',
          'snapshot',
          '--runId',
          'live-snapshot-proof',
          '--target',
          'runtime:example-runtime/module:LiveBridgeFixture/instance:default',
        ]),
      )
      expect(snapshotOut.kind).toBe('result')
      if (snapshotOut.kind !== 'result') throw new Error('expected snapshot result')
      const snapshotArtifact = snapshotOut.result.artifacts.find((artifact) => artifact.outputKey === snapshotOut.result.primaryLiveOutputKey)
      const snapshotRef = (snapshotArtifact?.inline as any)?.artifactRef?.file
      expect(snapshotRef).toEqual(expect.stringContaining('live-artifact:'))
      const liveOut = await Effect.runPromise(
        runCli(['live', 'export', 'evidence', '--runId', 'live-export-proof', '--from', snapshotRef]),
      )
      expect(liveOut.kind).toBe('result')
      if (liveOut.kind !== 'result') throw new Error('expected live result')
      expect(liveOut.result.kind).toBe('LiveCommandResult')
      expect(liveOut.result).not.toHaveProperty('repairHints')
      expect(liveOut.result).not.toHaveProperty('nextRecommendedStage')
      expect(liveOut.result).not.toHaveProperty('verdict')

      const metadata = await readLiveDaemonMetadata()
      expect(metadata).toBeDefined()
      const exportResponse = await requestLiveDaemon(resolveLiveTransportPaths(metadata ?? {}), {
        type: 'operation',
        operation: 'export.evidence',
        payload: { from: snapshotRef },
      })
      expect(exportResponse.ok).toBe(true)
      if (!exportResponse.ok || !exportResponse.data.packageDir) throw new Error('expected daemon-backed packageDir')

      const entry = `${path.resolve(__dirname, '../fixtures/MissingServiceProgram.ts')}#MissingServiceProgram`
      const trialOut = await Effect.runPromise(
        runCli(['trial', '--runId', 'trial-live-evidence-proof', '--entry', entry, '--mode', 'startup', '--evidence', exportResponse.data.packageDir]),
      )

      expect(trialOut.kind).toBe('result')
      if (trialOut.kind !== 'result') throw new Error('expected trial result')
      expect(trialOut.result.kind).toBe('CommandResult')

      const reportArtifact = trialOut.result.artifacts.find((artifact) => artifact.outputKey === trialOut.result.primaryReportOutputKey)
      expect(isVerificationControlPlaneReport(reportArtifact?.inline)).toBe(true)
      const report = reportArtifact?.inline as any
      expect(report.repairHints.length).toBeGreaterThan(0)
      expect(report.repairHints.some((hint: any) => hint.relatedArtifactOutputKeys?.includes('evidenceInput'))).toBe(true)
      ws.close()
    } finally {
      await daemon.stop()
      await rm(stateDir, { recursive: true, force: true })
    }
  })

  it('exports React host profile summary as local-only evidence without verification authority', async () => {
    const stateDir = await mkdtemp(path.join(os.tmpdir(), 'logix-live-profile-evidence-'))
    const daemon = await createLiveDaemonServer({ stateDir, host: '127.0.0.1', port: 0 }).start()
    try {
      const ws = new WebSocket(`ws://127.0.0.1:${daemon.port}`)
      await new Promise<void>((resolve, reject) => {
        ws.once('open', resolve)
        ws.once('error', reject)
      })
      ws.send(
        JSON.stringify({
          schemaVersion: 1,
          id: 'offer-profile',
          role: 'browser',
          type: 'host.offer',
          payload: {
            attachmentId: 'browser:profile-tab',
            adapterKind: 'browser-dev',
            hostCoordinate: { hostKind: 'browser', tabId: 'profile-tab' },
            transport: { carrier: 'websocket', connectionId: 'profile-conn' },
            targets: [{ runtimeId: 'profile-runtime', moduleId: 'ProfileFixture', instanceId: 'default' }],
          },
        }),
      )
      await waitFor(
        () => requestLiveDaemon(daemon.paths, { type: 'targets', tree: true }),
        (response) => Boolean(response.ok && response.data.targets?.some((target) => target.attachmentId === 'browser:profile-tab')),
      )
      ws.on('message', (raw) => {
        const message = JSON.parse(raw.toString()) as { readonly type?: string; readonly payload?: any }
        if (message.type !== 'live.operation.request' || message.payload.operation !== 'profile.runtimeSummary') return
        ws.send(
          JSON.stringify({
            schemaVersion: 1,
            id: `resp:${message.payload.requestId}`,
            role: 'browser',
            type: 'live.operation.response',
            payload: {
              requestId: message.payload.requestId,
              attachmentId: message.payload.attachmentId,
              ok: true,
              artifact: {
                outputKey: 'live-profile-summary',
                kind: 'LiveCapture',
                value: {
                  kind: 'live.capture',
                  captureId: 'profile:summary',
                  captureKind: 'profile',
                  target: { runtimeId: 'profile-runtime', moduleId: 'ProfileFixture', instanceId: 'default' },
                  stageClass: 'host-harness',
                  budget: { maxEvents: 4, maxInlineBytes: 512 },
                  localOnly: true,
                  profileSummary: {
                    authority: 'react-host-adjunct',
                    source: 'local-browser',
                    sampleCount: 0,
                    targetRef: { runtimeId: 'profile-runtime', moduleId: 'ProfileFixture', instanceId: 'default' },
                    attachmentId: message.payload.attachmentId,
                  },
                  redacted: [{ category: 'profile', reason: 'local-summary-only' }],
                  artifactRef: { outputKey: 'live-profile-summary', kind: 'LiveCapture' },
                },
              },
            },
          }),
        )
      })

      const profileResponse = await requestLiveDaemon(daemon.paths, {
        type: 'operation',
        operation: 'profile.runtimeSummary',
        payload: { target: 'runtime:profile-runtime/module:ProfileFixture/instance:default' },
      })
      const profileArtifact = (profileResponse as any).data.artifact
      expect(profileArtifact).toMatchObject({
        outputKey: 'live-profile-summary',
        kind: 'LiveCapture',
        value: expect.objectContaining({
          captureKind: 'profile',
          localOnly: true,
          profileSummary: expect.objectContaining({ authority: 'react-host-adjunct', source: 'local-browser' }),
          artifactRef: expect.objectContaining({ file: expect.stringContaining('live-artifact:') }),
        }),
      })

      const exported = await requestLiveDaemon(daemon.paths, {
        type: 'operation',
        operation: 'export.evidence',
        payload: { from: profileArtifact.value.artifactRef.file },
      })
      const exportedEvent = (exported as any).data.package.events[0]
      expect(exportedEvent).toMatchObject({
        kind: 'live.capture',
        captureKind: 'profile',
        localOnly: true,
        profileSummary: expect.objectContaining({ authority: 'react-host-adjunct' }),
        redacted: [expect.objectContaining({ category: 'profile' })],
      })
      expect(JSON.stringify(exported)).not.toMatch(/verdict|repairHints|nextRecommendedStage|stateAfter|timeline ordering/)
      ws.close()
    } finally {
      await daemon.stop()
      await rm(stateDir, { recursive: true, force: true })
    }
  })
})
