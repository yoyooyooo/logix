import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import net from 'node:net'

import {
  createLiveAttachmentRegistry,
  isLiveWireEnvelope,
  makeLiveEvidenceLease,
  makeLiveEvidenceGap,
  makeLiveRetainedOwnerSegmentFromWindow,
  makeLiveInspectGapArtifact,
  makeLiveSnapshotInspectArtifact,
  makeLiveTargetDetailInspectArtifact,
  type LiveAttachmentOffer,
  type LiveInspectSection,
  type LiveDaemonRetainedOwnerSegment,
  type LiveTargetCoordinate,
  type LiveTargetDescriptor,
} from '@logixjs/core/repo-internal/live-bridge-api'
import { WebSocketServer, type WebSocket } from 'ws'

import type { LiveDaemonIpcCommand, LiveDaemonIpcResponse } from './liveDaemonClient.js'
import { writeLiveDaemonOperatorSnapshot } from './liveDaemonOperatorSnapshot.js'
import { resolveLiveTransportPaths, type LiveTransportPaths } from './liveTransportPaths.js'

export interface LiveDaemonServerOptions {
  readonly stateDir?: string
  readonly host?: string
  readonly port?: number
}

interface BrowserConnectionRecord {
  readonly connectionId: string
  readonly attachmentIds: Set<string>
  readonly openedAt: number
}

interface PendingOperationRequest {
  readonly requestId: string
  readonly attachmentId: string
  readonly connectionId: string
  readonly operation: string
  readonly target: LiveTargetDescriptor
  readonly ws: WebSocket
  readonly resolve: (response: LiveDaemonIpcResponse) => void
  readonly timer: ReturnType<typeof setTimeout>
}

interface CachedLiveArtifact {
  readonly attachmentId: string
  readonly requestId: string
  readonly lineageRef: string
  readonly outputKey: string
  readonly kind: string
  readonly value: unknown
}

interface RetainedOwnerSegmentRecord {
  readonly ref: string
  readonly segment: LiveDaemonRetainedOwnerSegment
}

type OperationPayload = Record<string, unknown>

const toResponseLine = (response: LiveDaemonIpcResponse): string => `${JSON.stringify(response)}\n`

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

const isHostOfferPayload = (payload: unknown): payload is LiveAttachmentOffer => {
  if (!payload || typeof payload !== 'object') return false
  const x = payload as Partial<LiveAttachmentOffer>
  return typeof x.attachmentId === 'string' && typeof x.adapterKind === 'string' && Array.isArray(x.targets)
}

const parseTargetCoordinate = (raw: unknown): LiveTargetCoordinate | undefined => {
  if (typeof raw === 'string') {
    const match = /^runtime:([^/]+)\/module:([^/]+)\/instance:(.+)$/.exec(raw)
    if (!match) return undefined
    return { runtimeId: match[1]!, moduleId: match[2]!, instanceId: match[3]! }
  }
  if (!isRecord(raw)) return undefined
  const runtimeId = raw.runtimeId
  const moduleId = raw.moduleId
  const instanceId = raw.instanceId
  if (typeof runtimeId !== 'string' || typeof moduleId !== 'string' || typeof instanceId !== 'string') return undefined
  return { runtimeId, moduleId, instanceId }
}

const targetEquals = (left: LiveTargetCoordinate, right: LiveTargetCoordinate): boolean =>
  left.runtimeId === right.runtimeId && left.moduleId === right.moduleId && left.instanceId === right.instanceId

const safePathSegment = (value: string): string => value.replace(/[^a-zA-Z0-9._-]/g, '_')

const encodeRefComponent = (value: string): string => encodeURIComponent(value)

const makeLineageRef = (input: {
  readonly attachmentId: string
  readonly requestId: string
  readonly outputKey: string
  readonly captureId?: string
}): string =>
  [
    'live-artifact',
    `attachment=${encodeRefComponent(input.attachmentId)}`,
    `request=${encodeRefComponent(input.requestId)}`,
    `output=${encodeRefComponent(input.outputKey)}`,
    ...(input.captureId ? [`capture=${encodeRefComponent(input.captureId)}`] : []),
  ].join(':')

const makeRetainedSegmentRef = (input: {
  readonly attachmentId: string
  readonly segmentId: string
}): string =>
  [
    'retained-segment',
    `attachment=${encodeRefComponent(input.attachmentId)}`,
    `segment=${encodeRefComponent(input.segmentId)}`,
  ].join(':')

const withReasonCode = (value: unknown, reasonCode: string): ReadonlyArray<string> => {
  const current = isRecord(value) && Array.isArray(value.reasonCodes) ? value.reasonCodes : []
  return Array.from(new Set([...current.filter((item): item is string => typeof item === 'string'), reasonCode]))
}

const liveInspectOperations = new Set([
  'inspect.state',
  'inspect.actions',
  'inspect.events',
  'inspect.timeline',
  'inspect.fields',
  'inspect.fieldGraph',
  'inspect.fieldSummary',
  'inspect.summary',
])

const inspectSectionForOperation = (operation: string, payload: OperationPayload): LiveInspectSection => {
  switch (operation) {
    case 'inspect.state':
      return typeof payload.path === 'string' && payload.path.length > 0 ? 'state-path' : 'state'
    case 'inspect.actions':
      return 'actions'
    case 'inspect.events':
      return 'events'
    case 'inspect.timeline':
      return 'timeline'
    case 'inspect.fields':
      return 'fields'
    case 'inspect.fieldGraph':
      return 'field-graph'
    case 'inspect.fieldSummary':
      return 'field-summary'
    case 'inspect.summary':
      return 'summary'
    default:
      return 'summary'
  }
}

const sourceAuthorityForSection = (section: LiveInspectSection) =>
  section === 'actions'
    ? 'reflection' as const
    : section === 'fields' || section === 'field-graph' || section === 'field-summary'
      ? 'field-runtime' as const
      : 'runtime-live' as const

const ownerForSection = (section: LiveInspectSection) =>
  section === 'actions'
    ? 'reflection' as const
    : section === 'fields' || section === 'field-graph' || section === 'field-summary'
      ? 'field-runtime' as const
      : 'runtime-live' as const

export const createLiveDaemonServer = (options: LiveDaemonServerOptions = {}) => {
  const requestedPaths = resolveLiveTransportPaths({
    stateDir: options.stateDir,
    host: options.host,
    port: options.port,
  })
  const registry = createLiveAttachmentRegistry({ enabled: true })
  const attachmentStates = new Map<string, string>()
  const browserConnections = new Map<WebSocket, BrowserConnectionRecord>()
  const pendingOperations = new Map<string, PendingOperationRequest>()
  const artifactsByRef = new Map<string, CachedLiveArtifact>()
  const artifactAliases = new Map<string, Set<string>>()
  const retainedSegmentsByRef = new Map<string, RetainedOwnerSegmentRecord>()
  let wsServer: WebSocketServer | undefined
  let ipcServer: net.Server | undefined
  let paths = requestedPaths
  let connectionSeq = 0

  const statusData = () => ({
    state: 'ready',
    authority: 'core-owned-attachment',
    transport: { carrier: 'ipc', socketPath: paths.socketPath, health: 'ready' },
    websocket: { carrier: 'websocket', host: paths.host, port: paths.port, health: 'ready' },
    targets: registry.listTargets(),
    attachments: Array.from(attachmentStates.entries()).map(([attachmentId, state]) => ({ attachmentId, state })),
  })

  const addArtifactAlias = (alias: string | undefined, lineageRef: string) => {
    if (!alias) return
    const current = artifactAliases.get(alias) ?? new Set<string>()
    current.add(lineageRef)
    artifactAliases.set(alias, current)
  }

  const resolveExportArtifact = (from: string):
    | { readonly kind: 'found'; readonly artifact: CachedLiveArtifact }
    | { readonly kind: 'ambiguous'; readonly candidates: ReadonlyArray<string> }
    | { readonly kind: 'missing' } => {
    const direct = artifactsByRef.get(from)
    if (direct) return { kind: 'found', artifact: direct }
    const aliases = artifactAliases.get(from)
    if (!aliases || aliases.size === 0) return { kind: 'missing' }
    if (aliases.size > 1) return { kind: 'ambiguous', candidates: Array.from(aliases) }
    const lineageRef = Array.from(aliases)[0]!
    const artifact = artifactsByRef.get(lineageRef)
    return artifact ? { kind: 'found', artifact } : { kind: 'missing' }
  }

  const resolveRetainedSegment = (from: string): RetainedOwnerSegmentRecord | undefined =>
    retainedSegmentsByRef.get(from)

  const resolveOperationTarget = (
    payload: OperationPayload,
  ):
    | { readonly kind: 'selected'; readonly target: LiveTargetDescriptor; readonly ws: WebSocket; readonly connectionId: string }
    | { readonly kind: 'gap'; readonly gap: unknown } => {
    const requestedAttachmentId = typeof payload.attachmentId === 'string' ? payload.attachmentId : undefined
    const requestedTarget = parseTargetCoordinate(payload.target)
    const targets = registry.listTargets()
    const matches = targets.filter((target) => {
      if (requestedAttachmentId && target.attachmentId !== requestedAttachmentId) return false
      if (requestedTarget && !targetEquals(target, requestedTarget)) return false
      return true
    })

    if (matches.length === 0) {
      return {
        kind: 'gap',
        gap: makeLiveEvidenceGap({
          gapId: 'live:operation:no-target',
          code: 'no-runtime-attached',
          summary: 'No matching live target is attached.',
          severity: 'warning',
          ...(requestedTarget ? { target: requestedTarget } : null),
        }),
      }
    }

    if (matches.length > 1) {
      return {
        kind: 'gap',
        gap: {
          ...makeLiveEvidenceGap({
            gapId: 'live:operation:ambiguous-target',
            code: 'ambiguous-live-target',
            summary: 'Live target is ambiguous; specify attachmentId to select one browser attachment.',
            severity: 'warning',
            ...(requestedTarget ? { target: requestedTarget } : null),
          }),
          candidates: matches.map((target) => ({
            attachmentId: target.attachmentId,
            runtimeId: target.runtimeId,
            moduleId: target.moduleId,
            instanceId: target.instanceId,
            hostCoordinate: target.hostCoordinate,
          })),
        },
      }
    }

    const target = matches[0]!
    const entry = Array.from(browserConnections.entries()).find(([, record]) => record.attachmentIds.has(target.attachmentId))
    if (!entry) {
      return {
        kind: 'gap',
        gap: makeLiveEvidenceGap({
          gapId: 'live:operation:missing-connection',
          code: 'live-operation-unsupported-by-host',
          summary: 'Matching attachment has no active browser connection.',
          severity: 'info',
          target,
        }),
      }
    }
    return { kind: 'selected', target, ws: entry[0], connectionId: entry[1].connectionId }
  }

  const decorateAndCacheArtifact = (artifact: unknown, pending: PendingOperationRequest): unknown => {
    if (!isRecord(artifact) || typeof artifact.outputKey !== 'string' || typeof artifact.kind !== 'string') return artifact
    const value = artifact.value
    const captureId = isRecord(value) && typeof value.captureId === 'string' ? value.captureId : undefined
    const operationId = isRecord(value) && typeof value.operationId === 'string' ? value.operationId : undefined
    const lineageRef = makeLineageRef({
      attachmentId: pending.attachmentId,
      requestId: pending.requestId,
      outputKey: artifact.outputKey,
      ...(captureId ? { captureId } : null),
    })
    const currentArtifactRef = isRecord(value) && isRecord(value.artifactRef) ? value.artifactRef : {}
    const patchedValue = isRecord(value)
      ? {
          ...value,
          artifactRef: {
            ...currentArtifactRef,
            outputKey: artifact.outputKey,
            kind: artifact.kind,
            file: lineageRef,
            reasonCodes: withReasonCode(currentArtifactRef, 'live-daemon-lineage'),
          },
        }
      : value
    const patchedArtifact = {
      ...artifact,
      value: patchedValue,
    }
    artifactsByRef.set(lineageRef, {
      attachmentId: pending.attachmentId,
      requestId: pending.requestId,
      lineageRef,
      outputKey: artifact.outputKey,
      kind: artifact.kind,
      value: patchedValue,
    })
    addArtifactAlias(captureId, lineageRef)
    addArtifactAlias(captureId?.replace(/^capture:/, ''), lineageRef)
    addArtifactAlias(operationId, lineageRef)
    return patchedArtifact
  }

  const releasePendingOperation = (pending: PendingOperationRequest, code: string, summary: string): void => {
    clearTimeout(pending.timer)
    pendingOperations.delete(pending.requestId)
    pending.resolve({
      ok: true,
      data: {
        gap: makeLiveEvidenceGap({
          gapId: `live:${pending.requestId}:${code}`,
          code,
          summary,
          severity: 'warning',
          target: pending.target,
        }),
      },
    })
  }

  const releasePendingForConnection = (connectionId: string, attachmentIds: ReadonlySet<string>): void => {
    for (const pending of Array.from(pendingOperations.values())) {
      if (pending.connectionId !== connectionId && !attachmentIds.has(pending.attachmentId)) continue
      releasePendingOperation(
        pending,
        'carrier.target-closed',
        `Browser attachment closed before ${pending.operation} returned a response.`,
      )
    }
  }

  const handleCommand = async (command: LiveDaemonIpcCommand): Promise<LiveDaemonIpcResponse> => {
    switch (command.type) {
      case 'status':
        return { ok: true, data: statusData() }
      case 'targets':
        return { ok: true, data: { targets: registry.listTargets(), tree: command.tree } as any }
      case 'operation':
        if (command.operation === 'inspect.targetDetail') {
          const payload = isRecord(command.payload) ? command.payload : {}
          const selected = resolveOperationTarget(payload)
          if (selected.kind === 'gap') return { ok: true, data: { gap: selected.gap } }
          const artifact = {
            outputKey: 'live-inspect:target-detail',
            kind: 'LiveInspectArtifact',
            value: makeLiveTargetDetailInspectArtifact({
              target: selected.target,
              producer: 'logix-live-daemon',
              hostContext: selected.target.hostCoordinate,
              availableSections: [
                'target-detail',
                'state',
                'state-path',
                'actions',
                'events',
                'timeline',
                'fields',
                'field-graph',
                'field-summary',
                'summary',
                'snapshot',
              ],
            }),
          }
          return { ok: true, data: { artifact: decorateAndCacheArtifact(artifact, {
            requestId: `daemon:${Date.now()}`,
            attachmentId: selected.target.attachmentId,
            connectionId: selected.connectionId,
            operation: command.operation,
            target: selected.target,
            ws: selected.ws,
            resolve: () => undefined,
            timer: setTimeout(() => undefined, 0),
          }) as any } as any }
        }
        if (command.operation === 'snapshot.read') {
          const payload = isRecord(command.payload) ? command.payload : {}
          const selected = resolveOperationTarget(payload)
          if (selected.kind === 'gap') return { ok: true, data: { gap: selected.gap } }
          const artifact = {
            outputKey: 'live-inspect:snapshot',
            kind: 'LiveInspectArtifact',
            value: makeLiveSnapshotInspectArtifact({
              target: selected.target,
              producer: 'logix-live-daemon',
              facetRefs: [
                { section: 'target-detail', outputKey: 'live-inspect:target-detail', kind: 'LiveInspectArtifact' },
                { section: 'state', outputKey: 'live-inspect:state', kind: 'LiveInspectArtifact' },
                { section: 'actions', outputKey: 'live-inspect:actions', kind: 'LiveInspectArtifact' },
              ],
            }),
          }
          return { ok: true, data: { artifact: decorateAndCacheArtifact(artifact, {
            requestId: `daemon:${Date.now()}`,
            attachmentId: selected.target.attachmentId,
            connectionId: selected.connectionId,
            operation: command.operation,
            target: selected.target,
            ws: selected.ws,
            resolve: () => undefined,
            timer: setTimeout(() => undefined, 0),
          }) as any } as any }
        }
        if (
          command.operation === 'capture.eventWindow' ||
          command.operation === 'wait.condition' ||
          command.operation === 'dispatch.declaredAction' ||
          command.operation === 'profile.runtimeSummary' ||
          liveInspectOperations.has(command.operation)
        ) {
          const payload = isRecord(command.payload) ? command.payload : {}
          const selected = resolveOperationTarget(payload)
          if (selected.kind === 'gap') return { ok: true, data: { gap: selected.gap } }
          const requestId = `live:req:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`
          return await new Promise<LiveDaemonIpcResponse>((resolve) => {
            const timer = setTimeout(() => {
              pendingOperations.delete(requestId)
              if (liveInspectOperations.has(command.operation)) {
                const section = inspectSectionForOperation(command.operation, payload)
                resolve({
                  ok: true,
                  data: {
                    artifact: {
                      outputKey: `live-inspect:${section}`,
                      kind: 'LiveInspectArtifact',
                      value: makeLiveInspectGapArtifact({
                        section,
                        target: selected.target,
                        sourceAuthority: sourceAuthorityForSection(section),
                        producer: 'logix-live-daemon',
                        gapCode:
                          section === 'events'
                            ? 'missing-event-producer'
                            : section === 'timeline'
                              ? 'missing-operation-window'
                              : section === 'fields' || section === 'field-graph'
                                ? 'missing-field-owner-projection'
                                : section === 'field-summary'
                                  ? 'missing-latest-field-summary'
                                  : 'live-operation-timeout',
                        summary: `Browser attachment did not answer ${command.operation} in time.`,
                        owner: ownerForSection(section),
                        reopenBar: 'reopen when owner projection is available from the attached runtime',
                      }),
                    },
                  } as any,
                })
                return
              }
              resolve({
                ok: true,
                data: {
                  gap: makeLiveEvidenceGap({
                    gapId: `live:${requestId}:timeout`,
                    code: 'live-operation-timeout',
                    summary: `Browser attachment did not answer ${command.operation} in time.`,
                    severity: 'warning',
                  }),
                },
              })
            }, 1000)
            pendingOperations.set(requestId, {
              requestId,
              attachmentId: selected.target.attachmentId,
              connectionId: selected.connectionId,
              operation: command.operation,
              target: selected.target,
              ws: selected.ws,
              resolve,
              timer,
            })
            selected.ws.send(
              JSON.stringify({
                schemaVersion: 1,
                id: requestId,
                role: 'daemon',
                type: 'live.operation.request',
                payload: {
                  ...payload,
                  requestId,
                  operation: command.operation,
                  attachmentId: selected.target.attachmentId,
                  target: selected.target,
                },
              }),
            )
          })
        }
        if (command.operation === 'evidence.retainedSegment.drain') {
          const payload = isRecord(command.payload) ? command.payload : {}
          const requestedTarget = parseTargetCoordinate(payload.target)
          return {
            ok: true,
            data: {
              gap: makeLiveEvidenceGap({
                gapId: 'live:evidence-retained-segment:drain-bounded',
                code: 'retained-segment-drain-bounded',
                summary: 'Retained owner segment drain is bounded and unavailable for this request.',
                severity: 'warning',
                ...(requestedTarget ? { target: requestedTarget } : null),
              }),
            },
          }
        }
        if (command.operation === 'evidence.retainedSegment.open') {
          const payload = isRecord(command.payload) ? command.payload : {}
          const selected = resolveOperationTarget(payload)
          if (selected.kind === 'gap') return { ok: true, data: { gap: selected.gap } }
          const limit = typeof payload.limit === 'number' && Number.isFinite(payload.limit) ? Math.max(1, Math.floor(payload.limit)) : 16
          const requestId = `live:retained-segment:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`
          const operationResponse = await new Promise<LiveDaemonIpcResponse>((resolve) => {
            const timer = setTimeout(() => {
              pendingOperations.delete(requestId)
              resolve({
                ok: true,
                data: {
                  gap: makeLiveEvidenceGap({
                    gapId: `live:${requestId}:timeout`,
                    code: 'retained-segment-drain-bounded',
                    summary: 'Browser attachment did not provide an owner operation window for retained segment drain.',
                    severity: 'warning',
                    target: selected.target,
                  }),
                },
              })
            }, 1000)
            pendingOperations.set(requestId, {
              requestId,
              attachmentId: selected.target.attachmentId,
              connectionId: selected.connectionId,
              operation: 'inspect.events',
              target: selected.target,
              ws: selected.ws,
              resolve,
              timer,
            })
            selected.ws.send(
              JSON.stringify({
                schemaVersion: 1,
                id: requestId,
                role: 'daemon',
                type: 'live.operation.request',
                payload: {
                  target: selected.target,
                  attachmentId: selected.target.attachmentId,
                  requestId,
                  operation: 'inspect.events',
                  limit,
                },
              }),
            )
          })
          if (!operationResponse.ok || !operationResponse.data.artifact) return operationResponse
          const operationWindow = isRecord(operationResponse.data.artifact.value) &&
            isRecord(operationResponse.data.artifact.value.facet) &&
            isRecord(operationResponse.data.artifact.value.facet.payload)
              ? operationResponse.data.artifact.value.facet.payload.operationWindow
              : undefined
          if (!isRecord(operationWindow) || operationWindow.kind !== 'live.operation.window') {
            return {
              ok: true,
              data: {
                gap: makeLiveEvidenceGap({
                  gapId: `live:${requestId}:missing-operation-window`,
                  code: 'missing-operation-window',
                  summary: 'Retained segment lease requires an owner-backed operation window.',
                  severity: 'warning',
                  target: selected.target,
                }),
              },
            }
          }
          const segmentId = `segment:${requestId}`
          const lease = makeLiveEvidenceLease({
            leaseId: `lease:${requestId}`,
            workspace: typeof payload.workspace === 'string' ? payload.workspace : paths.stateDir,
            attachmentId: selected.target.attachmentId,
            target: selected.target,
            purpose: payload.purpose === 'workbench-session' ||
              payload.purpose === 'qa-recording' ||
              payload.purpose === 'maintenance-debug'
              ? payload.purpose
              : 'export-evidence',
            budget: { maxEvents: limit, maxInlineBytes: typeof payload.maxBytes === 'number' ? payload.maxBytes : 8192 },
            redactionPolicy: { policyRef: typeof payload.redactionPolicyRef === 'string' ? payload.redactionPolicyRef : 'redaction:default' },
            retentionPolicy: {
              ttlMs: typeof payload.ttlMs === 'number' ? payload.ttlMs : 30_000,
              maxBytes: typeof payload.maxBytes === 'number' ? payload.maxBytes : 8192,
              maxEvents: limit,
              workspacePartition: typeof payload.workspace === 'string' ? payload.workspace : paths.stateDir,
            },
            consumerIdentity: {
              actorId: typeof payload.consumer === 'string' ? payload.consumer : 'unknown-consumer',
              kind: 'cli',
            },
            createdAt: Date.now(),
          })
          const segment = makeLiveRetainedOwnerSegmentFromWindow({
            segmentId,
            operationWindow: operationWindow as any,
            lease,
          })
          const retainedSegmentRef = makeRetainedSegmentRef({ attachmentId: selected.target.attachmentId, segmentId })
          retainedSegmentsByRef.set(retainedSegmentRef, { ref: retainedSegmentRef, segment })
          return {
            ok: true,
            data: {
              artifact: {
                outputKey: 'live-retained-segment',
                kind: 'CanonicalEvidencePackage',
                value: {
                  retainedSegmentRef,
                  segment,
                },
              },
            },
          }
        }
        if (command.operation === 'export.evidence') {
          const from = (command.payload as { readonly from?: string } | undefined)?.from ?? 'unknown'
          const dir = path.join(paths.stateDir, 'exports', safePathSegment(from))
          const resolvedArtifact = resolveExportArtifact(from)
          const retainedSegment = resolveRetainedSegment(from)
          const gap =
            retainedSegment
              ? undefined
              : resolvedArtifact.kind === 'ambiguous'
              ? {
                  ...makeLiveEvidenceGap({
                    gapId: `live:export:${from}:ambiguous`,
                    code: 'ambiguous-live-artifact-ref',
                    summary: 'Live artifact ref is ambiguous; export by the daemon lineage ref returned in artifactRef.file.',
                    severity: 'warning',
                  }),
                  candidates: resolvedArtifact.candidates,
                }
              : makeLiveEvidenceGap({
                  gapId: `live:export:${from}`,
                  code: 'live-operation-unsupported-by-host',
                  summary: 'No matching live artifact is cached for export.',
                  severity: 'info',
                })
          const manifest = {
            kind: 'CanonicalEvidencePackage',
            packageId: `live-evidence:${from}`,
            artifacts: retainedSegment
              ? [
                  {
                    outputKey: 'live-retained-segment',
                    kind: 'CanonicalEvidencePackage',
                  },
                ]
              : resolvedArtifact.kind === 'found'
              ? [
                  {
                    outputKey: resolvedArtifact.artifact.outputKey,
                    kind: resolvedArtifact.artifact.kind,
                  },
                ]
              : [
                  {
                    outputKey: 'liveGap',
                    kind: 'EvidenceGap',
                  },
                ],
            events: retainedSegment
              ? [retainedSegment.segment]
              : resolvedArtifact.kind === 'found' ? [resolvedArtifact.artifact.value] : [gap],
            ...(retainedSegment
              ? {
                  retainedSegments: [
                    {
                      ref: retainedSegment.ref,
                      target: retainedSegment.segment.target,
                      attachmentId: retainedSegment.segment.attachmentId,
                      startWatermark: retainedSegment.segment.startWatermark,
                      endWatermark: retainedSegment.segment.endWatermark,
                      leaseProvenance: retainedSegment.segment.leaseProvenance,
                    },
                  ],
                }
              : null),
          }
          await mkdir(dir, { recursive: true })
          await writeFile(path.join(dir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
          return {
            ok: true,
            data: {
              packageDir: dir,
              package: manifest,
            },
          }
        }
        return {
          ok: true,
          data: {
            gap: makeLiveEvidenceGap({
              gapId: `live:${command.operation}:unsupported`,
              code: 'live-operation-unsupported-by-host',
              summary: `Live operation ${command.operation} is not supported by the connected browser adapter.`,
              severity: 'info',
            }),
          },
        }
      case 'stop':
        queueMicrotask(() => {
          void instance.stop()
        })
        return { ok: true, data: { state: 'stopping', authority: 'core-owned-attachment' } }
    }
  }

  const instance = {
    get paths(): LiveTransportPaths {
      return paths
    },
    get port(): number {
      return paths.port
    },
    start: async () => {
      await mkdir(paths.stateDir, { recursive: true })
      await rm(paths.socketPath, { force: true })

      wsServer = new WebSocketServer({ host: paths.host, port: paths.port })
      await new Promise<void>((resolve, reject) => {
        wsServer!.once('listening', resolve)
        wsServer!.once('error', reject)
      })
      const address = wsServer.address()
      const actualPort = typeof address === 'object' && address ? address.port : paths.port
      paths = resolveLiveTransportPaths({ ...paths, port: actualPort })

      wsServer.on('connection', (ws) => {
        connectionSeq += 1
        const record: BrowserConnectionRecord = {
          connectionId: `conn:${connectionSeq}`,
          attachmentIds: new Set(),
          openedAt: Date.now(),
        }
        browserConnections.set(ws, record)
        ws.on('message', (raw) => {
          let message: unknown
          try {
            message = JSON.parse(raw.toString())
          } catch {
            return
          }
          if (!isLiveWireEnvelope(message)) return
          if (message.type === 'live.operation.response') {
            const payload = message.payload as {
              readonly requestId?: string
              readonly attachmentId?: string
              readonly ok?: boolean
              readonly artifact?: unknown
              readonly gap?: unknown
            }
            if (!payload.requestId) return
            const pending = pendingOperations.get(payload.requestId)
            if (!pending) return
            if (pending.ws !== ws || payload.attachmentId !== pending.attachmentId) return
            clearTimeout(pending.timer)
            pendingOperations.delete(payload.requestId)
            const artifact = payload.ok ? decorateAndCacheArtifact(payload.artifact, pending) : payload.artifact
            pending.resolve(
              payload.ok
                ? {
                    ok: true,
                    data: {
                      artifact,
                    } as any,
                  }
                : {
                    ok: true,
                    data: {
                      gap: payload.gap,
                    },
                  },
            )
            return
          }
          if (message.type !== 'host.offer') return
          if (!isHostOfferPayload(message.payload)) return
          const attachmentId =
            message.payload.attachmentId === 'browser:dev-live' || attachmentStates.has(message.payload.attachmentId)
              ? `${message.payload.attachmentId}:${record.connectionId}`
              : message.payload.attachmentId
          const offer = {
            ...message.payload,
            attachmentId,
            transport: {
              carrier: 'websocket' as const,
              connectionId: message.payload.transport?.connectionId ?? record.connectionId,
              health: 'ready' as const,
            },
          }
          registry.submitAttachmentOffer(offer)
          record.attachmentIds.add(offer.attachmentId)
          attachmentStates.set(offer.attachmentId, 'attached')
        })
        ws.on('close', () => {
          releasePendingForConnection(record.connectionId, record.attachmentIds)
          for (const attachmentId of record.attachmentIds) {
            registry.markTerminal(attachmentId, 'disconnected')
            attachmentStates.set(attachmentId, 'disconnected')
          }
          browserConnections.delete(ws)
        })
      })

      ipcServer = net.createServer((socket) => {
        let buffer = ''
        const endSocket = (response: LiveDaemonIpcResponse) => {
          if (socket.destroyed) return
          socket.end(toResponseLine(response), () => undefined)
        }
        socket.on('error', () => undefined)
        socket.on('data', (chunk) => {
          buffer += chunk.toString('utf8')
          const lineEnd = buffer.indexOf('\n')
          if (lineEnd < 0) return
          const line = buffer.slice(0, lineEnd)
          void (async () => {
            try {
              const response = await handleCommand(JSON.parse(line) as LiveDaemonIpcCommand)
              endSocket(response)
            } catch {
              endSocket({
                ok: false,
                error: { code: 'live-daemon-invalid-request', message: 'Live daemon received invalid request.' },
              })
            }
          })()
        })
      })
      await new Promise<void>((resolve, reject) => {
        ipcServer!.once('listening', resolve)
        ipcServer!.once('error', reject)
        ipcServer!.listen(paths.socketPath)
      })

      await writeLiveDaemonOperatorSnapshot(paths, {
        pid: process.pid,
        startedAt: Date.now(),
        logPath: path.join(paths.stateDir, 'daemon.log'),
      })
      return instance
    },
    stop: async () => {
      for (const ws of browserConnections.keys()) {
        ws.close()
      }
      await Promise.all([
        wsServer
          ? new Promise<void>((resolve) => {
              wsServer!.close(() => resolve())
            })
          : Promise.resolve(),
        ipcServer
          ? new Promise<void>((resolve) => {
              ipcServer!.close(() => resolve())
            })
          : Promise.resolve(),
      ])
      await rm(paths.metadataPath, { force: true })
      await rm(paths.socketPath, { force: true })
    },
  }

  return instance
}
