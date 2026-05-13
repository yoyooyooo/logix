import { describe, expect, it } from 'vitest'
import { Schema } from 'effect'
import * as CoreReflection from '@logixjs/core/repo-internal/reflection-api'

import {
  createLiveOperationLedgerStore,
  runLiveOperation,
  makeLiveTargetCoordinate,
  type LiveOperationRequest,
} from '../../../src/internal/live-bridge-api.js'
import * as Logix from '../../../src/index.js'

const target = makeLiveTargetCoordinate({ runtimeId: 'runtime-1', moduleId: 'module-1', instanceId: 'instance-1' })

type LiveFacetWithArtifactRef = {
  readonly kind: 'operation.completed' | 'live.capture'
  readonly artifactRef?: { readonly outputKey: string; readonly kind: string }
}

const request = (operationKind: LiveOperationRequest['operationKind'], overrides: Partial<LiveOperationRequest> = {}): LiveOperationRequest => ({
  actorId: 'agent',
  operationKind,
  target,
  budget: { maxEvents: 16, maxInlineBytes: 1024, timeoutMs: 5000 },
  redactionPolicyRef: 'default',
  ...overrides,
})

const makeManifest = () => {
  const Module = Logix.Module.make('module-1', {
    state: Schema.Struct({ count: Schema.Number }),
    actions: { increment: Schema.Void },
    reducers: {},
  })
  return CoreReflection.extractRuntimeReflectionManifest(
    Logix.Program.make(Module, { initial: { count: 0 }, logics: [] }),
    { programId: 'live-operations.program' },
  )
}

describe('live P1 operations', () => {
  it('routes target discovery through a topology result facet', () => {
    const result = runLiveOperation(request('target.discover'), {
      authorizedTargets: [target],
      targets: [target],
    })

    expect(result.kind).toBe('operation.completed')
    expect((result as LiveFacetWithArtifactRef).artifactRef?.outputKey).toBe('live-targets')
  })

  it('routes event-window capture, snapshot, wait, export and profile as bounded evidence facets', () => {
    const kinds: ReadonlyArray<LiveOperationRequest['operationKind']> = [
      'capture.eventWindow',
      'snapshot.read',
      'wait.condition',
      'evidence.export',
      'profile.runtimeSummary',
    ]

    for (const kind of kinds) {
      const result = runLiveOperation(request(kind), { authorizedTargets: [target] })
      expect(result.kind === 'live.capture' || result.kind === 'operation.completed').toBe(true)
      expect(JSON.stringify(result)).toMatch(/maxEvents|maxInlineBytes|live-/)
      expect(JSON.stringify(result)).not.toMatch(/verdict|repairHints|nextRecommendedStage|passed/)
    }
  })

  it('records admitted operation facets as ledger events without replacing facet projections', () => {
    const ledgerStore = createLiveOperationLedgerStore({ enabled: true })
    const result = runLiveOperation(request('target.discover'), {
      authorizedTargets: [target],
      targets: [target],
      attachmentId: 'attachment-op',
      ledgerStore,
    })
    const window = ledgerStore.readWindow({ target })

    expect(result.kind).toBe('operation.completed')
    expect(window.events.map((event) => event.eventKind)).toEqual(['operation.accepted', 'operation.completed'])
    expect(window.events[0]).toMatchObject({
      attachmentId: 'attachment-op',
      label: 'target.discover',
      sourceAuthority: 'runtime-live',
    })
  })

  it('records capture.eventWindow as a ledger capture event with a window artifact ref', () => {
    const ledgerStore = createLiveOperationLedgerStore({ enabled: true })
    const result = runLiveOperation(request('capture.eventWindow'), {
      authorizedTargets: [target],
      ledgerStore,
    })
    const window = ledgerStore.readWindow({ target, eventKinds: ['capture.eventWindow'] })

    expect(result.kind).toBe('live.capture')
    expect((result as LiveFacetWithArtifactRef).artifactRef).toEqual({ outputKey: 'live-capture:event-window', kind: 'LiveCapture' })
    expect(window.events).toEqual([
      expect.objectContaining({
        eventKind: 'capture.eventWindow',
        artifactRef: { outputKey: 'live-capture:event-window', kind: 'LiveCapture' },
      }),
    ])
  })

  it('emits accepted and completed facets for admitted declared action dispatch', () => {
    const manifest = makeManifest()
    const result = runLiveOperation(
      request('dispatch.declaredAction', {
        permissionScope: 'debug:dispatch',
        manifestDigest: manifest.digest,
        actionTag: 'increment',
        validatorAvailable: true,
      }),
      {
        authorizedTargets: [target],
        reflectionManifest: manifest,
      },
    )

    expect(result.kind).toBe('operation.completed')
    expect((result as LiveFacetWithArtifactRef).artifactRef?.outputKey).toBe('live-operation:dispatch.declaredAction')
  })

  it('emits failed facets only after admission succeeds', () => {
    const manifest = makeManifest()
    const result = runLiveOperation(
      request('dispatch.declaredAction', {
        permissionScope: 'debug:dispatch',
        manifestDigest: manifest.digest,
        actionTag: 'increment',
        validatorAvailable: true,
      }),
      {
        authorizedTargets: [target],
        reflectionManifest: manifest,
        failAfterAdmission: 'handler-failed',
      },
    )

    expect(result).toMatchObject({
      kind: 'operation.failed',
      boundedCause: 'handler-failed',
    })
  })
})
