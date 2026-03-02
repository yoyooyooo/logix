const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const uniqSortedStrings = (values: ReadonlyArray<string>): ReadonlyArray<string> =>
  Array.from(new Set(values.filter((item) => typeof item === 'string' && item.length > 0))).sort()

const toModuleWorkflowRefs = (manifest: unknown): ReadonlyArray<{ readonly moduleId: string; readonly digest: string }> => {
  if (!isRecord(manifest) || !Array.isArray(manifest.modules)) return []
  return manifest.modules
    .map((item) => {
      if (!isRecord(item) || typeof item.moduleId !== 'string') return undefined
      if (!isRecord(item.workflowSurface) || typeof item.workflowSurface.digest !== 'string') return undefined
      return { moduleId: item.moduleId, digest: item.workflowSurface.digest }
    })
    .filter((item): item is { readonly moduleId: string; readonly digest: string } => Boolean(item))
}

const toWorkflowSurfaceDigestMap = (workflowSurface: unknown): Map<string, string> => {
  if (!Array.isArray(workflowSurface)) return new Map()
  return new Map(
    workflowSurface
      .map((item) => {
        if (!isRecord(item) || typeof item.moduleId !== 'string') return undefined
        const surface = item.surface
        if (!isRecord(surface) || typeof surface.digest !== 'string') return undefined
        return [item.moduleId, surface.digest] as const
      })
      .filter((item): item is readonly [string, string] => Boolean(item)),
  )
}

export type IrArtifactDigestKind = 'semantic' | 'content' | 'nonGating'

export type TrialRunSummaryReasonCode =
  | 'VERIFY_PASS'
  | 'TRIALRUN_MISSING_SERVICES'
  | 'TRIALRUN_MISSING_CONFIG_KEYS'
  | 'TRIALRUN_TIMEOUT'
  | 'TRIALRUN_DISPOSE_TIMEOUT'
  | 'TRIALRUN_RUNTIME_FAILURE'

export type TrialRunSummaryVerdict = 'pass' | 'violation' | 'error'

export type TrialRunSummaryInput = {
  readonly ok: boolean
  readonly environment?: {
    readonly missingServices?: ReadonlyArray<string>
    readonly missingConfigKeys?: ReadonlyArray<string>
  }
  readonly error?: {
    readonly code?: string
  }
}

export const computeIrArtifactDigestSeed = (
  fileName: string,
  value: unknown,
): { readonly digestKind: IrArtifactDigestKind; readonly digestSeed?: unknown } => {
  if (fileName === 'trace.slim.json' || fileName === 'trialrun.report.json') {
    return { digestKind: 'nonGating' }
  }

  if (fileName === 'control-surface.manifest.json') {
    const digest = isRecord(value) && typeof value.digest === 'string' ? value.digest : undefined
    return { digestKind: 'semantic', digestSeed: digest ?? value }
  }

  if (fileName === 'workflow.surface.json') {
    const digestPairs = Array.isArray(value)
      ? value
          .map((item) => {
            if (!isRecord(item) || typeof item.moduleId !== 'string') return undefined
            const surface = item.surface
            if (!isRecord(surface) || typeof surface.digest !== 'string') return undefined
            return { moduleId: item.moduleId, digest: surface.digest }
          })
          .filter((item): item is { readonly moduleId: string; readonly digest: string } => Boolean(item))
          .sort((a, b) => (a.moduleId < b.moduleId ? -1 : a.moduleId > b.moduleId ? 1 : 0))
      : []
    return { digestKind: 'semantic', digestSeed: digestPairs }
  }

  return { digestKind: 'content', digestSeed: value }
}

export const validateIrArtifactFile = (fileName: string, value: unknown): ReadonlyArray<string> => {
  if (!value || typeof value !== 'object') return [`INVALID_SHAPE:${fileName}`]

  if (fileName === 'control-surface.manifest.json') {
    const version = (value as any).version
    if (version !== 1) return [`MANIFEST_VERSION_MISMATCH:${String(version)}`]
    const digest = (value as any).digest
    if (typeof digest !== 'string' || digest.length === 0) return ['MANIFEST_MISSING_DIGEST']
    const modules = (value as any).modules
    if (!Array.isArray(modules)) return ['MANIFEST_MISSING_MODULES_ARRAY']
  }

  if (fileName === 'workflow.surface.json') {
    if (!Array.isArray(value)) return ['WORKFLOW_SURFACE_NOT_ARRAY']
    for (const [index, item] of value.entries()) {
      if (!isRecord(item)) return [`WORKFLOW_SURFACE_ITEM_NOT_OBJECT:${index}`]
      if (typeof item.moduleId !== 'string' || item.moduleId.length === 0) return [`WORKFLOW_SURFACE_ITEM_MISSING_MODULE_ID:${index}`]
      const surface = item.surface
      if (!isRecord(surface)) return [`WORKFLOW_SURFACE_ITEM_MISSING_SURFACE:${index}`]
      if (typeof surface.digest !== 'string' || surface.digest.length === 0) {
        return [`WORKFLOW_SURFACE_ITEM_MISSING_SURFACE_DIGEST:${index}`]
      }
    }
  }

  if (fileName === 'trialrun.report.json') {
    const kind = (value as any).kind
    if (kind !== 'TrialRunReport') return [`TRIALRUN_KIND_MISMATCH:${String(kind)}`]
    const runId = (value as any).runId
    if (typeof runId !== 'string' || runId.length === 0) return ['TRIALRUN_MISSING_RUN_ID']
    const identity = (value as any).identity
    if (!isRecord(identity)) return ['TRIALRUN_MISSING_IDENTITY']
    if (typeof identity.instanceId !== 'string' || identity.instanceId.length === 0) return ['TRIALRUN_IDENTITY_INSTANCE_ID_MISSING']
  }

  if (fileName === 'trace.slim.json') {
    const kind = (value as any).kind
    if (kind !== 'TraceSlim') return [`TRACE_SLIM_KIND_MISMATCH:${String(kind)}`]
    const events = (value as any).events
    if (!Array.isArray(events)) return ['TRACE_SLIM_EVENTS_NOT_ARRAY']
  }

  if (fileName === 'evidence.json') {
    const kind = (value as any).kind
    if (kind !== 'TrialRunEvidence') return [`EVIDENCE_KIND_MISMATCH:${String(kind)}`]
    const links = (value as any).links
    if (!isRecord(links)) return ['EVIDENCE_MISSING_LINKS']
    if (typeof links.trialRunReportDigest !== 'string' || links.trialRunReportDigest.length === 0) {
      return ['EVIDENCE_MISSING_TRIALRUN_DIGEST']
    }
    if (typeof links.traceSlimDigest !== 'string' || links.traceSlimDigest.length === 0) {
      return ['EVIDENCE_MISSING_TRACE_DIGEST']
    }
  }

  return []
}

export const validateWorkflowSurfaceManifestLinks = (args: {
  readonly manifest: unknown
  readonly workflowSurface: unknown
}): ReadonlyArray<string> => {
  const workflowRefs = toModuleWorkflowRefs(args.manifest)
  if (workflowRefs.length === 0) return []

  if (!Array.isArray(args.workflowSurface)) {
    return args.workflowSurface === undefined ? ['MISSING_WORKFLOW_SURFACE_FILE'] : ['WORKFLOW_SURFACE_FILE_INVALID']
  }

  const digestMap = toWorkflowSurfaceDigestMap(args.workflowSurface)
  const reasonCodes: string[] = []
  for (const ref of workflowRefs) {
    const gotDigest = digestMap.get(ref.moduleId)
    if (!gotDigest) {
      reasonCodes.push(`WORKFLOW_SURFACE_MISSING_MODULE:${ref.moduleId}`)
      continue
    }
    if (gotDigest !== ref.digest) {
      reasonCodes.push(`WORKFLOW_SURFACE_DIGEST_MISMATCH:${ref.moduleId}`)
    }
  }

  return uniqSortedStrings(reasonCodes)
}

export const validateCrossModuleProfileSurface = (args: {
  readonly manifest: unknown
  readonly workflowSurface: unknown
}): ReadonlyArray<string> => {
  const manifestModules = isRecord(args.manifest) && Array.isArray((args.manifest as any).modules)
    ? (args.manifest as any).modules
        .map((item: any) => (item && typeof item.moduleId === 'string' ? item.moduleId : undefined))
        .filter((item: unknown): item is string => typeof item === 'string' && item.length > 0)
    : []

  const workflowModules = Array.isArray(args.workflowSurface)
    ? args.workflowSurface
        .map((item) => (isRecord(item) && typeof item.moduleId === 'string' ? item.moduleId : undefined))
        .filter((item): item is string => typeof item === 'string' && item.length > 0)
    : []

  const reasons: string[] = []
  if (manifestModules.length < 2) reasons.push('CROSS_MODULE_MODULE_COUNT_LT_2')
  if (workflowModules.length < 2) reasons.push('CROSS_MODULE_WORKFLOW_SURFACE_LT_2')
  return reasons
}

export const collectTrialRunFailureReasonCodes = (report: TrialRunSummaryInput): ReadonlyArray<string> => {
  const reasonCodes = new Set<string>()
  const missingServices = report.environment?.missingServices ?? []
  const missingConfigKeys = report.environment?.missingConfigKeys ?? []

  if (missingServices.length > 0) reasonCodes.add('TRIALRUN_MISSING_SERVICES')
  if (missingConfigKeys.length > 0) reasonCodes.add('TRIALRUN_MISSING_CONFIG_KEYS')
  if (report.error?.code === 'TrialRunTimeout') reasonCodes.add('TRIALRUN_TIMEOUT')
  if (report.error?.code === 'DisposeTimeout') reasonCodes.add('TRIALRUN_DISPOSE_TIMEOUT')

  if (!report.ok && reasonCodes.size === 0) {
    reasonCodes.add('TRIALRUN_RUNTIME_FAILURE')
  }

  return Array.from(reasonCodes).sort()
}

export const pickTrialRunSummaryReasonCode = (report: TrialRunSummaryInput): TrialRunSummaryReasonCode => {
  if (report.ok) return 'VERIFY_PASS'

  const missingServices = report.environment?.missingServices ?? []
  if (missingServices.length > 0) return 'TRIALRUN_MISSING_SERVICES'

  const missingConfigKeys = report.environment?.missingConfigKeys ?? []
  if (missingConfigKeys.length > 0) return 'TRIALRUN_MISSING_CONFIG_KEYS'

  if (report.error?.code === 'TrialRunTimeout') return 'TRIALRUN_TIMEOUT'
  if (report.error?.code === 'DisposeTimeout') return 'TRIALRUN_DISPOSE_TIMEOUT'
  return 'TRIALRUN_RUNTIME_FAILURE'
}

export const pickTrialRunSummaryVerdict = (reasonCode: TrialRunSummaryReasonCode): TrialRunSummaryVerdict => {
  if (reasonCode === 'VERIFY_PASS') return 'pass'
  if (reasonCode === 'TRIALRUN_MISSING_SERVICES' || reasonCode === 'TRIALRUN_MISSING_CONFIG_KEYS') return 'violation'
  return 'error'
}
