import { Cause, Effect, Exit, ServiceMap } from 'effect'
import {
  type LiveAdmissionDenialReason,
  makeLiveInspectGapArtifact,
  makeLiveInspectGapsArtifact,
  makeLiveOperationCompletedFacet,
  makeLiveOperationDeniedFacet,
  makeLiveOperationFailedFacet,
  makeLiveCaptureFacet,
  makeLiveEvidenceGap,
  makeLiveStateInspectArtifact,
  makeLiveTargetCoordinate,
  decodeLiveTimelineCursorToken,
  type LiveBindingHeader,
  type LiveLedgerRecordOperationInput,
  type LiveInspectSection,
  type LiveOperationWindow,
  type LiveOperationWindowRequest,
} from '@logixjs/core/repo-internal/live-bridge-api'

export interface LogixLiveBrowserAdapterOptions {
  readonly host?: string
  readonly port?: number
  readonly tabId?: string
  readonly projectId?: string
  readonly url?: string
}

export interface LogixLiveBrowserAdapterHandle {
  readonly refresh: () => void
  readonly close: () => void
}

interface LogixLiveBindingSnapshotSource {
  readonly listRuntimeBindings?: () => ReadonlyArray<{
    readonly ownerId: string
    readonly runtimeInstanceId: string
    readonly reflectionBinding?: { readonly manifestDigest: string }
    readonly targetCoordinate?: {
      readonly runtimeId: string
      readonly moduleId: string
      readonly instanceId: string
    }
  }>
  readonly resolveRuntimeBinding?: (target: {
    readonly runtimeId: string
    readonly moduleId: string
    readonly instanceId: string
  }) => {
    readonly ownerId: string
    readonly runtime: {
      readonly runCallback: <A, E>(
        effect: Effect.Effect<A, E, any>,
        options: { readonly onExit: (exit: Exit.Exit<A, E>) => void },
      ) => unknown
    }
    readonly moduleRuntime?: {
      readonly getState: Effect.Effect<unknown, unknown, any>
      readonly dispatch: (action: unknown) => Effect.Effect<void, unknown, any>
    }
    readonly reflectionBinding?: { readonly manifestDigest: string }
    readonly projectActions?: (input: {
      readonly target: {
        readonly runtimeId: string
        readonly moduleId: string
        readonly instanceId: string
        readonly attachmentId: string
        readonly adapterKind: 'browser-dev'
      }
      readonly producer: string
      readonly maxActions?: number
    }) => unknown
    readonly projectFinalFields?: (input: {
      readonly target: {
        readonly runtimeId: string
        readonly moduleId: string
        readonly instanceId: string
        readonly attachmentId: string
        readonly adapterKind: 'browser-dev'
      }
      readonly producer: string
      readonly budget?: { readonly maxEvents: number; readonly maxInlineBytes: number }
    }) => unknown
    readonly projectFieldGraph?: (input: {
      readonly target: {
        readonly runtimeId: string
        readonly moduleId: string
        readonly instanceId: string
        readonly attachmentId: string
        readonly adapterKind: 'browser-dev'
      }
      readonly producer: string
      readonly budget?: { readonly maxEvents: number; readonly maxInlineBytes: number }
    }) => unknown
    readonly projectFieldSummary?: (input: {
      readonly target: {
        readonly runtimeId: string
        readonly moduleId: string
        readonly instanceId: string
        readonly attachmentId: string
        readonly adapterKind: 'browser-dev'
      }
      readonly producer: string
      readonly budget?: { readonly maxEvents: number; readonly maxInlineBytes: number }
    }) => unknown
    readonly projectTimeline?: (input: {
      readonly target: {
        readonly runtimeId: string
        readonly moduleId: string
        readonly instanceId: string
        readonly attachmentId: string
        readonly adapterKind: 'browser-dev'
      }
      readonly producer: string
      readonly operationWindow: LiveOperationWindow
      readonly fieldFilter?: { readonly fieldPath: string }
      readonly budget?: { readonly maxEvents: number; readonly maxInlineBytes: number }
    }) => unknown
    readonly projectSummary?: (input: {
      readonly target: {
        readonly runtimeId: string
        readonly moduleId: string
        readonly instanceId: string
        readonly attachmentId: string
        readonly adapterKind: 'browser-dev'
      }
      readonly producer: string
      readonly operationWindow: LiveOperationWindow
      readonly budget?: { readonly maxEvents: number; readonly maxInlineBytes: number }
    }) => unknown
    readonly readOperationWindow?: (request: LiveOperationWindowRequest) => LiveOperationWindow | undefined
    readonly recordOperationEvent?: (input: LiveLedgerRecordOperationInput) => unknown
    readonly admitDispatch?: (request: LiveDispatchAdmissionRequest) => LiveDispatchAdmissionResult
    readonly targetCoordinate: {
      readonly runtimeId: string
      readonly moduleId: string
      readonly instanceId: string
    }
  } | undefined
}

interface LiveDispatchAdmissionRequest {
  readonly actorId: string
  readonly operationKind: 'dispatch.declaredAction'
  readonly target: {
    readonly runtimeId: string
    readonly moduleId: string
    readonly instanceId: string
  }
  readonly permissionScope?: string
  readonly manifestDigest?: string
  readonly actionTag?: string
  readonly payloadSchemaRef?: string
  readonly validatorAvailable?: boolean
  readonly budget: { readonly maxEvents: number; readonly maxInlineBytes: number }
  readonly redactionPolicyRef: string
}

type LiveDispatchAdmissionResult =
  | {
      readonly ok: true
      readonly request: {
        readonly manifestDigest?: string
        readonly actionTag?: string
        readonly payloadSchemaRef?: string
        readonly validatorAvailable?: boolean
      }
    }
  | {
      readonly ok: false
      readonly reason: string
      readonly binding?: unknown
      readonly request: {
        readonly manifestDigest?: string
        readonly actionTag?: string
        readonly payloadSchemaRef?: string
        readonly validatorAvailable?: boolean
      }
    }

const asLiveAdmissionDenialReason = (reason: string): LiveAdmissionDenialReason =>
  reason === 'missing-live-manifest-binding' ||
  reason === 'unknown-live-manifest-binding' ||
  reason === 'stale-manifest' ||
  reason === 'digest-mismatch' ||
  reason === 'payload-schema-digest-mismatch' ||
  reason === 'unavailable-action-contract' ||
  reason === 'unauthorized-target' ||
  reason === 'missing-validator' ||
  reason === 'unsupported-operation' ||
  reason === 'terminal-attachment' ||
  reason === 'bridge-disabled'
    ? reason
    : 'unsupported-operation'

const installedKey = Symbol.for('@logixjs/react/dev-live-browser-adapter')
const optionsKey = Symbol.for('@logixjs/react/dev-live-browser-adapter-options')
const lifecycleCarrierKey = Symbol.for('@logixjs/react/dev-lifecycle-carrier')

const getGlobalStore = (): Record<PropertyKey, unknown> => globalThis as unknown as Record<PropertyKey, unknown>

const isBrowserDev = (): boolean =>
  typeof window !== 'undefined' && typeof WebSocket !== 'undefined' && (typeof process === 'undefined' || process.env.NODE_ENV !== 'production')

const makeAttachmentId = (options: LogixLiveBrowserAdapterOptions): string =>
  options.tabId ? `browser:${options.tabId}` : 'browser:dev-live'

const envOptions = (): LogixLiveBrowserAdapterOptions => {
  const env = (import.meta as ImportMeta & {
    readonly env?: {
      readonly VITE_LOGIX_LIVE_HOST?: string
      readonly VITE_LOGIX_LIVE_PORT?: string
      readonly VITE_LOGIX_LIVE_PROJECT_ID?: string
    }
  }).env
  const rawPort = env?.VITE_LOGIX_LIVE_PORT
  const port = rawPort === undefined ? undefined : Number(rawPort)
  return {
    ...(env?.VITE_LOGIX_LIVE_HOST ? { host: env.VITE_LOGIX_LIVE_HOST } : null),
    ...(Number.isFinite(port) ? { port } : null),
    ...(env?.VITE_LOGIX_LIVE_PROJECT_ID ? { projectId: env.VITE_LOGIX_LIVE_PROJECT_ID } : null),
  }
}

const getLifecycleCarrier = (): LogixLiveBindingSnapshotSource | undefined => {
  const value = getGlobalStore()[lifecycleCarrierKey]
  return value && typeof value === 'object' ? (value as LogixLiveBindingSnapshotSource) : undefined
}

const boundedFailureSummary = (cause: Cause.Cause<unknown>, fallback: string): string => {
  const summary = Cause.pretty(cause)
  return summary.length > 0 ? summary.slice(0, 200) : fallback
}

const isTargetCoordinate = (value: unknown): value is {
  readonly runtimeId: string
  readonly moduleId: string
  readonly instanceId: string
} =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as any).runtimeId === 'string' &&
  typeof (value as any).moduleId === 'string' &&
  typeof (value as any).instanceId === 'string'

const inspectSectionForOperation = (operation: string, payload: unknown): LiveInspectSection => {
  if (operation === 'inspect.state') {
    return typeof (payload as any)?.path === 'string' && (payload as any).path.length > 0 ? 'state-path' : 'state'
  }
  if (operation === 'inspect.actions') return 'actions'
  if (operation === 'inspect.events') return 'events'
  if (operation === 'inspect.timeline') return 'timeline'
  if (operation === 'inspect.fields') return 'fields'
  if (operation === 'inspect.fieldGraph') return 'field-graph'
  if (operation === 'inspect.fieldSummary') return 'field-summary'
  if (operation === 'inspect.summary') return 'summary'
  return 'target-detail'
}

const isInspectOperation = (operation: unknown): operation is string =>
  typeof operation === 'string' && operation.startsWith('inspect.')

const isLiveOperationWindow = (value: unknown): value is LiveOperationWindow =>
  typeof value === 'object' &&
  value !== null &&
  (value as any).kind === 'live.operation.window' &&
  (value as any).schemaVersion === 'live-operation-window.v1' &&
  Array.isArray((value as any).events)

const operationWindowRequestFromPayload = (
  target: {
    readonly runtimeId: string
    readonly moduleId: string
    readonly instanceId: string
  },
  payload: any,
): LiveOperationWindowRequest => ({
  target: makeLiveTargetCoordinate(target),
  ...(typeof payload?.attachmentId === 'string' ? { attachmentId: payload.attachmentId } : null),
  ...(typeof payload?.limit === 'number' ? { limit: payload.limit } : null),
  ...(typeof payload?.cursor === 'string'
    ? (() => {
        const certificate = decodeLiveTimelineCursorToken(payload.cursor)
        return certificate ? { cursor: certificate.runtimeResumeWatermark } : null
      })()
    : payload?.cursor && typeof payload.cursor === 'object'
      ? { cursor: payload.cursor }
      : null),
  ...(payload?.budget && typeof payload.budget === 'object' ? { budget: payload.budget } : null),
  ...(Array.isArray(payload?.eventKinds)
    ? { eventKinds: payload.eventKinds }
    : payload?.kind === 'diagnostic' || payload?.kind === 'process'
      ? { eventKinds: [payload.kind] }
      : null),
})

const isOnlyMissingOperationWindow = (window: LiveOperationWindow): boolean =>
  window.events.length === 0 &&
  window.gaps.length > 0 &&
  window.gaps.every((gap) => gap.code === 'missing-operation-window')

const makeBrowserOperationWindowInspectArtifact = (input: {
  readonly target: {
    readonly runtimeId: string
    readonly moduleId: string
    readonly instanceId: string
    readonly attachmentId: string
    readonly adapterKind: 'browser-dev'
  }
  readonly operationWindow: LiveOperationWindow
}) => ({
  kind: 'live.inspect.artifact',
  section: 'events',
  facet: {
    kind: 'live.inspect.facet',
    view: 'events',
    target: input.target,
    sourceAuthority: 'runtime-live',
    producer: '@logixjs/react/dev-live-browser-adapter',
    payload: {
      schemaVersion: 'live-inspect.v1',
      generatedBy: '@logixjs/react/dev-live-browser-adapter',
      operationWindow: input.operationWindow,
    },
    budget: input.operationWindow.budget.request ?? { maxEvents: input.operationWindow.limit, maxInlineBytes: input.operationWindow.budget.inlineBytes },
    gaps: input.operationWindow.gaps,
  },
})

const budgetFromPayload = (payload: unknown): { readonly maxEvents: number; readonly maxInlineBytes: number } | undefined => {
  const budget = (payload as any)?.budget
  return budget && typeof budget === 'object' ? budget : undefined
}

const defaultOperationBudget = { maxEvents: 16, maxInlineBytes: 1024 } as const

const profileBudgetFromPayload = (payload: unknown) =>
  budgetFromPayload(payload) ?? defaultOperationBudget

const bindingFromAdmission = (
  request: LiveDispatchAdmissionResult['request'],
  status: LiveBindingHeader['bindingStatus'],
): LiveBindingHeader | undefined => {
  if (!request.manifestDigest && !request.actionTag && !request.payloadSchemaRef && request.validatorAvailable === undefined) {
    return undefined
  }
  return {
    ...(request.manifestDigest ? { manifestDigest: request.manifestDigest } : null),
    ...(request.actionTag ? { actionTag: request.actionTag } : null),
    ...(request.payloadSchemaRef ? { payloadSchemaRef: request.payloadSchemaRef } : null),
    ...(request.validatorAvailable !== undefined ? { validatorAvailable: request.validatorAvailable } : null),
    bindingStatus: status,
  }
}

const inspectSourceAuthority = (section: LiveInspectSection) =>
  section === 'actions'
    ? 'reflection' as const
    : section === 'fields' || section === 'field-graph' || section === 'field-summary'
      ? 'field-runtime' as const
      : 'runtime-live' as const

const inspectOwner = (section: LiveInspectSection) =>
  section === 'actions'
    ? 'reflection' as const
    : section === 'fields' || section === 'field-graph' || section === 'field-summary'
      ? 'field-runtime' as const
      : 'runtime-live' as const

const missingOwnerProjectionGaps = (
  operation: string,
  section: LiveInspectSection,
  payload: unknown,
): ReadonlyArray<{
  readonly gapCode: string
  readonly summary: string
  readonly owner: 'runtime-live' | 'field-runtime' | 'reflection'
  readonly reopenBar: string
}> => {
  if (operation === 'inspect.events') {
    const kind = typeof (payload as any)?.kind === 'string' ? (payload as any).kind : undefined
    return [
      {
        gapCode: kind === 'diagnostic' || kind === 'process' ? 'unsupported-event-kind' : 'missing-event-producer',
        summary: kind ? `No owner-backed event producer is available for event kind: ${kind}.` : 'No owner-backed event producer is available.',
        owner: 'runtime-live',
        reopenBar: 'reopen when runtime-live event producer is available',
      },
    ]
  }
  if (operation === 'inspect.timeline') {
    return [
      {
        gapCode: 'missing-operation-window',
        summary: 'No owner-backed operation window is available for timeline projection.',
        owner: 'runtime-live',
        reopenBar: 'reopen when runtime-live operation window is available',
      },
      ...(typeof (payload as any)?.field === 'string'
        ? [
            {
              gapCode: 'missing-field-event-meta',
              summary: 'No stable field event metadata is available for timeline field filtering.',
              owner: 'field-runtime' as const,
              reopenBar: 'reopen when field-runtime can provide field event metadata',
            },
          ]
        : []),
    ]
  }
  if (operation === 'inspect.summary') {
    return [
      {
        gapCode: 'missing-operation-window',
        summary: 'No owner-backed operation window is available for summary projection.',
        owner: 'runtime-live',
        reopenBar: 'reopen when runtime-live operation summary is available',
      },
      {
        gapCode: 'missing-field-summary',
        summary: 'No owner-backed field convergence summary is available.',
        owner: 'field-runtime',
        reopenBar: 'reopen when field-runtime summary producer is available',
      },
    ]
  }
  if (section === 'field-summary') {
    return [
      {
        gapCode: 'missing-latest-field-summary',
        summary: 'No latest field summary is available for this target.',
        owner: 'field-runtime',
        reopenBar: 'reopen when latest field summary is keyed by live target',
      },
    ]
  }
  if (section === 'fields' || section === 'field-graph') {
    return [
      {
        gapCode: 'missing-field-owner-projection',
        summary: 'No safe field owner projection is available for this target.',
        owner: 'field-runtime',
        reopenBar: 'reopen when field-runtime exposes safe inspect projection',
      },
    ]
  }
  return [
    {
      gapCode: 'live-inspect-owner-projection-missing',
      summary: 'Browser host does not expose this inspect owner projection yet.',
      owner: inspectOwner(section),
      reopenBar: 'reopen when this owner projection is added to the dev lifecycle carrier',
    },
  ]
}

export const configureLogixLiveBrowserAdapter = (options: LogixLiveBrowserAdapterOptions): void => {
  getGlobalStore()[optionsKey] = options
}

export const getConfiguredLogixLiveBrowserAdapterOptions = (): LogixLiveBrowserAdapterOptions => {
  const value = getGlobalStore()[optionsKey]
  return value && typeof value === 'object' ? (value as LogixLiveBrowserAdapterOptions) : {}
}

export const installLogixLiveBrowserAdapter = (
  options: LogixLiveBrowserAdapterOptions = {},
): LogixLiveBrowserAdapterHandle | undefined => {
  if (!isBrowserDev()) return undefined
  const existing = getGlobalStore()[installedKey]
  if (existing && typeof existing === 'object') return existing as LogixLiveBrowserAdapterHandle

  const resolvedOptions = { ...envOptions(), ...getConfiguredLogixLiveBrowserAdapterOptions(), ...options }
  const host = resolvedOptions.host ?? '127.0.0.1'
  const port = resolvedOptions.port ?? 8098
  const ws = new WebSocket(`ws://${host}:${port}`)

  const sendOffer = () => {
    if (ws.readyState !== WebSocket.OPEN) return
    const targets = (getLifecycleCarrier()?.listRuntimeBindings?.() ?? []).map((binding) => ({
      runtimeId: binding.targetCoordinate?.runtimeId ?? binding.runtimeInstanceId,
      moduleId: binding.targetCoordinate?.moduleId ?? binding.ownerId,
      instanceId: binding.targetCoordinate?.instanceId ?? binding.runtimeInstanceId,
    }))
    ws.send(
      JSON.stringify({
        schemaVersion: 1,
        id: `host.offer:${makeAttachmentId(resolvedOptions)}`,
        role: 'browser',
        type: 'host.offer',
        payload: {
          attachmentId: makeAttachmentId(resolvedOptions),
          adapterKind: 'browser-dev',
          hostCoordinate: {
            hostKind: 'browser',
            ...(resolvedOptions.tabId ? { tabId: resolvedOptions.tabId } : null),
            ...(resolvedOptions.projectId ? { projectId: resolvedOptions.projectId } : null),
            ...(resolvedOptions.url ?? (typeof location !== 'undefined' ? location.href : undefined)
              ? { url: resolvedOptions.url ?? location.href }
              : null),
          },
          transport: { carrier: 'websocket', health: 'ready' },
          targets,
        },
      }),
    )
  }

  ws.addEventListener('message', (event) => {
    let message: any
    try {
      message = JSON.parse(String(event.data))
    } catch {
      return
    }
    if (message?.type !== 'live.operation.request') return
    if (
      message?.payload?.operation !== 'snapshot.read' &&
      message?.payload?.operation !== 'capture.eventWindow' &&
      message?.payload?.operation !== 'wait.condition' &&
      message?.payload?.operation !== 'dispatch.declaredAction' &&
      message?.payload?.operation !== 'profile.runtimeSummary' &&
      !isInspectOperation(message?.payload?.operation)
    ) return

    const requestedTarget = isTargetCoordinate(message.payload?.target) ? message.payload.target : undefined
    const binding = requestedTarget
      ? (getLifecycleCarrier()?.listRuntimeBindings?.() ?? []).find(
          (item) =>
            item.targetCoordinate?.runtimeId === requestedTarget.runtimeId &&
            item.targetCoordinate?.moduleId === requestedTarget.moduleId &&
            item.targetCoordinate?.instanceId === requestedTarget.instanceId,
        )
      : undefined
    const target = requestedTarget ?? binding?.targetCoordinate
    const isSnapshot = message.payload.operation === 'snapshot.read'
    const isCapture = message.payload.operation === 'capture.eventWindow'
    const isDispatch = message.payload.operation === 'dispatch.declaredAction'
    const isProfileSummary = message.payload.operation === 'profile.runtimeSummary'
    const isInspect = isInspectOperation(message.payload.operation)
    if (isInspect) {
      const section = inspectSectionForOperation(message.payload.operation, message.payload)
      const resolved = requestedTarget ? getLifecycleCarrier()?.resolveRuntimeBinding?.(requestedTarget) : undefined
      const inspectTarget = requestedTarget ?? binding?.targetCoordinate
      const sendInspectArtifact = (artifact: unknown) => {
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
                outputKey: `live-inspect:${section}`,
                kind: 'LiveInspectArtifact',
                value: artifact,
              },
            },
          }),
        )
      }

      if (!inspectTarget || !resolved) {
        const fallbackTarget = inspectTarget ?? requestedTarget ?? {
          runtimeId: 'unknown-runtime',
          moduleId: 'unknown-module',
          instanceId: 'unknown-instance',
        }
        sendInspectArtifact(
          makeLiveInspectGapArtifact({
            section,
            target: {
              ...fallbackTarget,
              attachmentId: message.payload.attachmentId ?? makeAttachmentId(resolvedOptions),
              adapterKind: 'browser-dev',
            },
            sourceAuthority: inspectSourceAuthority(section),
            producer: '@logixjs/react/dev-live-browser-adapter',
            gapCode: 'live-operation-unsupported-by-host',
            summary: 'Browser host could not resolve a runtime binding for inspect.',
            owner: inspectOwner(section),
            reopenBar: 'reopen only if React dev lifecycle carrier target binding changes',
          }),
        )
        return
      }

      if (message.payload.operation === 'inspect.actions') {
        const targetDescriptor = {
          ...resolved.targetCoordinate,
          attachmentId: message.payload.attachmentId ?? makeAttachmentId(resolvedOptions),
          adapterKind: 'browser-dev' as const,
        }
        const artifact = resolved.projectActions?.({
          target: targetDescriptor,
          producer: '@logixjs/react/dev-live-browser-adapter',
          ...(typeof message.payload.maxActions === 'number' ? { maxActions: message.payload.maxActions } : null),
        })
        if (!artifact) {
          sendInspectArtifact(
            makeLiveInspectGapArtifact({
              section,
              target: targetDescriptor,
              sourceAuthority: 'reflection',
              producer: '@logixjs/react/dev-live-browser-adapter',
              gapCode: 'missing-live-manifest-binding',
              summary: 'Browser host has no reflection manifest for this runtime binding.',
              owner: 'reflection',
              reopenBar: 'reopen when dev lifecycle binding carries RuntimeReflectionManifest',
            }),
          )
          return
        }

        sendInspectArtifact(artifact)
        return
      }

      if (message.payload.operation === 'inspect.events') {
        const operationWindow = resolved.readOperationWindow?.(
          operationWindowRequestFromPayload(resolved.targetCoordinate, message.payload),
        )
        const isDiagnosticOrProcess = message.payload.kind === 'diagnostic' || message.payload.kind === 'process'
        if (
          isLiveOperationWindow(operationWindow) &&
          (!isDiagnosticOrProcess || !isOnlyMissingOperationWindow(operationWindow))
        ) {
          sendInspectArtifact(
            makeBrowserOperationWindowInspectArtifact({
              target: {
                ...resolved.targetCoordinate,
                attachmentId: message.payload.attachmentId ?? makeAttachmentId(resolvedOptions),
                adapterKind: 'browser-dev',
              },
              operationWindow,
            }),
          )
          return
        }
      }

      if (message.payload.operation === 'inspect.timeline') {
        const operationWindow = resolved.readOperationWindow?.(
          operationWindowRequestFromPayload(resolved.targetCoordinate, message.payload),
        )
        if (
          isLiveOperationWindow(operationWindow) &&
          resolved.projectTimeline &&
          !(typeof message.payload.field === 'string' && isOnlyMissingOperationWindow(operationWindow))
        ) {
          sendInspectArtifact(
            resolved.projectTimeline({
              target: {
                ...resolved.targetCoordinate,
                attachmentId: message.payload.attachmentId ?? makeAttachmentId(resolvedOptions),
                adapterKind: 'browser-dev',
              },
              producer: '@logixjs/react/dev-live-browser-adapter',
              operationWindow,
              ...(typeof message.payload.field === 'string' ? { fieldFilter: { fieldPath: message.payload.field } } : null),
              ...(budgetFromPayload(message.payload) ? { budget: budgetFromPayload(message.payload) } : null),
            }) as unknown,
          )
          return
        }
      }

      if (message.payload.operation === 'inspect.summary') {
        const operationWindow = resolved.readOperationWindow?.(
          operationWindowRequestFromPayload(resolved.targetCoordinate, message.payload),
        )
        if (isLiveOperationWindow(operationWindow) && resolved.projectSummary) {
          sendInspectArtifact(
            resolved.projectSummary({
              target: {
                ...resolved.targetCoordinate,
                attachmentId: message.payload.attachmentId ?? makeAttachmentId(resolvedOptions),
                adapterKind: 'browser-dev',
              },
              producer: '@logixjs/react/dev-live-browser-adapter',
              operationWindow,
              ...(budgetFromPayload(message.payload) ? { budget: budgetFromPayload(message.payload) } : null),
            }) as unknown,
          )
          return
        }
      }

      if (
        message.payload.operation === 'inspect.fields' ||
        message.payload.operation === 'inspect.fieldGraph' ||
        message.payload.operation === 'inspect.fieldSummary'
      ) {
        const targetDescriptor = {
          ...resolved.targetCoordinate,
          attachmentId: message.payload.attachmentId ?? makeAttachmentId(resolvedOptions),
          adapterKind: 'browser-dev' as const,
        }
        const input = {
          target: targetDescriptor,
          producer: '@logixjs/react/dev-live-browser-adapter',
          ...(budgetFromPayload(message.payload) ? { budget: budgetFromPayload(message.payload) } : null),
        }
        const artifact =
          message.payload.operation === 'inspect.fields'
            ? resolved.projectFinalFields?.(input)
            : message.payload.operation === 'inspect.fieldGraph'
              ? resolved.projectFieldGraph?.(input)
              : resolved.projectFieldSummary?.(input)
        if (artifact) {
          sendInspectArtifact(artifact)
          return
        }
      }

      if (message.payload.operation !== 'inspect.state') {
        sendInspectArtifact(
          makeLiveInspectGapsArtifact({
            section,
            target: {
              ...resolved.targetCoordinate,
              attachmentId: message.payload.attachmentId ?? makeAttachmentId(resolvedOptions),
              adapterKind: 'browser-dev',
            },
            sourceAuthority: inspectSourceAuthority(section),
            producer: '@logixjs/react/dev-live-browser-adapter',
            gaps: missingOwnerProjectionGaps(message.payload.operation, section, message.payload),
          }),
        )
        return
      }

      const readStateEffect = resolved.moduleRuntime
        ? resolved.moduleRuntime.getState
        : Effect.service(ServiceMap.Service<any, any>(`@logixjs/Module/${resolved.targetCoordinate.moduleId}`)).pipe(
            Effect.orDie,
            Effect.flatMap((moduleRuntime: any) => moduleRuntime.getState),
          )
      resolved.runtime.runCallback(readStateEffect, {
        onExit: (exit) => {
          if (Exit.isSuccess(exit)) {
            const state = exit.value
          sendInspectArtifact(
            makeLiveStateInspectArtifact({
              target: {
                ...resolved.targetCoordinate,
                attachmentId: message.payload.attachmentId ?? makeAttachmentId(resolvedOptions),
                adapterKind: 'browser-dev',
              },
              producer: '@logixjs/react/dev-live-browser-adapter',
              state,
              ...(typeof message.payload.path === 'string' && message.payload.path.length > 0
                ? { path: message.payload.path }
                : null),
            }),
          )
            return
          }

          sendInspectArtifact(
            makeLiveInspectGapArtifact({
              section,
              target: {
                ...resolved.targetCoordinate,
                attachmentId: message.payload.attachmentId ?? makeAttachmentId(resolvedOptions),
                adapterKind: 'browser-dev',
              },
              sourceAuthority: 'runtime-live',
              producer: '@logixjs/react/dev-live-browser-adapter',
              gapCode: 'live-inspect-state-read-failed',
              summary: boundedFailureSummary(exit.cause, 'Runtime state inspect read failed.'),
              owner: 'runtime-live',
              reopenBar: 'reopen only if runtime state read semantics change',
            }),
          )
        },
      })
      return
    }
    if (isDispatch) {
      const resolved = requestedTarget ? getLifecycleCarrier()?.resolveRuntimeBinding?.(requestedTarget) : undefined
      if (!resolved || !message.payload?.actionTag) {
        ws.send(
          JSON.stringify({
            schemaVersion: 1,
            id: `resp:${message.payload.requestId}`,
            role: 'browser',
            type: 'live.operation.response',
            payload: {
              requestId: message.payload.requestId,
              attachmentId: message.payload.attachmentId,
              ok: false,
              gap: {
                kind: 'evidence.gap',
                gapId: `live:${message.payload.requestId}:dispatch-unavailable`,
                code: 'live-operation-unsupported-by-host',
                summary: 'Browser host could not resolve a runtime binding for dispatch.',
                severity: 'warning',
                stageClass: 'drilldown-only',
                target,
              },
            },
          }),
        )
        return
      }
      const dispatchTarget = makeLiveTargetCoordinate(resolved.targetCoordinate)
      const linkId = typeof message.payload.linkId === 'string' && message.payload.linkId.length > 0
        ? message.payload.linkId
        : undefined
      const requestedBinding = {
        actorId: 'agent',
        operationKind: 'dispatch.declaredAction' as const,
        target: dispatchTarget,
        permissionScope: 'debug:dispatch',
        ...(resolved.reflectionBinding ? { manifestDigest: resolved.reflectionBinding.manifestDigest } : null),
        actionTag: message.payload.actionTag,
        ...(typeof message.payload.payloadSchemaRef === 'string' ? { payloadSchemaRef: message.payload.payloadSchemaRef } : null),
        ...(typeof message.payload.validatorAvailable === 'boolean'
          ? { validatorAvailable: message.payload.validatorAvailable }
          : null),
        budget: defaultOperationBudget,
        redactionPolicyRef: 'default',
      }
      const admission = resolved.admitDispatch?.(requestedBinding) ?? {
        ok: false as const,
        reason: 'missing-live-manifest-binding',
        request: requestedBinding,
          binding: {
          ...(requestedBinding.manifestDigest ? { manifestDigest: requestedBinding.manifestDigest } : null),
          ...(requestedBinding.actionTag ? { actionTag: requestedBinding.actionTag } : null),
          bindingStatus: 'missing',
          },
      }
      const deniedBinding = admission.ok ? undefined : (admission.binding as LiveBindingHeader | undefined)
      const matchedBinding = admission.ok
        ? bindingFromAdmission(admission.request, 'matched')
        : undefined
      if (!admission.ok) {
        resolved.recordOperationEvent?.({
          target: dispatchTarget,
          attachmentId: message.payload.attachmentId ?? makeAttachmentId(resolvedOptions),
          eventKind: 'operation.denied',
          label: admission.reason,
          ...(linkId ? { linkId } : null),
          budget: defaultOperationBudget,
          ...(deniedBinding ? { binding: deniedBinding } : null),
          payload: {
            owner: 'runtime-live',
            summary: {
              operationKind: 'dispatch.declaredAction',
              reason: admission.reason,
            },
          },
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
                outputKey: 'live-operation:dispatch.declaredAction',
                kind: 'LiveOperationFacet',
                value: makeLiveOperationDeniedFacet({
                  operationId: `dispatch:${message.payload.requestId}`,
                  actorId: 'agent',
                  operationKind: 'dispatch.declaredAction',
                  target: dispatchTarget,
                  reason: asLiveAdmissionDenialReason(admission.reason),
                  binding: admission.binding as any,
                }),
              },
            },
          }),
        )
        return
      }
      const action = {
        _tag: message.payload.actionTag,
        payload: message.payload.payload,
      }
      const dispatchEffect = resolved.moduleRuntime
        ? resolved.moduleRuntime.dispatch(action)
        : Effect.service(ServiceMap.Service<any, any>(`@logixjs/Module/${resolved.targetCoordinate.moduleId}`)).pipe(
            Effect.orDie,
            Effect.flatMap((moduleRuntime: any) => moduleRuntime.dispatch(action)),
          )
      const acceptedEvent = resolved.recordOperationEvent?.({
        target: dispatchTarget,
        attachmentId: message.payload.attachmentId ?? makeAttachmentId(resolvedOptions),
        eventKind: 'operation.accepted',
        label: 'dispatch.declaredAction',
        ...(linkId ? { linkId } : null),
        budget: defaultOperationBudget,
        ...(matchedBinding ? { binding: matchedBinding } : null),
        payload: {
          owner: 'runtime-live',
          summary: {
            actorId: 'agent',
            operationKind: 'dispatch.declaredAction',
          },
        },
      }) as { readonly eventId?: string } | undefined
      resolved.runtime.runCallback(dispatchEffect, {
        onExit: (exit) => {
          if (Exit.isSuccess(exit)) {
          resolved.recordOperationEvent?.({
            target: dispatchTarget,
            attachmentId: message.payload.attachmentId ?? makeAttachmentId(resolvedOptions),
            eventKind: 'operation.completed',
            label: 'dispatch.declaredAction',
            ...(linkId ? { linkId } : null),
            budget: defaultOperationBudget,
            ...(matchedBinding ? { binding: matchedBinding } : null),
            artifactRef: { outputKey: 'live-operation:dispatch.declaredAction', kind: 'LiveOperationFacet' },
            payload: {
              owner: 'runtime-live',
              summary: {
                operationKind: 'dispatch.declaredAction',
                ...(acceptedEvent?.eventId ? { acceptedEventId: acceptedEvent.eventId } : null),
              },
            },
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
                  outputKey: 'live-operation:dispatch.declaredAction',
                  kind: 'LiveOperationFacet',
                  value: makeLiveOperationCompletedFacet({
                    operationId: `dispatch:${message.payload.requestId}`,
                    target: dispatchTarget,
                    binding: {
                      ...(admission.request.manifestDigest ? { manifestDigest: admission.request.manifestDigest } : null),
                      ...(admission.request.actionTag ? { actionTag: admission.request.actionTag } : null),
                      ...(admission.request.payloadSchemaRef ? { payloadSchemaRef: admission.request.payloadSchemaRef } : null),
                      ...(admission.request.validatorAvailable !== undefined ? { validatorAvailable: admission.request.validatorAvailable } : null),
                      bindingStatus: 'matched',
                    },
                    artifactRef: { outputKey: 'live-operation:dispatch.declaredAction', kind: 'LiveOperationFacet' },
                  }),
                },
              },
            }),
          )
            return
          }

          const boundedCause = boundedFailureSummary(exit.cause, 'dispatch-failed')
          resolved.recordOperationEvent?.({
            target: dispatchTarget,
            attachmentId: message.payload.attachmentId ?? makeAttachmentId(resolvedOptions),
            eventKind: 'operation.failed',
            label: 'dispatch.declaredAction',
            ...(linkId ? { linkId } : null),
            budget: defaultOperationBudget,
            ...(matchedBinding ? { binding: matchedBinding } : null),
            payload: {
              owner: 'runtime-live',
              summary: {
                operationKind: 'dispatch.declaredAction',
                boundedCause,
              },
            },
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
                  outputKey: 'live-operation:dispatch.declaredAction',
                  kind: 'LiveOperationFacet',
                  value: makeLiveOperationFailedFacet({
                    operationId: `dispatch:${message.payload.requestId}`,
                    target: dispatchTarget,
                    binding: {
                      ...(admission.request.manifestDigest ? { manifestDigest: admission.request.manifestDigest } : null),
                      ...(admission.request.actionTag ? { actionTag: admission.request.actionTag } : null),
                      ...(admission.request.payloadSchemaRef ? { payloadSchemaRef: admission.request.payloadSchemaRef } : null),
                      ...(admission.request.validatorAvailable !== undefined ? { validatorAvailable: admission.request.validatorAvailable } : null),
                      bindingStatus: 'matched',
                    },
                    boundedCause:
                      boundedCause,
                  }),
                },
              },
            }),
          )
        },
      })
      return
    }
    if (isProfileSummary) {
      const resolved = requestedTarget ? getLifecycleCarrier()?.resolveRuntimeBinding?.(requestedTarget) : undefined
      if (!target || !resolved) {
        ws.send(
          JSON.stringify({
            schemaVersion: 1,
            id: `resp:${message.payload.requestId}`,
            role: 'browser',
            type: 'live.operation.response',
            payload: {
              requestId: message.payload.requestId,
              attachmentId: message.payload.attachmentId,
              ok: false,
              gap: makeLiveEvidenceGap({
                gapId: `live:${message.payload.requestId}:profile-target-unavailable`,
                code: 'host-profile-target-unavailable',
                summary: 'Browser host could not resolve a runtime binding for local profile summary.',
                severity: 'warning',
                ...(requestedTarget ? { target: requestedTarget } : null),
              }),
            },
          }),
        )
        return
      }
      const attachmentId = message.payload.attachmentId ?? makeAttachmentId(resolvedOptions)
      ws.send(
        JSON.stringify({
          schemaVersion: 1,
          id: `resp:${message.payload.requestId}`,
          role: 'browser',
          type: 'live.operation.response',
          payload: {
            requestId: message.payload.requestId,
            attachmentId,
            ok: true,
            artifact: {
              outputKey: 'live-profile-summary',
              kind: 'LiveCapture',
              value: makeLiveCaptureFacet({
                captureId: `profile:${message.payload.requestId}`,
                captureKind: 'profile',
                target,
                stageClass: 'host-harness',
                budget: profileBudgetFromPayload(message.payload),
                localOnly: true,
                profileSummary: {
                  authority: 'react-host-adjunct',
                  source: 'local-browser',
                  sampleCount: 0,
                  targetRef: target,
                  attachmentId,
                },
                artifactRef: { outputKey: 'live-profile-summary', kind: 'LiveCapture' },
              }),
            },
          },
        }),
      )
      return
    }
    if (!target) {
      ws.send(
        JSON.stringify({
          schemaVersion: 1,
          id: `resp:${message.payload.requestId}`,
          role: 'browser',
          type: 'live.operation.response',
          payload: {
            requestId: message.payload.requestId,
            attachmentId: message.payload.attachmentId,
            ok: false,
            gap: {
              kind: 'evidence.gap',
              gapId: `live:${message.payload.requestId}:target-unavailable`,
              code: 'live-operation-unsupported-by-host',
              summary: 'Browser host could not resolve a full runtime target coordinate.',
              severity: 'warning',
              stageClass: 'drilldown-only',
            },
          },
        }),
      )
      return
    }
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
            outputKey: isSnapshot ? 'live-snapshot' : isCapture ? 'live-capture:event-window' : 'live-wait',
            kind: isSnapshot || isCapture ? 'LiveCapture' : 'LiveOperationFacet',
            value:
              isSnapshot || isCapture
                ? {
                    kind: 'live.capture',
                    captureId: `capture:${message.payload.requestId}`,
                    captureKind: isSnapshot ? 'snapshot' : 'event-window',
                    target,
                    stageClass: 'drilldown-only',
                    budget: { maxEvents: 16, maxInlineBytes: 1024 },
                    artifactRef: { outputKey: isSnapshot ? 'live-snapshot' : 'live-capture:event-window', kind: 'LiveCapture' },
                  }
                : {
                    kind: 'operation.completed',
                    operationId: `wait:${message.payload.requestId}`,
                    target,
                    stageClass: 'drilldown-only',
                    artifactRef: { outputKey: 'live-wait', kind: 'LiveOperationFacet' },
                  },
          },
        },
      }),
    )
  })

  ws.addEventListener('open', sendOffer)
  window.addEventListener('logix:dev-lifecycle-bindings-changed', sendOffer)

  const handle: LogixLiveBrowserAdapterHandle = {
    refresh: sendOffer,
    close: () => {
      window.removeEventListener('logix:dev-lifecycle-bindings-changed', sendOffer)
      ws.close()
    },
  }
  getGlobalStore()[installedKey] = handle
  return handle
}

export const clearInstalledLogixLiveBrowserAdapter = (): void => {
  const existing = getGlobalStore()[installedKey] as LogixLiveBrowserAdapterHandle | undefined
  existing?.close()
  delete getGlobalStore()[installedKey]
}
