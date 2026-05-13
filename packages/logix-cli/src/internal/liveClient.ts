import {
  makeLiveEvidenceGap,
  makeLiveInspectGapArtifact,
  makeLiveTargetCoordinate,
  makeLiveOperationDeniedFacet,
  toWorkbenchTruthInput,
} from '@logixjs/core/repo-internal/live-bridge-api'

import type { LiveTask } from './args.js'
import { requestLiveDaemon, readLiveDaemonMetadata, stopLiveDaemon } from './liveDaemonClient.js'
import {
  makeReadyLiveDaemonOperatorSnapshot,
  makeDegradedLiveDaemonOperatorSnapshot,
  makeStoppedLiveDaemonOperatorSnapshot,
  readLiveDaemonOperatorSnapshot,
  type LiveDaemonOperatorSnapshot,
} from './liveDaemonOperatorSnapshot.js'
import { startLiveDaemonProcess } from './liveDaemonLauncher.js'
import { resolveLiveTransportPaths } from './liveTransportPaths.js'
import type { JsonValue } from './result.js'

const toJsonPayload = (value: unknown): JsonValue => JSON.parse(JSON.stringify(value)) as JsonValue

const parseTarget = (raw: string | undefined) => {
  if (!raw) return makeLiveTargetCoordinate({ runtimeId: 'unknown-runtime', moduleId: 'unknown-module', instanceId: 'unknown-instance' })
  const match = /^runtime:([^/]+)\/module:([^/]+)\/instance:(.+)$/.exec(raw)
  if (!match) {
    return makeLiveTargetCoordinate({ runtimeId: raw, moduleId: 'unknown-module', instanceId: 'unknown-instance' })
  }
  return makeLiveTargetCoordinate({ runtimeId: match[1]!, moduleId: match[2]!, instanceId: match[3]! })
}

const daemonOperationForTask = (task: LiveTask): string => {
  switch (task.task) {
    case 'capture':
      return 'capture.eventWindow'
    case 'snapshot':
      return 'snapshot.read'
    case 'wait':
      return 'wait.condition'
    default:
      return task.task
  }
}

export type LiveClientTaskOutput = {
  readonly outputKey: string
  readonly kind:
    | 'LiveTargetList'
    | 'LiveInspectArtifact'
    | 'LiveOperationFacet'
    | 'LiveCapture'
    | 'CanonicalEvidencePackage'
    | 'EvidenceGap'
    | 'LiveStatus'
  readonly ok: boolean
  readonly inline: JsonValue
}

const statusOutput = (snapshot: LiveDaemonOperatorSnapshot, ok = true): LiveClientTaskOutput => ({
  outputKey: 'liveStatus',
  kind: 'LiveStatus',
  ok,
  inline: toJsonPayload(snapshot),
})

const stoppedStatus = (): LiveClientTaskOutput => {
  const snapshot = makeStoppedLiveDaemonOperatorSnapshot(resolveLiveTransportPaths())
  return {
    outputKey: 'liveStatus',
    kind: 'LiveStatus',
    ok: true,
    inline: toJsonPayload(snapshot),
  }
}

const daemonGap = (task: LiveTask): LiveClientTaskOutput => {
  const gap = makeLiveEvidenceGap({
    gapId: `live:${task.task}:daemon-not-running`,
    code: 'live-daemon-not-running',
    summary: 'Live daemon is not running.',
    severity: 'warning',
    target: 'target' in task ? parseTarget(task.target) : undefined,
  })
  return {
    outputKey: 'liveGap',
    kind: 'EvidenceGap',
    ok: true,
    inline: toJsonPayload(gap),
  }
}

const operationPayloadForInspectTask = (task: LiveTask): Record<string, unknown> => ({
  ...('target' in task ? { target: task.target } : null),
  ...('attachmentId' in task && task.attachmentId ? { attachmentId: task.attachmentId } : null),
  ...('path' in task && task.path ? { path: task.path } : null),
  ...('field' in task && task.field ? { field: task.field } : null),
  ...('cursor' in task && task.cursor ? { cursor: task.cursor } : null),
  ...('kind' in task && task.kind ? { kind: task.kind } : null),
  ...('limit' in task && typeof task.limit === 'number' ? { limit: task.limit } : null),
})

const daemonOperationForInspectTask = (task: LiveTask): string | undefined => {
  switch (task.task) {
    case 'inspect':
      return 'inspect.targetDetail'
    case 'state':
      return 'inspect.state'
    case 'actions':
      return 'inspect.actions'
    case 'events':
      return 'inspect.events'
    case 'timeline':
      return 'inspect.timeline'
    case 'fields':
      return 'inspect.fields'
    case 'field-graph':
      return 'inspect.fieldGraph'
    case 'field-summary':
      return 'inspect.fieldSummary'
    case 'summary':
      return 'inspect.summary'
    default:
      return undefined
  }
}

const structuredInspectFallback = (task: LiveTask): LiveClientTaskOutput => {
  const target = 'target' in task ? parseTarget(task.target) : parseTarget(undefined)
  const section = (() => {
    switch (task.task) {
      case 'state':
        return task.path ? 'state-path' : 'state'
      case 'actions':
        return 'actions'
      case 'events':
        return 'events'
      case 'timeline':
        return 'timeline'
      case 'fields':
        return 'fields'
      case 'field-graph':
        return 'field-graph'
      case 'field-summary':
        return 'field-summary'
      case 'summary':
        return 'summary'
      case 'inspect':
        return 'target-detail'
      default:
        return 'summary'
    }
  })()
  const artifact = makeLiveInspectGapArtifact({
    section,
    target: {
      ...target,
      attachmentId: 'unknown-attachment',
      adapterKind: 'test',
    },
    sourceAuthority: section === 'actions' ? 'reflection' : section.startsWith('field') || section === 'fields' ? 'field-runtime' : 'runtime-live',
    producer: 'logix-cli-live-client',
    gapCode: 'live-daemon-not-running',
    summary: 'Live daemon is not running.',
    owner: section === 'actions' ? 'reflection' : section.startsWith('field') || section === 'fields' ? 'field-runtime' : 'runtime-live',
    reopenBar: 'start a live daemon and attach a runtime target',
  })
  return {
    outputKey: `liveInspect:${section}`,
    kind: 'LiveInspectArtifact',
    ok: true,
    inline: toJsonPayload(artifact),
  }
}

const startLiveDaemonProcessTask = async (): Promise<LiveClientTaskOutput> => {
  const paths = resolveLiveTransportPaths()
  const existing = await readLiveDaemonOperatorSnapshot(paths)
  if (existing.state === 'ready') {
    return statusOutput(existing)
  }

  try {
    const launched = await startLiveDaemonProcess()
    return statusOutput(
      launched.snapshot ??
        makeReadyLiveDaemonOperatorSnapshot(paths, {
          schemaVersion: 1,
          pid: process.pid,
          host: paths.host,
          port: launched.port ?? paths.port,
          socketPath: paths.socketPath,
          stateDir: paths.stateDir,
          operator: { carrierLocal: true, publicContract: false },
        }),
    )
  } catch {
    return {
      outputKey: 'liveStatus',
      kind: 'LiveStatus',
      ok: false,
      inline: toJsonPayload({
        code: 'live-daemon-start-timeout',
        message: 'Live daemon did not become ready in time.',
      }),
    }
  }
}

export const runLiveClientTaskAsync = async (task: LiveTask): Promise<LiveClientTaskOutput> => {
  const metadata = await readLiveDaemonMetadata()
  const paths = metadata ? resolveLiveTransportPaths({ ...metadata }) : resolveLiveTransportPaths()

  switch (task.task) {
    case 'start':
      return startLiveDaemonProcessTask()
    case 'stop': {
      if (!metadata) return stoppedStatus()
      const response = await stopLiveDaemon(paths)
      return {
        outputKey: 'liveStatus',
        kind: 'LiveStatus',
        ok: response.ok,
        inline: toJsonPayload(response.ok ? response.data : response.error),
      }
    }
    case 'status': {
      const snapshot = await readLiveDaemonOperatorSnapshot(paths)
      if (snapshot.state !== 'ready') return statusOutput(snapshot)
      const response = await requestLiveDaemon(paths, { type: 'status' })
      if (!response.ok) {
        return statusOutput(
          makeDegradedLiveDaemonOperatorSnapshot(
            paths,
            response.error.code,
            undefined,
            metadata ?? undefined,
          ),
        )
      }
      return { outputKey: 'liveStatus', kind: 'LiveStatus', ok: true, inline: toJsonPayload(response.data) }
    }
    case 'targets': {
      if (!metadata) return daemonGap(task)
      const response = await requestLiveDaemon(paths, { type: 'targets', tree: task.tree })
      if (!response.ok) return daemonGap(task)
      return {
        outputKey: 'liveTargets',
        kind: 'LiveTargetList',
        ok: true,
        inline: toJsonPayload(response.data),
      }
    }
    case 'inspect':
    case 'state':
    case 'actions':
    case 'events':
    case 'timeline':
    case 'fields':
    case 'field-graph':
    case 'field-summary':
    case 'summary': {
      if (!metadata) return task.task === 'state' ? daemonGap(task) : structuredInspectFallback(task)
      const operation = daemonOperationForInspectTask(task)!
      const response = await requestLiveDaemon(paths, {
        type: 'operation',
        operation,
        payload: operationPayloadForInspectTask(task),
      })
      if (response.ok && (response.data as any).artifact) {
        const artifact = (response.data as any).artifact as {
          readonly outputKey: string
          readonly kind: 'LiveInspectArtifact'
          readonly value: unknown
        }
        return {
          outputKey: artifact.outputKey,
          kind: artifact.kind,
          ok: true,
          inline: toJsonPayload(artifact.value),
        }
      }
      if (response.ok && response.data.gap) {
        return { outputKey: 'liveGap', kind: 'EvidenceGap', ok: true, inline: toJsonPayload(response.data.gap) }
      }
      return structuredInspectFallback(task)
    }
    case 'capture':
    case 'snapshot':
    case 'wait':
    case 'profile.start':
    case 'profile.stop':
    case 'profile.summary': {
      if (metadata) {
        const response = await requestLiveDaemon(paths, { type: 'operation', operation: daemonOperationForTask(task), payload: task })
        if (response.ok && (response.data as any).artifact) {
          const artifact = (response.data as any).artifact as {
            readonly outputKey: string
            readonly kind: 'LiveCapture' | 'LiveOperationFacet' | 'LiveInspectArtifact'
            readonly value: unknown
          }
          return {
            outputKey: artifact.outputKey,
            kind: artifact.kind,
            ok: true,
            inline: toJsonPayload(artifact.value),
          }
        }
        if (response.ok && response.data.gap) {
          return { outputKey: 'liveGap', kind: 'EvidenceGap', ok: true, inline: toJsonPayload(response.data.gap) }
        }
      }
      const gap = makeLiveEvidenceGap({
        gapId: `live:${task.task}:degraded`,
        code: 'live-operation-degraded',
        summary: `Live ${task.task} uses in-process proof transport only.`,
        severity: 'info',
        target: parseTarget('target' in task ? task.target : undefined),
      })
      return {
        outputKey: 'liveGap',
        kind: 'EvidenceGap',
        ok: true,
        inline: toJsonPayload(gap),
      }
    }
    case 'dispatch': {
      if (!metadata) return daemonGap(task)
      const parsedPayload = task.payload
        ? (() => {
            try {
              return JSON.parse(task.payload)
            } catch {
              return task.payload
            }
          })()
        : undefined
      const response = await requestLiveDaemon(paths, {
        type: 'operation',
        operation: 'dispatch.declaredAction',
        payload: {
          target: task.target,
          ...(task.attachmentId ? { attachmentId: task.attachmentId } : null),
          actionTag: task.action,
          payload: parsedPayload,
        },
      })
      if (response.ok && (response.data as any).artifact) {
        const artifact = (response.data as any).artifact as {
          readonly outputKey: string
          readonly kind: 'LiveOperationFacet'
          readonly value: unknown
        }
        return {
          outputKey: artifact.outputKey,
          kind: artifact.kind,
          ok: true,
          inline: toJsonPayload(artifact.value),
        }
      }
      if (response.ok && response.data.gap) {
        return { outputKey: 'liveGap', kind: 'EvidenceGap', ok: true, inline: toJsonPayload(response.data.gap) }
      }
      const target = parseTarget(task.target)
      const facet = makeLiveOperationDeniedFacet({
        operationId: `dispatch:${task.action}`,
        actorId: 'agent',
        operationKind: 'dispatch.declaredAction',
        target,
        reason: 'unsupported-operation',
        binding: { actionTag: task.action, bindingStatus: 'unknown' },
      })
      return {
        outputKey: 'liveOperation',
        kind: 'LiveOperationFacet',
        ok: true,
        inline: toJsonPayload(facet),
      }
    }
    case 'export.evidence': {
      if (!metadata) {
        const gap = makeLiveEvidenceGap({
          gapId: `live:export:${task.from}:daemon-not-running`,
          code: 'live-daemon-not-running',
          summary: 'Live daemon is not running.',
          severity: 'warning',
        })
        return { outputKey: 'liveGap', kind: 'EvidenceGap', ok: true, inline: toJsonPayload(gap) }
      }
      const response = await requestLiveDaemon(paths, { type: 'operation', operation: 'export.evidence', payload: { from: task.from } })
      if (response.ok && response.data.package) {
        return {
          outputKey: 'canonicalEvidencePackage',
          kind: 'CanonicalEvidencePackage',
          ok: true,
          inline: toJsonPayload(response.data.package),
        }
      }
      const gap = makeLiveEvidenceGap({
        gapId: `live:export:${task.from}`,
        code: 'live-export-daemon-gap',
        summary: 'Daemon-backed live export returned a bounded evidence gap.',
        severity: 'info',
      })
      const packageValue = {
        kind: 'CanonicalEvidencePackage',
        packageId: `live-evidence:${task.from}`,
        artifacts: [{ outputKey: 'liveGap', kind: 'EvidenceGap' }],
        events: [toWorkbenchTruthInput(gap)],
      }
      return {
        outputKey: 'canonicalEvidencePackage',
        kind: 'CanonicalEvidencePackage',
        ok: true,
        inline: toJsonPayload(packageValue),
      }
    }
  }
}

export const runLiveClientTask = (task: LiveTask): LiveClientTaskOutput => {
  if (task.task === 'status' || task.task === 'start' || task.task === 'stop') {
    return stoppedStatus()
  }

  return daemonGap(task)
}
