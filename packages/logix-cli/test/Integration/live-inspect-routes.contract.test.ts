import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Effect } from 'effect'
import WebSocket from 'ws'
import { describe, expect, it } from 'vitest'
import {
  createLiveOperationLedgerStore,
  decodeLiveTimelineCursorToken,
  makeLiveTargetCoordinate,
  makeLiveTimelineInspectArtifact,
} from '@logixjs/core/repo-internal/live-bridge-api'

import { parseCliInvocation } from '../../src/internal/args.js'
import { runCli } from '../../src/internal/entry.js'
import { CLI_COMMAND_SCHEMA } from '../../src/internal/commandSchema.js'
import { createLiveDaemonServer } from '../../src/internal/liveDaemonServer.js'

const withIsolatedLiveStateDir = async <A>(fn: () => Promise<A>): Promise<A> => {
  const previousStateDir = process.env.LOGIX_LIVE_STATE_DIR
  const previousPort = process.env.LOGIX_LIVE_PORT
  const stateDir = await mkdtemp(path.join(os.tmpdir(), 'logix-live-inspect-no-daemon-'))
  process.env.LOGIX_LIVE_STATE_DIR = stateDir
  process.env.LOGIX_LIVE_PORT = '0'
  try {
    return await fn()
  } finally {
    if (previousStateDir === undefined) delete process.env.LOGIX_LIVE_STATE_DIR
    else process.env.LOGIX_LIVE_STATE_DIR = previousStateDir
    if (previousPort === undefined) delete process.env.LOGIX_LIVE_PORT
    else process.env.LOGIX_LIVE_PORT = previousPort
    await rm(stateDir, { recursive: true, force: true })
  }
}

const waitForOpen = (ws: WebSocket): Promise<void> =>
  new Promise((resolve, reject) => {
    ws.once('open', resolve)
    ws.once('error', reject)
  })

describe('172 live inspect CLI routes', () => {
  it('parses inspect positional target and all drilldown routes under logix live', async () => {
    const cases: ReadonlyArray<{
      readonly argv: ReadonlyArray<string>
      readonly task: string
      readonly extra?: Record<string, unknown>
    }> = [
      {
        argv: ['live', 'inspect', 'runtime:r/module:m/instance:i', '--runId', 'inspect-1', '--attachment', 'browser:tab-a'],
        task: 'inspect',
        extra: { target: 'runtime:r/module:m/instance:i', attachmentId: 'browser:tab-a' },
      },
      { argv: ['live', 'state', '--target', 'runtime:r/module:m/instance:i', '--path', 'count', '--runId', 'state-1'], task: 'state', extra: { path: 'count' } },
      { argv: ['live', 'actions', '--target', 'runtime:r/module:m/instance:i', '--runId', 'actions-1'], task: 'actions' },
      { argv: ['live', 'events', '--target', 'runtime:r/module:m/instance:i', '--kind', 'operation', '--limit', '20', '--runId', 'events-1'], task: 'events', extra: { kind: 'operation', limit: 20 } },
      { argv: ['live', 'timeline', '--target', 'runtime:r/module:m/instance:i', '--field', 'count', '--limit', '20', '--cursor', 'ltc1.test-token', '--runId', 'timeline-1'], task: 'timeline', extra: { field: 'count', limit: 20, cursor: 'ltc1.test-token' } },
      { argv: ['live', 'summary', '--target', 'runtime:r/module:m/instance:i', '--runId', 'summary-1'], task: 'summary' },
      { argv: ['live', 'fields', '--target', 'runtime:r/module:m/instance:i', '--runId', 'fields-1'], task: 'fields' },
      { argv: ['live', 'field-graph', '--target', 'runtime:r/module:m/instance:i', '--runId', 'field-graph-1'], task: 'field-graph' },
      { argv: ['live', 'field-summary', '--target', 'runtime:r/module:m/instance:i', '--runId', 'field-summary-1'], task: 'field-summary' },
    ]

    for (const item of cases) {
      const parsed = await Effect.runPromise(parseCliInvocation(item.argv, { helpText: 'help' }))
      expect(parsed).toMatchObject({
        kind: 'command',
        command: 'live',
        live: {
          task: item.task,
          ...(item.extra ?? {}),
        },
      })
    }
  })

  it('returns structured daemon gaps for inspect drilldown when no daemon is running', async () => {
    const out = await withIsolatedLiveStateDir(() =>
      Effect.runPromise(
        runCli(['live', 'state', '--runId', 'live-state-gap', '--target', 'runtime:missing/module:m/instance:i']),
      ),
    )

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')
    expect(out.result.kind).toBe('LiveCommandResult')
    expect(out.result.command).toBe('live state')
    const primary = out.result.artifacts.find((artifact) => artifact.outputKey === out.result.primaryLiveOutputKey)
    expect(primary?.kind).toBe('EvidenceGap')
    expect(primary?.inline).toMatchObject({ code: 'live-daemon-not-running' })
    expect(out.result).not.toHaveProperty('primaryReportOutputKey')
  })

  it('continues daemon-backed live timeline reads with opaque cursor tokens through the CLI route', async () => {
    await withIsolatedLiveStateDir(async () => {
      const daemon = await createLiveDaemonServer({ stateDir: process.env.LOGIX_LIVE_STATE_DIR, host: '127.0.0.1', port: 0 }).start()
      const ws = new WebSocket(`ws://127.0.0.1:${daemon.port}`)
      try {
        const target = makeLiveTargetCoordinate({
          runtimeId: 'example-runtime',
          moduleId: 'LiveTimelineCliFixture',
          instanceId: 'default',
        })
        const targetRef = 'runtime:example-runtime/module:LiveTimelineCliFixture/instance:default'
        const store = createLiveOperationLedgerStore({ enabled: true })
        store.recordOperationEvent({ target, eventKind: 'operation.denied', label: 'first-denied', txnSeq: 1, opSeq: 1 })
        const cursorPayloads: unknown[] = []

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
          cursorPayloads.push(msg.payload.cursor)
          const decoded = typeof msg.payload.cursor === 'string' ? decodeLiveTimelineCursorToken(msg.payload.cursor) : undefined
          const operationWindow = store.readWindow({
            target,
            attachmentId: msg.payload.attachmentId,
            limit: msg.payload.limit,
            ...(decoded ? { cursor: decoded.runtimeResumeWatermark } : null),
          })
          const artifact = makeLiveTimelineInspectArtifact({
            target: { ...target, attachmentId: msg.payload.attachmentId, adapterKind: 'browser-dev' },
            producer: 'browser-test',
            operationWindow,
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
                  outputKey: 'live-inspect:timeline',
                  kind: 'LiveInspectArtifact',
                  value: artifact,
                },
              },
            }),
          )
        })

        await new Promise((resolve) => setTimeout(resolve, 30))
        const first = await Effect.runPromise(
          runCli([
            'live',
            'timeline',
            '--runId',
            'live-timeline-cli-cursor-first',
            '--target',
            targetRef,
            '--attachment',
            'browser:conn-1',
            '--limit',
            '1',
          ]),
        )
        expect(first.kind).toBe('result')
        if (first.kind !== 'result') throw new Error('expected first timeline result')
        expect(first.result.kind).toBe('LiveCommandResult')
        const firstArtifact = first.result.artifacts.find((artifact) => artifact.outputKey === first.result.primaryLiveOutputKey)
        const firstTimeline = (firstArtifact?.inline as any).facet.payload.timeline
        const firstCursor = firstTimeline.cursor.next
        expect(first.result.inputCoordinate).not.toHaveProperty('cursor')
        expect(firstTimeline.items.map((item: any) => item.label)).toEqual(['first-denied'])
        expect(firstCursor).toEqual(expect.stringMatching(/^ltc1\./))

        store.recordOperationEvent({ target, eventKind: 'operation.denied', label: 'second-denied', txnSeq: 2, opSeq: 1 })
        const continued = await Effect.runPromise(
          runCli([
            'live',
            'timeline',
            '--runId',
            'live-timeline-cli-cursor-continued',
            '--target',
            targetRef,
            '--attachment',
            'browser:conn-1',
            '--limit',
            '2',
            '--cursor',
            firstCursor,
          ]),
        )
        expect(continued.kind).toBe('result')
        if (continued.kind !== 'result') throw new Error('expected continued timeline result')
        expect(continued.result.kind).toBe('LiveCommandResult')
        const continuedArtifact = continued.result.artifacts.find((artifact) => artifact.outputKey === continued.result.primaryLiveOutputKey)
        const continuedTimeline = (continuedArtifact?.inline as any).facet.payload.timeline

        expect(continued.result.inputCoordinate).toMatchObject({ cursor: firstCursor })
        expect(cursorPayloads).toEqual([undefined, firstCursor])
        expect(continuedTimeline.items.map((item: any) => item.label)).toEqual(['second-denied'])
        expect(continuedTimeline.cursor.next).toEqual(expect.stringMatching(/^ltc1\./))
      } finally {
        ws.close()
        await daemon.stop()
      }
    })
  })

  it('advertises inspect route inputs in the derived schema mirror', () => {
    const live = CLI_COMMAND_SCHEMA.commands.find((command) => command.name === 'live')
    expect(live?.optionalInputs).toEqual(
      expect.arrayContaining(['target', 'attachment', 'path', 'field', 'kind', 'limit', 'cursor', 'from']),
    )
    expect(CLI_COMMAND_SCHEMA.liveCommandResult.forbiddenFields).toEqual(
      expect.arrayContaining(['primaryReportOutputKey', 'repairHints', 'nextRecommendedStage', 'verdict']),
    )
  })
})
