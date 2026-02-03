import type { ArtifactStatus, ContractSuiteFactsInputs } from './model.js'
import { queryReferenceSpace } from '../ports/query.js'
import { diffPortSpec, type PortSpecDiff } from '../ports/diffPortSpec.js'
import { diffTypeIr, type TypeIrDiff } from '../ports/diffTypeIr.js'
import { isModulePortSpecPayload, isTypeIrPayload } from '../ports/types.js'

export const RULES_MANIFEST_ARTIFACT_KEY = '@logixjs/form.rulesManifest@v1' as const
export const PORT_SPEC_ARTIFACT_KEY = '@logixjs/module.portSpec@v1' as const
export const TYPE_IR_ARTIFACT_KEY = '@logixjs/module.typeIr@v1' as const
export const SCHEMA_REGISTRY_ARTIFACT_KEY = '@logixjs/schema.registry@v1' as const

export type ArtifactEnvelopeLike = {
  readonly artifactKey: string
  readonly ok: boolean
  readonly truncated?: boolean
  readonly budgetBytes?: number
  readonly actualBytes?: number
  readonly digest?: string
  readonly notes?: unknown
  readonly value?: unknown
  readonly error?: unknown
}

export type TrialRunReportLike = {
  readonly runId?: unknown
  readonly ok?: unknown
  readonly manifest?: unknown
  readonly artifacts?: unknown
  readonly error?: unknown
  readonly summary?: unknown
}

export type NormalizedArtifact = {
  readonly artifactKey: string
  readonly status: ArtifactStatus
  readonly digest?: string
  readonly notes?: unknown
  readonly value?: unknown
}

export type ReferenceSpaceDiff = {
  readonly portSpec?: PortSpecDiff
  readonly typeIr?: TypeIrDiff
}

export type ContractSuiteNormalizedFacts = {
  readonly runId: string
  readonly moduleId?: string
  readonly trialRunReport: unknown
  readonly trialRunOk: boolean
  readonly trialRunErrorCode?: string
  readonly trialRunError?: unknown
  readonly inputs?: ContractSuiteFactsInputs
  readonly artifacts: ReadonlyArray<NormalizedArtifact>
  readonly artifactsByKey: ReadonlyMap<string, NormalizedArtifact>
  readonly referenceSpace?: {
    readonly query: ReturnType<typeof queryReferenceSpace>
    readonly diff?: ReferenceSpaceDiff
  }
  readonly manifestDiff?: unknown
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asNonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined

const asArtifactEnvelope = (value: unknown): ArtifactEnvelopeLike | undefined => {
  if (!isRecord(value)) return undefined
  const artifactKey = asNonEmptyString((value as any).artifactKey)
  const ok = (value as any).ok
  if (!artifactKey) return undefined
  if (typeof ok !== 'boolean') return undefined
  return value as any
}

const toStatus = (envelope: ArtifactEnvelopeLike): ArtifactStatus =>
  envelope.ok ? (envelope.truncated === true ? 'TRUNCATED' : 'PRESENT') : 'FAILED'

export const normalizeTrialRunReport = (input: unknown): TrialRunReportLike => (isRecord(input) ? (input as any) : {})

export const normalizeContractSuiteFacts = (args: {
  readonly runId: string
  readonly trialRunReport: unknown
  readonly inputs?: ContractSuiteFactsInputs
  readonly expectedArtifactKeys?: ReadonlyArray<string>
  /**
   * Additional artifacts derived outside of TrialRunReport (e.g. parser/rewriter outputs).
   * They are merged into the same artifact space and participate in ContextPack output.
   */
  readonly extraArtifacts?: ReadonlyArray<ArtifactEnvelopeLike>
  readonly manifestDiff?: unknown
  readonly before?: {
    readonly portSpec?: unknown
    readonly typeIr?: unknown
  }
}): ContractSuiteNormalizedFacts => {
  const report = normalizeTrialRunReport(args.trialRunReport)

  const trialRunOk = (report as any).ok === true
  const trialRunError = (report as any).error
  const trialRunErrorCode = isRecord(trialRunError) ? asNonEmptyString((trialRunError as any).code) : undefined

  const moduleIdFromManifest = isRecord(report.manifest) ? asNonEmptyString((report.manifest as any).moduleId) : undefined

  const artifactsRaw = isRecord(report.artifacts) ? (report.artifacts as Record<string, unknown>) : {}
  const expected = args.expectedArtifactKeys ?? [PORT_SPEC_ARTIFACT_KEY, TYPE_IR_ARTIFACT_KEY]

  const normalizedByKey = new Map<string, NormalizedArtifact>()

  for (const key of expected) {
    normalizedByKey.set(key, { artifactKey: key, status: 'MISSING' })
  }

  for (const [key, raw] of Object.entries(artifactsRaw)) {
    const env = asArtifactEnvelope(raw)
    if (!env) continue
    const value = env.ok ? env.value : env.error !== undefined ? { error: env.error } : undefined
    normalizedByKey.set(env.artifactKey, {
      artifactKey: env.artifactKey,
      status: toStatus(env),
      ...(env.digest ? { digest: env.digest } : null),
      ...(env.notes !== undefined ? { notes: env.notes } : null),
      ...(value !== undefined ? { value } : null),
    })
  }

  for (const raw of args.extraArtifacts ?? []) {
    const env = asArtifactEnvelope(raw)
    if (!env) continue
    const value = env.ok ? env.value : env.error !== undefined ? { error: env.error } : undefined
    normalizedByKey.set(env.artifactKey, {
      artifactKey: env.artifactKey,
      status: toStatus(env),
      ...(env.digest ? { digest: env.digest } : null),
      ...(env.notes !== undefined ? { notes: env.notes } : null),
      ...(value !== undefined ? { value } : null),
    })
  }

  const artifacts = Array.from(normalizedByKey.values()).sort((a, b) =>
    a.artifactKey < b.artifactKey ? -1 : a.artifactKey > b.artifactKey ? 1 : 0,
  )

  const artifactsByKey: ReadonlyMap<string, NormalizedArtifact> = normalizedByKey

  const portSpec = artifactsByKey.get(PORT_SPEC_ARTIFACT_KEY)?.value
  const typeIr = artifactsByKey.get(TYPE_IR_ARTIFACT_KEY)?.value

  const referenceSpaceQuery = queryReferenceSpace({ portSpec, typeIr })

  const moduleId = moduleIdFromManifest ?? (referenceSpaceQuery.ok ? referenceSpaceQuery.keys.moduleId : undefined)

  const diff: ReferenceSpaceDiff | undefined = (() => {
    if (!args.before?.portSpec && !args.before?.typeIr) return undefined

    const portSpecDiff =
      isModulePortSpecPayload(args.before?.portSpec) && isModulePortSpecPayload(portSpec)
        ? diffPortSpec(args.before.portSpec, portSpec)
        : undefined

    const beforeTypeIr = isTypeIrPayload(args.before?.typeIr) ? args.before?.typeIr : undefined
    const afterTypeIr = isTypeIrPayload(typeIr) ? typeIr : undefined
    const typeIrDiff = beforeTypeIr === undefined && afterTypeIr === undefined ? undefined : diffTypeIr(beforeTypeIr, afterTypeIr)

    if (!portSpecDiff && !typeIrDiff) return undefined
    return {
      ...(portSpecDiff ? { portSpec: portSpecDiff } : null),
      ...(typeIrDiff ? { typeIr: typeIrDiff } : null),
    }
  })()

  return {
    runId: args.runId,
    ...(moduleId ? { moduleId } : null),
    trialRunReport: args.trialRunReport,
    trialRunOk,
    ...(trialRunErrorCode ? { trialRunErrorCode } : null),
    ...(trialRunError !== undefined ? { trialRunError } : null),
    ...(args.inputs ? { inputs: args.inputs } : null),
    artifacts,
    artifactsByKey,
    referenceSpace: { query: referenceSpaceQuery, ...(diff ? { diff } : null) },
    ...(args.manifestDiff !== undefined ? { manifestDiff: args.manifestDiff } : null),
  }
}
