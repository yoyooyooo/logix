import type {
  RuntimeWorkbenchAuthorityBundle,
  RuntimeWorkbenchContextRef,
  RuntimeWorkbenchEvidenceGapInput,
  RuntimeWorkbenchReflectionNodeInput,
  RuntimeWorkbenchTruthInput,
} from '../workbench/authority.js'
import type { ReflectionEvidenceGap } from './consumptionContract.js'
import type { MinimumProgramActionManifest, RuntimeReflectionManifest, RuntimeReflectionSourceRef } from './programManifest.js'
import type { RuntimeOperationEvent } from './runtimeOperationEvents.js'

export interface WorkbenchReflectionBridgeInput {
  readonly manifest?: MinimumProgramActionManifest | RuntimeReflectionManifest
  readonly expectedManifestDigest?: string
  readonly sourceRefs?: ReadonlyArray<RuntimeReflectionSourceRef>
  readonly operationEvents?: ReadonlyArray<RuntimeOperationEvent>
  readonly evidenceGaps?: ReadonlyArray<RuntimeOperationEvent | ReflectionEvidenceGap>
}

const manifestDigestOf = (manifest: MinimumProgramActionManifest | RuntimeReflectionManifest): string => manifest.digest

const manifestProgramIdOf = (manifest: MinimumProgramActionManifest | RuntimeReflectionManifest): string => manifest.programId

const manifestArtifactKindOf = (manifest: MinimumProgramActionManifest | RuntimeReflectionManifest): string =>
  manifest.manifestVersion === 'runtime-reflection-manifest@167B'
    ? 'RuntimeReflectionManifest'
    : 'RuntimeReflectionManifest'

const isRuntimeReflectionManifest = (
  manifest: MinimumProgramActionManifest | RuntimeReflectionManifest,
): manifest is RuntimeReflectionManifest => manifest.manifestVersion === 'runtime-reflection-manifest@167B'

const manifestTruthInput = (
  manifest: MinimumProgramActionManifest | RuntimeReflectionManifest,
): RuntimeWorkbenchTruthInput => ({
  kind: 'artifact-ref',
  artifact: {
    outputKey: 'reflectionManifest',
    kind: manifestArtifactKindOf(manifest),
    digest: manifestDigestOf(manifest),
  },
})

const sourceRefText = (source: { readonly file: string; readonly line: number; readonly column: number } | undefined): string | undefined =>
  source ? `${source.file}:${source.line}:${source.column}` : undefined

const actionNodesFromManifest = (
  manifest: MinimumProgramActionManifest | RuntimeReflectionManifest,
): ReadonlyArray<RuntimeWorkbenchReflectionNodeInput> => {
  const manifestDigest = manifestDigestOf(manifest)
  return manifest.actions.flatMap((action) => {
    const sourceRef = 'source' in action ? sourceRefText(action.source) : undefined
    const actionNode: RuntimeWorkbenchReflectionNodeInput = {
      kind: 'reflection-node',
      nodeKind: 'action',
      nodeId: `action:${action.actionTag}`,
      summary: `Reflected action ${action.actionTag}`,
      manifestDigest,
      actionTag: action.actionTag,
      payload: action.payload,
      focusRef: { declSliceId: `action:${action.actionTag}` },
      ...(sourceRef ? { sourceRef } : null),
    }
    const payloadNode: RuntimeWorkbenchReflectionNodeInput | undefined =
      action.payload.kind === 'nonVoid'
        ? {
            kind: 'reflection-node',
            nodeKind: 'payload',
            nodeId: `payload:${action.actionTag}`,
            summary: action.payload.summary ?? `Payload metadata for ${action.actionTag}`,
            manifestDigest,
            actionTag: action.actionTag,
            payload: action.payload,
            focusRef: { declSliceId: `payload:${action.actionTag}` },
            ...(sourceRef ? { sourceRef } : null),
          }
        : undefined
    return payloadNode ? [actionNode, payloadNode] : [actionNode]
  })
}

const dependencyNodesFromManifest = (
  manifest: MinimumProgramActionManifest | RuntimeReflectionManifest,
): ReadonlyArray<RuntimeWorkbenchReflectionNodeInput> => {
  if (!isRuntimeReflectionManifest(manifest)) return []
  const manifestDigest = manifestDigestOf(manifest)
  const imports = manifest.imports.map((item): RuntimeWorkbenchReflectionNodeInput => {
    const ownerCoordinate = `Program.capabilities.imports:${item.moduleId}`
    return {
      kind: 'reflection-node',
      nodeKind: 'dependency',
      nodeId: `dependency:${ownerCoordinate}`,
      summary: `Program import ${item.moduleId}`,
      manifestDigest,
      dependency: {
        kind: 'program-import',
        phase: 'declaration',
        ownerCoordinate,
        providerSource: 'program-capabilities',
        focusRef: { declSliceId: ownerCoordinate },
        childIdentity: item.moduleId,
        ...(item.digest ? { sourceRef: item.digest } : null),
      },
      focusRef: { declSliceId: ownerCoordinate },
      ...(item.digest ? { sourceRef: item.digest } : null),
    }
  })
  const services = manifest.services.map((item): RuntimeWorkbenchReflectionNodeInput => {
    const ownerCoordinate = `service:${item.serviceKey}`
    return {
      kind: 'reflection-node',
      nodeKind: 'dependency',
      nodeId: `dependency:${ownerCoordinate}`,
      summary: `Service dependency ${item.serviceKey}`,
      manifestDigest,
      dependency: {
        kind: 'service',
        phase: 'declaration',
        ownerCoordinate,
        providerSource: 'declaration',
        focusRef: { declSliceId: ownerCoordinate },
      },
      focusRef: { declSliceId: ownerCoordinate },
    }
  })
  return [...imports, ...services]
}

const manifestNodeTruthInputs = (
  manifest: MinimumProgramActionManifest | RuntimeReflectionManifest,
): ReadonlyArray<RuntimeWorkbenchTruthInput> => [
  ...actionNodesFromManifest(manifest),
  ...dependencyNodesFromManifest(manifest),
]

const eventBatchTruthInput = (
  programId: string,
  events: ReadonlyArray<RuntimeOperationEvent>,
): RuntimeWorkbenchTruthInput | undefined => {
  if (events.length === 0) return undefined
  return {
    kind: 'debug-event-batch',
    batchId: `runtime-operation-events:${programId}`,
    events: events.map((event) => ({
      eventId: event.eventId,
      instanceId: event.instanceId,
      txnSeq: event.txnSeq,
      opSeq: event.opSeq,
      label: event.name,
      type: event.name,
    })),
  }
}

const sourceContextRefs = (
  refs: ReadonlyArray<RuntimeReflectionSourceRef> | undefined,
): ReadonlyArray<RuntimeWorkbenchContextRef> =>
  (refs ?? [])
    .filter((ref) => ref.kind === 'source' && typeof ref.path === 'string' && ref.path.length > 0)
    .map((ref) => ({
      kind: 'source-locator' as const,
      locator: ref.path as string,
      provenance: 'source-snapshot' as const,
      ...(ref.digest ? { digest: ref.digest } : {}),
    }))

const gapInput = (args: {
  readonly gapId: string
  readonly code: string
  readonly owner: RuntimeWorkbenchEvidenceGapInput['owner']
  readonly summary: string
  readonly severity?: RuntimeWorkbenchEvidenceGapInput['severity']
}): RuntimeWorkbenchEvidenceGapInput => ({
  kind: 'evidence-gap',
  gapId: args.gapId,
  code: args.code,
  owner: args.owner,
  summary: args.summary,
  severity: args.severity ?? 'warning',
})

const bridgeGapFromOperationGap = (event: RuntimeOperationEvent): RuntimeWorkbenchEvidenceGapInput | undefined => {
  if (event.name !== 'evidence.gap') return undefined
  return gapInput({
    gapId: `reflection:${event.code}`,
    code: event.code,
    owner: event.code === 'missing-source-coordinate' ? 'source' : 'session',
    summary: event.message ?? event.code,
  })
}

const bridgeGapFromReflectionGap = (gap: ReflectionEvidenceGap): RuntimeWorkbenchEvidenceGapInput => gapInput({
  gapId: `reflection:${gap.code}`,
  code: gap.code,
  owner: gap.code === 'fallback-source-regex' ? 'source' : 'session',
  summary: gap.message,
  severity: gap.severity,
})

const isRuntimeOperationEvent = (value: RuntimeOperationEvent | ReflectionEvidenceGap): value is RuntimeOperationEvent =>
  'name' in value

export const createWorkbenchReflectionBridgeBundle = (
  input: WorkbenchReflectionBridgeInput,
): RuntimeWorkbenchAuthorityBundle => {
  const truthInputs: RuntimeWorkbenchTruthInput[] = []
  const contextRefs = sourceContextRefs(input.sourceRefs)

  if (input.manifest) {
    truthInputs.push(manifestTruthInput(input.manifest))
    truthInputs.push(...manifestNodeTruthInputs(input.manifest))
    if (input.expectedManifestDigest && input.expectedManifestDigest !== manifestDigestOf(input.manifest)) {
      truthInputs.push(
        gapInput({
          gapId: 'reflection:stale-manifest-digest',
          code: 'stale-manifest-digest',
          owner: 'artifact',
          summary: 'Runtime reflection manifest digest is stale.',
        }),
      )
    }
  } else {
    truthInputs.push(
      gapInput({
        gapId: 'reflection:missing-manifest',
        code: 'missing-manifest',
        owner: 'artifact',
        summary: 'Runtime reflection manifest is unavailable.',
      }),
    )
  }

  if (contextRefs.length === 0) {
    truthInputs.push(
      gapInput({
        gapId: 'reflection:missing-source-coordinate',
        code: 'missing-source-coordinate',
        owner: 'source',
        summary: 'Source coordinate is unavailable for reflection bridge.',
      }),
    )
  }

  const programId = input.manifest ? manifestProgramIdOf(input.manifest) : 'unknown'
  const batch = eventBatchTruthInput(programId, input.operationEvents ?? [])
  if (batch) truthInputs.push(batch)

  for (const gap of input.evidenceGaps ?? []) {
    if (isRuntimeOperationEvent(gap)) {
      const projected = bridgeGapFromOperationGap(gap)
      if (projected) truthInputs.push(projected)
    } else {
      truthInputs.push(bridgeGapFromReflectionGap(gap))
    }
  }

  return {
    truthInputs,
    ...(contextRefs.length > 0 ? { contextRefs } : {}),
  }
}
